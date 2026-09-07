# Handoff Report: Codebase Explorer 3 — Testing Setup, User Flows, Runtime Vulnerabilities & Test Infrastructure

## 1. Observation

### 1.1 Existing Test Setup & Package Manifest
- **File**: `d:\Quiz_Web\package.json`
  - Scripts:
    ```json
    "scripts": {
      "dev": "next dev",
      "build": "next build",
      "start": "next start",
      "lint": "eslint"
    }
    ```
  - Test dependencies: **0 test packages installed**. No `vitest`, `jest`, `@testing-library/react`, `playwright`, or `cypress` in `dependencies` or `devDependencies`.
  - Dependencies: `@google/genai: ^2.12.0`, `lucide-react: ^1.25.0`, `mammoth: ^1.12.0`, `motion: ^13.2.0`, `next: 16.2.10`, `react: 19.2.4`, `react-dom: 19.2.4`.
  - DevDependencies: `@types/node: ^20`, `@types/react: ^19`, `@types/react-dom: ^19`, `eslint: ^9`, `eslint-config-next: 16.2.10`, `typescript: ^5`.
- **Scratch Files**:
  - `d:\Quiz_Web\test.js` (lines 1-22): Ad-hoc manual node script testing `@google/genai` with `gemini-2.5-flash`.
  - `d:\Quiz_Web\list.js` (lines 1-11): Ad-hoc manual node script listing Gemini models.

### 1.2 Build & Lint Verification
- **Build Command**: `cmd /c npm run build` (Task ID `14ed6e60-8a6a-40c3-ad32-01c3bfe96925/task-28`)
  - Result: **Exit Code 0** (Success).
  - Next.js 16.2.10 (Turbopack) successfully compiled `/`, `/_not-found`, and dynamic route `/api/generate`.
- **Lint Command**: `cmd /c npm run lint` (Task ID `14ed6e60-8a6a-40c3-ad32-01c3bfe96925/task-35`)
  - Result: **Exit Code 1** (Failed with **22 problems: 13 errors, 9 warnings**).
  - Exact verbatim errors and warnings:
    1. `QuizInterface.tsx:40:7`: `react-hooks/set-state-in-effect` - Calling setState synchronously within an effect (`setIsFinished(true)` in `useEffect(..., [isReviewMode])`).
    2. `QuizInterface.tsx:48:5`: `react-hooks/set-state-in-effect` - Calling setState synchronously within an effect (`setCurrentIndex(0)`, `setIsFinished(false)`, `setShowReview(false)` in `useEffect(..., [questions])`).
    3. `ThemeProvider.tsx:19:5`: `react-hooks/set-state-in-effect` - Calling setState synchronously within an effect (`setMounted(true)` in `useEffect(..., [])`).
    4. `QuizInterface.tsx:322:15`: `jsx-a11y/role-supports-aria-props` - The attribute `aria-pressed` is not supported by the role `radio`.
    5. `route.ts:152:21` & `route.ts:191:40`: `@typescript-eslint/no-explicit-any` - Unexpected any.
    6. `page.tsx:67:17`: `@typescript-eslint/no-explicit-any` - Unexpected any.
    7. `list.js:1:25`, `test.js:1:1`, `test.js:2:25`: `@typescript-eslint/no-require-imports` - A `require()` style import is forbidden.
    8. `route.ts:40:9`, `QuizInterface.tsx:288:17, 289:17, 291:17`: `prefer-const` - Never reassigned.
    9. `ThemeProvider.tsx:16, 23, 44, 57`, `route.ts:69, 160, 169`, `page.tsx:70`: `@typescript-eslint/no-unused-vars`.

### 1.3 Exact Code Locations for End-to-End User Flows
- **Flow A (Landing / Dashboard -> Document Upload & Parsing)**:
  - `UploadConfig.tsx:23-29`: `ALLOWED_MIME_TYPES = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "image/png", "image/jpeg", "image/jpg"]`. (Note: TXT files `text/plain` are completely omitted).
  - `UploadConfig.tsx:163`: `<input accept=".pdf,.docx,.png,.jpg,.jpeg" />`.
  - `route.ts:51-74`: Backend file handling loops over `files`: accepts only `application/pdf`, `image/*`, and docx `application/vnd.openxmlformats-officedocument.wordprocessingml.document`. Rejects all others with 400.
  - `route.ts:56-64`: Buffers are base64 encoded into memory parts for Gemini.
