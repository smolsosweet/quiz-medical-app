import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadSessionsFromStorage,
  saveSessionsToStorage,
  clearStorageSessions,
  STORAGE_KEY,
} from '@/lib/storage';
import { mockMedicalSession, mockMedicalQuestions } from '@/test/fixtures/quizData';
import { QuizSession } from '@/types';

describe('Tier 1: History Review & Storage Persistence', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('T1.1.7: returns empty array when sessionStorage has no sessions', () => {
    const sessions = loadSessionsFromStorage();
    expect(sessions).toEqual([]);
  });

  it('T1.1.8: saves and retrieves a valid quiz session from storage', () => {
    saveSessionsToStorage([mockMedicalSession]);
    const stored = loadSessionsFromStorage();

    expect(stored).toHaveLength(1);
    expect(stored[0].id).toBe(mockMedicalSession.id);
    expect(stored[0].title).toBe(mockMedicalSession.title);
    expect(stored[0].rounds).toHaveLength(1);
    expect(stored[0].rounds[0].questions).toHaveLength(5);
  });

  it('T1.1.9: clears stored sessions on clearStorageSessions()', () => {
    saveSessionsToStorage([mockMedicalSession]);
    expect(loadSessionsFromStorage()).toHaveLength(1);

    clearStorageSessions();
    expect(loadSessionsFromStorage()).toHaveLength(0);
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('T1.1.10: prepends and limits sessions up to MAX_STORED_SESSIONS (50)', () => {
    const manySessions: QuizSession[] = [];
    for (let i = 0; i < 60; i++) {
      manySessions.push({
        id: `sess-${i}`,
        title: `Test File ${i}.pdf`,
        date: '2026-09-07',
        filesCount: 1,
        rounds: [],
      });
    }

    saveSessionsToStorage(manySessions);
    const loaded = loadSessionsFromStorage();
    expect(loaded.length).toBe(50);
    expect(loaded[0].id).toBe('sess-0');
    expect(loaded[49].id).toBe('sess-49');
  });

  it('T1.1.11: sanitizes and excludes corrupted questions while preserving valid ones in round', () => {
    const sessionWithCorruptedData = {
      id: 'sess-corrupt-01',
      title: 'Corrupt.pdf',
      date: '2026-09-07',
      filesCount: 1,
      rounds: [
        {
          id: 'Lần 1',
          questions: [
            mockMedicalQuestions[0], // Valid
            { invalid: true, missing: 'all fields' }, // Malformed question
            null, // Null item
          ],
          userAnswers: { 'med-q1': 'A', 'invalid-key': 'INVALID' },
        },
      ],
    };

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify([sessionWithCorruptedData]));

    const loaded = loadSessionsFromStorage();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].rounds[0].questions).toHaveLength(1);
    expect(loaded[0].rounds[0].questions[0].id).toBe('med-q1');
    // userAnswers with non-standard values should be filtered out
    expect(loaded[0].rounds[0].userAnswers).toEqual({ 'med-q1': 'A' });
  });
});
