// v4.0 — Nuvem compartilhada (Firebase Firestore + Auth anônimo). Só liga se firebase-config.js estiver preenchido.
// Papéis (v4.3.3): ADM pode tudo; colaborador cria, vê e edita o seu por 1 hora. Senha da equipe é conferida no servidor (regras), nunca guardada em texto.
(function(){
const N={on:false,uid:null,admin:false,membro:false,login:'',dono:false,papel:'',pedidos:[],acessos:[],janelaMin:Number(localStorage.getItem('janMin'))||60,nome:localStorage.getItem('nvNome')||'',erro:'',fs:null,unsub:[]};
window.Nuvem=N;
const cfgOk=()=>!!(window.QLOG_FB&&window.QLOG_FB.projectId&&window.firebase);
N.ativo=()=>cfgOk();
N.pode=()=>!cfgOk()||N.admin; // editar/apagar
const docE=()=>N.fs.doc('config/equipe'),docS=()=>N.fs.doc('config/segredo'),docM=u=>N.fs.doc('membros/'+(u||N.uid));
async function iniciar(){if(!cfgOk())return;
  try{firebase.initializeApp(window.QLOG_FB);N.fs=firebase.firestore();
    try{N.fs.settings({experimentalAutoDetectLongPolling:true,merge:true});}catch(e){}
    try{await N.fs.enablePersistence({synchronizeTabs:false});}catch(e){}
    firebase.auth().onAuthStateChanged(async u=>{if(!u){try{await firebase.auth().signInAnonymously();}catch(e){N.erro='sem internet';if(window.nvMudou)window.nvMudou();}return;}
      N.uid=u.uid;await papel();});
  }catch(e){N.erro=String(e.message||e);}}
async function papel(){N.admin=false;N.membro=false;
  try{const e=await docE().get();N.existe=e.exists;N.adminUid=e.exists?e.data().admin:null;if(e.exists&&e.data().admin===N.uid)N.admin=true;}catch(e){N.existe=null;}
  try{const m=await docM().get();N.membro=m.exists&&!m.data().bloq;if(m.exists&&m.data().nome)N.nome=m.data().nome;N.login=m.exists&&m.data().login||'';}catch(e){N.membro=false;N.login='';}
  // v4.3.3: login individual — lê o próprio acesso (só funciona com a senha certa e sem bloqueio)
  N.dono=N.admin;if(N.membro&&N.login){try{const l=await N.fs.doc('logins/'+N.login).get();if(!l.exists||l.data().bloq)N.membro=false;else{N.nome=l.data().nome||N.nome;if(l.data().papel==='adm')N.admin=true;}}
    catch(e){if(/permission/i.test(String(e.code||e.message)))N.membro=false;}}
  N.papel=N.admin?'adm':(N.membro?'colab':'');
  if(N.admin||N.membro){N.on=true;await ouvir();if(N.admin&&!localStorage.getItem('nvMigrou'))migrar();}
  else{N.on=false;N.pedirEntrada();}
  N.status();}
N.status=()=>{setTimeout(()=>N.enviarFila&&N.enviarFila(),1500);N.checado=true;if(window.nvMudou)window.nvMudou();};
// primeira abertura. v4.3.3: usuário + senha (criados pelo ADM em 👥 Equipe); a senha de acesso antiga continua valendo
N.pedirEntrada=(equipe)=>{if(equipe===undefined&&pendGet()&&!N.on)return N.esperar();const m=document.getElementById('modal');if(!m||m.classList.contains('on')&&m.dataset.nv)return;
  // v4.3.8: primeira abertura (sem login salvo) já abre no ✍️ Criar meu acesso
  if(equipe===undefined&&N.existe!==false)return N.criarMeuAcesso();m.dataset.nv='1';
  const cria=N.existe===false,velho=cria||equipe===true;const ic='<img src="icone.png" alt="QLog" style="height:1.2em;width:1.2em;vertical-align:-0.25em;margin-right:6px;border-radius:4px">';
  if(velho)m.innerHTML=`<div><b style="font-size:22px;display:block;margin-bottom:10px">Identifique-se para acesso</b>
   <label>Seu nome</label><input id="nvN" value="${(N.nome||'').replace(/"/g,'&quot;')}" style="width:100%;font-size:20px">
   <label>Senha de acesso</label><input id="nvS" type="password" autocomplete="off" style="width:100%;font-size:20px">
   <p id="nvE" style="color:#c62828"></p>
   <button class="big ok" id="nvOk"><img src="icone.png" alt="QLog" style="height:1.2em;width:1.2em;vertical-align:-0.25em;margin-right:6px;border-radius:4px">Entrar / Registrar</button>${cria?'':'<button class="big alt" id="nvTroca">👤 Entrar com usuário e senha</button>'}<button class="big alt" id="nvX">Agora não</button></div>`;
  else m.innerHTML=`<div><b style="font-size:22px;display:block;margin-bottom:10px">${ic}Entrar no Qlog</b>
   <label>Usuário</label><input id="nvU" autocapitalize="none" autocomplete="username" style="width:100%;font-size:20px">
   <label>Senha</label><input id="nvS" type="password" autocomplete="current-password" style="width:100%;font-size:20px">
   <p id="nvE" style="color:#c62828"></p>
   <button class="big ok" id="nvOk">✅ Entrar</button><button class="big" id="nvCriar">✍️ Criar meu acesso</button><button class="big alt" id="nvTroca">🔑 Entrar com a senha de acesso</button><button class="big alt" id="nvX">Agora não</button></div>`;
  m.classList.add('on');const fecha=()=>{m.classList.remove('on');delete m.dataset.nv;};
  document.getElementById('nvX').onclick=fecha;
  const tr=document.getElementById('nvTroca');if(tr)tr.onclick=()=>{fecha();N.pedirEntrada(!velho);};
  const cr=document.getElementById('nvCriar');if(cr)cr.onclick=()=>{fecha();N.criarMeuAcesso();};
  document.getElementById('nvOk').onclick=async()=>{const s=document.getElementById('nvS').value;const er=document.getElementById('nvE');
    if(velho){const nome=document.getElementById('nvN').value.trim();if(!nome)return er.textContent='Digite seu nome';if(!s)return er.textContent='Digite a senha';
      const h=L.senhaHash(s);er.textContent='Conferindo...';
      try{if(cria){const b=N.fs.batch();b.set(docE(),{admin:N.uid,adminNome:nome,criado:Date.now()});b.set(docS(),{hash:h});b.set(docM(),{nome,hash:h,bloq:false,ts:Date.now()});await b.commit();}
        else await docM().set({nome,hash:h,bloq:false,ts:Date.now()});
        N.nome=nome;localStorage.setItem('nvNome',nome);fecha();await papel();toast('✅ Conectado à equipe');
      }catch(e){er.textContent=/permission/i.test(String(e.code||e.message))?'Senha errada ou celular bloqueado':'Sem internet. Tente de novo.';}
      return;}
    const u=L.loginNorm(document.getElementById('nvU').value);if(!u)return er.textContent='Digite seu usuário';if(!s)return er.textContent='Digite a senha';
    er.textContent='Conferindo...';
    try{await docM().set({nome:u,login:u,hash:L.loginHash(u,s),bloq:false,ts:Date.now()});fecha();await papel();toast('✅ Bem-vindo! Você entrou como '+(N.admin?'ADM':'colaborador'));}
    catch(e){er.textContent=/permission/i.test(String(e.code||e.message))?'Usuário ou senha errados, ou acesso bloqueado':'Sem internet. Tente de novo.';}};};
// v4.3.3: sair / trocar de usuário neste celular
N.sair=async()=>{try{N.unsub.forEach(f=>f());N.unsub=[];N.acessos=[];N.on=false;N.admin=false;N.membro=false;N.login='';N.papel='';await firebase.auth().signOut();}catch(e){}};
// ouvir mudanças da nuvem -> grava no celular
// v4.1: meses já arquivados (registros desses meses ficam nos celulares mesmo quando saem da nuvem)
N.feitos=JSON.parse(localStorage.getItem('arqFeitos')||'[]');N.arquivos=JSON.parse(localStorage.getItem('arqLista')||'[]');
function ouvirArquivo(){return new Promise(ok=>{let p=false;const fim=()=>{if(!p){p=true;ok();}};setTimeout(fim,8000);
  N.unsub.push(N.fs.collection('arquivo').onSnapshot(q=>{const l=[];q.forEach(d=>l.push(Object.assign({mes:d.id},d.data())));l.sort((a,b)=>a.mes<b.mes?1:-1);
    N.arquivos=l;N.feitos=l.map(x=>x.mes);localStorage.setItem('arqFeitos',JSON.stringify(N.feitos));localStorage.setItem('arqLista',JSON.stringify(l));if(tab==='arquivo')render();fim();},()=>fim()));});}
async function ouvir(){N.unsub.forEach(f=>f());N.unsub=[];limparAutores();
  if(N.admin)N.unsub.push(N.fs.collection('membros').onSnapshot(q=>{const o={};q.forEach(d=>{o[d.id]=d.data().nome||'';});N.nomes=o;if(tab==='hist')render();},()=>{}));
  if(N.admin){ouvirAvisos();ouvirProblemas();ouvirChamados();ouvirPedidos();ouvirAcessos();}else{N.avisos=[];N.problemas=[];N.chamados=[];N.pedidos=[];N.acessos=[];sinoMostrar();ouvirMeusPedidos();}
  ouvirAjustes();ouvirMeuAcesso();
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
N.salvar=async r=>{if(!N.on)return;try{const ref=N.fs.doc('registros/'+r.id),o=L.regNuvem(r,N.nome,N.uid);
    // v4.3.3: horário de criação vem do servidor; ao editar não mexe nos campos fixos (dono, horários)
    let ant=null;try{ant=await ref.get();}catch(e){}
    if(ant&&ant.exists){const a=ant.data();for(const k in a)if(!(k in o)&&!L.REG_FIXOS.includes(k))o[k]=firebase.firestore.FieldValue.delete();await ref.set(o,{merge:true});}
    else if(ant||!r.nuvem){o.criadoEm=firebase.firestore.FieldValue.serverTimestamp();o.criadoMs=Date.now();if(N.login&&o.autorUid===N.uid)o.autorLogin=N.login;await ref.set(o);}
    else await ref.set(o,{merge:true});}catch(e){return;}await N.salvarFotos(r);};
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
N.trocarSenha=async s=>{const h=L.senhaHash(s);const b=N.fs.batch();b.set(docS(),{hash:h});if(!N.login)b.set(docM(),{hash:h},{merge:true});await b.commit();};
N.membros=async()=>(await N.fs.collection('membros').get()).docs.map(d=>Object.assign({uid:d.id},d.data()));
N.bloquear=async(uid,v)=>docM(uid).update({bloq:!!v});
// v4.3.3: 👥 Equipe — acessos individuais (usuário + senha), papel ADM/Colaborador, bloqueio
N.logins=async()=>(await N.fs.collection('logins').get()).docs.map(d=>Object.assign({u:d.id},d.data()));
N.criarLogin=async(nome,u,senha,papel)=>{const b=N.fs.batch();b.set(N.fs.doc('logins/'+u),{nome,papel:papel==='adm'?'adm':'colab',bloq:false,ts:Date.now()});b.set(N.fs.doc('loginSeg/'+u),{hash:L.loginHash(u,senha)});await b.commit();};
// v4.3.5: 🗑 Remover acesso — apaga o celular (membros) ou o login (usuário + hash, e os celulares que usavam esse login). Os registros ficam.
N.removerMembro=async uid=>{if(!uid||uid===N.adminUid||uid===N.uid)throw new Error('nao');await docM(uid).delete();};
N.removerLogin=async u=>{if(!u||u===N.login)throw new Error('nao');let ms=[];try{ms=(await N.fs.collection('membros').where('login','==',u).get()).docs;}catch(e){}
  const b=N.fs.batch();ms.forEach(d=>{if(d.id!==N.adminUid&&d.id!==N.uid)b.delete(d.ref);});b.delete(N.fs.doc('logins/'+u));b.delete(N.fs.doc('loginSeg/'+u));await b.commit();};
N.confirmarRemover=()=>new Promise(ok=>{const o=document.createElement('div');o.style.cssText='position:fixed;inset:0;background:#0009;z-index:99;display:flex;align-items:flex-start;justify-content:center;padding-top:20vh';
  o.innerHTML='<div style="background:#fff;border-radius:14px;padding:18px;width:90%;max-width:420px;box-sizing:border-box"><b style="font-size:20px;display:block;margin-bottom:12px">Remover este acesso? A pessoa sai do app e não dá pra desfazer.</b><button class="big red" id="rmSim">Remover</button><button class="big alt" id="rmNao">Cancelar</button></div>';
  document.body.appendChild(o);const f=v=>{o.remove();ok(v);};o.querySelector('#rmSim').onclick=()=>f(true);o.querySelector('#rmNao').onclick=()=>f(false);});
N.mudarLogin=async(u,campos)=>N.fs.doc('logins/'+u).update(campos);
N.senhaLogin=async(u,senha)=>N.fs.doc('loginSeg/'+u).set({hash:L.loginHash(u,senha)});
N.painel=async(box)=>{const m=document.getElementById('modal');const A=box||m;let ms=[],ls=[];try{[ms,ls]=await Promise.all([N.membros(),N.logins()]);}catch(e){return toast('Sem internet ou regras da nuvem ainda não atualizadas');}
  const e=x=>String(x==null?'':x).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');ls.sort((a,b)=>String(a.nome).localeCompare(String(b.nome)));
  A.innerHTML=`<div class="eqp" style="max-height:85vh;overflow:auto"><b style="font-size:22px;display:block;margin-bottom:8px">👥 Equipe</b>
   ${ls.length?ls.map(x=>`<div class="card" style="margin:6px 0"><div style="font-size:19px"><b>${e(x.nome)}</b> <small>(${e(x.u)})</small>${x.bloq?' 🚫':''}<br>${L.papelNome(x.papel)}</div>
     <div class="acts"><button class="big" data-lgp="${e(x.u)}" data-v="${x.papel==='adm'?'colab':'adm'}">${x.papel==='adm'?'👷 Tornar colaborador':'Tornar '+L.papelNome('adm')}</button>
     <button class="big ${x.bloq?'ok':'red'}" data-lgb="${e(x.u)}" data-v="${x.bloq?0:1}">${x.bloq?'✅ Liberar':'🚫 Bloquear'}</button>${x.u===N.login?'':`<button class="big red" data-lgr="${e(x.u)}">🗑 Remover</button>`}<button class="big alt" data-lgs="${e(x.u)}">🔑 Nova senha</button></div></div>`).join(''):'<p>Nenhum acesso criado ainda.</p>'}
   <div class="card" style="margin:10px 0;border:2px solid #0b4f8a"><b style="font-size:19px">➕ Novo acesso</b>
   <label>Nome</label><input id="lgN" style="width:100%;font-size:20px">
   <label>Usuário (sem espaço)</label><input id="lgU" autocapitalize="none" style="width:100%;font-size:20px">
   <label>Senha (pelo menos 6)</label><input id="lgS" type="text" autocomplete="off" style="width:100%;font-size:20px">
   <label>Tipo</label><select id="lgP" style="width:100%;font-size:20px"><option value="colab">👷 Colaborador</option><option value="adm">${L.papelNome('adm')}</option></select>
   <button class="big ok" id="lgCriar">➕ Criar acesso</button></div>
   <b style="font-size:19px;display:block;margin-top:10px">📱 Celulares conectados</b>
   ${ms.map(x=>`<div class="row dev" style="align-items:center;flex-wrap:wrap"><span style="flex:1 1 100%;font-size:18px;overflow-wrap:anywhere">${x.uid===N.uid?'📱 Este celular (ADM)':e(x.nome||'?')+' <small>'+(x.login?'('+e(x.login)+')':'(senha de acesso)')+'</small>'}${x.bloq?' 🚫':''}</span>${x.uid===N.uid?'':`<button class="big ${x.bloq?'ok':'red'}" data-nvb="${e(x.uid)}" data-v="${x.bloq?0:1}" style="flex:1 1 40%;margin:4px 0">${x.bloq?'Liberar':'Bloquear'}</button>${x.uid===N.adminUid?'':`<button class="big red" data-nvr="${e(x.uid)}" style="flex:1 1 40%;margin:4px 0 4px 6px">🗑 Remover</button>`}`}</div>`).join('')}
   <label style="margin-top:10px">Senha de acesso (jeito antigo)</label><input id="nvNs" type="password" autocomplete="off" style="width:100%;font-size:20px">
   <button class="big" id="nvTs">🔑 Trocar senha de acesso</button><p><small>Quem entrou com a senha de acesso é colaborador. Depois de trocar, terão que digitar a senha nova.</small></p>${box?'':'<button class="big alt" id="nvF">Fechar</button>'}</div>`;if(!box)m.classList.add('on');
  const erro=x=>toast(/permission/i.test(String(x&&(x.code||x.message)))?'Sem permissão (regras da nuvem)':'Não consegui. Precisa de internet.');
  A.querySelectorAll('[data-nvb]').forEach(b=>b.onclick=async()=>{try{await N.bloquear(b.dataset.nvb,b.dataset.v==='1');N.painel(box);}catch(x){erro(x);}});
  A.querySelectorAll('[data-nvr]').forEach(b=>b.onclick=async()=>{if(!await N.confirmarRemover())return;try{await N.removerMembro(b.dataset.nvr);toast('🗑 Acesso removido');N.painel(box);}catch(x){erro(x);}});
  A.querySelectorAll('[data-lgr]').forEach(b=>b.onclick=async()=>{if(!await N.confirmarRemover())return;try{await N.removerLogin(b.dataset.lgr);toast('🗑 Acesso removido');N.painel(box);}catch(x){erro(x);}});
  A.querySelectorAll('[data-lgb]').forEach(b=>b.onclick=async()=>{try{await N.mudarLogin(b.dataset.lgb,{bloq:b.dataset.v==='1'});N.painel(box);}catch(x){erro(x);}});
  A.querySelectorAll('[data-lgp]').forEach(b=>b.onclick=async()=>{try{await N.mudarLogin(b.dataset.lgp,{papel:b.dataset.v});N.painel(box);}catch(x){erro(x);}});
  A.querySelectorAll('[data-lgs]').forEach(b=>b.onclick=async()=>{const s=prompt('Nova senha para '+b.dataset.lgs+' (pelo menos 6)');if(s==null)return;if(s.length<6)return toast('Senha com pelo menos 6 letras/números');
    try{await N.senhaLogin(b.dataset.lgs,s);toast('✅ Senha trocada. Ele precisa entrar de novo.');}catch(x){erro(x);}});
  document.getElementById('lgCriar').onclick=async()=>{const nome=document.getElementById('lgN').value.trim(),u=L.loginNorm(document.getElementById('lgU').value),s=document.getElementById('lgS').value,p=document.getElementById('lgP').value;
    if(!nome)return toast('Digite o nome');if(!L.loginValido(u))return toast('Usuário com 3 a 30 letras ou números');if(s.length<6)return toast('Senha com pelo menos 6 letras/números');
    if(ls.some(x=>x.u===u))return toast('Esse usuário já existe');
    try{await N.criarLogin(nome,u,s,p);toast('✅ Acesso criado: '+u);N.painel(box);}catch(x){erro(x);}};
  document.getElementById('nvTs').onclick=async()=>{const s=document.getElementById('nvNs').value;if(s.trim().length<6)return toast('Senha com pelo menos 6 letras/números');
    try{await N.trocarSenha(s);toast('✅ Senha trocada');if(!box)m.classList.remove('on');}catch(e){toast('Não consegui trocar. Precisa de internet.');}};
  const nf=document.getElementById('nvF');if(nf)nf.onclick=()=>m.classList.remove('on');};
// v4.2.6: avisos de alteração no histórico (só o dono da equipe vê; os avisos dele mesmo nem são criados)
N.avisos=[];
N.avisar=async(acao,antes,depois)=>{if(!N.on||N.admin)return;try{const a=L.avisoCriar(acao,antes,depois,{uid:N.uid,nome:N.nome},N.adminUid,Date.now());
  if(a)await N.fs.collection('avisos').add(a);}catch(e){}};
function sinoMostrar(){const b=document.getElementById('sino');if(!b)return;const n=N.admin?N.avisos.length+(N.problemas||[]).filter(p=>p.tela!=='suporte').length+L.chamadosNovos(N.chamadosTodos())+(N.pedidos||[]).length+(N.acessos||[]).length:0;b.style.display=n?'inline-block':'none';b.textContent='🔔 '+n;}
function banner(t){let b=document.getElementById('avBanner');if(!b){b=document.createElement('div');b.id='avBanner';document.body.appendChild(b);b.onclick=()=>{b.style.display='none';if(window.abrirAdm&&N.admin)window.abrirAdm('av');else N.verAvisos();};}
  b.textContent='🔔 '+t;b.style.display='block';clearTimeout(b._h);b._h=setTimeout(()=>b.style.display='none',8000);}
function ouvirAvisos(){let primeiro=true;
  N.unsub.push(N.fs.collection('avisos').onSnapshot(q=>{const l=[];q.forEach(d=>l.push(Object.assign({id:d.id},d.data())));l.sort((a,b)=>(b.ts||0)-(a.ts||0));N.avisos=l;
    if(!primeiro){const novos=q.docChanges().filter(c=>c.type==='added'&&!c.doc.metadata.hasPendingWrites);if(novos.length)banner(novos.length>1?novos.length+' alterações novas no histórico':L.avisoTxt(novos[0].doc.data()));}
    primeiro=false;sinoMostrar();avAtualizar();},()=>{}));}
N.confirmarAviso=async id=>{await N.fs.doc('avisos/'+id).delete();};
N.confirmarTodos=async()=>{const ids=N.avisos.map(a=>a.id);for(let i=0;i<ids.length;i+=400){const b=N.fs.batch();ids.slice(i,i+400).forEach(id=>b.delete(N.fs.doc('avisos/'+id)));await b.commit();}};
// v4.3.1: 🐞 problemas relatados — qualquer celular do app envia; só o dono da equipe vê e apaga
N.problemas=[];
const filaP=()=>{try{return JSON.parse(localStorage.getItem('probFila')||'[]');}catch(e){return [];}};
N.enviarFila=async()=>{if(!N.fs||!N.uid||!navigator.onLine)return false;let f=filaP();if(!f.length)return true;
  while(f.length){const p=Object.assign({},f[0],{quemUid:N.uid});if(!p.quem&&N.nome)p.quem=N.nome;try{await N.fs.collection('problemas').add(p);}catch(e){return false;}f.shift();localStorage.setItem('probFila',JSON.stringify(f));}return true;};
N.reportar=async p=>{if(!p)return false;try{localStorage.setItem('probFila',JSON.stringify(L.probFilaAdd(filaP(),p)));}catch(e){try{const q=Object.assign({},p);delete q.img;localStorage.setItem('probFila',JSON.stringify(L.probFilaAdd(filaP(),q)));}catch(x){}}
  if(!N.fs||!N.uid)return false;return await Promise.race([N.enviarFila(),new Promise(r=>setTimeout(()=>r(false),8000))]);};
window.addEventListener('online',()=>N.enviarFila());
function ouvirProblemas(){let primeiro=true;
  N.unsub.push(N.fs.collection('problemas').onSnapshot(q=>{const l=[];q.forEach(d=>l.push(Object.assign({id:d.id},d.data())));l.sort((a,b)=>(b.ts||0)-(a.ts||0));N.problemas=l;
    if(!primeiro){const novos=q.docChanges().filter(c=>c.type==='added'&&!c.doc.metadata.hasPendingWrites);const sup=novos.filter(c=>c.doc.data().tela==='suporte'),pr=novos.filter(c=>c.doc.data().tela!=='suporte');if(sup.length)avisarChamado(sup.map(c=>Object.assign({id:c.doc.id},L.chamadoDeProblema(c.doc.data()))));if(pr.length)banner(pr.length>1?pr.length+' problemas relatados':'🐞 Problema relatado: '+String(pr[0].doc.data().txt||'').slice(0,60));}
    primeiro=false;sinoMostrar();avAtualizar();chAtualizar();},()=>{}));}
N.resolverProblema=async id=>{await N.fs.doc('problemas/'+id).delete();};
function probHTML(e){const l=(N.problemas||[]).filter(p=>p.tela!=='suporte');if(!l.length)return '';
  return '<b style="font-size:21px;display:block;margin:12px 0 6px">🐞 Problemas relatados</b>'+l.map(p=>`<div class="card" style="margin:6px 0;border-left:5px solid #c62828"><div style="font-size:18px;white-space:pre-wrap"><b>${e(p.txt)}</b></div>
   <small>${p.ts?L.fmtData(p.ts)+' às '+L.fmtHora(p.ts):''}${p.quem?' · '+e(p.quem):''}</small><details style="margin:6px 0"><summary>Detalhes</summary><small>Versão ${e(p.versao)} · ${e(p.plataforma)} · tela: ${e(p.tela)}<br>${e(p.aparelho)}</small>
   ${(p.erros||[]).length?'<ul style="margin:6px 0;padding-left:20px;font-size:13px">'+p.erros.map(x=>'<li>'+(x.ts?L.fmtHora(x.ts)+' ':'')+e(x.m)+(x.o?' ('+e(x.o)+')':'')+'</li>').join('')+'</ul>':'<p><small>Nenhum erro registrado.</small></p>'}</details>
   ${p.img?`<img src="${e(p.img)}" style="max-width:100%;max-height:300px;margin:4px 0">`:''}<button class="big ok" data-probok="${e(p.id)}">✅ Resolvido</button></div>`).join('');}
N.verAvisos=(box)=>{const m=document.getElementById('modal');if(!m)return;const A=box||m;const e=s=>String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;');if(!box)m.dataset.av='1';
  const fecha=()=>{if(box)return;m.classList.remove('on');delete m.dataset.av;};
  A.innerHTML=`<div style="max-height:85vh;overflow:auto">${acHTML(e)}<b style="font-size:22px;display:block;margin-bottom:8px">🔔 Alterações no histórico</b>
   ${N.avisos.length?N.avisos.map(a=>`<div class="card" style="margin:6px 0"><div style="font-size:18px"><b>${e(L.avisoTxt(a))}</b></div><small>${a.ts?L.fmtData(a.ts)+' às '+L.fmtHora(a.ts):''}</small>${(a.mud||[]).length?'<ul style="margin:6px 0;padding-left:20px">'+a.mud.map(x=>'<li>'+e(x)+'</li>').join('')+'</ul>':''}<button class="big ok" data-avok="${e(a.id)}">✅ Confirmar</button></div>`).join('')+'<button class="big ok" id="avTodos">✅ Confirmar todos</button>':'<p>Nenhuma alteração nova.</p>'}${pedHTML(e)}${probHTML(e)}
   ${box?'':'<button class="big alt" id="avF">Fechar</button>'}</div>`;if(!box)m.classList.add('on');
  A.querySelectorAll('[data-avok]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{await N.confirmarAviso(b.dataset.avok);}catch(x){b.disabled=false;toast('Sem internet');}});
  A.querySelectorAll('[data-probok]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{await N.resolverProblema(b.dataset.probok);}catch(x){b.disabled=false;toast('Sem internet');}});
  A.querySelectorAll('[data-pdok]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{await N.liberarPedido(b.dataset.pdok);toast('✅ Liberado por '+L.janelaNome(N.janelaMin));}catch(x){b.disabled=false;toast('Sem internet');}});
  A.querySelectorAll('[data-pdno]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{await N.recusarPedido(b.dataset.pdno);toast('❌ Recusado');}catch(x){b.disabled=false;toast('Sem internet');}});
  const t=document.getElementById('avTodos');if(t)t.onclick=async()=>{t.disabled=true;try{await N.confirmarTodos();fecha();toast('✅ Confirmados');}catch(x){t.disabled=false;toast('Sem internet');}};
  A.querySelectorAll('[data-acok]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{await N.aprovarAcesso(b.dataset.acok,b.dataset.p);toast('✅ Acesso liberado como '+L.papelNome(b.dataset.p));}catch(x){b.disabled=false;toast('Sem internet');}});
  A.querySelectorAll('[data-acno]').forEach(b=>b.onclick=()=>{const u=b.dataset.acno;const c=window.confirmar||((t,f)=>{if(confirm(t))f();});
    c('Recusar o pedido de acesso de '+u+'?',async()=>{try{await N.recusarAcesso(u);toast('❌ Pedido recusado');}catch(x){toast('Sem internet');}},'Sim, recusar','red','Cancelar');});
  const fb=document.getElementById('avF');if(fb)fb.onclick=fecha;};
function avAtualizar(){const m=document.getElementById('modal');if(m&&m.dataset.av&&m.classList.contains('on'))N.verAvisos();if(window.admAtualizar)window.admAtualizar('av');}
document.addEventListener('click',ev=>{if(ev.target.closest('#sino')){ev.preventDefault();if(window.abrirAdm&&N.admin)window.abrirAdm('av');else N.verAvisos();}});
// v4.3.3: 📝 pedidos de edição (colaborador pede depois de 1 hora; o ADM libera mais 1 hora ou recusa; depois o pedido é apagado)
N.pedirEdicao=async(r,txt,motivo)=>{const p=L.pedidoCriar(r,{uid:N.uid,nome:N.nome},txt,motivo,Date.now());if(!p)throw new Error('dados');await N.fs.collection('pedidos').add(p);};
function ouvirPedidos(){let primeiro=true;
  N.unsub.push(N.fs.collection('pedidos').onSnapshot(q=>{const l=[];q.forEach(d=>{const x=d.data();if(x.estado==='aberto')l.push(Object.assign({id:d.id},x));});l.sort((a,b)=>(b.ts||0)-(a.ts||0));N.pedidos=l;
    if(!primeiro){const novos=q.docChanges().filter(c=>c.type==='added'&&!c.doc.metadata.hasPendingWrites&&c.doc.data().estado==='aberto');if(novos.length)banner(novos.length>1?novos.length+' pedidos de edição':L.pedidoTxt(novos[0].doc.data()));}
    primeiro=false;sinoMostrar();avAtualizar();},()=>{}));}
N.liberarPedido=async id=>{const p=N.pedidos.find(x=>x.id===id);if(!p)return;const ate=Date.now()+L.janelaMs(N.janelaMin);const b=N.fs.batch();
  b.update(N.fs.doc('registros/'+p.regId),{liberadoAte:firebase.firestore.Timestamp.fromMillis(ate),liberadoMs:ate});b.delete(N.fs.doc('pedidos/'+id));await b.commit();};
N.recusarPedido=async id=>{await N.fs.doc('pedidos/'+id).update({estado:'recusado',respTs:Date.now()});};
function pedHTML(e){const l=N.pedidos||[];if(!l.length)return '';
  return '<b style="font-size:21px;display:block;margin:12px 0 6px">📝 Pedidos de edição</b>'+l.map(p=>`<div class="card" style="margin:6px 0;border-left:5px solid #0b4f8a"><div style="font-size:18px"><b>${e(p.codigo)}</b>${p.quem?' · '+e(p.quem):''}</div>
   <div style="white-space:pre-wrap;margin:4px 0"><b>O que mudar:</b> ${e(p.txt)}</div><div style="white-space:pre-wrap"><b>Motivo:</b> ${e(p.motivo)}</div><small>${p.ts?L.fmtData(p.ts)+' às '+L.fmtHora(p.ts):''}</small>
   <div class="row"><button class="big ok" data-pdok="${e(p.id)}" style="margin:4px 6px 4px 0">✅ Liberar</button><button class="big red" data-pdno="${e(p.id)}" style="margin:4px 0">❌ Recusar</button></div></div>`).join('');}
// colaborador: acompanha os próprios pedidos (aviso de liberado ou recusado)
function ouvirMeusPedidos(){const vistos={};
  N.unsub.push(N.fs.collection('pedidos').where('quemUid','==',N.uid).onSnapshot(q=>{
    q.docChanges().forEach(c=>{const x=c.doc.data();
      if(c.type==='removed'&&x.estado==='aberto'&&!vistos[c.doc.id])toast('✅ Edição liberada: '+(x.codigo||''));
      else if(c.type!=='removed'&&x.estado==='recusado'&&!vistos[c.doc.id]){vistos[c.doc.id]=1;recusaAviso(c.doc.id,x);}});},()=>{}));}
function recusaAviso(id,x){const m=document.getElementById('modal');if(!m)return;const e=s=>String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;');
  const mostra=()=>{if(m.classList.contains('on'))return setTimeout(mostra,3000);
    m.innerHTML=`<div><b style="font-size:22px;display:block;margin-bottom:8px">❌ Pedido de edição recusado</b><p style="font-size:19px">O ADM recusou o seu pedido para editar <b>${e(x.codigo)}</b>.</p><p><small>${e(x.txt)}</small></p><button class="big ok" id="rcOk">Entendi</button></div>`;
    m.classList.add('on');document.getElementById('rcOk').onclick=async()=>{m.classList.remove('on');try{await N.fs.doc('pedidos/'+id).delete();}catch(e){}};};mostra();}
// v4.3.4: ✍️ Criar meu acesso — a pessoa pede o acesso e fica ⏳ aguardando o ADM liberar (sem ver nenhum registro até lá)
const PEND='pendAcesso';
function pendGet(){try{return JSON.parse(localStorage.getItem(PEND)||'null');}catch(e){return null;}}
function pendLimpar(){localStorage.removeItem(PEND);if(N._pendOff){N._pendOff();N._pendOff=null;}}
N.criarMeuAcesso=()=>{const m=document.getElementById('modal');if(!m)return;m.dataset.nv='1';
  m.innerHTML=`<div><b style="font-size:22px;display:block;margin-bottom:10px">✍️ Criar meu acesso</b>
   <label>Seu nome</label><input id="caN" style="width:100%;font-size:20px">
   <label>Usuário (sem espaço)</label><input id="caU" autocapitalize="none" autocomplete="username" style="width:100%;font-size:20px">
   <label>Senha (pelo menos 6)</label><input id="caS" type="password" autocomplete="new-password" style="width:100%;font-size:20px">
   <label>Repita a senha</label><input id="caS2" type="password" autocomplete="new-password" style="width:100%;font-size:20px">
   <p><small>O ADM precisa liberar o seu acesso antes de você usar o app.</small></p><p id="caE" style="color:#c62828"></p>
   <button class="big ok" id="caOk">✍️ Pedir acesso</button><button class="big alt" id="caX">Agora não</button><p style="text-align:center;margin:10px 0"><a href="#" id="caEntrar" style="font-size:18px;font-weight:bold;color:#0b4f8a">Já tenho acesso → Entrar</a></p></div>`;
  m.classList.add('on');const fecha=()=>{m.classList.remove('on');delete m.dataset.nv;};
  document.getElementById('caX').onclick=fecha;
  document.getElementById('caEntrar').onclick=ev=>{ev.preventDefault();fecha();N.pedirEntrada(false);};
  document.getElementById('caOk').onclick=async()=>{const er=document.getElementById('caE'),s=document.getElementById('caS').value;
    if(s!==document.getElementById('caS2').value)return er.textContent='As senhas não são iguais';
    const p=L.acessoPedido(document.getElementById('caN').value,document.getElementById('caU').value,s,N.uid,Date.now());if(p.erro)return er.textContent=p.erro;
    if(!N.fs||!N.uid)return er.textContent='Sem internet. Tente de novo.';er.textContent='Enviando...';
    try{const b=N.fs.batch();b.set(N.fs.doc('loginSeg/'+p.u),p.seg);b.set(N.fs.doc('pendentes/'+p.u),p.doc);await b.commit();}
    catch(e){er.textContent=/permission/i.test(String(e.code||e.message))?'Esse usuário já existe ou já foi pedido. Escolha outro.':'Sem internet. Tente de novo.';return;}
    localStorage.setItem(PEND,JSON.stringify({u:p.u,nome:p.doc.nome,h:p.seg.hash}));N.nome=p.doc.nome;localStorage.setItem('nvNome',p.doc.nome);fecha();N.esperar();};};
// tela de espera; quando o ADM decide, o pedido some da nuvem: se liberou, este celular entra sozinho; se recusou, avisa
N.esperar=()=>{const pd=pendGet(),m=document.getElementById('modal');if(!pd||!m)return;const e=s=>String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;');m.dataset.nv='1';
  m.innerHTML=`<div><b style="font-size:22px;display:block;margin-bottom:10px">⏳ Aguardando liberação</b>
   <p style="font-size:19px">Seu pedido de acesso como <b>${e(pd.u)}</b> foi enviado. Assim que o ADM liberar, o app abre sozinho.</p>
   <p id="peE" style="color:#0b4f8a"></p><button class="big ok" id="peV">🔄 Verificar agora</button><button class="big red" id="peC">❌ Cancelar pedido</button></div>`;
  m.classList.add('on');
  document.getElementById('peV').onclick=()=>checarPend(true);
  document.getElementById('peC').onclick=async()=>{if(!confirm('Cancelar o seu pedido de acesso?'))return;
    try{const b=N.fs.batch();b.delete(N.fs.doc('pendentes/'+pd.u));b.delete(N.fs.doc('loginSeg/'+pd.u));await b.commit();}catch(x){}
    pendLimpar();m.classList.remove('on');delete m.dataset.nv;N.pedirEntrada(false);};
  if(N.fs&&N.uid&&!N._pendOff)N._pendOff=N.fs.doc('pendentes/'+pd.u).onSnapshot(d=>{if(d.metadata.fromCache)return;if(!d.exists)checarPend();},()=>{});};
let checando=false;
async function checarPend(manual){const pd=pendGet();if(!pd||!N.fs||!N.uid||checando)return;checando=true;const er=document.getElementById('peE');
  try{let d=null;try{d=await N.fs.doc('pendentes/'+pd.u).get({source:'server'});}catch(x){if(er)er.textContent='Sem internet. Tente de novo.';return;}
    if(d.exists){if(er&&manual)er.textContent='Ainda aguardando o ADM.';return;}
    try{await docM().set({nome:pd.nome||pd.u,login:pd.u,hash:pd.h,bloq:false,ts:Date.now()});}
    catch(x){if(/permission/i.test(String(x.code||x.message))){pendLimpar();recusado(pd);}else if(er)er.textContent='Sem internet. Tente de novo.';return;}
    pendLimpar();const m=document.getElementById('modal');m.classList.remove('on');delete m.dataset.nv;await papel();toast('✅ Acesso liberado! Você entrou como '+(N.admin?'ADM':'colaborador'));}
  finally{checando=false;}}
function recusado(pd){const m=document.getElementById('modal');const e=s=>String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;');m.dataset.nv='1';
  m.innerHTML=`<div><b style="font-size:22px;display:block;margin-bottom:8px">❌ Acesso recusado</b><p style="font-size:19px">O ADM recusou o pedido de acesso de <b>${e(pd.u)}</b>.</p><button class="big ok" id="reOk">Entendi</button></div>`;
  m.classList.add('on');document.getElementById('reOk').onclick=()=>{m.classList.remove('on');delete m.dataset.nv;N.pedirEntrada(false);};}
// ADM: pedidos de acesso chegam no 🔔 (e na aba ⚙️ ADM) com 👷 Colaborador, ADM ou ❌ Recusar
function ouvirAcessos(){let primeiro=true;
  N.unsub.push(N.fs.collection('pendentes').onSnapshot(q=>{const l=[];q.forEach(d=>l.push(Object.assign({u:d.id},d.data())));l.sort((a,b)=>(b.ts||0)-(a.ts||0));N.acessos=l;
    if(!primeiro){const novos=q.docChanges().filter(c=>c.type==='added'&&!c.doc.metadata.hasPendingWrites);if(novos.length)banner(novos.length>1?novos.length+' pedidos de acesso':L.acessoTxt(Object.assign({u:novos[0].doc.id},novos[0].doc.data())));}
    primeiro=false;sinoMostrar();avAtualizar();},()=>{}));}
N.aprovarAcesso=async(u,p)=>{const x=N.acessos.find(a=>a.u===u);if(!x)return;const b=N.fs.batch();
  b.set(N.fs.doc('logins/'+u),{nome:String(x.nome||u).slice(0,60),papel:p==='adm'?'adm':'colab',bloq:false,ts:Date.now()});b.delete(N.fs.doc('pendentes/'+u));await b.commit();};
N.recusarAcesso=async u=>{const b=N.fs.batch();b.delete(N.fs.doc('pendentes/'+u));b.delete(N.fs.doc('loginSeg/'+u));await b.commit();};
function acHTML(e){const l=N.acessos||[];if(!l.length)return '';
  return '<b style="font-size:21px;display:block;margin:0 0 6px">✍️ Pedidos de acesso</b>'+l.map(p=>`<div class="card" style="margin:6px 0;border-left:5px solid #3f8a5f"><div style="font-size:19px"><b>${e(p.nome)}</b> <small>(${e(p.u)})</small></div>
   <small>${p.ts?L.fmtData(p.ts)+' às '+L.fmtHora(p.ts):''}</small><p style="margin:4px 0">Liberar como:</p>
   <div class="row"><button class="big ok" data-acok="${e(p.u)}" data-p="colab" style="margin:4px 6px 4px 0">${L.papelNome('colab')}</button><button class="big" data-acok="${e(p.u)}" data-p="adm" style="margin:4px 0">${L.papelNome('adm')}</button></div>
   <button class="big red" data-acno="${e(p.u)}">❌ Recusar</button></div>`).join('');}
// v4.3.4: ⚙️ Configurações da nuvem (tempo para o colaborador editar) — todos leem, só o ADM muda
// v4.3.5: se o ADM remover (ou bloquear) este acesso, o celular sai na hora e volta para a tela de entrada
function ouvirMeuAcesso(){if(N.dono)return;const sai=()=>{if(!N.on)return;N.unsub.forEach(f=>f());N.unsub=[];N.on=false;toast('🚪 Seu acesso foi removido ou bloqueado');papel();};
  N.unsub.push(docM().onSnapshot(d=>{if(d.metadata.fromCache)return;if(!d.exists||d.data().bloq)sai();},e=>{if(/permission/i.test(String(e.code||'')))sai();}));
  if(N.login)N.unsub.push(N.fs.doc('logins/'+N.login).onSnapshot(d=>{if(d.metadata.fromCache)return;if(!d.exists||d.data().bloq)sai();},e=>{if(/permission/i.test(String(e.code||'')))sai();}));}
function ouvirAjustes(){N.unsub.push(docE().onSnapshot(d=>{const x=d.exists?d.data():{};const v=('janelaMin' in x)?Number(x.janelaMin):60;N.janelaMin=L.janelaOk(v)?v:60;localStorage.setItem('janMin',String(N.janelaMin));
  if(window.admAtualizar)window.admAtualizar('cfg');},()=>{}));}
N.janelaMs=()=>L.janelaMs(N.janelaMin);
N.salvarJanela=async min=>{if(!L.janelaOk(min))throw new Error('valor');await docE().update({janelaMin:Number(min)});N.janelaMin=Number(min);localStorage.setItem('janMin',String(min));};
N.iniciar=iniciar;

// 4.3.19: 🎧 Falar com o suporte — chamados (Firestore, plano grátis). Foto comprimida dentro do próprio documento.
N.chamados=[];N.chamadosTodos=()=>L.chamadosLista(N.chamados,N.problemas);
N.enviarChamado=async c=>{if(!c)return false;if(!N.fs||!N.uid)return false;c.quemUid=N.uid;if(N.login)c.login=N.login;
  const tenta=async()=>{try{await N.fs.collection('chamados').add(c);return true;}catch(e){try{await N.fs.collection('problemas').add(L.chamadoParaProblema(c));return true;}catch(x){return false;}}};
  return await Promise.race([tenta(),new Promise(r=>setTimeout(()=>r(false),10000))]);};
N.notificar=(t,m)=>{try{if(window.AndroidNotif&&AndroidNotif.mostrar){AndroidNotif.mostrar(String(t),String(m||''));return;}
  if('Notification' in window&&Notification.permission==='granted'){const o={body:String(m||''),icon:'icone.png',tag:'qlog-chamado'};
    if(navigator.serviceWorker&&navigator.serviceWorker.getRegistration)navigator.serviceWorker.getRegistration().then(r=>{if(r&&r.showNotification)r.showNotification(t,o);else new Notification(t,o);}).catch(()=>{try{new Notification(t,o);}catch(e){}});else new Notification(t,o);}}catch(e){}};
N.pedirNotif=()=>{try{if(window.AndroidNotif&&AndroidNotif.pedir){AndroidNotif.pedir();return;}if('Notification' in window&&Notification.permission==='default')Notification.requestPermission();}catch(e){}};
function avisarChamado(l){if(!l.length)return;const t=l.length>1?l.length+' chamados novos':'Novo chamado: '+String(l[0].nome||'')+' — '+String(l[0].msg||'').slice(0,60);
  banner(t);N.notificar('Qlog Expedição · Suporte',t);try{if(navigator.vibrate)navigator.vibrate([150,80,150]);}catch(e){}}
function chAtualizar(){sinoMostrar();if(window.admAtualizar)window.admAtualizar('ch');if(window.admContagem)window.admContagem();}
function ouvirChamados(){let primeiro=true;
  N.unsub.push(N.fs.collection('chamados').onSnapshot(q=>{const l=[];q.forEach(d=>l.push(Object.assign({id:d.id},d.data())));N.chamados=l;
    if(!primeiro){const novos=q.docChanges().filter(c=>c.type==='added'&&!c.doc.metadata.hasPendingWrites&&c.doc.data().status==='novo');avisarChamado(novos.map(c=>c.doc.data()));}
    primeiro=false;chAtualizar();},()=>{}));}
N.resolverChamado=async c=>{if(c.reserva)await N.fs.doc('problemas/'+c.id).delete();else await N.fs.doc('chamados/'+c.id).update({status:'resolvido',resolvidoTs:Date.now()});};
N.verChamados=box=>{const e=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');const l=N.chamadosTodos();const ic=window.Tema?Tema.ic('suporte'):'';
  box.innerHTML=`<b style="font-size:22px;display:block;margin-bottom:8px">${ic} Chamados</b>${l.length?l.map((c,i)=>`<div class="card cham" style="margin:6px 0;border-left:5px solid ${c.status==='novo'?'#e08a00':'#1b8a3a'}">
   <div style="font-size:18px"><b>${e(c.nome)}</b> <small>${c.status==='novo'?'· novo':'· resolvido'}</small></div><small>${c.ts?L.fmtData(c.ts)+' às '+L.fmtHora(c.ts):''}</small>
   <details style="margin:6px 0"${c.status==='novo'&&i===0?' open':''}><summary>Abrir</summary><div style="font-size:18px;white-space:pre-wrap;margin:6px 0">${e(c.msg)}</div>
   ${c.img?`<img src="${e(c.img)}" alt="foto" style="max-width:100%;max-height:320px;margin:4px 0;border-radius:8px">`:''}
   <small>Versão ${e(c.versao)} · ${e(c.plataforma)}${c.login?' · '+e(c.login):''}<br>${e(c.aparelho)}</small></details>
   ${c.status==='novo'?`<button class="big ok" data-chok="${i}">✅ Marcar como resolvido</button>`:''}</div>`).join(''):'<p>Nenhum chamado ainda.</p>'}`;
  box.querySelectorAll('[data-chok]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{await N.resolverChamado(l[+b.dataset.chok]);toast('✅ Resolvido');}catch(x){b.disabled=false;toast('Sem internet');}});};
})();
