'use strict';
const $=s=>document.querySelector(s), esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let db, regs=[], tab='nova', detalhe=null;
const novo=()=>({tipo:'saida',cliente:'',nfs:'',vt:{palete:'',volume:''},confEsp:'',confLidos:[],motorista:'',placa:'',obs:'',fotos:[],romaneio:[],caminhao:[],itens:[],forn:''});
let f=novo();
const clientes=()=>JSON.parse(localStorage.getItem('clientes')||'[]');
const setClientes=c=>{localStorage.setItem('clientes',JSON.stringify(c));window.Nuvem&&Nuvem.lista('clientes',c);};
const fornecedores=()=>JSON.parse(localStorage.getItem('fornecedores')||'[]');
const setFornecedores=c=>{localStorage.setItem('fornecedores',JSON.stringify(c));window.Nuvem&&Nuvem.lista('fornecedores',c);};
const TIPOS=[['coleta','📦 Coleta'],['saida','🚚 Saída'],['recebimento','📥 Recebimento']];
const tipoRow=()=>`<div class="row tipo">${TIPOS.map(([k,t])=>`<button data-tipo="${k}" class="${f.tipo===k?'on':''}">${t}</button>`).join('')}</div>`;
const tagHTML=r=>`<span class="tag ${r.tipo==='recebimento'?'rec':r.tipo}">${L.tipoNome(r.tipo).toUpperCase()}</span>`;
const stCls=s=>s==='CONFERIDO OK'?'c-ok':s==='DIVERGENTE'?'c-bad':'c-wait';
function itensHTML(){const t=L.itensTot(f.itens);return (f.itens.length?f.itens.map((x,i)=>`<div class="item"><span class="icod">${esc(x.cod)}</span><button data-iq="-1" data-ii="${i}">−</button><b class="iqt">${x.qtd}</b><button data-iq="1" data-ii="${i}">+</button><button data-idel="${i}" class="idel">🗑</button></div>`).join(''):'<p><small>Nenhum código ainda. Use o leitor ou digite abaixo.</small></p>')+
  `<p class="tot">Total: <b>${t.cods}</b> itens · <b>${t.un}</b> unidades</p>`;}
function novaRec(){const fl=fornecedores();$('#main').innerHTML=tipoRow()+`
<label>Fornecedor / Cliente</label><div class="cli">${fl.map(c=>`<button data-forn="${esc(c)}" class="${f.forn===c?'on':''}">${esc(c)}</button>`).join('')}<button id="addForn">➕ Novo fornecedor / cliente</button></div>
<label>NFs (opcional)</label><input id="nfs" inputmode="numeric" placeholder="Digite as NFs (se tiver)" value="${esc(f.nfs)}">
<button class="big ok" id="recScan" style="font-size:24px;padding:22px">📷 Ler códigos (contínuo)</button>
<label>Itens recebidos</label><div id="itens">${itensHTML()}</div>
<div class="row"><input id="addCodTxt" placeholder="Digitar código"><button class="big alt" id="addCod" style="flex:0 0 150px;margin:0">➕ Adicionar código</button></div>
<label>📷 Fotos dos produtos (${f.fotos.length})</label>${fotosHTML(f.fotos,'fotos',1)}<button class="big alt" data-foto="fotos">📷 Tirar foto dos produtos</button>
<label>🧾 Romaneio / NF (${f.romaneio.length})</label>${fotosHTML(f.romaneio,'romaneio',1)}<button class="big alt" data-foto="romaneio">🧾 Tirar foto do romaneio / NF</button>
<p><small>No WhatsApp vão só as fotos do romaneio/NF.</small></p>
<label>Observação</label><textarea id="obs" rows="2">${esc(f.obs)}</textarea>
<p>🕒 Data e hora: automática ao salvar</p><div id="erro" class="err"></div>
<button class="big ok" id="salvar">💾 Salvar</button><button class="big" id="salvarEnv">💾 Salvar e 📤 Compartilhar</button><button class="big alt" id="reset">🔄 Limpar (reset)</button>
<input type="file" id="cam" accept="image/*" capture="environment" multiple hidden>`;
  ['nfs','obs'].forEach(k=>$('#'+k).oninput=e=>f[k]=e.target.value);
  $('#addCodTxt').onkeydown=e=>{if(e.key==='Enter')addCodManual();};}
function addCodManual(){const v=$('#addCodTxt').value.trim();if(!v)return;f.itens=L.addItem(f.itens,v);$('#itens').innerHTML=itensHTML();$('#addCodTxt').value='';$('#addCodTxt').focus();}
const qtdDe=(it,c)=>{const x=it.find(i=>i.cod===L.addItem([],c)[0].cod);return x?x.qtd:0;};
function lerContinuoForm(){abrirMulti('Recebimento: ler códigos',code=>{f.itens=L.addItem(f.itens,code);if($('#itens'))$('#itens').innerHTML=itensHTML();return qtdDe(f.itens,code);},()=>{if(tab==='nova')nova();},f.itens);}
function openDB(){return new Promise((ok,er)=>{const q=indexedDB.open('qlog',1);q.onupgradeneeded=()=>q.result.createObjectStore('regs',{keyPath:'id'});q.onsuccess=()=>ok(q.result);q.onerror=()=>er(q.error);});}
const tx=(m,fn)=>new Promise((ok,er)=>{const t=db.transaction('regs',m),s=t.objectStore('regs'),r=fn(s);t.oncomplete=()=>ok(r&&r.result);t.onerror=()=>er(t.error);});
async function load(){regs=(await tx('readonly',s=>s.getAll())||[]).sort((a,b)=>b.ts-a.ts);}
function toast(m){const t=$('#toast');t.textContent=m;t.style.display='block';clearTimeout(t._h);t._h=setTimeout(()=>t.style.display='none',2500);}
function confirmar(msg,sim,lb){const m=$('#modal');m.innerHTML=`<div><p style="font-size:20px">${esc(msg)}</p><button class="big red" id="mSim">${lb||'Sim, apagar'}</button><button class="big alt" id="mNao">Não</button></div>`;
  m.classList.add('on');$('#mNao').onclick=()=>m.classList.remove('on');$('#mSim').onclick=()=>{m.classList.remove('on');sim();};}
function compress(file){return new Promise(ok=>{const u=URL.createObjectURL(file),i=new Image();i.onload=()=>{const k=Math.min(1,1280/Math.max(i.width,i.height)),c=document.createElement('canvas');
  c.width=Math.round(i.width*k);c.height=Math.round(i.height*k);c.getContext('2d').drawImage(i,0,0,c.width,c.height);URL.revokeObjectURL(u);ok(c.toDataURL('image/jpeg',0.75));};i.onerror=()=>ok(null);i.src=u;});}
