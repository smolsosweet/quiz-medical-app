# Handoff Report: Codebase Survey & History Crash Root Cause Investigation

## Executive Summary
This investigation analyzed the Quiz Medical App codebase (`d:\Quiz_Web`), its Next.js 16 App Router architecture, dependencies, build status, state management patterns, and diagnosed the root cause of the "Xem lại lịch sử" (View History) crash and UI disappearance.

The primary defect is a **React Hook state race/clobber condition in `src/components/QuizInterface.tsx` (lines 46–53)**: when a user clicks "Xem lại lịch sử", `QuizInterface` mounts with `isReviewMode={true}` and `questions={[]}`. Although `isFinished` and `showReview` are initialized to `true`, the `useEffect(..., [questions])` hook unconditionally fires on mount and clobbers `isFinished` and `showReview` back to `false`. Because `questions` is empty, `currentQuestion` evaluates to `null`, and `QuizInterface` executes `if (!currentQuestion) return null;`, causing the component to render **`null`** (a blank, unrecoverable screen).

Additionally, five secondary vulnerabilities were identified:
1. **Total lack of persistent storage**: Quiz history is stored solely in volatile React component state (`sessions: QuizSession[]` in `page.tsx`). Page reloads erase all history.
2. **Missing defensive guards against undefined properties**: Unchecked `.map()` calls on `round.questions` and `q.options` will trigger fatal `TypeError` crashes if any stored session contains malformed data.
3. **Broken Print to PDF feature**: In `src/app/globals.css`, the print selector `.main-container > :not(#review-section) { display: none !important; }` hides `.glass-panel` (the parent of `#review-section`), resulting in completely blank print pages.
4. **Destructive Back-Navigation UX**: Exiting review mode calls `onNewFile()`, which clears all uploaded files and user inputs.
5. **Mobile Grid Clipping**: In `UploadConfig.tsx`, a static 2-column grid (`gridTemplateColumns: '1fr 1fr'`) squashes inputs on mobile viewports (<768px).

---

## 1. Observation

### 1.1 Environment, Architecture & Build Status
- **Framework**: Next.js `16.2.10` using the **App Router** (`src/app/layout.tsx`, `src/app/page.tsx`, `src/app/api/generate/route.ts`).
- **React Version**: React `19.2.4` and React DOM `19.2.4`.
- **TypeScript**: TypeScript `^5`, configured with `moduleResolution: "bundler"`, `strict: true`, path alias `@/*` -> `./src/*`.
- **Key Dependencies**:
  - `@google/genai: ^2.12.0`
  - `mammoth: ^1.12.0`
  - `motion: ^13.2.0`
  - `lucide-react: ^1.25.0`
- **Build Verification**:
  Command executed: `cmd.exe /c "npm run build"`
  Output:
  ```
  ▲ Next.js 16.2.10 (Turbopack)
  - Environments: .env.local
  Creating an optimized production build ...
  ✓ Compiled successfully in 3.2s
  Finished TypeScript in 3.2s ...
  Collecting page data using 6 workers ...
  Generating static pages using 6 workers (5/5) in 712ms
  Finalizing page optimization ...
  Route (app)
  ┌ ○ /
  ├ ○ /_not-found
  └ ƒ /api/generate
  ```
  Status: **Exit code 0, no compile-time TypeScript errors or warnings.**

---

### 1.2 History Lifecycle & Source Locations

#### A. Session Data Structures (`src/types/index.ts:16–28`)
```typescript
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
```

#### B. Session Creation (`src/app/page.tsx:103–133`)
Quiz sessions are **only** updated when a user finishes all questions in a round:
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

      // Cập nhật session lịch sử ngay lập tức
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
*Observation*: `sessions` is strictly kept in memory (`useState<QuizSession[]>([])` at `page.tsx:13`). Grep searches for `localStorage`, `sessionStorage`, and `indexedDB` confirm there is **zero persistence** for quiz sessions.

