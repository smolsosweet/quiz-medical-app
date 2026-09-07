import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NextRequest } from 'next/server';
import UploadConfig from '@/components/UploadConfig';

// Mock @google/genai before importing route
const mockGenerateContent = vi.fn();
vi.mock('@google/genai', () => {
  return {
    GoogleGenAI: class MockGoogleGenAI {
      models = {
        generateContent: mockGenerateContent,
      };
    },
  };
});

import { POST } from '@/app/api/generate/route';

describe('File Validation & Boundary Rejection Empirical Suite', () => {
  const originalApiKey = process.env.GEMINI_API_KEY;

  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'test-api-key-file-validation';
    mockGenerateContent.mockReset();
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({ questions: [] }),
    });
  });

  afterEach(() => {
    process.env.GEMINI_API_KEY = originalApiKey;
  });

  const dummyFn = vi.fn();

  const createMockRequest = (formData: FormData): NextRequest => {
    return {
      formData: async () => formData,
    } as unknown as NextRequest;
  };

  describe('A. Frontend UploadConfig Validation (F04/F05)', () => {
    describe('1. File Size Limits (10MB boundary)', () => {
      it('accepts a file of exactly 10MB (10 * 1024 * 1024 bytes)', () => {
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
        const exact10MBBytes = new Uint8Array(10 * 1024 * 1024);
        const exact10MBFile = new File([exact10MBBytes], 'tailieu_chuan_10MB.txt', { type: 'text/plain' });

        fireEvent.change(input, { target: { files: [exact10MBFile] } });

        expect(setFilesMock).toHaveBeenCalledTimes(1);
        expect(screen.queryByText(/File quá lớn/i)).not.toBeInTheDocument();
      });

      it('rejects a TXT file of 10MB + 1 byte with explicit error message', () => {
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
        const overLimitBytes = new Uint8Array(10 * 1024 * 1024 + 1);
        const overLimitFile = new File([overLimitBytes], 'qua_tai_10MB_cong_1byte.txt', { type: 'text/plain' });

        fireEvent.change(input, { target: { files: [overLimitFile] } });

        expect(setFilesMock).not.toHaveBeenCalled();
        expect(screen.getByText(/File quá lớn: qua_tai_10MB_cong_1byte\.txt \(Tối đa 10MB\)\./i)).toBeInTheDocument();
      });

      it('rejects a 15MB PDF via drag and drop with error', () => {
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

        const dropzone = screen.getByRole('button', { name: /Kéo thả file vào đây/i });
        const heavy15MBBytes = new Uint8Array(15 * 1024 * 1024);
        const heavyPdf = new File([heavy15MBBytes], 'giai_phau_atlas_15MB.pdf', { type: 'application/pdf' });

        fireEvent.drop(dropzone, {
          dataTransfer: {
            files: [heavyPdf],
          },
        });

        expect(setFilesMock).not.toHaveBeenCalled();
        expect(screen.getByText(/File quá lớn: giai_phau_atlas_15MB\.pdf \(Tối đa 10MB\)\./i)).toBeInTheDocument();
      });
    });

    describe('2. File Count Limits (5 files max)', () => {
      it('rejects upload when user selects 6 files at once in a single selection', () => {
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
        const sixFiles = Array.from({ length: 6 }, (_, i) => 
          new File([`bai ${i + 1}`], `bai_${i + 1}.txt`, { type: 'text/plain' })
        );

        fireEvent.change(input, { target: { files: sixFiles } });

        expect(setFilesMock).not.toHaveBeenCalled();
        expect(screen.getByText('Bạn chỉ được tải lên tối đa 5 file.')).toBeInTheDocument();
      });

      it('rejects upload when 4 files are already staged and user attempts to add 2 more files', () => {
        const existing4 = [
          new File(['1'], 'doc1.txt', { type: 'text/plain' }),
          new File(['2'], 'doc2.pdf', { type: 'application/pdf' }),
          new File(['3'], 'doc3.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }),
          new File(['4'], 'doc4.png', { type: 'image/png' }),
        ];
        const setFilesMock = vi.fn();

        render(
          <UploadConfig
            onGenerate={dummyFn}
            isGenerating={false}
            error=""
            files={existing4}
            setFiles={setFilesMock}
            model="gemini-2.5-flash"
            setModel={dummyFn}
            scope=""
            setScope={dummyFn}
          />
        );

        const input = document.querySelector('input[type="file"]') as HTMLInputElement;
        const new2Files = [
          new File(['5'], 'doc5.txt', { type: 'text/plain' }),
          new File(['6'], 'doc6.txt', { type: 'text/plain' }),
        ];

        fireEvent.change(input, { target: { files: new2Files } });

        expect(setFilesMock).not.toHaveBeenCalled();
        expect(screen.getByText('Bạn chỉ được tải lên tối đa 5 file.')).toBeInTheDocument();
      });

      it('rejects drag-and-drop addition exceeding 5 total files', () => {
        const existing3 = [
          new File(['1'], 'doc1.txt', { type: 'text/plain' }),
          new File(['2'], 'doc2.txt', { type: 'text/plain' }),
          new File(['3'], 'doc3.txt', { type: 'text/plain' }),
        ];
        const setFilesMock = vi.fn();

        render(
          <UploadConfig
            onGenerate={dummyFn}
            isGenerating={false}
            error=""
            files={existing3}
            setFiles={setFilesMock}
            model="gemini-2.5-flash"
            setModel={dummyFn}
            scope=""
            setScope={dummyFn}
          />
        );

        const dropzone = screen.getByRole('button', { name: /Kéo thả file vào đây/i });
        const dropped3 = [
          new File(['4'], 'doc4.txt', { type: 'text/plain' }),
          new File(['5'], 'doc5.txt', { type: 'text/plain' }),
          new File(['6'], 'doc6.txt', { type: 'text/plain' }),
        ];

        fireEvent.drop(dropzone, {
          dataTransfer: {
            files: dropped3,
          },
        });

        expect(setFilesMock).not.toHaveBeenCalled();
        expect(screen.getByText('Bạn chỉ được tải lên tối đa 5 file.')).toBeInTheDocument();
      });

      it('accepts exactly 5 files in a single batch', () => {
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
        const fiveFiles = Array.from({ length: 5 }, (_, i) => 
          new File([`bai ${i + 1}`], `bai_${i + 1}.txt`, { type: 'text/plain' })
        );

        fireEvent.change(input, { target: { files: fiveFiles } });

        expect(setFilesMock).toHaveBeenCalledTimes(1);
        expect(screen.queryByText(/Bạn chỉ được tải lên tối đa 5 file/i)).not.toBeInTheDocument();
      });
    });

    describe('3. Unsupported Extensions & MIME Types', () => {
      it('rejects unsupported executables and scripts (.exe, .zip, .js, .py)', () => {
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
        const badFile = new File(['binary'], 'installer.exe', { type: 'application/x-msdownload' });

        fireEvent.change(input, { target: { files: [badFile] } });

        expect(setFilesMock).not.toHaveBeenCalled();
        expect(screen.getByText(/Định dạng không hỗ trợ: installer\.exe/i)).toBeInTheDocument();
      });
    });
  });

  describe('B. Backend Route Handler Validation (/api/generate)', () => {
    it('returns HTTP 400 when file size exceeds 10MB', async () => {
      const formData = new FormData();
      const largeBytes = new Uint8Array(10 * 1024 * 1024 + 1);
      const overFile = new File([largeBytes], 'huge_dataset.txt', { type: 'text/plain' });
      formData.append('files', overFile);
      formData.append('numQuestions', '5');

      const req = createMockRequest(formData);
      const res = await POST(req);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('File huge_dataset.txt quá lớn (tối đa 10MB).');
      expect(mockGenerateContent).not.toHaveBeenCalled();
    });

    it('returns HTTP 400 when total files exceed 5 (e.g. 6 files)', async () => {
      const formData = new FormData();
      for (let i = 1; i <= 6; i++) {
        formData.append('files', new File([`nội dung ${i}`], `file_${i}.txt`, { type: 'text/plain' }));
      }
      formData.append('numQuestions', '5');

      const req = createMockRequest(formData);
      const res = await POST(req);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('Quá số lượng file cho phép (tối đa 5).');
      expect(mockGenerateContent).not.toHaveBeenCalled();
    });

    it('returns HTTP 400 when no files are provided', async () => {
      const formData = new FormData();
      formData.append('numQuestions', '5');

      const req = createMockRequest(formData);
      const res = await POST(req);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('Thiếu dữ liệu đầu vào.');
      expect(mockGenerateContent).not.toHaveBeenCalled();
    });

    it('returns HTTP 400 when an unsupported file type is sent', async () => {
      const formData = new FormData();
      const unsupportedFile = new File(['corrupt archive'], 'archive.zip', { type: 'application/zip' });
      formData.append('files', unsupportedFile);
      formData.append('numQuestions', '5');

      const req = createMockRequest(formData);
      const res = await POST(req);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('Định dạng file không hỗ trợ: archive.zip');
      expect(mockGenerateContent).not.toHaveBeenCalled();
    });
  });
});
