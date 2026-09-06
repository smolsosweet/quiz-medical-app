"use client";

import React, { useState, useRef } from "react";
import { UploadCloud, File, Image as ImageIcon, Loader2, History, ChevronRight, XCircle } from "lucide-react";
import { QuizSession } from "@/types";

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

const MAX_FILE_SIZE_MB = 10;
const MAX_FILES = 5;
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
  "image/jpg"
];

export default function UploadConfig({ 
  onGenerate, isGenerating, error,
  files, setFiles, 
  model, setModel, 
  scope, setScope,
  sessions = [], onViewHistory
}: Props) {
  const [numQuestions, setNumQuestions] = useState<number>(10);
  const [localError, setLocalError] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFiles = (newFiles: File[]): File[] => {
    setLocalError("");
    const validFiles: File[] = [];
    
    if (files.length + newFiles.length > MAX_FILES) {
      setLocalError(`Bạn chỉ được tải lên tối đa ${MAX_FILES} file.`);
      return [];
    }

    for (const file of newFiles) {
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        setLocalError(`Định dạng không hỗ trợ: ${file.name}. Chỉ nhận PDF, DOCX, PNG, JPG.`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        setLocalError(`File quá lớn: ${file.name} (Tối đa ${MAX_FILE_SIZE_MB}MB).`);
        continue;
      }
      // Check duplicates
      if (files.some(f => f.name === file.name && f.size === file.size)) {
        continue;
      }
      validFiles.push(file);
    }
    return validFiles;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const validFiles = validateFiles(Array.from(e.target.files));
      if (validFiles.length > 0) {
        setFiles(prev => [...prev, ...validFiles]);
      }
      // Reset input so the same file can be selected again if removed
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const validFiles = validateFiles(Array.from(e.dataTransfer.files));
      if (validFiles.length > 0) {
        setFiles(prev => [...prev, ...validFiles]);
      }
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setLocalError("");
  };

  const handleNumQuestionsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (isNaN(val)) {
      setNumQuestions(0);
    } else {
      setNumQuestions(val);
    }
  };

  const handleGenerateClick = () => {
    if (files.length === 0) {
      setLocalError("Vui lòng tải lên ít nhất 1 tài liệu.");
      return;
    }
    if (numQuestions < 1 || numQuestions > 50) {
      setLocalError("Số lượng câu hỏi phải từ 1 đến 50.");
      return;
    }
    setLocalError("");
    onGenerate(numQuestions);
  };


  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1.5rem', width: '100%' }}>
      <div className="glass-panel animate-fade-in" style={{ width: '100%', padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ textAlign: 'left', marginBottom: '2rem', fontSize: '1.75rem', fontWeight: 700 }}>Tạo Bộ Trắc Nghiệm Mới</h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', flex: 1 }}>
          {/* Cột trái: Tải file */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div 
              role="button"
              tabIndex={0}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              className="quiz-option"
              style={{
                border: '2px dashed var(--border-color)',
                borderRadius: '12px',
                padding: '2rem 1rem',
                textAlign: 'center',
                cursor: 'pointer',
                backgroundColor: 'var(--surface-color)',
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '0.75rem'
              }}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                style={{ display: 'none' }}
                accept=".pdf,.docx,.png,.jpg,.jpeg"
                multiple
              />
              <UploadCloud size={40} color="var(--primary-color)" />
              <p style={{ fontWeight: 600, fontSize: '1rem' }}>Kéo thả file vào đây</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Hỗ trợ PDF, DOCX, Ảnh (Tối đa {MAX_FILE_SIZE_MB}MB)</p>
            </div>

            {files.length > 0 && (
              <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '150px', overflowY: 'auto' }}>
                {files.map((f, i) => (
                  <div key={`${f.name}-${i}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.75rem', backgroundColor: 'var(--surface-color)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
                      {f.type.includes('image') ? <ImageIcon size={16} color="var(--primary-color)" /> : <File size={16} color="var(--primary-color)" />}
                      <span style={{ fontSize: '0.85rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.name}</span>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); removeFile(i); }} 
                      className="btn-secondary"
                      style={{ padding: '0.2rem', border: 'none', color: 'var(--error-color)' }}
                      title="Xóa"
                    >
                      <XCircle size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cột phải: Cấu hình */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', justifyContent: 'center' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.9rem', fontWeight: 500 }}>
                Phiên bản AI (Model)
              </label>
              <select 
                className="input-field" 
                value={model}
                onChange={(e) => setModel(e.target.value)}
                style={{ padding: '0.5rem', fontSize: '0.9rem' }}
              >
                <option value="gemini-2.5-flash">Gemini 2.5 Flash (Khuyên dùng)</option>
                <option value="gemini-2.5-flash-lite">Gemini 2.5 Flash Lite (Nhanh nhất)</option>
              </select>
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.9rem', fontWeight: 500 }}>
                Số lượng câu hỏi (1-50)
              </label>
              <input 
                type="number" 
                className="input-field" 
                min={1} max={50}
                value={numQuestions || ""}
                onChange={handleNumQuestionsChange}
                onBlur={() => {
                  if (numQuestions < 1) setNumQuestions(10);
                  if (numQuestions > 50) setNumQuestions(50);
                }}
                style={{ padding: '0.5rem', fontSize: '0.9rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.9rem', fontWeight: 500 }}>
                Phạm vi nội dung (Tùy chọn)
              </label>
              <textarea 
                className="input-field" 
                placeholder="Ví dụ: Chỉ chương 4..."
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                maxLength={1000}
                style={{ minHeight: '60px', resize: 'none', padding: '0.5rem', fontSize: '0.9rem' }}
              />
            </div>

            {(error || localError) && (
              <div style={{ padding: '0.5rem', backgroundColor: 'var(--error-bg)', color: 'var(--error-color)', borderRadius: '6px', fontSize: '0.85rem' }}>
                {localError || error}
              </div>
            )}

            <button 
              className="btn-primary" 
              onClick={handleGenerateClick} 
              disabled={isGenerating || files.length === 0}
              style={{ width: '100%', padding: '0.75rem', fontSize: '1rem', marginTop: 'auto' }}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Đang xử lý...
                </>
              ) : (
                'Bắt đầu tạo câu hỏi'
              )}
            </button>
          </div>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
      `}} />

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
                className="quiz-option"
                style={{ 
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                  padding: '1.25rem', backgroundColor: 'var(--surface-color)', 
                  borderRadius: '12px', border: '1px solid var(--border-color)',
                  cursor: 'pointer'
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
