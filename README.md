# BriefReady

A brief becomes an editable, source-linked delivery worksheet for freelance handoffs. Functional/layout QA passed 24/24, and a real 150.36-second demonstration was recorded and verified at 1440x900. The technical demonstration has been independently reviewed. Application baseline: `570400c02e23766aec3b3062c37158bea1faff1a`; the original video used `3ee6eebc1b21dfb6f0832a3914f3d0e03fbad097`. Later documentation commits do not change those evidence baselines. See [release notes and judging instructions](devpost/release.md).

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

Planning artifacts are `devpost/scope.md`, `devpost/prd.md`, `devpost/spec.md`, structured using the retained Devpost Learn Skill Pack. They document this proof of concept and its scope. No course graduation, learner interview or personal hands-on activity is claimed or added as a separate entry requirement. Personal eligibility, rights and required form attestations remain distinct from technical validation. `devpost/learner-profile.md` is ignored and must not be published.

The product scope was explicitly approved on 15 October 2026. This confirms the intended features; it does not supply personal eligibility, legal consent or unperformed learning attestations.

The original demonstration is preserved privately with its metadata: [run 38720132677, attempt 1](https://github.com/Elinfiny/BriefReady/actions/runs/38720132677). A separate non-recording Chromium context played the saved original to its end: 150.36 seconds, 1440x900, 3,759 decoded frames and no dropped frames or media error. Eight sampled frames were independently reviewed; this is not a claim of continuous human viewing. The eight-cue English captions were published as a selectable YouTube track, separate from the preserved original.

Public repository: [Elinfiny/BriefReady](https://github.com/Elinfiny/BriefReady). Public demonstration: [BriefReady on YouTube](https://www.youtube.com/watch?v=5q7kFEJNwDM), with English captions. Public access was verified on 15 October 2026. The project was submitted to Build With AI: Basics on 15 October 2026 (entry 1238870; software 1484451), with the required Owner-confirmed attestations. Submission status and the existing video link were verified in the actual entry on 16 October 2026. A narrated replacement remains private and has not replaced the public demonstration. A hosted deployment is optional; public assets do not establish a completed entry or guarantee future availability. Application license: MIT; curriculum license retained separately.
