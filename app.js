'use strict';
const $=s=>document.querySelector(s), esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let db, regs=[], tab='nova', detalhe=null;
const novo=()=>({tipo:'saida',cliente:'',nfs:'',vt:{palete:'',caixa:'',unidade:''},confEsp:'',confLidos:[],motorista:'',placa:'',obs:'',fotos:[],romaneio:[],caminhao:[]});
let f=novo();
const clientes=()=>JSON.parse(localStorage.getItem('clientes')||'[]');
const setClientes=c=>localStorage.setItem('clientes',JSON.stringify(c));
function openDB(){return new Promise((ok,er)=>{const q=indexedDB.open('qlog',1);q.onupgradeneeded=()=>q.result.createObjectStore('regs',{keyPath:'id'});q.onsuccess=()=>ok(q.result);q.onerror=()=>er(q.error);});}
const tx=(m,fn)=>new Promise((ok,er)=>{const t=db.transaction('regs',m),s=t.objectStore('regs'),r=fn(s);t.oncomplete=()=>ok(r&&r.result);t.onerror=()=>er(t.error);});
async function load(){regs=(await tx('readonly',s=>s.getAll())||[]).sort((a,b)=>b.ts-a.ts);}
function toast(m){const t=$('#toast');t.textContent=m;t.style.display='block';clearTimeout(t._h);t._h=setTimeout(()=>t.style.display='none',2500);}
function confirmar(msg,sim,lb){const m=$('#modal');m.innerHTML=`<div><p style="font-size:20px">${esc(msg)}</p><button class="big red" id="mSim">${lb||'Sim, apagar'}</button><button class="big alt" id="mNao">Não</button></div>`;
  m.classList.add('on');$('#mNao').onclick=()=>m.classList.remove('on');$('#mSim').onclick=()=>{m.classList.remove('on');sim();};}
function compress(file){return new Promise(ok=>{const u=URL.createObjectURL(file),i=new Image();i.onload=()=>{const k=Math.min(1,1280/Math.max(i.width,i.height)),c=document.createElement('canvas');
  c.width=Math.round(i.width*k);c.height=Math.round(i.height*k);c.getContext('2d').drawImage(i,0,0,c.width,c.height);URL.revokeObjectURL(u);ok(c.toDataURL('image/jpeg',0.75));};i.onerror=()=>ok(null);i.src=u;});}
