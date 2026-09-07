import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import QuizInterface from '@/components/QuizInterface';
import { mockMedicalQuestions, mockMedicalRound1 } from '@/test/fixtures/quizData';

describe('Tier 1: QuizInterface Component', () => {
  const defaultProps = {
    questions: mockMedicalQuestions,
    isReviewMode: false,
    historyRounds: [],
    onGenerateMore: vi.fn(),
    onFinishRound: vi.fn(),
    isGenerating: false,
    error: '',
    onNewFile: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Feature 3: Active Quiz Engine & State', () => {
    it('T1.3.1: renders initial question text, question counter and progress bar', () => {
      render(<QuizInterface {...defaultProps} />);
      expect(screen.getByText(/Câu hỏi 1 \/ 5/i)).toBeInTheDocument();
      expect(screen.getByText(mockMedicalQuestions[0].text)).toBeInTheDocument();
      
      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toBeInTheDocument();
    });

    it('T1.3.2: renders 4 option buttons with A, B, C, D choices', () => {
      render(<QuizInterface {...defaultProps} />);
      const radioOptions = screen.getAllByRole('radio');
      expect(radioOptions).toHaveLength(4);
      expect(screen.getByText(mockMedicalQuestions[0].options[0].text)).toBeInTheDocument();
      expect(screen.getByText(mockMedicalQuestions[0].options[1].text)).toBeInTheDocument();
      expect(screen.getByText(mockMedicalQuestions[0].options[2].text)).toBeInTheDocument();
      expect(screen.getByText(mockMedicalQuestions[0].options[3].text)).toBeInTheDocument();
    });

    it('T1.3.3: provides instant feedback and shows explanation upon selecting an option', () => {
      render(<QuizInterface {...defaultProps} />);
      const correctOptionBtn = screen.getByText(mockMedicalQuestions[0].options[0].text).closest('button');
      expect(correctOptionBtn).toBeInTheDocument();

      fireEvent.click(correctOptionBtn!);

      // Should show feedback and explanation
      expect(screen.getByText('Chính xác!')).toBeInTheDocument();
      expect(screen.getByText(mockMedicalQuestions[0].explanation)).toBeInTheDocument();
    });

    it('T1.3.4: locks options after selection to prevent answer flipping', () => {
      render(<QuizInterface {...defaultProps} />);
      const firstOption = screen.getByText(mockMedicalQuestions[0].options[0].text).closest('button');
      const secondOption = screen.getByText(mockMedicalQuestions[0].options[1].text).closest('button');

      fireEvent.click(firstOption!);
      expect(firstOption).toBeDisabled();
      expect(secondOption).toBeDisabled();

      // Attempt clicking second option
      fireEvent.click(secondOption!);
      expect(screen.queryByText('Chưa chính xác!')).not.toBeInTheDocument();
    });

    it('T1.3.5: advances to next question when "Câu tiếp theo" is clicked', () => {
      render(<QuizInterface {...defaultProps} />);
      const firstOption = screen.getByText(mockMedicalQuestions[0].options[0].text).closest('button');
      fireEvent.click(firstOption!);

      const nextBtn = screen.getByRole('button', { name: /Câu tiếp theo/i });
      fireEvent.click(nextBtn);

      expect(screen.getByText(/Câu hỏi 2 \/ 5/i)).toBeInTheDocument();
      expect(screen.getByText(mockMedicalQuestions[1].text)).toBeInTheDocument();
    });

    it('T1.3.6: calculates score and triggers onFinishRound when completing all questions', () => {
      render(<QuizInterface {...defaultProps} />);

      // Answer question 1 (Correct: A)
      fireEvent.click(screen.getByText(mockMedicalQuestions[0].options[0].text).closest('button')!);
      fireEvent.click(screen.getByRole('button', { name: /Câu tiếp theo/i }));

      // Answer question 2 (Correct: B)
      fireEvent.click(screen.getByText(mockMedicalQuestions[1].options[1].text).closest('button')!);
      fireEvent.click(screen.getByRole('button', { name: /Câu tiếp theo/i }));

      // Answer question 3 (Incorrect: B, Correct is A)
      fireEvent.click(screen.getByText(mockMedicalQuestions[2].options[1].text).closest('button')!);
      fireEvent.click(screen.getByRole('button', { name: /Câu tiếp theo/i }));

      // Answer question 4 (Correct: C)
      fireEvent.click(screen.getByText(mockMedicalQuestions[3].options[2].text).closest('button')!);
      fireEvent.click(screen.getByRole('button', { name: /Câu tiếp theo/i }));

      // Answer question 5 (Correct: A)
      fireEvent.click(screen.getByText(mockMedicalQuestions[4].options[0].text).closest('button')!);
      
      const finishBtn = screen.getByRole('button', { name: /Xem kết quả/i });
      fireEvent.click(finishBtn);

      // Score screen should display 4 / 5 correct = 80%
      expect(screen.getByText(/Hoàn Thành Bài Kiểm Tra!/i)).toBeInTheDocument();
      expect(screen.getByText('80%')).toBeInTheDocument();
      expect(screen.getByText(/Bạn đã trả lời đúng 4 \/ 5 câu hỏi/i)).toBeInTheDocument();

      // onFinishRound callback verified
      expect(defaultProps.onFinishRound).toHaveBeenCalledTimes(1);
      expect(defaultProps.onFinishRound).toHaveBeenCalledWith(
        expect.objectContaining({
          'med-q1': 'A',
          'med-q2': 'B',
          'med-q3': 'B',
          'med-q4': 'C',
          'med-q5': 'A',
        })
      );
    });

    it('T1.3.7: allows clicking "Xem lại đáp án" from completion screen to inspect results', () => {
      render(<QuizInterface {...defaultProps} />);

      // Fast complete 5 questions
      for (let i = 0; i < mockMedicalQuestions.length; i++) {
        fireEvent.click(screen.getByText(mockMedicalQuestions[i].options[0].text).closest('button')!);
        const btn = screen.getByRole('button', { name: i === 4 ? /Xem kết quả/i : /Câu tiếp theo/i });
        fireEvent.click(btn);
      }

      const reviewAnswersBtn = screen.getByRole('button', { name: /Xem lại đáp án/i });
      fireEvent.click(reviewAnswersBtn);

      expect(screen.getByText(/Xem lại bài làm/i)).toBeInTheDocument();
    });
  });

  describe('Feature 1: History Review Mode Interface', () => {
    it('T1.1.3: renders review section when initialized with isReviewMode and historyRounds', () => {
      render(
        <QuizInterface 
          {...defaultProps} 
          isReviewMode={true} 
          questions={mockMedicalQuestions} 
          historyRounds={[mockMedicalRound1]} 
        />
      );

      // Should show review header
      expect(screen.getByText(/Lịch sử bài làm|Xem lại bài làm/i)).toBeInTheDocument();
      expect(screen.getByText('Lần 1')).toBeInTheDocument();
    });

    it('T1.1.4: displays all questions and options with explanation in review mode', () => {
      render(
        <QuizInterface 
          {...defaultProps} 
          isReviewMode={true} 
          questions={mockMedicalQuestions} 
          historyRounds={[mockMedicalRound1]} 
        />
      );

      // Verify questions are listed
      expect(screen.getByText(/Bệnh nhân nam 55 tuổi/i)).toBeInTheDocument();
      expect(screen.getByText(/Xử trí ban đầu ưu tiên nhất/i)).toBeInTheDocument();

      // Verify explanation exists
      expect(screen.getByText(/phản ánh hoại tử vùng thành dưới thất trái/i)).toBeInTheDocument();
    });

    it('T1.1.5: triggers onNewFile callback when clicking "Quay lại" from review mode', () => {
      render(
        <QuizInterface 
          {...defaultProps} 
          isReviewMode={true} 
          questions={mockMedicalQuestions} 
          historyRounds={[mockMedicalRound1]} 
        />
      );

      const backBtn = screen.getByRole('button', { name: /Quay lại/i });
      fireEvent.click(backBtn);

      expect(defaultProps.onNewFile).toHaveBeenCalledTimes(1);
    });

    it('T1.1.6: triggers window.print when clicking "In PDF"', () => {
      const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});

      render(
        <QuizInterface 
          {...defaultProps} 
          isReviewMode={true} 
          questions={mockMedicalQuestions} 
          historyRounds={[mockMedicalRound1]} 
        />
      );

      const printBtn = screen.getByRole('button', { name: /In PDF/i });
      fireEvent.click(printBtn);

      expect(printSpy).toHaveBeenCalledTimes(1);
      printSpy.mockRestore();
    });
  });

  describe('Milestone 2 Features (F10, F11, F12)', () => {
    it('F11: supports bidirectional navigation via "Câu trước" button to revisit previous questions', () => {
      render(<QuizInterface {...defaultProps} />);

      // On question 1 (index 0): "Câu trước" is not shown
      expect(screen.queryByRole('button', { name: /Câu trước/i })).not.toBeInTheDocument();

      // Answer question 1 and advance to question 2
      fireEvent.click(screen.getByText(mockMedicalQuestions[0].options[0].text).closest('button')!);
      fireEvent.click(screen.getByRole('button', { name: /Câu tiếp theo/i }));

      // On question 2 (index 1): "Câu trước" is present
      const prevBtn = screen.getByRole('button', { name: /Câu trước/i });
      expect(prevBtn).toBeInTheDocument();
      expect(screen.getByText(/Câu hỏi 2 \/ 5/i)).toBeInTheDocument();

      // Click "Câu trước" to go back to question 1
      fireEvent.click(prevBtn);
      expect(screen.getByText(/Câu hỏi 1 \/ 5/i)).toBeInTheDocument();
      expect(screen.getByText(mockMedicalQuestions[0].text)).toBeInTheDocument();
    });

    it('F11: renders collapsible QuestionNavigator allowing direct question jumps', () => {
      render(<QuizInterface {...defaultProps} />);

      // Open drawer
      const navHeader = screen.getByRole('button', { name: /Danh sách câu hỏi/i });
      fireEvent.click(navHeader);

      // Jump to question 4
      const q4Btn = screen.getByRole('button', { name: /Câu hỏi 4/i });
      fireEvent.click(q4Btn);

      expect(screen.getByText(/Câu hỏi 4 \/ 5/i)).toBeInTheDocument();
      expect(screen.getByText(mockMedicalQuestions[3].text)).toBeInTheDocument();
    });

    it('F12: option buttons have alignItems flex-start, 32px circular badges with flex-shrink 0, and word-break', () => {
      render(<QuizInterface {...defaultProps} />);
      const optionButtons = screen.getAllByRole('radio');
      expect(optionButtons.length).toBeGreaterThan(0);

      const firstBtn = optionButtons[0];
      expect(firstBtn.style.alignItems).toBe('flex-start');
      expect(firstBtn.style.wordBreak).toBe('break-word');

      const badge = firstBtn.querySelector('span');
      expect(badge).toBeInTheDocument();
      expect(badge?.style.width).toBe('32px');
      expect(badge?.style.height).toBe('32px');
      expect(badge?.style.flexShrink).toBe('0');
      expect(badge?.style.marginTop).toBe('2px');
    });

    it('F10: caps review mode animation delay at maximum 0.3s for high question volume', () => {
      render(
        <QuizInterface 
          {...defaultProps} 
          isReviewMode={true} 
          questions={mockMedicalQuestions} 
          historyRounds={[mockMedicalRound1]} 
        />
      );

      const reviewCards = document.querySelectorAll('.review-question-card');
      expect(reviewCards.length).toBe(mockMedicalRound1.questions.length);

      reviewCards.forEach((card) => {
        const delayStr = (card as HTMLElement).style.animationDelay;
        const delaySec = parseFloat(delayStr.replace('s', ''));
        expect(delaySec).toBeLessThanOrEqual(0.3);
      });
    });
  });
});
