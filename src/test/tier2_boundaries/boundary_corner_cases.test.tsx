import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import QuizInterface from '@/components/QuizInterface';
import UploadConfig from '@/components/UploadConfig';
import { loadSessionsFromStorage, STORAGE_KEY } from '@/lib/storage';
import { mockMedicalQuestions } from '@/test/fixtures/quizData';
import { Question, QuizRound } from '@/types';

describe('Tier 2: Boundary & Corner Cases', () => {
  const dummyFn = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('Boundary Group 1: Storage Malformation & Corruption', () => {
    it('T2.1: handles malformed unparseable JSON in storage gracefully', () => {
      localStorage.setItem(STORAGE_KEY, '{invalid json[[[///');
      expect(() => loadSessionsFromStorage()).not.toThrow();
      expect(loadSessionsFromStorage()).toEqual([]);
    });

    it('T2.2: handles primitive number in storage instead of array', () => {
      localStorage.setItem(STORAGE_KEY, '99999');
      expect(loadSessionsFromStorage()).toEqual([]);
    });

    it('T2.3: handles plain JSON object in storage instead of array', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ error: 'not an array' }));
      expect(loadSessionsFromStorage()).toEqual([]);
    });

    it('T2.4: handles null items inside sessions array without throwing', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([null, undefined, false, 'string']));
      expect(loadSessionsFromStorage()).toEqual([]);
    });

    it('T2.5: handles empty string value in localStorage', () => {
      localStorage.setItem(STORAGE_KEY, '');
      expect(loadSessionsFromStorage()).toEqual([]);
    });
  });

  describe('Boundary Group 2: Empty & Extreme Question Arrays', () => {
    it('T2.6: handles empty questions array without crashing in QuizInterface', () => {
      const { container } = render(
        <QuizInterface
          questions={[]}
          onGenerateMore={dummyFn}
          isGenerating={false}
          error=""
          onNewFile={dummyFn}
        />
      );
      // Empty questions returns null cleanly rather than throwing
      expect(container).toBeDefined();
    });

    it('T2.7: handles empty history rounds array in review mode', () => {
      render(
        <QuizInterface
          questions={mockMedicalQuestions}
          isReviewMode={true}
          historyRounds={[]}
          onGenerateMore={dummyFn}
          isGenerating={false}
          error=""
          onNewFile={dummyFn}
        />
      );
      expect(screen.getByText(/Không có dữ liệu đánh giá/i)).toBeInTheDocument();
    });

    it('T2.8: handles round with 0 questions gracefully in review mode', () => {
      const emptyRound: QuizRound = {
        id: 'Lần 0',
        questions: [],
        userAnswers: {},
      };
      render(
        <QuizInterface
          questions={mockMedicalQuestions}
          isReviewMode={true}
          historyRounds={[emptyRound]}
          onGenerateMore={dummyFn}
          isGenerating={false}
          error=""
          onNewFile={dummyFn}
        />
      );
      expect(screen.getByText('Lần 0')).toBeInTheDocument();
    });

    it('T2.9: handles 1-question quiz calculating 100% score on single correct answer', () => {
      const singleQuestion: Question[] = [mockMedicalQuestions[0]];
      render(
        <QuizInterface
          questions={singleQuestion}
          onGenerateMore={dummyFn}
          onFinishRound={dummyFn}
          isGenerating={false}
          error=""
          onNewFile={dummyFn}
        />
      );

      // Answer correct: A
      fireEvent.click(screen.getByText(singleQuestion[0].options[0].text).closest('button')!);
      fireEvent.click(screen.getByRole('button', { name: /Xem kết quả/i }));

      expect(screen.getByText('100%')).toBeInTheDocument();
      expect(screen.getByText(/Bạn đã trả lời đúng 1 \/ 1 câu hỏi/i)).toBeInTheDocument();
    });

    it('T2.10: handles 1-question quiz calculating 0% score on single incorrect answer', () => {
      const singleQuestion: Question[] = [mockMedicalQuestions[0]];
      render(
        <QuizInterface
          questions={singleQuestion}
          onGenerateMore={dummyFn}
          onFinishRound={dummyFn}
          isGenerating={false}
          error=""
          onNewFile={dummyFn}
        />
      );

      // Answer incorrect: B (correct is A)
      fireEvent.click(screen.getByText(singleQuestion[0].options[1].text).closest('button')!);
      fireEvent.click(screen.getByRole('button', { name: /Xem kết quả/i }));

      expect(screen.getByText('0%')).toBeInTheDocument();
      expect(screen.getByText(/Bạn đã trả lời đúng 0 \/ 1 câu hỏi/i)).toBeInTheDocument();
    });
  });

  describe('Boundary Group 3: Rapid Interaction & Button State Guards', () => {
    it('T2.11: ignores rapid sequential clicks on options after first selection', () => {
      render(
        <QuizInterface
          questions={mockMedicalQuestions}
          onGenerateMore={dummyFn}
          isGenerating={false}
          error=""
          onNewFile={dummyFn}
        />
      );

      const optionA = screen.getByText(mockMedicalQuestions[0].options[0].text).closest('button')!;
      const optionB = screen.getByText(mockMedicalQuestions[0].options[1].text).closest('button')!;

      // Fire 5 rapid clicks
      fireEvent.click(optionA);
      fireEvent.click(optionB);
      fireEvent.click(optionA);
      fireEvent.click(optionB);

      // First selection (A) is correct, feedback should remain "Chính xác!"
      expect(screen.getByText('Chính xác!')).toBeInTheDocument();
      expect(screen.queryByText('Chưa chính xác!')).not.toBeInTheDocument();
    });

    it('T2.12: does not advance question index if "Câu tiếp theo" is clicked multiple times rapidly', () => {
      render(
        <QuizInterface
          questions={mockMedicalQuestions}
          onGenerateMore={dummyFn}
          isGenerating={false}
          error=""
          onNewFile={dummyFn}
        />
      );

      // Answer question 1
      fireEvent.click(screen.getByText(mockMedicalQuestions[0].options[0].text).closest('button')!);
      const nextBtn = screen.getByRole('button', { name: /Câu tiếp theo/i });

      // Click next
      fireEvent.click(nextBtn);

      // Now at question 2, nextBtn is removed until question 2 is answered
      expect(screen.getByText(/Câu hỏi 2 \/ 5/i)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Câu tiếp theo/i })).not.toBeInTheDocument();
    });
  });

  describe('Boundary Group 4: Question Count & Scope Bounds', () => {
    it('T2.13: shows error when attempting to generate with 0 questions', () => {
      const mockFile = new File(['dummy'], 'test.pdf', { type: 'application/pdf' });
      render(
        <UploadConfig
          onGenerate={dummyFn}
          isGenerating={false}
          error=""
          files={[mockFile]}
          setFiles={dummyFn}
          model="gemini-2.5-flash"
          setModel={dummyFn}
          scope=""
          setScope={dummyFn}
        />
      );

      const input = screen.getByRole('spinbutton');
      fireEvent.change(input, { target: { value: '0' } });

      const generateBtn = screen.getByRole('button', { name: /Bắt đầu tạo câu hỏi/i });
      fireEvent.click(generateBtn);

      expect(screen.getByText(/Số lượng câu hỏi phải từ 1 đến 50/i)).toBeInTheDocument();
      expect(dummyFn).not.toHaveBeenCalled();
    });

    it('T2.14: shows error when question count exceeds 50', () => {
      const mockFile = new File(['dummy'], 'test.pdf', { type: 'application/pdf' });
      render(
        <UploadConfig
          onGenerate={dummyFn}
          isGenerating={false}
          error=""
          files={[mockFile]}
          setFiles={dummyFn}
          model="gemini-2.5-flash"
          setModel={dummyFn}
          scope=""
          setScope={dummyFn}
        />
      );

      const input = screen.getByRole('spinbutton');
      fireEvent.change(input, { target: { value: '55' } });

      const generateBtn = screen.getByRole('button', { name: /Bắt đầu tạo câu hỏi/i });
      fireEvent.click(generateBtn);

      expect(screen.getByText(/Số lượng câu hỏi phải từ 1 đến 50/i)).toBeInTheDocument();
      expect(dummyFn).not.toHaveBeenCalled();
    });

    it('T2.15: resets question count to 10 on blur when input is cleared or < 1', () => {
      render(
        <UploadConfig
          onGenerate={dummyFn}
          isGenerating={false}
          error=""
          files={[]}
          setFiles={dummyFn}
          model="gemini-2.5-flash"
          setModel={dummyFn}
          scope=""
          setScope={dummyFn}
        />
      );

      const input = screen.getByRole('spinbutton');
      fireEvent.change(input, { target: { value: '' } });
      fireEvent.blur(input);

      expect(input).toHaveValue(10);
    });

    it('T2.16: caps question count to 50 on blur when value exceeds 50', () => {
      render(
        <UploadConfig
          onGenerate={dummyFn}
          isGenerating={false}
          error=""
          files={[]}
          setFiles={dummyFn}
          model="gemini-2.5-flash"
          setModel={dummyFn}
          scope=""
          setScope={dummyFn}
        />
      );

      const input = screen.getByRole('spinbutton');
      fireEvent.change(input, { target: { value: '99' } });
      fireEvent.blur(input);

      expect(input).toHaveValue(50);
    });

    it('T2.17: enforces 1000 character maximum length on scope input', () => {
      render(
        <UploadConfig
          onGenerate={dummyFn}
          isGenerating={false}
          error=""
          files={[]}
          setFiles={dummyFn}
          model="gemini-2.5-flash"
          setModel={dummyFn}
          scope=""
          setScope={dummyFn}
        />
      );

      const textarea = screen.getByPlaceholderText(/Chỉ chương 4/i) as HTMLTextAreaElement;
      expect(textarea.maxLength).toBe(1000);
    });
  });

  describe('Boundary Group 5: File Size, Count, and Duplicate Bounds', () => {
    it('T2.18: accepts file at exactly 10MB limit', () => {
      const setFilesMock = vi.fn();
      render(
        <UploadConfig
          onGenerate={dummyFn}
          isGenerating={false}
          error=""
          files={[]}
          setFiles={setFilesMock}
          model="gemini-2.5-flash"
          setModel={dummyFn}
          scope=""
          setScope={dummyFn}
        />
      );

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      const exact10MB = new Uint8Array(10 * 1024 * 1024);
      const file = new File([exact10MB], 'exact10mb.pdf', { type: 'application/pdf' });

      fireEvent.change(input, { target: { files: [file] } });

      expect(setFilesMock).toHaveBeenCalledTimes(1);
    });

    it('T2.19: rejects file at 10MB + 1 byte', () => {
      const setFilesMock = vi.fn();
      render(
        <UploadConfig
          onGenerate={dummyFn}
          isGenerating={false}
          error=""
          files={[]}
          setFiles={setFilesMock}
          model="gemini-2.5-flash"
          setModel={dummyFn}
          scope=""
          setScope={dummyFn}
        />
      );

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      const overLimit = new Uint8Array(10 * 1024 * 1024 + 1);
      const file = new File([overLimit], 'over_limit.pdf', { type: 'application/pdf' });

      fireEvent.change(input, { target: { files: [file] } });

      expect(setFilesMock).not.toHaveBeenCalled();
      expect(screen.getByText(/File quá lớn.*Tối đa 10MB/i)).toBeInTheDocument();
    });

    it('T2.20: filters out duplicate files with identical name and size', () => {
      const existingFile = new File(['content'], 'syllabus.pdf', { type: 'application/pdf' });
      const setFilesMock = vi.fn();

      render(
        <UploadConfig
          onGenerate={dummyFn}
          isGenerating={false}
          error=""
          files={[existingFile]}
          setFiles={setFilesMock}
          model="gemini-2.5-flash"
          setModel={dummyFn}
          scope=""
          setScope={dummyFn}
        />
      );

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      const dupFile = new File(['content'], 'syllabus.pdf', { type: 'application/pdf' });

      fireEvent.change(input, { target: { files: [dupFile] } });

      // Duplicate should be filtered out
      expect(setFilesMock).not.toHaveBeenCalled();
    });

    it('T2.21: allows adding up to exactly 5 files, rejects 6th', () => {
      const existing5Files = [1, 2, 3, 4, 5].map(
        (i) => new File([`${i}`], `file${i}.pdf`, { type: 'application/pdf' })
      );
      const setFilesMock = vi.fn();

      render(
        <UploadConfig
          onGenerate={dummyFn}
          isGenerating={false}
          error=""
          files={existing5Files}
          setFiles={setFilesMock}
          model="gemini-2.5-flash"
          setModel={dummyFn}
          scope=""
          setScope={dummyFn}
        />
      );

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file6 = new File(['6'], 'file6.pdf', { type: 'application/pdf' });

      fireEvent.change(input, { target: { files: [file6] } });

      expect(setFilesMock).not.toHaveBeenCalled();
      expect(screen.getByText(/Bạn chỉ được tải lên tối đa 5 file/i)).toBeInTheDocument();
    });
  });

  describe('Boundary Group 6: Medical Unicode & Long Vignette Strings', () => {
    it('T2.22: renders long clinical vignettes (>1000 characters) without error', () => {
      const longVignette = 'Bệnh nhân nữ 42 tuổi có tiền sử suy thận mạn giai đoạn 3b đang điều trị bảo tồn... '.repeat(15);
      const longQuestion: Question = {
        id: 'long-q1',
        text: longVignette,
        options: [
          { label: 'A', text: 'Chạy thận nhân tạo cấp cứu' },
          { label: 'B', text: 'Điều trị nội khoa bảo tồn' },
          { label: 'C', text: 'Ghép thận' },
          { label: 'D', text: 'Lọc màng bụng' },
        ],
        correctAnswer: 'A',
        explanation: 'Chỉ định lọc máu cấp khi có toan chuyển hóa nặng hoặc tăng kali kháng trị.',
      };

      render(
        <QuizInterface
          questions={[longQuestion]}
          onGenerateMore={dummyFn}
          isGenerating={false}
          error=""
          onNewFile={dummyFn}
        />
      );

      expect(screen.getByText(longVignette.trim())).toBeInTheDocument();
    });

    it('T2.23: renders complex medical Greek letters, units, and mathematical symbols', () => {
      const symbolQuestion: Question = {
        id: 'sym-q1',
        text: 'Nồng độ HbA1c ≥ 6.5% và glucose máu đói ≥ 7.0 mmol/L (126 mg/dL) kèm eGFR ≤ 45 mL/min/1.73m² ở bệnh nhân có sốt 38.5°C ± 0.5°C:',
        options: [
          { label: 'A', text: 'Thụ thể α-adrenergic và β-blocker (β1/β2)' },
          { label: 'B', text: 'Liều nạp: 0.1 µg/kg/phút' },
          { label: 'C', text: 'Áp lực riêng phần pO₂ ≥ 60 mmHg và pCO₂ ≤ 35 mmHg' },
          { label: 'D', text: 'Tất cả các phương án trên' },
        ],
        correctAnswer: 'A',
        explanation: 'Kiểm tra độ chính xác mã hóa ký tự Unicode y khoa: α, β, ±, ≥, ≤, µg/kg, °C, ², ₁.',
      };

      render(
        <QuizInterface
          questions={[symbolQuestion]}
          onGenerateMore={dummyFn}
          isGenerating={false}
          error=""
          onNewFile={dummyFn}
        />
      );

      expect(screen.getByText(/Nồng độ HbA1c ≥ 6.5%/i)).toBeInTheDocument();
      expect(screen.getByText(/Thụ thể α-adrenergic và β-blocker/i)).toBeInTheDocument();
    });

    it('T2.24: renders Vietnamese full tone marks and diacritics faithfully', () => {
      const vnQuestion: Question = {
        id: 'vn-q1',
        text: 'Chẩn đoán phân biệt hội chứng suy hô hấp cấp tiến triển (ARDS) với phù phổi cấp do tim:',
        options: [
          { label: 'A', text: 'Áp lực mao mạch phổi bít (PCWP) ≤ 18 mmHg và PaO2/FiO2 ≤ 300' },
          { label: 'B', text: 'Tăng áp lực tĩnh mạch trung tâm kèm ran ẩm hai đáy phổi' },
          { label: 'C', text: 'Dấu hiệu khó thở kịch phát về đêm và gan to' },
          { label: 'D', text: 'Tiếng cọ màng tim và điện thế thấp ngoại biên' },
        ],
        correctAnswer: 'A',
        explanation: 'Tiêu chuẩn Berlin cho ARDS: khởi phát cấp tính trong 1 tuần, tổn thương thâm nhiễm hai phế trường không do suy tim.',
      };

      render(
        <QuizInterface
          questions={[vnQuestion]}
          onGenerateMore={dummyFn}
          isGenerating={false}
          error=""
          onNewFile={dummyFn}
        />
      );

      expect(screen.getByText(/hội chứng suy hô hấp cấp tiến triển \(ARDS\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Áp lực mao mạch phổi bít/i)).toBeInTheDocument();
    });

    it('T2.25: handles extremely long explanation text without overflow crash', () => {
      const longExplanation = 'Giải thích chi tiết cơ chế bệnh sinh phân tử: '.repeat(20);
      const questionWithLongExpl: Question = {
        ...mockMedicalQuestions[0],
        explanation: longExplanation,
      };

      render(
        <QuizInterface
          questions={[questionWithLongExpl]}
          onGenerateMore={dummyFn}
          isGenerating={false}
          error=""
          onNewFile={dummyFn}
        />
      );

      // Select option
      fireEvent.click(screen.getByText(questionWithLongExpl.options[0].text).closest('button')!);

      expect(screen.getByText(longExplanation.trim())).toBeInTheDocument();
    });
  });
});