#### C. Triggering History View (`src/components/UploadConfig.tsx:280–299`)
In `UploadConfig.tsx`:
```tsx
{sessions.map((session) => (
  <div 
    key={session.id} 
    onClick={() => onViewHistory && onViewHistory(session)}
    className="quiz-option"
    ...
  >
    <div>
      <h4>{session.title} {session.filesCount > 1 ? `(+${session.filesCount - 1} tệp)` : ''}</h4>
      <p>
        {session.date} • {session.rounds.length} lượt tạo • Tổng {session.rounds.reduce((acc, r) => acc + r.questions.length, 0)} câu
      </p>
    </div>
    <ChevronRight color="var(--text-muted)" />
  </div>
))}
```

#### D. History View Handler & Conditional Render (`src/app/page.tsx:145–182`)
```tsx
  const handleViewHistory = (session: QuizSession) => {
    setCurrentSessionId(session.id);
    setCurrentRounds(session.rounds);
    setIsReviewMode(true);
    setQuestions(null); // Mở mode Review
  };

  return (
    <>
      <Header />
      <main className="main-container">
        {!questions && !isReviewMode ? (
          <UploadConfig ... />
        ) : (
          <QuizInterface 
            key={isReviewMode ? `review-${currentSessionId}` : quizId}
            questions={isReviewMode ? [] : (questions || [])} 
            isReviewMode={isReviewMode}
            historyRounds={currentRounds}
            onGenerateMore={(numQ) => handleGenerate(numQ, true)}
            onFinishRound={handleFinishRound}
            isGenerating={isGenerating}
            error={error}
            onNewFile={handleNewFile}
          />
        )}
      </main>
    </>
  );
```
Notice:
1. `questions` is passed as `[]` (`questions={isReviewMode ? [] : (questions || [])}`).
2. `key` changes to `review-${currentSessionId}`, forcing `QuizInterface` to unmount and mount a fresh instance.

---

### 1.3 The Exact Crash/Disappearance Site (`src/components/QuizInterface.tsx:28–62, 254`)
```tsx
export default function QuizInterface({ 
  questions, 
  isReviewMode = false, 
  historyRounds = [], 
  ...
}: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, AnswerLabel>>({});
  const [isFinished, setIsFinished] = useState(isReviewMode);
  const [showReview, setShowReview] = useState(isReviewMode);
  const hasFinishedRef = useRef(false);

  // Hook 1: Sync state when entering review mode from history
  useEffect(() => {
    if (isReviewMode) {
      setIsFinished(true);
      setShowReview(true);
    }
  }, [isReviewMode]);

  // Hook 2: Reset lock when questions change (new round)
  useEffect(() => {
    hasFinishedRef.current = false;
    setCurrentIndex(0);
    setUserAnswers({});
    setIsFinished(false);
    setShowReview(false);
    setShowAddQuestions(false);
  }, [questions]);
  ...
  const currentQuestion = questions && questions.length > 0 ? questions[currentIndex] : null;
  ...
  if (isFinished) {
    ...
    return <div className="glass-panel ...">{/* Review UI */}</div>;
  }

  if (!currentQuestion) return null; // <--- LINE 254
```

---

## 2. Logic Chain

### 2.1 Trace from Click to Disappearance (Blank Screen Bug)
1. **User Action**: The user clicks on a session card in the "Lịch sử học tập phiên này" list (`UploadConfig.tsx:282`).
2. **State Transition in `page.tsx`**:
   - `handleViewHistory(session)` executes.
   - `setCurrentSessionId(session.id)`
   - `setCurrentRounds(session.rounds)`
   - `setIsReviewMode(true)`
   - `setQuestions(null)`
3. **Parent Re-render**:
   - `page.tsx` enters the ternary branch `isReviewMode === true`.
   - Prop `questions` is explicitly set to `[]`.
   - Prop `isReviewMode` is `true`.
   - Prop `historyRounds` is `session.rounds`.
   - Prop `key` is `review-${session.id}`.
4. **`QuizInterface` Mount**:
   - A new instance of `QuizInterface` mounts.
   - Initial state: `isFinished` = `true`, `showReview` = `true` (from `useState(isReviewMode)`).
   - Render 1 executes: `if (isFinished)` evaluates to `true`; `showReview` is `true`; it renders `<div id="review-section">`.
