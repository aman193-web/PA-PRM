/* Partner manager portal: the vendor side of the partner program. It reads and writes the same
   browser-local Salesforce simulation the partners work in, so partner submissions arrive here
   instantly (storage events) and decisions made here reach partners the same way. */
(function(){
'use strict';
const KEY='minute-v1',SESSION='prm-manager-session',MANAGER={name:'Riley Chen',title:'Partner manager',initials:'RC'};
const W=SalesWorkflow,PAGES={overview:'Overview',queue:'Lead reviews',registrations:'Deal registrations',distribution:'Lead distribution',leads:'All partner leads',opportunities:'Opportunities',partners:'Partners'};
const SOURCES=['Vendor webinar','Vendor website enquiry','Vendor campaign','Trade show','Customer referral to vendor'];
// Vendor-side partner directory: program tier, partner type, territory, and annual sourced-pipeline target.
const PROFILES={
 'partner-acme':{tier:'Gold',type:'Reseller',region:'North America',joined:'2023-03-14',code:'PRT-1001',contact:'Alex Morgan',email:'alex.morgan@acmepartners.example',sellers:6,target:1500000,benefit:'25% resale margin'},
 'another-partner':{tier:'Platinum',type:'Systems integrator',region:'Europe',joined:'2021-09-01',code:'PRT-1002',contact:'Hannah Weiss',email:'hannah.weiss@northbridge.example',sellers:14,target:2000000,benefit:'30% resale margin'},
 'partner-cobalt':{tier:'Silver',type:'Managed service provider',region:'Asia Pacific',joined:'2024-06-10',code:'PRT-1003',contact:'Kenji Watanabe',email:'kenji.watanabe@cobaltsystems.example',sellers:3,target:800000,benefit:'20% resale margin'}};
const OPEN=['Discovery','Proposal','Negotiation'],OPP_STAGES=[...OPEN,'Won','Lost'];
const icons={overview:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',review:'<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 13l2 2 4-4"/>',assign:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/>',leads:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M17 4a4 4 0 0 1 0 8M22 21v-2a4 4 0 0 0-3-3.87"/><circle cx="9" cy="7" r="4"/>',partners:'<path d="M3 21h18M5 21V8l7-5 7 5v13M9 21v-5h6v5M9 11h.01M15 11h.01"/>',opportunity:'<path d="M3 17l6-6 4 4 8-8M15 7h6v6"/>',team:'<path d="M4 21V4h11v17M15 10h5v11M8 8h3M8 12h3M8 16h3M2 21h20"/>',security:'<path d="M12 3l8 3v6c0 5-8 9-8 9s-8-4-8-9V6zM9 12l2 2 4-4"/>',arrow:'<path d="M5 12h14M14 7l5 5-5 5"/>',check:'<path d="M5 12l4 4L19 6"/>',warn:'<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',cross:'<path d="M18 6 6 18M6 6l12 12"/>',clock:'<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6M12 2v3M18 5l2-2"/>',plus:'<path d="M12 5v14M5 12h14"/>',menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',logout:'<path d="M9 4H4v16h5M10 12h11M17 8l4 4-4 4"/>',book:'<path d="M12 5v16M3 3c4 0 7 0 9 2 2-2 5-2 9-2v16c-5 0-7 0-9 2-2-2-4-2-9-2z"/>',phone:'<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',meeting:'<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',bell:'<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',inbox:'<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5h13L22 12v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6z"/>',trophy:'<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',award:'<circle cx="12" cy="9" r="6"/><path d="M8.5 14 7 22l5-3 5 3-1.5-8"/>',globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>'};
const icon=name=>`<svg viewBox="0 0 24 24" aria-hidden="true">${icons[name]||icons.check}</svg>`;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=v=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(v||0);
const short=v=>{v=Number(v)||0;return v>=1e6?'$'+(v/1e6).toFixed(2).replace(/\.?0+$/,'')+'M':v>=1e3?'$'+Math.round(v/1e3)+'K':'$'+v;};
const date=v=>v?new Date(v.length===10?v+'T12:00:00Z':v).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):'—';
const time=v=>v?new Date(v).toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}):'—';
function ago(v){if(!v)return '—';const minutes=Math.max(0,Math.round((Date.now()-Date.parse(v))/6e4));return minutes<1?'just now':minutes<60?minutes+' min ago':minutes<1440?Math.round(minutes/60)+' h ago':Math.round(minutes/1440)+' d ago';}
const initials=n=>String(n||'').split(' ').map(x=>x[0]).slice(0,2).join('').toUpperCase();
const sum=(list,value=o=>o.value)=>list.reduce((total,o)=>total+(Number(value(o))||0),0),wonValue=o=>Number(o.wonAmount)||Number(o.value)||0;

let state=load(),page='overview',detailId=null,linkedLead=null,linkedReg=null,signedIn=sessionFlag(),navOpen=false,toastTimer=0,snapshot={},unseen=0;
let leadFilter={partner:'all',group:'all'},oppFilter={partner:'all',stage:'all'};
function sessionFlag(){try{return sessionStorage.getItem(SESSION)==='1';}catch{return false;}}
function load(){let saved=null;try{saved=JSON.parse(localStorage.getItem(KEY)||'null');}catch{}const s=saved||{company:{},user:{},settings:{},activity:[],crm:{name:'Salesforce',connected:false,lastSync:'Never synced'}};W.initialize(s,{migrate:!!saved});localStorage.setItem(KEY,JSON.stringify(s));return s;}
function save(){localStorage.setItem(KEY,JSON.stringify(state));}
// Read the latest shared data before each change, so nothing a partner just did is overwritten.
function adopt(){try{const saved=JSON.parse(localStorage.getItem(KEY)||'null');if(saved?.sales)state=saved;}catch{}}
const mgr=()=>W.manage(state,{save,reviewer:MANAGER.name});
function act(change,message){adopt();try{const result=change(mgr());takeSnapshot();if(message)toast(message);return result;}catch(error){const area=document.getElementById('mgr-form-error');if(area)area.textContent=error.message;else toast(error.message);return null;}}
function toast(message){clearTimeout(toastTimer);const el=document.getElementById('toast');el.textContent=message;el.classList.add('show');toastTimer=setTimeout(()=>el.classList.remove('show'),5000);}

