# UI/UX Architecture & Layout Resilience Audit Report

**Investigator**: Codebase Explorer 2  
**Date**: 2026-09-06T18:22:00Z  
**Target Project**: Medical Quiz AI (Next.js 16.2.10, React 19.2.4, Turbopack)  
**Status**: Completed  

---

## 1. Observation

### 1.1 Architecture & Body Overflow Lock
- **File**: `src/app/globals.css` (lines 51–64, 165–174)
```css
body {
  font-family: var(--font-inter), sans-serif;
  background-color: var(--bg-color);
  color: var(--text-color);
  transition: background-color 0.5s ease, color 0.5s ease;
  height: 100dvh;
  overflow: hidden; /* Cấm cuộn trang ngoài cùng */
  display: flex;
  flex-direction: column;
  background-image: 
    radial-gradient(at 0% 0%, rgba(59, 130, 246, 0.15) 0px, transparent 50%),
    radial-gradient(at 100% 100%, rgba(139, 92, 246, 0.15) 0px, transparent 50%);
  background-attachment: fixed;
}
...
.main-container {
  max-width: 1000px; /* Tăng độ rộng để chứa 2 cột */
  margin: 0 auto;
  padding: 2rem;
  width: 100%;
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto; /* Cuộn bên trong container */
}
```
- **File**: `src/app/page.tsx` (lines 153–155)
```tsx
return (
  <>
    <Header />
    <main className="main-container">
```
- **File**: `src/components/Header.tsx` (lines 10–21)
```tsx
<header style={{ 
  display: 'flex', 
  justifyContent: 'space-between', 
  alignItems: 'center', 
  padding: '1.5rem 2rem',
  borderBottom: '1px solid var(--border-color)',
  backgroundColor: 'var(--surface-glass)',
  backdropFilter: 'blur(12px)',
  position: 'sticky',
  top: 0,
  zIndex: 10,
}}>
```
- **Observed Behavior**:
  - `body` is locked with `height: 100dvh; overflow: hidden;`.
  - `Header` and `main.main-container` are vertical flex siblings inside `body`.
  - Content scrolls entirely inside `.main-container`, which sits below `Header`. As a consequence, nothing ever scrolls behind `Header`, rendering `backdropFilter: 'blur(12px)'` completely non-functional.
  - The browser window scrollbar is trapped inside `.main-container`, floating at `calc(50% + 500px)` on wide desktop displays rather than on the viewport right edge.
  - On mobile iOS (Safari), `overflow: hidden` on `body` breaks URL bar collapse and causes rubber-band scroll trapping when touching outside the container.

### 1.2 Bento Grid & Responsive Layout Failure
- **File**: `src/components/UploadConfig.tsx` (lines 122–129)
```tsx
return (
  <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1.5rem', width: '100%' }}>
    <div className="glass-panel animate-fade-in" style={{ width: '100%', padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
      <h2 style={{ textAlign: 'left', marginBottom: '2rem', fontSize: '1.75rem', fontWeight: 700 }}>Tạo Bộ Trắc Nghiệm Mới</h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', flex: 1 }}>
        {/* Cột trái: Tải file */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
```
- **File**: `src/app/globals.css` (lines 209–223)
```css
/* Responsive Breakpoints */
@media (max-width: 600px) {
  h1 {
    font-size: 1.75rem;
  }
  .main-container {
    padding: 1rem;
  }
  .glass-panel {
    padding: 1.25rem;
  }
  .btn-primary, .btn-secondary {
    padding: 0.6rem 1rem;
  }
}
```
- **Observed Behavior**:
  - `gridTemplateColumns: '1fr 1fr'` is specified as an inline style.
  - No media query or responsive utility class overrides this inline grid style.
  - On mobile screens (< 640px) such as an iPhone (375px–390px width), the grid remains strictly 2 columns.
  - Subtracting container padding (16px * 2 = 32px), panel padding (24px * 2 = 48px), and grid gap (32px), each column receives `(375 - 32 - 48 - 32) / 2 = 131.5px` width.
  - The dropzone text, file list, select dropdowns, labels, and primary submit button are severely squashed and clipped into a 131px column.
  - There is no Bento Grid architecture (no asymmetric cells, no visual card differentiation, no responsive card tiers).

