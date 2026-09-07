import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import UploadConfig from '@/components/UploadConfig';
import { mockMedicalSession } from '@/test/fixtures/quizData';

describe('Tier 1: UploadConfig Component', () => {
  const defaultProps = {
    onGenerate: vi.fn(),
    isGenerating: false,
    error: '',
    files: [] as File[],
    setFiles: vi.fn(),
    model: 'gemini-2.5-flash',
    setModel: vi.fn(),
    scope: '',
    setScope: vi.fn(),
    sessions: [],
    onViewHistory: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Feature 2: Quiz Generation Configuration', () => {
    it('T1.2.1: renders AI model selector with default gemini-2.5-flash and lite option', () => {
      render(<UploadConfig {...defaultProps} />);
      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();
      expect(select).toHaveValue('gemini-2.5-flash');

      const options = screen.getAllByRole('option');
      const values = options.map((opt) => (opt as HTMLOptionElement).value);
      expect(values).toContain('gemini-2.5-flash');
      expect(values).toContain('gemini-2.5-flash-lite');
    });

    it('T1.2.2: allows changing AI model and fires setModel', () => {
      render(<UploadConfig {...defaultProps} />);
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'gemini-2.5-flash-lite' } });
      expect(defaultProps.setModel).toHaveBeenCalledWith('gemini-2.5-flash-lite');
    });

    it('T1.2.3: allows entering custom scope instruction and fires setScope', () => {
      render(<UploadConfig {...defaultProps} />);
      const textarea = screen.getByPlaceholderText(/Chỉ chương 4/i);
      fireEvent.change(textarea, { target: { value: 'Chỉ chương 3: Tim mạch' } });
      expect(defaultProps.setScope).toHaveBeenCalledWith('Chỉ chương 3: Tim mạch');
    });

    it('T1.2.4: disables generate button when no files are selected', () => {
      render(<UploadConfig {...defaultProps} files={[]} />);
      const generateBtn = screen.getByRole('button', { name: /Bắt đầu tạo câu hỏi/i });
      expect(generateBtn).toBeDisabled();
    });

    it('T1.2.5: enables button and calls onGenerate with question count when file is present', () => {
      const mockFile = new File(['dummy syllabus'], 'syllabus.pdf', { type: 'application/pdf' });
      render(<UploadConfig {...defaultProps} files={[mockFile]} />);

      const generateBtn = screen.getByRole('button', { name: /Bắt đầu tạo câu hỏi/i });
      expect(generateBtn).not.toBeDisabled();

      fireEvent.click(generateBtn);
      expect(defaultProps.onGenerate).toHaveBeenCalledWith(10);
    });

    it('T1.2.6: shows loading spinner and disables generate button during generation', () => {
      const mockFile = new File(['dummy'], 'syllabus.pdf', { type: 'application/pdf' });
      render(<UploadConfig {...defaultProps} files={[mockFile]} isGenerating={true} />);

      const loadingBtn = screen.getByRole('button', { name: /Đang xử lý/i });
      expect(loadingBtn).toBeDisabled();
    });

    it('T1.2.7: renders server error when error prop is provided', () => {
      render(<UploadConfig {...defaultProps} error="Lỗi máy chủ: API Key không hợp lệ" />);
      expect(screen.getByText('Lỗi máy chủ: API Key không hợp lệ')).toBeInTheDocument();
    });
  });

  describe('Feature 4: File Upload & Validation', () => {
    it('T1.4.1: accepts valid PDF files and calls setFiles', () => {
      render(<UploadConfig {...defaultProps} />);
      const dropzone = screen.getByText(/Kéo thả file vào đây/i);
      expect(dropzone).toBeInTheDocument();

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(input).toBeInTheDocument();

      const validPdf = new File(['%PDF-1.4 mock content'], 'tim_mach.pdf', { type: 'application/pdf' });
      fireEvent.change(input, { target: { files: [validPdf] } });

      expect(defaultProps.setFiles).toHaveBeenCalledTimes(1);
    });

    it('T1.4.2: accepts DOCX files with appropriate MIME type', () => {
      render(<UploadConfig {...defaultProps} />);
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      const validDocx = new File(
        ['mock docx content'],
        'bai_giang.docx',
        { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }
      );
      fireEvent.change(input, { target: { files: [validDocx] } });

      expect(defaultProps.setFiles).toHaveBeenCalledTimes(1);
    });

    it('T1.4.3: rejects unsupported file formats with descriptive error', () => {
      render(<UploadConfig {...defaultProps} />);
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      const exeFile = new File(['malware content'], 'virus.exe', { type: 'application/x-msdownload' });

      fireEvent.change(input, { target: { files: [exeFile] } });

      expect(defaultProps.setFiles).not.toHaveBeenCalled();
      expect(screen.getByText(/Định dạng không hỗ trợ/i)).toBeInTheDocument();
    });

    it('T1.4.4: rejects files exceeding 10MB limit', () => {
      render(<UploadConfig {...defaultProps} />);
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      // 11MB file
      const largeContent = new Uint8Array(11 * 1024 * 1024);
      const largeFile = new File([largeContent], 'heavy_atlas.pdf', { type: 'application/pdf' });

      fireEvent.change(input, { target: { files: [largeFile] } });

      expect(defaultProps.setFiles).not.toHaveBeenCalled();
      expect(screen.getByText(/File quá lớn.*Tối đa 10MB/i)).toBeInTheDocument();
    });

    it('T1.4.5: rejects adding more than MAX_FILES (5 files)', () => {
      const existing4Files = [
        new File(['1'], 'doc1.pdf', { type: 'application/pdf' }),
        new File(['2'], 'doc2.pdf', { type: 'application/pdf' }),
        new File(['3'], 'doc3.pdf', { type: 'application/pdf' }),
        new File(['4'], 'doc4.pdf', { type: 'application/pdf' }),
      ];

      render(<UploadConfig {...defaultProps} files={existing4Files} />);
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      const new2Files = [
        new File(['5'], 'doc5.pdf', { type: 'application/pdf' }),
        new File(['6'], 'doc6.pdf', { type: 'application/pdf' }),
      ];

      fireEvent.change(input, { target: { files: new2Files } });

      expect(defaultProps.setFiles).not.toHaveBeenCalled();
      expect(screen.getByText(/Bạn chỉ được tải lên tối đa 5 file/i)).toBeInTheDocument();
    });

    it('T1.4.6: renders file chips with delete buttons and removes file on click', () => {
      const file1 = new File(['1'], 'dieu_tri_tang_huyet_ap.pdf', { type: 'application/pdf' });
      render(<UploadConfig {...defaultProps} files={[file1]} />);

      expect(screen.getByText('dieu_tri_tang_huyet_ap.pdf')).toBeInTheDocument();
      const deleteBtn = screen.getByTitle('Xóa');
      expect(deleteBtn).toBeInTheDocument();

      fireEvent.click(deleteBtn);
      expect(defaultProps.setFiles).toHaveBeenCalled();
    });
  });

  describe('Feature 1: History Session Listing on UploadConfig', () => {
    it('T1.1.1: displays history session card when sessions exist', () => {
      render(<UploadConfig {...defaultProps} sessions={[mockMedicalSession]} />);
      expect(screen.getByText(/Lịch sử học tập phiên này/i)).toBeInTheDocument();
      expect(screen.getByText(/NoiKhoa_TimMach_CapCuu.pdf/i)).toBeInTheDocument();
    });

    it('T1.1.2: triggers onViewHistory callback when clicking history card', () => {
      render(<UploadConfig {...defaultProps} sessions={[mockMedicalSession]} />);
      const sessionCard = screen.getByText(/NoiKhoa_TimMach_CapCuu.pdf/i).closest('div');
      expect(sessionCard).toBeInTheDocument();

      fireEvent.click(sessionCard!);
      expect(defaultProps.onViewHistory).toHaveBeenCalledWith(mockMedicalSession);
    });
  });
});