// ---- Shared components ----
const LABELS={Submitted:'Awaiting review',Assigned:'Awaiting acceptance','Pending review':'Awaiting review'};
function pill(stage){const tone=['Qualified','Converted','Approved','Won'].includes(stage)?'':['Rejected','Declined','Closed','Lost'].includes(stage)?'red':['Submitted','Needs information','Assigned','Pending review'].includes(stage)?'amber':stage==='Withdrawn'?'neutral':'blue';return `<span class="badge pill ${tone}"><i></i>${esc(LABELS[stage]||W.leadLabel(stage))}</span>`;}
function logo(name){const tones=['sage','lavender','sand','blue','rose'],n=[...String(name)].reduce((a,c)=>a+c.charCodeAt(0),0);return `<span class="company-logo ${tones[n%5]}">${esc(String(name).slice(0,1).toUpperCase())}</span>`;}
const partnerLogo=(id,size='')=>`<span class="mgr-plogo ${esc((PROFILES[id]?.tier||'').toLowerCase())} ${size}">${esc(initials(mgr().partnerName(id)))}</span>`;
const tier=t=>t?`<span class="mgr-tier ${esc(t.toLowerCase())}">${icon('award')}${esc(t)}</span>`:'';
const progress=pct=>`<span class="mgr-progress" role="img" aria-label="${pct}%"><i style="width:${Math.max(2,Math.min(100,pct))}%"></i></span>`;
const companyCell=r=>`<div class="company-cell">${logo(r.company)}<span><b>${esc(r.company)}</b><small>${esc(r.contact)}</small></span></div>`;
const dealCell=d=>`<div class="company-cell">${logo(d.company)}<span><b>${esc(d.company)}</b><small>${esc(d.name||d.product)}</small></span></div>`;
const partnerLink=id=>`<button class="mgr-partner-link" data-open-partner="${esc(id)}">${esc(mgr().partnerName(id))}</button>`;
const heading=(title,sub,actions='')=>`<div class="page-heading"><div><h1>${title}</h1><p class="subtitle">${sub}</p></div><div class="heading-actions">${actions}</div></div>`;
const emptyRow=(cols,text)=>`<tr><td colspan="${cols}" class="empty">${text}</td></tr>`;
const table=(head,rows,empty)=>`<div class="table-responsive table-wrap"><table class="table table-vcenter data-table"><thead><tr>${head.map(h=>`<th${h.startsWith('#')?' class="numeric"':''}>${h.replace(/^#/,'')}</th>`).join('')}</tr></thead><tbody>${rows.join('')||emptyRow(head.length,empty)}</tbody></table></div>`;
const panel=(title,sub,body,extra='',cls='')=>`<section class="card mgr-panel ${cls}"><header class="card-header"><div><h3 class="card-title">${title}</h3>${sub?`<p class="panel-sub">${sub}</p>`:''}</div>${extra}</header>${body}</section>`;
const assignButton=(label='Assign a lead',partnerId='')=>`<button class="btn btn-primary" data-action="assign" ${partnerId?`data-assign-to="${esc(partnerId)}"`:''}>${icon('plus')}${label}</button>`;
function checkPills(checks){const [dup,...rest]=checks.items,pills=[`<span class="pill ${dup.ok?(dup.warn?'amber':''):'red'}"><i></i>${dup.ok?(dup.warn?'Similar records':'No duplicates'):'Duplicate'}</span>`];for(const item of rest)if(!item.ok)pills.push(`<span class="pill ${item.id==='territory'?'red':'amber'}"><i></i>${{territory:'Outside territory',contact:'Contact incomplete',need:'Thin details',consent:'No permission'}[item.id]}</span>`);return `<div class="lead-card-chips mgr-pills">${pills.join('')}</div>`;}
function regPills(checks){const by=Object.fromEntries(checks.items.map(i=>[i.id,i])),c=by.conflict,pills=[`<span class="pill ${c.ok?(c.warn?'amber':''):'red'}"><i></i>${c.ok?(c.warn?'Links open opportunity':'No conflicts'):'Conflict'}</span>`];if(!by.evidence.ok)pills.push('<span class="pill amber"><i></i>No evidence</span>');if(!by.territory.ok)pills.push('<span class="pill red"><i></i>Outside territory</span>');if(by.size.warn)pills.push('<span class="pill amber"><i></i>Large deal</span>');if(!by.close.ok)pills.push('<span class="pill amber"><i></i>No close date</span>');return `<div class="lead-card-chips mgr-pills">${pills.join('')}</div>`;}

// ---- Program metrics ----
function partnerStats(m,id){
 const leads=m.leads().filter(r=>r.partnerId===id),opps=m.opportunities().filter(o=>o.partnerId===id),open=opps.filter(o=>OPEN.includes(o.stage)),won=opps.filter(o=>o.stage==='Won'),lost=opps.filter(o=>o.stage==='Lost');
 const answered=leads.filter(r=>r.origin==='crm'&&r.status!=='Assigned'),accepted=answered.filter(r=>r.status!=='Declined').length,pipeline=sum(open),wonTotal=sum(won,wonValue),target=PROFILES[id]?.target||0;
 return {leads,opps,open,won,pipeline,wonTotal,active:leads.filter(r=>['Approved','Accepted','Working','Qualified'].includes(m.stage(r))).length,
  winRate:won.length+lost.length?Math.round(won.length*100/(won.length+lost.length)):null,acceptance:answered.length?Math.round(accepted*100/answered.length):null,
  pending:m.queue().filter(r=>r.partnerId===id).length+m.registrationQueue().filter(d=>d.partnerId===id).length,attainment:target?Math.round((pipeline+wonTotal)*100/target):0,target};
}
// Everything waiting on the partner manager: registrations to decide first (oldest first), then response-time breaches.
function attention(m){
 const decisions=[...m.queue().map(r=>({kind:'Lead registration',r,when:r.submittedAt||r.updatedAt,button:`<button class="btn btn-sm btn-primary" data-open="${r.crmId}">Review</button>`})),...m.registrationQueue().map(d=>({kind:'Deal registration',r:d,when:d.submittedAt||d.updatedAt,button:`<button class="btn btn-sm btn-primary" data-open-reg="${d.crmId}">Review</button>`}))].sort((a,b)=>String(a.when).localeCompare(String(b.when)));
 const sla=[];for(const r of m.leads().filter(r=>r.origin==='crm')){const stage=m.stage(r),due=m.deadline(r);
  if(stage==='Declined'||stage==='Assigned'&&due?.overdue)sla.push({kind:stage==='Declined'?'Declined by partner':'Not accepted in 48 h',sla:true,r,when:r.assignedAt,button:`<button class="btn btn-sm btn-outline btn-secondary" data-reassign="${r.crmId}">Reassign</button>`});
  else if(stage==='Accepted'&&due?.overdue)sla.push({kind:'First contact overdue',sla:true,r,when:r.acceptedAt,button:`<button class="btn btn-sm btn-outline btn-secondary" data-open="${r.crmId}">View</button>`});}
 return [...decisions,...sla];
}
// Recent partner and manager activity across the program, newest first.
function feed(m,limit=8){
 const events=[],name=id=>`<b>${esc(m.partnerName(id))}</b>`;
 for(const r of m.leads()){const company=`<b>${esc(r.company)}</b>`,open=`data-open="${r.crmId}"`;
  if(r.origin==='partner'&&r.submittedAt)events.push({time:r.submittedAt,icon:'leads',text:`${name(r.partnerId)} registered lead ${company}`,open});
  if(r.origin==='crm'&&r.acceptedAt)events.push({time:r.acceptedAt,icon:'assign',text:`${name(r.partnerId)} accepted ${company}`,open});
  for(const a of r.activities||[])if(a.time&&['Call','Email','Meeting'].includes(a.type))events.push({time:a.time,icon:{Call:'phone',Email:'mail',Meeting:'meeting'}[a.type],text:`${name(r.partnerId)} logged a ${a.type.toLowerCase()} with ${company}`,open});
  for(const h of r.vendorLog||[])events.push({time:h.time,icon:'review',text:`${esc(h.actor)}: ${esc(h.title.toLowerCase())} · ${company}`,open});}
 for(const d of m.registrations()){const company=`<b>${esc(d.company)}</b>`,open=`data-open-reg="${d.crmId}"`;
  if(d.submittedAt)events.push({time:d.submittedAt,icon:'book',text:`${name(d.partnerId)} submitted a deal registration for ${company}`,open});
  for(const h of d.vendorLog||[])events.push({time:h.time,icon:'review',text:`${esc(h.actor)}: ${esc(h.title.toLowerCase())} · ${company}`,open});
  if(d.approvedAt&&!(d.vendorLog||[]).length)events.push({time:d.approvedAt,icon:'opportunity',text:`CRM opportunity opened for ${company} · ${name(d.partnerId)}`,open});}
 return events.sort((a,b)=>String(b.time).localeCompare(String(a.time))).slice(0,limit);
}
const feedList=list=>list.length?`<ul class="mgr-feed">${list.map(e=>`<li><span class="mgr-feed-icon">${icon(e.icon)}</span><button ${e.open}><span>${e.text}</span><time>${ago(e.time)}</time></button></li>`).join('')}</ul>`:'<p class="empty">No partner activity yet.</p>';

// ---- Pages ----
function overviewView(){
 const m=mgr(),queue=m.queue(),regs=m.registrationQueue(),opps=m.opportunities(),open=opps.filter(o=>OPEN.includes(o.stage)),won=opps.filter(o=>o.stage==='Won'),lost=opps.filter(o=>o.stage==='Lost'),items=attention(m),late=items.filter(i=>i.sla).length;
 const hour=new Date().getHours(),hello=hour<12?'Good morning':hour<18?'Good afternoon':'Good evening',today=new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'});
 const kpi=(ic,label,value,foot,route,tone='')=>`<button class="card mgr-kpi ${tone}" data-page="${route}"><span class="mgr-kpi-head"><span class="mgr-kpi-icon">${icon(ic)}</span>${label}</span><strong>${value}</strong><span class="mgr-kpi-foot">${foot}</span></button>`;
 const winRate=won.length+lost.length?Math.round(won.length*100/(won.length+lost.length))+'% win rate':'No closed deals yet';
 const stages=OPEN.map(stage=>{const list=open.filter(o=>o.stage===stage);return {stage,count:list.length,value:sum(list)};}),top=Math.max(1,...stages.map(s=>s.value));
 const leads=m.leads(),count=list=>leads.filter(r=>list.includes(m.stage(r))).length;
 const flow=[['Awaiting review',count(['Submitted','Needs information'])],['Approved',count(['Approved','Accepted'])],['Working',count(['Working'])],['Qualified',count(['Qualified'])],['Registered as deals',count(['Converted'])]];
 const partners=m.partners().map(p=>({p,s:partnerStats(m,p.id)})).sort((a,b)=>(b.s.pipeline+b.s.wonTotal)-(a.s.pipeline+a.s.wonTotal));
 return `${heading(`${hello}, ${MANAGER.name.split(' ')[0]}.`,`${today} · Here’s your partner program at a glance.`,`<button class="btn btn-outline btn-secondary" data-page="queue">Review approvals</button>${assignButton()}`)}
 <section class="mgr-kpis">${kpi('inbox','Awaiting your decision',queue.length+regs.length,`<span class="mgr-split"><b>${queue.length}</b> lead</span><span class="mgr-split"><b>${regs.length}</b> deal registration${regs.length===1?'':'s'}</span>`,regs.length&&!queue.length?'registrations':'queue',queue.length+regs.length?'focus':'')}${kpi('opportunity','Partner-sourced pipeline',short(sum(open)),open.length+' open opportunit'+(open.length===1?'y':'ies'),'opportunities')}${kpi('trophy','Closed won',short(sum(won,wonValue)),winRate,'opportunities')}${kpi('clock','Response time',late?late+' at risk':'On track',late?'Assignments need reassigning or follow-up':'Every partner is within the response window','distribution',late?'warn':'ok')}</section>
 <div class="mgr-columns"><div class="mgr-col">
 ${panel('Needs your attention',items.length?'Decide registrations oldest first, then fix response-time breaches.':'',items.length?`<ul class="mgr-attention">${items.slice(0,6).map(i=>`<li>${logo(i.r.company)}<div class="mgr-attn-copy"><b>${esc(i.r.company)}</b><small>${esc(m.partnerName(i.r.partnerId))} · ${short(i.r.value)}${i.r.product&&i.r.product!=='Not sure yet'?' · '+esc(i.r.product):''}</small></div><span class="mgr-attn-kind ${i.sla?'late':''}">${esc(i.kind)}</span><time>${ago(i.when)}</time>${i.button}</li>`).join('')}</ul>${items.length>6?`<footer class="card-footer mgr-panel-foot">${items.length-6} more waiting · <button class="text-link" data-page="queue">Open lead reviews</button></footer>`:''}`:`<div class="mgr-clear">${icon('check')}<b>You’re all caught up.</b><span>New partner registrations appear here the moment they’re submitted.</span></div>`)}
 ${panel('Partner performance','Sourced pipeline and closed revenue against each partner’s annual target.',table(['Partner','#Open pipeline','#Closed won','Annual target'],partners.map(({p,s})=>`<tr><td><div class="company-cell">${partnerLogo(p.id)}<span><button class="mgr-partner-link" data-open-partner="${p.id}"><b>${esc(p.name)}</b></button><small>${tier(PROFILES[p.id]?.tier)}</small></span></div></td><td class="numeric amount">${short(s.pipeline)}</td><td class="numeric amount">${short(s.wonTotal)}</td><td class="mgr-target-cell">${progress(s.attainment)}<small>${s.attainment}%</small></td></tr>`),'No partners yet.'),`<button class="text-link" data-page="partners">All partners ${icon('arrow')}</button>`)}
 </div><div class="mgr-col">
 ${panel('Pipeline','Leads and opportunities across all partners.',`<div class="mgr-pipeline"><span class="mgr-mini-label">LEADS</span><ol class="mgr-flow">${flow.map(([label,n])=>`<li><b>${n}</b><span>${label}</span></li>`).join('')}</ol><span class="mgr-mini-label">OPEN OPPORTUNITIES</span><div class="mgr-bars">${stages.map(s=>`<div class="mgr-bar"><span>${s.stage}<small>${s.count}</small></span><span class="mgr-bar-track"><i style="width:${Math.max(3,Math.round(s.value*100/top))}%"></i></span><b>${short(s.value)}</b></div>`).join('')}</div></div>`,`<button class="text-link" data-page="opportunities">View all ${icon('arrow')}</button>`)}
 ${panel('Recent activity','What partners and your team did most recently.',feedList(feed(m,6)))}
 </div></div>`;
}
function queueView(){
 const m=mgr(),queue=m.queue(),auto=m.reviewMode()==='auto',decided=m.leads().filter(r=>(r.vendorLog||[]).some(h=>/^(Registration|Returned)/.test(h.title))).sort((a,b)=>String(b.vendorLog.at(-1).time).localeCompare(String(a.vendorLog.at(-1).time))).slice(0,8);
 return `${heading('Lead reviews','Partner lead registrations waiting for your decision. Check for duplicates, territory, and missing details, then approve, return, or reject.')}
 <section class="card mgr-mode"><div><b>Approval mode · ${auto?'Automatic':'Manual review'}</b><p>${auto?'Registrations are decided by program rules: clean lead registrations are approved, thin ones are returned, duplicates and out-of-territory leads are rejected, and deal registrations without conflicts are approved.':'Every lead and deal registration waits for your decision.'}</p></div><label class="mgr-mode-control"><span>Decide automatically by program rules</span><button class="toggle ${auto?'on':''}" data-action="mode" role="switch" aria-checked="${auto}" aria-label="Decide registrations automatically by program rules"><span></span></button></label></section>
 ${panel('Waiting for review','Oldest first. Partners see your decision as soon as you make it.',table(['Company & contact','Partner','Submitted','#Estimated value','Checks',''],queue.map(r=>`<tr><td>${companyCell(r)}</td><td>${partnerLink(r.partnerId)}</td><td>${ago(r.submittedAt||r.updatedAt)}</td><td class="numeric amount">${money(r.value)}</td><td>${checkPills(m.checks(r.crmId))}</td><td><button class="text-link" data-open="${r.crmId}">Review ${icon('arrow')}</button></td></tr>`),'No registrations waiting. New partner submissions appear here instantly.'),'','pipeline-list')}
 ${panel('Recently decided','Your latest lead registration decisions.',table(['Company & contact','Partner','Decision','Decided',''],decided.map(r=>`<tr><td>${companyCell(r)}</td><td>${partnerLink(r.partnerId)}</td><td>${pill(r.status)}</td><td>${ago(r.vendorLog.at(-1).time)}</td><td><button class="text-link" data-open="${r.crmId}">View ${icon('arrow')}</button></td></tr>`),'Decisions you make appear here.'),'','pipeline-list section-gap')}`;
}
function registrationsView(){
 const m=mgr(),queue=m.registrationQueue(),decided=m.registrations().filter(d=>['Approved','Rejected','Withdrawn'].includes(d.registration)).sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt))).slice(0,12);
 const row=(d,review)=>`<tr><td>${dealCell(d)}</td><td>${partnerLink(d.partnerId)}</td><td>${esc(d.product)}</td><td class="numeric amount">${money(d.value)}</td><td>${review?ago(d.submittedAt||d.updatedAt):pill(d.registration)}</td><td>${review?regPills(m.registrationChecks(d.crmId)):d.stage?pill(d.stage)+' <small class="tiny">'+esc(d.opportunityId)+'</small>':'—'}</td><td><button class="text-link" data-open-reg="${d.crmId}">${review?'Review':'View'} ${icon('arrow')}</button></td></tr>`;
 return `${heading('Deal registrations','Partners’ requests to register a specific opportunity. Approving protects the deal for 90 days and creates the CRM opportunity.')}
 ${panel('Waiting for review','Oldest first. Check conflicts and evidence before approving.',table(['Company & opportunity','Partner','Product','#Value','Submitted','Checks',''],queue.map(d=>row(d,true)),'No deal registrations waiting. New ones appear here instantly.'),'','pipeline-list')}
 ${panel('Recently decided','Approved registrations and their CRM opportunity stage.',table(['Company & opportunity','Partner','Product','#Value','Registration','CRM opportunity',''],decided.map(d=>row(d,false)),'No decisions yet.'),'','pipeline-list section-gap')}`;
}
function response(m,r){
 const stage=m.stage(r),due=m.deadline(r);
 if(stage==='Assigned')return due?.overdue?'<span class="mgr-late">Not accepted in 48 hours</span>':`Accept within ${due?.hoursLeft??48} h`;
 if(stage==='Accepted')return due?.overdue?'<span class="mgr-late">First contact overdue</span>':'Contact by '+date(due?.due);
 if(stage==='Declined')return 'Declined · '+esc(r.declineReason||r.reviewReason||'no reason');
 return {Working:'Customer contacted',Qualified:'Qualified (BANT)',Converted:'Converted to a deal',Closed:'Closed by partner'}[stage]||'—';
}
function distributionView(){
 const m=mgr(),rows=m.leads().filter(r=>r.origin==='crm').sort((a,b)=>String(b.assignedAt||b.createdAt).localeCompare(String(a.assignedAt||a.createdAt))),stage=r=>m.stage(r);
 const waiting=rows.filter(r=>stage(r)==='Assigned'),late=rows.filter(r=>stage(r)==='Declined'||['Assigned','Accepted'].includes(stage(r))&&m.deadline(r)?.overdue),working=rows.filter(r=>['Accepted','Working','Qualified','Converted'].includes(stage(r)));
 const mini=(label,value,note,tone='')=>`<div class="mgr-mini ${tone}"><span>${label}</span><b>${value}</b><small>${note}</small></div>`;
 return `${heading('Lead distribution','Send vendor leads to partners and make sure they respond: accept within 48 hours, then first contact within 3 days.',assignButton())}
 <section class="card mgr-minis">${mini('Awaiting acceptance',waiting.length,'48-hour window')}${mini('Need your action',late.length,late.length?'Declined or past a deadline':'Nothing overdue',late.length?'warn':'')}${mini('Accepted and in progress',working.length,'Being worked by partners')}</section>
 <section class="card pipeline-list">${table(['Company & contact','Partner','Status','Response','Assigned',''],rows.map(r=>{const s=stage(r),overdue=s==='Assigned'&&m.deadline(r)?.overdue;return `<tr><td>${companyCell(r)}</td><td>${partnerLink(r.partnerId)}</td><td>${pill(s)}</td><td>${response(m,r)}</td><td>${date(r.assignedAt||r.createdAt)}</td><td class="mgr-row-actions">${s==='Declined'||overdue?`<button class="text-link" data-reassign="${r.crmId}">Reassign</button>`:''}<button class="text-link" data-open="${r.crmId}">View ${icon('arrow')}</button></td></tr>`;}),'No assigned leads yet. Assign one to a partner to get started.')}</section>`;
}
const LEAD_GROUPS={all:['All',null],review:['Awaiting review',['Submitted','Needs information']],active:['In progress',['Assigned','Approved','Accepted','Working','Qualified']],converted:['Registered as deals',['Converted']],closed:['Closed',['Closed','Rejected','Declined']]};
const chips=(name,options,current)=>`<div class="mgr-chips" role="group">${options.map(([value,label,count])=>`<button class="mgr-chip ${value===current?'active':''}" data-${name}="${esc(value)}" aria-pressed="${value===current}">${esc(label)}${count===undefined?'':`<span>${count}</span>`}</button>`).join('')}</div>`;
function leadsView(){
 const m=mgr(),all=m.leads(),inGroup=(r,g)=>!LEAD_GROUPS[g][1]||LEAD_GROUPS[g][1].includes(m.stage(r)),byPartner=r=>leadFilter.partner==='all'||r.partnerId===leadFilter.partner;
 const rows=all.filter(r=>byPartner(r)&&inGroup(r,leadFilter.group)).sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt)));
 return `${heading('All partner leads','Every lead your partners registered or received, with its stage and qualification progress.',assignButton())}
 <div class="mgr-toolbar">${chips('lead-group',Object.entries(LEAD_GROUPS).map(([g,[label]])=>[g,label,all.filter(r=>byPartner(r)&&inGroup(r,g)).length]),leadFilter.group)}${chips('lead-partner',[['all','All partners'],...m.partners().map(p=>[p.id,p.name])],leadFilter.partner)}</div>
 <section class="card pipeline-list">${table(['Company & contact','Partner','Origin','Stage','BANT','#Estimated value','Updated',''],rows.map(r=>`<tr><td>${companyCell(r)}</td><td>${partnerLink(r.partnerId)}</td><td>${r.origin==='crm'?'Assigned by vendor':'Registered by partner'}</td><td>${pill(m.stage(r))}</td><td>${W.bant(r).count}/4</td><td class="numeric amount">${money(r.value)}</td><td>${ago(r.updatedAt)}</td><td><button class="text-link" data-open="${r.crmId}">View ${icon('arrow')}</button></td></tr>`),'No leads match these filters.')}</section>`;
}
function opportunitiesView(){
 const m=mgr(),all=m.opportunities(),byPartner=o=>oppFilter.partner==='all'||o.partnerId===oppFilter.partner,scoped=all.filter(byPartner);
 const rows=scoped.filter(o=>oppFilter.stage==='all'||o.stage===oppFilter.stage).sort((a,b)=>OPP_STAGES.indexOf(a.stage)-OPP_STAGES.indexOf(b.stage)||(Number(b.value)||0)-(Number(a.value)||0));
 const segment=stage=>{const list=scoped.filter(o=>o.stage===stage);return `<button class="mgr-stage ${stage.toLowerCase()} ${oppFilter.stage===stage?'active':''}" data-opp-stage="${stage}" aria-pressed="${oppFilter.stage===stage}"><span>${stage}</span><b>${short(stage==='Won'?sum(list,wonValue):sum(list))}</b><small>${list.length} opportunit${list.length===1?'y':'ies'}</small></button>`;};
 return `${heading('Opportunities','CRM opportunities created from approved deal registrations, across every partner. Partners keep the stage current.')}
 <section class="mgr-stages">${OPP_STAGES.map(segment).join('')}</section>
 <div class="mgr-toolbar">${chips('opp-stage',[['all','All stages',scoped.length],...OPP_STAGES.map(s=>[s,s])],oppFilter.stage)}${chips('opp-partner',[['all','All partners'],...m.partners().map(p=>[p.id,p.name])],oppFilter.partner)}</div>
 <section class="card pipeline-list">${table(['Company & opportunity','Partner','Product','Stage','#Value','Expected close','Protected until',''],rows.map(o=>`<tr><td>${dealCell(o)}</td><td>${partnerLink(o.partnerId)}</td><td>${esc(o.product||'—')}</td><td>${pill(o.stage)}</td><td class="numeric amount">${money(o.stage==='Won'?wonValue(o):o.value)}</td><td>${date(o.closeDate||o.expectedClose)}</td><td>${date(o.protectedUntil)}</td><td><button class="text-link" data-open-opp="${esc(o.id)}">View ${icon('arrow')}</button></td></tr>`),'No opportunities match these filters.')}</section>`;
}
function partnersView(){
 const m=mgr(),list=m.partners().map(p=>({p,s:partnerStats(m,p.id),pr:PROFILES[p.id]||{}})),tiers=['Platinum','Gold','Silver'].map(t=>[t,list.filter(x=>x.pr.tier===t).length]).filter(([,n])=>n);
 return `${heading('Partners','Your partner program: tiers, territories, and how each partner is performing.',assignButton())}
 <section class="card mgr-minis">${[['Active partners',list.length,tiers.map(([t,n])=>n+' '+t).join(' · ')],['Program pipeline',short(sum(list,x=>x.s.pipeline)),'Open opportunities from partners'],['Closed won',short(sum(list,x=>x.s.wonTotal)),'Partner-sourced revenue'],['Waiting on you',sum(list,x=>x.s.pending),'Registrations to decide']].map(([label,value,note])=>`<div class="mgr-mini"><span>${label}</span><b>${value}</b><small>${esc(note)}</small></div>`).join('')}</section>
 <section class="mgr-partner-grid">${list.map(({p,s,pr})=>`<article class="card mgr-partner-card"><header>${partnerLogo(p.id,'lg')}<div><h3>${esc(p.name)}</h3><p>${esc(pr.type||'Partner')} · ${esc(pr.region||'—')}</p></div>${tier(pr.tier)}</header>
 <dl class="mgr-metrics"><div><dt>Open pipeline</dt><dd>${short(s.pipeline)}</dd></div><div><dt>Closed won</dt><dd>${short(s.wonTotal)}</dd></div><div><dt>Active leads</dt><dd>${s.active}</dd></div><div><dt>Win rate</dt><dd>${s.winRate===null?'—':s.winRate+'%'}</dd></div></dl>
 <div class="mgr-target"><div><span>Sourced vs annual target</span><b>${s.attainment}%</b></div>${progress(s.attainment)}<small>${short(s.pipeline+s.wonTotal)} of ${short(s.target)}</small></div>
 <footer><span class="mgr-contact"><span class="avatar">${esc(initials(pr.contact))}</span><span><b>${esc(pr.contact||'—')}</b><small>${esc(pr.email||'')}</small></span></span>${s.pending?`<span class="pill amber"><i></i>${s.pending} waiting on you</span>`:''}</footer>
 <div class="mgr-card-actions"><button class="btn btn-sm btn-outline btn-secondary" data-action="assign" data-assign-to="${p.id}">Assign a lead</button><button class="btn btn-sm btn-primary" data-open-partner="${p.id}">View partner</button></div></article>`).join('')}</section>`;
}
const views={overview:overviewView,queue:queueView,registrations:registrationsView,distribution:distributionView,leads:leadsView,opportunities:opportunitiesView,partners:partnersView};

