export interface Question {
  id: string;
  text: string;
  options: { label: string; text: string }[];
  correctAnswer: string;
  explanation: string;
}

export interface QuizState {
  questions: Question[];
  currentQuestionIndex: number;
  score: number;
  userAnswers: Record<string, string>; // questionId -> label ("A", "B", etc.)
  isFinished: boolean;
}

export interface QuizRound {
  id: string; // ID của vòng thi, ví dụ: "Lần 1"
  questions: Question[];
  userAnswers: Record<string, string>; // Lưu lại câu trả lời
}

export interface QuizSession {
  id: string; // Timestamp
  title: string; // Tên hiển thị (ví dụ: Tên file đầu tiên)
  date: string; // Ngày tháng tạo
  filesCount: number;
  rounds: QuizRound[];
}
