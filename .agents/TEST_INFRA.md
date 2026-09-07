# E2E Test Infra: Quiz Medical App

## Test Philosophy
- Opaque-box, requirement-driven. No dependency on implementation internals.
- Methodology: Category-Partition + BVA + Pairwise + Workload Testing.

## Feature Inventory
| # | Feature | Source (requirement) | Tier 1 | Tier 2 | Tier 3 |
|---|---------|---------------------|:------:|:------:|:------:|
| 1 | History Review & Persistence | ORIGINAL_REQUEST §R1 & Acceptance Criteria | 5 | 5 | ✓ |
| 2 | Quiz Generation & Configuration | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ |
| 3 | Active Quiz Engine & State | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ |
| 4 | File Upload & Formats (PDF, DOCX, TXT) | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ |
| 5 | UI/UX & Responsive Layouts | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ |

## Test Architecture
- Unit & Component Runner: Vitest + @testing-library/react + jsdom.
- E2E Runner: Playwright (@playwright/test).
- Directory Layout:
  - `src/test/setup.ts`: Vitest test setup with DOM polyfills.
  - `src/components/__tests__/`: Component tests for UploadConfig, QuizInterface, Header, etc.
  - `src/lib/__tests__/`: Unit tests for storage, parsing, validation.
  - `e2e/`: Playwright E2E specs for complete user flows.

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | Upload TXT medical syllabus, generate 10 questions, take full exam, review answers, verify session in history. | F01, F02, F03, F05 | High |
| 2 | Load past session from history across page reload, verify questions and answers display without crash or NaN. | F01, F02, F04 | High |
| 3 | Responsive mobile viewport flow: navigate 50-question quiz on iPhone SE viewport (375px), check no clipping. | F07, F08, F11 | High |
| 4 | Print quiz review to PDF: verify all questions flow without truncation. | F06 | Medium |
| 5 | Extreme clinical vignette: 100-question quiz with long paragraphs and complex choices. | F10, F11, F12 | High |

## Coverage Thresholds
- Tier 1: ≥5 per feature area (≥25 tests)
- Tier 2: ≥5 per feature area for boundary/corner conditions (≥25 tests)
- Tier 3: Pairwise combinations of major features (≥5 tests)
- Tier 4: ≥5 realistic end-to-end scenarios
- Expected Total: ≥60 automated tests across unit, integration, and E2E tiers.