- **Flow B (Quiz Configuration)**:
  - `UploadConfig.tsx:38, 199-240`: Configurable fields are only: `model` (gemini-2.5-flash / gemini-2.5-flash-lite), `numQuestions` (1-50), and `scope` (freeform textarea, max 1000 chars).
  - Missing configurations: No mode selector (Practice vs Exam), no timer countdown configuration, no topic/category picker, no question/option shuffling option.
- **Flow C (Active Quiz Taking)**:
  - `QuizInterface.tsx:62-81`: State manages `currentIndex`, `userAnswers`.
  - When option clicked (`handleSelectOption`), `userAnswers` is updated, locking question immediately (`disabled={hasAnsweredCurrent}`), revealing correct answer and explanation immediately.
  - `QuizInterface.tsx:75-81`: `handleNext()` only increments `currentIndex` forward. There is NO "Previous question" button.
  - Missing features: No backward navigation, no question drawer/grid (1..N), no bookmark/flagging, no countdown timer, no keyboard shortcuts (1-4, A-D, Space, Enter).
- **Flow D (Quiz Submission & Evaluation)**:
  - `QuizInterface.tsx:83-96`: When last question answered and `handleNext()` calls `setIsFinished(true)`, displays round score percentage `scorePercent = Math.round((correctCount / questions.length) * 100)`.
  - `QuizInterface.tsx:56-60`: `useEffect` fires `onFinishRound(userAnswers)`.
  - `page.tsx:103-133`: `handleFinishRound` aggregates into `currentRounds` and updates `sessions` state.
  - `QuizInterface.tsx:168-249`: "Xem lại đáp án" displays questions with green/red borders, user choices, explanations, and `window.print()` trigger.
- **Flow E (History & Persistence)**:
  - `UploadConfig.tsx:272-302`: Renders history cards if `sessions.length > 0`.
  - `page.tsx:145-150`:
    ```tsx
    const handleViewHistory = (session: QuizSession) => {
      setCurrentSessionId(session.id);
      setCurrentRounds(session.rounds);
      setIsReviewMode(true);
      setQuestions(null);
    };
    ```
  - `page.tsx:171-182`: Passes `questions={isReviewMode ? [] : (questions || [])}` and `isReviewMode={true}` to `QuizInterface`.
  - `QuizInterface.tsx:46-53`:
    ```tsx
    // Reset lock when questions change (new round)
    useEffect(() => {
      hasFinishedRef.current = false;
      setCurrentIndex(0);
      setUserAnswers({});
      setIsFinished(false);
      setShowReview(false);
      setShowAddQuestions(false);
    }, [questions]);
    ```
  - `QuizInterface.tsx:254`:
    ```tsx
    if (!currentQuestion) return null;
    ```
  - `QuizInterface.tsx:62`:
    ```tsx
    const currentQuestion = questions && questions.length > 0 ? questions[currentIndex] : null;
    ```
  - Zero storage persistence: No `localStorage` or `IndexedDB` calls for `sessions` in `page.tsx`.

---

## 2. Logic Chain

### 2.1 The "Xem lại lịch sử" (History Review) Crash / Blank Screen Bug
1. **Premise 1**: When the user clicks a past session in `UploadConfig`, `handleViewHistory(session)` sets `isReviewMode(true)` and `questions` to `null`.
2. **Premise 2**: In `page.tsx:173`, `QuizInterface` is rendered with `questions={isReviewMode ? [] : (questions || [])}`. Because `isReviewMode` is true, an empty array `[]` is passed as the `questions` prop.
3. **Premise 3**: In `QuizInterface.tsx:28-32`, the component initializes `isFinished` and `showReview` using `useState(isReviewMode)`, which initially evaluates to `true`.
4. **Premise 4**: In React, on component mount, all `useEffect` hooks run after the initial render. Effect 2 (`QuizInterface.tsx:46-53`) watches `[questions]`. It has **no guard** for `isReviewMode`.
5. **Premise 5**: On mount, Effect 2 triggers unconditionally and executes:
   ```ts
   setIsFinished(false);
   setShowReview(false);
   ```
