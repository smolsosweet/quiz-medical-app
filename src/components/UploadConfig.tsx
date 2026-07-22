"use client";

import React, { useState, useRef } from "react";
import { UploadCloud, File, Image as ImageIcon, Loader2, History, ChevronRight } from "lucide-react";
import { Question, QuizSession } from "@/types";

interface Props {
  onGenerate: (numQ: number) => void;
  isGenerating: boolean;
  error: string;
  files: File[];
  setFiles: React.Dispatch<React.SetStateAction<File[]>>;
  model: string;
  setModel: React.Dispatch<React.SetStateAction<string>>;
  scope: string;
  setScope: React.Dispatch<React.SetStateAction<string>>;
  sessions?: QuizSession[];
  onViewHistory?: (session: QuizSession) => void;
}

export default function UploadConfig({ 
  onGenerate, isGenerating, error,
  files, setFiles, 
  model, setModel, 
  scope, setScope,
  sessions = [], onViewHistory
}: Props) {
  const [numQuestions, setNumQuestions] = useState<number>(10);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };


  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', width: '100%', maxWidth: '800px', margin: '0 auto' }}>
      <div className="glass-panel animate-fade-in" style={{ width: '100%' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>Tạo Bộ Trắc Nghiệm Mới</h2>
        
        {/* File Upload Area */}
      <div 
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: '2px dashed var(--border-color)',
          borderRadius: '12px',
          padding: '2.5rem 1rem',
          textAlign: 'center',
          cursor: 'pointer',
          backgroundColor: 'var(--surface-color)',
          marginBottom: '1.5rem',
          transition: 'all 0.2s',
        }}
        onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--primary-color)'}
        onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          style={{ display: 'none' }}
          accept=".pdf,.docx,.png,.jpg,.jpeg"
          multiple
        />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
          <UploadCloud size={48} color="var(--text-muted)" />
          <p style={{ fontWeight: 600, fontSize: '1.1rem' }}>Kéo thả file vào đây hoặc click để chọn nhiều file</p>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Hỗ trợ PDF, DOCX, PNG, JPG</p>
        </div>
      </div>

      {files.length > 0 && (
        <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Tệp đã chọn ({files.length}):</h4>
          {files.map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', backgroundColor: 'var(--surface-color)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
                {f.type.includes('image') ? <ImageIcon size={20} color="var(--primary-color)" /> : <File size={20} color="var(--primary-color)" />}
                <span style={{ fontSize: '0.9rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '300px' }}>{f.name}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{(f.size / 1024 / 1024).toFixed(2)} MB</span>
              </div>
              <button onClick={(e) => { e.stopPropagation(); removeFile(i); }} style={{ background: 'none', border: 'none', color: 'var(--error-color)', cursor: 'pointer', padding: '0.25rem' }}>
                Xóa
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
            Phiên bản AI (Model)
          </label>
          <select 
            className="input-field" 
            value={model}
            onChange={(e) => setModel(e.target.value)}
          >
            <option value="gemini-2.5-flash">Gemini 2.5 Flash (Nhanh nhất)</option>
            <option value="gemini-2.0-flash">Gemini 2.0 Flash (Ổn định cao)</option>
            <option value="gemini-1.5-pro">Gemini 1.5 Pro (Thông minh nhất, dễ nghẽn)</option>
            <option value="gemini-1.5-flash-8b">Gemini 1.5 Flash 8B (Nhẹ nhất)</option>
          </select>
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
            Số lượng câu hỏi muốn tạo
          </label>
          <input 
            type="number" 
            className="input-field" 
            min={1}
            max={100}
            value={numQuestions}
            onChange={(e) => setNumQuestions(Number(e.target.value))}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
            Phạm vi nội dung (Tùy chọn)
          </label>
          <textarea 
            className="input-field" 
            placeholder="Ví dụ: Chỉ tạo câu hỏi cho phần 2.1 và chương 4..."
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            style={{ minHeight: '80px', resize: 'vertical', fontFamily: 'inherit' }}
          />
        </div>

        {error && (
          <div style={{ padding: '0.75rem', backgroundColor: 'var(--error-bg)', color: 'var(--error-color)', borderRadius: '8px', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}

        <button 
          className="btn-primary" 
          onClick={() => onGenerate(numQuestions)} 
          disabled={isGenerating}
          style={{ width: '100%', marginTop: '1rem', padding: '1rem', fontSize: '1.1rem' }}
        >
          {isGenerating ? (
            <>
              <Loader2 className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
              Đang phân tích & tạo câu hỏi...
            </>
          ) : (
            'Bắt đầu tạo câu hỏi'
          )}
        </button>
      </div>
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes spin { 100% { transform: rotate(360deg); } }
          `}} />
      </div>

      {/* Lịch sử các phiên học */}
      {sessions.length > 0 && (
        <div className="glass-panel animate-fade-in" style={{ width: '100%' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <History size={24} color="var(--primary-color)" />
            Lịch sử học tập phiên này
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {sessions.map((session) => (
              <div 
                key={session.id} 
                onClick={() => onViewHistory && onViewHistory(session)}
                style={{ 
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                  padding: '1.25rem', backgroundColor: 'var(--surface-color)', 
                  borderRadius: '12px', border: '1px solid var(--border-color)',
                  cursor: 'pointer', transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = 'var(--primary-color)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div>
                  <h4 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>{session.title} {session.filesCount > 1 ? `(+${session.filesCount - 1} tệp)` : ''}</h4>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                    {session.date} • {session.rounds.length} lượt tạo • Tổng {session.rounds.reduce((acc, r) => acc + r.questions.length, 0)} câu
                  </p>
                </div>
                <ChevronRight color="var(--text-muted)" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
