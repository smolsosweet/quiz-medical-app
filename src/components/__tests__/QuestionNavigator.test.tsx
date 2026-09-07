import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import QuestionNavigator from '@/components/QuestionNavigator';
import { mockMedicalQuestions } from '@/test/fixtures/quizData';

describe('Feature 11: QuestionNavigator Component', () => {
  const defaultProps = {
    questions: mockMedicalQuestions,
    currentIndex: 0,
    userAnswers: {},
    onSelectQuestion: vi.fn(),
    isOpen: false,
    onToggle: vi.fn(),
  };

  it('renders static header with question count badge', () => {
    render(<QuestionNavigator {...defaultProps} />);
    expect(screen.getByText(/Danh sách câu hỏi/i)).toBeInTheDocument();
    expect(screen.getByText(/Đã làm 0\/5/i)).toBeInTheDocument();
    // Grid should be visible
    expect(screen.getByRole('region', { name: /Bảng câu hỏi/i })).toBeInTheDocument();
  });

  it('renders all question numbers and legend', () => {
    render(<QuestionNavigator {...defaultProps} />);
    // Verify question buttons 1 to 5
    for (let i = 1; i <= 5; i++) {
      expect(screen.getByRole('button', { name: new RegExp(`Câu hỏi ${i}`, 'i') })).toBeInTheDocument();
    }
    // Verify legend
    expect(screen.getByText(/Đang làm/i)).toBeInTheDocument();
    expect(screen.getByText(/Đã trả lời/i)).toBeInTheDocument();
    expect(screen.getByText(/Chưa làm/i)).toBeInTheDocument();
  });

  it('calls onSelectQuestion with target index when question tile is clicked', () => {
    render(<QuestionNavigator {...defaultProps} isOpen={true} />);
    const q3Btn = screen.getByRole('button', { name: /Câu hỏi 3/i });
    fireEvent.click(q3Btn);
    expect(defaultProps.onSelectQuestion).toHaveBeenCalledWith(2);
  });

  it('indicates current question with aria-current="step"', () => {
    render(<QuestionNavigator {...defaultProps} isOpen={true} currentIndex={1} />);
    const q2Btn = screen.getByRole('button', { name: /Câu hỏi 2/i });
    expect(q2Btn).toHaveAttribute('aria-current', 'step');

    const q1Btn = screen.getByRole('button', { name: /Câu hỏi 1/i });
    expect(q1Btn).not.toHaveAttribute('aria-current');
  });

  it('correctly tracks and displays answered status', () => {
    const userAnswers = {
      'med-q1': 'A' as const,
      'med-q2': 'B' as const,
    };
    render(<QuestionNavigator {...defaultProps} isOpen={true} userAnswers={userAnswers} />);
    expect(screen.getByText(/Đã làm 2\/5/i)).toBeInTheDocument();

    const q1Btn = screen.getByRole('button', { name: /Câu hỏi 1.*đã trả lời/i });
    expect(q1Btn).toBeInTheDocument();

    const q3Btn = screen.getByRole('button', { name: /Câu hỏi 3.*chưa trả lời/i });
    expect(q3Btn).toBeInTheDocument();
  });
});