function fotosHTML(arr,key,edit){return '<div class="fotos">'+arr.map((d,i)=>`<div><img src="${d}">${edit?`<b data-del="${key}" data-i="${i}">✕</b>`:''}</div>`).join('')+'</div>';}
function render(){document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('on',b.dataset.t===tab));({nova,hist,rel,sobre})[tab]();}
function nova(){const cl=clientes();$('#main').innerHTML=`
<div class="row tipo"><button data-tipo="coleta" class="${f.tipo==='coleta'?'on':''}">📦 Coleta</button><button data-tipo="saida" class="${f.tipo==='saida'?'on':''}">🚚 Saída</button></div>
<label>Transportadora</label><div class="cli">${cl.map(c=>`<button data-cli="${esc(c)}" class="${f.cliente===c?'on':''}">${esc(c)}</button>`).join('')}<button id="addCli">➕ Nova transportadora</button></div>
<label>NFs (separe com - ou espaço)</label><input id="nfs" inputmode="numeric" placeholder="Digite as NFs aqui" value="${esc(f.nfs)}">
<label>Volumes</label><div class="row vt">${[['palete','🟫 Paletes'],['caixa','📦 Caixas'],['unidade','🔹 Unidades']].map(([k,t])=>`<div><small>${t}</small><input data-vt="${k}" type="number" inputmode="numeric" placeholder="0" value="${esc(f.vt[k])}"></div>`).join('')}</div>
<p class="tot">Total: <b id="vtot">${L.volTotal(f.vt)}</b> volumes</p>
<details ${f.confEsp||f.confLidos.length?'open':''}><summary style="padding:12px 0;font-weight:bold">🔎 Conferência de código (opcional)</summary>
<label>Código(s) da NF (esperado)</label><div class="row"><input id="confEsp" placeholder="Digite o código da NF" style="text-transform:uppercase" value="${esc(f.confEsp)}"><button class="big alt" data-ocr="esp" style="flex:0 0 120px;margin:0">📷 Ler texto</button></div>
<label>Código da etiqueta</label><div class="row"><input id="confLido" placeholder="Digite o código" style="text-transform:uppercase"><button class="big" id="confOk" style="flex:0 0 110px;margin:0">✔ Conferir</button></div>
<button class="big alt" data-ocr="lido">📷 Ler texto da etiqueta</button>
${HAS_BD?'<button class="big alt" id="confScan">📷 Ler código com a câmera</button>':'<p><small>Leitor de código de barras não disponível neste celular: use 📷 Ler texto ou digite o código.</small></p>'}
<div id="confRes">${f.confLidos.map(x=>`<div class="conf ${x.ok?'c-ok':'c-bad'}">${x.ok?'✔ Confere':'✖ Código diferente!'} <small>${esc(x.cod)}</small></div>`).join('')}</div></details>
<label>📷 Fotos dos produtos (${f.fotos.length})</label>${fotosHTML(f.fotos,'fotos',1)}<button class="big alt" data-foto="fotos">📷 Tirar foto dos produtos</button>
<label>🧾 Romaneio (${f.romaneio.length})</label>${fotosHTML(f.romaneio,'romaneio',1)}<button class="big alt" data-foto="romaneio">🧾 Tirar foto do romaneio</button>
<label>🚛 Caminhão carregado (${f.caminhao.length})</label>${fotosHTML(f.caminhao,'caminhao',1)}<button class="big alt" data-foto="caminhao">🚛 Tirar foto do caminhão carregado</button>
<p><small>No WhatsApp vão só as fotos do romaneio e do caminhão. As fotos dos produtos ficam guardadas no app.</small></p>
<details><summary style="padding:12px 0;font-weight:bold">Mais (motorista, placa, observação)</summary>
<label>Motorista</label><input id="motorista" value="${esc(f.motorista)}"><label>Placa</label><input id="placa" value="${esc(f.placa)}" style="text-transform:uppercase">
<label>Observação</label><textarea id="obs" rows="2">${esc(f.obs)}</textarea></details>
<p>🕒 Data e hora: automática ao salvar</p><div id="erro" class="err"></div>
<button class="big ok" id="salvar">💾 Salvar</button><button class="big" id="salvarEnv">💾 Salvar e 📤 Compartilhar</button><button class="big alt" id="reset">🔄 Limpar (reset)</button>
<input type="file" id="cam" accept="image/*" capture="environment" multiple hidden>`;
  ['nfs','confEsp','motorista','placa','obs'].forEach(k=>$('#'+k).oninput=e=>f[k]=e.target.value);
  document.querySelectorAll('[data-vt]').forEach(i=>i.oninput=e=>{f.vt[i.dataset.vt]=e.target.value;$('#vtot').textContent=L.volTotal(f.vt);});
  $('#confLido').onkeydown=e=>{if(e.key==='Enter')conferirCod($('#confLido').value);};}
const HAS_BD='BarcodeDetector' in window;
// ---- OCR (v2.5): Android = ML Kit via AndroidOcr bridge; iPhone/PWA/fallback = Tesseract.js local (ocr/) ----
const ocrCbs={};let ocrSeq=0,tessW=null;
window.ocrResult=(id,text,err)=>{const c=ocrCbs[id];if(!c)return;delete ocrCbs[id];err?c.er(new Error(err)):c.ok(text||'');};
function ocrProg(p){const e=$('#ocrPct');if(e)e.textContent=p?Math.round(p*100)+'%':'';}
function loadScript(src){return new Promise((ok,er)=>{const s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=er;document.head.appendChild(s);});}
async function ocrTexto(dataUrl){
  if(window.AndroidOcr)return new Promise((ok,er)=>{const id='o'+(++ocrSeq);ocrCbs[id]={ok,er};window.AndroidOcr.ler(dataUrl,id);});
  if(!window.Tesseract)await loadScript('ocr/tesseract.min.js');
  if(!tessW)tessW=await Tesseract.createWorker('eng',1,{workerPath:'ocr/worker.min.js',corePath:'ocr/',langPath:'ocr/',workerBlobURL:false,gzip:true,
    logger:m=>{if(m.status==='recognizing text')ocrProg(m.progress);}});
  const r=await tessW.recognize(dataUrl);return r.data.text||'';}
