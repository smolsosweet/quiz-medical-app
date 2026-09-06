"use client";

import React, { useState, useEffect, useRef } from "react";
import { Question, QuizRound, AnswerLabel } from "@/types";
import { CheckCircle2, XCircle, ChevronRight, RefreshCw, Upload, List, Printer } from "lucide-react";

interface Props {
  questions: Question[];
  isReviewMode?: boolean;
  historyRounds?: QuizRound[];
  onGenerateMore: (numQ: number) => void;
  onFinishRound?: (userAnswers: Record<string, AnswerLabel>) => void;
  isGenerating: boolean;
  error: string;
  onNewFile: () => void;
}

export default function QuizInterface({ 
  questions, 
  isReviewMode = false, 
  historyRounds = [], 
  onGenerateMore, 
  onFinishRound, 
  isGenerating, 
  error, 
  onNewFile 
}: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, AnswerLabel>>({});
  const [isFinished, setIsFinished] = useState(isReviewMode);
  const [showReview, setShowReview] = useState(isReviewMode);
  const hasFinishedRef = useRef(false);
  
  const [showAddQuestions, setShowAddQuestions] = useState(false);
  const [newNumQuestions, setNewNumQuestions] = useState(10);

  // Sync state when entering review mode from history
  useEffect(() => {
    if (isReviewMode) {
      setIsFinished(true);
      setShowReview(true);
    }
  }, [isReviewMode]);

  // Reset lock when questions change (new round)
  useEffect(() => {
    hasFinishedRef.current = false;
    setCurrentIndex(0);
    setUserAnswers({});
    setIsFinished(false);
    setShowReview(false);
    setShowAddQuestions(false);
  }, [questions]);

  useEffect(() => {
    if (isFinished && !isReviewMode && onFinishRound && !hasFinishedRef.current) {
      hasFinishedRef.current = true;
      onFinishRound(userAnswers);
    }
  }, [isFinished, isReviewMode, onFinishRound, userAnswers]);

  const currentQuestion = questions && questions.length > 0 ? questions[currentIndex] : null;
  const hasAnsweredCurrent = currentQuestion ? !!userAnswers[currentQuestion.id] : false;
  const selectedAnswer = currentQuestion ? userAnswers[currentQuestion.id] : undefined;
  const isCorrect = currentQuestion ? selectedAnswer === currentQuestion.correctAnswer : false;

  const handleSelectOption = (label: AnswerLabel) => {
    if (hasAnsweredCurrent || !currentQuestion) return;
    setUserAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: label
    }));
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setIsFinished(true);
    }
  };

  if (isFinished) {
    let scorePercent = 0;
    let correctCount = 0;
    
    if (!isReviewMode && questions.length > 0) {
      correctCount = Object.keys(userAnswers).filter(
        (qId) => {
          const q = questions.find(question => question.id === qId);
          return q?.correctAnswer === userAnswers[qId];
        }
      ).length;
      scorePercent = Math.round((correctCount / questions.length) * 100);
    }

    return (
      <div className="glass-panel animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
        {!showReview ? (
          showAddQuestions ? (
            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Số lượng câu hỏi muốn tạo thêm? (1-50)</h2>
              <input 
                type="number" 
                className="input-field" 
                value={newNumQuestions}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setNewNumQuestions(isNaN(val) ? 0 : val);
                }}
                onBlur={() => {
                  if (newNumQuestions < 1) setNewNumQuestions(10);
                  if (newNumQuestions > 50) setNewNumQuestions(50);
                }}
                min={1}
                max={50}
                style={{ maxWidth: '200px', margin: '0 auto 1.5rem', display: 'block', textAlign: 'center' }}
              />
              {error && <p style={{ color: 'var(--error-color)', marginBottom: '1rem' }}>{error}</p>}
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <button 
                  className="btn-secondary" 
                  onClick={() => setShowAddQuestions(false)}
                  disabled={isGenerating}
                >
                  Hủy
                </button>
                <button 
                  className="btn-primary" 
                  onClick={() => onGenerateMore(newNumQuestions)}
                  disabled={isGenerating || newNumQuestions < 1 || newNumQuestions > 50}
                >
                  {isGenerating ? "Đang tạo..." : "Tạo thêm"}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
              <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Hoàn Thành Bài Kiểm Tra!</h2>
              <div style={{ 
                width: '150px', height: '150px', 
                borderRadius: '50%', 
                border: `8px solid ${scorePercent >= 50 ? 'var(--success-color)' : 'var(--error-color)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 2rem',
                fontSize: '2.5rem', fontWeight: 800
              }}>
                {scorePercent}%
              </div>
              <p style={{ fontSize: '1.2rem', marginBottom: '2rem' }}>
                Bạn đã trả lời đúng {correctCount} / {questions.length} câu hỏi.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '300px', margin: '0 auto' }}>
                <button className="btn-primary" onClick={() => setShowReview(true)}>
                  <List size={20} /> Xem lại đáp án
                </button>
                <button className="btn-secondary" onClick={() => setShowAddQuestions(true)}>
                  <RefreshCw size={20} /> Tạo thêm câu hỏi mới
                </button>
                <button className="btn-secondary" onClick={onNewFile}>
                  <Upload size={20} /> Tải tài liệu khác
                </button>
              </div>
            </div>
          )
        ) : (
          <div id="review-section">
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2>Xem lại bài làm</h2>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button className="btn-primary" onClick={() => window.print()} title="In trang này ra PDF">
                  <Printer size={20} /> In PDF
                </button>
                <button className="btn-secondary" onClick={() => {
                  if (isReviewMode) {
                    onNewFile();
                  } else {
                    setShowReview(false);
                  }
                }}>Quay lại</button>
              </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
              {historyRounds.length > 0 ? (
                historyRounds.map((round) => (
                  <div key={round.id} style={{ border: '1px solid var(--border-color)', padding: '1.5rem', borderRadius: '12px', backgroundColor: 'var(--surface-color)' }}>
                    <h3 style={{ marginBottom: '1.5rem', color: 'var(--primary-color)', borderBottom: '2px solid var(--border-color)', paddingBottom: '0.5rem' }}>{round.id}</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                      {round.questions.map((q, idx) => {
                        const uAns = round.userAnswers?.[q.id];
                        const isQCorrect = uAns === q.correctAnswer;
                        return (
                          <div 
                            key={q.id} 
                            className="animate-fade-in" 
                            style={{ animationDelay: `${idx * 0.1}s`, animationFillMode: 'both' }}
                          >
                            <h4 style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '1rem' }}>
                              <span style={{ color: isQCorrect ? 'var(--success-color)' : 'var(--error-color)', marginTop: '2px' }} aria-hidden="true">
                                {isQCorrect ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
                              </span>
                              <span>Câu {idx + 1}: {q.text}</span>
                            </h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginLeft: '2rem' }}>
                              {q.options.map((opt) => {
                                let bgColor = 'transparent';
                                let borderColor = 'var(--border-color)';
                                if (opt.label === q.correctAnswer) {
                                  bgColor = 'var(--success-bg)';
                                  borderColor = 'var(--success-color)';
                                } else if (opt.label === uAns && !isQCorrect) {
                                  bgColor = 'var(--error-bg)';
                                  borderColor = 'var(--error-color)';
                                }
                                
                                return (
                                  <div key={opt.label} style={{ 
                                    padding: '0.75rem 1rem', 
                                    borderRadius: '8px', 
                                    border: `1px solid ${borderColor}`,
                                    backgroundColor: bgColor,
                                    display: 'flex', gap: '0.75rem'
                                  }}>
                                    <strong>{opt.label}.</strong> {opt.text}
                                    {opt.label === q.correctAnswer && <span className="sr-only" style={{position:'absolute', width:1, height:1, padding:0, margin:-1, overflow:'hidden', clip:'rect(0,0,0,0)', border:0}}> - Đáp án đúng</span>}
                                    {opt.label === uAns && !isQCorrect && <span className="sr-only" style={{position:'absolute', width:1, height:1, padding:0, margin:-1, overflow:'hidden', clip:'rect(0,0,0,0)', border:0}}> - Đáp án của bạn (Sai)</span>}
                                  </div>
                                );
                              })}
                            </div>
                            {q.explanation && (
                              <div style={{ marginTop: '1rem', marginLeft: '2rem', padding: '1rem', backgroundColor: 'var(--surface-glass)', borderRadius: '8px', borderLeft: '4px solid var(--primary-color)' }}>
                                <strong>Giải thích:</strong> {q.explanation}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              ) : (
                <p>Không có dữ liệu đánh giá.</p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (!currentQuestion) return null;

  return (
    <div className="glass-panel animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
      {/* Progress Bar */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 600 }}>
          <span>Câu hỏi {currentIndex + 1} / {questions.length}</span>
          <span>{Math.round(((currentIndex) / questions.length) * 100)}%</span>
        </div>
        <div 
          role="progressbar" 
          aria-valuenow={Math.round(((currentIndex) / questions.length) * 100)} 
          aria-valuemin={0} 
          aria-valuemax={100}
          style={{ width: '100%', height: '8px', backgroundColor: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}
        >
          <div style={{ 
            height: '100%', 
            backgroundColor: 'var(--primary-color)', 
            width: `${((currentIndex) / questions.length) * 100}%`,
            transition: 'width 0.3s ease'
          }}></div>
        </div>
      </div>

      {/* Question Area */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.4rem', lineHeight: 1.5, marginBottom: '1.5rem' }}>
          {currentQuestion.text}
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }} role="radiogroup" aria-label="Lựa chọn đáp án">
          {currentQuestion.options.map((option) => {
            let isSelected = selectedAnswer === option.label;
            let isCorrectOption = option.label === currentQuestion.correctAnswer;
            
            let buttonStyle: React.CSSProperties = {
              padding: '1rem 1.5rem',
              borderRadius: '12px',
              borderWidth: '2px',
              borderStyle: 'solid',
              borderColor: 'var(--border-color)',
              backgroundColor: 'var(--surface-color)',
              cursor: hasAnsweredCurrent ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              transition: 'all 0.2s',
              textAlign: 'left' as const,
              width: '100%',
              fontSize: '1rem',
              color: 'var(--text-color)'
            };

            if (hasAnsweredCurrent) {
              if (isCorrectOption) {
                buttonStyle.backgroundColor = 'var(--success-bg)';
                buttonStyle.borderColor = 'var(--success-color)';
              } else if (isSelected) {
                buttonStyle.backgroundColor = 'var(--error-bg)';
                buttonStyle.borderColor = 'var(--error-color)';
              } else {
                buttonStyle.opacity = '0.6';
              }
            }

            return (
              <button 
                key={option.label}
                className="quiz-option"
                style={buttonStyle}
                onClick={() => handleSelectOption(option.label)}
                disabled={hasAnsweredCurrent}
                aria-pressed={isSelected}
                role="radio"
                aria-checked={isSelected}
              >
                <span style={{ 
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: '32px', height: '32px', borderRadius: '50%',
                  backgroundColor: (hasAnsweredCurrent && (isCorrectOption || isSelected)) ? 'transparent' : 'var(--border-color)',
                  fontWeight: 700
                }}>
                  {hasAnsweredCurrent && isCorrectOption ? <CheckCircle2 color="var(--success-color)" aria-label="Đúng" /> : 
                   hasAnsweredCurrent && isSelected ? <XCircle color="var(--error-color)" aria-label="Sai" /> : 
                   option.label}
                </span>
                <span style={{ flex: 1 }}>{option.text}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Explanation & Next Button */}
      {hasAnsweredCurrent && (
        <div className="animate-fade-in">
          {currentQuestion.explanation && (
            <div style={{ 
              padding: '1.25rem', 
              borderRadius: '12px', 
              backgroundColor: isCorrect ? 'var(--success-bg)' : 'var(--error-bg)',
              color: isCorrect ? 'var(--success-color)' : 'var(--error-color)',
              marginBottom: '1.5rem',
              border: `1px solid ${isCorrect ? 'var(--success-color)' : 'var(--error-color)'}`
            }}>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                {isCorrect ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
                {isCorrect ? 'Chính xác!' : 'Chưa chính xác!'}
              </h4>
              <p style={{ color: 'var(--text-color)' }}>{currentQuestion.explanation}</p>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn-primary" onClick={handleNext}>
              {currentIndex < questions.length - 1 ? 'Câu tiếp theo' : 'Xem kết quả'} 
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