function fotosHTML(arr,key,edit){return '<div class="fotos">'+arr.map((d,i)=>`<div><img src="${d}">${edit?`<b data-del="${key}" data-i="${i}">✕</b>`:''}</div>`).join('')+'</div>';}
function render(){document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('on',b.dataset.t===tab));({nova,hist,rel,sobre,loc,arquivo:arquivoTela})[tab]();}
function nova(){if(f.tipo==='recebimento')return novaRec();const cl=clientes();$('#main').innerHTML=tipoRow()+`
<label>Transportadora</label><div class="cli">${cl.map(c=>`<button data-cli="${esc(c)}" class="${f.cliente===c?'on':''}"${f.cliente===c?autoCls('cliente'):''}>${esc(c)}</button>`).join('')}<button id="addCli">➕ Nova transportadora</button></div>
<label>NFs (separe com - ou espaço)</label><input id="nfs" inputmode="numeric" placeholder="Digite as NFs aqui" value="${esc(f.nfs)}"${autoCls('nfs')}>${autoDica('nfs')}
<label>Volumes</label><div class="row vt">${[['palete','🟫 Paletes'],['volume','📦 Volumes']].map(([k,t])=>`<div><small>${t}</small><input data-vt="${k}" type="number" inputmode="numeric" placeholder="0" value="${esc(f.vt[k])}"${k==='volume'?autoCls('volume'):''}>${k==='volume'?autoDica('volume'):''}</div>`).join('')}</div>
<p class="tot">Total: <b id="vtp">${+f.vt.palete||0}</b> paletes · <b id="vtv">${+f.vt.volume||0}</b> volumes</p>
<details ${f.confEsp||f.confLidos.length?'open':''}><summary style="padding:12px 0;font-weight:bold">🔎 Conferência de código (opcional)</summary>
<label>Código(s) da NF (esperado)</label><div class="row"><input id="confEsp" placeholder="Digite o código da NF" style="text-transform:uppercase" value="${esc(f.confEsp)}"><button class="big alt" data-ocr="esp" style="flex:0 0 120px;margin:0">📷 Ler texto</button></div>
<label>Código da etiqueta</label><div class="row"><input id="confLido" placeholder="Digite o código" style="text-transform:uppercase"><button class="big" id="confOk" style="flex:0 0 110px;margin:0">✔ Conferir</button></div>
<button class="big alt" data-ocr="lido">📷 Ler texto da etiqueta</button>
${HAS_BD?'<button class="big alt" id="confScan">📷 Ler código com a câmera</button>':'<p><small>Leitor de código de barras não disponível neste celular: use 📷 Ler texto ou digite o código.</small></p>'}
<div id="confRes">${confListaHTML(f.confLidos,1)}</div></details>
<label>📷 Fotos dos produtos (${f.fotos.length})</label>${fotosHTML(f.fotos,'fotos',1)}<button class="big alt" data-foto="fotos">📷 Tirar foto dos produtos</button>
<label>🧾 Romaneio (${f.romaneio.length})</label>${fotosHTML(f.romaneio,'romaneio',1)}<button class="big alt" data-foto="romaneio">🧾 Tirar foto do romaneio</button><button class="big" id="lerRom">📷 Ler romaneio (preencher sozinho)</button>
<label>🚛 Caminhão carregado (${f.caminhao.length})</label>${fotosHTML(f.caminhao,'caminhao',1)}<button class="big alt" data-foto="caminhao">🚛 Tirar foto do caminhão carregado</button>
<p><small>No WhatsApp vão só as fotos do romaneio e do caminhão. As fotos dos produtos ficam guardadas no app.</small></p>
<details><summary style="padding:12px 0;font-weight:bold">Mais (motorista, placa, observação)</summary>
<label>Motorista</label><input id="motorista" value="${esc(f.motorista)}"><label>Placa</label><input id="placa" value="${esc(f.placa)}" style="text-transform:uppercase"${autoCls('placa')}>${autoDica('placa')}
<label>Observação</label><textarea id="obs" rows="2">${esc(f.obs)}</textarea></details>
<p>🕒 Data e hora: automática ao salvar</p><div id="erro" class="err"></div>
<button class="big ok" id="salvar">💾 Salvar</button><button class="big" id="salvarEnv">💾 Salvar e 📤 Compartilhar</button><button class="big alt" id="reset">🔄 Limpar (reset)</button>
<input type="file" id="cam" accept="image/*" capture="environment" multiple hidden>`;
  ['nfs','confEsp','motorista','placa','obs'].forEach(k=>$('#'+k).oninput=e=>f[k]=e.target.value);
  document.querySelectorAll('[data-vt]').forEach(i=>i.oninput=e=>{f.vt[i.dataset.vt]=e.target.value;$('#vtp').textContent=+f.vt.palete||0;$('#vtv').textContent=+f.vt.volume||0;});
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
function fecharScanner(){if(!SC)return;const mu=SC.multi;SC.on=false;setTimeout(()=>mu&&mu.onFim(),0);clearTimeout(SC.h);try{SC.stream&&SC.stream.getTracks().forEach(t=>t.stop());}catch(e){}const o=$('#scanner');o&&o.remove();SC=null;}
const scanCbs={};let scanSeq=0;
// ---- v2.8: leitura contínua (Recebimento). Android = ScanActivity modo multi; iPhone/PWA = loop JS ----
const multiCbs={};
function bip(){try{const A=window.AudioContext||window.webkitAudioContext;if(A){bip.c=bip.c||new A();const o=bip.c.createOscillator(),g=bip.c.createGain();o.frequency.value=1800;g.gain.value=0.2;o.connect(g);g.connect(bip.c.destination);o.start();o.stop(bip.c.currentTime+0.12);}}catch(e){}try{navigator.vibrate&&navigator.vibrate(80);}catch(e){}}
window.scanItem=(id,code)=>{const c=multiCbs[id];if(!c||!code)return;c.got[code]=(c.got[code]||0)+1;c.onItem(code);};
window.scanFim=(id,json,err)=>{const c=multiCbs[id];if(!c)return;delete multiCbs[id];
  try{(JSON.parse(json||'[]')||[]).forEach(x=>{for(let k=(x.qtd||0)-(c.got[x.cod]||0);k>0;k--)c.onItem(x.cod);});}catch(e){}
  if(err==='permissao')toast('Câmera não liberada.');else if(err&&err!=='cancelado')toast('Scanner falhou: '+err);c.onFim();};
function abrirMulti(titulo,onItem,onFim,atuais){
  if(window.AndroidScan&&window.AndroidScan.abrirMulti){const id='m'+(++scanSeq);multiCbs[id]={onItem,onFim,got:{}};
    try{window.AndroidScan.abrirMulti(id,titulo,JSON.stringify(atuais||[]));return;}catch(e){delete multiCbs[id];}}
  abrirScanner(null,{titulo,onItem,onFim});}
window.scanResult=(id,text,err)=>{const al=scanCbs[id];if(!al)return;delete scanCbs[id];
  if(err==='foto')return fotoOcr(al);if(err==='cancelado')return;if(err==='permissao'){toast('Câmera não liberada. Usando foto.');return fotoOcr(al);}
  if(err||text==null){toast('Scanner falhou. Usando foto.');return fotoOcr(al);}
  ocrModal(al,L.extrairCods(text),text);};
async function abrirScanner(al,multi){
  if(window.AndroidScan&&!multi){const id='s'+(++scanSeq);scanCbs[id]=al;try{window.AndroidScan.abrir(id,al==='esp'?'Código da NF':'Código da etiqueta');}catch(e){delete scanCbs[id];fotoOcr(al);}return;}
  if(!(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia)){if(multi){toast('Câmera ao vivo indisponível. Digite os códigos.');return multi.onFim();}return fotoOcr(al);}
  const o=document.createElement('div');o.id='scanner';
  o.innerHTML=`<video id="scVid" playsinline muted autoplay></video><div class="scMask"><div class="scBox" id="scBox"></div></div>
  <div class="scTop">${multi?esc(multi.titulo):al==='esp'?'Código da NF':'Código da etiqueta'}<br><small id="scMsg">Aponte o código dentro do quadro</small><div id="scLast" class="scLast"></div></div>
  <div class="scBot">${multi?(multi.zerar?'<button class="big alt" id="scZera">🔄 Zerar</button>':'')+'<button class="big alt" id="scTorch" style="display:none">🔦 Lanterna</button><button class="big ok" id="scFim">✔ Concluir</button>':`<button class="big alt" id="scTorch" style="display:none">🔦 Lanterna</button><button class="big alt" id="scFoto">📷 Tirar foto</button><button class="big red" id="scCancel">✖ Cancelar</button>`}</div>`;
  document.body.appendChild(o);SC={on:true,al,busy:false,torch:false,multi,seen:{}};
  if(multi)$('#scFim').onclick=fecharScanner;if($('#scZera'))$('#scZera').onclick=()=>{if(confirm('Zerar a contagem? A lista continua.')){multi.zerar();SC.seen={};const z=$('#scLast');if(z)z.textContent='Contagem zerada';}};else{$('#scCancel').onclick=fecharScanner;$('#scFoto').onclick=()=>{fecharScanner();fotoOcr(al);};}
  let st;try{st=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}},audio:false});}
  catch(e){fecharScanner();if(multi){toast('Câmera ao vivo não liberada. Digite os códigos.');return;}toast('Câmera ao vivo não liberada. Usando foto.');return fotoOcr(al);}
  if(!SC||!SC.on){st.getTracks().forEach(t=>t.stop());return;}SC.stream=st;
  const v=$('#scVid');v.srcObject=SC.stream;try{await v.play();}catch(e){}
  const tr=SC.stream.getVideoTracks()[0];try{if(tr.getCapabilities&&tr.getCapabilities().torch){const b=$('#scTorch');b.style.display='';b.onclick=async()=>{SC.torch=!SC.torch;try{await tr.applyConstraints({advanced:[{torch:SC.torch}]});b.textContent=SC.torch?'🔦 Desligar lanterna':'🔦 Lanterna';}catch(e){}};}}catch(e){}
  SC.bd=HAS_BD?new BarcodeDetector():null;scLoop();}
function scCrop(){const v=$('#scVid'),b=$('#scBox');if(!v||!v.videoWidth)return null;
  const vr=v.getBoundingClientRect(),br=b.getBoundingClientRect(),k=Math.max(vr.width/v.videoWidth,vr.height/v.videoHeight);
  const ox=(vr.width-v.videoWidth*k)/2,oy=(vr.height-v.videoHeight*k)/2;
  const sx=Math.max(0,(br.left-vr.left-ox)/k),sy=Math.max(0,(br.top-vr.top-oy)/k),sw=Math.min(v.videoWidth-sx,br.width/k),sh=Math.min(v.videoHeight-sy,br.height/k);
  const c=document.createElement('canvas');const z=Math.min(1,1000/sw);c.width=Math.round(sw*z);c.height=Math.round(sh*z);c.getContext('2d').drawImage(v,sx,sy,sw,sh,0,0,c.width,c.height);return c;}
async function scLoop(){if(!SC||!SC.on)return;const me=SC,t0=Date.now();
  try{const c=scCrop();if(c){let cands=[],texto='',bars=false;
    if(me.bd){try{const r=await me.bd.detect(c);r.forEach(x=>{const t=String(x.rawValue||'').trim().toUpperCase();if(t&&!cands.includes(t))cands.push(t);});texto=cands.join('\n');bars=cands.length>0;}catch(e){}}
    if(!cands.length||(me.multi&&me.multi.match&&!me.multi.match(texto).length)){const bt=texto;texto=await ocrTexto(c.toDataURL('image/jpeg',0.85));cands=L.extrairCods(texto);if(bt)texto=bt+'\n'+texto;}
    const mix=cands.some(c=>/[A-Z]/.test(c)&&/[0-9]/.test(c)),key=cands.join('|'),firme=mix||(cands.length&&me.last===key);me.last=key;
    if(me.multi){const now=Date.now(),win=Math.max(me.multi.cool||1500,2*(now-t0)+700),acc=me.multi.match?me.multi.match(texto):bars?cands:(firme&&cands.length?[cands[0]]:[]);
      for(const cd of acc){const prev=me.seen[cd];me.seen[cd]=now;if(prev&&now-prev<win)continue;if(SC!==me||!me.on)break;const n=me.multi.onItem(cd,texto);if(!me.multi.noBip||!me.multi.noBip())bip();
        const z=$('#scLast'),tx2=me.multi.match?'✔ '+cd+'  ×'+n:'✔ '+cd+'  ×'+n;if(z)z.textContent=tx2;toast(tx2);}
      if(SC===me&&me.on)me.h=setTimeout(scLoop,400);return;}
    if(SC===me&&me.on&&cands.length&&firme){const al=me.al;fecharScanner();ocrModal(al,cands,texto);return;}
    const m=$('#scMsg');if(m)m.textContent='Procurando código... aproxime e deixe reto';}}catch(e){}
  if(SC===me&&me.on)me.h=setTimeout(scLoop,600);}
async function lerTexto(file,alvo){const m=$('#modal');m.innerHTML='<div style="text-align:center"><p style="font-size:26px">⏳ Lendo texto...</p><p id="ocrPct" style="font-size:22px"></p><p><small>Pode levar alguns segundos.</small></p></div>';m.classList.add('on');
  try{const d=await compress(file);if(!d)throw new Error('foto');const t=await ocrTexto(d);ocrModal(alvo,L.extrairCods(t),t);}
  catch(e){m.classList.remove('on');toast('Não consegui ler o texto. Digite o código.');}}
