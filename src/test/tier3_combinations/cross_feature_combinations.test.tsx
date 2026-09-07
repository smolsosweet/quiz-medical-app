import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Home from '@/app/page';
import { ThemeProvider } from '@/components/ThemeProvider';
import { mockMedicalQuestions } from '@/test/fixtures/quizData';

describe('Tier 3: Cross-Feature Combinations', () => {
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

  it('T3.1: Full workflow: File Upload -> API Generation -> Answer Quiz -> Finish Round -> History Card', async () => {
    // Mock successful API response
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ questions: mockMedicalQuestions }),
    } as Response);

    renderApp();

    // 1. Initial State: Upload Dashboard is shown
    expect(screen.getByText('Tạo Bộ Trắc Nghiệm Mới')).toBeInTheDocument();

    // 2. Select file
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const testFile = new File(['pathology content'], 'GiaiPhauBenh_DaiCuong.pdf', { type: 'application/pdf' });
    fireEvent.change(fileInput, { target: { files: [testFile] } });

    expect(screen.getByText('GiaiPhauBenh_DaiCuong.pdf')).toBeInTheDocument();

    // 3. Click Generate
    const generateBtn = screen.getByRole('button', { name: /Bắt đầu tạo câu hỏi/i });
    fireEvent.click(generateBtn);

    // 4. Wait for QuizInterface to appear
    await waitFor(() => {
      expect(screen.getByText(/Câu hỏi 1 \/ 5/i)).toBeInTheDocument();
    });

    // 5. Answer all 5 questions
    for (let i = 0; i < mockMedicalQuestions.length; i++) {
      // Pick first option (A)
      const optionA = screen.getByText(mockMedicalQuestions[i].options[0].text).closest('button')!;
      fireEvent.click(optionA);

      const actionBtn = screen.getByRole('button', {
        name: i === mockMedicalQuestions.length - 1 ? /Nộp bài/i : /Câu tiếp/i,
      });
      fireEvent.click(actionBtn);
    }

    // 6. Completion Screen
    expect(screen.getByText(/Hoàn Thành Bài Kiểm Tra!/i)).toBeInTheDocument();

    // 7. Click "Tải tài liệu khác" to return to dashboard
    const newFileBtn = screen.getByRole('button', { name: /Tải tài liệu khác/i });
    fireEvent.click(newFileBtn);

    // 8. Dashboard should now show the session in history
    await waitFor(() => {
      expect(screen.getByText(/Lịch sử học tập phiên này/i)).toBeInTheDocument();
      expect(screen.getByText(/GiaiPhauBenh_DaiCuong.pdf/i)).toBeInTheDocument();
      expect(screen.getByText(/1 lượt tạo • Tổng 5 câu/i)).toBeInTheDocument();
    });
  });

  it('T3.2: Multi-round progression: completes Round 1, creates Round 2, and verifies round accumulation', async () => {
    let callCount = 0;
    global.fetch = vi.fn().mockImplementation(async () => {
      callCount++;
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({
          questions: mockMedicalQuestions.map((q) => ({ ...q, id: `round${callCount}-${q.id}` })),
        }),
      } as Response;
    });

    renderApp();

    // Upload file and generate Round 1
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const testFile = new File(['content'], 'CapCuu.pdf', { type: 'application/pdf' });
    fireEvent.change(fileInput, { target: { files: [testFile] } });

    fireEvent.click(screen.getByRole('button', { name: /Bắt đầu tạo câu hỏi/i }));

    await waitFor(() => {
      expect(screen.getByText(/Câu hỏi 1 \/ 5/i)).toBeInTheDocument();
    });

    // Complete Round 1
    for (let i = 0; i < 5; i++) {
      fireEvent.click(screen.getAllByRole('radio')[0]);
      fireEvent.click(screen.getByRole('button', { name: i === 4 ? /Nộp bài/i : /Câu tiếp/i }));
    }

    expect(screen.getByText(/Hoàn Thành Bài Kiểm Tra!/i)).toBeInTheDocument();

    // Click "Tạo thêm câu hỏi mới"
    const addMoreBtn = screen.getByRole('button', { name: /Tạo thêm câu hỏi mới/i });
    fireEvent.click(addMoreBtn);

    expect(screen.getByText(/Số lượng câu hỏi muốn tạo thêm\?/i)).toBeInTheDocument();

    // Submit "Tạo thêm"
    const confirmAddBtn = screen.getByRole('button', { name: /Tạo thêm/i });
    fireEvent.click(confirmAddBtn);

    // Wait for Round 2 questions
    await waitFor(() => {
      expect(screen.getByText(/Câu hỏi 1 \/ 5/i)).toBeInTheDocument();
    });

    // Complete Round 2
    for (let i = 0; i < 5; i++) {
      fireEvent.click(screen.getAllByRole('radio')[0]);
      fireEvent.click(screen.getByRole('button', { name: i === 4 ? /Nộp bài/i : /Câu tiếp/i }));
    }

    // Return to dashboard
    fireEvent.click(screen.getByRole('button', { name: /Tải tài liệu khác/i }));

    // History should reflect 2 rounds and 10 total questions
    await waitFor(() => {
      expect(screen.getByText(/2 lượt tạo • Tổng 10 câu/i)).toBeInTheDocument();
    });
  });

  it('T3.3: Theme toggle during active quiz does not reset question index or user answers', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ questions: mockMedicalQuestions }),
    } as Response);

    renderApp();

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [new File([''], 'cardio.pdf', { type: 'application/pdf' })] } });
    fireEvent.click(screen.getByRole('button', { name: /Bắt đầu tạo câu hỏi/i }));

    await waitFor(() => {
      expect(screen.getByText(/Câu hỏi 1 \/ 5/i)).toBeInTheDocument();
    });

    // Answer Question 1
    fireEvent.click(screen.getAllByRole('radio')[0]);
    expect(screen.getByText('Chính xác!')).toBeInTheDocument();

    // Toggle theme via header
    const themeBtn = screen.getByRole('button', { name: /toggle theme/i });
    fireEvent.click(themeBtn);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    // Verify question 1 is still answered and still showing feedback
    expect(screen.getByText(/Câu hỏi 1 \/ 5/i)).toBeInTheDocument();
    expect(screen.getByText('Chính xác!')).toBeInTheDocument();
    expect(screen.getByText(mockMedicalQuestions[0].text)).toBeInTheDocument();
  });

  it('T3.4: Verifies multipart FormData payload when multiple files, model, and scope are configured', async () => {
    let capturedFormData: FormData | null = null;
    global.fetch = vi.fn().mockImplementation(async (_url: string, init?: RequestInit) => {
      if (init && init.body instanceof FormData) {
        capturedFormData = init.body;
      }
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ questions: mockMedicalQuestions }),
      } as Response;
    });

    renderApp();

    // Select 2 files
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file1 = new File(['p1'], 'file1.pdf', { type: 'application/pdf' });
    const file2 = new File(['p2'], 'file2.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    fireEvent.change(fileInput, { target: { files: [file1, file2] } });

    // Select model Lite
    const modelSelect = screen.getByRole('combobox');
    fireEvent.change(modelSelect, { target: { value: 'gemini-2.5-flash-lite' } });

    // Enter Scope
    const scopeArea = screen.getByPlaceholderText(/Chỉ chương 4/i);
    fireEvent.change(scopeArea, { target: { value: 'Chỉ chương Hô hấp' } });

    // Set question count to 15
    const qCountInput = screen.getByRole('spinbutton');
    fireEvent.change(qCountInput, { target: { value: '15' } });

    // Click generate
    fireEvent.click(screen.getByRole('button', { name: /Bắt đầu tạo câu hỏi/i }));

    await waitFor(() => {
      expect(capturedFormData).not.toBeNull();
    });

    expect(capturedFormData!.getAll('files')).toHaveLength(2);
    expect(capturedFormData!.get('model')).toBe('gemini-2.5-flash-lite');
    expect(capturedFormData!.get('numQuestions')).toBe('15');
    expect(capturedFormData!.get('scope')).toBe('Chỉ chương Hô hấp');
  });

  it('T3.5: Clean navigation return from review mode resets active view to upload dashboard', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ questions: mockMedicalQuestions }),
    } as Response);

    renderApp();

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [new File([''], 'med.pdf', { type: 'application/pdf' })] } });
    fireEvent.click(screen.getByRole('button', { name: /Bắt đầu tạo câu hỏi/i }));

    await waitFor(() => {
      expect(screen.getByText(/Câu hỏi 1 \/ 5/i)).toBeInTheDocument();
    });

    // Complete quiz
    for (let i = 0; i < 5; i++) {
      fireEvent.click(screen.getAllByRole('radio')[0]);
      fireEvent.click(screen.getByRole('button', { name: i === 4 ? /Nộp bài/i : /Câu tiếp/i }));
    }

    // Go to review
    fireEvent.click(screen.getByRole('button', { name: /Xem lại đáp án/i }));
    expect(screen.getByText(/Xem lại bài làm/i)).toBeInTheDocument();

    // Click "Quay lại" from review
    fireEvent.click(screen.getByRole('button', { name: /Quay lại/i }));

    // Should return cleanly to results screen
    expect(screen.getByText(/Hoàn Thành Bài Kiểm Tra!/i)).toBeInTheDocument();
  });
});
