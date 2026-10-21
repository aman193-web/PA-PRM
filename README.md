# PRM partner portal

A compact partner sales workspace with connected lead qualification, deal registration, and Salesforce opportunity tracking.

## Run locally

```sh
python3 -m http.server 4173 --bind 127.0.0.1 --directory dist
```

Open http://localhost:4173. The application is buildless; no dependency installation is required. All interface assets are bundled locally.

## GitHub Pages deployment

Push to `main` to run the workflow checks and publish `dist/` using GitHub Actions. Configure the repository's Pages publishing source as **GitHub Actions**. No external services, secrets, package installation, or build step are required.

This is a public static demo when hosted with GitHub Pages. Sign-in and Salesforce are simulations; use fictional customer data only. Business records stay in each browser's localStorage and are not uploaded with source or shared across devices.

## Vercel deployment

Import this repository with Root Directory set to the repository root (`.`). The committed `vercel.json` selects Other, skips installation/build, and serves `dist/`. Redeploy the latest commit after changing settings. Routing uses URL fragments, so no catch-all rewrite is required.

## Connected sales journeys

One journey, three distinct records:

1. **Lead:** a potential customer, found by the partner or sent by the vendor. The partner works it and qualifies it with BANT.
2. **Deal registration:** the partner's request to register a specific opportunity with the vendor. The partner manager approves or rejects it; approval protects the deal for 90 days.
3. **CRM opportunity:** created in vendor Salesforce when a registration is approved. The partner tracks it through Discovery, Proposal, Negotiation, and Won or Lost.

Lead and deal drawers show this journey as a three-step strip, so it is always clear which record you are looking at.

- **My Leads (lead registration):** customers the partner found. Save a draft or Submit for approval. The vendor approves a registration when no other partner has registered the customer and it is in territory, then protects it for the partner for 90 days. Vendor review can also return a lead as Needs information or reject it (duplicate or outside territory). Update & resubmit sends corrected information and a new review request together.
- **Assigned Leads (lead distribution):** customers the vendor sends. Accept within 48 hours, or decline with a reason so the vendor can reassign the lead. After accepting, make first contact within 3 days.
- **Working and qualification (both kinds):** logging a call, email, or meeting moves an Approved or Accepted lead to Working. The partner qualifies the lead with BANT (budget confirmed, decision maker identified, need confirmed, purchase timeline within 12 months); BANT progress can be saved at any time after approval or acceptance, and Mark as qualified requires contact plus all four. Qualified customer identity is locked; contact name and job title remain editable until a deal is linked. Notes and follow-ups alone do not start Working. Activities and completion updates synchronize to the same CRM record; overdue follow-ups appear in the next-step guidance.
- **Register deal (natural language):** from a qualified lead, or directly with Register a deal. Step 1, describe the deal in your own words (product, amount, close date, contact); Extract details fills in the registration. Step 2, review the filled-in fields: chips show whether each value came from your text or from the lead, and Add this marks anything missing. Customer identity from a lead stays locked. Step 3, confirm the summary, confirm the customer need and sharing permission, then Submit registration or Save draft. Fill in a form instead skips extraction. The lead then shows as Converted. Extraction is a simulated, pattern-based assistant that runs in the browser; nothing is sent anywhere. It returns the same shape a real AI service would, so it can be swapped for one later.
- **Deal Registrations:** Draft, Pending approval, Approved, Rejected, and Withdrawn. The partner manager reviews each registration (or automatic review approves those under $250,000 in supported territories). Approval creates or links the CRM opportunity.
- **CRM Opportunities:** approved registrations only, by opportunity stage. Move forward through Discovery, Proposal, Negotiation, and Won, including skipping stages; move any open opportunity to Lost. Update value or expected close without moving stages. Won requires an actual amount, a close date no later than today, and an outcome note; revenue uses the actual amount while retaining the previous estimate. Lost requires a loss category and outcome note.

Never-submitted drafts can be deleted with confirmation. Leads that are pending approval, need information, approved, accepted, working, or qualified can be closed with a reason and note when no active registration is linked. Pending or rejected registrations can be withdrawn, including a revised draft previously submitted to CRM. Closed leads and withdrawn registrations are read-only. A qualified lead can be registered again after rejection or withdrawal. Approval received before a withdrawal is processed produces a conflict: close the approved opportunity as Lost instead.

Qualification, registration approval, and winning an opportunity are distinct. Leads never become Won directly. A converted lead keeps its Qualified status in Salesforce, displays as Converted, and links to the separate registration and opportunity.

