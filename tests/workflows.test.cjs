const test=require('node:test'),assert=require('node:assert/strict');
const {environment}=require('./ui-environment.cjs');
const leadValues={company:'Workflow Customer',contact:'Taylor Reed',email:'taylor@example.com',jobTitle:'Director',value:'82000',region:'North America',need:'Replace disconnected sales reporting across regional teams.',source:'Partner referral',consent:'on'};
const registration={...leadValues,name:'Regional rollout',product:'Sales Cloud',expectedClose:'2026-12-20',confirmedNeed:'on'};
const act=(app,action,type,id,extra={})=>app.click({salesAction:action,salesType:type,salesId:id,...extra});

test('welcome and refresh guard portal access while retaining saved sales records',()=>{
 const a=environment();assert.match(a.html(),/welcome-login-form/);a.run("go('deals')");assert.match(a.html(),/welcome-login-form/);a.login();assert.match(a.html(),/class="sidebar/);
 a.run("workflow.createLead({company:'Preserved draft'})");const b=environment(a.saved(),'#deals');assert.equal(b.location.hash,'#welcome');assert.equal(b.run('state.crm.connected'),true,'Salesforce stays connected after a refresh');assert.match(b.html(),/welcome-login-form/);b.login();assert.equal(b.run("workflow.list('lead').filter(l=>l.company==='Preserved draft').length"),1);
});

test('email login does not store a password and opens the program step with Salesforce connected',()=>{
 const a=environment();a.submit('welcome-login-form',{email:'demo@example.com',password:'Never-store-this'});assert.equal(a.run('state.user.email'),'demo@example.com');assert.doesNotMatch(JSON.stringify(a.saved()),/Never-store-this/);assert.match(a.html(),/Your partner program/);assert.equal(a.run('state.crm.connected'),true);assert.doesNotMatch(a.html(),/<input|<select|<form|60-Second Deal/);a.run("handleEntryAction('finish')");assert.equal(a.location.hash,'#dashboard');a.run('signOut()');assert.match(a.html(),/welcome-login-form/);
});

test('all partner routes render with consistent headings and no vendor administration',()=>{
 const a=environment();a.login();for(const [route,title]of Object.entries({dashboard:'Your partner workspace.',leads:'My Leads',assigned:'Assigned Leads',deals:'Deal Registrations',opportunities:'CRM Opportunities',crm:'Salesforce updates',program:'My program',security:'Account & security'})){a.click({page:route});assert.match(a.html(),new RegExp('<h1>'+title.replace('&','&')+'</h1>'));assert.doesNotMatch(a.html(),/Invite member|Manage team|Approve registration|Reject registration|HubSpot|sec elapsed|id="elapsed"/)}
 a.run("go('team')");assert.equal(a.location.hash,'#program');assert.match(a.html(),/View only/);assert.doesNotMatch(a.html(),/<form/);
});

test('UI registers a lead, gets vendor approval, qualifies with BANT, converts, and closes the opportunity Won',()=>{
 const a=environment();a.login();act(a,'new-lead');a.submit('sales-record-form',leadValues);const id=a.run('detailRecord.id');assert.match(a.overlay(),/Submit for approval/);assert.equal(a.run(`getRecord('lead','${id}').status`),'Draft');
 act(a,'submit-lead','lead',id);assert.match(a.overlay(),/Syncing…/);a.sync();assert.equal(a.run(`getRecord('lead','${id}').status`),'Submitted');assert.match(a.overlay(),/Pending approval/);act(a,'refresh');a.sync();assert.equal(a.run(`getRecord('lead','${id}').status`),'Approved');assert.match(a.overlay(),/Protected for Acme Partners until Jan 13, 2027/);assert.match(a.overlay(),/Log first contact/);
 act(a,'first-contact','lead',id);a.submit('sales-activity-form',{type:'Call',outcome:'Connected',note:'Discovery call with the customer sponsor.'});a.sync();assert.match(a.overlay(),/Qualify lead/);
 act(a,'qualify','lead',id);assert.match(a.overlay(),/aria-label="Qualify lead"/);a.submit('sales-qualify-form',{value:'82000',budgetConfirmed:'on',decisionMaker:'Taylor Reed · Director',need:leadValues.need,needConfirmed:'on',timeline:'0–3 months'});a.sync();assert.equal(a.run(`getRecord('lead','${id}').status`),'Qualified');assert.match(a.overlay(),/Register deal/);
 a.registerDeal(id,registration);const d=a.run('detailRecord.id');assert.equal(a.location.hash,'#deals');assert.match(a.overlay(),/Submit registration/);act(a,'submit-deal','deal',d);a.sync();assert.match(a.overlay(),/02 · DEAL REGISTRATION/);assert.match(a.overlay(),/03 · CRM OPPORTUNITY/);assert.match(a.overlay(),/Approved/);assert.match(a.overlay(),/Discovery/);assert.doesNotMatch(a.overlay(),/>Won<\/strong>/);
 for(const stage of ['Proposal','Negotiation','Won']){act(a,'stage','deal',d);a.submit('sales-stage-form',{stage,reason:'Customer confirmed the signed agreement.',...(stage==='Won'?{wonAmount:'82000',closeDate:'2026-10-15'}:{})});a.sync();assert.equal(a.run(`getRecord('deal','${d}').stage`),stage)}
 assert.equal(a.run(`getRecord('lead','${id}').status`),'Qualified');act(a,'source-lead','deal',d);assert.equal(a.run('detailRecord.id'),id);assert.match(a.overlay(),/View deal registration · Won/);a.run("go('opportunities')");assert.match(a.html(),/Workflow Customer/);a.run("go('dashboard')");assert.match(a.html(),/Open CRM opportunities/);
});

test('assigned lead UI accepts, logs contact and follow-up, qualifies, registers, then closes Lost',()=>{
 const a=environment();a.login();a.click({page:'assigned'});act(a,'open','lead','L104');assert.match(a.overlay(),/FROM CRM/);assert.match(a.overlay(),/Vendor · (NexaCloud|Vertex Software|Aster Platforms)/);assert.match(a.overlay(),/Accept by [^<]* · 48 hours left/);act(a,'accept','lead','L104');a.sync();assert.match(a.overlay(),/Log first contact/);assert.match(a.overlay(),/Make first contact by/);
 act(a,'activity','lead','L104');a.submit('sales-activity-form',{type:'Call',outcome:'Connected',note:'Customer confirmed their budget and business need.'});a.sync();assert.match(a.overlay(),/Qualify lead/);assert.match(a.overlay(),/Call · Connected/);
 act(a,'activity','lead','L104');a.element('activity-type-select').value='Follow-up';a.element('activity-type-select').onchange();assert.equal(a.element('follow-up-field').hidden,false);a.submit('sales-activity-form',{type:'Follow-up',note:'Send the proposed scope.',dueDate:'2026-10-20'});a.sync();assert.match(a.overlay(),/Due Oct 20/);const aid=a.run("getRecord('lead','L104').activities.at(-1).id");act(a,'complete','lead','L104',{activityId:aid});a.sync();assert.match(a.overlay(),/Follow-up · Completed/);
 act(a,'qualify','lead','L104');a.submit('sales-qualify-form',{value:'68000',budgetConfirmed:'on',decisionMaker:'Ava Chen · Director, Technology',need:'Replace disconnected sales processes with a shared customer workspace.',needConfirmed:'on',timeline:'3–6 months'});a.sync();assert.equal(a.run("getRecord('lead','L104').status"),'Qualified');a.registerDeal('L104',registration);const d=a.run('detailRecord.id');act(a,'submit-deal','deal',d);a.sync();act(a,'stage','deal',d);a.submit('sales-stage-form',{stage:'Lost',reason:'Customer selected an alternative provider.',lostReason:'Competitor'});a.sync();assert.equal(a.run(`getRecord('deal','${d}').stage`),'Lost');assert.match(a.overlay(),/Customer selected an alternative/);
});

test('board/list, search, filters and category navigation use the same scoped records',()=>{
 const a=environment();a.login();a.click({page:'leads'});assert.equal(a.run('scopedRecords().length'),5);assert.match(a.html(),/sales-board/);a.click({salesView:'list'});assert.match(a.html(),/data-table/);a.element('sales-search').oninput({target:{value:'Beacon',selectionStart:6}});assert.match(a.html(),/1 of 5 records/);assert.doesNotMatch(a.html(),/Cedar Analytics/);a.element('sales-filter').onchange({target:{value:'Draft'}});assert.match(a.html(),/No matching records/);
 a.click({page:'assigned'});assert.match(a.html(),/Harbor Systems/);assert.doesNotMatch(a.html(),/Beacon Medical/);assert.equal(a.run('salesQuery'),'');const b=environment(a.saved());b.login();assert.equal(b.run('salesView'),'list');
});

test('form validation and unchecked permissions block submission without losing a draft',()=>{
 const a=environment();a.login();act(a,'new-lead');a.submit('sales-record-form',{...leadValues,consent:undefined});const id=a.run('detailRecord.id');act(a,'submit-lead','lead',id);assert.match(a.element('sales-action-error').textContent,/permission/);assert.equal(a.run(`getRecord('lead','${id}').status`),'Draft');act(a,'edit','lead',id);a.submit('sales-record-form',leadValues);act(a,'submit-lead','lead',id);a.sync();
 act(a,'edit','lead',id);a.submit('sales-record-form',{...leadValues,email:'bad email'});assert.match(a.element('sales-form-error').textContent,/valid customer email/);assert.equal(a.run(`getRecord('lead','${id}').email`),leadValues.email);
});

test('failure UI shows saved update, retains confirmed values, and offers retry and discard',()=>{
 const a=environment();a.login();a.run('workflow.failNext()');act(a,'edit','lead','L105');a.submit('sales-record-form',{...leadValues,company:'Helios Freight',contact:'Marcus Lee',email:'changed@example.com'});assert.match(a.overlay(),/View saved update/);a.sync();assert.match(a.overlay(),/Sync failed/);assert.match(a.overlay(),/Discard failed update/);assert.match(a.overlay(),/changed@example.com/);assert.notEqual(a.run("getRecord('lead','L105').email"),'changed@example.com');act(a,'retry','lead','L105');a.sync();assert.equal(a.run("getRecord('lead','L105').email"),'changed@example.com');assert.match(a.overlay(),/Salesforce confirmed/);
 a.run('workflow.failNext()');act(a,'edit','lead','L105');a.submit('sales-record-form',{...leadValues,email:'discard@example.com'});a.sync();act(a,'discard','lead','L105');assert.equal(a.run("getRecord('lead','L105').email"),'changed@example.com');
});

test('notifications link to their authorized record and mark the update as read',()=>{
 const a=environment();a.login();a.click({action:'notifications'});assert.match(a.overlay(),/New CRM lead assigned/);const n=a.run('workflow.notifications()[0].id');act(a,'notification',null,null,{notificationId:n});assert.equal(a.location.hash,'#assigned');assert.equal(a.run('detailRecord.id'),'L104');assert.equal(a.run(`workflow.notifications().find(n=>n.id==='${n}').read`),true);
});

test('private CRM data never appears in search, lists, exports, or revoked detail sheets',async()=>{
 const a=environment();a.login();a.click({action:'search'});assert.doesNotMatch(a.element('search-results').innerHTML,/Larkspur Clinics|Evergreen Systems|Harrow Aviation/);a.click({page:'assigned'});act(a,'export');const text=await a.blob().text();assert.match(text,/Harbor Systems/);assert.doesNotMatch(text,/Private customer/);
 act(a,'open','lead','L104');a.run("state.sales.crm.leads['00Q-L104'].partnerId='another-partner'");act(a,'refresh');a.sync();assert.equal(a.overlay(),'');assert.doesNotMatch(a.html(),/Harbor Systems/);
});

test('offline partner edits are saved and Retry works after connectivity returns',()=>{
 const a=environment();a.login();a.run('navigator.onLine=false');act(a,'edit','lead','L105');a.submit('sales-record-form',{...leadValues,email:'offline@example.com'});a.sync();assert.match(a.overlay(),/You are offline/);assert.notEqual(a.run("getRecord('lead','L105').email"),'offline@example.com');a.click({page:'crm'});assert.match(a.html(),/Your submitted updates/);assert.match(a.html(),/Retry saved updates/);a.run('navigator.onLine=true');act(a,'retry');a.sync();assert.equal(a.run("getRecord('lead','L105').email"),'offline@example.com');assert.match(a.html(),/All caught up/);
});

test('quick actions, Cancel, account editing, sidebar and keyboard shortcuts are connected',()=>{
 const a=environment();a.login();a.key({key:'j',metaKey:true,preventDefault(){}});assert.match(a.overlay(),/Create a lead/);a.click({action:'lead'});assert.match(a.overlay(),/sales-record-form/);a.click({action:'close'});assert.equal(a.overlay(),'');a.click({action:'register-deal'});assert.match(a.overlay(),/deal-describe-form/);assert.match(a.overlay(),/Extract details/);a.key({key:'Escape'});assert.equal(a.overlay(),'');a.click({action:'sidebar-collapse'});assert.equal(a.run('state.sidebarCollapsed'),true);a.click({page:'security'});a.submit('profile-form',{name:'Taylor Reed',email:'taylor@partner.example'});assert.equal(a.run('state.user.name'),'Taylor Reed');a.click({toggle:'mfa'});assert.equal(a.run('state.settings.mfa'),false);a.click({action:'support'});assert.match(a.overlay(),/Three distinct records/);
});

function checkMarkup(html){
 const ids=[...html.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length,'unique IDs');for(const m of html.matchAll(/<label\b[^>]*\bfor="([^"]+)"/g))assert.ok(ids.includes(m[1]),'label target '+m[1]);
 const stack=[],voids=new Set(['input','img','br','hr','meta','link','source','area','base','embed','wbr','col','param','track']);for(const m of html.matchAll(/<\/?([a-z][a-z0-9-]*)\b[^>]*>/gi)){const tag=m[1],text=m[0];if(voids.has(tag)||text.endsWith('/>'))continue;if(text.startsWith('</'))assert.equal(stack.pop(),tag,'balanced '+tag);else{if(tag==='button')assert.ok(!stack.includes('button'),'no nested buttons');stack.push(tag)}}assert.deepEqual(stack,[]);
}
test('all views and action forms render balanced markup, unique IDs and bound labels',()=>{
 const a=environment();checkMarkup(a.html());a.login();for(const page of ['dashboard','leads','assigned','deals','opportunities','crm','program','security']){a.click({page});checkMarkup(a.html());if(['leads','assigned','deals','opportunities'].includes(page)){a.click({salesView:'list'});checkMarkup(a.html());a.click({salesView:'board'});}}
 for(const code of ["openSalesRecord('lead','L101')","openSalesRecord('lead','L104')","openSalesRecord('lead','L105')","openSalesRecord('lead','L110')","openSalesRecord('lead','L103')","openSalesRecord('deal','D103')","salesForm('lead')","salesForm('lead','L103')","salesForm('lead','L110')","salesForm('deal','D103')","dealWizard()","dealWizard('L103')","activityModal('lead','L105')","activityModal('lead','L110','first-contact')","qualifyModal('L105')","qualifyModal('L110')","stageModal('D103')","declineModal('L104')","notifications()","journeyHelp()","startQuick()"]){a.run(code);checkMarkup(a.overlay())}
 a.run('dealWizard()');a.submit('deal-describe-form',{story:'Dana Lee (dana@brightpath.example) at BrightPath Logistics wants Sales Cloud, about $180K, signing by March 31.'},'extract');checkMarkup(a.overlay());a.submit('deal-review-form',{},'continue');checkMarkup(a.overlay());
});


test('partner portal exposes no CRM configuration, failure controls, team or approval administration',()=>{
 const a=environment();a.login();for(const page of ['dashboard','leads','assigned','deals','crm','program','security']){a.click({page});assert.doesNotMatch(a.html(),/data-sales-action="(?:connect|disconnect|fail-next|approve|reject)"|Invite member|Manage team|Test next sync failure|About this simulation/)}a.click({page:'crm'});assert.match(a.html(),/Your submitted updates/);assert.match(a.html(),/Your vendor manages CRM configuration/);
});


test('one sidebar Leads entry keeps all sales tabs accessible and highlights the current workspace',()=>{
 const a=environment();a.login();for(const route of ['leads','assigned','deals']){a.click({page:route});const sidebar=a.html().match(/<aside class="sidebar[\s\S]*?<\/aside>/)[0];assert.doesNotMatch(sidebar,/data-page="assigned"|data-page="deals"/);assert.match(sidebar,/data-page="leads"[^>]+class="active"/);assert.match(a.html(),/sales-category-tabs/);assert.match(a.html(),/data-page="assigned"/);assert.match(a.html(),/data-page="deals"/)}
});

test('Draft column displays two cards and View all exposes the complete list',()=>{
 const a=environment();a.login();a.run("for(let i=0;i<4;i++)workflow.createLead({company:'Draft company '+i})");a.click({page:'leads'});const draftColumn=a.html().match(/<section class="lead-column"[\s\S]*?<\/section>/)[0];assert.equal((draftColumn.match(/class="card lead-card sales-card"/g)||[]).length,2);assert.match(draftColumn,/Showing 2 of 6 drafts/);act(a,'all-drafts');assert.equal(a.run('salesView'),'list');assert.equal(a.run('salesFilter'),'Draft');assert.match(a.html(),/6 of 9 records/);assert.match(a.html(),/Cedar Analytics/);for(let i=0;i<4;i++)assert.match(a.html(),new RegExp('Draft company '+i));
});

test('sign-in offers Google, Microsoft, and SSO, and each starts the same onboarding',()=>{
 for(const provider of ['google-login','microsoft-login','sso-login']){const a=environment();assert.match(a.html(),/Continue with Google/);assert.match(a.html(),/Continue with Microsoft/);assert.match(a.html(),/Continue with SSO/);a.element(provider).onclick();assert.match(a.html(),/Your partner program/);}
});

test('Salesforce is connected from the start: no connect step, and submissions never redirect to Salesforce updates',()=>{
 const a=environment();a.run('beginOnboarding()');assert.equal(a.run('state.crm.connected'),true);assert.match(a.html(),/Salesforce connected/);assert.match(a.html(),/LAST STEP/);assert.doesNotMatch(a.html(),/Connect later|Back to connection/);
 a.run("handleEntryAction('finish')");assert.equal(a.location.hash,'#dashboard');assert.match(a.html(),/sync-status ok/);
 a.click({page:'leads'});act(a,'new-lead');a.submit('sales-record-form',leadValues);const id=a.run('detailRecord.id');act(a,'submit-lead','lead',id);assert.equal(a.location.hash,'#leads','stays on the page the partner is working in');a.sync();assert.equal(a.run(`getRecord('lead','${id}').status`),'Submitted');assert.equal(a.location.hash,'#leads');assert.match(a.html(),/Salesforce synced/);
 a.run('workflow.failNext()');act(a,'edit','lead',id);a.submit('sales-record-form',{...leadValues,contact:'Changed Contact'});a.sync();assert.match(a.html(),/Salesforce sync failed · retry/);assert.equal(a.location.hash,'#leads');
 a.click({page:'crm'});assert.match(a.html(),/Connected to your vendor/);assert.doesNotMatch(a.html(),/data-sales-action="connect-salesforce"/);
});

test('dashboard shows only next actions and three pipeline counts',()=>{
 const a=environment();a.login();a.run("go('dashboard')");const html=a.html();
 assert.match(html,/Your next actions/);assert.match(html,/data-sales-action="new-deal"/);assert.match(html,/data-sales-action="new-lead"/);
 for(const label of ['Leads in progress','Registrations awaiting approval','Open CRM opportunities'])assert.match(html,new RegExp(label));
 assert.equal([...html.matchAll(/class="card stat"/g)].length,3);assert.doesNotMatch(html,/60-Second|sec elapsed|seconds/i);
});

test('Deal Registrations and CRM Opportunities are separate lists of the same journey',()=>{
 const a=environment();a.login();a.click({page:'deals'});a.click({salesView:'list'});const regs=a.html();assert.match(regs,/Pending approval/);
 a.click({page:'opportunities'});const opps=a.run('scopedRecords().map(d=>d.id).sort().join()');assert.equal(opps,a.run("workflow.list('deal').filter(d=>d.registration==='Approved'&&d.opportunityId).map(d=>d.id).sort().join()"));assert.ok(!opps.includes('D102'),'pending registrations are not opportunities yet');
 assert.match(a.html(),/Proposal|Discovery/);act(a,'open','deal','D103');assert.match(a.overlay(),/CRM opportunity/);assert.match(a.overlay(),/03 · CRM OPPORTUNITY/);
});