function ocrModal(alvo,cands,texto){if(alvo==='lido'){const m=L.casarEsperado(cands,L.parseCods(f.confEsp));cands=m.concat(cands.filter(c=>!m.includes(c)));}const m=$('#modal');
  m.innerHTML=`<div><p style="font-size:22px;margin-top:0"><b>${alvo==='esp'?'Código da NF':'Código da etiqueta'}</b></p>
  ${cands.length?'<p>Toque no código certo:</p>'+cands.map(c=>`<button class="big alt" data-cand="${esc(c)}" style="font-size:24px">${esc(c)}</button>`).join(''):'<p>Não achei código no texto. Digite abaixo.</p>'}
  <label>Confirme ou corrija</label><input id="ocrVal" style="text-transform:uppercase;font-size:24px" value="${esc(cands[0]||'')}">
  <button class="big ok" id="ocrOk">✔ Usar este código</button><button class="big alt" id="ocrNao">Cancelar</button>
  <details><summary style="padding:8px 0">Texto lido</summary><pre style="white-space:pre-wrap;font-size:13px">${esc(texto)}</pre></details></div>`;
  m.classList.add('on');
  m.querySelectorAll('[data-cand]').forEach(b=>b.onclick=()=>{$('#ocrVal').value=b.dataset.cand;});
  $('#ocrNao').onclick=()=>m.classList.remove('on');
  $('#ocrOk').onclick=()=>{const v=$('#ocrVal').value.trim().toUpperCase();m.classList.remove('on');if(!v)return;
    if(alvo==='esp'){const cur=L.parseCods(f.confEsp);if(!cur.includes(L.normCod(v)))f.confEsp=(f.confEsp.trim()?f.confEsp.trim()+' ':'')+v;nova();toast('Código da NF: '+v);}
    else {if(!L.parseCods(f.confEsp).length){toast('Coloque primeiro o código esperado da NF');$('#confLido').value=v;return;}conferirCod(v);}};}
function fotoOcr(al){$('#cam').value='';$('#cam').removeAttribute('multiple');$('#cam').onchange=ev=>{$('#cam').setAttribute('multiple','');ev.target.files[0]&&lerTexto(ev.target.files[0],al);};$('#cam').click();}
// ---- v2.6: scanner ao vivo (só para os campos de código) ----
let SC=null;
function fecharScanner(){if(!SC)return;SC.on=false;clearTimeout(SC.h);try{SC.stream&&SC.stream.getTracks().forEach(t=>t.stop());}catch(e){}const o=$('#scanner');o&&o.remove();SC=null;}
async function abrirScanner(al){
  if(!(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia))return fotoOcr(al);
  const o=document.createElement('div');o.id='scanner';
  o.innerHTML=`<video id="scVid" playsinline muted autoplay></video><div class="scMask"><div class="scBox" id="scBox"></div></div>
  <div class="scTop">${al==='esp'?'Código da NF':'Código da etiqueta'}<br><small id="scMsg">Aponte o código dentro do quadro</small></div>
  <div class="scBot"><button class="big alt" id="scTorch" style="display:none">🔦 Lanterna</button><button class="big alt" id="scFoto">📷 Tirar foto</button><button class="big red" id="scCancel">✖ Cancelar</button></div>`;
  document.body.appendChild(o);SC={on:true,al,busy:false,torch:false};
  $('#scCancel').onclick=fecharScanner;$('#scFoto').onclick=()=>{fecharScanner();fotoOcr(al);};
  let st;try{st=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}},audio:false});}
  catch(e){fecharScanner();toast('Câmera ao vivo não liberada. Usando foto.');return fotoOcr(al);}
  if(!SC||!SC.on){st.getTracks().forEach(t=>t.stop());return;}SC.stream=st;
  const v=$('#scVid');v.srcObject=SC.stream;try{await v.play();}catch(e){}
  const tr=SC.stream.getVideoTracks()[0];try{if(tr.getCapabilities&&tr.getCapabilities().torch){const b=$('#scTorch');b.style.display='';b.onclick=async()=>{SC.torch=!SC.torch;try{await tr.applyConstraints({advanced:[{torch:SC.torch}]});b.textContent=SC.torch?'🔦 Desligar lanterna':'🔦 Lanterna';}catch(e){}};}}catch(e){}
  SC.bd=HAS_BD?new BarcodeDetector():null;scLoop();}
