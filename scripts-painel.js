/* v4.3.54: painel Scripts (aba ADM), visível só para o Super ADM (N.dono). */
(function(){
'use strict';
const ic=k=>window.Tema?Tema.ic(k):'';
const selo=()=>`<span class="seloScr">${ic('admselo')} Super ADM</span>`;
let st={tela:'lista',parte:null,arq:null,codigo:'',original:'',busca:'',aberto:null};

function Nuv(){return window.Nuvem||{};}
function pode(){return L.scriptsPodeVer(Nuv());}
function vApp(){return (typeof APP_V==='string'?APP_V:'');}

function toastFalha(){
  try{
    const m=sessionStorage.getItem(L.SCRIPTS_FALHOU);
    if(!m)return;
    sessionStorage.removeItem(L.SCRIPTS_FALHOU);
    setTimeout(()=>{if(typeof toast==='function')toast(m);},400);
  }catch(e){}
}
function marcarTestouSeAtivo(){
  try{
    if(window.__qlogTesteAtivo)L.scriptsMarcarTestou(localStorage);
  }catch(e){}
}

window.QlogScriptsAposPapel=function(N){
  try{
    const t=L.scriptsLerTeste(localStorage);
    if(!t)return;
    const d=L.scriptsDeveAplicar(t,N);
    if(!d.ok&&d.erro==='nao-dono'){
      L.scriptsLimparTeste(localStorage,'nao-dono');
      location.reload();
    }
  }catch(e){}
};

function lerFonte(nome){
  return new Promise((res,rej)=>{
    if(!L.scriptsArqOk(nome))return rej(new Error('arquivo'));
    if(window.AndroidAsset&&typeof AndroidAsset.ler==='function'){
      try{const t=AndroidAsset.ler(nome);if(typeof t==='string'&&t.length)return res(t);}catch(e){}
    }
    if(typeof fetch==='function'){
      fetch(nome,{cache:'no-store'}).then(r=>{
        if(!r.ok&&r.status!==0)throw new Error('http');
        return r.text();
      }).then(res).catch(()=>xhr(nome,res,rej));
    }else xhr(nome,res,rej);
  });
}
function xhr(nome,res,rej){
  try{
    const x=new XMLHttpRequest();
    x.open('GET',nome,true);
    x.onload=()=>{if(x.status===200||x.status===0)res(x.responseText);else rej(new Error('http'));};
    x.onerror=()=>rej(new Error('rede'));
    x.send();
  }catch(e){rej(e);}
}

function grade(sub){
  const b=(k,t)=>`<button type="button" class="big ${sub===k?'ok':'alt'}" data-admsub="${k}" style="margin:4px 4px 4px 0;font-size:16px;padding:10px 4px">${t}</button>`;
  let extra='';
  if(pode()){
    extra=b('sc',ic('codigo')+' Scripts <span class="seloBtn">'+ic('admselo')+' Super ADM</span>');
  }
  const chN=typeof window.admChN==='function'?window.admChN():((typeof chN==='function')?chN():'');
  return extra;
}

window.scriptsBotaoHTML=function(sub){
  if(!pode())return '';
  return `<button type="button" class="big ${sub==='sc'?'ok':'alt'}" data-admsub="sc" style="margin:4px 4px 4px 0;font-size:16px;padding:10px 4px">${ic('codigo')} Scripts <span class="seloBtn">${ic('admselo')} Super ADM</span></button>`;
};

function partePorId(id){return L.SCRIPTS_PARTES.find(p=>p.id===id);}

function itemHTML(p,aberto){
  const arq=(p.arqs||[]).join(' · ');
  return `<div class="dspItem${aberto?' aberto':''}" data-id="${p.id}">
    <button type="button" class="dspCab" data-scrab="${p.id}">
      <span class="dspIc">${ic(p.ic)}</span>
      <span class="dspTx"><b>${esc(p.tit)}</b><span class="dspMeta"><span class="dspArq">${esc(arq)}</span><span class="dspLnB">${p.ln} linhas</span></span></span>
      <span class="dspChev" aria-hidden="true"></span>
    </button>
    <div class="dspExp">
      <p>${esc(p.ex)}</p>
      <button type="button" class="big dspVer icb" data-scrver="${p.id}">${ic('documento')} Ver script</button>
    </div>
  </div>`;
}

function listaHTML(){
  const partes=L.scriptsFiltrarPartes(L.SCRIPTS_PARTES,st.busca);
  const itens=partes.length?partes.map(p=>itemHTML(p,st.aberto===p.id)).join(''):'<p class="dspHint">Nenhuma parte com esse nome.</p>';
  return `<div class="dspPainel">
    <div class="dspTopo">
      <div>
        <h1 class="dspH1">${ic('codigo')} Scripts</h1>
        <div class="dspBadges">
          <span class="bdg">v${esc(vApp())}</span>
          <span class="bdg">${L.SCRIPTS_PARTES.length} partes</span>
          <span class="bdg">só você vê</span>
        </div>
      </div>
      ${selo()}
    </div>
    <div class="dspBusca">${ic('localizar')}<input type="search" id="scrBusca" placeholder="Buscar script" value="${esc(st.busca)}" autocomplete="off"></div>
    <div class="dspLista">${itens}</div>
  </div>`;
}

function ligarLista(bx){
  const i=bx.querySelector('#scrBusca');
  if(i){
    i.oninput=e=>{st.busca=e.target.value;const abre=st.aberto;st.aberto=abre;window.scriptsPainel(bx);const n=bx.querySelector('#scrBusca');if(n){n.focus();n.setSelectionRange&&n.setSelectionRange(n.value.length,n.value.length);}};
  }
  bx.querySelectorAll('[data-scrab]').forEach(b=>b.onclick=()=>{
    const id=b.dataset.scrab;st.aberto=st.aberto===id?null:id;window.scriptsPainel(bx);
  });
  bx.querySelectorAll('[data-scrver]').forEach(b=>b.onclick=()=>{abrirVer(bx,b.dataset.scrver,null);});
}

async function abrirVer(bx,parteId,arq){
  const p=partePorId(parteId);if(!p)return;
  const arquivo=arq||p.arqs[0];
  st.tela='ver';st.parte=p;st.arq=arquivo;
  bx.innerHTML='<p class="dspHint">Carregando o script…</p>';
  try{
    const cod=await lerFonte(arquivo);
    st.original=cod;st.codigo=cod;
    verHTML(bx);
  }catch(e){
    bx.innerHTML=`<div class="dspBar"><button type="button" class="big alt icb" id="scrVoltar">${ic('voltar')} Voltar</button></div><p class="avisoScr">Não deu para ler o arquivo ${esc(arquivo)} neste aparelho.</p>`;
    const v=bx.querySelector('#scrVoltar');if(v)v.onclick=()=>{st.tela='lista';window.scriptsPainel(bx);};
  }
}

function testandoEste(){
  const t=L.scriptsLerTeste(localStorage);
  return t&&t.arquivo===st.arq&&L.scriptsMesmoConteudo(t.codigo,st.codigo);
}
function podeEnviarAgora(){
  return L.scriptsPodeEnviar({arquivo:st.arq,codigo:st.codigo},L.scriptsJaTestou(localStorage)&&testandoEste());
}

function pills(p){
  return `<div class="dspArqs">${(p.arqs||[]).map(a=>`<button type="button" class="big ${a===st.arq?'ok':'alt'}" data-scrarq="${a}">${esc(a)}</button>`).join('')}</div>`;
}

function verHTML(bx){
  const p=st.parte,env=podeEnviarAgora();
  const nLin=L.scriptsLinhas(st.codigo).length;
  bx.innerHTML=`
    <div class="dspBar">
      <button type="button" class="big alt icb" id="scrVoltar">${ic('voltar')} Voltar</button>
      ${selo()}
    </div>
    <p class="dspCrumb">ADM · Scripts · ${esc(p.tit)}</p>
    <h2 class="dspTit">${ic(p.ic)} ${esc(p.tit)}</h2>
    ${pills(p)}
    <div class="dspBadges" style="margin:4px 0 8px">
      <span class="bdg" style="font-family:ui-monospace,Menlo,Consolas,monospace">${esc(st.arq)}</span>
      <span class="bdg">v${esc(vApp())}</span>
      <span class="bdg">${nLin} linhas</span>
    </div>
    <div class="dspCode">${L.scriptsCodigoHTML(st.codigo)}</div>
    <p class="dspHint">O código quebra a linha para não sair da tela. A rolagem é só dentro desta caixa.</p>
    <button type="button" class="big icb" id="scrEd">${ic('editar')} Editar</button>
    <button type="button" class="big ok icb" id="scrTest">${ic('celular')} Testar no meu celular</button>
    <button type="button" class="big icb ${env?'':'off'}" ${env?'':'disabled'} id="scrEnv">${ic('equipe')} Enviar para a equipe</button>
    <p class="dspNota">${env?'Pronto: você já testou neste celular. Nada será publicado sozinho.':'Este último só libera depois de testar no seu celular.'}</p>`;
  bx.querySelector('#scrVoltar').onclick=()=>{st.tela='lista';window.scriptsPainel(bx);};
  bx.querySelectorAll('[data-scrarq]').forEach(b=>b.onclick=()=>{if(b.dataset.scrarq!==st.arq)abrirVer(bx,p.id,b.dataset.scrarq);});
  bx.querySelector('#scrEd').onclick=()=>editarHTML(bx);
  bx.querySelector('#scrTest').onclick=()=>testar(bx);
  const en=bx.querySelector('#scrEnv');if(en&&env)en.onclick=()=>enviar(bx);
}

function editarHTML(bx){
  const p=st.parte,env=podeEnviarAgora();
  const nLin=L.scriptsLinhas(st.codigo).length;
  const nums=L.scriptsLinhas(st.codigo).map((_,i)=>i+1).join('\n');
  st.tela='editar';
  bx.innerHTML=`
    <div class="dspBar">
      <button type="button" class="big alt icb" id="scrVoltar">${ic('voltar')} Voltar</button>
      ${selo()}
    </div>
    <p class="dspCrumb">ADM · Scripts · ${esc(p.tit)}</p>
    <h2 class="dspTit">${ic('editar')} Editar · ${esc(p.tit)}</h2>
    <div class="dspBadges" style="margin:4px 0 8px">
      <span class="bdg" style="font-family:ui-monospace,Menlo,Consolas,monospace">${esc(st.arq)}</span>
      <span class="bdg">v${esc(vApp())}</span>
      <span class="bdg" id="scrNLin">${nLin} linhas</span>
    </div>
    <div class="avisoScr">
      <div class="avTit">${ic('atencao')} Fica só no seu celular, por enquanto</div>
      A mudança vale só para você, para testar. A equipe não vê nada ainda. Só depois de testar e aprovar, toque em Enviar para a equipe.
    </div>
    <div class="dspCode editando dspEd"><div class="dspEdG" id="scrGutt">${nums}</div><textarea id="scrTxt" spellcheck="false" autocapitalize="off" autocomplete="off">${esc(st.codigo)}</textarea></div>
    <p class="dspHint">A rolagem é só dentro da caixa. O código quebra a linha para não sair da tela.</p>
    <button type="button" class="big alt icb" id="scrUndo">${ic('limpar')} Desfazer mudanças</button>
    <button type="button" class="big ok icb" id="scrTest">${ic('celular')} Testar no meu celular</button>
    <button type="button" class="big icb ${env?'':'off'}" ${env?'':'disabled'} id="scrEnv">${ic('equipe')} Enviar para a equipe</button>
    <p class="dspNota" id="scrEnvNota">${env?'Pronto: você já testou neste celular. Nada será publicado sozinho.':'Enviar continua fechado até você testar.'}</p>`;
  const ta=bx.querySelector('#scrTxt'),g=bx.querySelector('#scrGutt');
  const sync=()=>{
    st.codigo=ta.value;
    const ls=L.scriptsLinhas(st.codigo);
    g.textContent=ls.map((_,i)=>i+1).join('\n');
    const nl=bx.querySelector('#scrNLin');if(nl)nl.textContent=ls.length+' linhas';
    atualizarEnviar(bx);
  };
  ta.oninput=sync;
  ta.onscroll=()=>{g.scrollTop=ta.scrollTop;};
  g.onscroll=()=>{ta.scrollTop=g.scrollTop;};
  bx.querySelector('#scrVoltar').onclick=()=>{st.codigo=ta.value;verHTML(bx);};
  bx.querySelector('#scrUndo').onclick=()=>desfazer(bx,ta);
  bx.querySelector('#scrTest').onclick=()=>{st.codigo=ta.value;testar(bx);};
  const en=bx.querySelector('#scrEnv');if(en&&env)en.onclick=()=>{st.codigo=ta.value;enviar(bx);};
}

function atualizarEnviar(bx){
  const env=podeEnviarAgora();
  const en=bx.querySelector('#scrEnv');
  if(!en)return;
  en.disabled=!env;
  en.classList.toggle('off',!env);
  en.onclick=env?()=>enviar(bx):null;
  const n=bx.querySelector('#scrEnvNota')||bx.querySelector('.dspNota');
  if(n)n.textContent=env?'Pronto: você já testou neste celular. Nada será publicado sozinho.':'Enviar continua fechado até você testar.';
}

function desfazer(bx,ta){
  const mudou=!L.scriptsMesmoConteudo(st.codigo,st.original);
  const teste=L.scriptsLerTeste(localStorage);
  if(!mudou&&!teste){if(typeof toast==='function')toast('Nada para desfazer.');return;}
  const acao=()=>{
    st.codigo=st.original;
    if(ta)ta.value=st.original;
    if(teste){
      L.scriptsLimparTeste(localStorage,'desfazer');
      try{sessionStorage.setItem(L.SCRIPTS_VOLTA,JSON.stringify({tela:'editar',parte:st.parte&&st.parte.id,arq:st.arq}));}catch(e){}
      location.reload();
      return;
    }
    if(st.tela==='editar')editarHTML(bx);
  };
  if(typeof confirmar==='function'&&teste){
    confirmar('Desfazer e voltar ao script original neste celular?',acao,'Desfazer','red','Cancelar');
  }else acao();
}

function testar(bx){
  if(!pode()){if(typeof toast==='function')toast('Só o Super ADM pode testar.');return;}
  const pac={arquivo:st.arq,codigo:st.codigo,parte:st.parte&&st.parte.id,parteTitulo:st.parte&&st.parte.tit,vApp:vApp(),ts:Date.now()};
  const r=L.scriptsGuardarTeste(localStorage,pac);
  if(!r.ok){
    if(typeof toast==='function')toast(r.erro==='sintaxe'?'Esse script tem um erro e não pode ser testado. Corrija e tente de novo.':'Não deu para guardar o teste.');
    return;
  }
  try{sessionStorage.setItem(L.SCRIPTS_VOLTA,JSON.stringify({tela:'ver',parte:st.parte&&st.parte.id,arq:st.arq}));}catch(e){}
  if(typeof toast==='function')toast('Testando só neste celular…');
  location.reload();
}

function enviar(bx){
  if(!pode()){if(typeof toast==='function')toast('Só o Super ADM pode enviar.');return;}
  if(!podeEnviarAgora()){if(typeof toast==='function')toast('Teste no seu celular antes de enviar.');return;}
  const ped=L.scriptsMontarPedido({arquivo:st.arq,codigo:st.codigo,original:st.original,parte:st.parte&&st.parte.id,parteTitulo:st.parte&&st.parte.tit,vApp:vApp(),ts:Date.now(),testouEm:Date.now()});
  if(!ped){if(typeof toast==='function')toast('Não deu para montar o pedido.');return;}
  const txt=L.scriptsPedidoTxt(ped);
  try{localStorage.setItem(L.SCRIPTS_PEDIDO,txt);}catch(e){}
  const nome='qlog-pedido-script-'+ped.arquivo.replace('.','-')+'-'+ped.ts+'.json';
  bx.innerHTML=`
    <div class="dspBar"><button type="button" class="big alt icb" id="scrVoltar">${ic('voltar')} Voltar</button>${selo()}</div>
    <h2 class="dspTit">${ic('equipe')} Pedido montado</h2>
    <div class="avisoScr">
      <div class="avTit">${ic('atencao')} Nada foi publicado</div>
      O pedido está pronto. Envie este arquivo para o Jarvis revisar, rodar os testes e publicar pelo caminho de sempre, com o seu ok. A equipe ainda não vê a mudança.
    </div>
    <p class="dspHint">Arquivo: <b>${esc(nome)}</b></p>
    <button type="button" class="big icb" id="scrCop">${ic('documento')} Copiar o pedido</button>
    <button type="button" class="big ok icb" id="scrComp">${ic('compartilhar')} Compartilhar o pedido</button>
    <button type="button" class="big alt icb" id="scrBaix">${ic('baixar')} Baixar o arquivo</button>`;
  bx.querySelector('#scrVoltar').onclick=()=>verHTML(bx);
  bx.querySelector('#scrCop').onclick=async()=>{
    try{await navigator.clipboard.writeText(txt);if(typeof toast==='function')toast('Pedido copiado.');}
    catch(e){if(typeof toast==='function')toast('Não deu para copiar. Use Compartilhar ou Baixar.');}
  };
  bx.querySelector('#scrComp').onclick=()=>{
    if(window.AndroidShare){try{AndroidShare.share(txt,'[]',nome);return;}catch(e){}}
    if(navigator.share){navigator.share({title:'Pedido de script Qlog',text:txt}).catch(()=>{});return;}
    if(typeof toast==='function')toast('Use Copiar ou Baixar neste aparelho.');
  };
  bx.querySelector('#scrBaix').onclick=()=>{
    try{
      const blob=new Blob([txt],{type:'application/json'});
      const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=nome;a.click();
      setTimeout(()=>URL.revokeObjectURL(a.href),2000);
    }catch(e){if(typeof toast==='function')toast('Não deu para baixar.');}
  };
}

window.scriptsPainel=function(bx){
  if(!bx)return;
  if(!pode()){bx.innerHTML='<p class="dspHint">Esta parte é só do Super ADM.</p>';return;}
  if(st.tela==='ver'&&st.parte&&st.codigo){verHTML(bx);ligarNada();return;}
  if(st.tela==='editar'&&st.parte){editarHTML(bx);return;}
  st.tela='lista';
  bx.innerHTML=listaHTML();
  ligarLista(bx);
};
function ligarNada(){}

async function restaurarVolta(){
  let v=null;
  try{v=JSON.parse(sessionStorage.getItem(L.SCRIPTS_VOLTA)||'null');sessionStorage.removeItem(L.SCRIPTS_VOLTA);}catch(e){v=null;}
  if(!v||!v.parte)return;
  if(typeof abrirAdm==='function')abrirAdm('sc');
  // abrirAdm renderiza; depois no próximo tick tentamos abrir a parte
  setTimeout(async()=>{
    const bx=document.getElementById('admBox');
    if(!bx||!pode())return;
    st.busca='';st.aberto=v.parte;
    try{
      await abrirVer(bx,v.parte,v.arq);
      if(v.tela==='editar')editarHTML(bx);
      if(window.__qlogTesteAtivo&&typeof toast==='function')toast('Teste ligado só neste celular.');
    }catch(e){}
  },80);
}

document.addEventListener('DOMContentLoaded',()=>{
  toastFalha();
  marcarTestouSeAtivo();
  restaurarVolta();
});
window.scriptsPainelSt=()=>st;
})();
