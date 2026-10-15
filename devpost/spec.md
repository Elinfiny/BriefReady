---
doc: spec
status: draft
---
# BriefReady — Technical Spec

## How This Works, In Plain Language
The page keeps a worksheet in the browser. A small set of local rules separates brief lines into deliverables and acceptance checks. You review every suggestion. Nothing calls a language model or sends a brief to a server. JSON saves all editable fields; Markdown produces a readable handoff.

## The Core Journey Through the System
Implements `prd.md > The Core Journey`: form text enters `generate`; a validated worksheet is rendered with DOM text nodes; edits pass through `update`; validated state is written to browser storage; export uses the same validation and imports are validated before confirmation.

## Stack
Buildless HTML, CSS and classic JavaScript, with a UMD core also consumable by Node's built-in test runner. No runtime or test package installation. Node >=18 for tests, Python 3 optional for a static server.
Official references: https://nodejs.org/api/test.html and https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage.
This is an executor choice within the minimum-technology/no-backend authorization, not a learner-selected framework.

## Where It Runs and How Someone Tries It
Open `dist/index.html` directly in a current desktop browser; all assets are local. File URL storage semantics vary: use a static origin for repeatable persistence. For ordinary local use: `python3 -m http.server 8000 --directory dist`, then open http://localhost:8000. Run `npm test` for core and static-structure checks. No install/build or keys required.
In the previously qualified Sites managed session, the required control-browser route was unavailable; this is not a claim that every browser surface is globally absent. Do not start an improvised preview server/browser in that environment. The separate standard GitHub Actions route executed actual Chromium functional/layout QA: [run 38653727493, attempt 1](https://github.com/Elinfiny/BriefReady/actions/runs/38653727493), 24/24 checks at 1440x900 and 390x844. Local setup instructions remain distinct from that observed CI session.
Public repository and real video are both required for submission; deployment is optional. Neither is executed in this private slice.

## Look and Feel
Implements `prd.md > Look and Feel`: responsive two-column grid with a <=800px single-column breakpoint, min-width:0 fields, 44px controls and visible focus. Actual keyboard/modal focus, responsive overflow, storage and import/export behavior passed in the recorded GitHub run above. No screenshots or video were produced; human visual inspection and learner hands-on review remain open.

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
No learner uncertainty was collected; do not invent one. Validation-before-replacement will be demonstrated by rejection tests. Skill Pack interviews/sign-offs are adapted under Owner's explicit delegated private-execution instruction; docs stay draft. Independent source/code review and automated browser functional/layout/keyboard checks are accepted. Human visual/accessibility assessment, learner participation, actual demo video and personal eligibility remain open; automated checks do not certify them.