// ---- Shell ----
function sidebar(){
 const m=mgr(),counts={queue:m.queue().length,registrations:m.registrationQueue().length},nav=(id,ic)=>`<button data-page="${id}" class="${page===id?'active':''}" ${page===id?'aria-current="page"':''}><span class="nav-icon">${icon(ic)}</span><span class="nav-text">${PAGES[id]}</span>${counts[id]?`<span class="nav-badge" aria-label="${counts[id]} waiting">${counts[id]}</span>`:''}</button>`;
 const group=(label,items)=>`<div class="nav-group">${label?`<div class="nav-label">${label}</div>`:''}<nav class="nav">${items}</nav></div>`;
 return `<aside class="sidebar${navOpen?' open':''}" aria-label="Manager navigation"><div class="sidebar-header"><span class="brand"><span class="brand-mark"><i></i><i></i><i></i></span>PRM<span>.</span></span><button class="sidebar-close" data-action="menu" aria-label="Close navigation">×</button></div><div class="workspace"><span class="company-icon">VP</span><span class="workspace-copy"><b>Vendor partner team</b><span class="workspace-label">Partner manager workspace</span></span></div><div class="sidebar-scroll">${group('',nav('overview','overview'))}${group('APPROVALS',nav('queue','review')+nav('registrations','book'))}${group('LEADS & PIPELINE',nav('distribution','assign')+nav('leads','leads')+nav('opportunities','opportunity'))}${group('PROGRAM',nav('partners','partners'))}</div><div class="side-bottom"><button class="profile" data-action="signout" title="Sign out"><span class="avatar">${MANAGER.initials}</span><span class="profile-copy"><b>${MANAGER.name}</b><span class="tiny">${MANAGER.title} · Sign out</span></span>${icon('logout')}</button></div></aside>`;
}
function signinView(){
 const point=(ic,title,text)=>`<li><span>${icon(ic)}</span><div><b>${title}</b><p>${text}</p></div></li>`;
 return `<main class="mgr-signin"><section class="mgr-signin-story"><div class="brand"><span class="brand-mark"><i></i><i></i><i></i></span>PRM<span>.</span></div><div class="mgr-signin-copy"><span class="mgr-eyebrow">PARTNER MANAGER PORTAL</span><h1>Run your partner program from one place.</h1><ul>${point('review','Approve registrations','Check leads and deals for duplicates, territory, and evidence, then decide in one click.')}${point('assign','Distribute leads','Send vendor leads to the right partner and keep every response on time.')}${point('opportunity','Track partner pipeline','See each partner’s opportunities, wins, and progress to target.')}</ul></div><p class="mgr-signin-note">Vendor workspace · Simulated Salesforce</p></section>
 <section class="mgr-signin-main"><div class="mgr-signin-card"><a class="welcome-back" href="index.html">← Choose a different portal</a><span class="mgr-eyebrow">VENDOR SIGN-IN</span><h2>Welcome back.</h2><p>Sign in to review partner registrations and manage your program.</p><button class="btn btn-primary" data-action="signin">Sign in as ${MANAGER.name} ${icon('arrow')}</button><div class="mgr-signin-divider"><span>or</span></div><button class="btn btn-outline btn-secondary" data-action="signin">${icon('security')}Continue with company SSO</button><p class="tiny">Demo sign-in for ${MANAGER.name}, ${MANAGER.title.toLowerCase()} at the vendor. Nothing is sent anywhere.</p></div></section></main>`;
}
function render(){
 const app=document.getElementById('app');
 if(!signedIn){history.replaceState(null,'','#signin');app.innerHTML=signinView();return;}
 if(!views[page])page='overview';
 history.replaceState(null,'','#'+page);
 app.innerHTML=`<div class="mobile-shade${navOpen?' show':''}" data-action="menu"></div>${sidebar()}<div class="main"><header class="topbar"><div class="breadcrumb"><button class="icon-btn mobile-menu" data-action="menu" aria-label="Open navigation">${icon('menu')}</button><span class="breadcrumb-home">${icon('team')} Partner manager</span><span class="breadcrumb-divider">/</span><span>${PAGES[page]}</span></div><div class="top-actions"><span class="mgr-live" title="Partner submissions and updates arrive here instantly."><i></i>Live sync</span><button class="search-trigger" data-action="search" aria-label="Search the program">${icon('search')}<span>Search</span><kbd>⌘ K</kbd></button><button class="icon-btn" data-action="activity" aria-label="Partner activity${unseen?', '+unseen+' new':''}">${icon('bell')}${unseen?'<i class="dot"></i>':''}</button><span class="avatar top-avatar" title="${MANAGER.name}">${MANAGER.initials}</span></div></header><main class="content fade-in">${views[page]()}<footer class="footer-note"><span>${icon('security')}Vendor workspace · Local Salesforce simulation</span><span>Partners see your decisions instantly.</span></footer></main></div>`;
}

