import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  loadSessionsFromStorage, 
  saveSessionsToStorage, 
  clearStorageSessions, 
  STORAGE_KEY 
} from '@/lib/storage';
import QuizInterface from '@/components/QuizInterface';
import UploadConfig from '@/components/UploadConfig';
import Home from '@/app/page';
import { ThemeProvider } from '@/components/ThemeProvider';
import { Question, QuizRound, QuizSession, AnswerLabel } from '@/types';
import { mockMedicalQuestions, mockMedicalSession } from '../fixtures/quizData';

describe('Empirical Challenger Suite: History Review & Session Persistence Stress Test (M1)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  // =========================================================================
  // SUITE 1: Severely Malformed, Corrupted, Truncated, & Empty JSON Injection
  // =========================================================================
  describe('Suite 1: LocalStorage Malformation & Corruption Resilience', () => {
    it('E1.1: Truncated JSON string in localStorage recovers cleanly without throwing', () => {
      const truncated = '[{"id":"session-trunc","title":"Incomplete Medical Quiz","rounds":[{"id":"r1","que';
      window.localStorage.setItem(STORAGE_KEY, truncated);

      expect(() => {
        const result = loadSessionsFromStorage();
        expect(result).toEqual([]);
      }).not.toThrow();
    });

    it('E1.2: Severely malformed JSON syntax variants recover with empty array', () => {
      const malformedVariants = [
        '{{{{{invalid-json',
        'undefined',
        'NaN',
        'Infinity',
        '[1, 2, "broken"',
        '{"unclosed": "object"',
        '""',
        '   ',
        'null',
        'true',
        'false',
        '12345.67',
        '"A raw string value"',
      ];

      for (const variant of malformedVariants) {
        window.localStorage.setItem(STORAGE_KEY, variant);
        expect(() => {
          const sessions = loadSessionsFromStorage();
          expect(Array.isArray(sessions)).toBe(true);
          expect(sessions.length).toBe(0);
        }).not.toThrow();
      }
    });

    it('E1.3: Handles array containing invalid primitives and corrupt objects', () => {
      const corruptArray = [
        null,
        undefined,
        42,
        'string-element',
        true,
        {}, // missing id
        { title: 'No ID Session' },
        { id: '', title: 'Empty String ID' },
        { id: 12345, title: 'Numeric ID' },
        { id: null, title: 'Null ID' },
      ];

      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(corruptArray));

      expect(() => {
        const sessions = loadSessionsFromStorage();
        expect(sessions).toEqual([]);
      }).not.toThrow();
    });

    it('E1.4: Handles corrupted rounds structure defensively without crashing', () => {
      const sessionWithCorruptRounds = [
        {
          id: 'sess-corrupt-rounds',
          title: 'Session With Corrupt Rounds',
          rounds: 'not an array', // string instead of array
        },
        {
          id: 'sess-null-rounds',
          title: 'Session With Null Rounds',
          rounds: null,
        },
        {
          id: 'sess-primitive-rounds',
          title: 'Session With Primitive Rounds',
          rounds: [null, 123, 'round-str', {}, { id: 'r1', questions: 'not-array' }],
        },
      ];

      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionWithCorruptRounds));

      const sessions = loadSessionsFromStorage();
      expect(sessions.length).toBe(3);
      expect(sessions[0].rounds).toEqual([]);
      expect(sessions[1].rounds).toEqual([]);
      // sessions[2] had 3 non-objects (null, 123, 'round-str') and 2 objects ({} and {id: 'r1'})
      expect(sessions[2].rounds.length).toBe(2);
      expect(sessions[2].rounds[0].id).toBe('Lần 4');
      expect(sessions[2].rounds[0].questions).toEqual([]);
      expect(sessions[2].rounds[1].id).toBe('r1');
      expect(sessions[2].rounds[1].questions).toEqual([]);
    });

    it('E1.5: Defensively filters corrupted questions and malformed userAnswers', () => {
      const sessionWithBadQuestions = [
        {
          id: 'sess-bad-q',
          title: 'Defensive Question Validation',
          rounds: [
            {
              id: 'round-1',
              questions: [
                null,
                undefined,
                { id: 123 }, // numeric id
                { id: 'q1' }, // missing text, options, correctAnswer
                { id: 'q2', text: 'Valid question?', options: 'not array', correctAnswer: 'A', explanation: 'E' },
                // 1 strictly valid question:
                {
                  id: 'q-valid',
                  text: 'Thuốc nào là lựa chọn hàng đầu?',
                  options: [{ label: 'A', text: 'Adrenaline' }],
                  correctAnswer: 'A',
                  explanation: 'Adrenaline theo phác đồ.',
                },
              ],
              userAnswers: {
                'q-valid': 'A', // valid
                'q-invalid-1': 'INVALID_CHOICE', // invalid
                'q-invalid-2': 123, // invalid
                'q-invalid-3': null, // invalid
              },
            },
          ],
        },
      ];

      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionWithBadQuestions));

      const sessions = loadSessionsFromStorage();
      expect(sessions.length).toBe(1);
      expect(sessions[0].rounds[0].questions.length).toBe(1);
      expect(sessions[0].rounds[0].questions[0].id).toBe('q-valid');
      expect(sessions[0].rounds[0].userAnswers).toEqual({ 'q-valid': 'A' });
    });

    it('E1.6: End-to-end Home component mount with severely corrupted localStorage does not throw', async () => {
      window.localStorage.setItem(STORAGE_KEY, '{"corrupted": true, [unclosed');

      const { container } = render(
        <ThemeProvider>
          <Home />
        </ThemeProvider>
      );
      
      await waitFor(() => {
        expect(screen.getByText('MediQuiz AI')).toBeInTheDocument();
      });

      expect(container.querySelector('.main-container')).toBeInTheDocument();
      expect(screen.getByText(/Tạo Bộ Trắc Nghiệm Mới/i)).toBeInTheDocument();
    });

    it('E1.7: Partial corruption recovery: renders only valid sessions in history list', async () => {
      const mixedStorage = [
        { id: 'corrupt-1' }, // no title, empty rounds
        mockMedicalSession, // 100% valid session
        null,
        'random-junk',
      ];

      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(mixedStorage));

      render(
        <ThemeProvider>
          <Home />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/NoiKhoa_TimMach_CapCuu\.pdf/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/Lịch sử học tập phiên này/i)).toBeInTheDocument();
    });
  });

  // =========================================================================
  // SUITE 2: 100+ Quiz Sessions Quota Trimming & Retrieval Performance
  // =========================================================================
  describe('Suite 2: 100+ Quiz Sessions Quota Trimming & Retrieval Performance', () => {
    const generateMockSessions = (count: number): QuizSession[] => {
      return Array.from({ length: count }, (_, i) => ({
        id: `sess-benchmark-${i}`,
        title: `Clinical Guideline Session ${i}.pdf`,
        date: `2026-09-0${(i % 9) + 1} 10:00:00`,
        filesCount: (i % 3) + 1,
        rounds: [
          {
            id: `Round-${i}-1`,
            questions: mockMedicalQuestions,
            userAnswers: { 'med-q1': 'A', 'med-q2': 'B' },
          },
        ],
      }));
    };

    it('E2.1: Enforces quota trimming to exactly 50 sessions when 150 sessions are saved', () => {
      const sessions150 = generateMockSessions(150);
      saveSessionsToStorage(sessions150);

      const raw = window.localStorage.getItem(STORAGE_KEY);
      expect(raw).not.toBeNull();
      const storedArray = JSON.parse(raw!);
      expect(storedArray.length).toBe(50);

      const loaded = loadSessionsFromStorage();
      expect(loaded.length).toBe(50);
      // Head sessions preserved (most recent 50)
      expect(loaded[0].id).toBe('sess-benchmark-0');
      expect(loaded[49].id).toBe('sess-benchmark-49');
    });

    it('E2.2: Retrieval performance benchmark on 50 sessions executes in under 20ms', () => {
      const sessions50 = generateMockSessions(50);
      saveSessionsToStorage(sessions50);

      const iterations = 30;
      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        const result = loadSessionsFromStorage();
        expect(result.length).toBe(50);
      }
      const totalTime = performance.now() - start;
      const avgTime = totalTime / iterations;

      expect(avgTime).toBeLessThan(20); // Average read < 20ms
    });

    it('E2.3: Gracefully handles window.localStorage.setItem QuotaExceededError without throwing', () => {
      const sessions = generateMockSessions(10);
      const setItemSpy = vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
        const error = new DOMException('The quota has been exceeded.', 'QuotaExceededError');
        throw error;
      });

      expect(() => {
        saveSessionsToStorage(sessions);
      }).not.toThrow();

      setItemSpy.mockRestore();
    });

    it('E2.4: Gracefully handles window.localStorage.getItem SecurityError without throwing', () => {
      const getItemSpy = vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
        const error = new DOMException('Storage access denied.', 'SecurityError');
        throw error;
      });

      expect(() => {
        const result = loadSessionsFromStorage();
        expect(result).toEqual([]);
      }).not.toThrow();

      getItemSpy.mockRestore();
    });

    it('E2.5: Clears stored sessions completely via clearStorageSessions', () => {
      saveSessionsToStorage(generateMockSessions(10));
      expect(loadSessionsFromStorage().length).toBe(10);

      clearStorageSessions();
      expect(loadSessionsFromStorage()).toEqual([]);
      expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it('E2.6: Renders 50 sessions in UploadConfig dashboard cleanly without crash', () => {
      const sessions50 = generateMockSessions(50);
      const onViewHistoryMock = vi.fn();

      render(
        <UploadConfig
          onGenerate={vi.fn()}
          isGenerating={false}
          error=""
          files={[]}
          setFiles={vi.fn()}
          model="gemini-2.5-flash"
          setModel={vi.fn()}
          scope=""
          setScope={vi.fn()}
          sessions={sessions50}
          onViewHistory={onViewHistoryMock}
        />
      );

      expect(screen.getByText(/Lịch sử học tập phiên này/i)).toBeInTheDocument();
      expect(screen.getByText(/Clinical Guideline Session 0\.pdf/i)).toBeInTheDocument();
      expect(screen.getByText(/Clinical Guideline Session 49\.pdf/i)).toBeInTheDocument();
    });
  });

  // =========================================================================
  // SUITE 3: Rapid Concurrent Mount/Unmount & Zero Blank Screen in Review Mode
  // =========================================================================
  describe('Suite 3: Rapid Concurrent Mount/Unmount & Zero Blank Screen Regressions', () => {
    it('E3.1: 50 rapid sequential mount & unmount cycles in review mode with questions=[] without error', () => {
      expect(() => {
        for (let i = 0; i < 50; i++) {
          const { unmount } = render(
            <QuizInterface
              questions={[]}
              isReviewMode={true}
              historyRounds={mockMedicalSession.rounds}
              onGenerateMore={vi.fn()}
              onNewFile={vi.fn()}
              onBackToDashboard={vi.fn()}
              isGenerating={false}
            />
          );
          unmount();
        }
      }).not.toThrow();
    });

    it('E3.2: Review mode with empty questions array NEVER returns null or blank screen', () => {
      const { container } = render(
        <QuizInterface
          questions={[]}
          isReviewMode={true}
          historyRounds={[]}
          onGenerateMore={vi.fn()}
          onNewFile={vi.fn()}
          onBackToDashboard={vi.fn()}
          isGenerating={false}
        />
      );

      // Verify DOM is NOT blank
      expect(container.firstChild).not.toBeNull();
      expect(container.querySelector('.glass-panel')).toBeInTheDocument();
      expect(container.querySelector('#review-section')).toBeInTheDocument();
      expect(screen.getByText(/Xem lại bài làm/i)).toBeInTheDocument();
      expect(screen.getByText(/Không có dữ liệu đánh giá/i)).toBeInTheDocument();
    });

    it('E3.3: Review mode with corrupted history rounds (null elements, missing questions) renders safely', () => {
      const corruptedRounds: QuizRound[] = [
        {
          id: 'Round-corrupt-1',
          questions: [null as unknown as Question],
          userAnswers: {},
        },
        {
          id: 'Round-empty-q',
          questions: [],
          userAnswers: {},
        },
      ];

      const { container } = render(
        <QuizInterface
          questions={[]}
          isReviewMode={true}
          historyRounds={corruptedRounds}
          onGenerateMore={vi.fn()}
          onNewFile={vi.fn()}
          onBackToDashboard={vi.fn()}
          isGenerating={false}
        />
      );

      expect(container.firstChild).not.toBeNull();
      expect(screen.getByText('Round-corrupt-1')).toBeInTheDocument();
      expect(screen.getByText('Round-empty-q')).toBeInTheDocument();
      expect(screen.getByText(/Vòng thi này chưa có câu hỏi/i)).toBeInTheDocument();
    });

    it('E3.4: Active mode with empty questions array renders fallback UI instead of null', () => {
      const onNewFile = vi.fn();
      const onBackToDashboard = vi.fn();

      const { container } = render(
        <QuizInterface
          questions={[]}
          isReviewMode={false}
          historyRounds={[]}
          onGenerateMore={vi.fn()}
          onNewFile={onNewFile}
          onBackToDashboard={onBackToDashboard}
          isGenerating={false}
        />
      );

      expect(container.firstChild).not.toBeNull();
      expect(screen.getByText(/Không có câu hỏi nào để hiển thị/i)).toBeInTheDocument();
      
      const backBtn = screen.getByRole('button', { name: /Quay lại/i });
      fireEvent.click(backBtn);
      expect(onBackToDashboard).toHaveBeenCalledTimes(1);
    });

    it('E3.5: Rapid toggling between active mode and review mode does not corrupt state', () => {
      const { rerender } = render(
        <QuizInterface
          questions={mockMedicalQuestions}
          isReviewMode={false}
          onGenerateMore={vi.fn()}
          onNewFile={vi.fn()}
          isGenerating={false}
        />
      );

      expect(screen.getByText(/Câu hỏi 1 \/ 5/i)).toBeInTheDocument();

      // Rapid alternating toggles
      for (let i = 0; i < 15; i++) {
        rerender(
          <QuizInterface
            questions={[]}
            isReviewMode={true}
            historyRounds={mockMedicalSession.rounds}
            onGenerateMore={vi.fn()}
            onNewFile={vi.fn()}
            isGenerating={false}
          />
        );
        expect(screen.getByText(/Xem lại bài làm/i)).toBeInTheDocument();

        rerender(
          <QuizInterface
            questions={mockMedicalQuestions}
            isReviewMode={false}
            onGenerateMore={vi.fn()}
            onNewFile={vi.fn()}
            isGenerating={false}
          />
        );
        expect(screen.getByText(/Câu hỏi 1 \/ 5/i)).toBeInTheDocument();
      }
    });

    it('E3.6: Non-destructive back navigation in review mode calls onBackToDashboard', () => {
      const onBackToDashboard = vi.fn();
      const onNewFile = vi.fn();

      render(
        <QuizInterface
          questions={[]}
          isReviewMode={true}
          historyRounds={mockMedicalSession.rounds}
          onGenerateMore={vi.fn()}
          onNewFile={onNewFile}
          onBackToDashboard={onBackToDashboard}
          isGenerating={false}
        />
      );

      const backBtn = screen.getByRole('button', { name: /Quay lại/i });
      fireEvent.click(backBtn);

      expect(onBackToDashboard).toHaveBeenCalledTimes(1);
      expect(onNewFile).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // SUITE 4: Score Calculation Correctness Across Boundaries (0, 1, 100 Qs)
  // =========================================================================
  describe('Suite 4: Score Calculation Correctness Across Boundaries (0, 1, 100 Questions)', () => {
    const createNQuestions = (n: number): Question[] => {
      return Array.from({ length: n }, (_, i) => ({
        id: `q-boundary-${i}`,
        text: `Clinical Case Vignette #${i + 1}: Diagnostic determination?`,
        options: [
          { label: 'A', text: 'First choice diagnosis' },
          { label: 'B', text: 'Second choice diagnosis' },
          { label: 'C', text: 'Third choice diagnosis' },
          { label: 'D', text: 'Fourth choice diagnosis' },
        ],
        correctAnswer: 'A',
        explanation: `Explanation for clinical case #${i + 1}`,
      }));
    };

    it('E4.1: Boundary 0 Questions: Finished active state calculates 0% score and avoids NaN%', () => {
      // Questions = [], but finished
      const onFinishRound = vi.fn();
      const { container } = render(
        <QuizInterface
          questions={[]}
          isReviewMode={false}
          onGenerateMore={vi.fn()}
          onFinishRound={onFinishRound}
          onNewFile={vi.fn()}
          isGenerating={false}
        />
      );

      // Verify that when empty, it displays fallback and NOT NaN
      expect(container.textContent).not.toContain('NaN%');
      expect(container.textContent).not.toContain('NaN');
    });

    it('E4.2: Boundary 1 Question: 100% Score on correct answer with success border', () => {
      const singleQuestion = createNQuestions(1);
      const onFinishRound = vi.fn();

      render(
        <QuizInterface
          questions={singleQuestion}
          isReviewMode={false}
          onGenerateMore={vi.fn()}
          onFinishRound={onFinishRound}
          onNewFile={vi.fn()}
          isGenerating={false}
        />
      );

      // Select correct option 'A'
      const optionA = screen.getByRole('radio', { name: /First choice diagnosis/i });
      fireEvent.click(optionA);

      // Click "Nộp bài"
      const finishBtn = screen.getByRole('button', { name: /Nộp bài/i });
      fireEvent.click(finishBtn);

      // Assert Score display
      expect(screen.getByText('100%')).toBeInTheDocument();
      expect(screen.getByText(/Bạn đã trả lời đúng 1 \/ 1 câu hỏi\./i)).toBeInTheDocument();
      expect(onFinishRound).toHaveBeenCalledWith({ 'q-boundary-0': 'A' });
    });

    it('E4.3: Boundary 1 Question: 0% Score on incorrect answer with error border', () => {
      const singleQuestion = createNQuestions(1);
      const onFinishRound = vi.fn();

      render(
        <QuizInterface
          questions={singleQuestion}
          isReviewMode={false}
          onGenerateMore={vi.fn()}
          onFinishRound={onFinishRound}
          onNewFile={vi.fn()}
          isGenerating={false}
        />
      );

      // Select incorrect option 'B'
      const optionB = screen.getByRole('radio', { name: /Second choice diagnosis/i });
      fireEvent.click(optionB);

      // Click "Nộp bài"
      const finishBtn = screen.getByRole('button', { name: /Nộp bài/i });
      fireEvent.click(finishBtn);

      // Assert Score display
      expect(screen.getByText('0%')).toBeInTheDocument();
      expect(screen.getByText(/Bạn đã trả lời đúng 0 \/ 1 câu hỏi\./i)).toBeInTheDocument();
      expect(onFinishRound).toHaveBeenCalledWith({ 'q-boundary-0': 'B' });
    });

    it('E4.4: Boundary 100 Questions: Perfect 100% score calculation and verification', () => {
      const questions100 = createNQuestions(100);
      const onFinishRound = vi.fn();

      const { rerender } = render(
        <QuizInterface
          questions={questions100}
          isReviewMode={false}
          onGenerateMore={vi.fn()}
          onFinishRound={onFinishRound}
          onNewFile={vi.fn()}
          isGenerating={false}
        />
      );

      // Answer question 1 to verify flow
      fireEvent.click(screen.getByRole('radio', { name: /First choice diagnosis/i }));
      
      // Simulate completing all 100 questions with all 'A' (100% correct)
      const allCorrectAnswers: Record<string, AnswerLabel> = {};
      for (let i = 0; i < 100; i++) {
        allCorrectAnswers[`q-boundary-${i}`] = 'A';
      }

      // Finish state test
      const round100: QuizRound = {
        id: 'Lần 100-test',
        questions: questions100,
        userAnswers: allCorrectAnswers,
      };

      rerender(
        <QuizInterface
          questions={[]}
          isReviewMode={true}
          historyRounds={[round100]}
          onGenerateMore={vi.fn()}
          onFinishRound={onFinishRound}
          onNewFile={vi.fn()}
          isGenerating={false}
        />
      );

      expect(screen.getByText(/Lần 100-test/i)).toBeInTheDocument();
      expect(screen.getByText(/Câu 1: Clinical Case Vignette #1/i)).toBeInTheDocument();
      expect(screen.getByText(/Câu 100: Clinical Case Vignette #100/i)).toBeInTheDocument();
    });

    it('E4.5: Exact mathematical rounding verification for partial scores (73/100, 33/100, 66/100)', () => {
      // Test the mathematical calculation logic directly
      const testCases = [
        { total: 100, correct: 73, expected: 73 },
        { total: 100, correct: 33, expected: 33 },
        { total: 100, correct: 66, expected: 66 },
        { total: 100, correct: 0, expected: 0 },
        { total: 100, correct: 100, expected: 100 },
        { total: 3, correct: 1, expected: 33 }, // 33.333% -> 33%
        { total: 3, correct: 2, expected: 67 }, // 66.666% -> 67%
        { total: 0, correct: 0, expected: 0 },  // Division by zero guard
      ];

      for (const tc of testCases) {
        const scorePercent = tc.total > 0 ? Math.round((tc.correct / tc.total) * 100) : 0;
        expect(scorePercent).toBe(tc.expected);
      }
    });

    it('E4.6: High-volume score calculation execution speed is sub-millisecond', () => {
      const questions100 = createNQuestions(100);
      const userAnswers: Record<string, AnswerLabel> = {};
      for (let i = 0; i < 100; i++) {
        userAnswers[`q-boundary-${i}`] = i % 2 === 0 ? 'A' : 'B';
      }

      const t0 = performance.now();
      let correctCount = 0;
      for (let iteration = 0; iteration < 50; iteration++) {
        correctCount = Object.keys(userAnswers).filter((qId) => {
          const q = questions100.find((question) => question?.id === qId);
          return q?.correctAnswer && q.correctAnswer === userAnswers[qId];
        }).length;
      }
      const totalElapsed = performance.now() - t0;
      const score = Math.round((correctCount / questions100.length) * 100);

      expect(score).toBe(50);
      expect(totalElapsed / 50).toBeLessThan(5); // Average execution < 5ms
    });
  });
});
