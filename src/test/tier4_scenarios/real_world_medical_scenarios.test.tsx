import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Home from '@/app/page';
import { ThemeProvider } from '@/components/ThemeProvider';
import { mockMedicalQuestions } from '@/test/fixtures/quizData';
import { Question } from '@/types';

describe('Tier 4: Real-World Medical Application Scenarios', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderApp = () => {
    return render(
      <ThemeProvider>
        <Home />
      </ThemeProvider>
    );
  };

  it('Scenario 1: End-to-end Medical Syllabus Workflow (Syllabus PDF -> Gemini Generation -> 100% Score Exam -> History Verification)', async () => {
    // Mock Gemini Route Handler returning realistic medical questions
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ questions: mockMedicalQuestions }),
    } as Response);

    renderApp();

    // Student uploads clinical cardiology lecture
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const syllabusFile = new File(['Giáo trình Bệnh học Tim mạch 2026'], 'GiaoTrinh_TimMach.pdf', {
      type: 'application/pdf',
    });
    fireEvent.change(fileInput, { target: { files: [syllabusFile] } });

    // Configure 5 questions
    const qCountInput = screen.getByRole('spinbutton');
    fireEvent.change(qCountInput, { target: { value: '5' } });

    // Generate
    fireEvent.click(screen.getByRole('button', { name: /Bắt đầu tạo câu hỏi/i }));

    await waitFor(() => {
      expect(screen.getByText(/Câu hỏi 1 \/ 5/i)).toBeInTheDocument();
    });

    // Student carefully answers all questions correctly according to medical guidelines
    // Q1: RCA ST elevation in DII, DIII, aVF -> Option A
    fireEvent.click(screen.getByText(mockMedicalQuestions[0].options[0].text).closest('button')!);
    expect(screen.getByText('Chính xác!')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Câu tiếp theo/i }));

    // Q2: Anaphylaxis first-line treatment -> Option B (Adrenaline IM)
    fireEvent.click(screen.getByText(mockMedicalQuestions[1].options[1].text).closest('button')!);
    expect(screen.getByText('Chính xác!')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Câu tiếp theo/i }));

    // Q3: Charcot triad -> Option A (RUQ pain, fever with rigors, jaundice)
    fireEvent.click(screen.getByText(mockMedicalQuestions[2].options[0].text).closest('button')!);
    expect(screen.getByText('Chính xác!')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Câu tiếp theo/i }));

    // Q4: Pregnancy contraindication -> Option C (ACEi/ARB)
    fireEvent.click(screen.getByText(mockMedicalQuestions[3].options[2].text).closest('button')!);
    expect(screen.getByText('Chính xác!')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Câu tiếp theo/i }));

    // Q5: Heart failure biomarker -> Option A (BNP/NT-proBNP)
    fireEvent.click(screen.getByText(mockMedicalQuestions[4].options[0].text).closest('button')!);
    expect(screen.getByText('Chính xác!')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Xem kết quả/i }));

    // Verify 100% perfect exam score
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByText(/Bạn đã trả lời đúng 5 \/ 5 câu hỏi/i)).toBeInTheDocument();

    // Inspect reviewed answers
    fireEvent.click(screen.getByRole('button', { name: /Xem lại đáp án/i }));
    expect(screen.getByText(/Xem lại bài làm/i)).toBeInTheDocument();
    expect(screen.getByText('Lần 1')).toBeInTheDocument();

    // Return to dashboard and verify session
    fireEvent.click(screen.getByRole('button', { name: /Quay lại/i }));
    fireEvent.click(screen.getByRole('button', { name: /Tải tài liệu khác/i }));

    await waitFor(() => {
      expect(screen.getByText(/GiaoTrinh_TimMach.pdf/i)).toBeInTheDocument();
    });
  });

  it('Scenario 2: API Gateway Timeout (504) Recovery Flow with User-Friendly Guidance', async () => {
    // Simulate server timeout on oversized document
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 504,
      text: async () => '<html><body>504 Gateway Time-out</body></html>',
    } as Response);

    renderApp();

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const largeBook = new File(['1000 pages of text'], 'Harrison_Principles_Internal_Medicine.pdf', {
      type: 'application/pdf',
    });
    fireEvent.change(fileInput, { target: { files: [largeBook] } });

    fireEvent.click(screen.getByRole('button', { name: /Bắt đầu tạo câu hỏi/i }));

    // Verify helpful Vietnamese troubleshooting message is shown
    await waitFor(() => {
      expect(
        screen.getByText(/Quá thời gian xử lý của Server \(Timeout\).*Chọn phiên bản 'Gemini 2.5 Flash Lite'/i)
      ).toBeInTheDocument();
    });

    // User switches to Gemini Flash Lite model as advised
    const modelSelect = screen.getByRole('combobox');
    fireEvent.change(modelSelect, { target: { value: 'gemini-2.5-flash-lite' } });

    // Mock subsequent success with Lite model
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ questions: mockMedicalQuestions }),
    } as Response);

    // Retry generate
    fireEvent.click(screen.getByRole('button', { name: /Bắt đầu tạo câu hỏi/i }));

    await waitFor(() => {
      expect(screen.getByText(/Câu hỏi 1 \/ 5/i)).toBeInTheDocument();
    });
  });

  it('Scenario 3: Rate Limiting (429) Handling and Retry Workflow', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      text: async () =>
        JSON.stringify({
          error:
            "Đã vượt quá giới hạn lượt dùng miễn phí (Rate Limit) của model này. Vui lòng chọn model 'Gemini 2.5 Flash Lite' hoặc đợi một lúc rồi thử lại.",
        }),
    } as Response);

    renderApp();

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [new File([''], 'test.pdf', { type: 'application/pdf' })] } });
    fireEvent.click(screen.getByRole('button', { name: /Bắt đầu tạo câu hỏi/i }));

    await waitFor(() => {
      expect(screen.getByText(/Đã vượt quá giới hạn lượt dùng miễn phí/i)).toBeInTheDocument();
    });
  });

  it('Scenario 4: High-Volume 20-Question Exam Simulation with Correctness Tracking', async () => {
    // Generate 20 clinical questions
    const generated20: Question[] = [];
    for (let i = 1; i <= 20; i++) {
      generated20.push({
        id: `clinical-q${i}`,
        text: `Tình huống lâm sàng ca bệnh #${i}: Bệnh nhân có chỉ số lâm sàng biến thiên...`,
        options: [
          { label: 'A', text: `Phương án điều trị A cho ca #${i}` },
          { label: 'B', text: `Phương án điều trị B cho ca #${i}` },
          { label: 'C', text: `Phương án điều trị C cho ca #${i}` },
          { label: 'D', text: `Phương án điều trị D cho ca #${i}` },
        ],
        correctAnswer: 'A',
        explanation: `Cơ sở khoa học dựa trên khuyến cáo hiệp hội chuyên khoa cho ca #${i}.`,
      });
    }

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ questions: generated20 }),
    } as Response);

    renderApp();

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [new File([''], '20q_test.pdf', { type: 'application/pdf' })] } });
    fireEvent.click(screen.getByRole('button', { name: /Bắt đầu tạo câu hỏi/i }));

    await waitFor(() => {
      expect(screen.getByText(/Câu hỏi 1 \/ 20/i)).toBeInTheDocument();
    });

    // Answer 10 correctly (Option A) and 10 incorrectly (Option B)
    for (let i = 0; i < 20; i++) {
      const chosenOptionIndex = i < 10 ? 0 : 1; // First 10 correct, next 10 wrong
      fireEvent.click(screen.getAllByRole('radio')[chosenOptionIndex]);

      const actionBtn = screen.getByRole('button', {
        name: i === 19 ? /Xem kết quả/i : /Câu tiếp theo/i,
      });
      fireEvent.click(actionBtn);
    }

    // 10 / 20 correct = 50% score
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByText(/Bạn đã trả lời đúng 10 \/ 20 câu hỏi/i)).toBeInTheDocument();
  });

  it('Scenario 5: Print Review Flow verification', async () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ questions: mockMedicalQuestions }),
    } as Response);

    renderApp();

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [new File([''], 'print.pdf', { type: 'application/pdf' })] } });
    fireEvent.click(screen.getByRole('button', { name: /Bắt đầu tạo câu hỏi/i }));

    await waitFor(() => {
      expect(screen.getByText(/Câu hỏi 1 \/ 5/i)).toBeInTheDocument();
    });

    // Finish 5 questions quickly
    for (let i = 0; i < 5; i++) {
      fireEvent.click(screen.getAllByRole('radio')[0]);
      fireEvent.click(screen.getByRole('button', { name: i === 4 ? /Xem kết quả/i : /Câu tiếp theo/i }));
    }

    // Enter review mode
    fireEvent.click(screen.getByRole('button', { name: /Xem lại đáp án/i }));

    // Click "In PDF"
    const printBtn = screen.getByRole('button', { name: /In PDF/i });
    fireEvent.click(printBtn);

    expect(printSpy).toHaveBeenCalledTimes(1);
    printSpy.mockRestore();
  });
});