function alerta(ok,cod){const m=$('#modal');m.innerHTML=`<div style="text-align:center"><div class="conf ${ok?'c-ok':'c-bad'}" style="font-size:34px">${ok?'✔ Confere':'✖ Código diferente!'}</div><p>Lido: <b>${esc(cod)}</b>${ok?'':'<br>Esperado: <b>'+esc(L.parseCods(f.confEsp).join(', '))+'</b>'}</p><button class="big" id="mOk">OK</button></div>`;m.classList.add('on');$('#mOk').onclick=()=>m.classList.remove('on');}
function conferirCod(v){const esp=L.parseCods(f.confEsp);if(!esp.length){$('#erro').textContent='Coloque primeiro o código esperado da NF';return;}
  const c=L.conferir(esp,v);if(!c.cod)return;f.confLidos=L.confAdd(f.confLidos,c,Date.now());nova();alerta(c.ok,c.cod);}
async function scan(file){try{const bd=new BarcodeDetector();const b=await createImageBitmap(file);const r=await bd.detect(b);
  if(r.length)conferirCod(r[0].rawValue);else toast('Não achei código na foto. Digite o código.');}catch(e){toast('Leitor falhou. Digite o código.');}}
async function salvar(enviar){if(f.tipo==='recebimento')return salvarRec(enviar);const r={id:Date.now()+''+Math.floor(Math.random()*1e4),ts:Date.now(),seq:L.proxSeq(regs,f.tipo),tipo:f.tipo,cliente:f.cliente,nfs:L.parseNFs(f.nfs),volumes:L.volTotal(f.vt),vtipos:{palete:+f.vt.palete||0,volume:+f.vt.volume||0},conf:f.confLidos.length?{esperados:L.parseCods(f.confEsp),lidos:f.confLidos}:null,
  motorista:f.motorista.trim(),placa:f.placa.trim().toUpperCase(),obs:f.obs.trim(),fotos:f.fotos,romaneio:f.romaneio,caminhao:f.caminhao};
  const e=L.validar(r);if(e.length){$('#erro').innerHTML=e.map(esc).join('<br>');return;}
  if(window.Nuvem&&Nuvem.on){r.autorUid=Nuvem.uid;}await tx('readwrite',s=>s.put(r));await load();window.Nuvem&&Nuvem.salvar(r);f=novo();toast('✅ Salvo');if(enviar)compartilhar(r);tab='hist';detalhe=r.id;render();}
async function salvarRec(enviar){const r={id:Date.now()+''+Math.floor(Math.random()*1e4),ts:Date.now(),seq:L.proxSeq(regs,'recebimento'),tipo:'recebimento',cliente:f.forn,nfs:L.parseNFs(f.nfs),volumes:0,
  itens:f.itens.map(x=>({cod:x.cod,qtd:x.qtd})),skuEsp:null,obs:f.obs.trim(),fotos:f.fotos,romaneio:f.romaneio,caminhao:[]};
  const e=L.validar(r);if(e.length){$('#erro').innerHTML=e.map(esc).join('<br>');return;}
  if(window.Nuvem&&Nuvem.on){r.autorUid=Nuvem.uid;}await tx('readwrite',s=>s.put(r));await load();window.Nuvem&&Nuvem.salvar(r);f=novo();f.tipo='recebimento';toast('✅ Salvo');if(enviar)compartilhar(r);tab='hist';detalhe=r.id;render();}
function grpHTML(c){return [['c-ok','✔ OK',c.ok],['c-dif','⚠ Quantidade diferente',c.dif],['c-bad','✖ Faltou',c.faltou],['c-mais','➕ A mais',c.amais]].map(([k,t,a])=>
  `<div class="grp"><div class="gh ${k}">${t} (${a.length})</div>${a.length?'<table><tr><th>Código</th><th>Esperado</th><th>Lido</th></tr>'+a.map(x=>`<tr><td>${esc(x.cod)}</td><td>${x.esp}</td><td>${x.lido}</td></tr>`).join('')+'</table>':'<p><small>Nenhum</small></p>'}</div>`).join('');}
function detRec(r){const c=L.conferirSku(r.itens,r.skuEsp),t=L.itensTot(r.itens);$('#main').innerHTML=`<button class="big alt" id="voltar">⬅ Voltar</button><div class="card">${tagHTML(r)} <span class="st ${stCls(c.status)}">${c.status}</span>
 <pre style="white-space:pre-wrap;font-size:17px">${esc(L.resumo(r))}</pre></div>
 <div class="card"><b>📋 Conferência com lista de SKU</b>${r.skuEsp?`<p>Lista: ${r.skuEsp.length} códigos · ${r.skuEsp.reduce((s,x)=>s+x.qtd,0)} unidades. Lido: ${t.cods} códigos · ${t.un} unidades.</p>`+grpHTML(c):'<p>Lista de SKU ainda não chegou. Quando chegar, toque abaixo.</p>'}
 <button class="big" id="skuBtn">📋 ${r.skuEsp?'Editar lista de SKU':'Conferir com lista de SKU'}</button></div>
 <div class="card"><label>🧾 Romaneio / NF</label>${fotosHTML(r.romaneio||[])}<label>📷 Produtos (não vão no WhatsApp)</label>${fotosHTML(r.fotos||[])}</div>
 ${nomeAutor(r)?'<p>👤 Feito por: <b>'+esc(nomeAutor(r))+'</b></p>':''}${r.nuvem&&!(r.fotos||[]).length&&(r.n_fotos||r.n_romaneio||r.n_caminhao)?'<p><small>📷 As fotos ficaram no celular de quem fez o registro.</small></p>':''} ${L.editadoTxt(r)?'<p><small>'+esc(L.editadoTxt(r))+'</small></p>':''}<button class="big ok" id="share">📤 Compartilhar no WhatsApp</button><button class="big" id="editar">✏️ Editar</button><button class="big red" id="apagar">🗑 Apagar registro</button>`;
  $('#voltar').onclick=voltar;$('#share').onclick=()=>compartilhar(r);$('#editar').onclick=()=>abrirEdicao(r);$('#skuBtn').onclick=()=>skuModal(r);
  $('#apagar').onclick=()=>(window.Nuvem&&!Nuvem.pode())?toast('Só o administrador pode apagar'):confirmar('Apagar este registro? Não tem como desfazer.',async()=>{await tx('readwrite',s=>s.delete(r.id));window.Nuvem&&Nuvem.apagar(r.id);await load();detalhe=null;toast('Apagado');render();});}
function skuModal(r){const m=$('#modal');m.innerHTML=`<div style="max-height:90vh;overflow:auto"><p style="font-size:20px;margin-top:0"><b>📋 Lista de SKU esperada</b></p>
  <p><small>Um código por linha. Pode ter quantidade: <b>SKU;qtd</b> ou <b>SKU qtd</b>. Sem quantidade = 1.</small></p>
  <textarea id="skuTxt" rows="8" style="font-size:18px" placeholder="7891234567890;10&#10;ABC123 5">${esc(L.skuTexto(r.skuEsp))}</textarea>
  <button class="big alt" id="skuCam">📷 Ler a lista com a câmera</button><button class="big alt" id="skuArq">📄 Importar arquivo CSV/TXT</button>
  <input type="file" id="skuFile" accept=".csv,.txt,text/plain,text/csv" hidden>
  <button class="big ok" id="skuOk">💾 Salvar e conferir</button>${r.skuEsp?'<button class="big red" id="skuDel">🗑 Remover lista</button>':''}<button class="big alt" id="skuX">Cancelar</button></div>`;
  m.classList.add('on');$('#skuX').onclick=()=>m.classList.remove('on');
  const grava=async l=>{if(window.Nuvem&&!Nuvem.pode()){m.classList.remove('on');return toast('Só o administrador pode mudar registros');}r.skuEsp=l;await tx('readwrite',s=>s.put(r));await load();window.Nuvem&&Nuvem.salvar(r);m.classList.remove('on');toast(l?'Lista salva: '+L.conferirSku(r.itens,l).status:'Lista removida');render();};
  $('#skuOk').onclick=()=>{const l=L.parseSkuLista($('#skuTxt').value);if(!l.length)return toast('Lista vazia');grava(l);};
  if($('#skuDel'))$('#skuDel').onclick=()=>grava(null);
  $('#skuArq').onclick=()=>{$('#skuFile').value='';$('#skuFile').click();};
  $('#skuFile').onchange=ev=>{const fl=ev.target.files[0];if(!fl)return;const rd=new FileReader();rd.onload=()=>{const l=L.parseSkuLista(rd.result);if(!l.length)return toast('Não achei códigos no arquivo');$('#skuTxt').value=L.skuTexto(l);toast(l.length+' códigos importados');};rd.readAsText(fl);};
  $('#skuCam').onclick=()=>{let tmp=L.parseSkuLista($('#skuTxt').value);abrirMulti('Lista de SKU: ler códigos',code=>{tmp=L.addItem(tmp,code);const e=$('#skuTxt');if(e)e.value=L.skuTexto(tmp);return qtdDe(tmp,code);},()=>{const e=$('#skuTxt');if(e)e.value=L.skuTexto(tmp);},tmp);};}
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
function hist(){if(ed&&$('#edOk')){edLer();return edTela();}if(ed&&detalhe!==ed.id)ed=null;if(ed)return edTela();if(detalhe){const r=regs.find(x=>x.id===detalhe);if(r)return det(r);detalhe=null;}
  const sm=!!hist.sel;$('#main').innerHTML=mesSelHTML()+`<input id="q" placeholder="🔍 Buscar NF, transportadora, código, data, EXP/REC" value="${esc(hist.q||'')}">
  ${sm?`<div class="row"><button class="big red" id="selDel" style="margin:0">🗑 Apagar selecionados (<span id="selN">${hist.sel.size}</span>)</button><button class="big alt" id="selX" style="margin:0;flex:0 0 120px">Cancelar</button></div><button class="big ok" id="selEnv">📤 Enviar selecionados (<span class="selN2">${hist.sel.size}</span>)</button><button class="big alt" id="selAll">☑ Marcar todos da lista</button>`:(doMes().length?'<button class="big alt" id="selOn">☑ Selecionar para apagar</button>':'')}<div id="lista"></div>`;
  $('#q').oninput=e=>{hist.q=e.target.value;lista();};$('#mesAt').onchange=e=>{mesAt=e.target.value;hist.sel=null;hist();};lista();}
