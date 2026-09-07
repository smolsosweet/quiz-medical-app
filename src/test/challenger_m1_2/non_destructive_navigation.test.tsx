import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Home from '@/app/page';
import QuizInterface from '@/components/QuizInterface';
import { ThemeProvider } from '@/components/ThemeProvider';
import { QuizSession } from '@/types';
import { mockMedicalQuestions, mockMedicalSession } from '@/test/fixtures/quizData';
import { saveSessionsToStorage, loadSessionsFromStorage } from '@/lib/storage';

describe('Non-Destructive Navigation Empirical Suite (F04)', () => {
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

  describe('1. QuizInterface Component Unit Boundaries', () => {
    it('invokes onBackToDashboard and NOT onNewFile when clicking Quay lại in review mode', () => {
      const onBackToDashboard = vi.fn();
      const onNewFile = vi.fn();

      render(
        <QuizInterface
          questions={[]}
          isReviewMode={true}
          historyRounds={mockMedicalSession.rounds}
          onGenerateMore={vi.fn()}
          isGenerating={false}
          onNewFile={onNewFile}
          onBackToDashboard={onBackToDashboard}
        />
      );

      // Verify review mode title is displayed
      expect(screen.getByText(/Xem lại bài làm/i)).toBeInTheDocument();

      const backBtn = screen.getByRole('button', { name: /Quay lại/i });
      fireEvent.click(backBtn);

      expect(onBackToDashboard).toHaveBeenCalledTimes(1);
      expect(onNewFile).not.toHaveBeenCalled();
    });

    it('falls back to onNewFile when onBackToDashboard is not provided in review mode', () => {
      const onNewFile = vi.fn();

      render(
        <QuizInterface
          questions={[]}
          isReviewMode={true}
          historyRounds={mockMedicalSession.rounds}
          onGenerateMore={vi.fn()}
          isGenerating={false}
          onNewFile={onNewFile}
        />
      );

      const backBtn = screen.getByRole('button', { name: /Quay lại/i });
      fireEvent.click(backBtn);

      expect(onNewFile).toHaveBeenCalledTimes(1);
    });

    it('toggles showReview off without calling onBackToDashboard or onNewFile when reviewing active completed round', () => {
      const onBackToDashboard = vi.fn();
      const onNewFile = vi.fn();

      render(
        <QuizInterface
          questions={mockMedicalQuestions}
          isReviewMode={false}
          historyRounds={mockMedicalSession.rounds}
          onGenerateMore={vi.fn()}
          isGenerating={false}
          onNewFile={onNewFile}
          onBackToDashboard={onBackToDashboard}
        />
      );

      // Answer all questions
      for (let i = 0; i < mockMedicalQuestions.length; i++) {
        const optionA = screen.getAllByRole('radio')[0];
        fireEvent.click(optionA);
        const nextBtn = screen.getByRole('button', {
          name: i === mockMedicalQuestions.length - 1 ? /Xem kết quả/i : /Câu tiếp theo/i,
        });
        fireEvent.click(nextBtn);
      }

      // We are on the score summary screen
      expect(screen.getByText(/Hoàn Thành Bài Kiểm Tra!/i)).toBeInTheDocument();

      // Click "Xem lại đáp án"
      fireEvent.click(screen.getByRole('button', { name: /Xem lại đáp án/i }));
      expect(screen.getByText(/Xem lại bài làm/i)).toBeInTheDocument();

      // Click "Quay lại" from answer review
      const backBtn = screen.getByRole('button', { name: /Quay lại/i });
      fireEvent.click(backBtn);

      // Should return to score screen, NOT calling onBackToDashboard or onNewFile
      expect(screen.getByText(/Hoàn Thành Bài Kiểm Tra!/i)).toBeInTheDocument();
      expect(onBackToDashboard).not.toHaveBeenCalled();
      expect(onNewFile).not.toHaveBeenCalled();
    });
  });

  describe('2. Page-level State Preservation on Navigation Round-Trip', () => {
    it('strictly preserves staged TXT/PDF files, selected model, and scope when navigating into review mode and clicking Quay lại', async () => {
      // Seed a session in localStorage using safe storage wrapper
      const existingSession: QuizSession = {
        id: 'sess-cardio-101',
        title: 'BenhHocTimMach_DaiCuong.txt',
        date: '06/09/2026, 12:00:00',
        filesCount: 1,
        rounds: [
          {
            id: 'Lần 1',
            questions: mockMedicalQuestions.slice(0, 2),
            userAnswers: { 'med-q1': 'A' },
          },
        ],
      };
      saveSessionsToStorage([existingSession]);

      renderApp();

      // Wait for session to hydrate from localStorage
      await waitFor(() => {
        expect(screen.getByText('BenhHocTimMach_DaiCuong.txt')).toBeInTheDocument();
      });

      // 1. Stage user files (1 TXT and 1 PDF)
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const fileTxt = new File(['Nội dung suy tim cấp Killip'], 'SuyTimCap_LamSang.txt', { type: 'text/plain' });
      const filePdf = new File(['%PDF-1.4 Dược lý học tim mạch'], 'DuocLyTimMach.pdf', { type: 'application/pdf' });

      fireEvent.change(fileInput, { target: { files: [fileTxt, filePdf] } });

      // Verify both files are rendered in staged file list
      expect(screen.getByText('SuyTimCap_LamSang.txt')).toBeInTheDocument();
      expect(screen.getByText('DuocLyTimMach.pdf')).toBeInTheDocument();

      // 2. Change Model to Gemini 2.5 Flash Lite
      const modelSelect = screen.getByRole('combobox');
      fireEvent.change(modelSelect, { target: { value: 'gemini-2.5-flash-lite' } });
      expect(modelSelect).toHaveValue('gemini-2.5-flash-lite');

      // 3. Enter Custom Scope
      const scopeTextarea = screen.getByPlaceholderText(/Chỉ chương 4/i);
      const customScope = 'Chỉ tập trung vào điều trị suy tim cấp Killip III-IV với Dobutamine và Furosemide.';
      fireEvent.change(scopeTextarea, { target: { value: customScope } });
      expect(scopeTextarea).toHaveValue(customScope);

      // 4. Click on History Card to enter review mode
      const historyCard = screen.getByText('BenhHocTimMach_DaiCuong.txt').closest('.quiz-option')!;
      fireEvent.click(historyCard);

      // Verify we have transitioned to Review Mode
      await waitFor(() => {
        expect(screen.getByText(/Xem lại bài làm/i)).toBeInTheDocument();
        expect(screen.getByText(/ECG có ST chênh lên ở DII, DIII, aVF/i)).toBeInTheDocument();
      });

      // 5. Click "Quay lại" button
      const backButton = screen.getByRole('button', { name: /Quay lại/i });
      fireEvent.click(backButton);

      // 6. Verify view transitioned back to Upload Dashboard
      await waitFor(() => {
        expect(screen.getByText('Tạo Bộ Trắc Nghiệm Mới')).toBeInTheDocument();
      });

      // 7. EMPIRICAL ASSERTIONS: Verify ALL staged state was strictly preserved
      // (a) Staged files must still be displayed
      expect(screen.getByText('SuyTimCap_LamSang.txt')).toBeInTheDocument();
      expect(screen.getByText('DuocLyTimMach.pdf')).toBeInTheDocument();

      // (b) Selected Model must still be gemini-2.5-flash-lite
      const rehydratedModelSelect = screen.getByRole('combobox');
      expect(rehydratedModelSelect).toHaveValue('gemini-2.5-flash-lite');

      // (c) Scope must still contain the custom instruction
      const rehydratedScope = screen.getByPlaceholderText(/Chỉ chương 4/i);
      expect(rehydratedScope).toHaveValue(customScope);

      // (d) History session list must still be present
      expect(screen.getByText('BenhHocTimMach_DaiCuong.txt')).toBeInTheDocument();

      // (e) The generate button must be enabled and ready to generate with staged files
      const generateBtn = screen.getByRole('button', { name: /Bắt đầu tạo câu hỏi/i });
      expect(generateBtn).not.toBeDisabled();
    });

    it('verifies that clicking Generate after returning from history review transmits the preserved files, model, and scope', async () => {
      const existingSession: QuizSession = {
        id: 'sess-prev',
        title: 'LichSuCu.txt',
        date: '06/09/2026',
        filesCount: 1,
        rounds: [
          {
            id: 'Lần 1',
            questions: mockMedicalQuestions.slice(0, 2),
            userAnswers: { 'med-q1': 'A' },
          },
        ],
      };
      saveSessionsToStorage([existingSession]);

      let capturedFormData: FormData | null = null;
      global.fetch = vi.fn().mockImplementation(async (_url, options) => {
        if (options && options.body instanceof FormData) {
          capturedFormData = options.body;
        }
        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ questions: mockMedicalQuestions }),
        } as Response;
      });

      renderApp();

      await waitFor(() => {
        expect(screen.getByText('LichSuCu.txt')).toBeInTheDocument();
      });

      // Stage file and config
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const testFile = new File(['Cardio syllabus text'], 'TimMach_Preserved.txt', { type: 'text/plain' });
      fireEvent.change(fileInput, { target: { files: [testFile] } });

      const modelSelect = screen.getByRole('combobox');
      fireEvent.change(modelSelect, { target: { value: 'gemini-2.5-flash-lite' } });

      const scopeTextarea = screen.getByPlaceholderText(/Chỉ chương 4/i);
      fireEvent.change(scopeTextarea, { target: { value: 'Phần hồi sức cấp cứu' } });

      // View history then return
      fireEvent.click(screen.getByText('LichSuCu.txt').closest('.quiz-option')!);
      await waitFor(() => {
        expect(screen.getByText(/Xem lại bài làm/i)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Quay lại/i }));
      await waitFor(() => {
        expect(screen.getByText('Tạo Bộ Trắc Nghiệm Mới')).toBeInTheDocument();
      });

      // Trigger generation with preserved configuration
      const generateBtn = screen.getByRole('button', { name: /Bắt đầu tạo câu hỏi/i });
      fireEvent.click(generateBtn);

      await waitFor(() => {
        expect(capturedFormData).not.toBeNull();
      });

      // Verify captured form data contains the preserved parameters
      const filesSent = capturedFormData!.getAll('files') as File[];
      expect(filesSent).toHaveLength(1);
      expect(filesSent[0].name).toBe('TimMach_Preserved.txt');
      expect(capturedFormData!.get('model')).toBe('gemini-2.5-flash-lite');
      expect(capturedFormData!.get('scope')).toBe('Phần hồi sức cấp cứu');
    });

    it('contrasts with Tải tài liệu khác (handleNewFile) which deliberately clears staged files and state', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ questions: mockMedicalQuestions }),
      } as Response);

      renderApp();

      // Stage file and generate
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(fileInput, {
        target: { files: [new File(['text'], 'WipeTest.txt', { type: 'text/plain' })] },
      });

      fireEvent.click(screen.getByRole('button', { name: /Bắt đầu tạo câu hỏi/i }));

      await waitFor(() => {
        expect(screen.getByText(/Câu hỏi 1 \/ 5/i)).toBeInTheDocument();
      });

      // Complete quiz
      for (let i = 0; i < mockMedicalQuestions.length; i++) {
        fireEvent.click(screen.getAllByRole('radio')[0]);
        fireEvent.click(
          screen.getByRole('button', {
            name: i === mockMedicalQuestions.length - 1 ? /Xem kết quả/i : /Câu tiếp theo/i,
          })
        );
      }

      expect(screen.getByText(/Hoàn Thành Bài Kiểm Tra!/i)).toBeInTheDocument();

      // Click "Tải tài liệu khác"
      fireEvent.click(screen.getByRole('button', { name: /Tải tài liệu khác/i }));

      // Verify return to dashboard
      await waitFor(() => {
        expect(screen.getByText('Tạo Bộ Trắc Nghiệm Mới')).toBeInTheDocument();
      });

      // Files should be wiped:
      // (1) Generate button must now be disabled because files array was cleared
      expect(screen.getByRole('button', { name: /Bắt đầu tạo câu hỏi/i })).toBeDisabled();
      // (2) Staged file delete button ('Xóa') must NOT be present
      expect(screen.queryByTitle('Xóa')).not.toBeInTheDocument();
    });

    it('AC-1 / Finding 1: viewing history and returning via Quay lại does not contaminate or overwrite historical session when generating and finishing a new quiz', async () => {
      const existingSession: QuizSession = {
        id: 'sess-historical-cardio',
        title: 'LichSuCu.pdf',
        date: '06/09/2026, 10:00:00',
        filesCount: 1,
        rounds: [
          {
            id: 'Lần 1',
            questions: mockMedicalQuestions.slice(0, 2),
            userAnswers: { 'med-q1': 'A' },
          },
        ],
      };
      saveSessionsToStorage([existingSession]);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ questions: mockMedicalQuestions }),
      } as Response);

      renderApp();

      // Wait for historical session to hydrate
      await waitFor(() => {
        expect(screen.getByText('LichSuCu.pdf')).toBeInTheDocument();
      });

      // 1. View historical session
      fireEvent.click(screen.getByText('LichSuCu.pdf').closest('.quiz-option')!);
      await waitFor(() => {
        expect(screen.getByText(/Xem lại bài làm/i)).toBeInTheDocument();
      });

      // 2. Return to dashboard via "Quay lại"
      fireEvent.click(screen.getByRole('button', { name: /Quay lại/i }));
      await waitFor(() => {
        expect(screen.getByText('Tạo Bộ Trắc Nghiệm Mới')).toBeInTheDocument();
      });

      // 3. Stage a new file for a new quiz
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const newFile = new File(['Nội dung giải phẫu bệnh mới'], 'BenhHocMoi.pdf', { type: 'application/pdf' });
      fireEvent.change(fileInput, { target: { files: [newFile] } });

      // 4. Generate quiz
      fireEvent.click(screen.getByRole('button', { name: /Bắt đầu tạo câu hỏi/i }));
      await waitFor(() => {
        expect(screen.getByText(/Câu hỏi 1 \/ 5/i)).toBeInTheDocument();
      });

      // 5. Answer all questions to trigger handleFinishRound
      for (let i = 0; i < mockMedicalQuestions.length; i++) {
        fireEvent.click(screen.getAllByRole('radio')[0]);
        fireEvent.click(
          screen.getByRole('button', {
            name: i === mockMedicalQuestions.length - 1 ? /Xem kết quả/i : /Câu tiếp theo/i,
          })
        );
      }

      expect(screen.getByText(/Hoàn Thành Bài Kiểm Tra!/i)).toBeInTheDocument();

      // 6. Inspect localStorage to verify historical session was NOT contaminated or overwritten
      await waitFor(() => {
        const storedSessions = loadSessionsFromStorage();
        expect(storedSessions).toHaveLength(2);
        
        // Find historical session and verify it is untampered
        const historical = storedSessions.find((s: QuizSession) => s.id === 'sess-historical-cardio');
        expect(historical).toBeDefined();
        expect(historical?.title).toBe('LichSuCu.pdf');
        expect(historical?.rounds).toHaveLength(1);

        // Find newly generated session
        const newlyCreated = storedSessions.find((s: QuizSession) => s.id !== 'sess-historical-cardio');
        expect(newlyCreated).toBeDefined();
        expect(newlyCreated?.title).toBe('BenhHocMoi.pdf');
        expect(newlyCreated?.rounds).toHaveLength(1);
      });
    });
  });
});
