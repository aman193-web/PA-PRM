# Lead-to-Deal workflow audit and walkthrough

## Gaps corrected

| Previous behavior | Corrected behavior |
| --- | --- |
| Leads could jump directly to registered or Won | Vendor qualification, registration decision, and opportunity outcome use separate state machines |
| Source/destination changes were disconnected from Salesforce | Partner introductions go to vendor Salesforce; CRM assignments return to the partner; linked deals retain their source lead |
| Sync changed only a timestamp | Canonical CRM records, queued operations, pending confirmations, failures, retries, and conflict handling |
| Qualification and opportunity updates shared one status | Separate My Leads, CRM Assigned Leads, and My Deals categories with distinct status labels |
| Free stage controls could imply vendor approval | No partner approval controls; review decisions come from mock vendor processing |
| Activity and notifications did not explain next actions | Record actions follow confirmed state; notes/follow-ups, history, notifications, and dashboard all use the same records |
| Partner view contained team administration | Program/company data is view-only; no vendor admin or team-management actions |
| Excess sample records crowded the board | Six initial leads, including two New and one Submitted example; created/edited records preserved |

## Partner-created lead to Won

1. Complete demo sign-in, connect Salesforce or select Connect later, view the assigned program, enter the dashboard.
2. My Leads → Create lead. Enter customer, contact, email, positive estimated value, supported region, customer need, source, and sharing permission. Select Save & submit, or Save draft to finish later.
3. Observe pending synchronization, then Submitted. The vendor CRM now has the lead. A saved draft can also be opened and submitted separately.
4. Refresh Salesforce. The vendor qualifies the lead. A notification links back to the record. Qualification does not create an opportunity.
5. Register deal. The source customer identity is retained; enter the opportunity name, product, expected close date (today or later), and customer-need confirmation. Select Save & submit, or save a draft first.
6. Eligible registrations approve and link to a Discovery opportunity. Larger registrations show Pending review first; Refresh receives the vendor decision.
7. Update opportunity → Proposal → Negotiation → Won, or skip directly to a later stage when appropriate. Open-stage updates can change value and expected close date without moving stages. For Won, enter the actual won amount, actual close date (today or earlier), and an outcome note of at least five characters. Each confirmed update appears in history and the canonical CRM opportunity.
8. The source lead remains Qualified; registration remains Approved; only the opportunity is Won. The original estimate is retained, and dashboard revenue reflects the actual won amount once.

## CRM-assigned lead to Lost

1. CRM Assigned Leads → Harbor Systems → Accept lead. Wait for Salesforce confirmation.
2. Log first contact → Call or Email. Record the discussion. The lead becomes Contacted after sync.
3. Add a Follow-up with a future date. Complete it when done. Both activity and completion synchronize.
4. Request qualification. Wait for Qualification requested, then Refresh for the vendor decision.
5. Register the qualified lead, submit, and receive approval or review as above.
6. Update opportunity → Lost. Choose Price, Competitor, No budget, No decision, Timing, or Other, then enter an outcome note of at least five characters. The source lead remains Qualified and registration Approved. Lost does not contribute to won revenue.

## Close, withdraw, and delete

- **Delete draft:** confirm deletion of a never-submitted local lead or registration. A linked registration draft is unlinked from its source lead. No CRM connection is needed for this local action. Submitted records and revised CRM registrations cannot be deleted.
- **Close lead:** partner-created leads can close from Submitted, Needs information, or Qualified. CRM-assigned leads can close from Accepted, Contacted, Qualification requested, Needs information, or Qualified. Choose Customer not interested, No budget, No response, Duplicate, Bought elsewhere, or Other, plus a note of at least five characters. An active linked registration blocks closing; an unaccepted Assigned lead uses Decline instead.
- **Withdraw registration:** withdraw Pending review or Rejected registrations, or a revised Draft that already has a CRM ID. Enter a note of at least five characters. A qualified source lead can then start another registration. If Salesforce has already approved the registration, withdrawal fails with a conflict; refresh the record and close the opportunity as Lost instead.
- Closed leads and Withdrawn registrations show the reason and no editing or activity actions. Vendor review jobs leave these terminal records unchanged.

## Exceptions and recovery

- Missing permission/contact/need/value prevents submission with an error. Save & submit retains the newly saved draft and keeps the form open for correction; retrying does not create another draft.
- Short customer needs receive Needs information. Update & resubmit saves corrections and requests review in one queued operation. After confirmation, partner leads are Submitted and CRM-assigned leads are Qualification requested; a later refresh receives the review result. The secondary resubmit action can resend unchanged information.
- Qualified lead company, email, region, estimated value, and customer need are locked. Contact name and job title can still be corrected. Once an active registration is linked, the lead is fully read-only. The same checks run against the canonical CRM record when queued edits synchronize.
- Log first contact offers only Call and Email. An ordinary Note or Follow-up on an Accepted lead leaves it Accepted and prompts the partner to log contact.
- Direct registrations in Other territories enter review, then rejection. Revise the territory and resubmit the same registration; history and ID remain.
- An existing local customer/product registration blocks duplicates. A conflicting private CRM registration returns a generic rejection without exposing the other partner.
- Use Northstar Services / Sales Cloud to link an existing opportunity, preserving its CRM value and stage.
- Temporarily go offline, then submit an update: the confirmed value stays unchanged, saved payload is inspectable, and Retry sends the same operation once. Discard restores confirmed CRM values.
- Edit a lead while offline, restore connectivity, and retry. The durable queue sends the saved request.
- If CRM changes the same edited field, opportunity stage, value, or expected close date before sync, the request fails with a conflict. Discard, load current CRM values, and reapply the intended update. Unrelated CRM changes are retained. Backward stage moves and changes to closed opportunities are rejected.
- Overdue expected close dates and open follow-ups are called out in the existing next-step panel. Source leads link directly to the registration and its current opportunity stage.
- Revoked records disappear from partner lists, search, exports, notifications, and open details.

## Boundaries

All customers and Salesforce decisions are simulated. The hosted application still stores records per browser and origin. Authentication and partner isolation require a real backend before use with actual customer data. The GitHub Pages publication is a static demo with simulated authentication; use fictional data only.

Automated verification covers the existing journeys plus the close/withdraw, identity lock, resubmission, outcome validation, concurrency, and form-recovery paths. Both complete journeys are exercised through the same handlers used by the interface. Browser visual QA remains unavailable in this session. Existing tests that contradicted the new required outcome fields, forward-stage rules, or next-step copy were updated with user approval.

The final sidebar contains one Leads entry. Assigned leads and deals remain available through workspace tabs. New lead columns show two cards; New registration columns show two. Submitted and Disqualified lead columns show one card each. View all shows every retained record in list view. Welcome and onboarding were preserved unchanged during the partner-only and navigation refinements.

Salesforce setup is optional: Connect later opens the program step and dashboard without marking the CRM connected. Submitted requests stay queued. Salesforce updates → Connect Salesforce opens the same confirmation flow in the portal and synchronizes saved requests after confirmation.