Seven starter leads are shown: five partner-created (two Draft, one Pending approval, one Approved, and one Qualified) and two vendor-assigned (one New assignment and one Working). Browsers with data from the earlier lead flow are upgraded once: Contacted and Qualification requested become Working, Disqualified becomes Rejected, and queued vendor-qualification requests are retired with a history note. Redundant untouched examples are retired once. User-created or edited records are retained. Earlier portal data is preserved in `sales.legacyArchive`; imported leads start as drafts because old preview statuses do not establish real CRM qualification or approval.

## Partner manager portal

`manager.html` is the vendor side of the flow, for one role: the partner manager. It is a separate portal: neither portal links to the other. Open `manager.html` directly and sign in as the demo manager (Riley Chen); sign-in lands on Overview. Pages:

- **Overview:** awaiting-decision count (lead and deal registrations), partner-sourced open pipeline, closed-won revenue and win rate, and response-time status; Needs your attention (registrations to decide, oldest first, then declined or overdue assignments, each with its action); pipeline (lead flow by stage and open opportunities by stage); partner performance against annual targets; and recent partner activity.

- **Lead reviews:** partner registrations waiting for a decision, oldest first. Each review runs the registration checks against every partner's records — duplicates (an exact active match blocks approval; similar names, shared email domains, and the partner's own open opportunities are flagged), territory, contact details, customer-need detail, and sharing permission — and recommends a decision. Approve (90-day protection), Return for information with a message, or Reject with a reason (Duplicate, Outside territory, Not a fit for the program, Other).
- **Deal registrations:** partner deal registrations waiting for a decision, with checks for conflicting registrations or opportunities from any partner, evidence (a qualified lead, or a confirmed customer need for direct registrations), territory, deal size (from $250,000), and close date. Approve (creates the CRM opportunity at Discovery and protects the deal for 90 days) or Reject with a reason the partner sees. Recently decided registrations show their CRM opportunity stage. Deep link: `manager.html#registration/<REG id>`.
- **Lead distribution:** assign a vendor lead to a partner, track the 48-hour acceptance and 3-day first-contact windows, and reassign leads that were declined or not accepted in time.
- **All partner leads:** every partner's leads with stage, BANT progress, activities, and your decision log. Filter by stage group and partner.
- **Opportunities:** every CRM opportunity created from approved registrations, with totals per stage (Discovery, Proposal, Negotiation, Won, Lost) and stage and partner filters. Opportunity details show the stage path, value, protection, and the source deal registration.
- **Partners:** the program directory with tier (Platinum, Gold, Silver), type, territory, primary contact, open pipeline, closed won, active leads, win rate, and progress to the annual sourced-pipeline target. A partner's details add lead acceptance and list their leads and opportunities; Assign a lead preselects that partner.

The top bar has Search (Command/Ctrl+K; partners, leads, registrations, and opportunities) and Partner activity (a feed of submissions, contacts, acceptances, and your decisions). Vendor-side demo data for Northbridge Consulting and Cobalt Systems is added once, so the program looks realistic; partner portals never see other partners' records.

Approval mode is manual by default. Turning on automatic review decides registrations by the program rules below instead.

Both portals share the browser-local simulated Salesforce, and stay connected live: with each open in its own tab, a partner submission appears in the manager's queue at once, and a manager decision or assignment syncs into the open partner portal immediately, with a notification (like a CRM webhook). A partner who is mid-form keeps their input; the screen refreshes after they finish.

## Salesforce simulation

This is an explicitly labeled browser-local simulation. It does not connect to Salesforce, Google, email, or any other external customer system. The simulated CRM stores canonical records separately from the portal's confirmed snapshot, plus a durable outbox and idempotent operation results.

Submitted updates remain pending until a successful sync. Failed requests retain their proposed values for inspection and retry. Refresh receives the next simulated vendor review. Conflicting customer edits or stale opportunity stages produce an actionable error; discarding the failed request restores the latest confirmed CRM values. Independent CRM changes are preserved.

Demo behavior:

- With automatic review on, partner lead registrations are decided on the partner's next sync: other territory is rejected, a customer already registered in vendor Salesforce is rejected as a duplicate (without revealing the other partner), a customer need under 20 characters returns Needs information, and everything else is approved with 90-day protection.
- Registrations below $250,000 in supported territories auto-approve after validation and duplicate checks. Larger amounts wait for vendor review. Other territories are reviewed and rejected, with a revision path.
- `Evergreen Systems / Sales Cloud` demonstrates a duplicate conflict without revealing another partner's records.
- `Northstar Services / Sales Cloud` demonstrates linking an existing authorized opportunity and retaining its canonical values.
- Connection failures preserve saved requests. Retry recovers them after connectivity returns. Automated tests also inject a deterministic failure in the mock CRM; there are no failure-testing controls in the partner UI.

Data persists in browser localStorage under `minute-v1`. Deploying the static application does not upload browser business records; localhost and the hosted origin have separate storage. The mock partner filters apply to lists, details, mutations, search, notifications, and export. These are not a production security boundary. Production requires server authorization, real authentication, OAuth, CRM APIs/webhooks, and durable server persistence.

## Interface

The existing PRM blue/orange palette, compact Tabler components, light sidebar, welcome animation, and centered onboarding remain. Every refresh starts at welcome (Continue with Google, Microsoft, or SSO, or email; all are demo sign-ins), then the read-only program overview, then the dashboard. The partner's Salesforce is treated as already connected by the vendor: there is no connect step, it stays connected across refreshes, and submitting never redirects to Salesforce updates. A sync status chip in the header shows the state: Salesforce synced (with the time), Syncing, N updates waiting to sync, or Salesforce sync failed; clicking it opens Salesforce updates. Demo passwords are never stored or sent.

The dashboard is short: Register deal and Create lead, Your next actions (the one step that moves each lead or deal forward, up to six), and three counts (Leads in progress, Registrations awaiting approval, Open CRM opportunities).

Portal screens share one heading component and spacing tokens. The sidebar has one Leads entry. My Leads, Assigned Leads, Deal Registrations, and CRM Opportunities are tabs inside the sales workspace. Flow and list views share category, search, and status filters. Lead boards follow the lead lifecycle: My Leads shows Draft, Pending approval, Needs information, Approved, Working, Qualified, Converted, and Closed (including rejected); Assigned Leads shows New assignment, Accepted, Working, Qualified, Converted, and Closed (including declined). Draft lead columns display two cards; Pending approval and Closed columns display at most one card each; View all opens the complete filtered list. Lead cards show the lead rating and the most relevant deadline, protection period, or BANT progress. Lead details add a journey tracker and a BANT checklist; the lead form keeps optional details (job title, phone, website, industry, company size, timeline, rating, source) folded away and warns about a customer the partner already has an open lead for. New registration columns display at most two cards. Details show origin, destination, next action, canonical customer data, activities, follow-ups, and timestamped history. Dashboard totals, notifications, search, and CSV export use the same authorized records. Salesforce updates is a partner status/activity view with retry controls, not CRM configuration. Vendor administration and team-management controls are absent; company/program information is view-only.

Keyboard shortcuts: Command/Ctrl+K for search and Command/Ctrl+J for quick actions. Tables sort by column; boards and tables scroll horizontally on smaller screens. Forms have validation, errors, cancel actions, and saved-update feedback. Reduced-motion preferences are respected.

## Files

- `dist/sales-workflow.js`: partner-scoped state machine, canonical mock CRM, outbox, validation, duplicate checks, and review processing.
- `dist/deal-assist.js`: simulated natural-language extractor for deal registration.
- `dist/app.js`: shared page components, forms, navigation, details, notifications, and synchronization feedback.
- `dist/manager.html`, `dist/manager.js`: the partner manager portal (vendor side).
- `dist/theme.css`: compact responsive design tokens and components.
- `dist/vendor/`: local Tabler 1.6.1 stylesheet and MIT license.
- `tests/`: domain and UI-controller tests with a minimal DOM harness.
- `WORKFLOW.md`: workflow audit findings and walkthroughs.

## Verification

```sh
node --check dist/sales-workflow.js
node --check dist/app.js
node --check dist/manager.js
node --test tests/*.test.cjs
```

Tests cover both full journeys, the manager portal pages, filters, search, and activity, the three-step registration and its extractor, deal registration approval in the manager portal, sync status, sign-in options, qualification locks, draft deletion, close/withdraw/resubmit, actual won amounts and close dates, duplicate/link behavior, validation, sync failure/retry/discard, reload persistence, CRM concurrency, partner permissions, notifications, navigation, forms, search/export, and markup structure. UI tests exercise event handlers in a DOM stub; they do not substitute for browser layout, native form validation, drag, or accessibility-engine testing. Both portals were also checked in a browser during development.
