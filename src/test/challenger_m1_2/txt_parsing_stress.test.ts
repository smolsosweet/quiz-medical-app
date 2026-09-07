import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

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

describe('TXT Parsing Empirical Stress Suite (F05)', () => {
  const originalApiKey = process.env.GEMINI_API_KEY;

  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'test-api-key-empirical-challenger-2';
    mockGenerateContent.mockReset();
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({
        questions: [
          {
            text: 'Bệnh nhân có chỉ số nào sau đây bất thường?',
            options: [
              { label: 'A', text: 'SpO₂ < 90%' },
              { label: 'B', text: 'Huyết áp 120/80 mmHg' },
              { label: 'C', text: 'Thân nhiệt 37.0 °C' },
              { label: 'D', text: 'K+ 4.0 mmol/L' },
            ],
            correctAnswer: 'A',
            explanation: 'Dựa trên tài liệu lâm sàng được cung cấp.',
          },
        ],
      }),
    });
  });

  afterEach(() => {
    process.env.GEMINI_API_KEY = originalApiKey;
  });

  // Helper to create duck-typed NextRequest
  const createMockRequest = (formData: FormData): NextRequest => {
    return {
      formData: async () => formData,
    } as unknown as NextRequest;
  };

  describe('1. Large Text File (>100KB) Parsing', () => {
    it('successfully reads and includes >100KB plain text file into Gemini prompt payload without truncation', async () => {
      // Construct >100KB of rich clinical text (~150KB)
      const baseParagraph = `
CHƯƠNG LÂM SÀNG TIM MẠCH HỌC NÂNG CAO:
Bệnh nhân nam 68 tuổi nhập viện vì cơn khó thở kịch phát về đêm và đau ngực kiểu đè ép sau xương ức.
Tiền sử: Đái tháo đường type 2 điều trị 10 năm bằng Metformin 1000mg/ngày, tăng huyết áp vô căn.
Khám thực thể ghi nhận: Nhịp tim nhanh 115 chu kỳ/phút, huyết áp 170/100 mmHg, SpO₂ 88% trên khí phòng.
Ran nổ ẩm lan tỏa 2/3 dưới hai phế trường, tĩnh mạch cổ nổi tự nhiên ở tư thế Fowler 45 độ, phản hồi gan tĩnh mạch cổ dương tính (+).
Điện tâm đồ (ECG) ghi nhận nhịp xoang nhanh, đoạn ST chênh lên dạng vòm ≥ 2mm tại các chuyển đạo V1-V4, sóng Q bệnh lý chuyển đạo DII, DIII, aVF.
Men tim Troponin T siêu nhạy (hs-cTnT) tăng vọt đạt 1500 ng/L (giá trị bình thường < 14 ng/L).
Siêu âm tim tại giường (POCUS): Giảm động nặng vùng mỏm và thành trước thất trái, phân suất tống máu thất trái (LVEF) giảm còn 32%.
Chẩn đoán xác định: Nhồi máu cơ tim cấp có ST chênh lên vùng trước rộng giờ thứ 4, biến chứng Killip III (Phù phổi cấp huyết động).
Hướng xử trí:
1. Thở oxy qua mặt nạ túi không thở lại lưu lượng 10-15 L/phút để duy trì SpO₂ ≥ 94%.
2. Phun khí dung Salbutamol 5mg kết hợp Ipratropium 0.5mg nếu có co thắt phế quản kèm theo.
3. Furosemide 40mg tiêm tĩnh mạch chậm trong 2 phút.
4. Nitroglycerin truyền tĩnh mạch khởi đầu 5 µg/phút, tăng dần 5 µg/phút mỗi 3-5 phút cho đến khi kiểm soát được huyết áp mục tiêu.
5. Chuyển ngay đến phòng Can thiệp tim mạch (CathLab) để chụp và can thiệp mạch vành qua da thì đầu (Primary PCI).
`;
      // Fast repeat to exceed 100KB (120KB)
      const repeatCount = Math.ceil((120 * 1024) / new Blob([baseParagraph]).size);
      const largeContent = baseParagraph.repeat(repeatCount);
      const actualByteSize = new Blob([largeContent]).size;
      expect(actualByteSize).toBeGreaterThan(100 * 1024); // > 100KB

      const formData = new FormData();
      const largeFile = new File([largeContent], 'GiaoTrinh_TimMach_LamSang_150KB.txt', { type: 'text/plain' });
      formData.append('files', largeFile);
      formData.append('numQuestions', '5');

      const req = createMockRequest(formData);
      const res = await POST(req);

      expect(res.status).toBe(200);
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);

      // Verify the prompt contents received by Gemini API
      const callArgs = mockGenerateContent.mock.calls[0][0];
      const parts = callArgs.contents[0].parts;
      expect(parts).toHaveLength(2); // Prompt instruction + Document text
      
      const docTextPart = parts[1].text;
      expect(docTextPart).toContain('--- Tài liệu TXT: GiaoTrinh_TimMach_LamSang_150KB.txt ---');
      expect(docTextPart).toContain(largeContent);
      
      // Verify byte size integrity: payload byte size exceeds input file byte size due to headers
      expect(new Blob([docTextPart]).size).toBeGreaterThan(actualByteSize);
    });

    it('stress tests a very large TXT file of ~500KB within the 10MB limit', async () => {
      const sample = 'Dữ liệu nghiên cứu dược lý học phân tử về thuốc chẹn thụ thể Beta-1 giao cảm.\n';
      const repeatCount = Math.ceil((500 * 1024) / new Blob([sample]).size);
      const veryLargeText = sample.repeat(repeatCount);
      const actualByteSize = new Blob([veryLargeText]).size;
      expect(actualByteSize).toBeGreaterThan(500 * 1024); // > 500KB

      const formData = new FormData();
      const file = new File([veryLargeText], 'DuocLy_500KB.txt', { type: 'text/plain' });
      formData.append('files', file);
      formData.append('numQuestions', '10');

      const req = createMockRequest(formData);
      const res = await POST(req);

      expect(res.status).toBe(200);
      const callArgs = mockGenerateContent.mock.calls[0][0];
      const docTextPart = callArgs.contents[0].parts[1].text;
      expect(docTextPart).toContain(veryLargeText);
      expect(new Blob([docTextPart]).size).toBeGreaterThan(actualByteSize);
    });
  });

  describe('2. UTF-8 & Vietnamese Character Set Integrity', () => {
    it('verifies preservation of all Vietnamese vowels, tone marks, and medical vocabulary in TXT parsing', async () => {
      const vietnameseMedicalDoc = `
HỘI CHỨNG VÀ BỆNH HỌC NỘI KHOA VIỆT NAM:
1. Tất cả nguyên âm và dấu thanh tiếng Việt:
- a à á ả ã ạ, ă ằ ắ ẳ ẵ ặ, â ầ ấn ẩ ẫ ậ
- e è é ẻ ẽ ẹ, ê ề ế ể ễ ệ
- i ì í ỉ ĩ ị
- o ò ó ỏ õ ọ, ô ồ ố ổ ỗ ộ, ơ ờ ớ ở ỡ ợ
- u ù ú ủ ũ ụ, ư ừ ứ ử ữ ự
- y ỳ ý ỷ ỹ ỵ
- đ Đ

2. Thuật ngữ y học chuyên sâu:
- Viêm tụy cấp thể phù nề và thể hoại tử xuất huyết.
- Xơ gan mất bù do virus viêm gan B kèm tăng áp lực tĩnh mạch cửa.
- Bệnh phổi tắc nghẽn mạn tính (COPD) đợt bùng phát có suy hô hấp tăng CO₂ máu.
- Nhiễm trùng huyết do vi khuẩn Gram âm đa kháng thuốc xuất phát từ đường tiết niệu.
- Đái tháo đường thai kỳ khởi phát trong tam cá nguyệt thứ hai.
- Viêm cầu thận mạn có hội chứng thận hư tái phát.
`;
      const formData = new FormData();
      const file = new File([vietnameseMedicalDoc], 'benh_hoc_viet_nam.txt', { type: 'text/plain' });
      formData.append('files', file);
      formData.append('numQuestions', '3');

      const req = createMockRequest(formData);
      const res = await POST(req);

      expect(res.status).toBe(200);
      const callArgs = mockGenerateContent.mock.calls[0][0];
      const docText = callArgs.contents[0].parts[1].text;

      // Assert specific complex diacritics are strictly intact
      expect(docText).toContain('ă ằ ắ ẳ ẵ ặ');
      expect(docText).toContain('â ầ ấn ẩ ẫ ậ');
      expect(docText).toContain('ê ề ế ể ễ ệ');
      expect(docText).toContain('ô ồ ố ổ ỗ ộ');
      expect(docText).toContain('ơ ờ ớ ở ỡ ợ');
      expect(docText).toContain('ư ừ ứ ử ữ ự');
      expect(docText).toContain('đ Đ');
      expect(docText).toContain('Viêm tụy cấp thể phù nề và thể hoại tử xuất huyết');
      expect(docText).toContain('Xơ gan mất bù do virus viêm gan B');
      expect(docText).toContain('tăng áp lực tĩnh mạch cửa');
    });
  });

  describe('3. Special Medical Symbols, Greek Letters, and Scientific Units', () => {
    it('verifies exact preservation of Greek letters, clinical units, and mathematical symbols', async () => {
      const specialSymbolsDoc = `
DƯỢC LÝ VÀ HUYẾT ĐỘNG HỌC LÂM SÀNG:
1. Ký tự Hy Lạp:
- α₁-receptor, α₂-receptor (chủ vận alpha)
- β₁-blocker, β₂-agonist (chẹn beta, chủ vận beta giao cảm)
- γ-aminobutyric acid (GABA), δ-opioid receptor, κ-receptor
- Chuỗi polypeptide: chuỗi α, chuỗi β của phân tử Hemoglobin A1 (HbA₁)

2. Đơn vị đo lường và nồng độ y khoa:
- Liều truyền: Dobutamine 5.0 µg/kg/phút, Noradrenaline 0.1 µg/kg/phút
- Nồng độ: Glucose 110 mg/dL, Creatinine 88 µmol/L, Natri 140 mEq/L
- Điện giải: K⁺ = 4.2 mmol/L, Ca²⁺ = 2.4 mmol/L, Mg²⁺ = 0.95 mmol/L, Fe²⁺/Fe³⁺
- Khí máu động mạch: pH = 7.38, PaO₂ = 95 mmHg, PaCO₂ = 40 mmHg, HCO₃⁻ = 24 mEq/L
- Áp lực tĩnh mạch trung tâm: CVP = 8 cmH₂O
- Thân nhiệt: 37.5 °C, 39.2 °C

3. Ký hiệu toán học, bất đẳng thức, mũi tên chuyển hóa:
- Độ tin cậy 95%: CI 95% = 1.45 ± 0.25
- Chỉ số SpO₂ ≥ 94%, PaO₂ ≤ 60 mmHg, pH ≠ 7.0, eGFR ≈ 45 mL/phút/1.73m²
- Tỷ lệ: 1/1000, 2 ‰ (hai phần nghìn)
- Huyết áp: 120/80 mmHg
- Mũi tên lâm sàng: Thiếu oxy máu → Co thắt mạch phổi → Tăng áp động mạch phổi → Suy tim phải (Tâm phế mạn).
- Cân bằng sinh hóa: CO₂ + H₂O ⇌ H₂CO₃ ⇌ H⁺ + HCO₃⁻
- Chiều hướng: ↑ AST, ↑ ALT, ↓ Albumin, ↓ Tiểu cầu.
`;
      const formData = new FormData();
      const file = new File([specialSymbolsDoc], 'duoc_ly_ky_hieu_dac_biet.txt', { type: 'text/plain' });
      formData.append('files', file);
      formData.append('numQuestions', '3');

      const req = createMockRequest(formData);
      const res = await POST(req);

      expect(res.status).toBe(200);
      const callArgs = mockGenerateContent.mock.calls[0][0];
      const docText = callArgs.contents[0].parts[1].text;

      // Check Greek letters
      expect(docText).toContain('α₁-receptor');
      expect(docText).toContain('β₁-blocker');
      expect(docText).toContain('γ-aminobutyric acid');
      expect(docText).toContain('δ-opioid receptor');

      // Check clinical units & micro symbol
      expect(docText).toContain('5.0 µg/kg/phút');
      expect(docText).toContain('0.1 µg/kg/phút');
      expect(docText).toContain('88 µmol/L');
      expect(docText).toContain('37.5 °C');
      expect(docText).toContain('8 cmH₂O');

      // Check ions & sub/superscripts
      expect(docText).toContain('K⁺ = 4.2 mmol/L');
      expect(docText).toContain('Ca²⁺ = 2.4 mmol/L');
      expect(docText).toContain('HCO₃⁻ = 24 mEq/L');
      expect(docText).toContain('PaO₂ = 95 mmHg');

      // Check math operators & arrows
      expect(docText).toContain('± 0.25');
      expect(docText).toContain('SpO₂ ≥ 94%');
      expect(docText).toContain('PaO₂ ≤ 60 mmHg');
      expect(docText).toContain('pH ≠ 7.0');
      expect(docText).toContain('eGFR ≈ 45');
      expect(docText).toContain('2 ‰');
      expect(docText).toContain('CO₂ + H₂O ⇌ H₂CO₃ ⇌ H⁺ + HCO₃⁻');
      expect(docText).toContain('↑ AST, ↑ ALT, ↓ Albumin, ↓ Tiểu cầu');
    });
  });

  describe('4. Multi-line Formatting, Line Endings, and Structure', () => {
    it('preserves Windows (CRLF), Unix (LF), tabs, and markdown section headers in TXT', async () => {
      const formattedDoc = 
        "# BÁO CÁO CA LÂM SÀNG (CLINICAL CASE REPORT)\r\n" +
        "## I. HÀNH CHÍNH\r\n" +
        "\t- Họ tên bệnh nhân: NGUYỄN VĂN A\r\n" +
        "\t- Tuổi: 54\tGiới tính: Nam\r\n" +
        "\r\n" +
        "## II. DIỄN TIẾN BỆNH PHÒNG\r\n" +
        "Ngày 1:\r\n" +
        "    1.1. Tiếp nhận cấp cứu lúc 08:30.\r\n" +
        "    1.2. Thử máu tĩnh mạch.\r\n" +
        "\n" +
        "Ngày 2:\n" +
        "    2.1. Đánh giá đáp ứng kháng sinh sau 24 giờ.\n" +
        "    2.2. X quang ngực thẳng kiểm tra: tổn thương thâm nhiễm đông đặc thùy dưới phổi phải.\n" +
        "\n" +
        "| Xét nghiệm | Kết quả | Khoảng tham chiếu |\n" +
        "| Bạch cầu (WBC) | 16.8 G/L | 4.0 - 10.0 G/L |\n" +
        "| CRP định lượng | 120 mg/L | < 5 mg/L |\n";

      const formData = new FormData();
      const file = new File([formattedDoc], 'case_report_formatted.txt', { type: 'text/plain' });
      formData.append('files', file);
      formData.append('numQuestions', '2');

      const req = createMockRequest(formData);
      const res = await POST(req);

      expect(res.status).toBe(200);
      const callArgs = mockGenerateContent.mock.calls[0][0];
      const docText = callArgs.contents[0].parts[1].text;

      expect(docText).toContain('# BÁO CÁO CA LÂM SÀNG');
      expect(docText).toContain('## I. HÀNH CHÍNH');
      expect(docText).toContain('\t- Họ tên bệnh nhân: NGUYỄN VĂN A');
      expect(docText).toContain('| Xét nghiệm | Kết quả | Khoảng tham chiếu |');
      expect(docText).toContain('| Bạch cầu (WBC) | 16.8 G/L | 4.0 - 10.0 G/L |');
    });
  });

  describe('5. Extension and MIME Type Variations for TXT Files', () => {
    it('accepts TXT file with empty MIME type (type = "") if filename ends with .txt', async () => {
      const formData = new FormData();
      const fileWithoutMime = new File(['Nội dung file TXT không có MIME type.'], 'bai_hoc.txt', { type: '' });
      formData.append('files', fileWithoutMime);
      formData.append('numQuestions', '1');

      const req = createMockRequest(formData);
      const res = await POST(req);

      expect(res.status).toBe(200);
      const callArgs = mockGenerateContent.mock.calls[0][0];
      const docText = callArgs.contents[0].parts[1].text;
      expect(docText).toContain('--- Tài liệu TXT: bai_hoc.txt ---');
      expect(docText).toContain('Nội dung file TXT không có MIME type.');
    });

    it('accepts TXT file with generic binary MIME type application/octet-stream if filename ends with .txt', async () => {
      const formData = new FormData();
      const fileOctet = new File(['Tài liệu đọc từ máy khách với MIME generic.'], 'ghi_chu.txt', {
        type: 'application/octet-stream',
      });
      formData.append('files', fileOctet);
      formData.append('numQuestions', '1');

      const req = createMockRequest(formData);
      const res = await POST(req);

      expect(res.status).toBe(200);
      const callArgs = mockGenerateContent.mock.calls[0][0];
      const docText = callArgs.contents[0].parts[1].text;
      expect(docText).toContain('--- Tài liệu TXT: ghi_chu.txt ---');
      expect(docText).toContain('Tài liệu đọc từ máy khách với MIME generic.');
    });

    it('concatenates multiple TXT files into a coherent document with distinct headers', async () => {
      const formData = new FormData();
      const file1 = new File(['Phần 1: Giải phẫu động mạch vành.'], 'part1.txt', { type: 'text/plain' });
      const file2 = new File(['Phần 2: Sinh lý tưới máu cơ tim.'], 'part2.txt', { type: 'text/plain' });
      formData.append('files', file1);
      formData.append('files', file2);
      formData.append('numQuestions', '2');

      const req = createMockRequest(formData);
      const res = await POST(req);

      expect(res.status).toBe(200);
      const callArgs = mockGenerateContent.mock.calls[0][0];
      const docText = callArgs.contents[0].parts[1].text;

      expect(docText).toContain('--- Tài liệu TXT: part1.txt ---\nPhần 1: Giải phẫu động mạch vành.');
      expect(docText).toContain('--- Tài liệu TXT: part2.txt ---\nPhần 2: Sinh lý tưới máu cơ tim.');
    });

    it('handles read failure gracefully when file.text() throws', async () => {
      const brokenFile = new File(['valid'], 'corrupted.txt', { type: 'text/plain' });
      // Simulate file reading failure
      vi.spyOn(brokenFile, 'text').mockRejectedValueOnce(new Error('Disk read error'));

      const formData = new FormData();
      formData.append('files', brokenFile);
      formData.append('numQuestions', '1');

      const req = createMockRequest(formData);
      const res = await POST(req);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('Không thể đọc file TXT: corrupted.txt');
    });
  });
});
