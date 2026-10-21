const test=require('node:test'),assert=require('node:assert/strict');
const W=require('../dist/sales-workflow.js');
const {environment}=require('./ui-environment.cjs');
const fixed='2026-10-15T12:00:00.000Z';
const values=(company)=>({company,contact:'Taylor Reed',email:'taylor@'+company.toLowerCase().replace(/[^a-z]/g,'')+'.example',value:82000,region:'North America',need:'Consolidate customer sales reporting across regional offices.',consent:true});
const assignment={partnerId:'partner-acme',company:'Copperleaf Hotels',contact:'Sam Okafor',email:'sam@copperleaf.example',region:'Europe',product:'Sales Cloud',value:'72000',source:'Vendor webinar',need:'Bring bookings and sales follow-ups into one workspace.'};
// One workspace seen from both sides: the partner's workflow and the vendor's partner manager.
function both(){const state={crm:{connected:true}};W.initialize(state);return {state,s:state.sales,partner:W.create(state,{now:()=>fixed}),manager:W.manage(state,{now:()=>fixed,reviewer:'Riley Chen'})};}
function submitted(e,company){const l=e.partner.createLead(values(company));e.partner.submitLead(l.id);e.partner.sync();return l;}

test('manual review is the default: registrations wait for the partner manager',()=>{
 const e=both();assert.equal(e.manager.reviewMode(),'manual');const l=submitted(e,'Waiting Co');assert.equal(l.status,'Submitted');assert.ok(l.reviewReason===''||!l.reviewReason);
 for(let i=0;i<3;i++)e.partner.sync();assert.equal(l.status,'Submitted');assert.ok(e.manager.queue().some(r=>r.crmId===l.crmId));assert.ok(e.manager.queue().some(r=>r.crmId==='00Q-L102'));
 const rev=e.s.crm.managerRev||0;e.manager.approve(l.crmId);assert.equal(e.s.crm.managerRev,rev+1);assert.equal(e.s.crm.leads[l.crmId].status,'Approved');assert.equal(e.s.crm.leads[l.crmId].protectedUntil,'2027-01-13');assert.equal(l.status,'Submitted','partner sees it after syncing');
 e.partner.sync();assert.equal(l.status,'Approved');assert.ok(l.history.some(h=>h.title==='Lead approved by vendor'&&/yours to pursue/.test(h.detail)));assert.ok(e.partner.notifications().some(n=>n.recordId===l.id&&/Approved/.test(n.detail)));
 assert.equal(e.s.crm.leads[l.crmId].vendorLog.at(-1).actor,'Riley Chen');assert.ok(!e.manager.queue().some(r=>r.crmId===l.crmId));
});

test('registration checks flag duplicates across partners, similar names, territory, and thin details',()=>{
 const e=both(),checks=company=>{const l=submitted(e,company);return e.manager.checks(l.crmId);};
 const dup=checks('Beacon Medical');assert.equal(dup.recommendation,'Reject');assert.equal(dup.items[0].ok,false);assert.ok(dup.blocking.some(m=>m.kind==='Lead'&&m.partnerId==='partner-acme'));
 const other=checks('Evergreen Systems');assert.equal(other.recommendation,'Reject');assert.ok(other.blocking.some(m=>m.kind==='Opportunity'&&m.partnerId==='another-partner'));
 const similar=checks('Beacon Medical Group');assert.equal(similar.items[0].ok,true);assert.equal(similar.items[0].warn,true);assert.equal(similar.matches[0].match,'Similar name');assert.equal(similar.recommendation,'Approve');
 const own=checks('Northstar Services');assert.equal(own.blocking.length,0,'a partner’s own open opportunity does not block');
 const clean=checks('Brand New Customer');assert.equal(clean.recommendation,'Approve');assert.ok(clean.items.every(i=>i.ok&&!i.warn));
 const far=e.partner.createLead({...values('Far Away Co'),region:'Other'});e.partner.submitLead(far.id);e.partner.sync();assert.equal(e.manager.checks(far.crmId).recommendation,'Reject');
 const thin=e.partner.createLead({...values('Thin Need Co'),need:'Needs a CRM'});e.partner.submitLead(thin.id);e.partner.sync();const t=e.manager.checks(thin.crmId);assert.equal(t.recommendation,'Return for information');assert.equal(t.items.find(i=>i.id==='need').ok,false);
});