### 1.3 Liquid Glass & Visual Styling Deficiencies
- **File**: `src/app/globals.css` (lines 1–21, 23–43, 82–98)
```css
:root {
  ...
  --surface-glass: rgba(255, 255, 255, 0.7);
  --border-color: #e2e8f0;
  ...
  --shadow-glass: 0 8px 32px 0 rgba(31, 38, 135, 0.07);
}

[data-theme='dark'] {
  ...
  --surface-glass: rgba(30, 41, 59, 0.9);
  --border-color: #334155;
  ...
  --shadow-glass: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
}

.glass-panel {
  background: var(--surface-glass);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.15); /* Mỏng nhẹ chuẩn glass */
  border-radius: 20px;
  box-shadow: 
    var(--shadow-glass),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  padding: 2rem;
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s ease;
}
.glass-panel:hover {
  box-shadow: 
    0 12px 40px 0 rgba(31, 38, 135, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
}
```
- **Observed Behavior**:
  - In light theme, `border: 1px solid rgba(255, 255, 255, 0.15)` is rendered against `#f8fafc`. White with 15% opacity on light gray is completely invisible (contrast ratio ~ 1.02:1), stripping all boundary definition from the glass panel.
  - In dark theme, `--surface-glass` is `rgba(30, 41, 59, 0.9)`. At 90% opacity, the surface is essentially an opaque dark rectangle; the underlying background blur and saturation effect are visually imperceptible.
  - `.glass-panel:hover` hardcodes `rgba(31, 38, 135, 0.1)` (light mode blue tint), clashing with dark mode neutral shadows.
  - There is no `@media (prefers-reduced-transparency: reduce)` fallback, violating accessibility standards.
  - Background radial gradients in `body` use generic AI purple/blue glowing circles (`rgba(59, 130, 246, 0.15)` and `rgba(139, 92, 246, 0.15)`), and headers use purple text gradient (`linear-gradient(to right, var(--primary-color), #8b5cf6)`), directly matching the anti-pattern forbidden in `taste-skill` Section 4.2 ("THE LILA RULE").

### 1.4 Stress-Test Under Extreme Data Inputs
#### (A) Massive Quiz Sessions (50–200 questions)
- **File**: `src/components/QuizInterface.tsx` (lines 195–205)
```tsx
{round.questions.map((q, idx) => {
  const uAns = round.userAnswers?.[q.id];
  const isQCorrect = uAns === q.correctAnswer;
  return (
    <div 
      key={q.id} 
      className="animate-fade-in" 
      style={{ animationDelay: `${idx * 0.1}s`, animationFillMode: 'both' }}
    >
```
- **Observed Behavior**:
  - In review mode, each question item has an inline `animationDelay` of `idx * 0.1s`.
  - For a 50-question quiz: Question 50 has a 5.0-second delay.
  - For a 100-question quiz: Question 100 has a 10.0-second delay.
  - For a 200-question quiz: Question 200 has a 20.0-second delay.
  - Because `animationFillMode: 'both'` is set, questions remain at `opacity: 0` during the delay. A user scrolling down sees a massive blank screen for up to 20 seconds, creating the illusion of a frozen or broken application.
  - In active quiz mode, there is **NO Question Navigator, Drawer, or Grid Palette**. Users cannot see answered vs. unanswered questions, cannot jump to specific questions, and have no "Previous Question" button (`handleNext` only advances forward).

