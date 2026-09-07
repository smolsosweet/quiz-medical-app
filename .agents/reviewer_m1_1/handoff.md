# Review & Adversarial Challenge Report: Milestone 1 (M1)

**Reviewer**: Reviewer 1 (M1: Bug Fixing & State Stability)  
**Roles**: Reviewer, Adversarial Critic  
**Date**: 2026-09-07T01:33:00+07:00  
**Target Files Reviewed**:
- `src/components/QuizInterface.tsx`
- `src/app/page.tsx`
- `src/components/UploadConfig.tsx`
- `src/app/api/generate/route.ts`
- `src/lib/storage.ts`
- `src/types/index.ts`

**Overall Verdict**: **REQUEST_CHANGES**  
**Integrity Audit**: **CLEAN (PASS)** — No hardcoded test bypasses, no dummy facades, no fabricated verification logs.

---

## 1. Observation

### 1.1 Automated Verification Command Outputs

1. **Unit & Integration Test Suite (`cmd.exe /c "npm run test"`)**:
   ```
   > quiz-web@0.1.0 test
   > vitest run

   ✓ src/test/smoke.test.ts (1 test) 7ms
   ✓ src/test/tier1_features/history_persistence.test.ts (5 tests) 14ms
   ✓ src/components/__tests__/Header.test.tsx (6 tests) 316ms
   ✓ src/components/__tests__/UploadConfig.test.tsx (15 tests) 667ms
   ✓ src/test/tier2_boundaries/boundary_corner_cases.test.tsx (25 tests) 794ms
   ✓ src/components/__tests__/QuizInterface.test.tsx (11 tests) 823ms
   ✓ src/test/tier3_combinations/cross_feature_combinations.test.tsx (5 tests) 1397ms
   ✓ src/test/tier4_scenarios/real_world_medical_scenarios.test.tsx (5 tests) 1496ms

   Test Files  8 passed (8)
   Tests       73 passed (73)
   Duration    4.28s
   Exit Code:  0
   ```

2. **ESLint Verification (`cmd.exe /c "npx eslint src/components/QuizInterface.tsx src/app/page.tsx src/components/UploadConfig.tsx src/app/api/generate/route.ts src/lib/storage.ts src/types/index.ts"`)**:
   ```
   Exit Code: 0 (0 errors, 0 warnings)
   ```

3. **TypeScript Validation (`cmd.exe /c "npx tsc -p tsconfig.json --noEmit"`)**:
   ```
   Exit Code: 0 (0 TypeErrors)
   ```

4. **Production Build (`cmd.exe /c "npm run build"`)**:
   ```
   ▲ Next.js 16.2.10 (Turbopack)
   ✓ Compiled successfully in 3.0s
   ✓ Finished TypeScript in 4.0s
   ✓ Generating static pages using 6 workers (5/5) in 567ms
   Route (app)
   ┌ ○ /
   ├ ○ /_not-found
   └ ƒ /api/generate
   Exit Code: 0
   ```

---

### 1.2 Forensic Integrity Audit Observations

- Searched `src/` for hardcoded mock injections, bypass flags (`NODE_ENV === "test"`), or conditional facading.
- Verified that all mock fixtures (`mockMedicalQuestions`, `mockMedicalSession`) reside strictly within test directories (`src/test/` and `src/components/__tests__/`).
- Confirmed that real parsing logic exists for `.txt` in `src/app/api/generate/route.ts:57-67` (`await file.text()`) and `UploadConfig.tsx:53-61`.
- Confirmed that `src/lib/storage.ts` performs genuine recursive defensive schema sanitization (`sanitizeSession`, `sanitizeRound`, `isValidQuestion`).

---

### 1.3 Code Defect Observation: Historical Session Contamination / Hijack

In `src/app/page.tsx:169-179`:
```typescript
const handleViewHistory = (session: QuizSession) => {
  setCurrentSessionId(session.id);
  setCurrentRounds(Array.isArray(session.rounds) ? session.rounds : []);
  setIsReviewMode(true);
  setQuestions(null); // Mở mode Review
};

const handleBackToDashboard = () => {
  setIsReviewMode(false);
  // Non-destructive: preserve files, scope, previous questions, etc.
};
```

And in `src/app/page.tsx:110-113` (`handleGenerate`):
```typescript
setQuizId(prev => prev + 1);
if (!currentSessionId) {
  setCurrentSessionId(Date.now().toString());
}
```

And in `src/app/page.tsx:127-157` (`handleFinishRound`):
```typescript
const handleFinishRound = (userAnswers: Record<string, AnswerLabel>) => {
  if (questions && currentSessionId) {
    const newRound: QuizRound = {
      id: `Lần ${currentRounds.length + 1}`,
      questions: [...questions],
      userAnswers: { ...userAnswers }
    };
    
    const newRounds = [...currentRounds, newRound];
    setCurrentRounds(newRounds);

    const updatedSession: QuizSession = {
      id: currentSessionId,
      title: files.length > 0 ? files[0].name : "Không rõ tài liệu",
      date: new Date().toLocaleString(),
      filesCount: files.length,
      rounds: newRounds
    };

    setSessions(prev => {
      const existingIdx = prev.findIndex(s => s.id === currentSessionId);
      if (existingIdx >= 0) {
        const newSessions = [...prev];
        newSessions[existingIdx] = updatedSession;
        return newSessions;
      }
      return [updatedSession, ...prev];
    });
  }
};
```