function scCrop(){const v=$('#scVid'),b=$('#scBox');if(!v||!v.videoWidth)return null;
  const vr=v.getBoundingClientRect(),br=b.getBoundingClientRect(),k=Math.max(vr.width/v.videoWidth,vr.height/v.videoHeight);
  const ox=(vr.width-v.videoWidth*k)/2,oy=(vr.height-v.videoHeight*k)/2;
  const sx=Math.max(0,(br.left-vr.left-ox)/k),sy=Math.max(0,(br.top-vr.top-oy)/k),sw=Math.min(v.videoWidth-sx,br.width/k),sh=Math.min(v.videoHeight-sy,br.height/k);
  const c=document.createElement('canvas');const z=Math.min(1,1000/sw);c.width=Math.round(sw*z);c.height=Math.round(sh*z);c.getContext('2d').drawImage(v,sx,sy,sw,sh,0,0,c.width,c.height);return c;}
async function scLoop(){if(!SC||!SC.on)return;const me=SC;
  try{const c=scCrop();if(c){let cands=[],texto='';
    if(me.bd){try{const r=await me.bd.detect(c);r.forEach(x=>{const t=String(x.rawValue||'').trim().toUpperCase();if(t&&!cands.includes(t))cands.push(t);});texto=cands.join('\n');}catch(e){}}
    if(!cands.length){texto=await ocrTexto(c.toDataURL('image/jpeg',0.85));cands=L.extrairCods(texto);}
    const mix=cands.some(c=>/[A-Z]/.test(c)&&/[0-9]/.test(c)),key=cands.join('|'),firme=mix||(cands.length&&me.last===key);me.last=key;
    if(SC===me&&me.on&&cands.length&&firme){const al=me.al;fecharScanner();ocrModal(al,cands,texto);return;}
    const m=$('#scMsg');if(m)m.textContent='Procurando código... aproxime e deixe reto';}}catch(e){}
  if(SC===me&&me.on)me.h=setTimeout(scLoop,600);}
async function lerTexto(file,alvo){const m=$('#modal');m.innerHTML='<div style="text-align:center"><p style="font-size:26px">⏳ Lendo texto...</p><p id="ocrPct" style="font-size:22px"></p><p><small>Pode levar alguns segundos.</small></p></div>';m.classList.add('on');
  try{const d=await compress(file);if(!d)throw new Error('foto');const t=await ocrTexto(d);ocrModal(alvo,L.extrairCods(t),t);}
  catch(e){m.classList.remove('on');toast('Não consegui ler o texto. Digite o código.');}}
