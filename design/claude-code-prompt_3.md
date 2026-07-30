# Claude Code prompt — PathwayUSA redesign implementation

## Before you paste this

1. Save `pathwayusa-all-screens-annotated.html` into your repo at `design/redesign-spec.html` so Claude Code can open it.
2. Commit your current working state first, so every change below shows up as a reviewable diff.
3. Paste everything below the line into Claude Code from your project root.

---

I'm continuing work on PathwayUSA. We previously completed a security patch phase. This is a design and copy implementation pass.

There is a redesign spec at `design/redesign-spec.html`. Open it and read it fully before doing anything else. It contains twelve annotated screen mockups, each with a critique of the current implementation and the reasoning behind the proposed change. The mockups are HTML for illustration only — do not copy that HTML into the app. Translate the intent into our existing React Native components.

## Ground rules

Treat the current codebase as the source of truth.

- Do not rebuild the app or any screen from scratch.
- Extend existing components rather than duplicating them. Reuse existing styles, navigation, API calls, and state management.
- Do not install new dependencies without explaining why and getting my approval first.
- Do not change authentication, database schema, storage, or payment logic except where a phase below explicitly calls for it, and then only after I approve that phase.
- Every screen you touch must stay wired to real data. Do not leave mock data or placeholder values in place of real queries.
- Do not hard-code user-visible strings. Use the existing localization system.
- Preserve accessibility: icons always paired with text labels, status never conveyed by color alone, touch targets unchanged or larger, screen-reader labels intact.

Work one phase at a time. Stop at the end of each phase and report before continuing.

## Phase 1 — Copy and content removal

No engineering, no schema changes. Highest priority because it removes live legal and App Store review risk.

Find and remove or rewrite:

1. The statistics bar showing "2.1M+ Naturalized", "15K+ Resources", "500+ Attorneys" on the home screen. Remove entirely unless I can supply verified sources.
2. The "Ana L., Los Angeles, CA" success story card with the five-star rating and avatar. Remove entirely.
3. In the Legal/Attorney screen: delete the line "Increase your approval chances significantly". We cannot claim to affect immigration outcomes.
4. In the Legal screen: replace the "USCIS Compliance" label under Verified Attorneys. If we verify state bar standing, say that. If we do not currently verify anything, remove the trust badge entirely and tell me.
5. In the Legal screen: remove "Real-Time Updates / Stay informed" — we do not control USCIS timing.
6. On the roadmap step card: change "Est. time: Study 2–3 months before interview" to "Most people study 2–3 months". Apply the same treatment to any other estimate phrased as a statement about the user's own case.
7. Find every empty state currently rendering a bare em-dash (for example "— days since you started", "— gathered this step") and replace with a real zero-state sentence.

Report: every file changed, every string changed, and any instance where you found a similar claim I did not list.

## Phase 2 — Color and token consolidation

Establish one semantic color system and apply it app-wide.

- Teal: progress, completion, primary actions, "on" states.
- Amber: time-sensitive information — expiring documents, upcoming deadlines, pending stages.
- Red: errors and destructive actions only. Never for an enabled setting.
- Neutral gray: everything else, including all "off" states.

Specific fixes:

1. Notification toggles currently render in orange, green, red, teal, and gray. Unify: teal for on, gray for off.
2. Remove the indigo/purple used by App Lock. It appears nowhere else in the brand.
3. Remove the decorative color assignments on the home screen tile icons and the resource category tiles.
4. Replace the orange-to-red gradient on the Daily Challenge banner. It is currently the loudest element in the app and it points at a feature, not an emergency.
5. Remove the pink gift icon on Refer Friends.

Audit for any remaining hard-coded color values outside the token file and report them. Do not silently change brand teal or navy.

## Phase 3 — Home screen restructure

See section 1 of the spec. Rebuild the home screen hierarchy using existing components.

Target structure, top to bottom:

1. Eligibility countdown as the hero, in the navy header. Computed from the user's green card date: five years, or three if married to a US citizen, minus the ninety-day early filing window. If no green card date is stored, this space becomes a single prompt to add one — that is the highest-value action a new user can take.
2. One "today" card: current step, one sentence of context, one primary button.
3. The voice control bar (Phase 7 will make it functional; for now it can be present and disabled, or hidden behind a flag).
4. One time-sensitive alert if applicable, amber.
5. Three list rows: documents, full path, find help.

Remove from home: the duplicate "Your Path to Citizenship" progress card, the second CTA button, the six-tile grid, the badge counter, the horizontally scrolling journey cards, the dark bottom CTA banner.

Confirm the countdown math with me before wiring it up. Getting an eligibility date wrong is a serious harm, not a UI bug.

## Phase 4 — Navigation and information architecture

1. Rename the "Guide" tab to "Path" and make the screen title match. Currently the tab says Guide and the screen says My Roadmap.
2. Bottom tabs become: Home, Study, Path, Documents, Help. Legal moves into Help or Settings — confirm with me which.
3. On the Path screen, collapse the Steps / Timeline / Tasks tabs into a single continuous list: completed steps as dimmed single lines, active step expanded, future steps visible but locked.
4. Remove the progress card and eligibility card duplicated from Home.
5. On the Study screen, remove the Quiz / Tips / Stats / Guide header tabs. They duplicate the bottom navigation.

## Phase 5 — Settings restructure

Collapse the current flat list into four groups, each opening a sub-screen: Language and voice, Reminders, Privacy and app lock, My immigration profile.

- Move Cost Calculator, Immigration Glossary, and FAQ under Help and support.
- Convert the "Upgrade to Pro" row into a card that states what the plan includes.
- Reconcile the subscription price with the landing page. They currently disagree. Tell me which is correct before changing either.
- On the language screen: remove the country flags. Use language names in their own script.
- Verify whether Haitian Creole is genuinely complete. If the translation or its audio is not finished, change the label to reflect its real state.

## Phase 6 — Notification safety

1. Split reminders into essential (deadlines, document expiry, eligibility milestones, case status) and optional (daily study nudge, immigration news).
2. Remove the redundant in-app "Notifications On" master toggle — that is the OS permission.
3. Remove "Inactivity Reminders". Guilt-nudging users about immigration progress they may not control is a manipulative pattern.
4. Audit every notification payload. No notification body may contain case details, document names, form numbers, or immigration status. Lock-screen text stays generic; details appear only after unlock. Report any current notification that violates this.

## Phase 7 — Voice layer

Do not start this until phases 1–6 are approved.

1. Audio is pre-generated and stored, not synthesized live per request. Roadmap step content is fixed; generate once, cache, serve.
2. The play control appears in the same position on every screen.
3. Voice reads step content and question text. It does not read interface chrome.
4. Written text stays visible while audio plays. Voice is never the only path to information.
5. Never auto-play. A phone that starts speaking about immigration status in public can put someone at risk.
6. Cache the current step's audio for offline use.
7. English first. Do not ship Haitian Creole audio until it has been reviewed by native speakers.

Propose the implementation approach and cost model before writing code.

## Phase 8 — Deferred, needs separate approval

Do not begin any of these without a specific go-ahead:

- Per-question topic tagging in the database, which the study readiness diagnostic depends on.
- The documents screen with expiry tracking and secure storage.
- Case status tracking by receipt number.
- The scoped assistant. When we get there, it must hard-refuse case-specific eligibility questions and route them to a licensed attorney — that is a code-level constraint, not a prompt instruction.

## Reporting format

At the end of every phase, give me:

- What changed and why
- Exact files modified
- Components reused versus created
- Any backend, schema, or dependency impact
- Lint, type check, and build results
- Manual testing steps
- Rollback instructions
- Anything you found that I did not ask about but should know

Then stop and wait for my approval before the next phase.

Start with Phase 1.