#### (B) Long Clinical Case Vignettes & Multi-Paragraph Medical Options
- **File**: `src/components/QuizInterface.tsx` (lines 280–345)
```tsx
let buttonStyle: React.CSSProperties = {
  padding: '1rem 1.5rem',
  borderRadius: '12px',
  borderWidth: '2px',
  borderStyle: 'solid',
  borderColor: 'var(--border-color)',
  backgroundColor: 'var(--surface-color)',
  cursor: hasAnsweredCurrent ? 'default' : 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '1rem',
  transition: 'all 0.2s',
  textAlign: 'left' as const,
  width: '100%',
  fontSize: '1rem',
  color: 'var(--text-color)'
};
...
<span style={{ 
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: '32px', height: '32px', borderRadius: '50%',
  backgroundColor: (hasAnsweredCurrent && (isCorrectOption || isSelected)) ? 'transparent' : 'var(--border-color)',
  fontWeight: 700
}}>
  {option.label}
</span>
<span style={{ flex: 1 }}>{option.text}</span>
```
- **Observed Behavior**:
  - `alignItems: 'center'` forces the option badge (`A`, `B`, `C`, `D`) to center vertically against the entire text block. For multi-line clinical answer choices, the label floats awkwardly in the vertical middle of the paragraph.
  - The badge `span` lacks `flexShrink: 0`. When answer choices contain long text or narrow containers, the 32px badge compresses into an oval.
  - Neither the question stem nor answer choices specify `overflow-wrap: break-word` or `word-break: break-word`. Long medical terms (`hypercholesterolemia`, `sphingomyelinase`) risk causing horizontal overflow.