test('return and reject reach the partner with the manager’s reason; resubmission comes back to the queue',()=>{
 const e=both(),l=submitted(e,'Return Co');assert.throws(()=>e.manager.returnLead(l.crmId,'short'),/10 characters/);
 e.manager.returnLead(l.crmId,'Please add who will sign off on the purchase.');e.partner.sync();assert.equal(l.status,'Needs information');assert.equal(l.reviewReason,'Please add who will sign off on the purchase.');
 assert.throws(()=>e.manager.approve(l.crmId),/no longer waiting/);
 e.partner.resubmit(l.id,{need:'Consolidate reporting; the COO signs off on the purchase this quarter.'});e.partner.sync();assert.equal(l.status,'Submitted');assert.ok(e.manager.queue().some(r=>r.crmId===l.crmId));
 const r=submitted(e,'Reject Co');assert.throws(()=>e.manager.reject(r.crmId,'Nope'),/reason/);assert.throws(()=>e.manager.reject(r.crmId,'Other','no'),/5 characters/);
 e.manager.reject(r.crmId,'Not a fit for the program','Consumer business, outside our B2B program.');e.partner.sync();assert.equal(r.status,'Rejected');assert.equal(r.rejectReason,'Not a fit for the program');assert.match(r.reviewReason,/isn’t a fit.*Consumer business/);
});

test('assigning, declining, and reassigning leads moves them between partners',()=>{
 const e=both();assert.throws(()=>e.manager.assign({...assignment,email:'bad'}),/valid customer email/);assert.throws(()=>e.manager.assign({...assignment,partnerId:'nobody'}),/Choose a partner/);
 const v=e.manager.assign(assignment);assert.equal(v.id,'V501');assert.equal(v.status,'Assigned');assert.equal(e.manager.deadline(v).kind,'accept');assert.equal(e.manager.deadline(v).hoursLeft,48);
 e.partner.sync();const local=e.partner.get('lead','V501');assert.equal(local.origin,'crm');assert.equal(local.status,'Assigned');assert.ok(e.partner.notifications().some(n=>n.recordId==='V501'&&n.title==='New CRM assignment'));
 assert.throws(()=>e.manager.reassign('00Q-L105','partner-cobalt'),/unaccepted or declined/);
 e.partner.decline('V501','No capacity right now');e.partner.sync();assert.equal(e.manager.stage(e.manager.get('00Q-V501')),'Declined');
 e.manager.reassign('00Q-V501','partner-cobalt');e.partner.sync();assert.throws(()=>e.partner.get('lead','V501'),/not available/);
 e.manager.reassign('00Q-V501','partner-acme');e.partner.sync();assert.equal(e.partner.get('lead','V501').status,'Assigned');assert.equal(e.manager.get('00Q-V501').vendorLog.filter(x=>x.title==='Reassigned').length,2);
});

test('automatic review applies program rules on the partner’s next sync',()=>{
 const e=both(),clean=submitted(e,'Auto Clean Co'),dup=submitted(e,'Beacon Medical');e.partner.sync();assert.equal(clean.status,'Submitted');
 e.manager.setReviewMode('auto');assert.equal(e.manager.reviewMode(),'auto');e.partner.sync();assert.equal(clean.status,'Approved');assert.equal(dup.status,'Rejected');
});

test('converted leads show as Converted to the manager once the registration is submitted',()=>{
 const e=both(),l=submitted(e,'Convert Co');e.manager.approve(l.crmId);e.partner.sync();e.partner.addActivity('lead',l.id,{type:'Call',outcome:'Connected',note:'Intro call.'});e.partner.sync();
 e.partner.qualify(l.id,{budgetConfirmed:true,decisionMaker:'Taylor Reed · COO',needConfirmed:true,timeline:'0–3 months'});e.partner.sync();
 const d=e.partner.createDeal({name:'Rollout',product:'Sales Cloud',expectedClose:'2026-12-20',confirmedNeed:true},l.id);assert.equal(e.manager.stage(e.manager.get(l.crmId)),'Qualified','drafts stay with the partner');
 e.partner.submitDeal(d.id);e.partner.sync();assert.equal(e.manager.stage(e.manager.get(l.crmId)),'Converted');
});

