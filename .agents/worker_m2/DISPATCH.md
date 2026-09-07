## 2026-09-06T18:41:30Z

<USER_REQUEST>
You are the Implementation Worker for Milestone 2 (M2: UI/UX Fortification & Production Polish).
Working Directory: d:\Quiz_Web\.agents\worker_m2
Original Request Path: d:\Quiz_Web\.agents\ORIGINAL_REQUEST.md (MANDATORY: Read this first)
Project Specification: d:\Quiz_Web\.agents\PROJECT.md
Survey Handoff from Explorer 2: d:\Quiz_Web\.agents\explorer_survey_2\handoff.md
Design Skill: C:\Users\ADMIN\.gemini\config\skills\taste-skill\SKILL.md
Project Rules: Read d:\Quiz_Web\AGENTS.md.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Write Ownership:
You exclusively own:
- src/app/globals.css
- src/components/Header.tsx
- src/components/UploadConfig.tsx
- src/components/QuizInterface.tsx
- src/components/QuestionNavigator.tsx (new component if needed)
- src/types/index.ts

Your objective:
1. Initialize progress.md in your working directory.
2. Implement F06 & F07: Viewport Scrolling & Print-to-PDF in `src/app/globals.css`:
   - Change `body` from `height: 100dvh; overflow: hidden;` to `min-height: 100dvh; display: flex; flex-direction: column; overflow-x: hidden; overflow-y: auto;`.
   - Update `.main-container`: remove `overflow-y: auto`, allow natural body scrolling so mobile address bars collapse and scrollbar rests on viewport edge.
   - Make `Header.tsx` sticky (`position: sticky; top: 0; z-index: 50;`) with genuine glassmorphic blur and translucent background.
   - Fix `@media print`: ensure `body`, `.main-container`, and `#review-section` have `height: auto !important; overflow: visible !important;`, question cards have `page-break-inside: avoid; break-inside: avoid;`, and parent `.glass-panel` is not hidden.
3. Implement F08: Responsive Bento Grid in `src/components/UploadConfig.tsx`:
   - Replace the static inline `gridTemplateColumns: '1fr 1fr'` with a responsive Bento Grid (single column stack on screens < 768px, asymmetric 7-col dropzone + 5-col config on screens >= 768px).
   - Ensure file chips have `min-width: 0` and truncate long filenames properly with ellipsis without clipping delete buttons.
4. Implement F09: Liquid Glass & Taste-Skill Polish in `src/app/globals.css`:
   - Clinical sapphire/slate palette (no AI-purple gradients): primary `#0284c7` / `#2563eb`, background slate subtle ambient glow.
   - Calibrate glass: light mode border `rgba(226, 232, 240, 0.8)` with inner top highlight `rgba(255, 255, 255, 0.6)`; dark mode `--surface-glass` at `0.75` (not opaque 0.9).
   - Add `@media (prefers-reduced-transparency: reduce)` accessibility fallback.
5. Implement F10: Extreme Data Volume Resilience in `src/components/QuizInterface.tsx`:
   - Cap staggered animation delay: change `animationDelay: ${idx * 0.1}s` to `animationDelay: ${Math.min(idx * 0.03, 0.3)}s` so large quizzes (50-200 questions) do not display blank screens for 5-20s.
6. Implement F11: Active Quiz Navigation (Question Drawer / Grid & Bidirectional Navigation):
   - Add collapsible Question Grid / Navigator Drawer (`1..N`) allowing direct jump to any question and visual indication of answered vs unanswered questions.
   - Add a "Câu trước" (Previous Question) button alongside "Câu tiếp theo" (Next Question).
7. Implement F12: Clinical Vignette Alignment in `src/components/QuizInterface.tsx`:
   - Change option buttons layout to `alignItems: 'flex-start'`.
   - Ensure option letter badges have `flex-shrink: 0; width: 32px; height: 32px; margin-top: 2px;` so they remain perfect circles aligned with the first line of text.
   - Add `word-break: break-word; overflow-wrap: break-word;` on question stem and options.
8. Verify your work:
   - Run `npm run test` (all 126+ tests must pass; update test matchers if UI labels/styles were enhanced).
   - Run `npm run build` (0 errors).
   - Run `npx eslint` on touched files (0 errors, 0 warnings).
9. Write a comprehensive handoff report in `d:\Quiz_Web\.agents\worker_m2\handoff.md`.
10. Send a completion message to parent.
</USER_REQUEST>
