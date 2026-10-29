// v4.0 — Nuvem compartilhada (Firebase Firestore + Auth anônimo). Só liga se firebase-config.js estiver preenchido.
// Papéis: administrador (celular do Rodo) pode tudo; membros só criam e veem. Senha da equipe é conferida no servidor (regras), nunca guardada em texto.
(function(){
const N={on:false,uid:null,admin:false,membro:false,nome:localStorage.getItem('nvNome')||'',erro:'',fs:null,unsub:[]};
window.Nuvem=N;
const cfgOk=()=>!!(window.QLOG_FB&&window.QLOG_FB.projectId&&window.firebase);
N.ativo=()=>cfgOk();
N.pode=()=>!cfgOk()||N.admin; // editar/apagar
const docE=()=>N.fs.doc('config/equipe'),docS=()=>N.fs.doc('config/segredo'),docM=u=>N.fs.doc('membros/'+(u||N.uid));
async function iniciar(){if(!cfgOk())return;
  try{firebase.initializeApp(window.QLOG_FB);N.fs=firebase.firestore();
    try{N.fs.settings({experimentalAutoDetectLongPolling:true,merge:true});}catch(e){}
    try{await N.fs.enablePersistence({synchronizeTabs:false});}catch(e){}
    firebase.auth().onAuthStateChanged(async u=>{if(!u){try{await firebase.auth().signInAnonymously();}catch(e){N.erro='sem internet';N.status();}return;}
      N.uid=u.uid;await papel();});
  }catch(e){N.erro=String(e.message||e);}}
async function papel(){N.admin=false;N.membro=false;
  try{const e=await docE().get();N.existe=e.exists;if(e.exists&&e.data().admin===N.uid)N.admin=true;}catch(e){N.existe=null;}
  try{const m=await docM().get();N.membro=m.exists&&!m.data().bloq;if(m.exists&&m.data().nome)N.nome=m.data().nome;}catch(e){N.membro=false;}
  if(N.admin||N.membro){N.on=true;await ouvir();if(N.admin&&!localStorage.getItem('nvMigrou'))migrar();}
  else{N.on=false;N.pedirEntrada();}
  N.status();}
N.status=()=>{const e=document.getElementById('nvStatus');if(e)e.textContent=N.on?('☁️ Nuvem ligada'+(N.admin?' (administrador)':'')+' — '+N.nome):('☁️ Nuvem desligada'+(N.erro?' ('+N.erro+')':''));};
// primeira abertura: nome + senha
N.pedirEntrada=()=>{const m=document.getElementById('modal');if(!m||m.classList.contains('on')&&m.dataset.nv)return;m.dataset.nv='1';
  const cria=N.existe===false;
  m.innerHTML=`<div><b style="font-size:22px;display:block;margin-bottom:10px">Identifique-se para acesso</b>
   <label>Seu nome</label><input id="nvN" value="${(N.nome||'').replace(/"/g,'&quot;')}" style="width:100%;font-size:20px">
   <label>Senha de acesso</label><input id="nvS" type="password" autocomplete="off" style="width:100%;font-size:20px">
   <p id="nvE" style="color:#c62828"></p>
   <button class="big ok" id="nvOk"><img src="icone.png" alt="QLog" style="height:1.2em;width:1.2em;vertical-align:-0.25em;margin-right:6px;border-radius:4px">Entrar / Registrar</button><button class="big alt" id="nvX">Agora não</button></div>`;
  m.classList.add('on');
  document.getElementById('nvX').onclick=()=>{m.classList.remove('on');delete m.dataset.nv;};
  document.getElementById('nvOk').onclick=async()=>{const nome=document.getElementById('nvN').value.trim(),s=document.getElementById('nvS').value;const er=document.getElementById('nvE');
    if(!nome)return er.textContent='Digite seu nome';if(!s)return er.textContent='Digite a senha';
    const h=L.senhaHash(s);er.textContent='Conferindo...';
    try{if(cria){const b=N.fs.batch();b.set(docE(),{admin:N.uid,adminNome:nome,criado:Date.now()});b.set(docS(),{hash:h});b.set(docM(),{nome,hash:h,bloq:false,ts:Date.now()});await b.commit();}
      else await docM().set({nome,hash:h,bloq:false,ts:Date.now()});
      N.nome=nome;localStorage.setItem('nvNome',nome);m.classList.remove('on');delete m.dataset.nv;await papel();toast('✅ Conectado à equipe');
    }catch(e){er.textContent=/permission/i.test(String(e.code||e.message))?'Senha errada ou celular bloqueado':'Sem internet. Tente de novo.';}};};
// ouvir mudanças da nuvem -> grava no celular
// v4.1: meses já arquivados (registros desses meses ficam nos celulares mesmo quando saem da nuvem)
N.feitos=JSON.parse(localStorage.getItem('arqFeitos')||'[]');N.arquivos=JSON.parse(localStorage.getItem('arqLista')||'[]');
function ouvirArquivo(){return new Promise(ok=>{let p=false;const fim=()=>{if(!p){p=true;ok();}};setTimeout(fim,8000);
  N.unsub.push(N.fs.collection('arquivo').onSnapshot(q=>{const l=[];q.forEach(d=>l.push(Object.assign({mes:d.id},d.data())));l.sort((a,b)=>a.mes<b.mes?1:-1);
    N.arquivos=l;N.feitos=l.map(x=>x.mes);localStorage.setItem('arqFeitos',JSON.stringify(N.feitos));localStorage.setItem('arqLista',JSON.stringify(l));if(tab==='arquivo')render();fim();},()=>fim()));});}
async function ouvir(){N.unsub.forEach(f=>f());N.unsub=[];limparAutores();
  if(N.admin)N.unsub.push(N.fs.collection('membros').onSnapshot(q=>{const o={};q.forEach(d=>{o[d.id]=d.data().nome||'';});N.nomes=o;if(tab==='hist')render();},()=>{}));
  await ouvirArquivo();
  N.unsub.push(N.fs.collection('registros').onSnapshot(async q=>{try{const baixar=[];for(const ch of q.docChanges()){const d=ch.doc.data();d.id=ch.doc.id;
      let loc=null;try{loc=await tx('readonly',s=>s.get(d.id));}catch(e){}if(!loc)loc=regs.find(r=>r.id===d.id);
      if(ch.type==='removed'){if(!L.manterAoRemover(loc,N.feitos))await tx('readwrite',s=>s.delete(d.id));continue;}
      if(N.admin&&('autor' in d)){try{await ch.doc.ref.update({autor:firebase.firestore.FieldValue.delete()});}catch(e){}}
      await tx('readwrite',s=>s.put(N.admin?L.regMescla(loc,d):L.semAutor(L.regMescla(loc,d))));
      if(L.precisaFotos(loc,d))baixar.push(d);}
    await load();if(tab==='hist'||tab==='rel')render();if(baixar.length)baixarFotos(baixar);}catch(e){}},e=>{if(/permission/i.test(e.code||''))papel();}));
  setTimeout(()=>{reenviarFotos();if(N.admin&&window.arquivoAoAbrir)window.arquivoAoAbrir();},4000);
  ['clientes','fornecedores'].forEach(k=>N.unsub.push(N.fs.doc('listas/'+k).onSnapshot(d=>{if(!d.exists)return;const l=d.data().nomes||[];
    const loc=JSON.parse(localStorage.getItem(k)||'[]');const tudo=N.admin?l:[...new Set(l.concat(loc))];localStorage.setItem(k,JSON.stringify(tudo));},()=>{})));}
// app -> nuvem
// nome de quem fez: só o administrador vê (vem de membros/{uid}, que só ele lê)
N.nomes={};N.nomeAutor=r=>N.on&&N.admin&&r?(N.nomes[r.autorUid]||r.autor||''):'';
async function limparAutores(){if(N.admin)return;try{const v=regs.filter(r=>'autor' in r);if(v.length){await tx('readwrite',s=>v.forEach(r=>s.put(L.semAutor(r))));await load();}}catch(e){}}
N.salvar=async r=>{if(!N.on)return;try{await N.fs.doc('registros/'+r.id).set(L.regNuvem(r,N.nome,N.uid));}catch(e){return;}await N.salvarFotos(r);};
// fotos leves (~150 KB) na subcoleção registros/{id}/fotos — a original fica só no celular
const sigK=id=>'fsig_'+id;
N.salvarFotos=async r=>{if(!N.on||!window.fotoLeve)return;try{const n=L.regNuvem(r,N.nome,N.uid),x=Object.assign({},r,n);
    const ant=JSON.parse(localStorage.getItem(sigK(r.id))||'{}'),sy=L.fotosSync(x,ant);const ref=N.fs.doc('registros/'+r.id);
    for(const f of sy.subir){const d=await window.fotoLeve(f.d);await ref.collection('fotos').doc(f.fid).set({campo:f.campo,i:f.i,d,ts:Date.now()});ant[f.fid]=L.fotoSig(f.d);localStorage.setItem(sigK(r.id),JSON.stringify(ant));}
    for(const fid of sy.apagar){await ref.collection('fotos').doc(fid).delete();delete ant[fid];}
    localStorage.setItem(sigK(r.id),JSON.stringify(Object.assign(ant,sy.sigs)));
    if(sy.subir.length||sy.apagar.length)await ref.update({fotosTs:Date.now()});}catch(e){}};
// baixa as fotos leves dos registros feitos em outros celulares
let baixando=false;const filaB=[];
async function baixarFotos(l){filaB.push(...l);if(baixando)return;baixando=true;let n=0;
  while(filaB.length){const d=filaB.shift();try{const fn=await N.fotosDe(d.id);let loc=await tx('readonly',s=>s.get(d.id));if(!loc)continue;
      if(!L.precisaFotos(loc,d))continue;const m=L.regMescla(loc,d,fn);await tx('readwrite',s=>s.put(m));
      const sg={};L.fotoDocs(m).forEach(f=>sg[f.fid]=L.fotoSig(f.d));localStorage.setItem(sigK(d.id),JSON.stringify(sg));
      if(++n%5===0){await load();if(tab==='hist')render();}}catch(e){}}
  baixando=false;await load();if(tab==='hist')render();}
N.fotosDe=async id=>L.fotosDeDocs((await N.fs.collection('registros/'+id+'/fotos').get()).docs.map(x=>x.data()));
// envia fotos de registros deste celular (últimos 30 dias) que ainda não foram para a nuvem
async function reenviarFotos(){const lim=Date.now()-30*86400000;
  for(const r of regs.slice()){if(r.ts<lim||r.fotosDaNuvem||localStorage.getItem(sigK(r.id)))continue;
    if(!(r.autorUid===N.uid||(N.admin&&!r.autorUid)))continue;if(!L.fotoDocs(r).length)continue;await N.salvarFotos(r);}}
N.apagar=async id=>{if(!N.on||!N.admin)return;try{const ref=N.fs.doc('registros/'+id);const fs=await ref.collection('fotos').get();
  const b=N.fs.batch();fs.forEach(x=>b.delete(x.ref));b.delete(ref);await b.commit();localStorage.removeItem(sigK(id));}catch(e){}};
// v4.1: arquivo mensal (só administrador)
N.marcarArquivo=async info=>{await N.fs.doc('arquivo/'+info.mes).set(Object.assign({criado:Date.now()},info));};
// tira da nuvem registros com mais de 30 dias de meses já arquivados (ficam nos celulares)
N.limpar=async()=>{if(!N.on||!N.admin)return 0;const ids=L.paraLimpar(regs.filter(r=>!r.limpo),Date.now(),N.feitos);let n=0;
  for(let i=0;i<ids.length;i+=100){const parte=ids.slice(i,i+100),b=N.fs.batch();
    for(const id of parte){const r=regs.find(x=>x.id===id)||{};for(const k of L.FOTO_CAMPOS){const q=Math.max(Number(r['n_'+k])||0,(r[k]||[]).length);for(let j=0;j<q;j++)b.delete(N.fs.doc('registros/'+id+'/fotos/'+k+'_'+j));}
      b.delete(N.fs.doc('registros/'+id));}
    await tx('readwrite',s=>parte.forEach(id=>{const r=regs.find(x=>x.id===id);if(r){r.limpo=true;s.put(r);}}));
    try{await b.commit();n+=parte.length;parte.forEach(id=>localStorage.removeItem(sigK(id)));}catch(e){await tx('readwrite',s=>parte.forEach(id=>{const r=regs.find(x=>x.id===id);if(r){delete r.limpo;s.put(r);}}));throw e;}}
  await load();return n;};
N.lista=async(k,l)=>{if(!N.on)return;try{const ref=N.fs.doc('listas/'+k);
  if(N.admin)await ref.set({nomes:l});else await ref.set({nomes:firebase.firestore.FieldValue.arrayUnion(...l)},{merge:true});}catch(e){}};
async function migrar(){try{for(const r of regs){if(!r.nuvem)await N.fs.doc('registros/'+r.id).set(L.regNuvem(r,'',r.autorUid||N.uid));}
  for(const k of ['clientes','fornecedores'])await N.fs.doc('listas/'+k).set({nomes:JSON.parse(localStorage.getItem(k)||'[]')});
  localStorage.setItem('nvMigrou','1');toast('☁️ Dados antigos enviados para a nuvem');}catch(e){}}
// administrador
N.trocarSenha=async s=>{const h=L.senhaHash(s);const b=N.fs.batch();b.set(docS(),{hash:h});b.set(docM(),{hash:h},{merge:true});await b.commit();};
N.membros=async()=>(await N.fs.collection('membros').get()).docs.map(d=>Object.assign({uid:d.id},d.data()));
N.bloquear=async(uid,v)=>docM(uid).update({bloq:!!v});
N.painel=async()=>{const m=document.getElementById('modal');let ms=[];try{ms=await N.membros();}catch(e){return toast('Sem internet');}
  m.innerHTML=`<div style="max-height:85vh;overflow:auto"><b style="font-size:22px;display:block;margin-bottom:8px"><img src="icone.png" alt="QLog" style="height:1.2em;width:1.2em;vertical-align:-0.25em;margin-right:6px;border-radius:4px">Administrar equipe</b>
   ${ms.map(x=>`<div class="row" style="align-items:center"><span style="flex:1;font-size:18px">${x.uid===N.uid?'<img src="icone.png" alt="QLog" style="height:1.2em;width:1.2em;vertical-align:-0.25em;margin-right:4px;border-radius:4px">':''}${(x.nome||'?').replace(/</g,'&lt;')}${x.bloq?' 🚫':''}</span>${x.uid===N.uid?'':`<button class="big ${x.bloq?'ok':'red'}" data-nvb="${x.uid}" data-v="${x.bloq?0:1}" style="flex:0 0 130px;margin:4px 0">${x.bloq?'Liberar':'Bloquear'}</button>`}</div>`).join('')}
   <label>Nova senha de acesso</label><input id="nvNs" type="password" autocomplete="off" style="width:100%;font-size:20px">
   <button class="big" id="nvTs">🔑 Trocar senha</button><p><small>Depois de trocar, todos terão que digitar a senha nova.</small></p><button class="big alt" id="nvF">Fechar</button></div>`;m.classList.add('on');
  m.querySelectorAll('[data-nvb]').forEach(b=>b.onclick=async()=>{try{await N.bloquear(b.dataset.nvb,b.dataset.v==='1');N.painel();}catch(e){toast('Não consegui');}});
  document.getElementById('nvTs').onclick=async()=>{const s=document.getElementById('nvNs').value;if(s.trim().length<6)return toast('Senha com pelo menos 6 letras/números');
    try{await N.trocarSenha(s);toast('✅ Senha trocada');m.classList.remove('on');}catch(e){toast('Não consegui trocar. Precisa de internet.');}};
  document.getElementById('nvF').onclick=()=>m.classList.remove('on');};
N.iniciar=iniciar;
})();
