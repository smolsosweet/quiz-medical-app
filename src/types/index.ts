export type AnswerLabel = "A" | "B" | "C" | "D";

export interface QuestionOption {
  label: AnswerLabel;
  text: string;
}

export interface Question {
  id: string;
  text: string;
  options: QuestionOption[];
  correctAnswer: AnswerLabel;
  explanation: string;
}

export interface QuizRound {
  id: string; // ID của vòng thi, ví dụ: "Lần 1"
  questions: Question[];
  userAnswers: Record<string, AnswerLabel>; // Lưu lại câu trả lời
}

export interface QuizSession {
  id: string; // Timestamp
  title: string; // Tên hiển thị (ví dụ: Tên file đầu tiên)
  date: string; // Ngày tháng tạo
  filesCount: number;
  rounds: QuizRound[];
}

export interface StoredQuizSession extends QuizSession {
  version?: number; // schema version e.g. 1
  createdAt?: number; // timestamp
}