// ---- Drawers ----
function drawer(kind,badge,id,body,footer=''){
 document.getElementById('app').inert=true;
 document.getElementById('overlay').innerHTML=`<div class="drawer-backdrop"><section class="app-dialog lead-drawer" role="dialog" aria-modal="true" aria-labelledby="mgr-drawer-title"><header class="lead-drawer-top"><div><span class="drawer-kind">${kind}</span>${badge}</div><div><span class="lead-record-id">${esc(id)}</span><button class="close" data-action="close" aria-label="Close ${kind.toLowerCase()}">×</button></div></header><div class="lead-drawer-body">${body}</div><footer class="lead-drawer-footer"><span>${icon('security')}Vendor Salesforce (simulated) · ${esc(id)}</span>${footer}</footer></section></div>`;
 setTimeout(()=>document.querySelector('.lead-drawer .close')?.focus(),30);
}
const recordRows=(title,rows)=>`<section class="crm-record-section"><header class="crm-record-heading"><h3>${title}</h3></header><div class="crm-record-table">${rows.map(([label,value])=>`<div class="crm-record-row"><div class="crm-record-readonly"><span class="crm-record-label">${label}</span><span class="crm-record-value">${esc(value||'Not added')}</span><span></span></div></div>`).join('')}</div></section>`;
const routeStrip=items=>`<div class="sales-route-strip">${items.map(([label,value])=>`<div><span>${label}</span><b>${value}</b></div>`).join('')}</div>`;
const decisionLog=log=>log.length?`<details class="lead-history" open><summary>Your decisions <span>${log.length}</span></summary><ol>${log.map(h=>`<li><span class="history-dot"></span><div><strong>${esc(h.title)}</strong><p>${esc(h.detail)}</p><time>${time(h.time)} · ${esc(h.actor)}</time></div></li>`).join('')}</ol></details>`:'';
const checkList=(title,items)=>{const marks={ok:'check',warn:'warn',fail:'cross'};return `<h3>${title}</h3><ul>${items.map(item=>{const mark=item.ok?(item.warn?'warn':'ok'):'fail';return `<li><span class="mgr-check-icon ${mark}">${icon(marks[mark])}</span>${esc(item.label)}</li>`;}).join('')}</ul>`;};
function decisionPanel(m,r){
 const checks=m.checks(r.crmId),why={Approve:'Every check passed. Approving protects this customer for the partner for 90 days.','Return for information':'Some details are missing or thin. Return it with a note so the partner can fix it and resubmit.',Reject:checks.blocking.length?'This customer is already registered with an active lead or opportunity.':'This customer is outside the program territory.'}[checks.recommendation];
 const matches=checks.matches.map(x=>`<li><span><b>${esc(x.company)}</b> · ${x.kind} · ${esc(m.partnerName(x.partnerId))}</span><small>${esc(x.match)} · ${esc(LABELS[x.stage]||W.leadLabel(x.stage))}${x.active?'':' (inactive)'}</small></li>`).join('');
 return `<section class="sales-next-panel"><div><span class="eyebrow">YOUR DECISION</span><h3>Recommended: ${checks.recommendation}</h3><p>${why}</p></div><button class="btn btn-primary" data-decide="approve">Approve registration</button><button class="btn btn-outline btn-secondary" data-decide="return">Return for information</button><button class="btn btn-outline btn-secondary" data-decide="reject">Reject</button></section>
 <section class="mgr-checks">${checkList('Registration checks',checks.items)}${matches?`<div class="mgr-matches"><span>MATCHING RECORDS IN SALESFORCE</span><ul>${matches}</ul></div>`:''}</section>`;
}
function statusPanel(m,r){
 const stage=m.stage(r),due=m.deadline(r),name=esc(m.partnerName(r.partnerId));
 const text={Approved:`Approved and protected for ${name} until ${date(r.protectedUntil)}. The partner now contacts the customer.`,'Needs information':`Returned to ${name}: “${esc(r.reviewReason)}” It comes back here when they resubmit.`,Rejected:'Rejected · '+esc(r.reviewReason),Assigned:due?.overdue?`${name} didn’t accept within 48 hours. Reassign it to another partner, or give them more time.`:`Waiting for ${name} to accept. ${due?.hoursLeft??48} hours left in the response window.`,Accepted:`${name} accepted the lead. First contact is due by ${date(due?.due)}.`,Working:`${name} has contacted the customer and is qualifying the lead (BANT ${W.bant(r).count} of 4).`,Qualified:`${name} qualified the lead. Next they register the deal.`,Converted:`${name} registered this lead as a deal.`,Declined:`${name} declined: ${esc(r.reviewReason||r.declineReason||'no reason given')}. Reassign it to another partner.`,Closed:`${name} closed this lead · ${esc(r.reviewReason||r.closeReason||'')}`}[stage]||'';
 const action=stage==='Declined'||stage==='Assigned'&&due?.overdue?`<button class="btn btn-primary" data-reassign="${r.crmId}">Reassign lead</button>`:'';
 return `<section class="sales-next-panel"><div><span class="eyebrow">STATUS</span><h3>${esc(LABELS[stage]||W.leadLabel(stage))}</h3><p>${text}</p></div>${action}</section>`;
}
function openLead(id){
 const m=mgr();let r;try{r=m.get(id);}catch(error){closeOverlay();return toast(error.message);}
 detailId=id;
 const stage=m.stage(r),b=W.bant(r),activities=[...(r.activities||[])].reverse();
 drawer('Lead',pill(stage),r.crmId,`<div class="lead-detail-title"><h2 id="mgr-drawer-title">${esc(r.company)}</h2><p>${esc(r.contact)}</p><span>${esc(r.email)}</span></div>
 ${routeStrip([['PARTNER',partnerLink(r.partnerId)],['ORIGIN',r.origin==='crm'?'Assigned by vendor':'Registered by partner · '+esc(r.source)],[r.origin==='crm'?'ASSIGNED':'SUBMITTED',time(r.origin==='crm'?r.assignedAt:r.submittedAt||r.createdAt)]])}
 ${stage==='Submitted'?decisionPanel(m,r):statusPanel(m,r)}
 ${['Approved','Accepted','Working','Qualified','Converted'].includes(stage)?`<section class="lead-bant"><div class="drawer-section-heading"><h3>Qualification · BANT <span>${b.count} of 4 confirmed by the partner</span></h3></div><div class="lead-bant-grid">${[['B · BUDGET',b.budget,r.budgetConfirmed?money(r.value)+' confirmed':'Not confirmed'],['A · AUTHORITY',b.authority,r.decisionMaker||'Not identified'],['N · NEED',b.need,r.needConfirmed?'Confirmed':'Not confirmed'],['T · TIMELINE',b.timeline,r.timeline&&r.timeline!=='Not sure yet'?r.timeline:'Not set']].map(([label,met,value])=>`<div class="${met?'met':''}"><span>${met?icon('check'):'<i></i>'}${label}</span><b>${esc(value)}</b></div>`).join('')}</div></section>`:''}
 ${recordRows('CUSTOMER RECORD',[['Contact',r.contact+(r.jobTitle?' · '+r.jobTitle:'')],['Email',r.email],['Phone',r.phone],['Product interest',r.product],['Estimated value',money(r.value)],['Customer need',r.need],['Region',r.region],['Industry',r.industry],['Purchase timeline',r.timeline],['Lead source',r.source]])}
 <section class="sales-activity-section"><div class="drawer-section-heading"><h3>Partner activity</h3></div>${activities.length?`<ul class="sales-activities">${activities.map(a=>`<li><span class="task-symbol">${icon({Call:'phone',Email:'mail',Meeting:'meeting','Follow-up':'clock'}[a.type]||'book')}</span><div><strong>${esc(a.type)}${a.outcome?' · '+esc(a.outcome):''}</strong><p>${esc(a.note)}</p><time>${time(a.time)}</time></div></li>`).join('')}</ul>`:'<p class="subtitle">No calls, emails, or meetings logged by the partner yet.</p>'}</section>
 ${decisionLog([...(r.vendorLog||[])].reverse())}`);
}
function openRegistration(id){
 const m=mgr();let d;try{d=m.registration(id);}catch(error){closeOverlay();return toast(error.message);}
 detailId='reg:'+id;
 const activities=[...(d.activities||[])].reverse();let status;
 if(d.registration==='Pending review'){const checks=m.registrationChecks(id);status=`<section class="sales-next-panel"><div><span class="eyebrow">YOUR DECISION</span><h3>Recommended: ${checks.recommendation}</h3><p>${checks.recommendation==='Approve'?'No conflicts and the evidence is in place. Approving creates the CRM opportunity at Discovery and protects the deal for 90 days.':'At least one check failed. Reject with a reason; the partner can revise and resubmit.'}</p></div><button class="btn btn-primary" data-decide-reg="approve">Approve registration</button><button class="btn btn-outline btn-secondary" data-decide-reg="reject">Reject</button></section><section class="mgr-checks">${checkList('Registration checks',checks.items)}${checks.conflicts.length?`<div class="mgr-matches"><span>CONFLICTING RECORDS</span><ul>${checks.conflicts.map(c=>`<li><span><b>${esc(c.company)}</b> · ${esc(c.product)} · ${c.kind} · ${esc(m.partnerName(c.partnerId))}</span><small>${esc(c.stage)}</small></li>`).join('')}</ul></div>`:''}</section>`;}
 else status=`<section class="sales-next-panel"><div><span class="eyebrow">STATUS</span><h3>${esc(d.registration)}</h3><p>${d.registration==='Approved'?`CRM opportunity ${esc(d.opportunityId)} is at ${esc(d.stage)}. Protected for ${esc(m.partnerName(d.partnerId))} until ${date(d.protectedUntil)}.`:esc(d.reason||d.withdrawReason||'')}</p></div>${d.opportunityId?`<button class="btn btn-outline btn-secondary" data-open-opp="${esc(d.opportunityId)}">View opportunity</button>`:''}</section>`;
 drawer('Deal registration',pill(d.registration),d.crmId,`<div class="lead-detail-title"><h2 id="mgr-drawer-title">${esc(d.company)}</h2><p>${esc(d.name||'')}</p><span>${esc(d.product)} · ${money(d.value)} · close ${date(d.expectedClose)}</span></div>
 ${routeStrip([['PARTNER',partnerLink(d.partnerId)],['LEAD',d.leadId?esc(d.leadId)+' · qualified':'Direct registration'],['SUBMITTED',time(d.submittedAt||d.updatedAt)]])}
 ${status}
 ${recordRows('REGISTRATION DETAILS',[['Opportunity',d.name],['Product',d.product],['Estimated value',money(d.value)],['Expected close',date(d.expectedClose)],['Customer need',d.need],['Contact',d.contact],['Email',d.email],['Region',d.region]])}
 ${activities.length?`<section class="sales-activity-section"><div class="drawer-section-heading"><h3>Partner activity</h3></div><ul class="sales-activities">${activities.map(a=>`<li><span class="task-symbol">${icon('book')}</span><div><strong>${esc(a.type)}</strong><p>${esc(a.note)}</p><time>${time(a.time)}</time></div></li>`).join('')}</ul></section>`:''}
 ${decisionLog([...(d.vendorLog||[])].reverse())}`);
}
function openOpportunity(id){
 const m=mgr();let o;try{o=m.opportunity(id);}catch(error){closeOverlay();return toast(error.message);}
 detailId='opp:'+id;
 const reg=o.registrationId?m.registrations().find(d=>d.crmId===o.registrationId):null,stage=o.stage,closed=['Won','Lost'].includes(stage);
 const text=stage==='Won'?`Won for ${money(wonValue(o))}${o.closeDate?' on '+date(o.closeDate):''}.`:stage==='Lost'?`Lost · ${esc(o.lostReason||'')}${o.outcomeReason?' · '+esc(o.outcomeReason):''}`:`Open at ${esc(stage)}. The partner updates the stage as the deal moves.`;
 drawer('Opportunity',pill(stage),o.id,`<div class="lead-detail-title"><h2 id="mgr-drawer-title">${esc(o.company)}</h2><p>${esc(o.name||o.product||'')}</p><span>${esc(o.product||'')} · ${money(stage==='Won'?wonValue(o):o.value)} · ${closed?'closed':'expected close'} ${date(o.closeDate||o.expectedClose)}</span></div>
 ${routeStrip([['PARTNER',partnerLink(o.partnerId)],['DEAL REGISTRATION',reg?esc(reg.crmId)+' · '+esc(reg.registration):'Created in Salesforce'],['PROTECTED UNTIL',date(o.protectedUntil)]])}
 <section class="sales-next-panel"><div><span class="eyebrow">STAGE</span><h3>${esc(stage)}</h3><p>${text}</p></div>${reg?`<button class="btn btn-outline btn-secondary" data-open-reg="${esc(reg.crmId)}">View deal registration</button>`:''}</section>
 <ol class="lead-stage-tracker mgr-opp-tracker">${['Discovery','Proposal','Negotiation',stage==='Lost'?'Lost':'Won'].map((s,i,all)=>{const at=all.indexOf(stage),done=i<at||closed&&i===at;return `<li class="${done?'complete':i===at?'current':''}"><span>${done?icon('check'):i+1}</span>${s}</li>`;}).join('')}</ol>
 ${recordRows('OPPORTUNITY DETAILS',[['Opportunity',o.name],['Product',o.product],['Estimated value',money(o.value)],['Expected close',date(o.expectedClose)],['Contact',o.contact],['Email',o.email],['Region',o.region]])}`);
}
function openPartner(id){
 const m=mgr(),p=m.partners().find(x=>x.id===id);if(!p){closeOverlay();return toast('This partner is no longer in the program.');}
 detailId='partner:'+id;
 const pr=PROFILES[id]||{},s=partnerStats(m,id),metric=(label,value,note)=>`<div><span>${label}</span><b>${value}</b><small>${note}</small></div>`;
 drawer('Partner',tier(pr.tier),pr.code||id,`<div class="lead-detail-title mgr-partner-title">${partnerLogo(id,'lg')}<div><h2 id="mgr-drawer-title">${esc(p.name)}</h2><p>${esc(pr.type||'Partner')} · ${esc(pr.region||'')}</p><span>Partner since ${date(pr.joined)} · ${esc(pr.benefit||'')}</span></div></div>
 ${routeStrip([['PRIMARY CONTACT',esc(pr.contact||'—')+'<small>'+esc(pr.email||'')+'</small>'],['CERTIFIED SELLERS',esc(pr.sellers??'—')],['WAITING ON YOU',s.pending?s.pending+' registration'+(s.pending===1?'':'s'):'Nothing']])}
 <section class="mgr-drawer-metrics">${metric('Open pipeline',short(s.pipeline),s.open.length+' open')}${metric('Closed won',short(s.wonTotal),s.won.length+' won')}${metric('Win rate',s.winRate===null?'—':s.winRate+'%','Won vs lost')}${metric('Lead acceptance',s.acceptance===null?'—':s.acceptance+'%','Vendor leads accepted')}</section>
 <section class="mgr-target mgr-drawer-target"><div><span>Sourced pipeline vs annual target</span><b>${s.attainment}%</b></div>${progress(s.attainment)}<small>${short(s.pipeline+s.wonTotal)} of ${short(s.target)}</small></section>
 <section class="sales-activity-section"><div class="drawer-section-heading"><h3>Leads <span class="tiny">${s.leads.length}</span></h3></div>${s.leads.length?`<ul class="mgr-mini-list">${s.leads.sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt))).map(r=>`<li><button data-open="${r.crmId}">${logo(r.company)}<span><b>${esc(r.company)}</b><small>${r.origin==='crm'?'Assigned by vendor':'Registered by partner'} · ${short(r.value)}</small></span>${pill(m.stage(r))}</button></li>`).join('')}</ul>`:'<p class="subtitle">No leads yet.</p>'}</section>
 <section class="sales-activity-section"><div class="drawer-section-heading"><h3>Opportunities <span class="tiny">${s.opps.length}</span></h3></div>${s.opps.length?`<ul class="mgr-mini-list">${s.opps.map(o=>`<li><button data-open-opp="${esc(o.id)}">${logo(o.company)}<span><b>${esc(o.company)}</b><small>${esc(o.product||'')} · ${short(o.stage==='Won'?wonValue(o):o.value)}</small></span>${pill(o.stage)}</button></li>`).join('')}</ul>`:'<p class="subtitle">No opportunities yet.</p>'}</section>`,`<button class="btn btn-primary btn-sm" data-action="assign" data-assign-to="${id}">${icon('plus')}Assign a lead</button>`);
}
function closeOverlay(){document.getElementById('overlay').innerHTML='';document.getElementById('app').inert=false;detailId=null;}
function reopen(){const [kind,id]=String(detailId).split(/:(.*)/);if(kind==='reg')openRegistration(id);else if(kind==='opp')openOpportunity(id);else if(kind==='partner')openPartner(id);else if(detailId)openLead(detailId);}