5. **Passive Effects Run (Mount Phase)**:
   - React processes `useEffect` hooks in declaration order.
   - **Hook 1 (`[isReviewMode]`)**: Sees `isReviewMode === true`, calls `setIsFinished(true)`, `setShowReview(true)`.
   - **Hook 2 (`[questions]`)**: In React, **all `useEffect` hooks run on initial mount**, regardless of dependencies. Hook 2 does not check `if (isReviewMode) return;` or `if (questions.length === 0) return;`.
   - Hook 2 immediately calls:
     ```javascript
     setIsFinished(false);
     setShowReview(false);
     ```
   - This state update **overwrites** Hook 1 and queues a re-render.
6. **Re-render 2**:
   - In Render 2, `isFinished` is now `false` and `showReview` is `false`.
   - Line 62: `const currentQuestion = questions && questions.length > 0 ? questions[currentIndex] : null;`. Since `questions` is `[]`, `currentQuestion` evaluates to `null`.
   - Line 83: `if (isFinished)` evaluates to `false` (skipped).
   - Line 254: `if (!currentQuestion) return null;` evaluates to `true`.
   - **`QuizInterface` returns `null`**.
7. **End Result**: The entire main view collapses into an empty DOM node (`<main class="main-container"></main>`). The user sees a blank screen with no interactive elements, no back button, and no error message.

### 2.2 Proof of Concept Simulation
The simulation script `d:\Quiz_Web\.agents\explorer_survey_1\test_simulation.js` was executed with Node.js:
- **Input**: `props: { questions: [], isReviewMode: true, historyRounds: [...] }`
- **Render 1**: Displays `#review-section`.
- **Mount Effects**: Effect 1 sets `isFinished = true, showReview = true`; Effect 2 executes immediately and sets `isFinished = false, showReview = false`.
- **Render 2**: `currentQuestion === null` and `isFinished === false` -> **Returns `null`**.
This matches 100% of the reported symptom.

---

### 2.3 Additional Failure Modes

#### Failure Mode A: Missing Defensive Checks in History Review (`QuizInterface.tsx:186–232`)
```tsx
{historyRounds.map((round) => (
  ...
  {round.questions.map((q, idx) => {
    ...
    {q.options.map((opt) => {
```
If a stored session contains an entry where `round.questions` is undefined or null, or where `q.options` is not an array (e.g. partial session, corrupted data, or older schema), the application throws an unhandled `TypeError: Cannot read properties of undefined (reading 'map')`. Without a React Error Boundary, this causes a complete unmount of the React root.

#### Failure Mode B: Broken Print Styles (`src/app/globals.css:249`)
```css
.no-print, header, .main-container > :not(#review-section) {
  display: none !important;
}
```
Inside `.main-container`, the direct child is `div.glass-panel`. `#review-section` is a child of `div.glass-panel`, not of `.main-container`. Because `.glass-panel` does not match `#review-section`, the selector `.main-container > :not(#review-section)` matches `.glass-panel` and applies `display: none !important`. Consequently, printing produces an empty, blank page.

#### Failure Mode C: Destructive Back Navigation (`QuizInterface.tsx:175–181`)
```tsx
<button className="btn-secondary" onClick={() => {
  if (isReviewMode) {
    onNewFile();
  } else {
    setShowReview(false);
  }
}}>Quay lại</button>
```
When a user finishes reviewing history and clicks "Quay lại", `onNewFile()` is invoked:
```tsx
  const handleNewFile = () => {
    setQuestions(null);
    setFiles([]); // <--- Wipes user's staged files!
    setPreviousQuestionsText("");
    setCurrentSessionId(null);
    setCurrentRounds([]);
    setIsReviewMode(false);
    setError("");
  };
```
If the user had uploaded documents in the current session, navigating into history and back destroys their uploaded file list.

#### Failure Mode D: Lack of Persistent Storage
Because `sessions` is never synced with `localStorage`, any browser reload, crash, or tab navigation permanently deletes all quiz history.