function lista(){const v=L.filtrar(doMes(),hist.q);$('#lista').innerHTML=v.length?v.map(r=>`<div class="card${hist.sel&&hist.sel.has(r.id)?' selc':''}" data-open="${r.id}">${hist.sel?`<span style="font-size:26px;float:right">${hist.sel.has(r.id)?'☑':'☐'}</span>`:''}${tagHTML(r)}${r.tipo==='recebimento'?` <span class="st ${stCls(L.recStatus(r))}">${L.recStatus(r)}</span>
 <b>${L.codigo(r)} · ${esc(r.cliente||'Sem fornecedor')}</b><br>${(r.nfs||[]).length?'NFs '+esc(r.nfs.join('-'))+' · ':''}${L.itensTot(r.itens).cods} itens · ${L.itensTot(r.itens).un} un.<br><small>${L.fmtData(r.ts)} ${L.fmtHora(r.ts)} · 📷 ${r.fotos.length} · 🧾 ${r.romaneio.length}</small></div>`:`
 <b>${L.codigo(r)} · ${esc(r.cliente)}</b><br>NFs ${esc(r.nfs.join('-'))} · ${esc(L.volTxt(r))} vol${L.confStatus(r.conf)?' · 🔎 '+L.confStatus(r.conf):''}<br><small>${L.fmtData(r.ts)} ${L.fmtHora(r.ts)} · 📷 ${r.fotos.length} · 🧾 ${r.romaneio.length} · 🚛 ${(r.caminhao||[]).length}</small></div>`}`).join(''):'<p>Nenhum registro neste mês.</p>';}
function det(r){if(r.tipo==='recebimento')return detRec(r);$('#main').innerHTML=`<button class="big alt" id="voltar">⬅ Voltar</button><div class="card"><span class="tag ${r.tipo}">${r.tipo==='coleta'?'COLETA':'SAÍDA'}</span>
 <pre style="white-space:pre-wrap;font-size:17px">${esc(L.resumo(r))}</pre><label>🧾 Romaneio</label>${fotosHTML(r.romaneio)}<label>🚛 Caminhão carregado</label>${fotosHTML(r.caminhao||[])}${r.conf&&(r.conf.lidos||[]).length?confListaHTML(r.conf.lidos,0):''}<label>📷 Produtos (não vão no WhatsApp)</label>${fotosHTML(r.fotos)}</div>
 ${nomeAutor(r)?'<p>👤 Feito por: <b>'+esc(nomeAutor(r))+'</b></p>':''}${r.nuvem&&!(r.fotos||[]).length&&(r.n_fotos||r.n_romaneio||r.n_caminhao)?'<p><small>📷 As fotos ficaram no celular de quem fez o registro.</small></p>':''} ${L.editadoTxt(r)?'<p><small>'+esc(L.editadoTxt(r))+'</small></p>':''}<button class="big ok" id="share">📤 Compartilhar no WhatsApp</button><button class="big" id="editar">✏️ Editar</button><button class="big red" id="apagar">🗑 Apagar registro</button>`;
  $('#voltar').onclick=voltar;$('#share').onclick=()=>compartilhar(r);$('#editar').onclick=()=>abrirEdicao(r);
  $('#apagar').onclick=()=>(window.Nuvem&&!Nuvem.pode())?toast('Só o administrador pode apagar'):confirmar('Apagar este registro? Não tem como desfazer.',async()=>{await tx('readwrite',s=>s.delete(r.id));window.Nuvem&&Nuvem.apagar(r.id);await load();detalhe=null;toast('Apagado');render();});}

// ---- v4.1: editar registro ----
let ed=null;
function usuario(){const N=window.Nuvem;return {on:!!(N&&N.on),admin:!!(N&&N.admin),uid:N&&N.uid};}
function abrirEdicao(r){if(!L.podeEditar(r,usuario()))return toast('Só quem fez o registro ou o administrador pode editar');
  const vt=L.vtNorm(r.vtipos||{volume:r.volumes});
  ed={id:r.id,tipo:r.tipo,c:{cliente:r.cliente||'',nfs:(r.nfs||[]).join('-'),palete:vt.palete||'',volume:vt.volume||'',placa:r.placa||'',motorista:r.motorista||'',obs:r.obs||''},
    fotos:{fotos:(r.fotos||[]).slice(),romaneio:(r.romaneio||[]).slice(),caminhao:(r.caminhao||[]).slice(),mexeu:{}}};edTela();}
function edLer(){if(!ed)return;document.querySelectorAll('[data-ec]').forEach(i=>{ed.c[i.dataset.ec]=i.value;});}
function edFotos(k,titulo){const a=ed.fotos[k];return `<label>${titulo} (${a.length})</label><div class="fotos">${a.map((d,i)=>`<div><img src="${d}"><div class="row" style="gap:4px"><button class="big" data-eft="${k}" data-i="${i}" style="margin:2px 0;font-size:15px;padding:6px">🔄 Trocar</button><button class="big red" data-efr="${k}" data-i="${i}" style="margin:2px 0;font-size:15px;padding:6px">❌ Remover</button></div></div>`).join('')}</div><button class="big alt" data-efa="${k}">📷 Adicionar foto</button>`;}
function edTela(){const rec=ed.tipo==='recebimento',lst=rec?fornecedores():clientes(),inp=(k,lb,ex)=>`<label>${lb}</label><input data-ec="${k}" value="${esc(ed.c[k])}" ${ex||''}>`;
  $('#main').innerHTML=`<button class="big alt" id="edX">⬅ Cancelar</button><div class="card"><b style="font-size:21px">✏️ Editar registro</b>
  <label>${rec?'Fornecedor / cliente':'Transportadora'}</label><input data-ec="cliente" list="edLst" value="${esc(ed.c.cliente)}"><datalist id="edLst">${lst.map(c=>`<option value="${esc(c)}">`).join('')}</datalist>
  ${inp('nfs','NFs (separe com traço)','inputmode="numeric"')}
  ${rec?'':`<div class="row"><div style="flex:1">${inp('palete','Paletes','type="number" min="0" inputmode="numeric"')}</div><div style="flex:1">${inp('volume','Volumes','type="number" min="0" inputmode="numeric"')}</div></div>
  ${inp('placa','Placa','style="text-transform:uppercase"')}${inp('motorista','Motorista')}`}
  <label>Observação</label><textarea data-ec="obs" rows="3">${esc(ed.c.obs)}</textarea></div>
  <div class="card">${edFotos('romaneio','🧾 Romaneio')}${rec?'':edFotos('caminhao','🚛 Caminhão carregado')}${edFotos('fotos','📷 Produtos')}</div>
  <p id="edErro" style="color:#c62828"></p><button class="big ok" id="edOk">💾 Salvar alterações</button><button class="big alt" id="edX2">Cancelar</button>`;
  const sair=()=>{ed=null;render();};$('#edX').onclick=sair;$('#edX2').onclick=sair;$('#edOk').onclick=edSalvar;}
// câmera primeiro; galeria como segunda opção
function edPegar(fn){const m=$('#modal');m.innerHTML=`<div><p style="font-size:20px;margin-top:0"><b>Escolha a foto</b></p><button class="big ok" id="pfC">📷 Tirar foto</button><button class="big alt" id="pfG">🖼️ Pegar da galeria</button><button class="big alt" id="pfX">Cancelar</button></div>`;m.classList.add('on');
  const pega=cam=>{m.classList.remove('on');const i=document.createElement('input');i.type='file';i.accept='image/*';if(cam)i.setAttribute('capture','environment');i.onchange=async()=>{const fl=i.files[0];if(!fl)return;const u=await compress(fl);if(!u)return toast('Não consegui ler a foto');fn(u);};i.click();};
  $('#pfC').onclick=()=>pega(true);$('#pfG').onclick=()=>pega(false);$('#pfX').onclick=()=>m.classList.remove('on');}
document.addEventListener('click',e=>{if(!ed)return;const t=e.target.closest('[data-eft],[data-efr],[data-efa]');if(!t)return;e.stopPropagation();edLer();const d=t.dataset,i=+d.i;
  if(d.efr)confirmar('Remover esta foto?',()=>{ed.fotos[d.efr]=L.fotoOp(ed.fotos[d.efr],'remover',i);ed.fotos.mexeu[d.efr]=1;edTela();},'Sim, remover');
  else if(d.eft)edPegar(u=>{ed.fotos[d.eft]=L.fotoOp(ed.fotos[d.eft],'trocar',i,u);ed.fotos.mexeu[d.eft]=1;edTela();});
  else if(d.efa)edPegar(u=>{ed.fotos[d.efa]=L.fotoOp(ed.fotos[d.efa],'adicionar',-1,u);ed.fotos.mexeu[d.efa]=1;edTela();});},true);
async function edSalvar(){edLer();const id=ed.id;
  // v4.0.5: lê o registro do celular (com as fotos) antes de mexer
  let r=null;try{r=await tx('readonly',s=>s.get(id));}catch(e){}if(!r)r=regs.find(x=>x.id===id);if(!r){ed=null;return render();}
  if(!L.podeEditar(r,usuario())){ed=null;toast('Só quem fez o registro ou o administrador pode editar');return render();}
  const c=Object.assign({},ed.c);if(ed.tipo==='recebimento'){delete c.palete;delete c.volume;delete c.placa;delete c.motorista;}
  const n=L.regEditar(r,c,ed.fotos,Date.now());const er=L.editValidar(n);if(er.length){$('#edErro').innerHTML=er.map(esc).join('<br>');return;}
  const salvo=(window.Nuvem&&!Nuvem.admin)?L.semAutor(n):n;
  if(salvo.cliente){if(ed.tipo==='recebimento'){const l=fornecedores();if(!l.includes(salvo.cliente)){l.push(salvo.cliente);setFornecedores(l);}}else{const l=clientes();if(!l.includes(salvo.cliente)){l.push(salvo.cliente);setClientes(l);}}}
  await tx('readwrite',s=>s.put(salvo));await load();window.Nuvem&&Nuvem.salvar(salvo);ed=null;detalhe=id;toast('✅ Alterações salvas');render();}