// ---- Forms and dialogs ----
let fieldId=0;
const field=(label,name,value='',type='text',required=true)=>{const id='m-'+name+'-'+(++fieldId);return `<div class="field"><label class="form-label" for="${id}">${label}</label><input class="form-control" id="${id}" name="${name}" type="${type}" value="${esc(value)}" ${required?'required':''}></div>`;};
const select=(label,name,options,value)=>{const id='m-'+name+'-'+(++fieldId);return `<div class="field"><label class="form-label" for="${id}">${label}</label><select class="form-select" id="${id}" name="${name}">${options.map(o=>{const [v,text]=Array.isArray(o)?o:[o,o];return `<option value="${esc(v)}" ${v===value?'selected':''}>${esc(text)}</option>`;}).join('')}</select></div>`;};
const area=(label,name,value='',placeholder='')=>{const id='m-'+name+'-'+(++fieldId);return `<div class="field"><label class="form-label" for="${id}">${label}</label><textarea class="form-control" id="${id}" name="${name}" rows="3" placeholder="${esc(placeholder)}">${esc(value)}</textarea></div>`;};
function dialog(title,sub,body,wide=false){
 document.getElementById('app').inert=true;
 document.getElementById('overlay').innerHTML=`<div class="dialog-backdrop"><section class="app-dialog ${wide?'wide':''}" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="modal-head"><h2>${title}</h2><button class="close" data-action="close" aria-label="Close dialog">×</button></div><p class="modal-sub">${sub}</p>${body}</section></div>`;
}
function modal(title,sub,body,onSubmit,wide=false){
 dialog(title,sub,`<form id="mgr-form">${body}<p id="mgr-form-error" class="field-error" role="alert"></p></form>`,wide);
 const form=document.getElementById('mgr-form');form.onsubmit=e=>{e.preventDefault();onSubmit(Object.fromEntries(new FormData(e.target)));};
 setTimeout(()=>form.querySelector('input,select,textarea')?.focus(),30);
}
const actions=(label,back)=>`<div class="sales-form-actions"><button type="button" class="btn btn-outline btn-secondary" ${back?`data-open="${back}"`:'data-action="close"'}>Cancel</button><button class="btn btn-primary" type="submit">${label}</button></div>`;
function returnForm(id){
 const m=mgr(),r=m.get(id),checks=m.checks(id),hint=checks.items.find(i=>i.id==='need'&&!i.ok)?'Please describe the customer’s need in more detail: what problem they want to solve, and why now.':checks.items.find(i=>i.id==='contact'&&!i.ok)?'Please add the customer contact’s full name and a valid work email.':'';
 modal('Return for information',esc(r.company)+' · The partner fixes the details and resubmits. Tell them exactly what to add.',area('Message to the partner','message',hint,'What should the partner add or correct?')+actions('Return to partner',id),v=>{if(act(m2=>m2.returnLead(id,v.message),'Returned to '+m.partnerName(r.partnerId)+'. They’ll see your note right away.')){closeOverlay();render();}});
}
function rejectForm(id){
 const m=mgr(),r=m.get(id),checks=m.checks(id),reason=checks.blocking.length?'Duplicate':!checks.items[1].ok?'Outside territory':'Not a fit for the program';
 modal('Reject registration',esc(r.company)+' · Rejected registrations close for the partner. Choose the reason they’ll see.',select('Reason','reason',W.REJECT_REASONS,reason)+field('Note to the partner (required for Other)','note','','text',false)+actions('Reject registration',id),v=>{if(act(m2=>m2.reject(id,v.reason,v.note),'Rejected · '+r.company+'.')){closeOverlay();render();}});
}
function rejectRegistrationForm(id){
 const m=mgr(),d=m.registration(id),checks=m.registrationChecks(id),reason=checks.conflicts.length?'Conflicts with an existing registration':d.region==='Other'?'Outside territory':'Not enough customer evidence';
 modal('Reject registration',esc(d.company)+' · The partner sees your reason and can revise and resubmit.',select('Reason','reason',W.REG_REJECT_REASONS,reason)+field('Note to the partner (required for Other)','note','','text',false)+`<div class="sales-form-actions"><button type="button" class="btn btn-outline btn-secondary" data-open-reg="${id}">Cancel</button><button class="btn btn-primary" type="submit">Reject registration</button></div>`,v=>{if(act(m2=>m2.rejectRegistration(id,v.reason,v.note),'Rejected · '+d.company+'. The partner can revise it.')){closeOverlay();render();}});
}
function assignForm(partnerId='partner-acme'){
 modal('Assign a lead','Send a vendor lead to a partner. They have 48 hours to accept, then 3 days to make first contact.',`${select('Partner','partnerId',W.PARTNERS.map(p=>[p.id,p.name+(PROFILES[p.id]?' · '+PROFILES[p.id].tier+' · '+PROFILES[p.id].region:'')]),partnerId)}<div class="form-row">${field('Customer company','company')}${select('Customer region','region',W.REGIONS,PROFILES[partnerId]?.region||'North America')}</div><div class="form-row">${field('Contact name','contact')}${field('Customer email','email','','email')}</div><div class="form-row">${select('Product interest','product',W.LEAD_PRODUCTS,'Not sure yet')}${field('Estimated value ($)','value','','number')}</div>${select('Lead source','source',SOURCES,SOURCES[0])}${area('Customer need','need','','What does the customer want to solve?')}${actions('Assign to partner')}`,v=>{const r=act(m=>m.assign(v),'Assigned to '+W.PARTNERS.find(p=>p.id===v.partnerId)?.name+'. They have 48 hours to accept.');if(r){closeOverlay();page='distribution';render();}},true);
}
function reassignForm(id){
 const m=mgr(),r=m.get(id),others=W.PARTNERS.filter(p=>p.id!==r.partnerId);
 modal('Reassign lead',esc(r.company)+' · Currently with '+esc(m.partnerName(r.partnerId))+'. The new partner gets a fresh 48-hour window.',select('New partner','partnerId',others.map(p=>[p.id,p.name]),others[0]?.id)+actions('Reassign lead',id),v=>{if(act(m2=>m2.reassign(id,v.partnerId),'Reassigned to '+m.partnerName(v.partnerId)+'.')){closeOverlay();render();}});
}
function searchDialog(){
 dialog('Search','Partners, leads, deal registrations, and opportunities across your program.',`<input class="form-control" id="mgr-search" placeholder="Company, partner, contact, or record ID…" aria-label="Search the program" autocomplete="off"><div id="mgr-search-results" class="search-results"></div>`);
 const input=document.getElementById('mgr-search'),update=q=>{
  const m=mgr(),needle=String(q||'').trim().toLowerCase(),hit=(...values)=>values.join(' ').toLowerCase().includes(needle),result=(attr,ic,title,sub)=>`<button class="result" ${attr}>${icon(ic)}<span>${esc(title)}</span><small>${esc(sub)}</small></button>`;
  const found=needle?[...m.partners().filter(p=>hit(p.name,PROFILES[p.id]?.contact)).map(p=>result(`data-open-partner="${p.id}"`,'partners',p.name,'Partner · '+(PROFILES[p.id]?.tier||''))),...m.leads().filter(r=>hit(r.company,r.contact,r.email,r.crmId,m.partnerName(r.partnerId))).map(r=>result(`data-open="${r.crmId}"`,'leads',r.company,'Lead · '+(LABELS[m.stage(r)]||W.leadLabel(m.stage(r)))+' · '+m.partnerName(r.partnerId))),...m.registrations().filter(d=>hit(d.company,d.name,d.crmId,m.partnerName(d.partnerId))).map(d=>result(`data-open-reg="${d.crmId}"`,'book',d.company,'Deal registration · '+(LABELS[d.registration]||d.registration)+' · '+m.partnerName(d.partnerId))),...m.opportunities().filter(o=>hit(o.company,o.name,o.id,m.partnerName(o.partnerId))).map(o=>result(`data-open-opp="${esc(o.id)}"`,'opportunity',o.company,'Opportunity · '+o.stage+' · '+m.partnerName(o.partnerId)))]:[];
  document.getElementById('mgr-search-results').innerHTML=needle?found.slice(0,12).join('')||'<p class="empty">No matches.</p>':'<p class="empty">Start typing to search.</p>';
 };
 input.oninput=e=>update(e.target.value);update('');setTimeout(()=>input.focus?.(),30);
}
function activityDialog(){unseen=0;dialog('Partner activity','The latest from partners and your team, newest first.',feedList(feed(mgr(),15)));render();}