---

## 3. Caveats
- **Gemini API Network Boundary**: This investigation focused on client-side state, history storage, and UI lifecycle. The external Gemini API endpoints require an active `GEMINI_API_KEY` in `.env.local` to generate live questions.
- **Node.js Environment**: Windows PowerShell execution policy blocks `.ps1` execution, so CLI tools should be invoked via `cmd.exe /c` (e.g. `cmd.exe /c "npm run build"`).
- **Read-Only Scope**: In compliance with the Teamwork Explorer archetype, no source files under `src/` were edited during this survey. All proposed changes are detailed as drop-in implementations below.

---

## 4. Conclusion & Actionable Recommendations

### Recommendation 1: Decouple Review Mode from Live Quiz State in `QuizInterface.tsx`
Eliminate the conflicting `useEffect` hooks. Instead of relying on `useEffect` to synchronize `isReviewMode` into `isFinished`, treat `isReviewMode` as a first-class declarative rendering branch, or guard Hook 2 against running in review mode:

```tsx
// In QuizInterface.tsx:
// 1. Guard Hook 2
useEffect(() => {
  if (isReviewMode) return; // Do not reset state when in review mode!
  hasFinishedRef.current = false;
  setCurrentIndex(0);
  setUserAnswers({});
  setIsFinished(false);
  setShowReview(false);
  setShowAddQuestions(false);
}, [questions, isReviewMode]);

// 2. Declaratively render review section if isReviewMode is true
if (isReviewMode || (isFinished && showReview)) {
  return (
    <div className="glass-panel animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
      <div id="review-section">
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2>{isReviewMode ? "Lịch sử bài làm" : "Xem lại bài làm"}</h2>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn-primary" onClick={() => window.print()} title="In trang này ra PDF">
              <Printer size={20} /> In PDF
            </button>
            <button className="btn-secondary" onClick={isReviewMode ? onBackFromHistory : () => setShowReview(false)}>
              Quay lại
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
          {Array.isArray(historyRounds) && historyRounds.length > 0 ? (
            historyRounds.map((round) => (
              <div key={round.id || Math.random()} style={{ border: '1px solid var(--border-color)', padding: '1.5rem', borderRadius: '12px', backgroundColor: 'var(--surface-color)' }}>
                <h3 style={{ marginBottom: '1.5rem', color: 'var(--primary-color)', borderBottom: '2px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                  {round.id}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                  {(round.questions || []).map((q, idx) => {
                    const uAns = round.userAnswers?.[q.id];
                    const isQCorrect = uAns === q.correctAnswer;
                    return (
                      <div key={q.id || idx} className="animate-fade-in">
                        <h4 style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '1rem' }}>
                          <span style={{ color: isQCorrect ? 'var(--success-color)' : 'var(--error-color)', marginTop: '2px' }} aria-hidden="true">
                            {isQCorrect ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
                          </span>
                          <span>Câu {idx + 1}: {q.text}</span>
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginLeft: '2rem' }}>
                          {(q.options || []).map((opt) => {
                            let bgColor = 'transparent';
                            let borderColor = 'var(--border-color)';
                            if (opt.label === q.correctAnswer) {
                              bgColor = 'var(--success-bg)';
                              borderColor = 'var(--success-color)';
                            } else if (opt.label === uAns && !isQCorrect) {
                              bgColor = 'var(--error-bg)';
                              borderColor = 'var(--error-color)';
                            }
                            return (
                              <div key={opt.label} style={{ padding: '0.75rem 1rem', borderRadius: '8px', border: `1px solid ${borderColor}`, backgroundColor: bgColor, display: 'flex', gap: '0.75rem' }}>
                                <strong>{opt.label}.</strong> {opt.text}
                              </div>
                            );
                          })}
                        </div>
                        {q.explanation && (
                          <div style={{ marginTop: '1rem', marginLeft: '2rem', padding: '1rem', backgroundColor: 'var(--surface-glass)', borderRadius: '8px', borderLeft: '4px solid var(--primary-color)' }}>
                            <strong>Giải thích:</strong> {q.explanation}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            <p>Không có dữ liệu đánh giá.</p>
          )}
        </div>
      </div>
    </div>
  );
}
```