When a user views an existing historical session (`handleViewHistory`) and then exits back to the dashboard (`handleBackToDashboard`), `currentSessionId` remains set to that past session's ID and `currentRounds` retains the past session's rounds. If the user then generates a new quiz from the dashboard (`handleGenerate(numQ, false)`), `currentSessionId` is not reset because `if (!currentSessionId)` is false. When the user finishes the new quiz, `handleFinishRound` mutates the historical session by appending the new round and overwriting the historical session's title with `files[0].name`.

---

## 2. Logic Chain

1. **Evaluation of F01 (History Review Crash & Score Calculation)**:
   - Observation: `QuizInterface.tsx:89-105` decouples review mode rendering using `shouldShowReview = isReviewMode || (isFinished && showReview)`. When `isReviewMode` is true, the review container renders immediately.
   - Observation: `QuizInterface.tsx:93-103` guards score percentage calculation with `if (!isReviewMode && totalQuestions > 0)`. When entering review mode with `questions: []`, `totalQuestions` is 0 and `scorePercent` defaults to 0, avoiding `NaN%`.
   - Observation: `QuizInterface.tsx:284-297` provides a clean fallback UI when `!currentQuestion` instead of returning `null`.
   - Inference: F01 is completely resolved and verified.

2. **Evaluation of F02 (LocalStorage Session Persistence & SSR Safety)**:
   - Observation: `src/lib/storage.ts` guards all `window.localStorage` accesses with `if (typeof window === "undefined")`.
   - Observation: `src/app/page.tsx:40-55` hydrates state in `useEffect` via `queueMicrotask` to comply with React 19 rules and skips syncing back to storage until `isHydrated` is true.
   - Inference: F02 is fully compliant with SSR hydration safety and React 19 guidelines.

3. **Evaluation of F03 (Defensive Guards on Null/Undefined Data)**:
   - Observation: `UploadConfig.tsx:286-292` guards `sessions.map`, validates `Array.isArray(session?.rounds)`, and validates `Array.isArray(r?.questions)` before reducing.
   - Observation: `QuizInterface.tsx:203-233` checks `Array.isArray(historyRounds)` and `Array.isArray(round?.questions)`, guarding against missing round or question items.
   - Inference: F03 is robust against corrupt and legacy session entries.

4. **Evaluation of F04 (Non-Destructive Navigation) & Root Cause of Finding 1**:
   - Observation: In `QuizInterface.tsx:183-199`, review mode "Quay lại" invokes `onBackToDashboard`.
   - Observation: In `src/app/page.tsx:176-179`, `handleBackToDashboard` only executes `setIsReviewMode(false)`. It preserves `files`, `model`, and `scope` as required.
   - Observation: However, `handleBackToDashboard` does NOT reset `currentSessionId` or `currentRounds`.
   - Observation: In `src/app/page.tsx:110-112`, `handleGenerate` checks `if (!currentSessionId) setCurrentSessionId(Date.now().toString())`. Because `currentSessionId` is non-null, it is reused.
   - Inference: This causes subsequent quiz generations to contaminate and overwrite previously reviewed historical sessions in `localStorage`. This is a Major state lifecycle defect that must be corrected before M1 sign-off.

5. **Evaluation of F05 (Plain Text TXT Support)**:
   - Observation: `UploadConfig.tsx:23-30, 53-61, 170` allows `text/plain` and `.txt`.
   - Observation: `src/app/api/generate/route.ts:57-67` reads `.txt` using `await file.text()` and prepends it to `documentText`.
   - Inference: F05 is correctly implemented on both frontend and backend.

---

## 3. Findings

### [Major] Finding 1: Historical Session Contamination & Title Overwriting

- **What**: Viewing a historical session and returning to the dashboard contaminates the next quiz generation, causing it to append rounds to and overwrite the title of the viewed historical session.
- **Where**: `src/app/page.tsx:176-179` (`handleBackToDashboard`) and `src/app/page.tsx:110-112` (`handleGenerate`).
- **Why**: `currentSessionId` and `currentRounds` remain bound to the historical session after clicking "Quay lại". A subsequent call to `handleGenerate` (with `isAddingMore=false`) fails to create a new session ID, resulting in `handleFinishRound` updating the old historical session in `sessions` and `localStorage`.
- **Suggested Fix**:
  1. In `src/app/page.tsx:handleBackToDashboard`:
     ```typescript
     const handleBackToDashboard = () => {
       setIsReviewMode(false);
       setCurrentSessionId(null);
       setCurrentRounds([]);
     };
     ```
  2. In `src/app/page.tsx:handleGenerate`:
     ```typescript
     if (!isAddingMore) {
       setCurrentSessionId(Date.now().toString());
       setCurrentRounds([]);
     }
     ```