// ---- Live updates from partners ----
function takeSnapshot(){const m=mgr();snapshot=Object.fromEntries([...m.leads().map(r=>[r.crmId,m.stage(r)]),...m.registrations().map(d=>[d.crmId,d.registration+'|'+(d.stage||'')])]);}
function announce(){
 const m=mgr(),messages=[];
 for(const r of m.leads()){const before=snapshot[r.crmId],now=m.stage(r),name=m.partnerName(r.partnerId);if(before===now)continue;
  if(now==='Submitted')messages.push((before==='Needs information'?'Resubmitted by ':'New registration from ')+name+' · '+r.company);
  else if(before&&now==='Accepted')messages.push(name+' accepted '+r.company);
  else if(before&&now==='Declined')messages.push(name+' declined '+r.company);
  else if(before&&now==='Working')messages.push(name+' contacted '+r.company);
  else if(before&&now==='Qualified')messages.push(name+' qualified '+r.company);
  else if(before&&now==='Converted')messages.push(name+' converted '+r.company+' to a deal');}
 for(const d of m.registrations()){const before=snapshot[d.crmId],now=d.registration+'|'+(d.stage||''),name=m.partnerName(d.partnerId);if(before===now)continue;
  if(d.registration==='Pending review')messages.push('New deal registration from '+name+' · '+d.company);
  else if(before&&d.registration==='Withdrawn')messages.push(name+' withdrew the registration for '+d.company);
  else if(before&&d.stage&&before.split('|')[1]!==d.stage)messages.push(name+' moved '+d.company+' to '+d.stage);}
 takeSnapshot();if(messages.length){unseen+=messages.length;toast(messages.at(-1));}
}
window.addEventListener('storage',e=>{
 if(e.key!==KEY||!e.newValue)return;
 try{const fresh=JSON.parse(e.newValue);if(!fresh?.sales)return;state=fresh;}catch{return;}
 if(!signedIn)return;announce();
 if(document.querySelector('.dialog-backdrop'))return;
 render();if(detailId)reopen();
});