function alerta(ok,cod){const m=$('#modal');m.innerHTML=`<div style="text-align:center"><div class="conf ${ok?'c-ok':'c-bad'}" style="font-size:34px">${ok?'✔ Confere':'✖ Código diferente!'}</div><p>Lido: <b>${esc(cod)}</b>${ok?'':'<br>Esperado: <b>'+esc(L.parseCods(f.confEsp).join(', '))+'</b>'}</p><button class="big" id="mOk">OK</button></div>`;m.classList.add('on');$('#mOk').onclick=()=>m.classList.remove('on');}
function conferirCod(v){const esp=L.parseCods(f.confEsp);if(!esp.length){$('#erro').textContent='Coloque primeiro o código esperado da NF';return;}
  const c=L.conferir(esp,v);if(!c.cod)return;f.confLidos.push(c);nova();alerta(c.ok,c.cod);}
async function scan(file){try{const bd=new BarcodeDetector();const b=await createImageBitmap(file);const r=await bd.detect(b);
  if(r.length)conferirCod(r[0].rawValue);else toast('Não achei código na foto. Digite o código.');}catch(e){toast('Leitor falhou. Digite o código.');}}
async function salvar(enviar){const r={id:Date.now()+''+Math.floor(Math.random()*1e4),ts:Date.now(),seq:L.proxSeq(regs,f.tipo),tipo:f.tipo,cliente:f.cliente,nfs:L.parseNFs(f.nfs),volumes:L.volTotal(f.vt),vtipos:{palete:+f.vt.palete||0,caixa:+f.vt.caixa||0,unidade:+f.vt.unidade||0},conf:f.confLidos.length?{esperados:L.parseCods(f.confEsp),lidos:f.confLidos}:null,
  motorista:f.motorista.trim(),placa:f.placa.trim().toUpperCase(),obs:f.obs.trim(),fotos:f.fotos,romaneio:f.romaneio,caminhao:f.caminhao};
  const e=L.validar(r);if(e.length){$('#erro').innerHTML=e.map(esc).join('<br>');return;}
  await tx('readwrite',s=>s.put(r));await load();f=novo();toast('✅ Salvo');if(enviar)compartilhar(r);tab='hist';detalhe=r.id;render();}
function compartilhar(r){const t=L.resumo(r),p=r.romaneio.concat(r.caminhao||[]);
  if(window.AndroidShare)AndroidShare.share(t,JSON.stringify(p),'');else if(navigator.share){let fs=[];try{fs=p.map((d,i)=>dataUrlFile(d,L.codigo(r)+'_'+(i+1)+'.jpg'));}catch(e){fs=[];}
    if(fs.length&&navigator.canShare&&navigator.canShare({files:fs}))navigator.share({text:t,files:fs}).catch(()=>{});else navigator.share({text:t}).catch(()=>{});}else{navigator.clipboard&&navigator.clipboard.writeText(t);toast('Texto copiado');}}
function dataUrlFile(d,n){const b=atob(d.split(',')[1]),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return new File([u],n,{type:'image/jpeg'});}
function shareArquivo(c,n,tp){if(window.AndroidShare)return AndroidShare.share(c,'[]',n);const fl=new File([c],n,{type:tp});
  if(navigator.share&&navigator.canShare&&navigator.canShare({files:[fl]}))return navigator.share({files:[fl],title:n}).catch(()=>{});
  const a=document.createElement('a');a.href=URL.createObjectURL(fl);a.download=n;a.click();}
