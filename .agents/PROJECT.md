# Project: Quiz Medical App — Production Fortification & Hardening

## Architecture
- **Framework**: Next.js 16.2.10 (App Router), React 19.2.4, TypeScript ^5, Turbopack.
- **Styling Architecture**: Custom CSS Variables + Glassmorphism (`src/app/globals.css`), Lucide icons, Motion (Framer Motion).
- **State Management**:
  - Global Session Persistence: `localStorage` wrapper with JSON validation and state hydration.
  - Page State (`src/app/page.tsx`): Active files, current questions, active session, review mode flag.
  - Quiz State (`src/components/QuizInterface.tsx`): Current index, user answers, timer, navigator drawer state.
- **Backend**: Next.js Route Handler (`src/app/api/generate/route.ts`) interfacing with Google Gemini API (`@google/genai`).

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F01 | History Review Crash Fix | Eliminate React hook race/clobber condition in `QuizInterface.tsx` when entering review mode with `questions: []`. | M1 | Survey (Explorer 1, 2, 3) |
| F02 | LocalStorage Persistence | Persist `sessions` across browser refreshes with schema validation, fallback, and clear/export actions. | M1 | Survey (Explorer 1, 3) |
| F03 | Defensive Data Guards | Prevent `TypeError` crashes on missing/undefined `rounds`, `questions`, `options`, or division by zero in score. | M1 | Survey (Explorer 1) |
| F04 | Non-Destructive Navigation | Exiting review mode returns cleanly to upload/session dashboard without wiping user-selected files. | M1 | Survey (Explorer 1, 2) |
| F05 | TXT File Upload Support | Add support for `.txt` (`text/plain`) in frontend dropzone/validation and backend route handler. | M1 | Survey (Explorer 3) |
| F06 | Print-to-PDF Fix | Override body/container overflow in `@media print`, avoid question card break inside, restore `.glass-panel` visibility. | M2 | Survey (Explorer 1, 2) |
| F07 | Viewport & Page Scrolling | Refactor `body` from `height: 100dvh; overflow: hidden;` to standard viewport scrolling; make frosted header genuinely sticky. | M2 | Survey (Explorer 2) |
| F08 | Responsive Bento Grid | Replace static inline `1fr 1fr` grid with responsive Bento Grid (1-col mobile, 7/5 asymmetric desktop). | M2 | Survey (Explorer 2, 3) |
| F09 | Liquid Glass & Taste-Skill Polish | Clinical sapphire/slate palette (no AI-purple gradient), accessible border contrast, calibrated dark mode glass, `prefers-reduced-transparency`. | M2 | Survey (Explorer 2) |
| F10 | Extreme Volume Animation Fix | Cap or remove staggered animation delays (`idx * 0.1s`) in review mode to eliminate 5–20s blank screen on large quizzes. | M2 | Survey (Explorer 2) |
| F11 | Question Navigator Drawer | Add collapsible Question Grid / Navigator Drawer (`1..N`) with answered/unanswered status and bidirectional navigation. | M2 | Survey (Explorer 2, 3) |
| F12 | Clinical Vignette Alignment | Align option buttons `flex-start`, preserve 32px circular option badges (`flex-shrink: 0`), add word-break for medical terms. | M2 | Survey (Explorer 2) |
| F13 | React 19 & ESLint Hardening | Fix synchronous `setState` in `useEffect`, eliminate `any` types, fix ARIA attributes (`aria-checked`), clean up scripts. | M3 | Survey (Explorer 3) |
| F14 | Build & Zero-Warning Verification | Ensure `npm run build` and `npm run lint` pass with 0 errors and 0 warnings. | M3 | ORIGINAL_REQUEST §Acceptance Criteria |
| F15 | E2E Testing Infrastructure | Setup Vitest + React Testing Library for unit/integration tests and Playwright for opaque-box E2E testing. | M-TEST | Survey (Explorer 3) |
| F16 | Opaque-Box E2E Test Suite | 4-Tier test suite: Tier 1 Feature Coverage, Tier 2 Boundary/Corner, Tier 3 Pairwise, Tier 4 Real-World Workload. | M-TEST | Dual Track Protocol |
| F17 | Final Acceptance & Adversarial Hardening | Phase 1: 100% E2E test pass; Phase 2: Tier 5 adversarial stress testing + Forensic Integrity Audit + comprehensive final report. | M-FINAL | Project Pattern Protocol |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M-TEST | E2E Testing Track | Install Vitest + Playwright; build 4-tier opaque-box test suite; publish `TEST_READY.md`. | none | DONE |
| M1 | Bug Fixing & State Stability | F01 (History crash fix), F02 (Persistence), F03 (Defensive guards), F04 (Clean back nav), F05 (TXT support). | none | DONE |
| M2 | UI/UX Fortification | F06 (Print fix), F07 (Viewport/scroll), F08 (Bento Grid), F09 (Liquid Glass polish), F10 (Animation delay cap), F11 (Navigator drawer), F12 (Vignette alignment). | M1 contracts | DONE |
| M3 | Production Hardening & Lint Cleanliness | F13 (React 19 & ESLint fixes), F14 (Zero-warning build and lint). | M1, M2 | DONE |
| M-FINAL | Final Acceptance & Adversarial Hardening | Phase 1: Pass 100% E2E tests; Phase 2: Tier 5 adversarial stress testing + Forensic Audit + Comprehensive Markdown Report. | M1, M2, M3, M-TEST | DONE |