// ---- Events ----
function route(){const [name,id]=location.hash.slice(1).split('/');linkedLead=linkedReg=null;if(name==='review'&&id){linkedLead=id;page='queue';}else if(name==='registration'&&id){linkedReg=id;page='registrations';}else if(views[name])page=name;}
function openLinked(){if(linkedReg)openRegistration(linkedReg);else if(linkedLead)openLead(linkedLead);}
function signIn(){signedIn=true;try{sessionStorage.setItem(SESSION,'1');}catch{}adopt();takeSnapshot();render();openLinked();toast('Welcome, '+MANAGER.name+'. You’re signed in as the partner manager.');}
const FILTERS={leadGroup:v=>leadFilter.group=v,leadPartner:v=>leadFilter.partner=v,oppStage:v=>oppFilter.stage=oppFilter.stage===v&&v!=='all'?'all':v,oppPartner:v=>oppFilter.partner=v};
document.addEventListener('click',e=>{
 const el=e.target.closest('[data-action],[data-page],[data-open],[data-open-reg],[data-open-opp],[data-open-partner],[data-decide],[data-decide-reg],[data-reassign],[data-lead-group],[data-lead-partner],[data-opp-stage],[data-opp-partner]');if(!el)return;
 const data=el.dataset;
 for(const [key,set] of Object.entries(FILTERS))if(data[key]){set(data[key]);return render();}
 if(data.openReg){adopt();return openRegistration(data.openReg);}
 if(data.openOpp){adopt();return openOpportunity(data.openOpp);}
 if(data.openPartner){adopt();return openPartner(data.openPartner);}
 if(data.decideReg){const id=detailId.slice(4);if(data.decideReg==='approve'){const d=act(m=>m.approveRegistration(id),'Approved · CRM opportunity created for '+mgr().registration(id).company+'.');if(d){closeOverlay();render();}}else rejectRegistrationForm(id);return;}
 if(data.page){page=data.page;navOpen=false;closeOverlay();render();window.scrollTo(0,0);return;}
 if(data.open){adopt();return openLead(data.open);}
 if(data.reassign)return reassignForm(data.reassign);
 if(data.decide){const id=detailId;if(data.decide==='approve'){const r=act(m=>m.approve(id),'Approved · '+mgr().get(id).company+'. The partner can start working it.');if(r){closeOverlay();render();}}else if(data.decide==='return')returnForm(id);else rejectForm(id);return;}
 const action=data.action;
 if(action==='signin')return signIn();
 // Signing out returns to the first screen, where either portal can be chosen.
 if(action==='signout'){signedIn=false;try{sessionStorage.removeItem(SESSION);}catch{}closeOverlay();render();location.href='index.html';return;}
 if(action==='close')return closeOverlay();
 if(action==='assign')return assignForm(data.assignTo||undefined);
 if(action==='search')return searchDialog();
 if(action==='activity')return activityDialog();
 if(action==='mode'){const auto=mgr().reviewMode()!=='auto';act(m=>m.setReviewMode(auto?'auto':'manual'),auto?'Automatic review is on. Partner registrations are decided by program rules on their next sync.':'Manual review is on. New registrations wait for you.');return render();}
 if(action==='menu'){navOpen=!navOpen;return render();}
});
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'&&document.getElementById('overlay').innerHTML){closeOverlay();return;}
 if(signedIn&&(e.metaKey||e.ctrlKey)&&String(e.key).toLowerCase()==='k'){e.preventDefault?.();searchDialog();}
});
window.addEventListener('hashchange',()=>{route();if(signedIn){render();if(linkedReg||linkedLead)openLinked();}});
route();takeSnapshot();render();if(signedIn)openLinked();
})();
