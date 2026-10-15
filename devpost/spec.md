---
doc: spec
status: implementation-verified
---
# BriefReady — Technical Spec

## How This Works, In Plain Language
The page keeps a worksheet in the browser. A small set of local rules separates brief lines into deliverables and acceptance checks. You review every suggestion. Nothing calls a language model or sends a brief to a server. JSON saves all editable fields; Markdown produces a readable handoff.

## The Core Journey Through the System
Implements `prd.md > The Core Journey`: form text enters `generate`; a validated worksheet is rendered with DOM text nodes; edits pass through `update`; validated state is written to browser storage; export uses the same validation and imports are validated before confirmation.

## Stack
Buildless HTML, CSS and classic JavaScript, with a UMD core also consumable by Node's built-in test runner. No runtime or test package installation. Node >=18 for tests, Python 3 optional for a static server.
Official references: https://nodejs.org/api/test.html and https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage.
The application needs no framework or runtime package installation; isolated Playwright QA dependencies are separate from the product.

## Where It Runs and How Someone Tries It
Open `dist/index.html` directly in a current desktop browser; all assets are local. File URL storage semantics vary: use a static origin for repeatable persistence. For ordinary local use: `python3 -m http.server 8000 --directory dist`, then open http://localhost:8000. Run `npm test` for core and static-structure checks. No install/build or keys required.
In the previously qualified Sites managed session, the required control-browser route was unavailable; this is not a claim that every browser surface is globally absent. Do not start an improvised preview server/browser in that environment. The separate standard GitHub Actions route executed actual Chromium functional/layout QA: [run 38653727493, attempt 1](https://github.com/Elinfiny/BriefReady/actions/runs/38653727493), 24/24 checks at 1440x900 and 390x844. Local setup instructions remain distinct from that observed CI session.
Public source and a publicly accessible YouTube/Vimeo demonstration are required for entry; a hosted deployment is optional. The real 150.36-second original video is preserved ([run 38720132677](https://github.com/Elinfiny/BriefReady/actions/runs/38720132677)). The [public repository](https://github.com/Elinfiny/BriefReady) and [public YouTube demonstration](https://www.youtube.com/watch?v=5q7kFEJNwDM) with selectable English captions were verified on 15 October 2026; this does not establish a completed entry or future availability.

## Look and Feel
Implements `prd.md > Look and Feel`: responsive two-column grid with a <=800px single-column breakpoint, min-width:0 fields, 44px controls and visible focus. Actual keyboard/modal focus, responsive overflow, storage and import/export behavior passed in the recorded GitHub run above. The original 1440x900 WebM was saved unchanged, then decoded in full by the same qualified Chromium in a separate non-recording context: 150.36 seconds, playbackRate 1, ended, 3,759 decoded frames, zero drops and no media error. Eight frames at 5/25/45/68/94/118/137/148 seconds were independently inspected. This sampled visual review is distinct from a full human viewing or an accessibility certification.

## Components
### Core and validation
`dist/core.js`: generate/validate/parse/export/progress/move/update. Implements `Draft from a brief`, `Review and complete`, `Save and hand off`.
### Worksheet UI
`dist/app.js`: DOM creation with textContent, accessible labels, delegated edit/click handlers, file-size check, replacement dialog and download links. No innerHTML from user data. Implements all PRD behaviors.
### Storage
Versioned localStorage key `briefready.v1`; validate before load/save. A corrupt stored value is left untouched until a deliberate new worksheet action. Failed save shows a warning. Implements `Save and hand off`.

## Data Model
Strict schema: `{version:1,title,brief,questions:string[],items:Item[]}`. Item: `{id,title,source,criteria:Criterion[],packed:boolean}`. Criterion: `{id,text,origin:'brief'|'suggested'|'user',done:boolean}`. Unique ID namespace across all objects, bounded sizes and cardinality; no permissive coercion. Draft text may be empty during editing but completion requires valid agreed text. No storage is a backup guarantee.

## File Structure
| Path | Purpose |
| --- | --- |
| dist/index.html, styles.css | Offline page and responsive styles |
| dist/core.js | Pure domain rules and import/export contract |
| dist/app.js | UI, storage and downloads |
| tests/core.test.cjs | Meaningful behavior and hostile import tests |
| tests/structure.test.cjs | Asset/DOM hook and runtime-network checks, not visual QA |
| devpost/ | Planning, skill provenance, app map, mechanical evidence |
| .agents/skills/ | Unmodified pinned Devpost Skill Pack instructions |

## External Services and Dependencies
Zero runtime services/dependencies, zero new API/model/spend. Existing host tooling is used for development only. Skill Pack is MIT, pinned in `skill-pack-provenance.json`; its MIT notice is preserved separately from application copyright.

## Important Failure Modes
- Bad or tampered import: reject the whole replacement before mutation.
- Storage unavailable/full/corrupt: honest warning, current data in memory, JSON export remains available.
- Ambiguous free text: preserve verbatim source, flag known vague words, require user review. No silent certainty.

## What Was Simplified and Why
Explicit acceptance prefixes and one-line deliverables keep offline transformation inspectable. This is not automatic semantic extraction and does not claim AI inference. One worksheet avoids accounts and synchronization.

## Decisions and Open Issues
The scope was explicitly approved on 15 October 2026. Source/code review, functional/layout/keyboard QA and the actual original demonstration are accepted technical evidence. The saved video used commit `3ee6eebc1b21dfb6f0832a3914f3d0e03fbad097`; its verified WebM SHA-256 is `3f4bb934dcbc5d7e32063caa5e3d6f9885f813b57dc6c240e1b142935dc0ae5a`. Technical checks do not attest personal eligibility, rights, required legal consent or submission. No graduation, client interview, personal hands-on or learning outcome is invented or imposed as an extra rule. Public source/video URLs are recorded above; personal/legal and entry actions remain pending; see `release.md` for the factual release checklist.
