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

- **My Leads:** save a draft or use Save & submit to send customer details and consent to vendor Salesforce. Submission and qualification are separate states. Vendor review can qualify, request more information, or disqualify a lead. Update & resubmit sends corrected information and a new review request together. Qualified customer identity is locked; contact name and job title remain editable until an active deal is linked.
- **CRM Assigned Leads:** accept or decline an assignment. Log first contact records a Call or Email before requesting qualification. Notes and follow-ups alone do not mark a customer contacted. Activities and completion updates synchronize to the same CRM record; overdue follow-ups appear in the next-step guidance.
- **My Deals:** register a qualified lead or create a direct registration with confirmed customer need. Save & submit performs both steps. Approval creates or links a Salesforce opportunity. Move forward through Discovery, Proposal, Negotiation, and Won, including skipping stages; move any open opportunity to Lost. Update value or expected close without moving stages. Won requires an actual amount, a close date no later than today, and an outcome note; revenue uses the actual amount while retaining the previous estimate. Lost requires a loss category and outcome note.

Never-submitted drafts can be deleted with confirmation. Submitted or accepted leads can be closed with a reason and note when no active registration is linked. Pending or rejected registrations can be withdrawn, including a revised draft previously submitted to CRM. Closed leads and withdrawn registrations are read-only. A qualified lead can be registered again after rejection or withdrawal. Approval received before a withdrawal is processed produces a conflict: close the approved opportunity as Lost instead.

Qualification, registration approval, and winning an opportunity are distinct. Leads never become Won directly. The lead retains its qualification status and links to the separate registration and opportunity.

Four starter leads are shown: two partner-created and two CRM-assigned. Redundant untouched examples are retired once. User-created or edited records are retained. Earlier portal data is preserved in `sales.legacyArchive`; imported leads start as drafts because old preview statuses do not establish real CRM qualification or approval.

## Salesforce simulation

This is an explicitly labeled browser-local simulation. It does not connect to Salesforce, Google, email, or any other external customer system. The simulated CRM stores canonical records separately from the portal's confirmed snapshot, plus a durable outbox and idempotent operation results.

Submitted updates remain pending until a successful sync. Failed requests retain their proposed values for inspection and retry. Refresh receives the next simulated vendor review. Conflicting customer edits or stale opportunity stages produce an actionable error; discarding the failed request restores the latest confirmed CRM values. Independent CRM changes are preserved.

Demo behavior:

- Complete customer needs of at least 20 characters in supported regions qualify on the next refresh. Shorter descriptions request more information; unsupported territories disqualify.
- Registrations below $250,000 in supported territories auto-approve after validation and duplicate checks. Larger amounts wait for vendor review. Other territories are reviewed and rejected, with a revision path.
- `Evergreen Systems / Sales Cloud` demonstrates a duplicate conflict without revealing another partner's records.
- `Northstar Services / Sales Cloud` demonstrates linking an existing authorized opportunity and retaining its canonical values.
- Connection failures preserve saved requests. Retry recovers them after connectivity returns. Automated tests also inject a deterministic failure in the mock CRM; there are no failure-testing controls in the partner UI.

Data persists in browser localStorage under `minute-v1`. Deploying the static application does not upload browser business records; localhost and the hosted origin have separate storage. The mock partner filters apply to lists, details, mutations, search, notifications, and export. These are not a production security boundary. Production requires server authorization, real authentication, OAuth, CRM APIs/webhooks, and durable server persistence.

## Interface

The existing PRM blue/orange palette, compact Tabler components, light sidebar, welcome animation, and centered onboarding remain. Every refresh starts at welcome, then optional Salesforce connection and the read-only program overview. Connect later skips the connection and unlocks the dashboard. Partners can connect from Salesforce updates later; submitted updates remain queued until then. Demo passwords are never stored or sent.

Portal screens share one heading component and spacing tokens. The sidebar has one Leads entry. My Leads, CRM Assigned Leads, and My Deals are tabs inside the sales workspace. Flow and list views share category, search, and status filters. Draft columns display at most two cards; View all drafts opens the complete filtered list. Details show origin, destination, next action, canonical customer data, activities, follow-ups, and timestamped history. Dashboard totals, notifications, search, and CSV export use the same authorized records. Salesforce updates is a partner status/activity view with retry controls, not CRM configuration. Vendor administration and team-management controls are absent; company/program information is view-only.

Keyboard shortcuts: Command/Ctrl+K for search and Command/Ctrl+J for quick actions. Tables sort by column; boards and tables scroll horizontally on smaller screens. Forms have validation, errors, cancel actions, and saved-update feedback. Reduced-motion preferences are respected.

## Files

- `dist/sales-workflow.js`: partner-scoped state machine, canonical mock CRM, outbox, validation, duplicate checks, and review processing.
- `dist/app.js`: shared page components, forms, navigation, details, notifications, and synchronization feedback.
- `dist/theme.css`: compact responsive design tokens and components.
- `dist/vendor/`: local Tabler 1.6.1 stylesheet and MIT license.
- `tests/`: domain and UI-controller tests with a minimal DOM harness.
- `WORKFLOW.md`: workflow audit findings and walkthroughs.

## Verification

```sh
node --check dist/sales-workflow.js
node --check dist/app.js
node --test tests/*.test.cjs
```

Tests cover both full journeys, qualification locks, draft deletion, close/withdraw/resubmit, actual won amounts and close dates, duplicate/link behavior, validation, sync failure/retry/discard, reload persistence, CRM concurrency, partner permissions, notifications, navigation, forms, search/export, and markup structure. UI tests exercise event handlers in a DOM stub; they do not substitute for browser layout, native form validation, drag, or accessibility-engine testing. Browser visual inspection was unavailable because local-preview browser access was blocked by policy.