let mesAt=null;
function mesLista(){const m=L.meses(regs),hoje=L.mesKey(Date.now());if(!m.includes(hoje))m.unshift(hoje);if(!mesAt||!m.includes(mesAt))mesAt=hoje;return m;}
const NOMES=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const mesNome=k=>NOMES[+k.slice(0,2)-1]+' '+k.slice(3);
function mesSelHTML(){return `<label>📅 Mês</label><select id="mesAt" style="width:100%;font-size:20px;padding:10px">${mesLista().map(m=>`<option value="${m}" ${m===mesAt?'selected':''}>${mesNome(m)}</option>`).join('')}</select>`;}
const doMes=()=>regs.filter(r=>L.mesKey(r.ts)===mesAt);
function hist(){if(detalhe){const r=regs.find(x=>x.id===detalhe);if(r)return det(r);detalhe=null;}
  const sm=!!hist.sel;$('#main').innerHTML=mesSelHTML()+`<input id="q" placeholder="🔍 Buscar NF, transportadora, data ou EXP-0001" value="${esc(hist.q||'')}">
  ${sm?`<div class="row"><button class="big red" id="selDel" style="margin:0">🗑 Apagar selecionados (<span id="selN">${hist.sel.size}</span>)</button><button class="big alt" id="selX" style="margin:0;flex:0 0 120px">Cancelar</button></div><button class="big ok" id="selEnv">📤 Enviar selecionados (<span class="selN2">${hist.sel.size}</span>)</button><button class="big alt" id="selAll">☑ Marcar todos da lista</button>`:(doMes().length?'<button class="big alt" id="selOn">☑ Selecionar para apagar</button>':'')}<div id="lista"></div>`;
  $('#q').oninput=e=>{hist.q=e.target.value;lista();};$('#mesAt').onchange=e=>{mesAt=e.target.value;hist.sel=null;hist();};lista();}
function lista(){const v=L.filtrar(doMes(),hist.q);$('#lista').innerHTML=v.length?v.map(r=>`<div class="card${hist.sel&&hist.sel.has(r.id)?' selc':''}" data-open="${r.id}">${hist.sel?`<span style="font-size:26px;float:right">${hist.sel.has(r.id)?'☑':'☐'}</span>`:''}<span class="tag ${r.tipo}">${r.tipo==='coleta'?'COLETA':'SAÍDA'}</span>
 <b>${L.codigo(r)} · ${esc(r.cliente)}</b><br>NFs ${esc(r.nfs.join('-'))} · ${esc(L.volTxt(r))} vol${L.confStatus(r.conf)?' · 🔎 '+L.confStatus(r.conf):''}<br><small>${L.fmtData(r.ts)} ${L.fmtHora(r.ts)} · 📷 ${r.fotos.length} · 🧾 ${r.romaneio.length} · 🚛 ${(r.caminhao||[]).length}</small></div>`).join(''):'<p>Nenhum registro neste mês.</p>';}
function det(r){$('#main').innerHTML=`<button class="big alt" id="voltar">⬅ Voltar</button><div class="card"><span class="tag ${r.tipo}">${r.tipo==='coleta'?'COLETA':'SAÍDA'}</span>
 <pre style="white-space:pre-wrap;font-size:17px">${esc(L.resumo(r))}</pre><label>🧾 Romaneio</label>${fotosHTML(r.romaneio)}<label>🚛 Caminhão carregado</label>${fotosHTML(r.caminhao||[])}<label>📷 Produtos (não vão no WhatsApp)</label>${fotosHTML(r.fotos)}</div>
 <button class="big ok" id="share">📤 Compartilhar no WhatsApp</button><button class="big red" id="apagar">🗑 Apagar registro</button>`;
  $('#voltar').onclick=voltar;$('#share').onclick=()=>compartilhar(r);
  $('#apagar').onclick=()=>confirmar('Apagar este registro? Não tem como desfazer.',async()=>{await tx('readwrite',s=>s.delete(r.id));await load();detalhe=null;toast('Apagado');render();});}