// ---- v3.2: Localizar códigos (lista + câmera procurando) ----
const locGet=()=>{try{const l=JSON.parse(localStorage.getItem('locLista')||'[]');return (Array.isArray(l)?l:[]).filter(x=>x&&x.cod!=null).map(x=>({cod:String(x.cod),al:Array.isArray(x.al)?x.al.map(String):[],alvo:+x.alvo||null,n:+x.n||(x.ok?1:0),ult:x.ult?String(x.ult):'',uh:x.uh?String(x.uh):''}));}catch(e){return [];}};
const locSet=l=>localStorage.setItem('locLista',JSON.stringify(l));
function locAdd(txt){try{const l=locGet();let n=0;L.parseLocLista(txt).forEach(c=>{const o=l.find(x=>L.locNorm(x.cod)===L.locNorm(c.cod));if(o){c.al.forEach(a=>{if(!o.al.includes(a))o.al.push(a);});if(c.alvo)o.alvo=c.alvo;}else{l.push(c);n++;}});locSet(l);return n;}catch(e){toast('Não consegui ler essa lista. Tente colar de novo ou um código por linha.');return 0;}}
function locSoma(cod,d){const l=locGet(),x=l.find(i=>i.cod===cod);if(!x)return 0;x.n=Math.max(0,x.n+(d==null?1:d));locSet(l);return x.n;}
function locCont(){const l=locGet(),a=l.filter(x=>x.n>0).length;return {n:l.length,a,f:l.length-a,t:l.reduce((s,x)=>s+x.n,0)};}
window.locZerar=()=>{locSet(locGet().map(x=>Object.assign(x,{n:0})));if(tab==='loc')loc();};
function locUlt(cod,raw){if(!cod)return;const l=locGet(),x=l.find(i=>i.cod===cod);if(!x)return;x.ult=String(raw||cod).replace(/\s+/g,' ').trim().slice(0,80);const d=new Date();x.uh=String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')+':'+String(d.getSeconds()).padStart(2,'0');locSet(l);}
window.locAchou=(cod,raw)=>{if(cod){locSoma(cod,1);locUlt(cod,raw);}if(tab==='loc')loc();};
function loc(){const l=locGet(),c=locCont();$('#main').innerHTML=`<div class="card" style="text-align:center"><b style="font-size:22px">🔍 Localizar códigos</b>
 <p style="font-size:24px;margin:8px 0">📦 Total contado: <b>${c.t}</b></p>
 <p style="font-size:20px;margin:8px 0"><span style="color:#1b8a3a">✅ Códigos achados: <b>${c.a}</b></span> · <span style="color:#c62828">⏳ Faltam: <b>${c.f}</b></span></p><small>Códigos na lista: ${c.n}</small></div>
 <button class="big ok" id="locCam" style="font-size:24px;padding:22px">📷 Procurar e contar com a câmera</button>
 <p><small>Passe a câmera devagar pelas caixas. Cada código da lista que aparecer soma +1, apita, vibra e fica verde. A mesma etiqueta parada na frente da câmera não conta de novo: tire da frente e espere uns 3 segundos.</small></p>
 ${window.AndroidScan?'':`<button class="big alt" id="locBip">${localStorage.getItem('locBip')==='0'?'🔇 Bipe: DESLIGADO':'🔊 Bipe: LIGADO'}</button>`}
 <label>Colar a lista (pode colar a tabela do e-mail: SAP, descrição e peças)</label><textarea id="locTxt" rows="4" placeholder="ABC123&#10;7891234567890"></textarea>
 <button class="big" id="locAdd">➕ Colocar na lista</button><button class="big alt" id="locFoto">📷 Ler print/foto da tabela</button><input type="file" id="locImg" accept="image/*" hidden><button class="big alt" id="locArq">📄 Importar arquivo TXT/CSV</button><input type="file" id="locFile" accept=".csv,.txt,text/plain,text/csv" hidden>
 <label>Lista (use − e + para corrigir)</label>${l.length?l.map((x,i)=>{const ok=x.alvo?x.n>=x.alvo:x.n>0;return `<div class="locit ${ok?'lok':x.n?'lmeio':''}"><div class="lt"><div class="lsap">${ok?'✅':x.n?'✔':'⏳'} ${esc(x.cod)}</div>${x.al.length?'<div class="ldesc">'+esc(x.al.join(' · '))+'</div>':''}<div class="lcont">${x.alvo?'contado <b>'+x.n+'</b> de <b>'+x.alvo+'</b>'+(ok?' · COMPLETO':''):'contado <b>'+x.n+'</b>'}</div>${x.ult?'<div class="lult">📷 Último lido: '+esc(x.ult)+' às '+esc(x.uh)+'</div>':'<div class="lult">Ainda não lido pela câmera</div>'}</div><div class="lbt"><button data-locq="1" data-loci="${i}">+</button><b>${x.n}</b><button data-locq="-1" data-loci="${i}">−</button></div></div>`;}).join(''):'<p><small>Lista vazia. Cole os códigos acima.</small></p>'}
 ${l.length?'<button class="big alt" id="locZera">🔄 Zerar contagem</button><button class="big red" id="locDel">🗑 Apagar lista</button>':''}`;
 $('#locAdd').onclick=()=>{if(!$('#locTxt').value.trim())return toast('Cole os códigos primeiro');locPrev($('#locTxt').value);};
 $('#locFoto').onclick=()=>{$('#locImg').value='';$('#locImg').click();};
 $('#locImg').onchange=ev=>{const fl=ev.target.files[0];if(fl)locFoto(fl);};
 $('#locArq').onclick=()=>{$('#locFile').value='';$('#locFile').click();};
 $('#locFile').onchange=ev=>{const fl=ev.target.files[0];if(!fl)return;const rd=new FileReader();rd.onerror=()=>toast('Não consegui abrir o arquivo');rd.onload=()=>locPrev(rd.result);rd.readAsText(fl);};
 document.querySelectorAll('[data-locq]').forEach(b=>b.onclick=()=>{const x=locGet()[+b.dataset.loci];if(x){locSoma(x.cod,+b.dataset.locq);loc();}});
 if($('#locZera'))$('#locZera').onclick=()=>confirmar('Zerar a contagem? A lista continua.',()=>{locSet(locGet().map(x=>Object.assign(x,{n:0})));loc();},'Sim, zerar');
 if($('#locDel'))$('#locDel').onclick=()=>confirmar('Apagar a lista de códigos?',()=>{locSet([]);loc();},'Sim, apagar');
 if($('#locBip'))$('#locBip').onclick=()=>{localStorage.setItem('locBip',localStorage.getItem('locBip')==='0'?'1':'0');loc();};
 $('#locCam').onclick=locCamera;}
function locPrev(txt){let p;try{p=L.locPrevia(txt);}catch(e){p={itens:[],duv:0};}
  const m=$('#modal');if(!p.itens.length){toast('Não entendi nenhum código. Confira o texto.');$('#locTxt')&&($('#locTxt').value=String(txt||''));return;}
  m.innerHTML=`<div class="card" style="max-height:85vh;overflow:auto"><b style="font-size:22px">Entendi ${p.itens.length} ${p.itens.length>1?'itens':'item'}:</b>${p.duv?'<p style="color:#8a6d00"><b>⚠ '+p.duv+' em amarelo: confira</b></p>':''}
   ${p.itens.map((x,i)=>`<div class="locit ${x.duv?'lduv':''}"><div class="lt"><div class="lsap">${esc(x.cod)}</div>${x.al.length?'<div class="ldesc">'+esc(x.al.join(' · '))+'</div>':''}<div class="lcont">${x.alvo?x.alvo+' peças':'sem quantidade'}</div>${x.duv?'<input data-pv="'+i+'" value="'+esc(L.locLinha(x))+'" style="width:100%;font-size:18px">':''}</div></div>`).join('')}
   <button class="big ok" id="pvOk">✅ Confirmar</button><button class="big alt" id="pvEd">✏️ Corrigir</button></div>`;m.classList.add('on');
  $('#pvOk').onclick=()=>{try{const lin=p.itens.map((x,i)=>{const e=m.querySelector('[data-pv="'+i+'"]');return e?e.value:L.locLinha(x);}).join('\n');m.classList.remove('on');
    const n=locAdd(lin);toast(n?n+' item(ns) colocado(s)':'Lista atualizada');if($('#locTxt'))$('#locTxt').value='';loc();}catch(e){m.classList.remove('on');toast('Não consegui salvar. Tente de novo.');}};
  $('#pvEd').onclick=()=>{const lin=p.itens.map((x,i)=>{const e=m.querySelector('[data-pv="'+i+'"]');return e?e.value:L.locLinha(x);}).join('\n');m.classList.remove('on');loc();$('#locTxt').value=lin;$('#locTxt').focus();toast('Corrija e toque em Colocar na lista');};}
async function locFoto(fl){toast('Lendo a imagem...');try{const url=await new Promise((ok,er)=>{const r=new FileReader();r.onload=()=>ok(r.result);r.onerror=er;r.readAsDataURL(fl);});
  let txt='';if(window.AndroidOcr&&window.AndroidOcr.lerLinhas){const js=await new Promise((ok,er)=>{const id='o'+(++ocrSeq);ocrCbs[id]={ok,er};window.AndroidOcr.lerLinhas(url,id);});txt=L.ocrLinhas(JSON.parse(js||'[]'));}
  else if(window.AndroidOcr){txt=await ocrTexto(url);}
  else{if(!window.Tesseract)await loadScript('ocr/tesseract.min.js');if(!tessW)tessW=await Tesseract.createWorker('eng',1,{workerPath:'ocr/worker.min.js',corePath:'ocr/',langPath:'ocr/',workerBlobURL:false,gzip:true});
    const r=await tessW.recognize(url);const ls=(r.data.lines||[]).flatMap(l=>(l.words||[]).map(w=>({t:w.text,x:w.bbox.x0,y:w.bbox.y0,h:w.bbox.y1-w.bbox.y0})));txt=ls.length?L.ocrLinhas(ls):(r.data.text||'');}
  if(!txt.trim())return toast('Não achei texto na imagem. Tente um print mais nítido.');locPrev(txt);}catch(e){toast('Não consegui ler a imagem. Tente de novo.');}}
function locCamera(){const l=locGet();if(!l.length)return toast('Coloque os códigos na lista primeiro');
  if(window.AndroidScan&&window.AndroidScan.abrirLocalizar){try{window.AndroidScan.abrirLocalizar(JSON.stringify(l));return;}catch(e){}}
  abrirScanner(null,{titulo:'Localizar e contar',noBip:()=>localStorage.getItem('locBip')==='0',cool:2500,match:t=>L.locCasa(t,locGet()),
    onItem:(cod,raw)=>{const n=locSoma(cod,1);locUlt(cod,raw);const x=locGet().find(i=>i.cod===cod);if(x&&x.alvo&&n===x.alvo){bip();setTimeout(bip,200);toast('✅ '+cod+' COMPLETO');}return x&&x.alvo?n+' de '+x.alvo:n;},zerar:window.locZerar,onFim:()=>{if(tab==='loc')loc();}});}
window.voltar=()=>{if(SC)return fecharScanner();if($('#modal').classList.contains('on'))return $('#modal').classList.remove('on');if(tab==='hist'&&detalhe){detalhe=null;return render();}if(tab!=='nova'){tab='nova';render();}};
function rel(){mesLista();const rm=doMes(),x=L.relatorio(rm),tb=(o,t)=>`<h3>${t}</h3><div class="tw"><table><tr><th>${t==='Por dia'?'Dia':'Transportadora / Fornecedor'}</th><th>Registros</th><th>Coleta</th><th>Saída</th><th>Receb.</th><th>Volumes</th><th>Paletes</th><th>Vol.</th></tr>`+
  Object.entries(o).map(([k,v])=>`<tr><td>${esc(k)}</td><td>${v.reg}</td><td>${v.coleta}</td><td>${v.saida}</td><td>${v.receb||0}</td><td>${v.vol}</td><td>${v.palete||0}</td><td>${v.volume||0}</td></tr>`).join('')+'</table></div>';
  $('#main').innerHTML=mesSelHTML()+`<p><b>Total de ${mesNome(mesAt)}:</b> ${rm.length} registros · ${rm.reduce((s,r)=>s+r.volumes,0)} volumes</p>${tb(x.dia,'Por dia')}${tb(x.cli,'Por transportadora / fornecedor')}
  <button class="big" id="csv">📄 Exportar CSV de ${mesNome(mesAt)}</button><button class="big ok" id="expMes">💻 Exportar ${mesNome(mesAt)} para o notebook (com fotos)</button>`;
  $('#mesAt').onchange=e=>{mesAt=e.target.value;rel();};
  $('#csv').onclick=()=>{if(!rm.length)return toast('Sem registros neste mês');const c=L.csv(rm),n='qlog_'+mesAt.replace('/','-')+'.csv';shareArquivo(c,n,'text/csv');};}
function sobre(){$('#main').innerHTML=`<div class="card" style="text-align:center"><img src="logo.png" alt="Qlog" style="width:180px;max-width:60%"><h2 style="color:#354350;margin-top:4px">Qlog Expedição</h2><p><b>Versão:</b> 4.1.0</p><p><b>Criador:</b> Rodolfo Pereira</p><p><b>Empresa:</b> Qlog</p><p><b>Data:</b> 29/10/2026</p><p style="color:#678;font-size:15px">Registro de coleta, saída e recebimento com fotos. Os dados ficam só neste celular.</p><p style="color:#678;font-size:14px">© 2026 Rodolfo Pereira</p></div>${isIOSSafari()?'<div class="card" style="background:#e8f1fb;border:2px solid #0b4f8a"><b>📱 Instalar no iPhone</b><p style="font-size:19px">Toque em Compartilhar ⬆️ e depois em \'Adicionar à Tela de Início\'</p></div>':''}${window.Nuvem&&Nuvem.ativo()?`<div class="card"><b id="nvStatus">☁️ Nuvem</b>${Nuvem.on?'':'<button class="big" id="nvEntrar">☁️ Entrar na equipe</button>'}${Nuvem.admin?'<button class="big alt" id="arqAbrir">📦 Arquivo</button><button class="big alt" id="nvAdm"><img src="icone.png" alt="QLog" style="height:1.2em;width:1.2em;vertical-align:-0.25em;margin-right:6px;border-radius:4px">Administrar equipe</button>':''}</div>`:''}${window.Nuvem&&Nuvem.ativo()?'':'<div class="card"><button class="big alt" id="arqAbrir">📦 Arquivo</button></div>'}<div class="card"><b>🚚 Transportadoras salvas</b>${clientes().length?clientes().map(c=>`<div class="row" style="align-items:center"><span style="flex:1;font-size:19px">${esc(c)}</span><button class="big" data-edcli="${esc(c)}" style="flex:0 0 70px;margin:4px 6px 4px 0">✏️</button><button class="big red" data-rmcli="${esc(c)}" style="flex:0 0 70px;margin:4px 0">🗑</button></div>`).join('')+'<button class="big red" id="resetCli">🗑 Apagar todas</button>':'<p>Nenhuma salva.</p>'}</div><div class="card"><b>📥 Fornecedores / clientes salvos</b>${fornecedores().length?fornecedores().map(c=>`<div class="row" style="align-items:center"><span style="flex:1;font-size:19px">${esc(c)}</span><button class="big" data-edforn="${esc(c)}" style="flex:0 0 70px;margin:4px 6px 4px 0">✏️</button><button class="big red" data-rmforn="${esc(c)}" style="flex:0 0 70px;margin:4px 0">🗑</button></div>`).join(''):'<p>Nenhum salvo.</p>'}</div>`;}
let fotoAlvo='fotos';
document.addEventListener('click',e=>{const t=e.target.closest('button,[data-open],[data-del]');if(!t)return;const d=t.dataset;
  if(d.t){tab=d.t;detalhe=null;hist.sel=null;render();}else if(d.tipo){f.tipo=d.tipo;nova();}else if(d.cli!==undefined){f.cliente=d.cli;nova();}else if(d.forn!==undefined){f.forn=d.forn;nova();}
  else if(t.id==='addForn'){const m=$('#modal');m.innerHTML='<div><label>Nome do fornecedor / cliente</label><input id="nc"><button class="big ok" id="ncOk">Adicionar</button><button class="big alt" id="ncX">Cancelar</button></div>';m.classList.add('on');$('#nc').focus();
    $('#ncX').onclick=()=>m.classList.remove('on');$('#ncOk').onclick=()=>{const n=$('#nc').value.trim();if(n){const c=fornecedores();if(!c.includes(n))c.push(n);setFornecedores(c);f.forn=n;}m.classList.remove('on');nova();};}
  else if(t.id==='recScan')lerContinuoForm();else if(t.id==='addCod')addCodManual();
  else if(d.iq){const x=f.itens[+d.ii];if(x){f.itens=L.addItem(f.itens,x.cod,+d.iq);$('#itens').innerHTML=itensHTML();}}
  else if(d.idel!==undefined){const x=f.itens[+d.idel];if(x)confirmar('Tirar o código '+x.cod+' da lista?',()=>{f.itens=f.itens.filter(i=>i!==x);$('#itens').innerHTML=itensHTML();},'Sim, tirar');}
  else if(t.id==='addCli'){const m=$('#modal');m.innerHTML='<div><label>Nome da transportadora</label><input id="nc"><button class="big ok" id="ncOk">Adicionar</button><button class="big alt" id="ncX">Cancelar</button></div>';m.classList.add('on');$('#nc').focus();
    $('#ncX').onclick=()=>m.classList.remove('on');$('#ncOk').onclick=()=>{const n=$('#nc').value.trim();if(n){const c=clientes();if(!c.includes(n))c.push(n);setClientes(c);f.cliente=n;}m.classList.remove('on');nova();};}
  else if(d.foto){fotoAlvo=d.foto;$('#cam').value='';$('#cam').onchange=async ev=>{for(const fl of ev.target.files){const u=await compress(fl);if(u)f[fotoAlvo].push(u);}nova();};$('#cam').click();}
  else if(d.del){f[d.del].splice(+d.i,1);nova();}else if(d.open){if(hist.sel){hist.sel.has(d.open)?hist.sel.delete(d.open):hist.sel.add(d.open);lista();$('#selN').textContent=hist.sel.size;document.querySelectorAll('.selN2').forEach(x=>x.textContent=hist.sel.size);}else{detalhe=d.open;render();}}
  else if(t.id==='confOk')conferirCod($('#confLido').value);else if(d.ocr)abrirScanner(d.ocr);
  else if(t.id==='confScan'){$('#cam').value='';$('#cam').removeAttribute('multiple');$('#cam').onchange=ev=>{$('#cam').setAttribute('multiple','');ev.target.files[0]&&scan(ev.target.files[0]);};$('#cam').click();}
  else if(t.id==='reset')confirmar('Limpar tudo que foi preenchido nesta tela?',()=>{const tp=f.tipo;f=novo();f.tipo=tp;nova();toast('🔄 Tela limpa');},'Sim, limpar');
  else if(t.id==='lerRom')lerRomaneio();
  else if(d.confrm!==undefined){f.confLidos.splice(+d.confrm,1);nova();}
  else if(t.id==='confLimpar')confirmar('Limpar a lista de produtos conferidos?',()=>{f.confLidos=[];nova();},'Sim, limpar');
  else if(t.id==='nvEntrar'){Nuvem.pedirEntrada();}
  else if(t.id==='nvAdm'){Nuvem.painel();}
  else if(t.id==='arqAbrir'){tab='arquivo';render();}
  else if(t.id==='arqFazer'){fazerArquivo(t.dataset.mes);}
  else if((t.id==='resetCli'||d.rmforn!==undefined||d.rmcli!==undefined)&&window.Nuvem&&!Nuvem.pode())toast('Só o administrador pode apagar nomes');
  else if(t.id==='resetCli')confirmar('Apagar a lista de transportadoras salvas? Os registros continuam.',()=>{setClientes([]);toast('Lista apagada');sobre();},'Sim, apagar lista');
  else if((d.edcli!==undefined||d.edforn!==undefined)&&window.Nuvem&&!Nuvem.pode())toast('Só o administrador pode mudar nomes');
  else if(d.edforn!==undefined)renomearModal(d.edforn,true);else if(d.edcli!==undefined)renomearModal(d.edcli,false);
  else if(d.rmforn!==undefined){const n=d.rmforn;confirmar('Apagar "'+n+'" da lista de fornecedores? Os registros continuam.',()=>{setFornecedores(fornecedores().filter(c=>c!==n));if(f.forn===n)f.forn='';toast('Apagado');sobre();},'Sim, apagar');}
  else if(d.rmcli!==undefined){const n=d.rmcli;confirmar('Apagar a transportadora "'+n+'" da lista? Os registros continuam.',()=>{setClientes(clientes().filter(c=>c!==n));if(f.cliente===n)f.cliente='';toast('Apagada');sobre();},'Sim, apagar');}
  else if(t.id==='selOn'){hist.sel=new Set();hist();}
  else if(t.id==='selEnv'){const sr=regs.filter(r=>hist.sel.has(r.id));if(!sr.length)return toast('Nenhum selecionado');const m=$('#modal');
    m.innerHTML=`<div><p style="font-size:20px"><b>Enviar ${sr.length} registro(s)</b></p><button class="big ok" id="eHtml">💻 Arquivo pro notebook (com fotos)</button><button class="big" id="eCsv">📄 Planilha CSV</button><button class="big alt" id="eX">Cancelar</button></div>`;m.classList.add('on');
    const nm='qlog_'+mesAt.replace('/','-')+'_'+sr.length+'sel';$('#eX').onclick=()=>m.classList.remove('on');
    $('#eCsv').onclick=()=>{m.classList.remove('on');shareArquivo(L.csv(sr),nm+'.csv','text/csv');};
    $('#eHtml').onclick=()=>{m.classList.remove('on');toast('Gerando arquivo...');shareArquivo(L.htmlMes(sr,mesAt),nm+'.html','text/html');};}else if(t.id==='selX'){hist.sel=null;hist();}
  else if(t.id==='selAll'){L.filtrar(doMes(),hist.q).forEach(r=>hist.sel.add(r.id));hist();}
  else if(t.id==='selDel'){if(window.Nuvem&&!Nuvem.pode())return toast('Só o administrador pode apagar');const ids=[...hist.sel];if(!ids.length)return toast('Nenhum selecionado');confirmar('Apagar '+ids.length+' registro(s)? Não tem como desfazer.',async()=>{await tx('readwrite',s=>ids.forEach(i=>s.delete(i)));if(window.Nuvem)ids.forEach(i=>Nuvem.apagar(i));await load();hist.sel=null;toast(ids.length+' apagado(s)');render();});}
  else if(t.id==='expMes'){const m=mesAt;if(!doMes().length)return toast('Sem registros neste mês');const h=L.htmlMes(regs,m),n='qlog_'+m.replace('/','-')+'.html';toast('Gerando arquivo...');
    shareArquivo(h,n,'text/html');}
  else if(t.id==='salvar')salvar(false);else if(t.id==='salvarEnv')salvar(true);});
openDB().then(x=>{db=x;return load();}).then(()=>{render();window.Nuvem&&Nuvem.iniciar();}).catch(e=>{$('#main').textContent='Erro no banco: '+e;});

function isIOSSafari(){const u=navigator.userAgent,ios=/iPad|iPhone|iPod/.test(u)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  const st=navigator.standalone===true||(window.matchMedia&&matchMedia('(display-mode: standalone)').matches);return ios&&/Safari/.test(u)&&!/CriOS|FxiOS|EdgiOS/.test(u)&&!st;}
if(navigator.storage&&navigator.storage.persist)navigator.storage.persist().catch(()=>{});
if('serviceWorker' in navigator&&!window.AndroidShare&&location.protocol.startsWith('http'))addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));