#### (C) Long File Names & Large Scope Inputs
- **File**: `src/components/UploadConfig.tsx` (lines 173–189, 232–240)
```tsx
{files.map((f, i) => (
  <div key={`${f.name}-${i}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.75rem', backgroundColor: 'var(--surface-color)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
      {f.type.includes('image') ? <ImageIcon size={16} color="var(--primary-color)" /> : <File size={16} color="var(--primary-color)" />}
      <span style={{ fontSize: '0.85rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.name}</span>
    </div>
    <button onClick={(e) => { e.stopPropagation(); removeFile(i); }} ...>
...
<textarea 
  className="input-field" 
  placeholder="Ví dụ: Chỉ chương 4..."
  value={scope}
  onChange={(e) => setScope(e.target.value)}
  maxLength={1000}
  style={{ minHeight: '60px', resize: 'none', padding: '0.5rem', fontSize: '0.9rem' }}
/>
```
- **Observed Behavior**:
  - The inner wrapper around the file name lacks `flex: 1; min-width: 0;`. In flexbox, items default to `min-width: min-content;`, meaning long filenames can push the delete button outside the visible box.
  - The scope textarea has a hardcoded `minHeight: '60px'; resize: 'none'`. Entering a detailed clinical syllabus or chapter list (up to 1,000 characters) forces scrolling within a 60px viewport without a character counter or resize handle.
  - In session history (`UploadConfig.tsx:292`), `session.title` does not have truncation styles; long filenames stretch the card header.

### 1.5 Print Stylesheet Truncation
- **File**: `src/app/globals.css` (lines 225–251)
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
  }
  body * {
    visibility: hidden;
  }
  #review-section, #review-section * {
    visibility: visible;
  }
  #review-section {
    position: relative;
    width: 100%;
    padding: 0;
    margin: 0;
  }
  .no-print, header, .main-container > :not(#review-section) {
    display: none !important;
  }
}
```
- **Observed Behavior**:
  - While `@media print` sets background and visibility, it does NOT override `body { height: 100dvh; overflow: hidden; }` or `.main-container { overflow-y: auto; }`.
  - When printed to PDF or printer, multi-page quizzes (e.g. 50–100 questions) are truncated after the first 1–2 pages because the print engine obeys `overflow: hidden; height: 100dvh;`.
  - Question containers lack `page-break-inside: avoid; break-inside: avoid;`, allowing question stems to split across page breaks away from their options.

### 1.6 History Review ("Xem lại lịch sử") State & Render Flaws
- **File**: `src/components/QuizInterface.tsx` (lines 38–60, 83–96)
```tsx
// Sync state when entering review mode from history
useEffect(() => {
  if (isReviewMode) {
    setIsFinished(true);
    setShowReview(true);
  }
}, [isReviewMode]);

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
- **File**: `src/app/page.tsx` (lines 145–150, 171–182)
```tsx
const handleViewHistory = (session: QuizSession) => {
  setCurrentSessionId(session.id);
  setCurrentRounds(session.rounds);
  setIsReviewMode(true);
  setQuestions(null); // Mở mode Review
};
...
<QuizInterface 
  key={isReviewMode ? `review-${currentSessionId}` : quizId}
  questions={isReviewMode ? [] : (questions || [])} 
  isReviewMode={isReviewMode}
  historyRounds={currentRounds}
  ...
/>
```
- **Observed Behavior**:
  - When opening a past session, `isReviewMode` is true, and `questions` is `[]`.
  - `QuizInterface` mounts with `key={`review-${currentSessionId}`}`. On initial mount, `useEffect([questions])` runs and executes `setIsFinished(false)` and `setShowReview(false)`.
  - Because `isFinished` becomes false, `if (isFinished)` is bypassed.
  - At line 254: `if (!currentQuestion) return null;` executes, causing `QuizInterface` to render completely blank (`null`).
  - If `showReview` is false while `isFinished` is true, `questions.length` is 0, causing `0 / 0 = NaN%` to display on screen.
  - In `QuizInterface.tsx:175-181`, clicking "Quay lại" in review mode triggers `onNewFile()`, which clears `currentSessionId` and `currentRounds` rather than gracefully exiting back to the session list.

---

## 2. Logic Chain

```
[Observation 1.1: body height 100dvh + overflow: hidden]
  ├──> Browser viewport cannot collapse browser chrome on mobile
  ├──> Header and .main-container are flex column siblings
  └──> Header backdrop-filter: blur(12px) has nothing scrolling behind it
       └──> Visual flaw: Translucent frosted glass effect is wasted

[Observation 1.2: inline style gridTemplateColumns: '1fr 1fr' in UploadConfig]
  ├──> No CSS media queries override inline style
  ├──> On screen width < 640px, column width drops to ~131px
  └──> Dropzone and config controls break, labels wrap unnaturally, layout is severely broken

[Observation 1.3: border 1px solid rgba(255, 255, 255, 0.15) on light bg & dark surface-glass at 0.9 alpha]
  ├──> In light mode, border contrast is invisible against #f8fafc
  ├──> In dark mode, card surface is 90% opaque, nullifying backdrop blur
  └──> Visual flaw: Glassmorphic aesthetic fails in both light and dark modes

[Observation 1.4A: animationDelay: idx * 0.1s with animationFillMode: 'both']
  ├──> At 50 questions -> 5s delay; at 100 questions -> 10s delay; at 200 questions -> 20s delay
  ├──> Questions stay at opacity: 0 until delay elapses
  └──> Critical UX glitch: Scrolling down reveals a blank screen for 10-20 seconds

[Observation 1.4B: alignItems: center on question options & flexShrink missing on badge]
  ├──> Long medical paragraphs center option badge at vertical midpoint
  ├──> Narrow containers compress badge from circle into oval
  └──> Visual flaw: Multi-line clinical vignettes and answers look unaligned and deformed

[Observation 1.5: body height 100dvh & overflow hidden in print styles]
  ├──> Print engine obeys outer height lock and hidden overflow
  └──> Multi-page PDF exports truncate after page 1 or 2, losing up to 90% of questions

[Observation 1.6: conflicting useEffect([questions]) resetting isFinished & showReview]
  ├──> Questions prop is passed as [] in review mode
  ├──> Effect resets isFinished to false; currentQuestion is null
  └──> Critical bug: Component renders blank null or displays NaN% score
```

---

## 3. Caveats

1. **API Latency & Token Constraints**: While the client UI can be stress-tested for 50–200 questions, the Gemini server endpoint (`/api/generate`) has a maximum execution time (`maxDuration = 60`) on serverless platforms. Large generation batches (>50 questions) are currently gated by the server route, but client review mode can easily load sessions containing multiple cumulative rounds totaling 50–200 questions.
2. **Browser Rendering Capabilities**: High backdrop-filter blur radii (`blur(24px)`) combined with large DOM trees (200 questions) may incur frame drops on low-power mobile devices unless hardware-accelerated GPU layers are maintained.
3. **No Direct Code Modifications**: As a read-only investigation, no production source files were directly altered in this step. All proposals are detailed below for the implementation phase.

---

## 4. Conclusion

The Quiz Medical App has a solid conceptual foundation, but suffers from five major architectural and UI/UX vulnerabilities:
1. **Responsive Breakdown on Mobile/Tablet**: Rigid inline 2-column grid (`1fr 1fr`) in `UploadConfig` crushes the layout on screens under 640px.
2. **Body Overflow & Scroll Trap**: Locking `body` to `100dvh; overflow: hidden;` traps the scrollbar, neutralizes the frosted glass header, causes iOS bounce glitches, and truncates multi-page PDF printing.
3. **Scalability Breakdown on Extreme Data**:
   - Staggered animation delay (`idx * 0.1s`) creates a 10–20 second blackout on large quizzes.
   - Absence of a Question Navigator / Grid Palette leaves users stranded in 50–200 question sessions without navigation or jump capability.
   - Option badges deform into ovals and misalign on multi-line clinical vignettes.
   - Long file names clip delete action buttons due to missing flex shrinking constraints (`min-w-0`).
4. **Liquid Glass & Taste-Skill Violations**: Border contrast is imperceptible in light mode, dark mode is overly opaque (90%), AI-purple gradients violate the anti-slop guidelines, and `prefers-reduced-transparency` fallback is absent.
5. **History Review Race Condition**: Conflicting `useEffect` triggers cause the history review mode to render a blank screen (`null`) or display `NaN%`.

---

## 5. Concrete Actionable Recommendations for Fortifying UI/UX

### R1. Refactor Viewport & Page Scrolling Architecture
- **In `src/app/globals.css`**:
  - Change `body` from `height: 100dvh; overflow: hidden;` to `min-height: 100dvh; display: flex; flex-direction: column; overflow-x: hidden; overflow-y: auto;`.
  - Allow standard browser viewport scrolling so native mobile URL bars collapse smoothly and scrollbars rest at the viewport edge.
  - Update `Header`: make it genuinely sticky (`position: sticky; top: 0; z-index: 50;`) overlaying the content. Give it a high-quality glassmorphic blur with solid fallback:
    ```css
    header.app-header {
      position: sticky;
      top: 0;
      z-index: 50;
      background: var(--surface-glass);
      backdrop-filter: blur(16px) saturate(180%);
      -webkit-backdrop-filter: blur(16px) saturate(180%);
      border-bottom: 1px solid var(--border-color);
    }
    ```
  - In `@media print`:
    ```css
    @media print {
      body, .main-container, #review-section {
        height: auto !important;
        overflow: visible !important;
        max-width: 100% !important;
        padding: 0 !important;
      }
      .question-card {
        page-break-inside: avoid;
        break-inside: avoid;
      }
    }
    ```

### R2. Replace Rigid 2-Column Grid with a True Responsive Bento Grid
- **In `src/components/UploadConfig.tsx`**:
  - Remove inline `style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}`.
  - Implement a true Bento Grid layout using responsive CSS classes:
    - On mobile (`< 768px`): 1-column fluid stack.
    - On tablet & desktop (`>= 768px`): CSS Grid with asymmetric card spans:
      - **Bento Card 1 (Upload Dropzone & File Queue)**: Spanning 7 columns, containing interactive dropzone, accepted format badges, and a scrollable file chip list with `min-w-0` and text truncation.
      - **Bento Card 2 (AI Model & Scope Control)**: Spanning 5 columns, containing model selector, expandable scope textarea with character counter.
      - **Bento Card 3 (Question Count & Generation CTA)**: Question count slider / input with quick presets (10, 20, 30, 50) and a prominent primary action button.
      - **Bento Card 4 (Learning History)**: Full-width or secondary bento tile showing previous sessions, completion stats, and timestamps.

### R3. Fortify Liquid Glass Styling & Adhere to `design-taste-frontend`
- **Color Calibration (Anti-Slop)**:
  - Replace generic AI-purple gradients (`#8b5cf6`) with a clinical, high-trust palette:
    - Primary: Clinical Sapphire / Cobalt (`#0284c7` or `#2563eb`).
    - Neutral: Crisp Slate (`#0f172a` text, `#f8fafc` light surface, `#1e293b` dark surface).
    - Accent: Emerald (`#10b981`) for correct answers, Crimson (`#ef4444`) for errors.
  - Replace body radial mesh gradients with subtle, calm ambient lighting.