window.voltar=()=>{if(SC)return fecharScanner();if($('#modal').classList.contains('on'))return $('#modal').classList.remove('on');if(tab==='hist'&&detalhe){detalhe=null;return render();}if(tab!=='nova'){tab='nova';render();}};
function rel(){mesLista();const rm=doMes(),x=L.relatorio(rm),tb=(o,t)=>`<h3>${t}</h3><div class="tw"><table><tr><th>${t==='Por dia'?'Dia':'Transportadora'}</th><th>Registros</th><th>Coleta</th><th>Saída</th><th>Volumes</th><th>Pal.</th><th>Cx.</th><th>Un.</th></tr>`+
  Object.entries(o).map(([k,v])=>`<tr><td>${esc(k)}</td><td>${v.reg}</td><td>${v.coleta}</td><td>${v.saida}</td><td>${v.vol}</td><td>${v.palete||0}</td><td>${v.caixa||0}</td><td>${v.unidade||0}</td></tr>`).join('')+'</table></div>';
  $('#main').innerHTML=mesSelHTML()+`<p><b>Total de ${mesNome(mesAt)}:</b> ${rm.length} registros · ${rm.reduce((s,r)=>s+r.volumes,0)} volumes</p>${tb(x.dia,'Por dia')}${tb(x.cli,'Por transportadora')}
  <button class="big" id="csv">📄 Exportar CSV de ${mesNome(mesAt)}</button><button class="big ok" id="expMes">💻 Exportar ${mesNome(mesAt)} para o notebook (com fotos)</button>`;
  $('#mesAt').onchange=e=>{mesAt=e.target.value;rel();};
  $('#csv').onclick=()=>{if(!rm.length)return toast('Sem registros neste mês');const c=L.csv(rm),n='qlog_'+mesAt.replace('/','-')+'.csv';shareArquivo(c,n,'text/csv');};}
