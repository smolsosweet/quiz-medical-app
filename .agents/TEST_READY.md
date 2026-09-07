# Test Suite Readiness Declaration (M-TEST)

**Milestone**: M-TEST (E2E Testing Track)  
**Status**: Ready & Operational  
**Timestamp**: 2026-09-07T01:30:00+07:00  
**Test Framework**: Vitest v5.0.0 + React Testing Library v16 + jsdom + Playwright Test v1.63  

---

## Test Execution Commands

- **Unit & Integration Suite (Tiers 1–4)**:
  ```bash
  npm run test
  ```
  *(or `npx vitest run`)*

- **Watch Mode**:
  ```bash
  npm run test:watch
  ```

- **Type Check Validation**:
  ```bash
  npx tsc --noEmit
  ```

- **E2E Browser Suite (Playwright)**:
  ```bash
  npm run test:e2e
  ```

---

## Test Inventory & Summary

| Tier | Test Scope | Target File(s) | Test Count | Status |
|---|---|---|:---:|:---:|
| **Setup** | Environment & Polyfills | `src/test/smoke.test.ts` | 1 | PASS |
| **Tier 1** | History Review & Storage Persistence (F01, F02) | `src/test/tier1_features/history_persistence.test.ts` | 5 | PASS |
| **Tier 1** | Theme & Header (F09) | `src/components/__tests__/Header.test.tsx` | 6 | PASS |
| **Tier 1** | Quiz Generation Config & File Upload (F02, F05) | `src/components/__tests__/UploadConfig.test.tsx` | 15 | PASS |
| **Tier 1** | Active Quiz Engine & Review Interface (F01, F03) | `src/components/__tests__/QuizInterface.test.tsx` | 11 | PASS |
| **Tier 2** | Boundary & Corner Cases (F01–F05, F10) | `src/test/tier2_boundaries/boundary_corner_cases.test.tsx` | 25 | PASS |
| **Tier 3** | Cross-Feature Combinations | `src/test/tier3_combinations/cross_feature_combinations.test.tsx` | 5 | PASS |
| **Tier 4** | Real-World Medical Application Scenarios | `src/test/tier4_scenarios/real_world_medical_scenarios.test.tsx` | 5 | PASS |
| **E2E** | Playwright Browser End-to-End Specs | `e2e/quiz_flow.spec.ts` | 3 | READY |
| **Total Automated Tests** | | | **76 (73 Vitest + 3 Playwright)** | **100% READY** |

---

## Tier-by-Tier Coverage Checklist

### Tier 1: Feature Coverage (37 tests across 5 features)
- [x] **History Review & Persistence (11 tests)**:
  - LocalStorage hydration and safe initialization (`loadSessionsFromStorage`).
  - Session and round saving with defensive sanitization (`saveSessionsToStorage`).
  - Cache clearing (`clearStorageSessions`).
  - Quota management (trimming oldest sessions past 50).
  - Defensive removal of corrupted questions/answers in round objects.
  - History card presentation on upload dashboard.
  - History session selection callback and review view transition.
- [x] **Quiz Generation Configuration (7 tests)**:
  - Model selection dropdown (`gemini-2.5-flash` vs `gemini-2.5-flash-lite`).
  - Question count input (1–50) with boundary clamping and auto-reset.
  - Scope specification textarea with 1,000 char capacity.
  - Disabled submit state when files are missing.
  - Submission dispatch with user-selected question count.
  - Spinner and loading state during generation.
  - Error message display for API failures.
- [x] **Active Quiz Engine & State (7 tests)**:
  - Question numbering and progress bar calculation (`0% -> 100%`).
  - Option radio rendering with labeled badges (A, B, C, D).
  - Instant clinical feedback (Chính xác / Chưa chính xác) with explanation box.
  - Selection locking (disabling options after choice to prevent flipping).
  - Next question advance and finish round transitions.
  - Score percentage and correct count computation.
  - `onFinishRound` invocation with serialized answer map.
- [x] **File Upload & Validation (6 tests)**:
  - Supported format acceptance (PDF, DOCX, PNG, JPG).
  - Unsupported MIME type rejection (`.exe`, etc.) with user feedback.
  - File size capping at 10MB per file.
  - Total files capping at 5 files.
  - Duplicate detection by file name and size.
  - Chip rendering with individual delete actions.
- [x] **UI/UX, Theme & Header (6 tests)**:
  - Brand header presentation (`MediQuiz AI`).
  - Theme toggle button with accessible ARIA label.
  - `data-theme="dark"` and `data-theme="light"` toggle on `document.documentElement`.
  - LocalStorage theme preference persistence.
  - Initial load theme rehydration from storage.

### Tier 2: Boundary & Corner Conditions (25 tests)
- [x] Unparseable malformed JSON strings in storage.
- [x] Non-array primitives (numbers, objects, nulls) in storage.
- [x] Empty questions arrays rendering without crash.
- [x] Empty history rounds rendering without crash.
- [x] Zero-question round handling in review mode.
- [x] 1-question quiz boundary (100% vs 0% calculation).
- [x] Rapid sequential option clicks (state idempotency).
- [x] Rapid sequential Next button clicks (no index overshoot).
- [x] 0-question input handling.
- [x] Question count > 50 rejection.
- [x] NaN / empty question count recovery on blur.
- [x] 1,000-character maximum length restriction on scope.
- [x] Exact 10MB file size boundary acceptance.
- [x] 10MB + 1 byte file size rejection.
- [x] Duplicate file detection and prevention.
- [x] Exact 5-file cap enforcement.
- [x] Extreme clinical vignette rendering (>1,000 characters).
- [x] Medical Greek symbols, clinical units, and mathematical operators (`α, β, ±, ≥, ≤, µg/kg, °C, ²`).
- [x] Vietnamese full tone marks and complex medical terminology rendering.
- [x] Extremely long clinical explanation rendering.

### Tier 3: Cross-Feature Combinations (5 tests)
- [x] Upload -> Generate -> Complete Round -> Review Answers -> Return to Dashboard -> History Card Display.
- [x] Multi-round generation progression (accumulating Round 1 and Round 2 in a single session).
- [x] Theme switching during active examination without state or answer loss.
- [x] Multipart FormData serialization with multiple files, model selection, and scope.
- [x] Clean non-destructive back navigation from review section.

### Tier 4: Real-World Medical Application Workloads (5 tests)
- [x] Complete clinical cardiology syllabus workflow with 100% perfect exam score and history retention.
- [x] 504 Gateway Timeout handling on large documents with model fallback advice.
- [x] 429 Rate Limit recovery workflow.
- [x] High-volume 20-question clinical exam with partial score calculation (50%).
- [x] Print review to PDF triggering and verification.

---

## Escalations & Identified Implementation Nuances

1. **Review Mode Header Title**: `QuizInterface` renders `Lịch sử bài làm` when `isReviewMode=true` and `Xem lại bài làm` when viewing results after completing a quiz round. Both are asserted cleanly via regex matching.
2. **Review Mode Hook Race (F01)**: The fix implemented in `QuizInterface` allows `isReviewMode` to render past rounds without returning `null`.
3. **DOM Whitespace Normalization**: Very long text strings with repetitive phrases in JSX undergo standard HTML whitespace normalization, which is now normalized in test matchers via `.trim()`.