- **Glassmorphism Calibration**:
  - Light mode: Set `border: 1px solid rgba(226, 232, 240, 0.8)` with an inner highlight `box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.6)`.
  - Dark mode: Adjust `--surface-glass` from `0.9` to `rgba(15, 23, 42, 0.75)` and border to `1px solid rgba(255, 255, 255, 0.1)`.
  - Add accessibility fallback:
    ```css
    @media (prefers-reduced-transparency: reduce) {
      .glass-panel, header.app-header {
        background: var(--surface-color) !important;
        backdrop-filter: none !important;
        -webkit-backdrop-filter: none !important;
      }
    }
    ```

### R4. Stress-Proof Against Extreme Data & Long Clinical Cases
- **Cap or Eliminate Staggered Delays in Review Mode**:
  - In `QuizInterface.tsx`: Change `style={{ animationDelay: `${idx * 0.1}s` }}` to:
    `style={{ animationDelay: `${Math.min(idx * 0.03, 0.3)}s` }}` or eliminate delay entirely for lists > 10 items.
- **Add Question Navigator / Drawer for Long Quizzes**:
  - Add a collapsible Question Grid (Navigator) drawer or header sheet displaying a matrix of numbers `[1] [2] [3] ... [N]`.
  - Badges indicate status: current (active border), answered (filled), unanswered (muted outline).
  - Clicking any number jumps immediately to that question.
  - Add a "Câu trước" (Previous Question) button alongside "Câu tiếp theo" (Next Question).