(function(){const m=document.getElementById('modal');if(!m)return;const fix=()=>{const k=m.children;if(k.length===1&&k[0].tagName==='DIV')return;const d=document.createElement('div');while(m.firstChild)d.appendChild(m.firstChild);m.appendChild(d);};new MutationObserver(fix).observe(m,{childList:true});})();
function nomeAutor(r){return window.Nuvem&&Nuvem.nomeAutor?Nuvem.nomeAutor(r):'';}
function renomearModal(velho,receb){const m=$('#modal');
  m.innerHTML=`<div><p style="font-size:20px;margin-top:0"><b>✏️ Mudar nome</b></p><label for="rnNome">Novo nome</label><input id="rnNome" value="${esc(velho)}" autocomplete="off"><p><small>Os registros com o nome antigo também mudam.</small></p><div class="row"><button class="big ok" id="rnOk">💾 Salvar</button><button class="big alt" id="rnX">Cancelar</button></div></div>`;
  m.classList.add('on');const rn=$('#rnNome');rn.focus();rn.select();rn.onkeydown=e=>{if(e.key==='Enter')$('#rnOk').click();};$('#rnX').onclick=()=>m.classList.remove('on');
  $('#rnOk').onclick=async()=>{const lista=receb?fornecedores():clientes(),res=L.renomearNome(lista,velho,$('#rnNome').value);
    if(res.erro)return toast(res.erro);if(res.nome===velho){m.classList.remove('on');return;}
    receb?setFornecedores(res.lista):setClientes(res.lista);
    if(receb&&f.forn===velho)f.forn=res.nome;if(!receb&&f.cliente===velho)f.cliente=res.nome;
    const mud=L.regsRenomear(regs,velho,res.nome,receb);
    if(mud.length)await tx('readwrite',s=>mud.forEach(r=>s.put(r)));if(window.Nuvem)mud.forEach(r=>Nuvem.salvar(r));
    await load();m.classList.remove('on');toast('Nome mudado'+(mud.length?' em '+mud.length+' registro(s)':''));sobre();};}