6. **Premise 6**: This triggers an immediate second render where `isFinished === false` and `showReview === false`.
7. **Premise 7**: At line 83, `if (isFinished)` evaluates to `false`. Execution proceeds to line 254:
   ```ts
   if (!currentQuestion) return null;
   ```
8. **Premise 8**: Since `questions` is `[]`, `currentQuestion` is `null`. The component returns `null`.
9. **Conclusion**: The history review UI is wiped off the DOM immediately after mounting, leaving the user with a completely empty/blank page. To the user, this appears as an instantaneous crash/freeze. Furthermore, if `session.rounds` or `round.questions` is empty or missing, lines `UploadConfig.tsx:294` (`session.rounds.reduce(...)`) and `QuizInterface.tsx:191` (`round.questions.map(...)`) throw unhandled `TypeErrors`.

### 2.2 Lack of Data Persistence
1. **Premise 1**: `sessions` state is declared strictly in `page.tsx:13` via `useState<QuizSession[]>([])`.
2. **Premise 2**: Grep search across `src/` shows `localStorage` is referenced exclusively in `ThemeProvider.tsx` for color theme.
3. **Conclusion**: Any page reload (`F5`), browser navigation, or tab closure completely destroys all quiz sessions, rounds, questions, and scores.

### 2.3 File Parsing & TXT Support Gap
1. **Premise 1**: Requirements explicitly request document upload & parsing for `(PDF, TXT, DOCX, etc.)`.
2. **Premise 2**: Both client (`UploadConfig.tsx:23-29`) and server (`route.ts:57-74`) explicitly validate against `ALLOWED_MIME_TYPES` and `file.type`. Neither includes `text/plain` or `.txt`.
3. **Conclusion**: Uploading any plain text file (`.txt`) immediately fails with error `"Định dạng không hỗ trợ"`.

### 2.4 Mobile/Responsive Breakage
1. **Premise 1**: `UploadConfig.tsx:127` uses inline style `gridTemplateColumns: '1fr 1fr'`.
2. **Premise 2**: `globals.css` does not provide a responsive override class or media query for this inline style.
3. **Conclusion**: On mobile screens (<600px/768px), the 2-column grid does not collapse into 1 column, causing severe horizontal squishing, unreadable text, and layout clipping.

### 2.5 Runtime Error Vectors & Type Safety Loopholes
1. **Unchecked FormData Entry**: In `route.ts:22`, `formData.getAll("files") as File[]` unsafely asserts entry types without validating `entry instanceof File`. If strings are posted, `file.arrayBuffer()` throws.
2. **Unvalidated JSON Parse from LLM**: In `route.ts:152-173`, `parsedData` is typed as `any`. While a basic loop checks for `q.text`, `q.options.map((opt: any) => ({ label: String(opt.label), text: String(opt.text) }))` assumes `opt` is an object. If the LLM generates `options` as an array of strings `["A. ...", "B. ..."]`, `opt.label` is `undefined`, outputting `"undefined"` strings without throwing or recovering.
3. **Missing Zod Schema**: Neither incoming request payloads nor Gemini API responses are validated using runtime schema libraries (Zod/Valibot).
4. **Generating More Questions in History Mode**: In `QuizInterface.tsx`, clicking "Tạo thêm câu hỏi mới" invokes `onGenerateMore(newNumQuestions)`. In `page.tsx:33`, `handleGenerate` checks `if (files.length === 0) { setError("Vui lòng tải lên tài liệu."); return; }`. Because `files` is not preserved in history sessions, generating additional questions from a past session always triggers this error.

---

## 3. Caveats
1. **Gemini Live API Key Dependency**: Live calls to `/api/generate` depend on a valid Google Gemini API key configured in `.env.local`. E2E and integration tests must mock the `/api/generate` network layer to remain deterministic and offline-capable.
2. **Next.js 16 / React 19 Turbopack Ecosystem**: In Next.js 16, Turbopack is the default bundler for development and build. ESLint is executed separately (`npm run lint`), not bundled inside `next build`.
3. **Source Code Write Permission**: As an explorer survey agent, no changes have been committed to source code during this phase.