// ---- Manager portal UI ----
const managerApp=saved=>{const m=environment(saved,'',['sales-workflow.js','manager.js']);m.click({action:'signin'});return m;};
test('manager signs in, reviews the queue, and approves with one click',()=>{
 const m=environment(undefined,'',['sales-workflow.js','manager.js']);assert.match(m.html(),/Sign in as Riley Chen/);m.click({action:'signin'});
 assert.match(m.html(),/<h1>Good (morning|afternoon|evening), Riley\.<\/h1>/);assert.match(m.html(),/Awaiting your decision/);assert.match(m.html(),/nav-badge/);assert.match(m.html(),/Live sync/);
 m.click({page:'queue'});assert.match(m.html(),/<h1>Lead reviews<\/h1>/);assert.match(m.html(),/Meridian Logistics/);assert.match(m.html(),/No duplicates/);
 m.click({open:'00Q-L102'});assert.match(m.overlay(),/Recommended: Approve/);assert.match(m.overlay(),/No duplicate records/);assert.match(m.overlay(),/In program territory · North America/);
 m.click({decide:'approve'});assert.equal(m.overlay(),'');assert.equal(m.saved().sales.crm.leads['00Q-L102'].status,'Approved');assert.match(m.html(),/No registrations waiting/);assert.match(m.element('toast').textContent,/Approved · Meridian Logistics/);
});

test('manager return, reject, assign, and reassign forms validate and save',()=>{
 const e=both();e.partner.decline('L104','Outside our territory');e.partner.sync();
 const m=managerApp(JSON.parse(JSON.stringify(e.state)));m.click({open:'00Q-L102'});m.click({decide:'return'});assert.match(m.overlay(),/aria-label="Return for information"/);
 m.submit('mgr-form',{message:'short'});assert.match(m.element('mgr-form-error').textContent,/10 characters/);
 m.submit('mgr-form',{message:'Please confirm the budget owner and timeline.'});assert.equal(m.saved().sales.crm.leads['00Q-L102'].status,'Needs information');
 m.click({page:'distribution'});assert.match(m.html(),/<h1>Lead distribution<\/h1>/);assert.match(m.html(),/Harbor Systems/);
 m.click({action:'assign'});assert.match(m.overlay(),/aria-label="Assign a lead"/);m.submit('mgr-form',{...assignment,partnerId:'partner-cobalt'});assert.equal(m.saved().sales.crm.leads['00Q-V501'].partnerId,'partner-cobalt');assert.match(m.html(),/Copperleaf Hotels/);assert.match(m.html(),/Cobalt Systems/);assert.match(m.html(),/Accept within 48 h/);
 m.click({page:'distribution'});assert.match(m.html(),/Declined · Outside our territory/);assert.match(m.html(),/data-reassign="00Q-L104"/);
 m.click({reassign:'00Q-L104'});m.submit('mgr-form',{partnerId:'partner-cobalt'});assert.equal(m.saved().sales.crm.leads['00Q-L104'].partnerId,'partner-cobalt');assert.equal(m.saved().sales.crm.leads['00Q-L104'].status,'Assigned');
 m.click({page:'leads'});assert.match(m.html(),/<h1>All partner leads<\/h1>/);assert.match(m.html(),/Registered by partner/);assert.match(m.html(),/Assigned by vendor/);
 m.click({action:'mode'});assert.equal(m.saved().sales.crm.reviewMode,'auto');
});

test('the partner and manager portals stay in sync across tabs',()=>{
 const p=environment();p.run("beginOnboarding();handleEntryAction('connect');confirmSetupConnection();handleEntryAction('next');handleEntryAction('finish')");
 const m=managerApp(p.saved());
 // Partner submits; the manager tab hears about it immediately.
 p.click({salesAction:'new-lead'});p.submit('sales-record-form',{...values('Live Sync Co'),value:'82000',consent:'on'});const id=p.run('detailRecord.id');p.click({salesAction:'submit-lead',salesType:'lead',salesId:id});p.sync();
 m.fireStorage(JSON.stringify(p.saved()));assert.match(m.html(),/Live Sync Co/);assert.match(m.element('toast').textContent,/New registration from Acme Partners · Live Sync Co/);
 // Manager approves; the open partner portal syncs, updates the record, and says so.
 const crmId=p.run(`getRecord('lead','${id}').crmId`);m.click({open:crmId});m.click({decide:'approve'});p.fireStorage(JSON.stringify(m.saved()));
 assert.equal(p.run(`getRecord('lead','${id}').status`),'Approved');assert.match(p.element('toast').textContent,/Lead approved by vendor · Live Sync Co · Approved/);assert.match(p.html(),/Live Sync Co/);
 // The partner works the lead; the manager sees it.
 p.click({salesAction:'first-contact',salesType:'lead',salesId:id});p.submit('sales-activity-form',{type:'Call',outcome:'Connected',note:'Intro call.'});p.sync();m.fireStorage(JSON.stringify(p.saved()));
 assert.match(m.element('toast').textContent,/Acme Partners contacted Live Sync Co/);
});

