"use client";

import React, { useState, useEffect, useRef } from "react";
import { Question, QuizRound, AnswerLabel } from "@/types";
import { CheckCircle2, XCircle, ChevronRight, ChevronLeft, RefreshCw, Upload, List, Printer } from "lucide-react";
import QuestionNavigator from "@/components/QuestionNavigator";

interface Props {
  questions: Question[];
  isReviewMode?: boolean;
  historyRounds?: QuizRound[];
  onGenerateMore: (numQ: number) => void;
  onFinishRound?: (userAnswers: Record<string, AnswerLabel>) => void;
  isGenerating: boolean;
  error?: string | null;
  onNewFile: () => void;
  onBackToDashboard?: () => void;
}

export default function QuizInterface({ 
  questions = [], 
  isReviewMode = false, 
  historyRounds = [], 
  onGenerateMore, 
  onFinishRound, 
  isGenerating, 
  error, 
  onNewFile,
  onBackToDashboard
}: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, AnswerLabel>>({});
  const [isFinished, setIsFinished] = useState(isReviewMode);
  const [showReview, setShowReview] = useState(isReviewMode);
  const [isNavigatorOpen, setIsNavigatorOpen] = useState(true);
  const hasFinishedRef = useRef(false);
  
  const [showAddQuestions, setShowAddQuestions] = useState(false);
  const [newNumQuestions, setNewNumQuestions] = useState(10);

  // Sync state if questions change during active quiz (without resetting in review mode)
  const [prevQuestions, setPrevQuestions] = useState(questions);
  if (questions !== prevQuestions) {
    setPrevQuestions(questions);
    if (!isReviewMode) {
      setCurrentIndex(0);
      setUserAnswers({});
      setIsFinished(false);
      setShowReview(false);
      setShowAddQuestions(false);
    }
  }

  useEffect(() => {
    if (!isFinished) {
      hasFinishedRef.current = false;
    }
  }, [isFinished]);

  useEffect(() => {
    if (isFinished && !isReviewMode && onFinishRound && !hasFinishedRef.current) {
      hasFinishedRef.current = true;
      onFinishRound(userAnswers);
    }
  }, [isFinished, isReviewMode, onFinishRound, userAnswers]);

  const safeQuestions = Array.isArray(questions) ? questions : [];
  const currentQuestion = safeQuestions.length > 0 && currentIndex < safeQuestions.length 
    ? safeQuestions[currentIndex] 
    : null;
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

  const handleFinish = () => {
    const answeredCount = Object.keys(userAnswers).length;
    if (answeredCount < safeQuestions.length) {
      if (window.confirm(`Bạn mới làm ${answeredCount}/${safeQuestions.length} câu. Bạn có chắc chắn muốn nộp bài?`)) {
        setIsFinished(true);
      }
    } else {
      setIsFinished(true);
    }
  };

  const handleNext = () => {
    if (currentIndex < safeQuestions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      handleFinish();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const shouldShowReview = isReviewMode || (isFinished && showReview);

  // Render Review Mode or Finished State
  if (isReviewMode || isFinished) {
    const totalQuestions = safeQuestions.length;
    let scorePercent = 0;
    let correctCount = 0;
    
    if (!isReviewMode && totalQuestions > 0) {
      correctCount = Object.keys(userAnswers).filter((qId) => {
        const q = safeQuestions.find((question) => question?.id === qId);
        return q?.correctAnswer && q.correctAnswer === userAnswers[qId];
      }).length;
      scorePercent = Math.round((correctCount / totalQuestions) * 100);
    }

    return (
      <div className="glass-panel animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
        {!shouldShowReview ? (
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
                Bạn đã trả lời đúng {correctCount} / {totalQuestions} câu hỏi.
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
                <button 
                  className="btn-secondary" 
                  onClick={() => {
                    if (isReviewMode) {
                      if (onBackToDashboard) {
                        onBackToDashboard();
                      } else {
                        onNewFile();
                      }
                    } else {
                      setShowReview(false);
                    }
                  }}
                >
                  Quay lại
                </button>
              </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
              {Array.isArray(historyRounds) && historyRounds.length > 0 ? (
                historyRounds.map((round, rIdx) => {
                  const roundQuestions = Array.isArray(round?.questions) ? round.questions : [];
                  return (
                    <div key={round?.id || `round-${rIdx}`} style={{ border: '1px solid var(--border-color)', padding: '1.5rem', borderRadius: '12px', backgroundColor: 'var(--surface-color)' }}>
                      <h3 style={{ marginBottom: '1.5rem', color: 'var(--primary-color)', borderBottom: '2px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                        {round?.id || `Lần ${rIdx + 1}`}
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        {roundQuestions.length > 0 ? (
                          roundQuestions.map((q, idx) => {
                            if (!q) return null;
                            const uAns = round.userAnswers?.[q.id];
                            const isQCorrect = uAns === q.correctAnswer;
                            const qOptions = Array.isArray(q.options) ? q.options : [];
                            return (
                              <div 
                                key={q.id || `q-${idx}`} 
                                className="review-question-card question-card animate-fade-in" 
                                style={{ animationDelay: `${Math.min(idx * 0.03, 0.3)}s`, animationFillMode: 'both' }}
                              >
                                <h4 style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '1rem', wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                                  <span style={{ color: isQCorrect ? 'var(--success-color)' : 'var(--error-color)', marginTop: '2px', flexShrink: 0 }} aria-hidden="true">
                                    {isQCorrect ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
                                  </span>
                                  <span style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>Câu {idx + 1}: {q.text}</span>
                                </h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginLeft: '2rem' }}>
                                  {qOptions.map((opt) => {
                                    if (!opt) return null;
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
                                        display: 'flex', 
                                        alignItems: 'flex-start',
                                        gap: '0.75rem',
                                        wordBreak: 'break-word',
                                        overflowWrap: 'break-word'
                                      }}>
                                        <strong style={{ flexShrink: 0, marginTop: '1px' }}>{opt.label}.</strong> 
                                        <span style={{ flex: 1, wordBreak: 'break-word', overflowWrap: 'break-word' }}>{opt.text}</span>
                                        {opt.label === q.correctAnswer && <span className="sr-only" style={{position:'absolute', width:1, height:1, padding:0, margin:-1, overflow:'hidden', clip:'rect(0,0,0,0)', border:0}}> - Đáp án đúng</span>}
                                        {opt.label === uAns && !isQCorrect && <span className="sr-only" style={{position:'absolute', width:1, height:1, padding:0, margin:-1, overflow:'hidden', clip:'rect(0,0,0,0)', border:0}}> - Đáp án của bạn (Sai)</span>}
                                      </div>
                                    );
                                  })}
                                </div>
                                {q.explanation && (
                                  <div style={{ marginTop: '1rem', marginLeft: '2rem', padding: '1rem', backgroundColor: 'var(--surface-glass)', borderRadius: '8px', borderLeft: '4px solid var(--primary-color)', wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                                    <strong>Giải thích:</strong> {q.explanation}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        ) : (
                          <p style={{ color: 'var(--text-muted)' }}>Vòng thi này chưa có câu hỏi.</p>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p>Không có dữ liệu đánh giá.</p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Active Quiz Render - Guard against empty or missing questions
  if (!currentQuestion) {
    return (
      <div className="glass-panel animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto', width: '100%', textAlign: 'center', padding: '2rem' }}>
        <p>Không có câu hỏi nào để hiển thị.</p>
        <button 
          className="btn-secondary" 
          style={{ marginTop: '1rem' }} 
          onClick={onBackToDashboard || onNewFile}
        >
          Quay lại
        </button>
      </div>
    );
  }

  const progressTotal = safeQuestions.length > 0 ? safeQuestions.length : 1;
  const progressPercent = Math.round((currentIndex / progressTotal) * 100);

  return (
    <div className="bento-grid" style={{ width: '100%' }}>
      {/* Question Navigator Sidebar (F11) - Left Column */}
      <div className="bento-col-3" style={{ height: 'fit-content' }}>
        <QuestionNavigator 
          questions={safeQuestions}
          currentIndex={currentIndex}
          userAnswers={userAnswers}
          onSelectQuestion={(idx) => setCurrentIndex(idx)}
          isOpen={isNavigatorOpen}
          onToggle={() => setIsNavigatorOpen((prev) => !prev)}
          onFinish={handleFinish}
        />
      </div>

      {/* Question Area - Right Column */}
      <div className="bento-col-9 glass-panel animate-fade-in" style={{ width: '100%', padding: '2rem' }}>
        {/* Progress Bar */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 600 }}>
            <span>Câu hỏi {currentIndex + 1} / {safeQuestions.length}</span>
            <span>{progressPercent}%</span>
          </div>
          <div 
            role="progressbar" 
            aria-valuenow={progressPercent} 
            aria-valuemin={0} 
            aria-valuemax={100}
            style={{ width: '100%', height: '8px', backgroundColor: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}
          >
            <div style={{ 
              height: '100%', 
              backgroundColor: 'var(--primary-color)', 
              width: `${progressPercent}%`,
              transition: 'width 0.3s ease'
            }}></div>
          </div>
        </div>

        {/* Question Content */}
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.4rem', lineHeight: 1.5, marginBottom: '1.5rem', wordBreak: 'break-word', overflowWrap: 'break-word' }}>
            {currentQuestion.text}
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }} role="radiogroup" aria-label="Lựa chọn đáp án">
            {(currentQuestion.options || []).map((option) => {
              const isSelected = selectedAnswer === option.label;
              const isCorrectOption = option.label === currentQuestion.correctAnswer;
              
              const buttonStyle: React.CSSProperties = {
                padding: '1rem 1.5rem',
                borderRadius: '12px',
                borderWidth: '2px',
                borderStyle: 'solid',
                borderColor: 'var(--border-color)',
                backgroundColor: 'var(--surface-color)',
                cursor: hasAnsweredCurrent ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '1rem',
                transition: 'all 0.2s',
                textAlign: 'left' as const,
                width: '100%',
                fontSize: '1rem',
                color: 'var(--text-color)',
                wordBreak: 'break-word',
                overflowWrap: 'break-word'
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
                  role="radio"
                  aria-checked={isSelected}
                >
                  <span style={{ 
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: '32px', height: '32px', borderRadius: '50%',
                    flexShrink: 0,
                    marginTop: '2px',
                    backgroundColor: (hasAnsweredCurrent && (isCorrectOption || isSelected)) ? 'transparent' : 'var(--border-color)',
                    fontWeight: 700
                  }}>
                    {hasAnsweredCurrent && isCorrectOption ? <CheckCircle2 color="var(--success-color)" aria-label="Đúng" /> : 
                     hasAnsweredCurrent && isSelected ? <XCircle color="var(--error-color)" aria-label="Sai" /> : 
                     option.label}
                  </span>
                  <span style={{ flex: 1, wordBreak: 'break-word', overflowWrap: 'break-word', lineHeight: 1.5 }}>{option.text}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Explanation & Bidirectional Navigation Buttons (F11 & F12) */}
        <div>
          {hasAnsweredCurrent && currentQuestion.explanation && (
            <div className="animate-fade-in" style={{ 
              padding: '1.25rem', 
              borderRadius: '12px', 
              backgroundColor: isCorrect ? 'var(--success-bg)' : 'var(--error-bg)',
              color: isCorrect ? 'var(--success-color)' : 'var(--error-color)',
              marginBottom: '1.5rem',
              border: `1px solid ${isCorrect ? 'var(--success-color)' : 'var(--error-color)'}`,
              wordBreak: 'break-word',
              overflowWrap: 'break-word'
            }}>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                {isCorrect ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
                {isCorrect ? 'Chính xác!' : 'Chưa chính xác!'}
              </h4>
              <p style={{ color: 'var(--text-color)' }}>{currentQuestion.explanation}</p>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
            {currentIndex > 0 ? (
              <button 
                type="button"
                className="btn-secondary" 
                onClick={handlePrev}
                aria-label="Câu trước"
              >
                <ChevronLeft size={20} /> Câu trước
              </button>
            ) : <div />}

            {hasAnsweredCurrent && (
              <button type="button" className="btn-primary" onClick={handleNext}>
                {currentIndex < safeQuestions.length - 1 ? 'Câu tiếp theo' : 'Xem kết quả'} 
                <ChevronRight size={20} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
