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
| Excess sample records crowded the board | Four initial leads; created/edited records preserved |

## Partner-created lead to Won

1. Complete demo sign-in, explicitly connect Salesforce, view the assigned program, enter the dashboard.
2. My Leads → Create lead. Enter customer, contact, email, positive estimated value, supported region, customer need, source, and sharing permission. Save draft.
3. Open the draft → Submit lead. Observe pending synchronization, then Submitted. The vendor CRM now has the lead.
4. Refresh Salesforce. The vendor qualifies the lead. A notification links back to the record. Qualification does not create an opportunity.
5. Register deal. The source customer identity is retained; enter the opportunity name, product, future close date, and customer-need confirmation. Save, then submit registration.
6. Eligible registrations approve and link to a Discovery opportunity. Larger registrations show Pending review first; Refresh receives the vendor decision.
7. Update opportunity → Proposal → Negotiation → Won. Supply an outcome note. Each confirmed transition appears in history and the canonical CRM opportunity.
8. The source lead remains Qualified; registration remains Approved; only the opportunity is Won. Dashboard revenue reflects that opportunity once.

## CRM-assigned lead to Lost

1. CRM Assigned Leads → Harbor Systems → Accept lead. Wait for Salesforce confirmation.
2. Log first contact → Call or Email. Record the discussion. The lead becomes Contacted after sync.
3. Add a Follow-up with a future date. Complete it when done. Both activity and completion synchronize.
4. Request qualification. Wait for Qualification requested, then Refresh for the vendor decision.
5. Register the qualified lead, submit, and receive approval or review as above.
6. Update opportunity → Lost with a reason. The source lead remains Qualified and registration Approved. Lost does not contribute to won revenue.

## Exceptions and recovery

- Missing permission/contact/need/value prevents submission with an error. The draft stays available.
- Short customer needs receive Needs information. Edit, sync, and resubmit/request qualification again.
- Direct registrations in Other territories enter review, then rejection. Revise the territory and resubmit the same registration; history and ID remain.
- An existing local customer/product registration blocks duplicates. A conflicting private CRM registration returns a generic rejection without exposing the other partner.
- Use Northstar Services / Sales Cloud to link an existing opportunity, preserving its CRM value and stage.
- Temporarily go offline, then submit an update: the confirmed value stays unchanged, saved payload is inspectable, and Retry sends the same operation once. Discard restores confirmed CRM values.
- Edit a lead while offline, restore connectivity, and retry. The durable queue sends the saved request.
- If CRM changes the same field or stage before sync, the request fails with a conflict. Discard, load current CRM values, and reapply the intended update. Unrelated CRM changes are retained.
- Revoked records disappear from partner lists, search, exports, notifications, and open details.

## Boundaries

All customers and Salesforce decisions are simulated. The hosted application still stores records per browser and origin. Authentication and partner isolation require a real backend before use with actual customer data. The GitHub Pages publication is a static demo with simulated authentication; use fictional data only.

Automated verification: 23 domain scenarios and 16 UI-controller/markup scenarios. Both complete journeys are exercised through the same handlers used by the interface. Browser visual QA remains unavailable in this session.

The final sidebar contains one Leads entry. Assigned leads and deals remain available through workspace tabs. Only two Draft cards are displayed; View all drafts shows every retained draft in list view. Welcome and onboarding were preserved unchanged during the partner-only and navigation refinements.