### [Minor] Finding 2: Silent Quota Depletion Failure in `saveSessionsToStorage`

- **What**: When `localStorage` quota is exceeded, `saveSessionsToStorage` logs to `console.warn` without retrying with a smaller slice or informing caller.
- **Where**: `src/lib/storage.ts:124-126`.
- **Why**: While `MAX_STORED_SESSIONS = 50` mitigates quota issues, quizzes with 50 lengthy medical case vignettes can still hit browser limits.
- **Suggestion**: In a future enhancement (M2/M3), add fallback trimming (e.g. `sessions.slice(0, 25)`) inside the catch block if quota error occurs.

### [Minor] Finding 3: Inaccurate Code Comment in Test File `boundary_corner_cases.test.tsx`

- **What**: Test comment says `// Empty questions returns null cleanly rather than throwing`, but the component was improved to render a fallback `<p>Không có câu hỏi nào để hiển thị.</p>` with a return button.
- **Where**: `src/test/tier2_boundaries/boundary_corner_cases.test.tsx:57`.
- **Why**: Minor comment-code drift. Test passes because `container` is defined.

---

## 4. Adversarial Challenges & Stress Tests

| Challenge | Attack Scenario | Blast Radius | Status |
|---|---|---|:---:|
| **AC-1: Historical Session Hijack** | View history -> Return to dashboard -> Upload new file -> Complete quiz | Previous session title overwritten; rounds merged | **FAILED (Finding 1)** |
| **AC-2: Rapid Radio & Button Clicking** | Rapidly spamming options and next button during active quiz | Prevented by `disabled={hasAnsweredCurrent}` and single next button state | **PASSED** |
| **AC-3: Corrupted LocalStorage Payload** | Injecting unparseable JSON, numbers, nulls, and malformed round objects into storage | Sanitized gracefully, zero unhandled errors | **PASSED** |
| **AC-4: Division by Zero on Empty Question Set** | Mounting `QuizInterface` in review mode with `questions: []` | Handled: `totalQuestions > 0 ? ... : 0`, zero `NaN%` | **PASSED** |
| **AC-5: Special Medical UTF-8 & Greek Glyphs in TXT** | Uploading `.txt` with `α, β, ±, ≥, ≤, µg/kg, °C, ²` | Decoded properly via `Blob.text()` (UTF-8) | **PASSED** |

---

## 5. Verified Claims Matrix

| Claim from Worker | Verification Method | Result |
|---|---|:---:|
| 100% Vitest tests pass (73/73) | `cmd.exe /c "npm run test"` | **VERIFIED (73/73 pass)** |
| 0 ESLint errors/warnings on target files | `cmd.exe /c "npx eslint ..."` | **VERIFIED (0 errors, 0 warnings)** |
| 0 TypeScript errors | `cmd.exe /c "npx tsc -p tsconfig.json --noEmit"` | **VERIFIED (0 errors)** |
| Production build succeeds | `cmd.exe /c "npm run build"` | **VERIFIED (Next.js 16.2.10 build pass)** |
| History review crash fixed | Code inspection of `QuizInterface.tsx` + `QuizInterface.test.tsx` | **VERIFIED** |
| Score division by zero fixed | Code inspection of `QuizInterface.tsx:93-103` + boundary tests | **VERIFIED** |
| TXT file support in UI and API | Code inspection of `UploadConfig.tsx` and `route.ts` | **VERIFIED** |

---

## 6. Caveats

1. Live Gemini API execution was not invoked against a live billing key during automated test runs; API behavior is validated via mocking and schema verification.
2. Playwright E2E browser tests are part of the dual-track testing milestone (M-TEST) and are evaluated separately from unit/integration suites.

---

## 7. Conclusion & Actionable Next Steps

The worker has delivered an exceptionally high quality implementation with zero integrity violations, 100% unit/integration test pass rate, and full React 19 / Next.js App Router compliance.

However, because **Finding 1** causes previous user session history to be inadvertently contaminated and overwritten when starting a new quiz after viewing history, a short revision is required.

**Required Actions for Worker M1**:
1. In `src/app/page.tsx:handleBackToDashboard`, reset `setCurrentSessionId(null)` and `setCurrentRounds([])`.
2. In `src/app/page.tsx:handleGenerate`, ensure that when `!isAddingMore`, `currentSessionId` is unconditionally initialized to a new timestamp `Date.now().toString()` and `currentRounds` is reset to `[]`.
3. Re-run `npm run test` to confirm all 73 tests continue to pass.

---

## 8. Verification Method for Resubmission

Run the following commands:
```cmd
cmd.exe /c "npm run test"
cmd.exe /c "npx eslint src/components/QuizInterface.tsx src/app/page.tsx src/components/UploadConfig.tsx src/app/api/generate/route.ts src/lib/storage.ts src/types/index.ts"
cmd.exe /c "npx tsc -p tsconfig.json --noEmit"
```
Verify that:
1. Viewing history and clicking "Quay lại" sets `currentSessionId` to `null` and `currentRounds` to `[]`.
2. Generating a new quiz creates a fresh session ID rather than reusing the viewed historical session ID.
