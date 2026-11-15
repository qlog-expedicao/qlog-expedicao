/* v4.3.54: carregador de script de teste (só neste aparelho). Se der erro ao carregar, volta ao original.
   Saída de emergência: ?limparTeste=1 (ou #limparTeste) e 5 toques rápidos no cabeçalho. */
(function(){
  var KEY='qlog_script_teste',TESTOU='qlog_script_testou',FAIL='qlog_script_falhou';
  var ARQS={'app.js':1,'logic.js':1,'tema.js':1,'style.css':1,'nuvem.js':1};
  var ORDEM=['tema.js','logic.js','app.js','scripts-painel.js','nuvem.js'];
  function limpar(m){
    try{localStorage.removeItem(KEY);localStorage.removeItem(TESTOU);}catch(e){}
    try{
      var msg='O script de teste deu erro e voltou ao original.';
      if(m==='gesto'||m==='pedido'||m==='banner'||m==='desfazer'||m==='manual')msg='O script de teste foi desligado. Voltou ao original.';
      if(m==='nao-dono')msg='O script de teste só vale para o Super ADM e foi desligado.';
      sessionStorage.setItem(FAIL,msg);
    }catch(e){}
  }
  window.QlogScriptsLimpar=function(m){limpar(m||'manual');location.reload();};
  if(/(?:[?&#]limparTeste=1\b|#limparTeste\b)/.test(String(location.href)+String(location.hash))){
    limpar('pedido');
    try{
      var s=location.search.replace(/[?&]limparTeste=1/g,'').replace(/^&/,'?');
      if(s==='?')s='';
      history.replaceState({},'',location.pathname+s+location.hash.replace(/#limparTeste\b/,''));
    }catch(e){}
  }
  document.addEventListener('DOMContentLoaded',function(){
    var n=0,t=0,hd=document.querySelector('header');
    if(!hd)return;
    hd.addEventListener('click',function(){
      var a=Date.now();if(a-t>900)n=0;t=a;n++;
      if(n>=5){n=0;try{if(localStorage.getItem(KEY)){limpar('gesto');location.reload();}}catch(e){}}
    },false);
  });
  var pac=null;
  try{var raw=localStorage.getItem(KEY);if(raw)pac=JSON.parse(raw);}catch(e){limpar('json');pac=null;}
  if(pac&&!(ARQS[pac.arquivo]&&typeof pac.codigo==='string'&&pac.codigo.length)){limpar('pacote');pac=null;}
  // v4.3.60: com a CSP não dá para usar new Function aqui; um erro ao carregar o script de teste já volta ao original (listener abaixo)
  if(pac&&!/\.css$/.test(pac.arquivo)&&!document.querySelector('meta[http-equiv="Content-Security-Policy"]')){
    try{new Function(pac.codigo);}catch(e){limpar('sintaxe');pac=null;}
  }
  function srcDe(nome){
    if(!pac||pac.arquivo!==nome)return nome;
    try{return URL.createObjectURL(new Blob([pac.codigo],{type:/\.css$/.test(nome)?'text/css':'text/javascript'}));}
    catch(e){limpar('blob');return nome;}
  }
  function banner(){
    if(!window.__qlogTesteAtivo)return;
    var b=document.createElement('div');b.id='scrTesteBan';
    b.setAttribute('style','position:sticky;top:0;z-index:8;background:#1b8a3a;color:#fff;padding:8px 12px;font-size:14px;font-weight:bold;display:flex;align-items:center;gap:8px;flex-wrap:wrap');
    b.innerHTML='Você está testando um script só neste celular. <button type="button" id="scrSairTeste" style="border:0;border-radius:8px;padding:6px 10px;font-size:14px;font-weight:bold;background:#fff;color:#1b8a3a">Voltar ao original</button>';
    var nav=document.querySelector('nav');
    if(nav&&nav.parentNode)nav.parentNode.insertBefore(b,nav.nextSibling);
    else document.body.insertBefore(b,document.body.firstChild);
    var bt=document.getElementById('scrSairTeste');
    if(bt)bt.onclick=function(){window.QlogScriptsLimpar('banner');};
  }
  if(pac){
    window.__qlogTeste=pac;window.__qlogTesteAtivo=true;
    if(pac.arquivo==='style.css'){
      var lk=document.querySelector('link[rel="stylesheet"][href="style.css"]');
      if(lk){try{lk.href=srcDe('style.css');}catch(e){limpar('css');window.__qlogTesteAtivo=false;}}
    }else{
      var carregando=true;
      window.addEventListener('error',function(ev){
        if(!carregando||!window.__qlogTesteAtivo)return;
        var f=(ev&&ev.filename)||'';
        if(f.indexOf('blob:')===0||(ev&&ev.error)){
          limpar('erro');try{ev.preventDefault();}catch(e){}
          location.reload();
        }
      },true);
      document.addEventListener('DOMContentLoaded',function(){setTimeout(function(){carregando=false;},80);});
    }
    document.addEventListener('DOMContentLoaded',banner);
  }
  for(var i=0;i<ORDEM.length;i++){
    document.write('<script src="'+srcDe(ORDEM[i])+'"><\/script>');
  }
})();