### Recommendation 2: Implement Persistent Storage for History (`localStorage`)
In `src/app/page.tsx`:
1. Initialize `sessions` from `localStorage` safely after mount to prevent SSR hydration mismatch:
   ```typescript
   const STORAGE_KEY = "mediquiz_sessions_v1";

   useEffect(() => {
     try {
       const saved = localStorage.getItem(STORAGE_KEY);
       if (saved) {
         const parsed = JSON.parse(saved);
         if (Array.isArray(parsed)) {
           setSessions(parsed);
         }
       }
     } catch (e) {
       console.warn("Failed to load quiz sessions from localStorage", e);
     }
   }, []);
   ```
2. Persist `sessions` to `localStorage` on change:
   ```typescript
   useEffect(() => {
     try {
       if (sessions.length > 0) {
         localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.slice(0, 20))); // Keep last 20 sessions
       }
     } catch (e) {
       console.warn("Failed to save quiz sessions to localStorage", e);
     }
   }, [sessions]);
   ```

### Recommendation 3: Add Dedicated Non-Destructive `onBackFromHistory` Handler
In `src/app/page.tsx`:
```typescript
  const handleExitReview = () => {
    setIsReviewMode(false);
    // Keep files and currentSessionId intact so the user can continue where they left off
  };
```
Pass `onBackFromHistory={handleExitReview}` to `QuizInterface`.

### Recommendation 4: Fix Print CSS in `src/app/globals.css`
Replace:
```css
.no-print, header, .main-container > :not(#review-section) {
  display: none !important;
}
```
With:
```css
@media print {
  @page {
    margin: 1.5cm;
  }
  body {
    background: white !important;
    color: black !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    height: auto !important;
    overflow: visible !important;
  }
  header, .no-print {
    display: none !important;
  }
  .main-container {
    padding: 0 !important;
    margin: 0 !important;
    max-width: 100% !important;
    overflow: visible !important;
    display: block !important;
  }
  .glass-panel {
    border: none !important;
    box-shadow: none !important;
    padding: 0 !important;
    background: transparent !important;
  }
  #review-section {
    display: block !important;
    visibility: visible !important;
  }
}
```

### Recommendation 5: Fix Responsive Grid in `UploadConfig.tsx`
Change the inline grid style in `UploadConfig.tsx:127`:
```tsx
<div className="upload-config-grid" style={{ display: 'grid', gap: '2rem', flex: 1 }}>
```
And add in `globals.css`:
```css
.upload-config-grid {
  grid-template-columns: 1fr 1fr;
}
@media (max-width: 768px) {
  .upload-config-grid {
    grid-template-columns: 1fr;
  }
}
```

---

## 5. Verification Method

### 5.1 Verification Script (Included in Agent Directory)
Run:
```cmd
cmd.exe /c "node d:\Quiz_Web\.agents\explorer_survey_1\test_simulation.js"
```
Verify that Render 2 reproduces the blank screen condition.

### 5.2 Build Verification
Run:
```cmd
cmd.exe /c "npm run build"
```
Verify exit code 0 and zero TypeErrors.

### 5.3 Manual Verification Steps After Implementation
1. Start the dev server: `cmd.exe /c "npm run dev"`.
2. Open `http://localhost:3000`.
3. Upload a sample document or generate 1 question.
4. Complete the question to finish Round 1.
5. Click "Tải tài liệu khác" to return to the home screen.
6. Verify "Lịch sử học tập phiên này" lists the finished session.
7. Click the session card to trigger "Xem lại lịch sử".
8. **Verify**:
   - The Review screen renders immediately with all questions, user answers, correct answers, and explanations.
   - The screen does NOT turn white or blank.
   - Clicking "In PDF" opens the print dialog with content fully visible.
   - Clicking "Quay lại" returns to the dashboard without wiping uploaded files or throwing errors.
   - Refreshing the browser page preserves the session in "Lịch sử học tập phiên này".