---

## 4. Conclusion

The application has a strong architectural foundation (Next.js 16 App Router, React 19, TypeScript, modern CSS variables, and Google GenAI SDK integration), but currently lacks essential production fortifications:

1. **Zero Test Automation**: No unit, integration, or E2E tests exist.
2. **13 Lint Errors & React 19 Violations**: ESLint currently fails due to synchronous `setState` calls inside `useEffect`, unescaped `any` types, and root script `require()` imports.
3. **Critical History Review Bug Confirmed**: Clicking past sessions in history mounts `QuizInterface` in review mode, but Effect 2 resets `isFinished` to `false`, rendering `null` and blanking the screen.
4. **Missing Features & Gaps**:
   - Lack of TXT file support (`text/plain`).
   - No session persistence in `localStorage`.
   - Missing quiz features: no backward navigation, no question drawer, no countdown timer, no flagging, no keyboard shortcuts.
   - Mobile layout clipping due to inline `1fr 1fr` grid.

### Comprehensive Bug & Issue Summary Matrix

| ID | Location | Category | Severity | Description |
|---|---|---|---|---|
| **BUG-01** | `QuizInterface.tsx:46-53, 254` | React State / Logic | **Critical** | History review causes blank screen / crash because `useEffect([questions])` resets `isFinished(false)` when `questions=[]`. |
| **BUG-02** | `page.tsx:13` | Data Persistence | **High** | All quiz sessions and history are lost upon page refresh (`F5`). |
| **BUG-03** | `UploadConfig.tsx:23-29`, `route.ts:57-74` | Feature Completeness | **Medium** | TXT files (`.txt`, `text/plain`) are not accepted or parsed. |
| **BUG-04** | `UploadConfig.tsx:127` | UI / Responsive | **Medium** | Inline `1fr 1fr` grid does not collapse on mobile screens (<600px). |
| **BUG-05** | `QuizInterface.tsx:40, 48`, `ThemeProvider.tsx:19` | React 19 Lint | **High** | Synchronous `setState` in `useEffect` violates React 19 rules (`react-hooks/set-state-in-effect`). |
| **BUG-06** | `route.ts:152, 191`, `page.tsx:67` | Type Safety | **Medium** | `any` types and lack of Zod schema validation for AI JSON output. |
| **BUG-07** | `QuizInterface.tsx:322` | Accessibility | **Low** | `aria-pressed` used on `role="radio"` instead of `aria-checked`. |
| **BUG-08** | `QuizInterface.tsx:75-81` | UX / Navigation | **Medium** | No backward navigation ("Quay lại câu trước") during active quiz taking. |
| **BUG-09** | `QuizInterface.tsx` | UX / Productivity | **Medium** | No countdown timer, question map drawer, question flagging, or keyboard shortcuts. |
| **BUG-10** | `route.ts:56`, `page.tsx:33` | Edge Case | **Medium** | Generating more questions from history review fails because binary `File` objects are lost. |

---

## 5. Recommended Testing Infrastructure

To establish a production-grade, opaque-box testing suite for Next.js 16 and React 19:

### 5.1 Unit & Integration Testing Layer: Vitest + React Testing Library
In accordance with official Next.js App Router guidelines (`node_modules/next/dist/docs/01-app/02-guides/testing/vitest.md`):

1. **Packages to Install**:
   ```bash
   npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom @testing-library/jest-dom vite-tsconfig-paths
   ```
2. **Configuration File (`vitest.config.mts`)**:
   ```ts
   import { defineConfig } from 'vitest/config';
   import react from '@vitejs/plugin-react';
   import tsconfigPaths from 'vite-tsconfig-paths';

   export default defineConfig({
     plugins: [tsconfigPaths(), react()],
     test: {
       environment: 'jsdom',
       globals: true,
       setupFiles: ['./src/test/setup.ts'],
       include: ['src/**/*.test.{ts,tsx}'],
       coverage: {
         provider: 'v8',
         reporter: ['text', 'json', 'html'],
       },
     },
   });
   ```
3. **Setup File (`src/test/setup.ts`)**:
   - Import `@testing-library/jest-dom/vitest`.
   - Polyfill `window.matchMedia`, `crypto.randomUUID`, and `ResizeObserver`.
