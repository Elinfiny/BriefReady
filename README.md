# BriefReady

Private proof of concept: a brief becomes an editable, source-linked delivery worksheet. Current status: private candidate; source/import/merge independently reviewed and real-browser functional/layout QA passed 24/24. Application baseline: `570400c02e23766aec3b3062c37158bea1faff1a`; this is a source baseline, not a claim that later documentation commits share that SHA.

## Run

Open `dist/index.html` in a current browser. All application assets are local and no install, build, key or account is needed. Browser storage on file URLs varies by browser. For repeatable storage on your own development machine, run:

```sh
python3 -m http.server 8000 --directory dist
```

Then open `http://localhost:8000`. This command is a setup instruction, not evidence that a preview was run in the managed execution environment.

## Use

1. Paste one deliverable per line; place `Accept:` requirements below it. `Deliverable:` is optional. Alternatively, use the labeled synthetic example.
2. Draft the worksheet. Compare every card with its brief excerpt; clarify flagged vague wording.
3. Edit titles and acceptance checks. Suggested checks must be edited before they can be marked verified. Add, remove and reorder deliverables as needed.
4. Verify the checks and mark each delivery package prepared. These are self-reported statuses, not client approval.
5. Export Markdown for a handoff; save JSON to resume elsewhere. Imports and regeneration ask before replacing an existing worksheet.

Draft generation is a small deterministic line parser. It does not infer unstated requirements, split paragraphs semantically, or call a language model. Long lines are rejected with a limit error rather than silently truncated; split them into shorter deliverables. Acceptance lines before a deliverable are kept as unassigned questions.

## Check

Node >=18:

```sh
npm test
```

No dependency installation is required. Tests cover transformation, completion invariants, source preservation, reorder, JSON round-trip, hostile/oversized input and static asset/DOM hooks. Static checks do not prove browser rendering, focus behavior, download completion or localStorage behavior. Real Chromium functional/layout QA passed 24/24 at 1440x900 and 390x844 in [run 38653727493, attempt 1](https://github.com/Elinfiny/BriefReady/actions/runs/38653727493), including keyboard/modal focus, storage, real JSON/Markdown downloads and rejected/reimported JSON. These executor checks were accepted by the Auditor; they are not a human visual inspection or learner hands-on review.

## Privacy and limits

The runtime makes no network calls. Browser storage and exported files are unencrypted; do not treat them as a secure vault. Use synthetic data in the demo. Browser data can be cleared: export JSON before relying on a worksheet. Closing before drafting does not save unsubmitted brief edits. No backup/restore service, hosted deployment or multi-user sync exists.

## Provenance and review

All application code was written from an empty project folder during the contest period. No portfolio application code was reused. The MIT Devpost Learn Skill Pack is installed unchanged under `.agents/skills/`, pinned to `a0f065781873e8a7ed9a9a705a8dafa6a0810439`; provenance and its original license are in `devpost/`. The only incorporated pre-existing material is this curriculum, not application code.

Planning artifacts are `devpost/scope.md`, `devpost/prd.md`, `devpost/spec.md`. They remain draft: this private build followed explicit delegated execution instructions, without inventing learner interviews, displayed approvals, learning outcomes or a completed guided curriculum. Independent eligibility review must assess that adaptation before publication/submission. `devpost/learner-profile.md` is ignored and must not be published.

On 15 October 2026 at 10:44:54 Europe/Bucharest, Marius explicitly approved the displayed product scope with “da”, recorded in the private project checkpoint. This is prospective scope approval only; it does not retrospectively approve every planning document or certify an interview, learning activity, hands-on review or personal eligibility.

The imported source is in the private Elinfiny/BriefReady repository. Public publication, deployment, registration and submission have not been performed. A public repository and real short demonstration video remain required for entry. Application license: MIT; curriculum license retained separately.