test('every manager view and form renders balanced markup with bound labels',()=>{
 const check=html=>{const ids=[...html.matchAll(/\sid="([^"]+)"/g)].map(x=>x[1]);assert.equal(new Set(ids).size,ids.length);for(const x of html.matchAll(/<label\b[^>]*\bfor="([^"]+)"/g))assert.ok(ids.includes(x[1]));const stack=[],voids=new Set(['input','img','br','hr','meta','link']);for(const x of html.matchAll(/<\/?([a-z][a-z0-9-]*)\b[^>]*>/gi)){const tag=x[1];if(voids.has(tag)||x[0].endsWith('/>'))continue;if(x[0].startsWith('</'))assert.equal(stack.pop(),tag);else stack.push(tag);}assert.deepEqual(stack,[]);};
 const m=environment(undefined,'',['sales-workflow.js','manager.js']);check(m.html());m.click({action:'signin'});
 for(const page of ['overview','queue','registrations','distribution','leads','opportunities','partners']){m.click({page});check(m.html());}
 for(const id of ['partner-acme','another-partner','partner-cobalt']){m.click({openPartner:id});check(m.overlay());}
 for(const id of ['006-D103','006-N302','006-linkable','006-conflict']){m.click({openOpp:id});check(m.overlay());}
 m.click({openReg:'REG-D102'});check(m.overlay());m.click({action:'search'});check(m.overlay());m.click({action:'activity'});check(m.overlay());
 for(const id of ['00Q-L102','00Q-L104','00Q-L105','00Q-L103']){m.click({open:id});check(m.overlay());}
 m.click({open:'00Q-L102'});m.click({decide:'return'});check(m.overlay());m.click({open:'00Q-L102'});m.click({decide:'reject'});check(m.overlay());m.click({action:'assign'});check(m.overlay());
});

// ---- Deal registrations ----
const dealValues=company=>({...values(company),name:company+' rollout',product:'Sales Cloud',expectedClose:'2026-12-20',confirmedNeed:true});
test('deal registrations wait for the manager; approval creates the CRM opportunity the partner then tracks',()=>{
 const e=both(),d=e.partner.createDeal(dealValues('Direct Deal Co'));e.partner.submitDeal(d.id);for(let i=0;i<3;i++)e.partner.sync();
 assert.equal(d.registration,'Pending review');assert.equal(d.opportunityId,null);assert.ok(e.manager.registrationQueue().some(x=>x.crmId===d.crmId));
 const checks=e.manager.registrationChecks(d.crmId);assert.equal(checks.recommendation,'Approve');assert.match(checks.items.find(i=>i.id==='evidence').label,/partner confirmed the customer need/);
 const rev=e.s.crm.managerRev||0;e.manager.approveRegistration(d.crmId,'Good fit.');assert.equal(e.s.crm.managerRev,rev+1);
 const remote=e.s.crm.registrations[d.crmId];assert.equal(remote.registration,'Approved');assert.equal(remote.protectedUntil,'2027-01-13');assert.equal(remote.stage,'Discovery');assert.ok(e.s.crm.opportunities[remote.opportunityId]);assert.equal(e.s.crm.opportunities[remote.opportunityId].registrationId,d.crmId);
 e.partner.sync();assert.equal(d.registration,'Approved');assert.equal(d.opportunityId,remote.opportunityId);assert.equal(d.stage,'Discovery');assert.ok(!e.manager.registrationQueue().some(x=>x.crmId===d.crmId));
});

