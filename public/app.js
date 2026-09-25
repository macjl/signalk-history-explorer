const demoPaths = ['navigation.speedOverGround','navigation.courseOverGroundTrue','navigation.position','environment.wind.speedApparent','environment.wind.angleApparent','environment.outside.temperature','environment.outside.pressure','propulsion.0.revolutions','propulsion.0.temperature','electrical.batteries.house.voltage'];
const units = { 'navigation.speedOverGround':'kn', 'environment.wind.speedApparent':'kn', 'environment.wind.angleApparent':'°', 'environment.outside.temperature':'°C', 'environment.outside.pressure':'hPa', 'propulsion.0.revolutions':'tr/min', 'propulsion.0.temperature':'°C', 'electrical.batteries.house.voltage':'V', 'navigation.courseOverGroundTrue':'°T' };
const HISTORY_PAGE_SIZE = 10000;
const ALL_CONTEXTS = '__all__';
const state = { server: location.origin, provider: '', sourcePolicySupported: true, context: 'vessels.self', contexts: [], paths: [], details: new Map(), opened: '', queryVersion: 0, mock: location.hostname.endsWith('chatgpt.site') };
const $ = s => document.querySelector(s);
const escapeHTML = s => String(s).replace(/[&<>'"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[c]));
const language = navigator.language?.toLowerCase().startsWith('fr') ? 'fr' : 'en';
const locale = language === 'fr' ? 'fr-FR' : 'en-GB';
const messages = {
  en: { connecting:'Connecting to history…', periodAria:'Period to explore', explorePeriod:'Explore a period', periodHelp:'Listed paths have data within this interval.', context:'Context', allContexts:'ALL — all contexts', loadingContexts:'Loading contexts…', thisVessel:'This vessel', start:'Start', end:'End', search:'Search', availableHistory:'AVAILABLE HISTORY', choosePeriod:'Choose a period to discover the data.', collapseAll:'Collapse all', pathFilter:'Filter paths, e.g. wind, propulsion, battery…', invalidPeriod:'The start date must be earlier than the end date.', sourceGroup:'Source · {source}', fromTo:'From {from} to {to}', paths:'path', noResults:'No path matches this filter for this period.', numeric:'numeric', textState:'text / state', openToInspect:'open to inspect', openPath:'Open this path to read its values.', readingValues:'Reading values…', densePeriod:'Dense period: reading in sub-ranges ({count} requests)…', cannotRead:'Unable to read this path: {error}', authenticationRequired:'Signal K authentication required', tooDense:'The period is too dense to be read in full. Reduce it.', noValues:'No values in this period.', readings:'Readings', unit:'Unit', requests:'Requests', minimum:'Minimum', maximum:'Maximum', latest:'Latest', evolution:'Evolution of {path}', timestamp:'Timestamp', value:'Value', source:'Source', events:'Events', type:'Type', demoMode:'Demo mode', searchingPaths:'Searching paths…', signInFirst:'Sign in to Signal K first.', historyUnavailable:'The History API provider is unavailable.', cannotList:'Unable to list paths (HTTP {status}).', cannotListContexts:'Unable to list contexts (HTTP {status}).', pathsAvailable:'{count} paths available', historyUnavailableStatus:'History unavailable' },
  fr: { connecting:'Connexion à l’historique…', periodAria:'Période à explorer', explorePeriod:'Explorer la période', periodHelp:'Les paths affichés ont des données dans cet intervalle.', context:'Contexte', allContexts:'ALL — tous les contextes', loadingContexts:'Chargement des contextes…', thisVessel:'Ce bateau', start:'Début', end:'Fin', search:'Rechercher', availableHistory:'HISTORIQUE DISPONIBLE', choosePeriod:'Choisissez une période pour découvrir les données.', collapseAll:'Tout replier', pathFilter:'Filtrer les paths, par ex. wind, propulsion, battery…', invalidPeriod:'La date de début doit être antérieure à la date de fin.', sourceGroup:'Source · {source}', fromTo:'Du {from} au {to}', paths:'path', noResults:'Aucun path ne correspond à ce filtre pour cette période.', numeric:'numérique', textState:'texte / état', openToInspect:'ouvrir pour consulter', openPath:'Ouvrez ce path pour lire ses valeurs.', readingValues:'Lecture des valeurs…', densePeriod:'Période dense : lecture par sous-plages ({count} requêtes)…', cannotRead:'Impossible de lire ce path : {error}', authenticationRequired:'authentification Signal K requise', tooDense:'La période est trop dense pour être lue intégralement. Réduisez-la.', noValues:'Aucune valeur dans cette période.', readings:'Relevés', unit:'Unité', requests:'Requêtes', minimum:'Minimum', maximum:'Maximum', latest:'Dernière', evolution:'Évolution de {path}', timestamp:'Horodatage', value:'Valeur', source:'Source', events:'Événements', type:'Type', demoMode:'Mode démonstration', searchingPaths:'Recherche des paths…', signInFirst:'Connectez-vous d’abord à Signal K.', historyUnavailable:'Le provider History API est indisponible.', cannotList:'Impossible de lister les paths (HTTP {status}).', cannotListContexts:'Impossible de lister les contextes (HTTP {status}).', pathsAvailable:'{count} paths disponibles', historyUnavailableStatus:'Historique indisponible' }
};
Object.assign(messages.en,{historyProvider:'History provider:',checkingProvider:'Checking…',providerUnavailable:'Unavailable'});
Object.assign(messages.fr,{historyProvider:'Provider d’historique :',checkingProvider:'Vérification…',providerUnavailable:'Indisponible'});
function t(key, values={}) { return messages[language][key].replace(/\{(\w+)\}/g, (_, name) => values[name] ?? ''); }
function applyTranslations() { document.documentElement.lang=language; document.querySelectorAll('[data-i18n]').forEach(node=>node.textContent=t(node.dataset.i18n)); document.querySelectorAll('[data-i18n-placeholder]').forEach(node=>node.placeholder=t(node.dataset.i18nPlaceholder)); document.querySelectorAll('[data-i18n-aria-label]').forEach(node=>node.setAttribute('aria-label',t(node.dataset.i18nAriaLabel))); }
const fmtDate = new Intl.DateTimeFormat(locale,{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit'});

function isoToLocal(d) { const p=n=>String(n).padStart(2,'0'); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; }
function period() { const from=new Date($('#from-date').value), to=new Date($('#to-date').value); if (Number.isNaN(+from)||Number.isNaN(+to)||from>=to) throw new Error(t('invalidPeriod')); return [from,to]; }
function pathLabel(path) { return path.split('.').at(-1).replace(/([A-Z])/g,' $1').replace(/^./,x=>x.toUpperCase()); }
function pathGroup(item) { return item.source ? t('sourceGroup',{source:item.source}) : item.id.split('.')[0]; }
function setStatus(text,kind='') { const n=$('#api-state'); n.className=`api-state ${kind}`; n.innerHTML='<i></i>'+escapeHTML(text); }
function toast(text) { const n=$('#toast'); n.textContent=text; n.classList.add('show'); clearTimeout(window.toastTimer); window.toastTimer=setTimeout(()=>n.classList.remove('show'),3200); }
function timeRangeParams(extra={}) { const [from,to]=period(); return {from:from.toISOString(),to:to.toISOString(),...extra}; }
function queryParams(extra={}) { const params={...timeRangeParams(),...extra}; if(state.provider) params.provider=state.provider; return new URLSearchParams(params); }
function describePeriod() { const [from,to]=period(); return t('fromTo',{from:fmtDate.format(from),to:fmtDate.format(to)}); }

function renderPaths() {
  const terms=$('#path-filter').value.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const visible=state.paths.filter(p=>!terms.length||terms.some(term=>`${p.id} ${p.source||''}`.toLowerCase().includes(term)));
  const groups=new Map(); visible.forEach(p=>{const key=pathGroup(p); groups.set(key,[...(groups.get(key)||[]),p]);});
  $('#paths-count').textContent=`${visible.length} ${t('paths')}${visible.length!==1?'s':''}`;
  $('#path-groups').innerHTML=visible.length ? [...groups.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([group,items])=>`<details class="path-group"><summary class="group-title"><b>›</b>${escapeHTML(group)}<span>${items.length}</span></summary>${items.map(item=>pathRow(item)).join('')}</details>`).join('') : `<div class="no-results">${t('noResults')}</div>`;
  document.querySelectorAll('.path-details').forEach(node=>node.addEventListener('toggle',()=>{ if(node.open) openPath(node.dataset.path,node); }));
}
function pathRow(item) { const cached=state.details.get(item.id); const type=cached ? (cached.numeric ? t('numeric') : t('textState')) : t('openToInspect'); return `<details class="path-details" data-path="${escapeHTML(item.id)}"><summary class="path-summary"><span class="path-chevron">›</span><code class="path-name">${escapeHTML(item.id)}</code><span class="path-type">${type}</span></summary><div class="path-body"><div class="path-loading">${t('openPath')}</div></div></details>`; }
async function openPath(path,node) { const version=state.queryVersion; const body=node.querySelector('.path-body'); if(state.details.has(path)){body.innerHTML=detailMarkup(path,state.details.get(path));return;} body.innerHTML=`<div class="path-loading">${t('readingValues')}</div>`; try { const data=state.mock ? mockValues(path) : await loadValues(path,count=>{if(node.open&&version===state.queryVersion)body.innerHTML=`<div class="path-loading">${t('densePeriod',{count})}</div>`;}); if(version!==state.queryVersion)return; state.details.set(path,data); if(node.open) body.innerHTML=detailMarkup(path,data); } catch(error) { if(version===state.queryVersion)body.innerHTML=`<div class="empty-values">${t('cannotRead',{error:escapeHTML(error.message)})}</div>`; } }
function historyRows(result,context) { const columns=result.values||result.paths||[]; return (result.data||[]).flatMap(row=>row.slice(1).flatMap((value,index)=>value===null||value===undefined?[]:[{time:row[0],value,context,source:columns[index]?.$source||columns[index]?.source||''}])).filter(row=>row.time); }
async function loadValues(path,onProgress) {
  const [from,to]=period(), selectedContext=state.context;
  const contexts=selectedContext===ALL_CONTEXTS ? [...state.contexts] : [selectedContext];
  let requests=0;
  async function readRange(context,start,end,depth=0) {
    async function request(withSources) {
      requests++;
      const params=new URLSearchParams({paths:path,context,from:start.toISOString(),to:end.toISOString()});
      if(withSources)params.set('sourcePolicy','all');
      if(state.provider)params.set('provider',state.provider);
      return fetch(`${state.server}/signalk/v2/api/history/values?${params}`);
    }
    let response=await request(state.sourcePolicySupported);
    if(response.status===400&&state.sourcePolicySupported) {
      const message=await response.text();
      if(/sourcePolicy|source policy/i.test(message)) {
        state.sourcePolicySupported=false;
        response=await request(false);
      } else throw new Error(`HTTP ${response.status}: ${message}`);
    }
    if(!response.ok)throw new Error(response.status===401?t('authenticationRequired'):`HTTP ${response.status}`);
    const result=await response.json(), data=result.data||[];
    if(data.length<HISTORY_PAGE_SIZE)return historyRows(result,context);
    const middle=new Date((+start+ +end)/2);
    if(depth>=20||+middle===+start||+middle===+end)throw new Error(t('tooDense'));
    onProgress?.(requests);
    return [...await readRange(context,start,middle,depth+1),...await readRange(context,middle,end,depth+1)];
  }
  const chunks=[];
  for(let index=0;index<contexts.length;index+=4)chunks.push(...await Promise.all(contexts.slice(index,index+4).map(context=>readRange(context,from,to))));
  const seen=new Set();
  const rows=chunks.flat().filter(row=>{const key=JSON.stringify([row.time,row.value,row.context,row.source]);if(seen.has(key))return false;seen.add(key);return true;}).sort((a,b)=>Date.parse(a.time)-Date.parse(b.time));
  const metadata=rows.length?await loadMetadata(path,rows[0].context):null;
  return normalizeValues(rows,requests,metadata?.units);
}
async function loadMetadata(path,context) { const contextSegments=context.split('.').map(encodeURIComponent).join('/'); const pathSegments=path.split('.').map(encodeURIComponent).join('/'); const response=await fetch(`${state.server}/signalk/v1/api/${contextSegments}/${pathSegments}/meta`); return response.ok ? response.json() : null; }
function normalizeValues(rows,requests=1,unit='') { const nonNull=rows.map(r=>r.value).filter(v=>v!==null&&v!==undefined); return {rows,requests,unit,numeric:nonNull.length>0&&nonNull.every(v=>typeof v==='number'&&Number.isFinite(v))}; }
function displayValue(path,value,unit='') { if(value===null||value===undefined) return '—'; if(typeof value==='object') return JSON.stringify(value); if(typeof value!=='number') return String(value); let n=value,displayUnit=units[path]||unit; if(displayUnit==='kn')n=value*1.94384; if(displayUnit==='°C')n=value-273.15; if(displayUnit==='hPa')n=value/100; if(displayUnit==='tr/min')n=value*60; if(displayUnit==='°'||displayUnit==='°T')n=value*180/Math.PI; return `${Number(n).toFixed(displayUnit==='tr/min'||displayUnit==='°'||displayUnit==='°T'||displayUnit==='hPa'?0:2)}${displayUnit?` ${displayUnit}`:''}`; }
function detailMarkup(path,data) { if(!data.rows.length)return `<div class="empty-values">${t('noValues')}</div>`; if(data.numeric) return numericMarkup(path,data.rows,data.requests,data.unit); return textMarkup(path,data.rows,data.requests,data.unit); }
function numericMarkup(path,rows,requests,unit) { const stats=rows.reduce((acc,row)=>({min:Math.min(acc.min,row.value),max:Math.max(acc.max,row.value),latest:row.value}),{min:Infinity,max:-Infinity,latest:null}); return `<div class="value-meta"><span>${t('readings')} <strong>${rows.length}</strong></span>${(units[path]||unit)?`<span>${t('unit')} <strong>${escapeHTML(units[path]||unit)}</strong></span>`:''}${requests>1?`<span>${t('requests')} <strong>${requests}</strong></span>`:''}<span>${t('minimum')} <strong>${escapeHTML(displayValue(path,stats.min,unit))}</strong></span><span>${t('maximum')} <strong>${escapeHTML(displayValue(path,stats.max,unit))}</strong></span><span>${t('latest')} <strong>${escapeHTML(displayValue(path,stats.latest,unit))}</strong></span></div><div class="numeric-layout"><div class="mini-chart"><svg viewBox="0 0 800 190" preserveAspectRatio="none" aria-label="${t('evolution',{path:escapeHTML(path)})}">${sparkline(rows)}</svg></div><div class="values-scroll"><table class="value-table"><thead><tr><th>${t('timestamp')}</th><th>${t('value')}</th><th>${t('context')}</th><th>${t('source')}</th></tr></thead><tbody>${tableRows(path,rows,unit)}</tbody></table></div></div>`; }
function textMarkup(path,rows,requests,unit) { return `<div class="value-meta"><span>${t('events')} <strong>${rows.length}</strong></span>${(units[path]||unit)?`<span>${t('unit')} <strong>${escapeHTML(units[path]||unit)}</strong></span>`:''}${requests>1?`<span>${t('requests')} <strong>${requests}</strong></span>`:''}<span>${t('type')} <strong>${t('textState')}</strong></span></div><div class="text-values values-scroll"><table class="value-table"><thead><tr><th>${t('timestamp')}</th><th>${t('value')}</th><th>${t('context')}</th><th>${t('source')}</th></tr></thead><tbody>${tableRows(path,rows,unit)}</tbody></table></div>`; }
function tableRows(path,rows,unit) { return rows.slice().reverse().map(r=>`<tr><td>${fmtDate.format(new Date(r.time))}</td><td>${escapeHTML(displayValue(path,r.value,unit))}</td><td>${escapeHTML(r.context||'—')}</td><td>${escapeHTML(r.source||'—')}</td></tr>`).join(''); }
function sparkline(rows) { const limits=rows.reduce((acc,row)=>({min:Math.min(acc.min,row.value),max:Math.max(acc.max,row.value)}),{min:Infinity,max:-Infinity}),range=limits.max-limits.min||1,first=Date.parse(rows[0].time),last=Date.parse(rows.at(-1).time),span=last-first||1,series=new Map(); rows.forEach(row=>{const key=JSON.stringify([row.context,row.source]);if(!series.has(key))series.set(key,[]);series.get(key).push(row);}); const colors=['#087f7a','#b46b16','#5a67b3','#ad4678','#568233']; return [...series.values()].map((items,index)=>{const step=Math.max(1,Math.ceil(items.length/800));const sampled=items.filter((_,i)=>i%step===0||i===items.length-1);const pts=sampled.map(row=>`${10+(Date.parse(row.time)-first)*780/span},${180-(row.value-limits.min)*165/range}`).join(' ');return `<polyline fill="none" stroke="${colors[index%colors.length]}" stroke-width="3" vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round" points="${pts}"/>`;}).join(''); }
function seeded(seed) { let x=seed%2147483647; return ()=>((x=x*48271%2147483647)/2147483647); }
function mockValues(path) { const [from,to]=period(),rand=seeded(+from/1e5),count=48; const rows=Array.from({length:count},(_,i)=>{let value;if(path.includes('position'))value={latitude:48.39+i*.0004,longitude:-4.49+i*.0002};else if(path.includes('revolutions'))value=18+5*Math.sin(i/5);else if(path.includes('temperature'))value=291+2*Math.sin(i/10);else if(path.includes('pressure'))value=101500+500*Math.sin(i/14);else if(path.includes('angle'))value=.9+.45*Math.sin(i/6);else if(path.includes('course'))value=4.2+.2*Math.sin(i/9);else if(path.includes('voltage'))value=12.7+Math.sin(i/8)*.1;else value=3.5+Math.sin(i/6)+rand()*.2;return {time:new Date(+from+(+to-+from)*i/(count-1)).toISOString(),value,context:state.context===ALL_CONTEXTS?state.contexts[i%state.contexts.length]:state.context,source:''};});return normalizeValues(rows,1,units[path]||''); }
function renderContexts() { const select=$('#context-select'); const contexts=[...new Set(state.contexts)].sort((a,b)=>a==='vessels.self'?-1:b==='vessels.self'?1:a.localeCompare(b)); const all=document.createElement('option');all.value=ALL_CONTEXTS;all.textContent=t('allContexts'); select.replaceChildren(all,...contexts.map(context=>{const option=document.createElement('option'); option.value=context; option.textContent=context==='vessels.self'?`${context} — ${t('thisVessel')}`:context; return option;})); select.value=state.context; select.disabled=false; }
async function loadContexts() { const select=$('#context-select'); select.disabled=true; if(state.mock){state.contexts=['vessels.self','vessels.urn:mrn:imo:mmsi:123456789']; renderContexts(); return;} const response=await fetch(`${state.server}/signalk/v2/api/history/contexts?${queryParams()}`); if(!response.ok)throw new Error(t('cannotListContexts',{status:response.status})); const result=await response.json(); const contexts=(Array.isArray(result)?result:[]).filter(context=>typeof context==='string'&&context); state.contexts=contexts.length?contexts:['vessels.self']; if(state.context!==ALL_CONTEXTS&&!state.contexts.includes(state.context))state.context=state.contexts.includes('vessels.self')?'vessels.self':state.contexts[0]; renderContexts(); }
async function defaultHistoryProvider() {
  const response=await fetch(`${state.server}/signalk/v2/api/history/_providers/_default`);
  if(!response.ok)throw new Error(response.status===401?t('signInFirst'):t('historyUnavailable'));
  const result=await response.json();
  if(typeof result?.id!=='string'||!result.id)throw new Error(t('historyUnavailable'));
  return result.id;
}
async function loadPaths({refreshContexts=true}={}) {
  const version=++state.queryVersion;
  $('#provider-id').textContent=t('checkingProvider');
  try {
    const [from,to]=period();
    state.details.clear();
    setStatus(t('searchingPaths'));
    $('#notice').hidden=true;
    if(state.mock) {
      $('#provider-id').textContent=t('demoMode');
      if(refreshContexts)await loadContexts();
      state.paths=demoPaths.map(id=>({id}));
      setStatus(t('demoMode'),'ready');
    } else {
      const provider=await defaultHistoryProvider();
      if(version!==state.queryVersion)return;
      const providerChanged=provider!==state.provider;
      state.provider=provider;
      if(providerChanged)state.sourcePolicySupported=true;
      $('#provider-id').textContent=provider;
      if(refreshContexts||providerChanged)await loadContexts();
      if(version!==state.queryVersion)return;
      const response=await fetch(`${state.server}/signalk/v2/api/history/paths?${queryParams({from:from.toISOString(),to:to.toISOString()})}`);
      if(!response.ok)throw new Error(t('cannotList',{status:response.status}));
      const result=await response.json();
      if(version!==state.queryVersion)return;
      state.paths=(Array.isArray(result)?result:[]).map(item=>typeof item==='string'?{id:item}:{id:item.path,source:item.source}).filter(item=>item.id);
      setStatus(t('pathsAvailable',{count:state.paths.length}),'ready');
    }
    $('#range-caption').textContent=describePeriod();
    renderPaths();
  } catch(error) {
    if(version!==state.queryVersion)return;
    if($('#provider-id').textContent===t('checkingProvider'))$('#provider-id').textContent=t('providerUnavailable');
    state.paths=[];
    renderPaths();
    setStatus(t('historyUnavailableStatus'),'error');
    const n=$('#notice'); n.textContent=error.message; n.hidden=false;
  }
}
document.addEventListener('DOMContentLoaded',()=>{applyTranslations();const now=new Date(),start=new Date(now-86400000); $('#from-date').value=isoToLocal(start);$('#to-date').value=isoToLocal(now);$('#apply-period').addEventListener('click',()=>loadPaths());$('#context-select').addEventListener('change',event=>{state.context=event.target.value;loadPaths({refreshContexts:false});});$('#path-filter').addEventListener('input',renderPaths);$('#collapse-all').addEventListener('click',()=>document.querySelectorAll('.path-details[open],.path-group[open]').forEach(x=>x.open=false));loadPaths();});