function autoCls(k){return (f.auto||[]).includes(k)?' style="background:#fff3a0"':'';}
function autoDica(k){return (f.auto||[]).includes(k)?'<small style="color:#a07000">⚠️ preenchido pelo romaneio, confira</small>':'';}
function confListaHTML(l,ed){l=l||[];if(!l.length)return '';
  return `<div class="card" style="padding:10px"><b>📦 Produtos conferidos</b><p style="margin:4px 0"><b>${L.confResumo(l)}</b></p>${l.map((x,i)=>`<div class="row" style="align-items:center;border-radius:8px;margin:4px 0;padding:6px;background:${x.ok?'#dff5e3':'#fde0e0'};color:${x.ok?'#14632b':'#9b1c1c'}"><span style="flex:1">${x.ok?'✅':'❌'} <b>${esc(x.cod)}</b><br><small>${x.ts?L.fmtHora(x.ts):''}${(x.n||1)>1?' · '+x.n+' vezes':''}</small></span>${ed?`<button class="red" data-confrm="${i}" style="flex:0 0 56px;margin:0">🗑</button>`:''}</div>`).join('')}${ed?'<button class="big alt" id="confLimpar">🔄 Limpar lista</button>':''}</div>`;}
function lerRomaneio(){const m=$('#modal');m.innerHTML='<p style="font-size:20px;margin-top:0"><b>📷 Ler romaneio</b></p><p>O app lê as NFs, os volumes e a placa e preenche só o que estiver vazio.</p><button class="big ok" id="rmCam">📷 Tirar foto</button><button class="big alt" id="rmGal">🖼 Escolher da galeria</button><button class="big alt" id="rmX">Cancelar</button>';m.classList.add('on');
  const pega=cam=>{const i=document.createElement('input');i.type='file';i.accept='image/*';if(cam)i.setAttribute('capture','environment');i.onchange=()=>{m.classList.remove('on');i.files[0]&&lerRomFoto(i.files[0]);};i.click();};
  $('#rmCam').onclick=()=>pega(1);$('#rmGal').onclick=()=>pega(0);$('#rmX').onclick=()=>m.classList.remove('on');}
async function lerRomFoto(file){toast('Lendo o romaneio...');try{const d=await compress(file);if(!d)throw 0;let txt;
  if(window.AndroidOcr&&window.AndroidOcr.lerLinhas){const js=await new Promise((ok,er)=>{const id='o'+(++ocrSeq);ocrCbs[id]={ok,er};window.AndroidOcr.lerLinhas(d,id);});txt=L.ocrLinhas(JSON.parse(js||'[]'));}else txt=await ocrTexto(d);
  const r=L.preencherVazios(f,L.lerRomaneio(txt),clientes());f.auto=[...new Set((f.auto||[]).concat(r.auto))];nova();
  const m=$('#modal');m.innerHTML=`<p style="font-size:20px;margin-top:0"><b>🧾 Romaneio lido</b></p>${r.pre.length?'<p>✅ Preenchi: <b>'+esc(r.pre.join(', '))+'</b><br><small>Confira os campos em amarelo.</small></p>':'<p>Não preenchi nada novo (os campos já tinham valor ou não achei).</p>'}${r.falta.length?'<p>❓ Não achei: '+esc(r.falta.join(', '))+'</p>':''}${r.nova?'<button class="big alt" id="rmAdd">➕ Adicionar "'+esc(r.nova)+'" às transportadoras</button>':''}<button class="big ok" id="rmOk">Ok</button>`;m.classList.add('on');$('#rmOk').onclick=()=>m.classList.remove('on');
  if(r.nova)$('#rmAdd').onclick=()=>{const l=clientes();if(!l.some(c=>L.semAcento(c)===L.semAcento(r.nova)))setClientes(l.concat(r.nova));if(!f.cliente.trim()){f.cliente=r.nova;f.auto=(f.auto||[]).concat('cliente');}m.classList.remove('on');toast('Transportadora adicionada');nova();};
  }catch(e){toast('Não consegui ler a foto. Tente com mais luz e mais perto.');}}