test('conflicting or out-of-territory deal registrations are flagged, and rejection reaches the partner',()=>{
 const e=both();assert.throws(()=>e.partner.createDeal({...dealValues('Summit Networks'),product:'Service Cloud'}),/Open it in Deal Registrations/);const dup=e.partner.createDeal(dealValues('Evergreen Systems'));e.partner.submitDeal(dup.id);e.partner.sync();
 const c=e.manager.registrationChecks(dup.crmId);assert.equal(c.recommendation,'Reject');assert.ok(c.conflicts.some(x=>x.kind==='CRM opportunity'));
 const far=e.partner.createDeal({...dealValues('Far Deal Co'),region:'Other'});e.partner.submitDeal(far.id);e.partner.sync();assert.equal(e.manager.registrationChecks(far.crmId).items.find(i=>i.id==='territory').ok,false);
 assert.throws(()=>e.manager.rejectRegistration(far.crmId,'Other','no'),/at least 5 characters/);
 e.manager.rejectRegistration(far.crmId,'Outside territory');e.partner.sync();assert.equal(far.registration,'Rejected');assert.equal(far.opportunityId,null);
 assert.throws(()=>e.manager.approveRegistration(far.crmId),/no longer waiting|not waiting|already/i);
});

test('manager portal reviews deal registrations, with a nav badge, drawer checks, and live partner updates',()=>{
 const p=environment();p.run("beginOnboarding();handleEntryAction('connect');confirmSetupConnection();handleEntryAction('next');handleEntryAction('finish')");
 const m=managerApp(p.saved());assert.match(m.html(),/data-open-reg="REG-D102"/);m.click({page:'registrations'});
 assert.match(m.html(),/<h1>Deal registrations<\/h1>/);assert.match(m.html(),/data-open-reg="REG-D102"/);assert.match(m.html(),/Large deal/);assert.match(m.html(),/Recently decided/);
 // The partner registers a deal in the portal; the manager hears about it.
 p.click({salesAction:'new-deal'});p.submit('deal-describe-form',{story:'Live Deal Co wants Sales Cloud for 40 reps, about $60K, signing by 2026-12-20.'},'extract');
 p.submit('deal-review-form',{contact:'Sam Ortiz',email:'sam@livedeal.example',region:'North America',need:'Move the sales team off spreadsheets into one pipeline.'},'continue');p.submit('deal-confirm-form',{confirmedNeed:'on',consent:'on'},'submit');p.sync();
 const id=p.run('detailRecord.id'),crmId=p.run(`getRecord('deal','${id}').crmId`);assert.equal(p.run(`getRecord('deal','${id}').registration`),'Pending review');
 m.fireStorage(JSON.stringify(p.saved()));assert.match(m.html(),/Live Deal Co/);assert.match(m.element('toast').textContent,/New deal registration from Acme Partners · Live Deal Co/);
 m.click({openReg:crmId});assert.match(m.overlay(),/Recommended: Approve/);assert.match(m.overlay(),/Direct registration/);assert.match(m.overlay(),/No conflicting registrations/);
 m.click({decideReg:'approve'});assert.equal(m.overlay(),'');assert.match(m.element('toast').textContent,/CRM opportunity created for Live Deal Co/);
 p.fireStorage(JSON.stringify(m.saved()));assert.equal(p.run(`getRecord('deal','${id}').registration`),'Approved');assert.equal(p.run(`getRecord('deal','${id}').stage`),'Discovery');
 p.run("go('opportunities')");assert.match(p.html(),/Live Deal Co/);
 // Reject with a reason from the drawer.
 m.click({openReg:'REG-D102'});m.click({decideReg:'reject'});assert.match(m.overlay(),/Reject registration/);m.submit('mgr-form',{reason:'Not enough customer evidence',note:''});assert.equal(m.saved().sales.crm.registrations['REG-D102'].registration,'Rejected');
 m.fireStorage(JSON.stringify(m.saved()));m.click({page:'registrations'});assert.match(m.html(),/No deal registrations waiting/);assert.doesNotMatch(m.html(),/Deal registrations<\/span><span class="nav-badge"/);
});

// ---- High-fidelity manager portal ----
test('overview summarizes approvals, pipeline, partner performance, and recent activity',()=>{
 const m=managerApp();const html=m.html();
 for(const text of ['Awaiting your decision','Partner-sourced pipeline','Closed won','Response time','Needs your attention','Pipeline','Partner performance','Recent activity'])assert.match(html,new RegExp(text));
 assert.match(html,/data-open="00Q-L102"/);assert.match(html,/data-open-reg="REG-D102"/);
 for(const name of ['Acme Partners','Northbridge Consulting','Cobalt Systems'])assert.match(html,new RegExp(name));
 assert.match(html,/Cobalt Systems<\/b> accepted <b>Vantage Robotics/);
 m.click({action:'activity'});assert.match(m.overlay(),/aria-label="Partner activity"/);assert.match(m.overlay(),/Northbridge Consulting<\/b> logged a call with <b>Harrow Aviation/);
});

