/* Local Salesforce simulator. Canonical CRM records, durable outbox, partner-scoped access. */
(function(root){
'use strict';
const copy=v=>JSON.parse(JSON.stringify(v));
const LEAD_STAGES=['Draft','Submitted','Assigned','Accepted','Contacted','Qualification requested','Needs information','Qualified','Disqualified','Declined'];
const REG_STAGES=['Draft','Pending review','Approved','Rejected'];
const OPP_STAGES=['Discovery','Proposal','Negotiation','Won','Lost'];
const PRODUCTS=['Sales Cloud','Service Cloud','Platform'];
const REGIONS=['North America','Europe','Asia Pacific','Other'];
const clean=v=>String(v??'').trim();
const validDate=v=>/^\d{4}-\d{2}-\d{2}$/.test(v||'')&&Number.isFinite(Date.parse(v+'T12:00:00Z'))&&new Date(v+'T12:00:00Z').toISOString().slice(0,10)===v;
const key=(company,product)=>clean(company).toLowerCase().replace(/[^a-z0-9]/g,'')+'|'+product;
class WorkflowError extends Error { constructor(message,code='VALIDATION'){super(message);this.code=code;} }
function compactSamples(state){
 const s=state.sales;if(s.compactSamplesVersion===1)return;
 const linked=s.deals.find(d=>d.id==='D101');
 const candidates=['L102','L107',...(!linked||linked.sample&&linked.history.length===1?['L106']:[])];
 const retired=s.leads.filter(r=>candidates.includes(r.id)&&r.sample&&r.history.length===1);
 const retireDeal=retired.some(r=>r.id==='L106')&&linked;
 s.retiredSamples=[...retired,...(retireDeal?[linked]:[])];
 s.leads=s.leads.filter(r=>!retired.includes(r));
 for(const r of retired)if(r.crmId)delete s.crm.leads[r.crmId];
 if(retireDeal){s.deals=s.deals.filter(r=>r!==linked);delete s.crm.registrations[linked.crmId];delete s.crm.opportunities[linked.opportunityId];}
 s.crm.jobs=s.crm.jobs.filter(j=>s.crm.leads[j.crmId]||s.crm.registrations[j.crmId]);
 s.compactSamplesVersion=1;
}
function initialize(state,{migrate=false}={}){
 if(state.sales?.version===1){compactSamples(state);return;}
 const now=new Date().toISOString();
 const old=copy({leads:state.leads||[],deals:state.deals||[],activity:state.activity||[]});
 state.sales={version:1,partnerId:'partner-acme',sequence:1000,leads:[],deals:[],outbox:[],notifications:[],lastSync:null,failNext:false,crm:{leads:{},registrations:{},opportunities:{},processed:{},jobs:[],tick:0}};
 if(migrate){state.sales.legacyArchive=old;}
 const s=state.sales;
 function lead(id,company,contact,origin,status,value,source){
  const r={id,partnerId:s.partnerId,company,contact,email:contact.toLowerCase().replace(/\s+/g,'.')+'@'+company.toLowerCase().replace(/\s+/g,'')+'.example',jobTitle:'Director, Technology',origin,status,value,source,receivedFrom:origin==='crm'?'Vendor · Salesforce':source,region:'North America',need:'Replace disconnected sales processes with a shared customer workspace.',consent:true,createdAt:now,updatedAt:now,crmId:status==='Draft'?null:'00Q-'+id,nextStep:'',activities:[],history:[{time:now,title:origin==='crm'?'Assigned by vendor':'Lead created',detail:origin==='crm'?'Salesforce assigned this lead to your partner organization.':'Introduced by '+source,actor:origin==='crm'?'Salesforce (simulated)':'Partner'}],sync:{status:status==='Draft'?'local':'synced'},sample:true};
  s.leads.push(r);if(r.crmId)s.crm.leads[r.crmId]=copy(r);return r;
 }
 const a=lead('L101','Cedar Analytics','Ethan Brooks','partner','Draft',85000,'Brightwave referral');
 const b=lead('L102','Meridian Logistics','Grace Liu','partner','Submitted',150000,'Partner website');
 const c=lead('L103','Beacon Medical','Olivia Grant','partner','Qualified',240000,'Customer referral');
 const d=lead('L104','Harbor Systems','Ava Chen','crm','Assigned',68000,'Vendor inbound campaign');
 const e=lead('L105','Helios Freight','Marcus Lee','crm','Contacted',180000,'Vendor product enquiry');
 e.activities.push({id:'A100',type:'Call',note:'Discussed deployment needs and confirmed the customer is interested.',time:now,synced:true});s.crm.leads[e.crmId]=copy(e);
 const f=lead('L106','Spruce Retail','Emma Lawson','crm','Qualified',165000,'Vendor webinar');
 const g=lead('L107','Oakwell Health','Isaac Patel','partner','Needs information',92000,'Partner event');
 g.need='Explore CRM';g.reviewReason='Please describe the customer need in at least 20 characters and confirm the estimated value.';s.crm.leads[g.crmId]=copy(g);
 s.crm.jobs.push({kind:'qualify',crmId:b.crmId,due:1});
 function deal(id,l,registration,stage,value,product='Sales Cloud'){
  const r={id,partnerId:s.partnerId,leadId:l?.id||null,company:l?.company||'Atlas Manufacturing',contact:l?.contact||'Michael Bennett',email:l?.email||'michael@atlas.example',region:'North America',name:(l?.company||'Atlas Manufacturing')+' rollout',product,value,expectedClose:'2026-12-20',need:l?.need||'Modernize the sales workflow across five regional offices.',consent:true,confirmedNeed:true,registration,stage:registration==='Approved'?stage:null,crmId:'REG-'+id,opportunityId:registration==='Approved'?'006-'+id:null,createdAt:now,updatedAt:now,activities:[],history:[{time:now,title:'Registration '+registration.toLowerCase(),detail:registration==='Approved'?'Registration approved; linked to a Salesforce opportunity.':'Awaiting vendor review of this registration.',actor:'Salesforce (simulated)'}],sync:{status:'synced'},sample:true};
  if(l){l.dealId=id;s.crm.leads[l.crmId]=copy(l);}
  s.deals.push(r);s.crm.registrations[r.crmId]=copy(r);
  if(r.opportunityId)s.crm.opportunities[r.opportunityId]=copy({...r,id:r.opportunityId,registrationId:r.crmId});
  return r;
 }
 deal('D101',f,'Approved','Discovery',165000);
 const review=deal('D102',null,'Pending review',null,310000);s.crm.jobs.push({kind:'registration',crmId:review.crmId,due:1});
 const proposal=deal('D103',null,'Approved','Proposal',125000,'Service Cloud');proposal.company='Summit Networks';proposal.name='Service rollout';s.crm.registrations[proposal.crmId]=copy(proposal);s.crm.opportunities[proposal.opportunityId]=copy({...proposal,id:proposal.opportunityId,registrationId:proposal.crmId});
 const won=deal('D104',null,'Approved','Won',280000,'Platform');won.company='Ember Energy';won.name='Platform deployment';s.crm.registrations[won.crmId]=copy(won);s.crm.opportunities[won.opportunityId]=copy({...won,id:won.opportunityId,registrationId:won.crmId});
 const lost=deal('D105',null,'Approved','Lost',95000,'Service Cloud');lost.company='Pinecrest Media';lost.name='Service transformation';lost.outcomeReason='Customer deferred the project.';s.crm.registrations[lost.crmId]=copy(lost);s.crm.opportunities[lost.opportunityId]=copy({...lost,id:lost.opportunityId,registrationId:lost.crmId});
 const privateLead={...copy(d),id:'private-lead',crmId:'00Q-private',company:'Private customer',partnerId:'another-partner'};s.crm.leads[privateLead.crmId]=privateLead;
 s.crm.opportunities['006-conflict']={id:'006-conflict',company:'Evergreen Systems',product:'Sales Cloud',partnerId:'another-partner',stage:'Negotiation'};
 s.crm.opportunities['006-linkable']={id:'006-linkable',company:'Northstar Services',product:'Sales Cloud',partnerId:s.partnerId,stage:'Discovery',value:75000,expectedClose:'2026-12-20'};
 if(migrate)old.leads.filter(l=>!l.isSample).forEach((l,i)=>{
  const imported={...copy(a),id:'L-import-'+i,company:l.company||'Imported lead',contact:l.contact||'',email:l.email||'',jobTitle:l.jobTitle||'',source:l.source||'Previous portal',receivedFrom:l.receivedFrom||l.source||'Previous portal',value:Number(l.value)||0,need:l.opportunity||l.nextStep||'',consent:false,status:'Draft',crmId:null,sample:false,legacyStatus:l.status,legacyHistory:l.history||[],history:[{time:now,title:'Imported draft',detail:'Previous preview data preserved. Confirm customer details before submitting to Salesforce.',actor:'System'}]};s.leads.push(imported);
 });
 compactSamples(state);
 s.notifications.push({id:'N100',partnerId:s.partnerId,type:'lead',recordId:d.id,title:'New CRM lead assigned',detail:'Harbor Systems is ready for you to accept.',time:now,read:false});
}
function create(state,options={}){
 const s=state.sales,crm=s.crm,clock=options.now||(()=>new Date().toISOString()),persist=options.save||(()=>{}),auth=options.authorized||(()=>true);
 function session(){if(!auth())throw new WorkflowError('Sign in and complete setup first.','AUTH');}
 function rows(type){return type==='lead'?s.leads:type==='deal'?s.deals:[];}
 function visible(r){return r.partnerId===s.partnerId;}
 function accessible(type,r){const remote=r.crmId&&(type==='lead'?crm.leads[r.crmId]:crm.registrations[r.crmId]);const opp=r.opportunityId&&crm.opportunities[r.opportunityId];return visible(r)&&(!remote||visible(remote))&&(!opp||visible(opp));}
 function list(type){session();return rows(type).filter(r=>accessible(type,r));}
 function get(type,id){session();const r=rows(type).find(r=>r.id===id&&accessible(type,r));if(!r)throw new WorkflowError('This record is not available to your partner account.','ACCESS');return r;}
 function uid(prefix){s.sequence++;return prefix+s.sequence;}
 function history(r,title,detail,actor='Partner'){r.history.push({time:clock(),title,detail,actor});r.updatedAt=clock();}
 function notify(type,r,title,detail){s.notifications.unshift({id:uid('N'),partnerId:s.partnerId,type,recordId:r.id,title,detail,time:clock(),read:false});}
 function busy(r){if(['pending','syncing','failed'].includes(r.sync.status))throw new WorkflowError('Finish or retry the pending Salesforce update first.','PENDING');}
 function base(v){return {company:clean(v.company),contact:clean(v.contact),email:clean(v.email).toLowerCase(),jobTitle:clean(v.jobTitle),value:Number(v.value)||0,region:clean(v.region)||'North America',need:clean(v.need),consent:v.consent===true||v.consent==='on',source:clean(v.source)||'Partner referral'};}
 function validate(v,deal=false){
  const errors=[];
  if(!v.company)errors.push('Company is required.');if(!v.contact)errors.push('Contact name is required.');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email||''))errors.push('Enter a valid customer email.');
  if(!Number.isFinite(v.value)||v.value<=0||v.value>1000000000)errors.push('Estimated value must be between 1 and 1,000,000,000.');
  if(!v.need||v.need.length<10)errors.push('Describe the customer need in at least 10 characters.');
  if(!REGIONS.includes(v.region))errors.push('Select a customer region.');
  if(!v.consent)errors.push('Confirm permission to share the customer information with the vendor.');
  if(deal){
   if(!v.name)errors.push('Opportunity name is required.');if(!PRODUCTS.includes(v.product))errors.push('Select a supported product.');
   if(!validDate(v.expectedClose)||v.expectedClose<clock().slice(0,10))errors.push('Choose an expected close date today or later.');
   if(!v.confirmedNeed)errors.push('Confirm that you have discussed the customer need.');
  }
  if(errors.length)throw new WorkflowError(errors.join(' '));
 }
 function canonical(type,r){const remote=type==='lead'?crm.leads[r.crmId]:crm.registrations[r.crmId];if(remote&&!visible(remote))throw new WorkflowError('Salesforce no longer authorizes this record for your account.','ACCESS');return remote;}
 function enqueue(type,r,action,payload={}){
  busy(r);canonical(type,r);const op={id:uid('OP'),type,recordId:r.id,partnerId:s.partnerId,action,payload:copy(payload),baseline:action==='edit'?Object.fromEntries(Object.keys(payload).map(key=>[key,r[key]])):null,state:'pending',attempts:0,createdAt:clock()};
  s.outbox.push(op);r.sync={status:'pending',operationId:op.id};history(r,'Update queued',operationLabel(action));persist();return r;
 }
 function operationLabel(action){return {submitLead:'Submit lead to vendor Salesforce',edit:'Save customer updates to Salesforce',accept:'Accept CRM assignment',decline:'Decline CRM assignment',qualify:'Request vendor qualification',activity:'Sync customer activity',complete:'Complete follow-up',register:'Validate deal registration',stage:'Update Salesforce opportunity stage'}[action]||action;}
 function createLead(v){session();const data=base(v);if(!data.company)throw new WorkflowError('Company is required to save a draft.');const r={id:uid('L'),partnerId:s.partnerId,origin:'partner',status:'Draft',receivedFrom:data.source,...data,crmId:null,activities:[],history:[],createdAt:clock(),updatedAt:clock(),sync:{status:'local'}};history(r,'Draft created','Not submitted. Complete the details, then submit to the vendor.');s.leads.unshift(r);persist();return r;}
 function edit(type,id,v){const r=get(type,id);busy(r);if(type==='deal'&&r.registration!=='Draft'&&r.registration!=='Rejected')throw new WorkflowError('Submitted registrations are read-only. Add activity or update the opportunity instead.');if(type==='lead'&&['Assigned','Declined','Disqualified'].includes(r.status))throw new WorkflowError('Accept an assigned lead before proposing changes. Closed leads cannot be edited.');
  const data=base({...r,...v});if(type==='deal')Object.assign(data,{name:clean(v.name??r.name),product:v.product||r.product,expectedClose:v.expectedClose||r.expectedClose,confirmedNeed:v.confirmedNeed===undefined?r.confirmedNeed:v.confirmedNeed===true||v.confirmedNeed==='on'});
  if(type==='deal'&&r.leadId){const lead=get('lead',r.leadId);for(const field of ['company','contact','email'])data[field]=lead[field];}
  if(type==='lead'&&r.crmId)data.source=r.source;
  if(!data.company)throw new WorkflowError('Company is required.');
  if(r.sync.status==='local'||(type==='deal'&&r.registration==='Rejected')){Object.assign(r,data);if(type==='deal'){r.registration='Draft';r.reason='';r.sync={status:'local'};}history(r,'Draft updated','Changes saved on this device.');persist();return r;}
  validate(data);const changes=Object.fromEntries(Object.entries(data).filter(([key,value])=>r[key]!==value));if(!Object.keys(changes).length)return r;return enqueue(type,r,'edit',changes);
 }
 function submitLead(id){const r=get('lead',id);if(r.origin!=='partner'||!['Draft','Needs information'].includes(r.status))throw new WorkflowError('Only a draft or returned partner lead can be submitted.');validate(r);return enqueue('lead',r,'submitLead');}
 function accept(id){const r=get('lead',id);if(r.origin!=='crm'||r.status!=='Assigned')throw new WorkflowError('This lead is not awaiting acceptance.');return enqueue('lead',r,'accept');}
 function decline(id,reason){const r=get('lead',id);if(r.origin!=='crm'||r.status!=='Assigned'||clean(reason).length<5)throw new WorkflowError('Provide a reason to decline this assignment.');return enqueue('lead',r,'decline',{reason:clean(reason)});}
 function qualify(id){const r=get('lead',id);if(r.origin!=='crm'||!['Contacted','Needs information'].includes(r.status))throw new WorkflowError('Accept and contact this customer before requesting qualification.');validate(r);return enqueue('lead',r,'qualify');}
 function addActivity(type,id,v){const r=get(type,id);if(type==='lead'&&['Draft','Assigned','Declined','Disqualified'].includes(r.status))throw new WorkflowError('Submit your lead or accept the assignment before adding activity.');if(type==='deal'&&r.registration!=='Approved')throw new WorkflowError('An approved registration is required before updating opportunity activity.');
  if(!['Note','Call','Email','Follow-up'].includes(v.type)||clean(v.note).length<3)throw new WorkflowError('Choose an activity and add a meaningful note.');
  if(v.type==='Follow-up'&&(!validDate(v.dueDate)||v.dueDate<clock().slice(0,10)))throw new WorkflowError('Choose a follow-up date today or later.');
  return enqueue(type,r,'activity',{id:uid('A'),type:v.type,note:clean(v.note),dueDate:v.type==='Follow-up'?v.dueDate:null,time:clock(),completed:false});
 }
 function completeActivity(type,id,activityId){const r=get(type,id),a=r.activities.find(a=>a.id===activityId);if(!a||a.type!=='Follow-up'||a.completed)throw new WorkflowError('This follow-up is not open.');return enqueue(type,r,'complete',{activityId});}
 function createDeal(v,leadId=null){session();let l=leadId?get('lead',leadId):null;if(l){busy(l);if(l.status!=='Qualified')throw new WorkflowError('Vendor qualification is required before registering this lead.');if(l.dealId){const existing=get('deal',l.dealId);if(existing.registration!=='Rejected')throw new WorkflowError('This lead already has a registration. Open the linked deal.','DUPLICATE');}}
  const data=base({...l,...v});if(l)for(const field of ['company','contact','email'])data[field]=l[field];const r={id:uid('D'),partnerId:s.partnerId,...data,leadId:l?.id||null,name:clean(v.name),product:v.product||'Sales Cloud',expectedClose:clean(v.expectedClose),confirmedNeed:v.confirmedNeed===true||v.confirmedNeed==='on',registration:'Draft',stage:null,crmId:null,opportunityId:null,activities:[],history:[],createdAt:clock(),updatedAt:clock(),sync:{status:'local'}};
  if(!r.company)throw new WorkflowError('Company is required to save a registration draft.');
  const duplicate=list('deal').find(d=>d.registration!=='Rejected'&&key(d.company,d.product)===key(r.company,r.product));if(duplicate)throw new WorkflowError('You already have a registration for this customer and product. Open it in My Deals.','DUPLICATE');
  history(r,'Registration draft created',l?'Linked to qualified lead '+l.id:'Direct registration. Qualification evidence must be confirmed before submission.');s.deals.unshift(r);if(l)l.dealId=r.id;persist();return r;
 }
 function submitDeal(id){const r=get('deal',id);if(r.registration!=='Draft')throw new WorkflowError('Only a draft can be submitted for registration.');validate(r,true);if(r.leadId&&get('lead',r.leadId).status!=='Qualified')throw new WorkflowError('The linked lead is not qualified.');
  if(list('deal').some(d=>d.id!==id&&d.registration!=='Rejected'&&key(d.company,d.product)===key(r.company,r.product)))throw new WorkflowError('Another registration already exists for this customer and product.','DUPLICATE');
  return enqueue('deal',r,'register');
 }
 function updateStage(id,stage,reason=''){const r=get('deal',id);if(r.registration!=='Approved'||!r.opportunityId)throw new WorkflowError('Registration must be approved and linked to an opportunity.');const allowed={Discovery:['Proposal','Lost'],Proposal:['Negotiation','Lost'],Negotiation:['Won','Lost']};if(!allowed[r.stage]?.includes(stage))throw new WorkflowError('Choose the next valid opportunity stage.');if(['Won','Lost'].includes(stage)&&clean(reason).length<5)throw new WorkflowError('Add an outcome note of at least 5 characters.');return enqueue('deal',r,'stage',{stage,reason:clean(reason)});}
 function approved(remote){
  const conflict=Object.values(crm.opportunities).find(o=>key(o.company,o.product)===key(remote.company,remote.product)&&!['Won','Lost'].includes(o.stage));
  if(conflict&&(!visible(conflict)||conflict.registrationId&&conflict.registrationId!==remote.crmId)){remote.registration='Rejected';remote.reason='An active registration already covers this customer and product. Ask the vendor to resolve the conflict.';return;}
  remote.registration='Approved';remote.reason='Eligibility and duplicate checks passed.';remote.approvedAt=clock();remote.opportunityId=conflict?.id||uid('006-');remote.stage=conflict?.stage||'Discovery';
  if(conflict){remote.value=conflict.value??remote.value;remote.expectedClose=conflict.expectedClose||remote.expectedClose;}
  crm.opportunities[remote.opportunityId]={...copy(remote),id:remote.opportunityId,registrationId:remote.crmId};
 }
 function apply(op){
  if(crm.processed[op.id])return copy(crm.processed[op.id]);
  const r=get(op.type,op.recordId);if(op.partnerId!==s.partnerId)throw new WorkflowError('Not authorized.','ACCESS');
  let remote=canonical(op.type,r);if(!remote&& !['submitLead','register'].includes(op.action))throw new WorkflowError('Salesforce record was not found.','CRM');
  remote=copy(remote||r);
  if(op.type==='deal'&&remote.opportunityId){const opp=crm.opportunities[remote.opportunityId];if(!opp||!visible(opp))throw new WorkflowError('Opportunity is unavailable.','ACCESS');for(const field of ['company','contact','email','value','expectedClose','activities'])if(opp[field]!==undefined)remote[field]=copy(opp[field]);}
  if(op.action==='submitLead'){if(remote.origin!=='partner'||!['Draft','Needs information'].includes(remote.status))throw new WorkflowError('The lead status changed in Salesforce. Refresh before submitting.','CONFLICT');validate(r);remote={...copy(r),crmId:r.crmId||uid('00Q-'),status:'Submitted',reviewReason:''};crm.jobs.push({kind:'qualify',crmId:remote.crmId,due:crm.tick+1});}
  if(op.action==='accept'){if(remote.status!=='Assigned')throw new WorkflowError('The CRM assignment has changed. Refresh Salesforce.','CONFLICT');remote.status='Accepted';}
  if(op.action==='decline'){if(remote.status!=='Assigned')throw new WorkflowError('The CRM assignment has changed.','CONFLICT');remote.status='Declined';remote.reviewReason=op.payload.reason;}
  if(op.action==='edit'){if(op.baseline&&Object.keys(op.payload).some(key=>JSON.stringify(remote[key])!==JSON.stringify(op.baseline[key])))throw new WorkflowError('These customer details changed in Salesforce. Discard this update to load the latest values, then edit again.','CONFLICT');Object.assign(remote,op.payload);validate(remote);}
  if(op.action==='qualify'){if(!['Contacted','Needs information'].includes(remote.status))throw new WorkflowError('Contact the customer before qualification.','CONFLICT');remote.status='Qualification requested';crm.jobs.push({kind:'qualify',crmId:remote.crmId,due:crm.tick+1});}
  if(op.action==='activity'){remote.activities.push({...op.payload,synced:true});if(op.type==='lead'&&remote.origin==='crm'&&remote.status==='Accepted'&&['Call','Email'].includes(op.payload.type))remote.status='Contacted';}
  if(op.action==='complete'){const a=remote.activities.find(a=>a.id===op.payload.activityId);if(!a)throw new WorkflowError('Follow-up no longer exists.','CONFLICT');a.completed=true;}
  if(op.action==='register'){
   validate(r,true);if(r.leadId){const lead=get('lead',r.leadId),confirmed=canonical('lead',lead);if(confirmed?.status!=='Qualified')throw new WorkflowError('Salesforce has not confirmed qualification for the linked lead.','CONFLICT');}remote={...copy(r),crmId:r.crmId||uid('REG-'),registration:'Pending review',reason:''};
   if(remote.value>=250000||remote.region==='Other'){remote.reason='Vendor review required for '+(remote.region==='Other'?'this territory.':'registrations of $250,000 or more.');crm.jobs.push({kind:'registration',crmId:remote.crmId,due:crm.tick+1});}
   else approved(remote);
  }
  if(op.action==='stage'){
   const opp=crm.opportunities[remote.opportunityId];if(!opp||!visible(opp))throw new WorkflowError('Opportunity is unavailable.','ACCESS');
   const allowed={Discovery:['Proposal','Lost'],Proposal:['Negotiation','Lost'],Negotiation:['Won','Lost']};if(!allowed[opp.stage]?.includes(op.payload.stage))throw new WorkflowError('The opportunity stage changed in Salesforce. Refresh and try again.','CONFLICT');
   remote.stage=op.payload.stage;remote.outcomeReason=op.payload.reason;remote.closedAt=['Won','Lost'].includes(remote.stage)?clock():null;Object.assign(opp,{stage:remote.stage,outcomeReason:remote.outcomeReason,closedAt:remote.closedAt});
  }
  remote.updatedAt=clock();remote.sync={status:'synced',lastSynced:clock()};
  if(op.type==='lead')crm.leads[remote.crmId]=copy(remote);else {crm.registrations[remote.crmId]=copy(remote);if(remote.opportunityId&&crm.opportunities[remote.opportunityId])Object.assign(crm.opportunities[remote.opportunityId],{activities:copy(remote.activities),company:remote.company,contact:remote.contact,email:remote.email});}
  crm.processed[op.id]=copy(remote);return remote;
 }
 function merge(type,r,remote,title){const histories=r.history,dealId=r.dealId;Object.assign(r,copy(remote));r.history=histories;if(dealId)r.dealId=dealId;r.sync={status:'synced',lastSynced:clock()};history(r,title,type==='lead'?'Lead status: '+r.status:'Registration: '+r.registration+(r.stage?' · Opportunity: '+r.stage:''),'Salesforce (simulated)');notify(type,r,title,r.company+' · '+(type==='lead'?r.status:r.registration+(r.stage?' · '+r.stage:'')));}
 function vendorUpdates(){
  const jobs=crm.jobs.filter(j=>j.due<=crm.tick);crm.jobs=crm.jobs.filter(j=>j.due>crm.tick);
  for(const j of jobs){
   const remote=j.kind==='qualify'?crm.leads[j.crmId]:crm.registrations[j.crmId];if(!remote)continue;
   if(j.kind==='qualify'){if(remote.need.length<20){remote.status='Needs information';remote.reviewReason='Describe the customer need in at least 20 characters before requesting review again.';}else{remote.status=remote.region==='Other'?'Disqualified':'Qualified';remote.reviewReason=remote.status==='Disqualified'?'The customer territory is outside this partner program. Contact your vendor representative for alternatives.':'Vendor confirmed customer need, contact information, and estimated value.';if(remote.status==='Qualified')remote.qualifiedAt=clock();}}
   else if(remote.region==='Other'){remote.registration='Rejected';remote.reason='This customer territory is outside the current program. Correct the region or contact the vendor.';}else approved(remote);
  }
 }
 function pull(){
  for(const type of ['lead','deal']){
   const remotes=Object.values(type==='lead'?crm.leads:crm.registrations);
   for(const remote of remotes){if(!visible(remote))continue;let local=rows(type).find(r=>r.crmId===remote.crmId);if(!local){local=copy(remote);rows(type).push(local);notify(type,local,'New CRM '+(type==='lead'?'assignment':'registration'),local.company);continue;}
    if(['local','pending','syncing','failed'].includes(local.sync.status))continue;
    if(type==='deal'&&remote.opportunityId){const opp=crm.opportunities[remote.opportunityId];if(opp&&visible(opp)){for(const field of ['stage','value','expectedClose','outcomeReason','closedAt','company','contact','email','activities'])if(opp[field]!==undefined)remote[field]=copy(opp[field]);}}
    const fields=type==='lead'?['status','company','contact','email','value','need','region','reviewReason','source','receivedFrom','jobTitle','activities']:['registration','stage','company','contact','email','value','reason','opportunityId','expectedClose','outcomeReason','closedAt','activities'];
    if(fields.some(k=>JSON.stringify(local[k])!==JSON.stringify(remote[k])))merge(type,local,remote,type==='lead'?'Vendor lead update':'Salesforce deal update');
   }
   // Revoked assignments are hidden everywhere, including notifications and exports.
   for(const r of rows(type)){const remote=r.crmId&&(type==='lead'?crm.leads[r.crmId]:crm.registrations[r.crmId]);if(remote&&!visible(remote))r.partnerId=remote.partnerId;}
  }
 }
 function sync(){
  session();if(!state.crm.connected)throw new WorkflowError('Connect Salesforce before syncing.','OFFLINE');
  crm.tick++;
  const pending=s.outbox.filter(o=>o.partnerId===s.partnerId&&['pending','failed','syncing'].includes(o.state));
  if(s.failNext||options.isOnline?.()===false){const offline=options.isOnline?.()===false;s.failNext=false;for(const op of pending){op.state='failed';op.attempts++;op.error=offline?'You are offline. Reconnect to the internet, then retry this saved update.':'Simulated Salesforce connection failure. Retry to send this saved update.';const r=rows(op.type).find(r=>r.id===op.recordId&&visible(r));if(r){r.sync={status:'failed',operationId:op.id,error:op.error};history(r,'Sync failed',op.error,'System');}}s.lastError=offline?'You are offline. Your updates are saved. Retry when your connection returns.':'Salesforce is temporarily unavailable in this simulated run.';persist();return {ok:false,failed:pending.length||1,completed:0};}
  vendorUpdates();let completed=0,failed=0;
  for(const op of pending){op.attempts++;try{const r=get(op.type,op.recordId);const remote=apply(op);merge(op.type,r,remote,operationLabel(op.action)+' · complete');op.state='done';op.error='';completed++;}catch(error){op.state='failed';op.error=error.message;const r=rows(op.type).find(r=>r.id===op.recordId&&visible(r));if(r)r.sync={status:'failed',operationId:op.id,error:error.message};failed++;}}
  pull();s.lastSync=clock();state.crm.lastSync=clock();s.lastError=failed?'Some updates need attention.':'';persist();return {ok:failed===0,failed,completed};
 }
 function discard(type,id){const r=get(type,id);if(r.sync.status!=='failed')throw new WorkflowError('Only a failed update can be discarded.');const op=s.outbox.find(o=>o.id===r.sync.operationId);if(op)op.state='cancelled';r.sync={status:r.crmId?'synced':'local'};history(r,'Failed update discarded','The last confirmed CRM values were kept.');pull();persist();}
 function notifications(){session();return s.notifications.filter(n=>n.partnerId===s.partnerId&&rows(n.type).some(r=>r.id===n.recordId&&accessible(n.type,r)));}
 function readNotification(id){const n=notifications().find(n=>n.id===id);if(!n)throw new WorkflowError('Notification not available.','ACCESS');n.read=true;persist();return n;}
 function failNext(){session();s.failNext=true;persist();}
 return {list,get,createLead,edit,submitLead,accept,decline,qualify,addActivity,completeActivity,createDeal,submitDeal,updateStage,sync,discard,notifications,readNotification,failNext,validate};
}
const api={initialize,create,LEAD_STAGES,REG_STAGES,OPP_STAGES,PRODUCTS,REGIONS,WorkflowError};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.SalesWorkflow=api;
})(typeof globalThis!=='undefined'?globalThis:this);