function sobre(){$('#main').innerHTML=`<div class="card" style="text-align:center"><img src="icone.png" alt="" style="width:96px"><h2>Qlog Expedição</h2><p><b>Versão:</b> 2.6</p><p><b>Criador:</b> Rodolfo Pereira</p><p><b>Empresa:</b> Qlog</p><p><b>Data:</b> 22/10/2026</p><p style="color:#678;font-size:15px">Registro de coleta e saída com fotos. Os dados ficam só neste celular.</p><p style="color:#678;font-size:14px">© 2026 Rodolfo Pereira</p></div>${isIOSSafari()?'<div class="card" style="background:#e8f1fb;border:2px solid #0b4f8a"><b>📱 Instalar no iPhone</b><p style="font-size:19px">Toque em Compartilhar ⬆️ e depois em \'Adicionar à Tela de Início\'</p></div>':''}<div class="card"><b>🚚 Transportadoras salvas</b>${clientes().length?clientes().map(c=>`<div class="row" style="align-items:center"><span style="flex:1;font-size:19px">${esc(c)}</span><button class="big red" data-rmcli="${esc(c)}" style="flex:0 0 70px;margin:4px 0">🗑</button></div>`).join('')+'<button class="big red" id="resetCli">🗑 Apagar todas</button>':'<p>Nenhuma salva.</p>'}</div>`;}
let fotoAlvo='fotos';
document.addEventListener('click',e=>{const t=e.target.closest('button,[data-open],[data-del]');if(!t)return;const d=t.dataset;
  if(d.t){tab=d.t;detalhe=null;hist.sel=null;render();}else if(d.tipo){f.tipo=d.tipo;nova();}else if(d.cli!==undefined){f.cliente=d.cli;nova();}
  else if(t.id==='addCli'){const m=$('#modal');m.innerHTML='<div><label>Nome da transportadora</label><input id="nc"><button class="big ok" id="ncOk">Adicionar</button><button class="big alt" id="ncX">Cancelar</button></div>';m.classList.add('on');$('#nc').focus();
    $('#ncX').onclick=()=>m.classList.remove('on');$('#ncOk').onclick=()=>{const n=$('#nc').value.trim();if(n){const c=clientes();if(!c.includes(n))c.push(n);setClientes(c);f.cliente=n;}m.classList.remove('on');nova();};}
  else if(d.foto){fotoAlvo=d.foto;$('#cam').value='';$('#cam').onchange=async ev=>{for(const fl of ev.target.files){const u=await compress(fl);if(u)f[fotoAlvo].push(u);}nova();};$('#cam').click();}
  else if(d.del){f[d.del].splice(+d.i,1);nova();}else if(d.open){if(hist.sel){hist.sel.has(d.open)?hist.sel.delete(d.open):hist.sel.add(d.open);lista();$('#selN').textContent=hist.sel.size;document.querySelectorAll('.selN2').forEach(x=>x.textContent=hist.sel.size);}else{detalhe=d.open;render();}}
  else if(t.id==='confOk')conferirCod($('#confLido').value);else if(d.ocr)abrirScanner(d.ocr);
  else if(t.id==='confScan'){$('#cam').value='';$('#cam').removeAttribute('multiple');$('#cam').onchange=ev=>{$('#cam').setAttribute('multiple','');ev.target.files[0]&&scan(ev.target.files[0]);};$('#cam').click();}
  else if(t.id==='reset')confirmar('Limpar tudo que foi preenchido nesta tela?',()=>{f=novo();nova();toast('🔄 Tela limpa');},'Sim, limpar');
  else if(t.id==='resetCli')confirmar('Apagar a lista de transportadoras salvas? Os registros continuam.',()=>{setClientes([]);toast('Lista apagada');sobre();},'Sim, apagar lista');
  else if(d.rmcli!==undefined){const n=d.rmcli;confirmar('Apagar a transportadora "'+n+'" da lista? Os registros continuam.',()=>{setClientes(clientes().filter(c=>c!==n));if(f.cliente===n)f.cliente='';toast('Apagada');sobre();},'Sim, apagar');}
  else if(t.id==='selOn'){hist.sel=new Set();hist();}
  else if(t.id==='selEnv'){const sr=regs.filter(r=>hist.sel.has(r.id));if(!sr.length)return toast('Nenhum selecionado');const m=$('#modal');
    m.innerHTML=`<div><p style="font-size:20px"><b>Enviar ${sr.length} registro(s)</b></p><button class="big ok" id="eHtml">💻 Arquivo pro notebook (com fotos)</button><button class="big" id="eCsv">📄 Planilha CSV</button><button class="big alt" id="eX">Cancelar</button></div>`;m.classList.add('on');
    const nm='qlog_'+mesAt.replace('/','-')+'_'+sr.length+'sel';$('#eX').onclick=()=>m.classList.remove('on');
    $('#eCsv').onclick=()=>{m.classList.remove('on');shareArquivo(L.csv(sr),nm+'.csv','text/csv');};
    $('#eHtml').onclick=()=>{m.classList.remove('on');toast('Gerando arquivo...');shareArquivo(L.htmlMes(sr,mesAt),nm+'.html','text/html');};}else if(t.id==='selX'){hist.sel=null;hist();}
  else if(t.id==='selAll'){L.filtrar(doMes(),hist.q).forEach(r=>hist.sel.add(r.id));hist();}
  else if(t.id==='selDel'){const ids=[...hist.sel];if(!ids.length)return toast('Nenhum selecionado');confirmar('Apagar '+ids.length+' registro(s)? Não tem como desfazer.',async()=>{await tx('readwrite',s=>ids.forEach(i=>s.delete(i)));await load();hist.sel=null;toast(ids.length+' apagado(s)');render();});}
  else if(t.id==='expMes'){const m=mesAt;if(!doMes().length)return toast('Sem registros neste mês');const h=L.htmlMes(regs,m),n='qlog_'+m.replace('/','-')+'.html';toast('Gerando arquivo...');
    shareArquivo(h,n,'text/html');}
  else if(t.id==='salvar')salvar(false);else if(t.id==='salvarEnv')salvar(true);});
openDB().then(x=>{db=x;return load();}).then(render).catch(e=>{$('#main').textContent='Erro no banco: '+e;});

function isIOSSafari(){const u=navigator.userAgent,ios=/iPad|iPhone|iPod/.test(u)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  const st=navigator.standalone===true||(window.matchMedia&&matchMedia('(display-mode: standalone)').matches);return ios&&/Safari/.test(u)&&!/CriOS|FxiOS|EdgiOS/.test(u)&&!st;}
if(navigator.storage&&navigator.storage.persist)navigator.storage.persist().catch(()=>{});
if('serviceWorker' in navigator&&!window.AndroidShare&&location.protocol.startsWith('http'))addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
