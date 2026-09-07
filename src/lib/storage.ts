import { QuizSession, QuizRound, Question, AnswerLabel } from "@/types";

export const STORAGE_KEY = "mediquiz_sessions_v1";
const MAX_STORED_SESSIONS = 50;

/**
 * Validates a single Question object defensively.
 */
function isValidQuestion(q: unknown): q is Question {
  if (!q || typeof q !== "object") return false;
  const item = q as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    typeof item.text === "string" &&
    Array.isArray(item.options) &&
    typeof item.correctAnswer === "string" &&
    typeof item.explanation === "string"
  );
}

/**
 * Validates a QuizRound defensively.
 */
function sanitizeRound(round: unknown, index: number): QuizRound | null {
  if (!round || typeof round !== "object") return null;
  const r = round as Record<string, unknown>;
  
  const id = typeof r.id === "string" && r.id ? r.id : `Lần ${index + 1}`;
  const questions: Question[] = Array.isArray(r.questions)
    ? r.questions.filter(isValidQuestion)
    : [];
  
  const userAnswers: Record<string, AnswerLabel> = {};
  if (r.userAnswers && typeof r.userAnswers === "object" && !Array.isArray(r.userAnswers)) {
    const rawAnswers = r.userAnswers as Record<string, unknown>;
    for (const [key, val] of Object.entries(rawAnswers)) {
      if (typeof val === "string" && ["A", "B", "C", "D"].includes(val)) {
        userAnswers[key] = val as AnswerLabel;
      }
    }
  }

  return { id, questions, userAnswers };
}

/**
 * Validates and sanitizes a raw session item from sessionStorage.
 */
function sanitizeSession(item: unknown): QuizSession | null {
  if (!item || typeof item !== "object") return null;
  const s = item as Record<string, unknown>;

  if (typeof s.id !== "string" || !s.id) return null;

  const title = typeof s.title === "string" && s.title ? s.title : "Tài liệu không tên";
  const date = typeof s.date === "string" && s.date ? s.date : new Date().toLocaleString();
  const filesCount = typeof s.filesCount === "number" && !isNaN(s.filesCount) ? s.filesCount : 1;

  const rawRounds = Array.isArray(s.rounds) ? s.rounds : [];
  const rounds: QuizRound[] = [];
  rawRounds.forEach((r, idx) => {
    const sanitized = sanitizeRound(r, idx);
    if (sanitized) rounds.push(sanitized);
  });

  return {
    id: s.id,
    title,
    date,
    filesCount,
    rounds
  };
}

/**
 * Safely loads quiz sessions from sessionStorage with SSR guards and full schema validation.
 */
export function loadSessionsFromStorage(): QuizSession[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      console.warn("[Storage] Corrupt sessions data format in sessionStorage; resetting.");
      return [];
    }

    const sessions: QuizSession[] = [];
    for (const item of parsed) {
      const sanitized = sanitizeSession(item);
      if (sanitized) {
        sessions.push(sanitized);
      }
    }

    return sessions;
  } catch (error) {
    console.warn("[Storage] Failed to read sessions from sessionStorage:", error);
    return [];
  }
}

/**
 * Safely saves quiz sessions to sessionStorage with SSR guards and quota management.
 */
export function saveSessionsToStorage(sessions: QuizSession[]): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    if (!Array.isArray(sessions)) {
      return;
    }

    // Keep the most recent sessions to avoid exceeding sessionStorage quota
    const trimmed = sessions.slice(0, MAX_STORED_SESSIONS);
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch (error) {
    console.warn("[Storage] Failed to write sessions to sessionStorage:", error);
  }
}

/**
 * Clears stored quiz sessions from sessionStorage.
 */
export function clearStorageSessions(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn("[Storage] Failed to clear sessions from sessionStorage:", error);
  }
}
