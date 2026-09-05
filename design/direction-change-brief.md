# PathwayUSA — direction change brief

Four phases. Do them in order. Stop and report after each.

---

## Phase A — Revert the visual refresh

The bold typographic redesign from the last session is being reversed. The app returns to the simpler, flatter design that preceded it.

This is a git operation, not a redesign. Find the commit(s) that applied the visual refresh — display typeface, enlarged heading scale, gradient hero component, card elevation, icon chips, pill buttons — and revert exactly those.

**Do not** revert or touch:
- The semantic colour system (teal = progress, amber = time-sensitive, red = errors only)
- Any Alert.alert web fixes
- The auth redirect fixes
- Document upload and signed-URL storage
- The countdown gating logic
- Any backend, schema, or data work

If the refresh is tangled into commits containing functional fixes, do not revert those commits wholesale. Identify the visual changes and reverse them specifically, leaving the functional work intact.

Design targets after revert: mobile-first, minimal clutter, large obvious buttons, clear progress indicators, plain language, icons always paired with text, generous touch targets. Accessible to someone with limited English who is not confident with phones.

Report which commits you reverted and confirm both web and iOS builds pass. Then stop.

---

## Phase B — Data model

Before writing any onboarding UI, design the schema. Onboarding built before the data model gets rebuilt later.

Store immigration facts as discrete, reusable, typed fields — not as a blob of questionnaire answers. The engine, the roadmap, the documents screen, and the countdown all need to read the same facts.

Tables needed, at minimum:
- User profile
- Immigration facts (one row per user, typed columns)
- Onboarding responses (raw answers, for audit and resume)
- Pathway definitions (data, not hardcoded logic)
- Pathway match results
- Active pathway
- Roadmap steps
- Documents
- USCIS cases
- Tasks and deadlines

Design so a new pathway can be added as data without touching onboarding code.

### Security requirements — non-negotiable

This schema will hold facts that could contribute to someone being removed from the United States: entry without inspection, visa overstay, removal orders, asylum applications, A-Numbers.

- Every table gets RLS restricting rows to their owner. No blanket policies. Verify each one by testing as a second authenticated user, not by reading the policy.
- No service-role access from the client under any circumstance.
- A-Number and USCIS account number are identifiers, not ordinary fields — treat them at the same sensitivity as the document vault.
- Nothing from this data may appear in logs, analytics, error reports, or notification bodies.
- Before implementing, tell me which fields you believe should be **asked but never stored** — where the engine can act on an answer in-session, route the user to legal help, and discard it. Removal orders and criminal history are the obvious candidates. I want your recommendation before you build the schema.

Existing user data must be preserved or migrated. No destructive changes.

Report the proposed schema and your not-stored recommendation. Then stop.

---

## Phase C — Onboarding

Multi-step intake. One question or one tight group per screen. Progress indicator ("Step 3 of 9"). Conditional branching so nobody answers irrelevant questions. Save-and-resume at every step.

Collect, with branching:
- Country of birth, country of citizenship, age or date of birth, currently in the US
- First entry date (exact or approximate), time in the US, most recent entry method and date, visa type if applicable
- Current immigration status, with follow-ups per status (green card start date, visa category and expiry, etc.)
- What they want to accomplish (multi-select)
- What they need most help with (multi-select)
- Pathway-relevant facts, conditionally: marital status, spouse status, parent and child status, prior petitions, pending cases, A-Number, employer sponsorship, humanitarian status, overstay, proceedings, time abroad

### Rules

**"I don't know" is a first-class answer on every question where it makes sense.** Selecting it never blocks progress. It creates a roadmap task instead ("Find your immigration status", "Locate your most recent immigration document").

**Sensitive questions carry a one-line explanation of why we're asking**, written in plain language, before the question.

**Plain language throughout.** No unexplained acronyms. If a term like "adjustment of status" is unavoidable, define it inline.

**Conditional logic is mandatory.** Do not ask a single person every question on the list.

Report the flow structure before building screens. Then stop.

---

## Phase D — Pathway engine

Evaluates stored facts against pathway definitions. Not a lookup table keyed on what the user says they want — users often don't know what they qualify for.

Every pathway resolves to exactly one of four states:

1. **Potentially relevant** — with the specific facts that produced the match, shown to the user
2. **More information needed** — with the specific missing facts
3. **Does not appear relevant** — with the reason
4. **Requires professional review** — routes to legal help and stops

### Hard rules

- Never output a single pathway. Always show all potentially relevant options separately.
- Every match displays the facts it rests on. The user must be able to see the reasoning is mechanical.
- Never state or imply that someone qualifies, will be approved, or is eligible. Only that a pathway exists and what it requires.
- The following facts route to state 4 and the engine stops evaluating: prior removal order, current or past removal proceedings, any criminal history, prior immigration denial, unlawful presence bars, prior fraud or misrepresentation findings. These are not edge cases — a wrong answer here can permanently damage someone's case.
- Pathway definitions live in data, not in code branches.

### Result screen

"Based on the information you provided, here are the pathways that may be relevant to you." Each pathway shown separately with its reasoning and an "Explore this pathway" action. Where information is missing, say what's missing rather than guessing.

The existing citizenship roadmap becomes the first pathway definition. It must keep working for users already on it.

---

## Keep USCIS integration modular

Structure case-status and USCIS-adjacent services behind an interface so official integrations can be connected later. Build no fake integrations and assume no private USCIS account access exists.

---

## Throughout

Do not rebuild working systems. Do not delete features because they aren't part of onboarding. Preserve the existing roadmap, documents, completion tracking, and subscription logic. Migrate rather than drop. Report after every phase and wait for approval.
