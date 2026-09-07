"use client";

import React from "react";
import { Question, AnswerLabel } from "@/types";
import { LayoutGrid, ChevronDown, ChevronUp } from "lucide-react";

interface QuestionNavigatorProps {
  questions: Question[];
  currentIndex: number;
  userAnswers: Record<string, AnswerLabel>;
  onSelectQuestion: (index: number) => void;
  onFinish: () => void;
}

export default function QuestionNavigator({
  questions,
  currentIndex,
  userAnswers,
  onSelectQuestion,
  onFinish
}: QuestionNavigatorProps) {
  const answeredCount = Object.keys(userAnswers).filter(id => 
    questions.some(q => q.id === id)
  ).length;

  return (
    <div 
      className="question-navigator-container" 
      style={{ 
        marginBottom: '1.5rem',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        backgroundColor: 'var(--surface-color)',
        overflow: 'hidden',
        position: 'sticky',
        top: '100px'
      }}
    >
      {/* Static Header */}
      <div
        className="quiz-option"
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.75rem 1rem',
          backgroundColor: 'transparent',
          border: 'none',
          color: 'var(--text-color)',
          fontSize: '0.9rem',
          fontWeight: 600
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <LayoutGrid size={18} color="var(--primary-color)" />
          <span>Danh sách câu hỏi</span>
          <span 
            style={{ 
              fontSize: '0.8rem', 
              fontWeight: 500, 
              color: 'var(--text-muted)',
              backgroundColor: 'var(--surface-glass)',
              padding: '0.15rem 0.5rem',
              borderRadius: '9999px',
              border: '1px solid var(--border-color)'
            }}
          >
            Đã làm {answeredCount}/{questions.length}
          </span>
        </div>
      </div>

      {/* Grid Matrix always visible */}
      <div 
        id="question-navigator-grid"
        role="region"
        aria-label="Bảng câu hỏi"
        style={{
          padding: '1rem',
          borderTop: '1px solid var(--border-color)',
          backgroundColor: 'var(--bg-color)',
          maxHeight: 'calc(100vh - 250px)',
          overflowY: 'auto'
        }}
      >
          <div 
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(44px, 1fr))',
              gap: '0.5rem'
            }}
          >
            {questions.map((q, idx) => {
              const isAnswered = !!userAnswers[q.id];
              const isCurrent = idx === currentIndex;

              let bg = 'var(--surface-color)';
              let border = '1px solid var(--border-color)';
              let color = 'var(--text-color)';

              if (isCurrent) {
                border = '2px solid var(--primary-color)';
                bg = 'rgba(2, 132, 199, 0.12)';
                color = 'var(--primary-color)';
              } else if (isAnswered) {
                bg = 'var(--success-bg)';
                border = '1px solid var(--success-color)';
                color = 'var(--success-color)';
              }

              return (
                <button
                  key={q.id || idx}
                  type="button"
                  onClick={() => onSelectQuestion(idx)}
                  aria-label={`Câu hỏi ${idx + 1}${isCurrent ? ' (hiện tại)' : ''}${isAnswered ? ' (đã trả lời)' : ' (chưa trả lời)'}`}
                  aria-current={isCurrent ? 'step' : undefined}
                  style={{
                    height: '42px',
                    borderRadius: '8px',
                    border,
                    backgroundColor: bg,
                    color,
                    fontWeight: isCurrent || isAnswered ? 700 : 500,
                    fontSize: '0.9rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    position: 'relative'
                  }}
                  title={`Câu ${idx + 1}: ${isAnswered ? 'Đã làm' : 'Chưa làm'}`}
                >
                  <span>{idx + 1}</span>
                  {isAnswered && (
                    <span 
                      style={{ 
                        position: 'absolute', 
                        bottom: '3px', 
                        width: '4px', 
                        height: '4px', 
                        borderRadius: '50%', 
                        backgroundColor: 'var(--success-color)' 
                      }} 
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div 
            style={{ 
              display: 'flex', 
              gap: '1.25rem', 
              marginTop: '0.85rem', 
              paddingTop: '0.75rem', 
              borderTop: '1px solid var(--border-color)',
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              justifyContent: 'center'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '2px', border: '2px solid var(--primary-color)', backgroundColor: 'rgba(2, 132, 199, 0.12)' }} />
              <span>Đang làm</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '2px', border: '1px solid var(--success-color)', backgroundColor: 'var(--success-bg)' }} />
              <span>Đã trả lời</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '2px', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)' }} />
              <span>Chưa làm</span>
            </div>
          </div>

          {/* Submit Button */}
          <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center' }}>
            <button 
              type="button" 
              className="btn-primary" 
              style={{ width: '100%', padding: '0.75rem', fontWeight: 700 }}
              onClick={onFinish}
            >
              Nộp bài
            </button>
          </div>
        </div>
    </div>
  );
}
