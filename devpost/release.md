# BriefReady — release and judging instructions

## What it does

BriefReady turns a freelance brief into an editable, source-linked delivery worksheet. Small jobs can begin with a short request and end with uncertainty about what is ready to deliver. The worksheet keeps the original request beside deliverables, acceptance checks and a separate package-prepared status.

Paste one deliverable per line with explicit `Accept:` requirements below it, or use the labeled synthetic example. Each card retains its source excerpt. The draft follows deterministic line rules, keeps unassigned requirements visible as questions and does not invent missing requirements.

Edit and arrange the cards before relying on them. Changing a checked criterion clears its old verification; suggested checks need meaningful editing before verification. A package can be marked prepared only after its checks are complete. These are working records, not automatic client approval.

Export Markdown for a readable handoff and JSON for an editable copy. Import validates the worksheet and asks before replacement: cancel preserves current edits, confirm restores the saved worksheet. Browser storage supports reloads; retain JSON because browser data can be cleared or unavailable.

The application runs offline after its local files are available, using HTML, CSS and JavaScript without accounts, backend, runtime packages or app network requests. Storage and exports are unencrypted: this is not a vault or a managed backup service. No customer adoption, measured time savings or absolute novelty is claimed.

## Setup and testing

1. Obtain the [public BriefReady repository](https://github.com/Elinfiny/BriefReady); public access was verified on 15 October 2026.
2. Open `dist/index.html` in a current browser. No install, build, API key or account is required.
3. For repeatable storage on a stable local origin, optionally run `python3 -m http.server 8000 --directory dist` and open `http://localhost:8000`.
4. Load the synthetic example and draft the worksheet. Compare the cards with the source. Edit and check a criterion, then edit it again to see the old checkmark clear.
5. Reorder a card, complete its checks and mark its package prepared. Export actual Markdown and JSON.
6. Change the title, select the saved JSON, cancel once, then import again and confirm to restore. Reload on the same origin. Keep the exported JSON if storage is refused or cleared.
7. Optional core checks: Node >=18 and `npm test`, using the built-in test runner. The existing 24 browser checks and original video are evidence already recorded, not newly run by this documentation update.

## License and provenance

Application source is MIT, with the existing `LICENSE` retained. The application began in an empty project folder on 14 October 2026 during the submission window; no other portfolio application's source was reused.

Pre-existing incorporated material is the Devpost Learn Skill Pack, pinned to `challengepost/learn-ai-basics@a0f065781873e8a7ed9a9a705a8dafa6a0810439`: fourteen curriculum files under `.agents/skills/`, with its MIT notice and provenance under `devpost/`. Planning documents are `scope.md`, `prd.md` and `spec.md`. The scope was approved on 15 October. No graduation, learner interview or personal learning testimonial is invented.

QA-only dependencies are `playwright` and `playwright-core` 1.64.1, Apache-2.0, integrity pinned in `qa/package-lock.json`. They are separate from the dependency-free application; no installed browser/dependency binary bundle is distributed as the app.

## Evidence against the four equally weighted judging criteria

| Criterion | Specific claim | Existing evidence and limits |
| --- | --- | --- |
| Design | A coherent brief-to-verification-to-handoff journey | 24 browser checks across desktop/mobile; eight original demo scenes. Not universal accessibility certification. |
| Potential Impact | Makes a specific freelancer handoff problem visible | Source excerpts, reset-on-edit verification and portable exports are demonstrated; adoption and measured impact remain untested. |
| Innovation/Idea | Combines source-linked work, wording-sensitive verification and packaging in one offline worksheet | Core implementation and the original demo at 35–105 seconds; no absolute novelty or prior-art exclusion claim. |
| Presentation | A real end-to-end demonstration with an English explanation of the audience, problem and value | 150.36-second original WebM, now public on YouTube with a selectable eight-cue English captions track; full runtime playback and eight independently sampled frames. No continuous human viewing claim. |

## Recorded evidence

- Application baseline: `570400c02e23766aec3b3062c37158bea1faff1a`.
- [Browser QA, run 38653727493, attempt 1](https://github.com/Elinfiny/BriefReady/actions/runs/38653727493): 24/24 checks.
- [Original demo, run 38720132677, attempt 1](https://github.com/Elinfiny/BriefReady/actions/runs/38720132677), captured at `3ee6eebc1b21dfb6f0832a3914f3d0e03fbad097`: saved original WebM SHA-256 `3f4bb934dcbc5d7e32063caa5e3d6f9885f813b57dc6c240e1b142935dc0ae5a`, 14,701,113 bytes.
- Observed playback: 150.36 seconds, 1440x900, rate 1, ended, 3,759 decoded frames, zero dropped frames and no media error, in a separate non-recording context of the qualified Chromium.
- Independent sampled visual review at 5/25/45/68/94/118/137/148 seconds. English captions are a separate eight-cue file, not embedded audio or narration.

## Public entry status

The technical proof of concept and original demo are complete. The [repository](https://github.com/Elinfiny/BriefReady) and original [YouTube demonstration](https://www.youtube.com/watch?v=5q7kFEJNwDM) are public, with selectable English captions, as verified on 15 October 2026. The project was submitted to Build With AI: Basics on 15 October 2026 (entry 1238870; software 1484451), following the required Owner-confirmed attestations. The actual entry was verified as Submitted with 5/5 steps complete on 16 October 2026; its video link was updated to the narrated demonstration below. A narrated demonstration was published on 16 October 2026: [BriefReady — A clearer brief. A calmer handoff.](https://www.youtube.com/watch?v=vMYB0lGgKr0), 1:55, with English narration and an imported 28-cue English captions track. YouTube Studio confirmed Public, and the signed-in watch page exposed English separately from English (auto-generated). On 16 October 2026, the existing Submitted entry (1238870, 5/5 steps complete) and public project page were verified with this narrated video. An independent anonymous HTTP check returned 200 and public playability OK for the same video, with a manual English track distinct from automatic captions. Decoded full playback in an anonymous browser and byte-exact served SRT contents were not assessed. Future access through the judging period remains an obligation, not a proven future fact. The technical evidence does not supply those attestations. Optional personal learning activities are not added as extra contest gates.

The [official rules](https://learn-ai-basics.devpost.com/rules) require public source with setup/license and a public English demonstration under three minutes; a separately hosted app is optional. Submission deadline: 26 October 2026, 21:00 UTC / 23:00 Europe/Bucharest. Keep free judging access until 30 October 2026, 21:00 UTC. No award outcome is promised.