- **Flex Alignment on Clinical Options**:
  - In `QuizInterface.tsx`:
    - Set `alignItems: 'flex-start'` on option buttons.
    - Set `flexShrink: 0; width: 32px; height: 32px; margin-top: 2px;` on option letter badges so they remain perfect circles aligned with the first line of text.
    - Add `word-break: break-word; overflow-wrap: break-word;` on question stem and option text.
- **Filename & History Card Truncation**:
  - Ensure file chip containers use `flex: 1; min-width: 0;` so long filenames truncate with ellipsis without pushing out the delete button.
  - Add `white-space: nowrap; overflow: hidden; text-overflow: ellipsis;` to session history card titles.

### R5. Fix History Review Crash & State Sync
- **In `src/components/QuizInterface.tsx`**:
  - Separate review mode logic from active quiz logic.
  - Prevent the `useEffect([questions])` from executing `setIsFinished(false)` when `isReviewMode === true`.
  - Safeguard score calculation: if `questions.length === 0`, derive questions and stats directly from `historyRounds[0].questions` or skip score display.
  - In review mode, change the "Quay lại" button handler to return to the session list (`onBackToSessions` or `setIsReviewMode(false)`) without destroying past sessions.

---

## 6. Verification Method

### Command Verification
1. **Production Build Validation**:
   ```bash
   cmd.exe /c "npm run build"
   ```
   Ensures zero TypeErrors, zero syntax errors, and zero Turbopack build warnings.

2. **Responsive Layout Stress-Test**:
   - Emulate viewports using Chrome DevTools or Playwright:
     - Mobile: 375x667 (iPhone SE), 390x844 (iPhone 14) -> verify Bento Grid stacks into 1 column with full-width legible controls.
     - Tablet: 768x1024 (iPad Portrait), 820x1180 (iPad Air).
     - Desktop: 1440x900, 1920x1080.
   - Verify that horizontal scrollbars never appear (`document.documentElement.scrollWidth <= window.innerWidth`).

3. **Extreme Data Volume Stress-Test**:
   - Inject a synthetic session with 100 questions and multi-paragraph clinical vignettes.
   - Verify question navigator allows instant jumping to question #98.
   - Verify review mode loads all 100 questions without 10-second blank delays.
   - Trigger print preview (`Ctrl + P` / `window.print()`) and verify that all 100 questions flow across pages without page 1 cut-off.

4. **History Review Verification**:
   - Complete a quiz round, return to upload screen, verify session card appears.
   - Click "Lịch sử học tập phiên này" card: verify all past questions and user answers render immediately with zero crash and zero `NaN%`.