// ===== v4.1: foto leve para a nuvem (~150 KB) =====
function fotoLeve(d){return new Promise(ok=>{if(L.tamDataUrl(d)<=L.FOTO_ALVO)return ok(d);const i=new Image();
  i.onload=()=>{let r=d;for(const [m,q] of L.leveTentativas()){const k=Math.min(1,m/Math.max(i.width,i.height)),c=document.createElement('canvas');
      c.width=Math.round(i.width*k);c.height=Math.round(i.height*k);c.getContext('2d').drawImage(i,0,0,c.width,c.height);r=c.toDataURL('image/jpeg',q);if(L.tamDataUrl(r)<=L.FOTO_ALVO)break;}ok(r);};
  i.onerror=()=>ok(d);i.src=d;});}
window.fotoLeve=fotoLeve;
// ===== v4.1: arquivo mensal =====
const podeArquivar=()=>!(window.Nuvem&&Nuvem.ativo())||Nuvem.admin;
const arqFeitos=()=>window.Nuvem&&Nuvem.on?Nuvem.feitos:JSON.parse(localStorage.getItem('arqLocal')||'[]').map(x=>x.mes);
const arqLista=()=>window.Nuvem&&Nuvem.on?Nuvem.arquivos:JSON.parse(localStorage.getItem('arqLocal')||'[]');
function arquivoTela(){const pend=podeArquivar()?L.mesArquivar(regs,Date.now(),arqFeitos()):'',l=arqLista();
  $('#main').innerHTML=`<div class="card"><b style="font-size:22px">📦 Arquivo</b>
  <p style="font-size:18px">Todo mês, os registros do mês que passou viram um arquivo <b>Qlog_ANO-MÊS.zip</b> com uma planilha e as fotos. Depois disso, registros com mais de 30 dias saem da nuvem (continuam neste celular).</p>
  ${pend?`<button class="big ok" id="arqFazer" data-mes="${pend}">📦 Arquivar ${esc(L.nomeMes(pend))} agora</button>`:'<p>✅ Nada para arquivar agora.</p>'}</div>
  <div class="card"><b>Meses arquivados</b>${l.length?l.map(x=>`<div style="font-size:19px;padding:6px 0;border-bottom:1px solid #ddd">📦 <b>${esc(L.nomeMes(x.mes))}</b> — ${x.regs||0} registros, ${x.fotos||0} fotos<br><small>${esc(x.nome||'Qlog_'+x.mes+'.zip')} · feito em ${L.fmtData(x.criado||0)}${x.onde?' · '+esc(x.onde):''}</small>${window.AndroidArq&&AndroidArq.existe(x.nome||'')?`<button class="big alt" data-arqenv="${esc(x.nome)}" style="margin-top:6px">📤 Enviar de novo</button>`:''}</div>`).join(''):'<p>Nenhum mês arquivado ainda.</p>'}</div>
  <div class="card" style="background:#e8f1fb"><b>Como abrir um mês arquivado</b><ol style="font-size:18px;padding-left:22px">
  <li>Abra o <b>Google Drive</b> e entre na pasta <b>Qlog Arquivo</b> (ou na pasta <b>Download › Qlog Arquivo</b> do celular).</li>
  <li>Toque no arquivo <b>Qlog_ANO-MÊS.zip</b> e escolha <b>Extrair</b> (no computador: botão direito › Extrair tudo).</li>
  <li>Abra <b>registros.csv</b> no Excel ou no Planilhas Google: uma linha por registro.</li>
  <li>As fotos ficam na pasta <b>fotos</b>, uma pasta para cada registro (ex.: EXP-0014_03-09-2026).</li></ol></div>
  <button class="big alt" id="arqVoltar">⬅️ Voltar</button>`;
  $('#arqVoltar').onclick=()=>{tab='sobre';render();};
  document.querySelectorAll('[data-arqenv]').forEach(b=>b.onclick=()=>AndroidArq.compartilhar(b.dataset.arqenv));}
function b64de(u){let s='';for(let i=0;i<u.length;i+=0x8000)s+=String.fromCharCode.apply(null,u.subarray(i,i+0x8000));return btoa(s);}
async function fazerArquivo(mes){if(!podeArquivar())return toast('Só o administrador pode arquivar');const m=$('#modal');
  const msg=t=>{m.innerHTML=`<div><p style="font-size:20px">⏳ ${t}</p></div>`;m.classList.add('on');};
  try{msg('Juntando as fotos de '+L.nomeMes(mes)+'...');
    if(window.Nuvem&&Nuvem.on)for(const r of regs.filter(r=>L.mesId(r.ts)===mes)){if(!L.precisaFotos(r,r))continue;
      try{const fn=await Nuvem.fotosDe(r.id);const x=L.regMescla(r,r,fn);await tx('readwrite',s=>s.put(x));}catch(e){}}
    await load();const A=L.arquivoItens(regs,mes),nome='Qlog_'+mes+'.zip',z=L.Zip();if(!A.regs){m.classList.remove('on');return toast('Nenhum registro em '+L.nomeMes(mes));}
    msg('Montando o arquivo '+nome+'...');let onde='',blob=null;
    if(window.AndroidArq){AndroidArq.inicio(nome);for(const it of A.itens)AndroidArq.parte(b64de(z.add(it.nome,L.itemBytes(it))));AndroidArq.parte(b64de(z.fim()));
      onde=AndroidArq.fim()||'';if(!onde)throw new Error('não consegui gravar o arquivo');}
    else{const parts=A.itens.map(it=>z.add(it.nome,L.itemBytes(it)));parts.push(z.fim());blob=new Blob(parts,{type:'application/zip'});}
    arquivoPronto(mes,nome,A,onde,blob);}catch(e){m.classList.remove('on');toast('Erro ao arquivar: '+(e.message||e));}}
function arquivoPronto(mes,nome,A,onde,blob){const m=$('#modal');let ok=!!onde&&onde!=='cache';
  const nuvem=window.Nuvem&&Nuvem.on;
  m.innerHTML=`<div style="max-height:85vh;overflow:auto"><b style="font-size:22px">📦 ${esc(nome)}</b>
   <p style="font-size:18px">${A.regs} registros e ${A.fotos} fotos de ${esc(L.nomeMes(mes))}.</p>
   ${onde&&onde!=='cache'?`<p style="font-size:18px">✅ Salvo neste celular em <b>${esc(onde)}</b>.</p>`:''}
   <p style="font-size:18px">Agora guarde no Google Drive: toque em <b>Enviar para o Drive</b>, escolha <b>Drive</b> e a pasta <b>Qlog Arquivo</b> (crie a pasta na primeira vez).</p>
   <button class="big" id="arqEnv">📤 Enviar para o Drive</button>${blob?'<button class="big alt" id="arqBaixar">⬇️ Baixar o arquivo</button>':''}
   <button class="big ok" id="arqOk" ${ok?'':'disabled style="opacity:.5"'}>✅ Pronto, já salvei</button><button class="big alt" id="arqDepois">Depois</button>
   <p><small>${nuvem?'Quando tocar em “Pronto”, os registros com mais de 30 dias deste mês saem da nuvem. Eles continuam nos celulares.':'O arquivo fica marcado como feito.'}</small></p></div>`;m.classList.add('on');
  const liberar=()=>{ok=true;const b=$('#arqOk');b.disabled=false;b.style.opacity=1;};
  $('#arqEnv').onclick=async()=>{if(window.AndroidArq){AndroidArq.compartilhar(nome);liberar();return;}
    const f=new File([blob],nome,{type:'application/zip'});
    if(navigator.canShare&&navigator.canShare({files:[f]})){try{await navigator.share({files:[f],title:nome});liberar();}catch(e){}}else{baixar();toast('Arquivo baixado. Envie para o Drive pelo app Arquivos.');}};
  const baixar=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=nome;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},60000);liberar();};
  if(blob)$('#arqBaixar').onclick=baixar;
  $('#arqDepois').onclick=()=>m.classList.remove('on');
  $('#arqOk').onclick=async()=>{if(!ok)return;const info={mes,nome,regs:A.regs,fotos:A.fotos,onde:onde&&onde!=='cache'?onde:'compartilhado'};
    try{if(nuvem){await Nuvem.marcarArquivo(info);Nuvem.feitos=[...new Set(Nuvem.feitos.concat(mes))];const n=await Nuvem.limpar();toast('✅ Arquivado. '+n+' registros saíram da nuvem.');}
      else{const l=JSON.parse(localStorage.getItem('arqLocal')||'[]').filter(x=>x.mes!==mes);l.unshift(Object.assign({criado:Date.now()},info));localStorage.setItem('arqLocal',JSON.stringify(l));toast('✅ Arquivado');}
      m.classList.remove('on');tab='arquivo';render();}catch(e){toast('Precisa de internet para terminar. Tente de novo.');}};}
// administrador abriu o app: pergunta se quer arquivar o mês que passou e limpa o que já foi arquivado
window.arquivoAoAbrir=async()=>{if(!(window.Nuvem&&Nuvem.admin))return;try{const n=await Nuvem.limpar();if(n)toast('☁️ '+n+' registros antigos saíram da nuvem (continuam no celular)');}catch(e){}
  const mes=L.mesArquivar(regs,Date.now(),Nuvem.feitos),hoje=L.fmtData(Date.now());if(!mes||localStorage.getItem('arqPerguntou')===mes+hoje||$('#modal').classList.contains('on'))return;
  localStorage.setItem('arqPerguntou',mes+hoje);
  confirmar('📦 '+L.nomeMes(mes)+' terminou. Quer arquivar agora? Vou montar o arquivo com a planilha e as fotos para você guardar no Google Drive.',()=>fazerArquivo(mes),'Sim, arquivar');};
