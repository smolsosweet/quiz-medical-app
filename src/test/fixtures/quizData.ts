import { Question, QuizRound, QuizSession } from '@/types';

export const mockMedicalQuestions: Question[] = [
  {
    id: 'med-q1',
    text: 'Bệnh nhân nam 55 tuổi, tiền sử ĐTĐ type 2, vào viện vì đau ngực sau xương ức 45 phút, ECG có ST chênh lên ở DII, DIII, aVF. Chẩn đoán phù hợp nhất?',
    options: [
      { label: 'A', text: 'Nhồi máu cơ tim cấp vùng hoành (thành dưới)' },
      { label: 'B', text: 'Viêm màng ngoài tim cấp' },
      { label: 'C', text: 'Thuyên tắc động mạch phổi cấp' },
      { label: 'D', text: 'Trào ngược dạ dày thực quản cấp' },
    ],
    correctAnswer: 'A',
    explanation: 'ST chênh lên ở DII, DIII, aVF phản ánh hoại tử vùng thành dưới thất trái, thường do tắc nhánh động mạch vành phải (RCA).',
  },
  {
    id: 'med-q2',
    text: 'Xử trí ban đầu ưu tiên nhất ở bệnh nhân sốc phản vệ độ II sau tiêm kháng sinh là gì?',
    options: [
      { label: 'A', text: 'Diphenhydramine uống liều cao' },
      { label: 'B', text: 'Adrenaline (Epinephrine) tiêm bắp mặt trước ngoài đùi ngay lập tức' },
      { label: 'C', text: 'Hydrocortisone tiêm tĩnh mạch chậm' },
      { label: 'D', text: 'Methylprednisolone truyền tĩnh mạch' },
    ],
    correctAnswer: 'B',
    explanation: 'Adrenaline tiêm bắp là thuốc thiết yếu duy nhất cứu mạng và phải dùng ngay khi xác định phản vệ từ độ II trở lên theo phác đồ Bộ Y tế.',
  },
  {
    id: 'med-q3',
    text: 'Triệu chứng lâm sàng kinh điển trong tam chứng Charcot của viêm đường mật cấp gồm những gì?',
    options: [
      { label: 'A', text: 'Đau hạ sườn phải, sốt rét run, vàng da' },
      { label: 'B', text: 'Đau thượng vị, nôn mửa, tụt huyết áp' },
      { label: 'C', text: 'Sốt cao, co giật, cứng gáy' },
      { label: 'D', text: 'Đau thắt lưng, tiểu máu, tăng huyết áp' },
    ],
    correctAnswer: 'A',
    explanation: 'Tam chứng Charcot bao gồm: Đau hạ sườn phải -> Sốt rét run -> Vàng da, xuất hiện theo đúng trình tự thời gian.',
  },
  {
    id: 'med-q4',
    text: 'Thuốc hạ huyết áp nào chống chỉ định tuyệt đối cho phụ nữ mang thai?',
    options: [
      { label: 'A', text: 'Methyldopa' },
      { label: 'B', text: 'Labetalol' },
      { label: 'C', text: 'Thuốc ức chế men chuyển (ACEi) và chẹn thụ thể AT1 (ARB)' },
      { label: 'D', text: 'Nifedipine phóng thích kéo dài' },
    ],
    correctAnswer: 'C',
    explanation: 'ACEi và ARB gây độc thận cho thai nhi, suy giảm tưới máu thận thai, vô niệu, thiểu ối và dị tật sọ mặt.',
  },
  {
    id: 'med-q5',
    text: 'Chỉ số cận lâm sàng nào có giá trị cao nhất để chẩn đoán và theo dõi suy tim sung huyết mất bù cấp?',
    options: [
      { label: 'A', text: 'BNP hoặc NT-proBNP huyết thanh' },
      { label: 'B', text: 'Troponin T siêu nhạy' },
      { label: 'C', text: 'Điện giải đồ huyết thanh' },
      { label: 'D', text: 'Độ thanh thải Creatinine' },
    ],
    correctAnswer: 'A',
    explanation: 'BNP và NT-proBNP được tiết ra từ cơ tâm thất khi tăng áp lực và căng dãn buồng tim, có giá trị độ nhạy và âm tính cao.',
  },
];

export const mockMedicalRound1: QuizRound = {
  id: 'Lần 1',
  questions: mockMedicalQuestions,
  userAnswers: {
    'med-q1': 'A', // Correct
    'med-q2': 'B', // Correct
    'med-q3': 'C', // Incorrect (user picked C, correct is A)
    'med-q4': 'C', // Correct
    'med-q5': 'B', // Incorrect (user picked B, correct is A)
  },
};

export const mockMedicalSession: QuizSession = {
  id: 'session-clinical-001',
  title: 'NoiKhoa_TimMach_CapCuu.pdf',
  date: '2026-09-07 08:30:00',
  filesCount: 1,
  rounds: [mockMedicalRound1],
};