4. **Test Targets**:
   - `src/components/__tests__/UploadConfig.test.tsx`: Validation rules (max 5 files, 10MB limit, duplicate files, TXT/PDF/DOCX/image acceptance).
   - `src/components/__tests__/QuizInterface.test.tsx`: Answering questions, calculating score, review mode rendering, history rounds rendering without crash.
   - `src/components/__tests__/ThemeProvider.test.tsx`: Theme toggle, localStorage persistence.
   - `src/app/api/generate/__tests__/route.test.ts`: Multipart form parsing, fallback parsing, 400/500 error responses.

### 5.2 End-to-End (E2E) Testing Layer: Playwright
In accordance with official Next.js E2E guidelines (`node_modules/next/dist/docs/01-app/02-guides/testing/playwright.md`):

1. **Packages to Install**:
   ```bash
   npm install -D @playwright/test
   npx playwright install --with-deps chromium
   ```
2. **Configuration File (`playwright.config.ts`)**:
   ```ts
   import { defineConfig, devices } from '@playwright/test';

   export default defineConfig({
     testDir: './e2e',
     fullyParallel: true,
     forbidOnly: !!process.env.CI,
     retries: process.env.CI ? 2 : 0,
     workers: process.env.CI ? 1 : undefined,
     reporter: 'html',
     use: {
       baseURL: 'http://localhost:3000',
       trace: 'on-first-retry',
     },
     projects: [
       {
         name: 'chromium',
         use: { ...devices['Desktop Chrome'] },
       },
       {
         name: 'Mobile Chrome',
         use: { ...devices['Pixel 5'] },
       },
     ],
     webServer: {
       command: 'npm run dev',
       url: 'http://localhost:3000',
       reuseExistingServer: !process.env.CI,
     },
   });
   ```
3. **Opaque-Box E2E Test Suites (`e2e/quiz-app.spec.ts`)**:
   - **Test 1 (Flow A - Upload & Validation)**: Attempt to upload 6 files -> verify error toast/message; upload valid PDF/TXT -> verify file chips rendered.
   - **Test 2 (Flow B - Config & Generation)**: Intercept `/api/generate` with mocked quiz data -> click "Bắt đầu tạo câu hỏi" -> verify loading spinner and transition to quiz.
   - **Test 3 (Flow C - Active Quiz Taking)**: Answer questions, verify immediate feedback, progress bar increment, explanation visibility, and progression to completion.
   - **Test 4 (Flow D - Evaluation & Review)**: Verify final score calculation, open review section, verify each question and answer breakdown.
   - **Test 5 (Flow E - History & No-Crash Review)**: Return to dashboard, verify session card in "Lịch sử học tập phiên này", click "Xem lại lịch sử", assert that the review screen displays correctly with all rounds and DOES NOT collapse/crash. Verify localStorage persistence after reload.

---

## 6. Verification Method

To independently verify all findings in this report:

1. **Verify Existing Tests & Runners**:
   - Inspect `d:\Quiz_Web\package.json`: Confirm no test scripts or test dependencies exist.
2. **Verify Build**:
   - Run: `cmd /c npm run build`
   - Confirm it builds cleanly (Exit code 0).
3. **Verify Lint Errors**:
   - Run: `cmd /c npm run lint`
   - Confirm it fails with 13 errors and 9 warnings, specifically flagging `QuizInterface.tsx:40, 48` (`react-hooks/set-state-in-effect`), `ThemeProvider.tsx:19`, `test.js`, and `list.js`.
4. **Verify History Review Blank Screen Bug**:
   - Open `QuizInterface.tsx:46-53`. Trace the effect dependencies: `[questions]`. When `isReviewMode=true` and `questions=[]`, notice `setIsFinished(false)` is invoked synchronously after mount, triggering line 254 `if (!currentQuestion) return null;`.
5. **Verify TXT Upload Rejection**:
   - Inspect `UploadConfig.tsx:23-29`: Notice `text/plain` is absent from `ALLOWED_MIME_TYPES`.
6. **Verify Responsive Layout**:
   - Inspect `UploadConfig.tsx:127`: Notice hardcoded `style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', flex: 1 }}` without media query breakpoint.
