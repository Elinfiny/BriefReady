---
doc: prd
status: draft
---
# BriefReady — Product Requirements

Source: `scope.md > The Core Loop` and `The Unique Kernel`.

## The Core Journey
1. Open the app and paste a brief, or load the labeled synthetic example.
2. Generate a draft. Each unprefixed line becomes a deliverable; `Deliverable:` and `Accept:` are supported. Acceptance lines attach to the preceding deliverable. This is a local drafting aid, not semantic AI inference.
3. Read source excerpts and ambiguity warnings. Edit titles and acceptance text, add/remove/reorder deliverables and checks. Any text edit invalidates that check's completion.
4. Check criteria that were actually verified, then mark each delivery package ready.
5. Export Markdown for handoff and JSON for future editing; import validated JSON with explicit replacement confirmation. Refresh preserves valid local state.

## Screens and Layout
One screen. Header with offline/privacy status; brief and example entry on the left; numbered deliverable cards on the right. Top summary reports verified criteria and packages separately. On small screens the brief precedes the cards; actions wrap instead of overflowing.

## Look and Feel
Executor-proposed direction: warm white, green ink, yellow highlights, serif heading with system sans-serif controls. Calm worksheet rather than chat. No claim these are learner design choices. Strong focus outlines, labels, large controls, readable status messages.

## Features and Behavior
### Draft from a brief
- Reject blank or over-12,000-character briefs without replacing the existing worksheet.
- At most 40 deliverables and 20 criteria per deliverable; reject excess rather than truncate.
- Keep source excerpts. Ambiguity flags are review prompts, not authoritative scope analysis.
- Missing criteria create an explicitly suggested check which the user must edit before checking it.
- Regenerating an existing worksheet requires confirmation; cancel keeps previous data.

### Review and complete
- Edit titles and criteria, add/remove cards/checks, reorder cards with keyboard-operable buttons.
- A check with blank text cannot be completed; editing a criterion resets its completion and the package flag.
- Packaging requires a nonblank title, at least one agreed criterion and every criterion verified. Reopening a check invalidates packaging.
- Summary never labels an empty worksheet complete.

### Save and hand off
- Autosave validated state in the same browser. Explain a failed/blocked save and keep the in-memory worksheet usable.
- Reject unsupported version, missing/extra keys, duplicate IDs, invalid booleans, oversize/deep data and invalid completion states before replacing anything.
- JSON import is limited to 4MB and asks before replacing an existing worksheet. Cancel and failed imports preserve current data. This bound permits round-trip even for the largest valid worksheet with escaped text.
- Export Markdown with source, criterion status and package status; escape Markdown/HTML metacharacters from input.
- JSON round-trip preserves order, source, questions, checks and completion.

## States and Boundaries
Empty: helpful next action. Draft: review needed. Complete: all agreed criteria verified and every package ready. Error: clear message, previous worksheet retained. Unsaved: explicit local save warning. All user text is rendered as text; no HTML injection. No external network calls at runtime, analytics or remote dependencies. Browser storage is convenient and unencrypted; JSON is the portable backup.

## Product Decisions
Admitted: freelancers, brief-to-deliverables, edit/reorder/checklist, local save, JSON/Markdown, synthetic examples, no paid model/backend. Executor-proposed: prefixed lines, explicit suggestion acknowledgment by editing, replacement dialog, palette and schema limits.

## What We're Building
One complete private worksheet journey as defined above.

## Deferred From the POC
Multi-worksheet search, language models, shared links, multi-user synchronization. Each introduces a separate product or access risk.

## Non-Goals
No automatic client approval or guarantee that a brief is complete. No real client data in demo.

## Open Questions
Independent eligibility review must assess the adapted Skill Pack workflow and unchanged draft planning status. Actual learner feedback, mobile/desktop visual QA and publication remain open; these do not block private code tests.