## Interface Contracts

### Session Storage Contract (`src/services/storage.ts` or `src/types/index.ts`)
```typescript
export interface StoredQuizSession extends QuizSession {
  version: number; // schema version e.g. 1
  createdAt: number; // timestamp
}

export function loadSessionsFromStorage(): QuizSession[];
export function saveSessionsToStorage(sessions: QuizSession[]): void;
export function clearStorageSessions(): void;
```

### QuizInterface Props Contract (`src/components/QuizInterface.tsx`)
```typescript
interface Props {
  questions: Question[];
  isReviewMode?: boolean;
  historyRounds?: QuizRound[];
  onGenerateMore?: (numQuestions: number) => void;
  onFinishRound?: (userAnswers: Record<string, AnswerLabel>) => void;
  isGenerating?: boolean;
  error?: string | null;
  onNewFile: () => void;
  onBackToDashboard?: () => void; // Non-destructive back navigation
}
```

### File Upload Support Contract (`src/components/UploadConfig.tsx` & `src/app/api/generate/route.ts`)
```typescript
export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "image/png",
  "image/jpeg",
  "image/jpg"
];
export const ALLOWED_EXTENSIONS = ".pdf,.docx,.txt,.png,.jpg,.jpeg";
```

## Code Layout
- `src/app/globals.css`: Global styles, CSS variables, Liquid Glass utilities, responsive breakpoints, print styles.
- `src/app/layout.tsx`: Root layout with ThemeProvider and meta headers.
- `src/app/page.tsx`: Top-level orchestrating page, session state, storage hydration.
- `src/app/api/generate/route.ts`: AI generation route handler, multipart form parsing, Gemini API call.
- `src/components/Header.tsx`: Glassmorphic sticky header, theme toggle, app title.
- `src/components/UploadConfig.tsx`: Bento Grid layout, dropzone, file chips, quiz config, session history cards.
- `src/components/QuizInterface.tsx`: Active quiz engine, Question Navigator drawer, timer, instant feedback, review mode.
- `src/components/QuestionNavigator.tsx`: Collapsible matrix drawer for direct question jumping and answer tracking.
- `src/lib/storage.ts`: Safe localStorage abstraction with SSR guard and error boundaries.
- `src/types/index.ts`: TypeScript definitions for Quiz, Question, Session, Round.