test('partners page shows tier, performance, and target; a partner drawer lists their leads and opportunities',()=>{
 const m=managerApp();m.click({page:'partners'});const html=m.html();
 assert.match(html,/<h1>Partners<\/h1>/);for(const tier of ['Platinum','Gold','Silver'])assert.match(html,new RegExp('mgr-tier '+tier.toLowerCase()));assert.match(html,/Sourced vs annual target/);assert.match(html,/Hannah Weiss/);
 m.click({openPartner:'another-partner'});const d=m.overlay();assert.match(d,/Northbridge Consulting/);assert.match(d,/PRT-1002/);assert.match(d,/Systems integrator · Europe/);
 for(const company of ['Harrow Aviation','Granite Peak Bank','Tidewater Ports','Larkspur Clinics','Aurora Dental Group'])assert.match(d,new RegExp(company));assert.doesNotMatch(d,/Meridian Logistics|Vantage Robotics/);
 m.click({action:'assign',assignTo:'partner-cobalt'});assert.match(m.overlay(),/<option value="partner-cobalt" selected>/);
 m.submit('mgr-form',{partnerId:'partner-cobalt',company:'Sunrise Telecom',region:'Asia Pacific',contact:'Ava Park',email:'ava@sunrise.example',product:'Platform',value:'64000',source:'Vendor webinar',need:'Unify partner-sourced sales enquiries in one place.'});
 assert.equal(m.saved().sales.crm.leads['00Q-V501'].partnerId,'partner-cobalt');assert.match(m.html(),/<h1>Lead distribution<\/h1>/);
});

test('opportunities page filters by stage and partner and opens opportunity details',()=>{
 const m=managerApp();m.click({page:'opportunities'});assert.match(m.html(),/<h1>Opportunities<\/h1>/);
 for(const company of ['Summit Networks','Tidewater Ports','Bluefin Shipping','Evergreen Systems','Ember Energy'])assert.match(m.html(),new RegExp(company));
 m.click({oppStage:'Won'});assert.match(m.html(),/Aurora Dental Group/);assert.match(m.html(),/Ember Energy/);assert.doesNotMatch(m.html(),/Tidewater Ports/);
 m.click({oppPartner:'another-partner'});assert.match(m.html(),/Aurora Dental Group/);assert.doesNotMatch(m.html(),/Ember Energy/);
 m.click({oppStage:'Won'});assert.match(m.html(),/Tidewater Ports/,'clicking the active stage clears it');
 m.click({openOpp:'006-N302'});assert.match(m.overlay(),/Won for \$180,000/);assert.match(m.overlay(),/data-open-reg="REG-N302"/);
 m.click({openOpp:'006-linkable'});assert.match(m.overlay(),/Created in Salesforce/);
});

test('all partner leads filter by stage group and partner; search finds partners and records',()=>{
 const m=managerApp();m.click({page:'leads'});m.click({leadPartner:'partner-cobalt'});assert.match(m.html(),/Lumen Biotech/);assert.doesNotMatch(m.html(),/Harrow Aviation|Meridian Logistics/);
 m.click({leadGroup:'converted'});assert.match(m.html(),/Bluefin Shipping/);assert.doesNotMatch(m.html(),/Lumen Biotech/);
 m.click({leadPartner:'all'});m.click({leadGroup:'review'});assert.match(m.html(),/Meridian Logistics/);assert.doesNotMatch(m.html(),/Lumen Biotech/);
 m.click({action:'search'});m.element('mgr-search').oninput({target:{value:'north'}});const results=m.element('mgr-search-results').innerHTML;
 assert.match(results,/data-open-partner="another-partner"/);assert.match(results,/Northstar Services/);
 m.element('mgr-search').oninput({target:{value:'zzz'}});assert.match(m.element('mgr-search-results').innerHTML,/No matches/);
});

test('the manager portal does not link to the partner portal',()=>{
 const m=environment(undefined,'',['sales-workflow.js','manager.js']);assert.doesNotMatch(m.html(),/index\.html|partner portal/i);m.click({action:'signin'});
 for(const page of ['overview','queue','registrations','distribution','leads','opportunities','partners']){m.click({page});assert.doesNotMatch(m.html(),/index\.html|Open partner portal/i);}
});
