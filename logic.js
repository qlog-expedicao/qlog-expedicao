(function(root){
const pad=n=>String(n).padStart(2,'0');
function fmtData(ts){const d=new Date(ts);return pad(d.getDate())+'/'+pad(d.getMonth()+1)+'/'+String(d.getFullYear()).slice(2);}
function fmtHora(ts){const d=new Date(ts);return pad(d.getHours())+':'+pad(d.getMinutes());}
function parseNFs(s){return String(s||'').split(/[^0-9A-Za-z]+/).map(x=>x.trim()).filter(Boolean).filter((x,i,a)=>a.indexOf(x)===i);}
const VT=[['palete','palete','paletes'],['volume','volume','volumes']];
// v2.9: só Paletes e Volumes. Registros antigos: caixa+unidade viram volume
function vtNorm(v){v=v||{};const n=k=>Number(v[k])||0;return {palete:n('palete'),volume:n('volume')+n('caixa')+n('unidade')};}
function volTotal(v){const n=vtNorm(v);return n.palete+n.volume;}
function volTxt(r){const v=r.vtipos?vtNorm(r.vtipos):null;const n=Number(r.volumes)||0;if(!v)return String(n);
  const p=VT.filter(([k])=>Number(v[k])>0).map(([k,a,b])=>v[k]+' '+(Number(v[k])===1?a:b));return n+(p.length?' ('+p.join(', ')+')':'');}
const normCod=s=>String(s||'').trim().toUpperCase();
function parseCods(s){return String(s||'').split(/[\s,;]+/).map(normCod).filter(Boolean).filter((x,i,a)=>a.indexOf(x)===i);}
function conferir(esperados,lido){const l=normCod(lido);return {cod:l,ok:!!l&&esperados.map(normCod).includes(l)};}
function confStatus(c){if(!c||!(c.lidos||[]).length)return '';if(c.lidos.some(x=>!x.ok))return 'DIVERGENTE';
  const lid=c.lidos.map(x=>x.cod);return (c.esperados||[]).every(e=>lid.includes(normCod(e)))?'OK':'INCOMPLETA';}
const PFX={coleta:'COL-',saida:'EXP-',recebimento:'REC-',estorno:'EST-'};
const tipoNome=t=>t==='coleta'?'Coleta':t==='recebimento'?'Recebimento':t==='estorno'?'Estorno':'Saída';
function codigo(r){return (PFX[r.tipo]||'EXP-')+String(r.seq||0).padStart(4,'0');}
function proxSeq(regs,tipo){return regs.filter(r=>r.tipo===tipo).reduce((m,r)=>Math.max(m,r.seq||0),0)+1;}
// v2.8 Recebimento: itens {cod,qtd}; lista de SKU esperada pode chegar depois
const codItem=s=>String(s==null?'':s).trim();
function addItem(itens,cod,n){cod=codItem(cod);n=n==null?1:Number(n);const out=(itens||[]).map(x=>({cod:x.cod,qtd:x.qtd}));if(!cod)return out;
  const i=out.findIndex(x=>x.cod===cod);if(i<0){if(n>0)out.push({cod,qtd:n});}else{out[i].qtd+=n;if(out[i].qtd<=0)out.splice(i,1);}return out;}
function itensTot(itens){return {cods:(itens||[]).length,un:(itens||[]).reduce((s,x)=>s+(Number(x.qtd)||0),0)};}
function parseSkuLista(txt){let out=[];const ls=String(txt||'').replace(/^\ufeff/,'').split(/\r?\n/);
  ls.forEach((l,ix)=>{l=l.trim();if(!l)return;let cod,q;const f=l.split(/[;,\t]/).map(x=>x.trim().replace(/^"(.*)"$/,'$1').trim());
    if(f.length>1){cod=f[0];q=f[1];}else{const m=l.match(/^(.*\S)\s+(\d+)$/);if(m){cod=m[1];q=m[2];}else{cod=l;q='1';}}
    if(!/^\d+$/.test(String(q))){if(ix===0&&f.length>1)return;q='1';}
    cod=codItem(cod);if(cod)out=addItem(out,cod,parseInt(q,10)||0);});return out;}
function skuTexto(lista){return (lista||[]).map(x=>x.cod+';'+x.qtd).join('\n');}
function conferirSku(itens,esp){const ok=[],dif=[],faltou=[],amais=[];const lid={};(itens||[]).forEach(x=>{lid[codItem(x.cod)]=(lid[codItem(x.cod)]||0)+(Number(x.qtd)||0);});
  const em={};(esp||[]).forEach(x=>{em[codItem(x.cod)]=(em[codItem(x.cod)]||0)+(Number(x.qtd)||0);});
  for(const c of Object.keys(em)){const l=lid[c]||0;if(!l)faltou.push({cod:c,esp:em[c],lido:0});else if(l===em[c])ok.push({cod:c,esp:em[c],lido:l});else dif.push({cod:c,esp:em[c],lido:l});}
  for(const c of Object.keys(lid))if(!(c in em)&&lid[c]>0)amais.push({cod:c,esp:0,lido:lid[c]});
  const status=!(esp&&esp.length)?'AGUARDANDO SKU':(dif.length||faltou.length||amais.length)?'DIVERGENTE':'CONFERIDO OK';return {ok,dif,faltou,amais,status};}
function recStatus(r){return r&&r.tipo==='recebimento'?conferirSku(r.itens,r.skuEsp).status:'';}
function cheio(v){v=String(v==null?'':v).trim();return v&&!/^[-–—]+$/.test(v);}
function nfsTxt(nfs){const o=[];(nfs||[]).forEach(n=>{n=String(n).trim().replace(/^NF[-\s]*e?\s*/i,'').replace(/^0+(?=\d)/,'');if(n&&!o.includes(n))o.push(n);});return o.join(', ');}
function fotosTxt(r){const p=[],a=(r.fotos||[]).length,b=(r.romaneio||[]).length,c=(r.caminhao||[]).length;
  if(a)p.push(a+(a===1?' produto':' produtos'));if(b)p.push(b+(b===1?' romaneio':' romaneios'));if(c)p.push(c+(c===1?' caminhão':' caminhões'));return p.join(', ');}
function resumoBase(r,titulo,rotulo){const x=[titulo+' '+codigo(r)];if(cheio(r.cliente))x.push(rotulo+': '+r.cliente.trim());const n=nfsTxt(r.nfs);if(n)x.push('NFs: '+n);return x;}
function resumoFim(r,x){if(cheio(r.motorista))x.push('Motorista: '+r.motorista.trim());if(cheio(r.placa))x.push('Placa: '+r.placa.trim());
  x.push('Data: '+fmtData(r.ts)+' às '+fmtHora(r.ts));return x;}
function resumoRec(r){const t=itensTot(r.itens),c=conferirSku(r.itens,r.skuEsp);const x=resumoBase(r,'📥 RECEBIMENTO','Fornecedor');
  if(t.cods)x.push('Itens: '+t.cods+' códigos · '+t.un+' unidades');resumoFim(r,x);
  if(r.skuEsp&&r.skuEsp.length){x.push('Conferência SKU: '+c.status);if(c.status==='DIVERGENTE')x.push('OK '+c.ok.length+' · Qtd diferente '+c.dif.length+' · Faltou '+c.faltou.length+' · A mais '+c.amais.length);}
  const it=r.itens||[],M=30;if(it.length){x.push('Códigos:');it.slice(0,M).forEach(i=>x.push(i.cod+' x '+i.qtd));if(it.length>M)x.push('... e mais '+(it.length-M)+' códigos');}
  if(r.tipo==='estorno'&&cheio(r.motivo))x.push('Motivo: '+r.motivo.trim());if(cheio(r.obs))x.push('Obs: '+r.obs.trim());const f=fotosTxt(r);if(f)x.push('Fotos: '+f);return x.join('\n');}
function resumo(r){if(r.tipo==='recebimento')return resumoRec(r);
  const x=resumoBase(r,r.tipo==='coleta'?'📦 COLETA':r.tipo==='estorno'?'↩️ ESTORNO':'🚚 SAÍDA','Transportadora');const v=Number(r.volumes)||0;
  if(v)x.push('Volumes: '+v);resumoFim(r,x);
  const cs=confStatus(r.conf);if(cs){x.push('Conferência: '+cs);const bad=r.conf.lidos.filter(z=>!z.ok).map(z=>z.cod);if(bad.length)x.push('Códigos diferentes: '+bad.join(', '));}
  if(r.tipo==='estorno'&&cheio(r.motivo))x.push('Motivo: '+r.motivo.trim());if(cheio(r.obs))x.push('Obs: '+r.obs.trim());const f=fotosTxt(r);if(f)x.push('Fotos: '+f);return x.join('\n');}
function filtrar(regs,q){q=String(q||'').trim().toLowerCase(); if(!q)return regs;
  return regs.filter(r=>(r.cliente||'').toLowerCase().includes(q)||(r.nfs||[]).some(n=>n.toLowerCase().includes(q))||fmtData(r.ts).includes(q)||(r.placa||'').toLowerCase().includes(q)||codigo(r).toLowerCase().includes(q)||(r.itens||[]).some(i=>String(i.cod).toLowerCase().includes(q))||tipoNome(r.tipo).toLowerCase().includes(q)||String(r.motivo||'').toLowerCase().includes(q));}
function relatorio(regs){const dia={},cli={};
  for(const r of regs){const d=fmtData(r.ts),c=r.cliente||'Sem transportadora',v=Number(r.volumes)||0;
    for(const [o,k] of [[dia,d],[cli,c]]){o[k]=o[k]||{reg:0,vol:0,coleta:0,saida:0,receb:0,palete:0,volume:0};o[k].reg++;o[k].vol+=v;for(const [t] of VT)o[k][t]+=vtNorm(r.vtipos)[t];{const z=r.tipo==='coleta'?'coleta':r.tipo==='recebimento'?'receb':r.tipo==='estorno'?'estorno':'saida';o[k][z]=(o[k][z]||0)+1;};}}
  return {dia,cli};}
function csv(regs){const q=v=>'"'+String(v==null?'':v).replace(/"/g,'""')+'"';
  const h=['Código','Tipo','Transportadora','NFs','Volumes','Paletes','Volumes (qtd)','Data','Hora','Motorista','Placa','Observação','Fotos produtos','Fotos romaneio','Fotos caminhão','Conferência','Itens'];
  return '\ufeff'+[h.map(q).join(';')].concat(regs.map(r=>[codigo(r),tipoNome(r.tipo),r.cliente,(r.nfs||[]).join('-'),r.volumes,...VT.map(([t])=>vtNorm(r.vtipos)[t]),fmtData(r.ts),fmtHora(r.ts),r.motorista,r.placa,r.obs,(r.fotos||[]).length,(r.romaneio||[]).length,(r.caminhao||[]).length,r.tipo==='recebimento'?recStatus(r):confStatus(r.conf),(r.itens||[]).map(i=>i.cod+' x '+i.qtd).join(' | ')].map(q).join(';'))).join('\r\n');}

function mesKey(ts){const d=new Date(ts);return String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear();}
function meses(regs){return [...new Set(regs.map(r=>mesKey(r.ts)))];}
function htmlMes(regs,mes){const e=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const v=regs.filter(r=>mesKey(r.ts)===mes).sort((a,b)=>a.ts-b.ts);
  const im=(a,t)=>(a&&a.length)?'<h4>'+t+' ('+a.length+')</h4><div class="f">'+a.map(d=>'<a href="'+d+'" target="_blank"><img src="'+d+'"></a>').join('')+'</div>':'';
  return '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Qlog Expedição '+e(mes)+'</title><style>body{font-family:Arial;background:#eef2f6;margin:0;padding:16px}h1{color:#354350}input{width:100%;font-size:18px;padding:10px;box-sizing:border-box}.r{background:#fff;border-radius:10px;padding:12px;margin:12px 0}pre{white-space:pre-wrap;font-size:15px}.f img{height:160px;margin:4px;border-radius:6px}table{border-collapse:collapse;margin:6px 0}td,th{border:1px solid #ccd;padding:4px 8px;text-align:left}</style></head><body>'+
  '<div style="display:flex;align-items:center;gap:12px"><img src="data:image/png;base64,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" alt="Qlog" style="width:64px;height:64px;border-radius:12px;background:#fff"><h1 style="margin:0">Qlog Expedição: registros de '+e(mes)+'</h1></div><p>'+v.length+' registros. Clique numa foto para abrir grande.</p><input id="q" placeholder="Buscar NF, transportadora, data, placa ou EXP-0001" oninput="var q=this.value.toLowerCase();document.querySelectorAll(\'.r\').forEach(function(x){x.style.display=x.dataset.s.indexOf(q)>-1?\'\':\'none\'})">'+
  v.map(r=>{const t=resumo(r);return '<div class="r" data-s="'+e(t.toLowerCase())+'"><pre>'+e(t)+'</pre>'+recHtml(r,e)+im(r.romaneio,'Romaneio')+im(r.caminhao,'Caminhão carregado')+im(r.fotos,'Produtos')+'</div>';}).join('')+'</body></html>';}
function recHtml(r,e){if(r.tipo!=='recebimento')return '';const c=conferirSku(r.itens,r.skuEsp);
  let h='<h4>Itens recebidos</h4><table><tr><th>Código</th><th>Qtd</th></tr>'+(r.itens||[]).map(i=>'<tr><td>'+e(i.cod)+'</td><td>'+e(i.qtd)+'</td></tr>').join('')+'</table><h4>Conferência SKU: '+e(c.status)+'</h4>';
  if(r.skuEsp&&r.skuEsp.length)h+='<table><tr><th>Grupo</th><th>Código</th><th>Esperado</th><th>Lido</th></tr>'+[['✔ OK',c.ok],['⚠ Quantidade diferente',c.dif],['✖ Faltou',c.faltou],['➕ A mais',c.amais]].map(([g,a])=>a.map(x=>'<tr><td>'+g+'</td><td>'+e(x.cod)+'</td><td>'+x.esp+'</td><td>'+x.lido+'</td></tr>').join('')).join('')+'</table>';return h;}
// v2.5 OCR: candidatos de código no texto lido (ex.: OM0003, BA0003, 164)
function extrairCods(texto){const out=[];const add=t=>{if(!out.includes(t))out.push(t);};
  const toks=String(texto||'').toUpperCase().split(/[^A-Z0-9]+/).filter(Boolean);
  const mix=toks.filter(t=>t.length>=4&&/[A-Z]/.test(t)&&/[0-9]/.test(t)),dig=toks.filter(t=>/^[0-9]{3,}$/.test(t));
  mix.forEach(add);dig.forEach(add);return out;}
// v2.6: OCR pode trocar O/0, I/1 ou inserir/perder 1 caractere (nunca troca dígito)
function ocrNorm(t){return String(t).toUpperCase().replace(/O/g,'0').replace(/[IL]/g,'1').replace(/S/g,'5').replace(/B/g,'8');}
function dist1(a,b){if(a===b)return 0;if(Math.abs(a.length-b.length)>1)return 2;let i=0,j=0,e=0;
  while(i<a.length&&j<b.length){if(a[i]===b[j]){i++;j++;continue;}if(++e>1)return 2;if(a.length>b.length)i++;else if(b.length>a.length)j++;else return 2;}
  return e+(a.length-i)+(b.length-j);}
function casarEsperado(cands,esp){const out=[];for(const e of esp||[])if(e.length>=4&&(cands||[]).some(c=>dist1(ocrNorm(c),ocrNorm(e))<=1)&&!out.includes(e))out.push(e);return out;}
// v3.2 Localizar códigos: ignora espaço/traço/maiúsc.; aceita o código dentro de texto maior
const locNorm=t=>String(t||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
// v3.3: aceita tabela do e-mail (SAP | DESCRIÇÃO | QUANTIDADE DE PEÇAS), com tab, | e células quebradas em linhas; ou lista simples
const QTD_RE=/^(.*?)\s*\b(\d+)\s*(PE[CÇ]AS?|PECAS?|P[CÇ]S?|UNIDADES?|UND?|UN)\.?\s*$/i;
const HEAD_RE=/^(SAP|C[OÓ]DIGO|DESCRI[CÇ][AÃ]O|QUANTIDADE( DE PE[CÇ]AS)?|QTD\.?|ITEM)$/i;
function locAliases(desc){return String(desc||'').split(/[;,]/).map(x=>x.trim()).filter(x=>locNorm(x).length>=4);}
function parseLocLista(txt){try{const t=locPrep(txt);
  const cells=t.split(/[\t\r\n|]+/).map(x=>x.trim()).filter(Boolean).filter(x=>!HEAD_RE.test(x.replace(/[:;]+$/,'')));
  const out=[];const put=it=>{if(!it||!locNorm(it.cod))return;const k=locNorm(it.cod),o=out.find(x=>locNorm(x.cod)===k);
    if(o){it.al.forEach(a=>{if(!o.al.includes(a))o.al.push(a);});if(it.alvo)o.alvo=(o.alvo||0)+it.alvo;}else out.push(it);};
  const tabela=cells.some(c=>QTD_RE.test(c))&&cells.some(c=>/^\d{5,}\b/.test(c));
  if(!tabela){t.split(/[\r\n,;\t|]+/).forEach(l=>{const v=l.trim();if(v&&!HEAD_RE.test(v))put({cod:v,al:[],alvo:null,n:0});});return out;}
  let cur=null,prev=null;
  for(let c of cells){const m=c.match(/^(\d{5,})\b\s*(.*)$/);
    if(m){put(cur);cur={cod:m[1],al:[],alvo:null,n:0};c=m[2].trim();if(!c)continue;}
    if(!cur){if(prev&&!QTD_RE.test(c))locAliases(c).forEach(x=>{const o=out.find(i=>i.cod===prev.cod)||prev;if(!o.al.includes(x))o.al.push(x);});continue;}const q=c.match(QTD_RE);
    if(q){locAliases(q[1]).forEach(a=>{if(!cur.al.includes(a))cur.al.push(a);});cur.alvo=+q[2]||null;put(cur);prev=cur;cur=null;continue;}
    locAliases(c).forEach(a=>{if(!cur.al.includes(a))cur.al.push(a);});}
  put(cur);return out;}catch(e){return [];}}
function locKeys(it){return typeof it==='string'?[it]:[it.cod].concat(it.al||[]);}
function locCasa(texto,lista){const t=locNorm(texto),to=ocrNorm(t),out=[];if(!t)return out;
  for(const it of lista||[]){let ok=false;for(const c of locKeys(it)){const k=locNorm(c);if(!k)continue;ok=k.length<3?t===k:t.includes(k);if(!ok&&k.length>=4)ok=to.includes(ocrNorm(k));if(ok)break;}
    const id=typeof it==='string'?it:it.cod;if(ok&&!out.includes(id))out.push(id);}return out;}
function validar(r){const e=[];if(r.tipo==='recebimento'){if(!(r.itens||[]).length)e.push('Leia ou adicione pelo menos um código');return e;} if(!r.cliente)e.push('Escolha a transportadora'); if(!(r.nfs||[]).length)e.push('Coloque pelo menos uma NF'); if(!(Number(r.volumes)>0))e.push('Coloque os volumes'); return e;}


// v3.4: limpa colagem de WhatsApp/Excel antes de ler
function locPrep(txt){return String(txt||'').replace(/^\ufeff/,'').replace(/\u00a0/g,' ').split(/\r?\n/).map(l=>{
  l=l.replace(/^\s*\[[^\]]{4,30}\]\s*[^:]{1,40}:\s*/,'').replace(/^\s*\d{1,2}\/\d{1,2}\/\d{2,4},?\s+\d{1,2}:\d{2}\s*-\s*[^:]{1,40}:\s*/,'');
  const c=l.split(/\t|\|/).map(x=>x.trim());
  if(c.length>=2&&/^\d{5,}$/.test(c[0])&&/^\d+$/.test(c[c.length-1]))c[c.length-1]+=' PEÇAS';
  return c.length>1?c.join('\t'):l;}).join('\n');}
// v3.4: prévia — marca linhas duvidosas
function locPrevia(txt){let itens=[];try{itens=parseLocLista(txt);}catch(e){itens=[];}
  const tab=itens.some(x=>x.alvo);
  itens.forEach(x=>{const k=locNorm(x.cod);x.duv=tab?(!/^\d{5,}$/.test(k)||!x.alvo):(k.length<3||/\s{2,}/.test(x.cod)||x.cod.length>40);});
  return {itens,tab,duv:itens.filter(x=>x.duv).length};}
function locLinha(x){return x.cod+(x.al&&x.al.length?' | '+x.al.join(';'):'')+(x.alvo?' | '+x.alvo+' PEÇAS':'');}
// v3.4: junta as linhas do OCR (print/foto) por posição em linhas de tabela
function ocrLinhas(ls){try{const a=(ls||[]).filter(x=>x&&String(x.t||'').trim()).map(x=>({t:String(x.t).trim(),x:+x.x||0,y:+x.y||0,h:Math.max(1,+x.h||10)}));
  a.sort((p,q)=>(p.y+p.h/2)-(q.y+q.h/2));const g=[];
  for(const l of a){const cy=l.y+l.h/2,r=g[g.length-1];if(r&&Math.abs(cy-r.cy)<Math.max(r.h,l.h)*0.6){r.c.push(l);r.cy=(r.cy*(r.c.length-1)+cy)/r.c.length;}else g.push({cy,h:l.h,c:[l]});}
  return g.map(r=>r.c.sort((p,q)=>p.x-q.x).map(l=>l.t).join('\t')).join('\n');}catch(e){return '';}}

// v4.0 nuvem: sha256 (para a senha da equipe nunca ir em texto) e limpeza do registro para a nuvem
function sha256(str){const K=[],H=[];let n=2,c=0;const fr=x=>((x-Math.floor(x))*4294967296)|0;
  while(c<64){let p=true;for(let d=2;d*d<=n;d++)if(n%d===0){p=false;break;}if(p){if(c<8)H[c]=fr(Math.pow(n,1/2));K[c]=fr(Math.pow(n,1/3));c++;}n++;}
  const b=unescape(encodeURIComponent(String(str))),w=[],l=b.length*8;for(let i=0;i<b.length;i++)w[i>>2]|=b.charCodeAt(i)<<(24-(i%4)*8);
  w[l>>5]|=0x80<<(24-l%32);w[((l+64>>9)<<4)+15]=l;const h=H.slice(),r=(x,y)=>(x>>>y)|(x<<(32-y));
  for(let j=0;j<w.length;j+=16){const W=[];let [a,bb,cc,d,e,f,g,hh]=h;
    for(let i=0;i<64;i++){W[i]=i<16?w[j+i]|0:(r(W[i-2],17)^r(W[i-2],19)^(W[i-2]>>>10))+W[i-7]+(r(W[i-15],7)^r(W[i-15],18)^(W[i-15]>>>3))+W[i-16]|0;
      const t1=hh+(r(e,6)^r(e,11)^r(e,25))+((e&f)^(~e&g))+K[i]+W[i]|0,t2=(r(a,2)^r(a,13)^r(a,22))+((a&bb)^(a&cc)^(bb&cc))|0;hh=g;g=f;f=e;e=d+t1|0;d=cc;cc=bb;bb=a;a=t1+t2|0;}
    [a,bb,cc,d,e,f,g,hh].forEach((v,i)=>h[i]=h[i]+v|0);}
  return h.map(v=>('00000000'+(v>>>0).toString(16)).slice(-8)).join('');}
function senhaHash(s){return sha256('qlog-equipe-v1:'+String(s||'').trim());}
const FOTO_CAMPOS=['fotos','romaneio','caminhao'];
function regNuvem(r,autor,uid){const o={};for(const k in r){if(FOTO_CAMPOS.includes(k)||FOTO_CAMPOS.some(f=>k==='n_'+f))continue;if(r[k]!==undefined)o[k]=r[k];}
  // v4.1: conta as fotos do celular; se o celular não tem as fotos (registro de outro), mantém a contagem da nuvem
  for(const k of FOTO_CAMPOS){const v=r[k],n=Array.isArray(v)?v.length:(v?1:0);if(n||k in r||('n_'+k) in r)o['n_'+k]=n||(Number(r['n_'+k])||0);}
  delete o.autor;delete o.fotosDaNuvem;delete o.fotosBaixadas;delete o.limpo;o.autorUid=r.autorUid||uid||'';return JSON.parse(JSON.stringify(o));}
// v4.0.4: nome de quem fez nunca vai para a nuvem nem fica no celular de membros
function semAutor(r){if(!r||!('autor' in r))return r;const o=Object.assign({},r);delete o.autor;return o;}
// v4.0.5: nunca troca fotos que já estão no celular por lista vazia
function regMescla(local,nuvem,fn){const o=Object.assign({},nuvem);
  if(fn){for(const k of FOTO_CAMPOS)o[k]=(fn[k]||[]).slice();o.fotosDaNuvem=true;o.fotosBaixadas=nuvem.fotosTs||0;o.nuvem=true;return o;}
  for(const k of FOTO_CAMPOS){const v=local&&local[k];o[k]=Array.isArray(v)?v.slice():(v?[v]:[]);}
  if(local&&local.fotosDaNuvem){o.fotosDaNuvem=true;o.fotosBaixadas=local.fotosBaixadas||0;}o.nuvem=true;return o;}
// v4.1: fotos leves na nuvem (Firestore, subcoleção registros/{id}/fotos/{campo_i})
const FOTO_ALVO=150*1024;
function tamDataUrl(d){d=String(d||'');const b=d.slice(d.indexOf(',')+1);return Math.floor(b.length*3/4)-(b.endsWith('==')?2:b.endsWith('=')?1:0);}
function leveTentativas(){return [[1600,0.72],[1600,0.6],[1400,0.55],[1280,0.5],[1100,0.45],[960,0.42],[800,0.4],[640,0.38]];}
function fotoSig(d){d=String(d||'');return d.length+':'+d.slice(-48)+':'+d.slice(Math.floor(d.length/2),Math.floor(d.length/2)+24);}
function fotoDocs(r){const o=[];for(const k of FOTO_CAMPOS)(r[k]||[]).forEach((d,i)=>o.push({fid:k+'_'+i,campo:k,i,d}));return o;}
function fotosDeDocs(docs){const o={fotos:[],romaneio:[],caminhao:[]};(docs||[]).filter(x=>x&&FOTO_CAMPOS.includes(x.campo)&&typeof x.d==='string').sort((a,b)=>a.i-b.i).forEach(x=>o[x.campo].push(x.d));return o;}
// o celular precisa baixar fotos da nuvem? (nunca no celular que tem as originais)
function precisaFotos(local,nv){if(!nv||!FOTO_CAMPOS.some(k=>Number(nv['n_'+k])>0))return false;
  const tem=local&&FOTO_CAMPOS.some(k=>(local[k]||[]).length);if(tem&&!local.fotosDaNuvem)return false;
  if(!tem)return true;return FOTO_CAMPOS.some(k=>(local[k]||[]).length<(Number(nv['n_'+k])||0))||(local.fotosBaixadas||0)!==(nv.fotosTs||0);}
// quais fotos subir/apagar: só mexe numa categoria se o celular tem todas as fotos dela
function fotosSync(r,sigs){sigs=sigs||{};const subir=[],apagar=[],nsig={};
  for(const k of FOTO_CAMPOS){const a=r[k]||[],n=Number(r['n_'+k]);if(!a.length&&n>0)continue;
    a.forEach((d,i)=>{const fid=k+'_'+i,sg=fotoSig(d);nsig[fid]=sg;if(sigs[fid]!==sg)subir.push({fid,campo:k,i,d});});
    const ant=Math.max(Number(r['n_'+k])||0,Object.keys(sigs).filter(f=>f.indexOf(k+'_')===0).length);for(let i=a.length;i<Math.max(ant,a.length);i++)apagar.push(k+'_'+i);}
  return {subir,apagar,sigs:nsig};}
// v4.1: arquivo mensal
function mesId(ts){const d=new Date(ts);return d.getFullYear()+'-'+pad(d.getMonth()+1);}
const DIA=86400000;
function mesArquivar(regs,hoje,feitos){const atual=mesId(hoje);feitos=feitos||[];
  const ms=[...new Set((regs||[]).map(r=>mesId(r.ts)))].filter(m=>m<atual&&!feitos.includes(m)).sort();return ms[0]||'';}
function paraLimpar(regs,hoje,feitos){feitos=feitos||[];return (regs||[]).filter(r=>r.ts<hoje-30*DIA&&feitos.includes(mesId(r.ts))).map(r=>r.id);}
function manterAoRemover(loc,feitos){return !!loc&&(feitos||[]).includes(mesId(loc.ts));}
function nomeMes(m){const N=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];return N[+m.slice(5,7)-1]+' de '+m.slice(0,4);}
function pastaReg(r){return codigo(r)+'_'+fmtData(r.ts).replace(/\//g,'-')+(cheio(r.cliente)?'_'+semAcento(r.cliente).replace(/ /g,'-').slice(0,30):'');}
function arquivoItens(regs,mes){const v=(regs||[]).filter(r=>mesId(r.ts)===mes).sort((a,b)=>a.ts-b.ts),raiz='Qlog_'+mes+'/',o=[{nome:raiz+'registros.csv',texto:csv(v)}];
  const T={romaneio:'romaneio',caminhao:'caminhao',fotos:'produto'};
  for(const r of v){const p=raiz+'fotos/'+pastaReg(r)+'/';o.push({nome:p+'resumo.txt',texto:resumo(r)+(r.editadoEm?'\n'+editadoTxt(r):'')});
    for(const k of FOTO_CAMPOS)(r[k]||[]).forEach((d,i)=>o.push({nome:p+T[k]+'_'+(i+1)+'.jpg',dataUrl:d}));}
  return {itens:o,regs:v.length,fotos:o.filter(x=>x.dataUrl).length};}
// zip simples (sem compressão; JPEG já é comprimido), em pedaços para não estourar a memória
const CRC=(()=>{const t=[];for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0;}return t;})();
function crc32(b){let c=0xFFFFFFFF;for(let i=0;i<b.length;i++)c=CRC[(c^b[i])&255]^(c>>>8);return (c^0xFFFFFFFF)>>>0;}
function utf8(s){return new Uint8Array(unescape(encodeURIComponent(String(s))).split('').map(c=>c.charCodeAt(0)));}
const B64='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function b64bytes(s){s=String(s||'').replace(/^data:[^,]*,/,'').replace(/[^A-Za-z0-9+/]/g,'');const o=new Uint8Array(Math.floor(s.length*3/4));let j=0,b=0,n=0;
  for(let i=0;i<s.length;i++){b=(b<<6)|B64.indexOf(s[i]);n+=6;if(n>=8){n-=8;o[j++]=(b>>n)&255;}}return o.subarray(0,j);}
function bytesB64(u){let o='';for(let i=0;i<u.length;i+=3){const a=u[i],b=u[i+1],c=u[i+2];o+=B64[a>>2]+B64[((a&3)<<4)|(b>>4&15)]+(i+1<u.length?B64[((b&15)<<2)|(c>>6&3)]:'=')+(i+2<u.length?B64[c&63]:'=');}return o;}
function Zip(){const cen=[];let off=0;const u16=(v)=>[v&255,v>>8&255],u32=v=>[v&255,v>>8&255,v>>16&255,v>>>24&255];
  return {add(nome,dados){const n=utf8(nome),c=crc32(dados);// data fixa 01/01/1980
      const h=new Uint8Array([0x50,0x4b,3,4,...u16(20),...u16(0x0800),...u16(0),0,0,0x21,0,...u32(c),...u32(dados.length),...u32(dados.length),...u16(n.length),...u16(0)]);
      const out=new Uint8Array(h.length+n.length+dados.length);out.set(h);out.set(n,h.length);out.set(dados,h.length+n.length);
      cen.push({n,c,len:dados.length,off});off+=out.length;return out;},
    fim(){const parts=cen.map(e=>{const h=new Uint8Array([0x50,0x4b,1,2,...u16(20),...u16(20),...u16(0x0800),...u16(0),0,0,0x21,0,...u32(e.c),...u32(e.len),...u32(e.len),...u16(e.n.length),...u16(0),...u16(0),...u16(0),...u16(0),...u32(0),...u32(e.off)]);
        const o=new Uint8Array(h.length+e.n.length);o.set(h);o.set(e.n,h.length);return o;});const tam=parts.reduce((s,p)=>s+p.length,0);
      const end=new Uint8Array([0x50,0x4b,5,6,0,0,0,0,...u16(cen.length),...u16(cen.length),...u32(tam),...u32(off),0,0]);
      const o=new Uint8Array(tam+end.length);let p=0;parts.forEach(x=>{o.set(x,p);p+=x.length;});o.set(end,p);return o;}};}
function itemBytes(it){return it.dataUrl?b64bytes(it.dataUrl):utf8(/\.csv$/.test(it.nome)&&it.texto[0]!=='\ufeff'?'\ufeff'+it.texto:it.texto);}

// v4.1: editar registro do Histórico
function podeEditar(r,u){u=u||{};if(!r)return false;if(!u.on)return true;if(u.admin)return true;return !!u.uid&&r.autorUid===u.uid;}
function editadoTxt(r){if(!r||!r.editadoEm)return '';const d=new Date(r.editadoEm);return '✏️ Editado em '+pad(d.getDate())+'/'+pad(d.getMonth()+1)+' às '+fmtHora(r.editadoEm);}
function fotoOp(arr,op,i,nova){const a=(arr||[]).slice();if(op==='remover'){if(i>=0&&i<a.length)a.splice(i,1);}else if(op==='trocar'){if(nova&&i>=0&&i<a.length)a[i]=nova;}else if(op==='adicionar'){if(nova)a.push(nova);}return a;}
function regEditar(r,c,fotos,ts){const o=Object.assign({},r);c=c||{};const t=v=>String(v==null?'':v).trim();
  if('cliente' in c)o.cliente=t(c.cliente);if('nfs' in c)o.nfs=parseNFs(c.nfs);
  if('motorista' in c)o.motorista=t(c.motorista);if('placa' in c)o.placa=t(c.placa).toUpperCase();if('obs' in c)o.obs=t(c.obs);if(r.tipo==='estorno'&&'motivo' in c)o.motivo=t(c.motivo);
  if(r.tipo!=='recebimento'&&('palete' in c||'volume' in c)){const v={palete:Math.max(0,parseInt(c.palete,10)||0),volume:Math.max(0,parseInt(c.volume,10)||0)};o.vtipos=v;o.volumes=volTotal(v);}
  if(fotos)for(const k of FOTO_CAMPOS)if(Array.isArray(fotos[k])){const antes=(r[k]||[]).length,depois=fotos[k];o[k]=depois.slice();
    if(antes||depois.length||fotos.mexeu&&fotos.mexeu[k])o['n_'+k]=depois.length;}
  delete o.autor;o.editadoEm=ts||Date.now();return o;}
function editValidar(r){const e=validar(r);return e;}
function renomearNome(lista,velho,novo){novo=String(novo==null?'':novo).replace(/\s+/g,' ').trim();
  if(!novo)return{erro:'O nome não pode ficar vazio'};
  if(lista.some(c=>c!==velho&&c.toLowerCase()===novo.toLowerCase()))return{erro:'Já existe "'+novo+'" na lista'};
  return{nome:novo,lista:lista.map(c=>c===velho?novo:c)};}
function regsRenomear(regs,velho,novo,receb){return regs.filter(r=>r.cliente===velho&&((r.tipo==='recebimento')===!!receb)).map(r=>Object.assign({},r,{cliente:novo}));}
function confAdd(lista,c,ts){lista=(lista||[]).map(x=>Object.assign({},x));if(!c||!c.cod)return lista;
  const x=lista.find(i=>i.cod===c.cod&&!!i.ok===!!c.ok);if(x){x.n=(x.n||1)+1;x.ts=ts;}else lista.push({cod:c.cod,ok:!!c.ok,n:1,ts:ts});return lista;}
function confResumo(lista){lista=lista||[];const ok=lista.filter(x=>x.ok).length;return lista.length+' conferidos · '+ok+' ok · '+(lista.length-ok)+' errado';}
const PLACA_RE=/\b([A-Z]{3})[- ]?(\d[A-Z0-9]\d{2})\b/g;
function acharPlaca(txt){const t=String(txt||'').toUpperCase().replace(/[–—]/g,'-');const ruim=/^(NFE|NOT|QTD|VOL|CEP|CPF|TEL|SER|NUM|PED|ROM)$/;
  const cand=[];let m;PLACA_RE.lastIndex=0;while((m=PLACA_RE.exec(t))){if(ruim.test(m[1]))continue;if(/^\d{4}$/.test(m[2])||/^\d[A-Z]\d{2}$/.test(m[2]))cand.push({p:m[1]+(/[A-Z]/.test(m[2])?'':'-')+m[2],i:m.index});}
  if(!cand.length)return '';const k=t.search(/PLACA/);if(k>=0){const d=cand.find(c=>c.i>=k&&c.i-k<40);if(d)return d.p;}return cand[0].p;}
function acharPlacas(txt){const out=[];let t=String(txt||'');for(let i=0;i<4;i++){const p=acharPlaca(t);if(!p||out.includes(p))break;out.push(p);t=t.toUpperCase().replace(p.replace('-',''),' ').replace(p,' ');}return out;}
function acharNFs(txt){const t=String(txt||'').replace(/\r/g,'');const out=[];
  const re=/\b(?:NF-?e|NFE|NF|N\.F\.|Nota(?:s)?(?:\s+Fiscal|\s+Fiscais)?)\b\s*(?:n[º°o.]*\s*)?[:#.]?\s*((?:\d[\d.\/]*\d|\d)(?:\s*(?:,|;|\/|-|\be\b)\s*\d[\d.]*\d?)*)/gi;let m;
  while((m=re.exec(t))){m[1].split(/\s*(?:,|;|\/|-|\be\b)\s*/i).forEach(n=>{n=n.replace(/\./g,'').replace(/^0+(?=\d)/,'');if(/^\d{2,9}$/.test(n)&&!out.includes(n))out.push(n);});}
  return out;}
function acharQtd(txt){const t=String(txt||'');let m=t.match(/\b(?:volumes?|vols?\.?|qtd\.?|qtde\.?|quantidade)(?:\s+(?:de\s+)?(?:volumes?|produtos?|caixas?|itens))?\s*[:=\-]?\s*(\d{1,5})\b/i);
  if(m)return m[1];m=t.match(/\b(\d{1,5})\s*(?:volumes?|vols?\b|caixas?|cxs?\b)/i);return m?m[1]:'';}
function semAcento(t){return String(t||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();}
function parecido(a,b){a=semAcento(a);b=semAcento(b);if(!a||!b)return 0;if(a===b)return 1;
  const d=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){let p=d[0];d[0]=i;for(let j=1;j<=b.length;j++){const t=d[j];d[j]=Math.min(d[j]+1,d[j-1]+1,p+(a[i-1]===b[j-1]?0:1));p=t;}}
  return 1-d[b.length]/Math.max(a.length,b.length);}
function acharNaLista(nome,lista){let best='',sc=0;for(const c of lista||[]){const v=parecido(nome,c);if(v>sc){sc=v;best=c;}}return sc>=0.8?best:'';}
function limparPrivado(txt){return String(txt||'').split(/\n/).filter(l=>!/MOTORISTA|CPF|ASSINATURA|\d{3}\.\d{3}\.\d{3}|\b\d{11}\b/i.test(l)).join('\n');}
function lerRomaneio(txt){const t=limparPrivado(txt),linhas=t.split(/\n/);
  // transportadora impressa
  let transp='';const mt=t.match(/[A-Z\[]{0,3}ANSPORTADORA\s*[:;.]?[\s|\/\\!]*([^\n]*)/i);if(mt)transp=mt[1].split(/\s{2,}|\bTIPO\b/i)[0].replace(/[^A-Za-zÀ-ú0-9 &.\-]/g,' ').replace(/\s+/g,' ').trim().replace(/(\s+\S)+$/,'');
  // placa: só depois de "PLACA:"; se houver o rótulo e não der placa válida, fica vazia
  let placa='',placaRotulo=false;const lp=linhas.find(l=>/PLACA/i.test(l)),lv=linhas.find(l=>/TIPO\s+DE\s+VE/i.test(l));
  if(lp||lv){placaRotulo=true;let ps=lp?acharPlacas(lp.slice(lp.search(/PLACA/i)+5)):[];
    if(!ps.length&&lv){const a=lv.replace(/^.*?VE[IÍ]CULO\s*[:;.]?/i,'').split(/PLACA/i)[0];ps=acharPlacas(a);}placa=ps.join(' / ');}
  else placa=acharPlacas(t).join(' / ');
  let i0=linhas.findIndex(l=>/\bNFS?\b.*(CLIENTE|RASTREIO|VOLUME)/i.test(l));if(i0<0)i0=linhas.findIndex(l=>/ANSPORTADORA|VE[IÍ]CULO|PLACA/i.test(l));
  let i1=linhas.findIndex((l,i)=>i>i0&&/RESPONS|CARREGAMENTO|\bDATA\b/i.test(l));if(i1<0)i1=linhas.length;
  const rows=[];if(i0>=0)for(const l of linhas.slice(i0+1,i1)){if(/VE[IÍ]CULO|PLACA|ANSPORT|CARRETA|TOTAL/i.test(l))continue;
    const m=l.match(/^[^\w]*(\d{2,9})(?=[\s|—–\-:.]|$)(.*)$/);if(!m)continue;const resto=m[2];
    const v=resto.match(/(?:^|[\s|])(\d{1,4})\s*(?:VOL[A-Z]*|CX[A-Z]*|CAIXAS?)?[^\w]*$/i);
    if(!/[A-Za-zÀ-ú]{2}|\d/.test(resto)&&resto.trim())continue;
    rows.push({nf:m[1].replace(/^0+(?=\d)/,''),vol:v?+v[1]:null});}
  const nfs=[];rows.forEach(r=>{if(!nfs.includes(r.nf))nfs.push(r.nf);});acharNFs(t).forEach(n=>{if(!nfs.includes(n))nfs.push(n);});
  const comVol=rows.filter(r=>r.vol!=null);let volume='';
  if(rows.length&&comVol.length===rows.length)volume=String(comVol.reduce((a,r)=>a+r.vol,0));
  else if(comVol.length===1)volume=String(comVol[0].vol);
  else if(!comVol.length){const q=acharQtd(t);if(q)volume=q;}
  return{nfs,volume,placa,placaRotulo,transp,linhas:rows.length};}
function preencherVazios(f,d,lista){const pre=[],falta=[],auto=[];let nova='';
  const vazio=v=>!String(v==null?'':v).trim();
  if(d.transp!==undefined){const c=acharNaLista(d.transp,lista);if(!c){if(d.transp&&d.transp.length>=3){falta.push('transportadora "'+d.transp+'" não está na lista');nova=d.transp;}else falta.push('transportadora');}else if(vazio(f.cliente)){f.cliente=c;pre.push(c);auto.push('cliente');}}
  if(!(d.nfs||[]).length)falta.push('NFs');else if(vazio(f.nfs)){f.nfs=d.nfs.join('-');pre.push('NFs '+f.nfs);auto.push('nfs');}
  if(!d.volume)falta.push('volumes');else if(vazio(f.vt&&f.vt.volume)){f.vt.volume=d.volume;pre.push(d.volume+' volumes');auto.push('volume');}
  if(!d.placa)falta.push(d.placaRotulo?'placa não lida, digite':'placa');else if(vazio(f.placa)){f.placa=d.placa;pre.push('placa '+d.placa);auto.push('placa');}
  return{pre,falta,auto,nova};}
// ===== v4.2: leitura confirmada, quadro e correção de letras/números =====
const LEITURAS=10;
function estavel(st,key,n){n=n||LEITURAS;key=key?String(key):'';if(!key)return {k:'',c:0,ok:false};const c=st&&st.k===key?st.c+1:1;return {k:key,c,ok:c>=n};}
// contagem por código (modo contínuo): conta quando o código aparece 10 vezes seguidas
function estavelMulti(st,codes,n){n=n||LEITURAS;const o={},ok=[];for(const c of codes||[]){o[c]=((st||{})[c]||0)+1;if(o[c]===n)ok.push(c);}return {st:o,ok};}
function longeTxt(hLinha,hQuadro){return !!(hLinha&&hQuadro)&&hLinha/hQuadro<0.08;}
function longeBar(wCod,wQuadro){return !!(wCod&&wQuadro)&&wCod/wQuadro<0.25;}
const TROCA={O:'0','0':'O',I:'1','1':'I',S:'5','5':'S',B:'8','8':'B',Z:'2','2':'Z'};
function corrigirOCR(c,esp){c=normCod(c).replace(/\s+/g,'');for(const e0 of esp||[]){const e=normCod(e0);if(!e||e.length!==c.length)continue;let ok=true;
  for(let i=0;i<e.length;i++){if(c[i]===e[i])continue;if(TROCA[c[i]]!==e[i]){ok=false;break;}}if(ok)return e;}return c;}
// ===== v4.2: romaneio por regiões (modelo Qlog "Romaneio de Saída") =====
// coordenadas relativas à borda da tabela (u = 0..1 da esquerda p/ direita, v = 0..1 de cima p/ baixo)
const ROM={split:0.66,cols:[0,0.1747,0.4700,0.66,1],v:{mot:[0.1305,0.1697],ass:[0.1697,0.2089],tra:[0.2089,0.2480],tip:[0.2480,0.2872],tab:[0.3264,0.9530]},rowH:0.03916,aspecto:515.27/766};
const ROM_ANC=[[/^MOTORISTA/,'L',0.0078,0.150],[/^ASSINATURA/,'L',0.0078,0.189],[/^TRANSPORTADORA/,'L',0.0078,0.228],[/^TIPO DE VE/,'L',0.0078,0.267],
  [/^CPF/,'L',0.668,0.150],[/^B ?U\b/,'L',0.668,0.189],[/^PLACA/,'L',0.668,0.267],[/^RESPONSAVEL/,'L',0.0078,0.976],[/^DATA\b/,'L',0.668,0.976],
  [/^NFS$/,'C',0.0873,0.307],[/^CLIENTE$/,'C',0.3224,0.307],[/^RASTREIO$/,'C',0.5651,0.307],[/^VOLUME$/,'C',0.830,0.307],[/^ROMANEIO DE SAIDA$/,'C',0.5,0.111]];
const ROM_ROT=[['mot',/^\W*MOTORISTA\s*[:;.]?/i],['cpf',/^\W*CPF/i],['ass',/^\W*ASSINATURA/i],['bu',/^\W*B\.?\s?U\b\s*[:;.]?/i],['tra',/^\W*TRANSPORTADORA\s*[:;.]?/i],
  ['tip',/^\W*TIPO\s+DE\s+VE[IÍ]CULO\s*[:;.]?/i],['pla',/^\W*PLACA\s*[:;.]?/i],['res',/^\W*RESPONS[AÁ]VEL(\s+CARREGAMENTO)?\s*[:;.]?/i],['dat',/^\W*DATA\s*[:;.]?/i]];
const SEM_CPF=s=>String(s||'').replace(/\d{3}\.?\d{3}\.?\d{3}\s*-?\s*\d{2}/g,' ').replace(/\b\d{11}\b/g,' ');
function ajuste(p){if(!p.length)return null;const n=p.length,mu=p.reduce((a,q)=>a+q[0],0)/n,mx=p.reduce((a,q)=>a+q[1],0)/n;let sxx=0,sxy=0;p.forEach(q=>{sxx+=(q[0]-mu)**2;sxy+=(q[0]-mu)*(q[1]-mx);});
  if(sxx<0.02)return null;const a=sxy/sxx;return a>0?{a,b:mx-a*mu}:null;}
// linhas: [{t,x,y,w,h}] em pixels da imagem; W,H = tamanho da imagem (recortada no quadro)
function romRegioes(linhas,W,H){const ls=(linhas||[]).filter(l=>l&&String(l.t||'').trim()).map(l=>({t:String(l.t).trim(),x:+l.x||0,y:+l.y||0,w:+l.w||0,h:+l.h||10}));
  const px=[],py=[];for(const l of ls){const k=semAcento(l.t).toUpperCase();for(const [re,m,u,v] of ROM_ANC)if(re.test(k)){if(m==='L')px.push([u,l.x]);else if(l.w)px.push([u,l.x+l.w/2]);py.push([v,l.y+l.h/2]);break;}}
  const fx=ajuste(px)||{a:W||1,b:0},fy=ajuste(py)||{a:H||1,b:0};
  const out={mot:[],tra:[],tip:[],pla:[],dat:[],rows:{}};
  const put=(k,u,t)=>{if(out[k])out[k].push({u,t});};
  for(const l of ls){let t=l.t,lab='';for(const [k,re] of ROM_ROT)if(re.test(t)){lab=k;t=t.replace(re,'');break;}
    if(lab==='mot')t=t.split(/\bCPF\b/i)[0];if(lab==='tip'&&/PLACA/i.test(t)){const [a,b]=t.split(/PLACA\s*[:;.]?/i);put('pla',1,b);t=a;}if(lab==='res'&&/DATA/i.test(t)){put('dat',1,t.split(/DATA\s*[:;.]?/i)[1]);continue;}
    t=SEM_CPF(t).trim();const u=((l.x+(l.w||0)/2)-fx.b)/fx.a,v=((l.y+l.h/2)-fy.b)/fy.a;
    if(lab){if(['cpf','ass','bu','res'].includes(lab))continue;if(t)put(lab,u,t);continue;}
    if(!t||/^(NFS?|CLIENTE|RASTREIO|VOLUME|QLOG|ROMANEIO.*)$/i.test(semAcento(t).toUpperCase()))continue;
    const V=ROM.v,dentro=r=>v>=r[0]&&v<r[1];
    if(dentro(V.mot)){if(u<ROM.split)put('mot',u,t);}else if(dentro(V.ass))continue;else if(dentro(V.tra))put('tra',u,t);
    else if(dentro(V.tip))put(u<ROM.split?'tip':'pla',u,t);
    else if(dentro(V.tab)){const i=Math.floor((v-V.tab[0])/ROM.rowH),c=Math.max(0,ROM.cols.findIndex((x,j)=>u>=x&&u<ROM.cols[j+1]));(out.rows[i]=out.rows[i]||[[],[],[],[]])[c].push({u,t});}
    else if(v>=V.tab[1]&&u>=ROM.split)put('dat',u,t);}
  const J=a=>(a||[]).sort((p,q)=>p.u-q.u).map(x=>String(x.t).trim()).filter(Boolean).join(' ').replace(/\s+/g,' ').trim();
  const linhasTab=Object.keys(out.rows).map(Number).sort((a,b)=>a-b).map(i=>{const r=out.rows[i];const nf=(J(r[0]).match(/\d{2,9}/)||[''])[0].replace(/^0+(?=\d)/,'');const vm=J(r[3]).match(/\d{1,5}/);
    return {nf,cliente:J(r[1]),rastreio:J(r[2]),volume:vm?vm[0]:''};}).filter(r=>r.nf||r.cliente||r.rastreio||r.volume);
  const nfs=[];linhasTab.forEach(r=>{if(r.nf&&!nfs.includes(r.nf))nfs.push(r.nf);});
  const cv=linhasTab.filter(r=>r.volume);let volume='';if(cv.length&&cv.length===linhasTab.filter(r=>r.nf).length)volume=String(cv.reduce((a,r)=>a+(+r.volume),0));else if(cv.length===1)volume=cv[0].volume;
  const pl=J(out.pla),placa=acharPlacas(pl).join(' / ')||(/^[A-Z0-9-]{7,8}$/i.test(pl.replace(/\s/g,''))?pl.replace(/\s/g,'').toUpperCase():'');
  const dt=J(out.dat).match(/(\d{1,2})\s*[\/.\-\s]\s*(\d{1,2})\s*[\/.\-\s]\s*(\d{2,4})/);const data=dt?pad(dt[1])+'/'+pad(dt[2])+'/'+dt[3]:'';
  const motorista=J(out.mot).replace(/[^A-Za-zÀ-ú .']/g,' ').replace(/\s+/g,' ').trim();
  const transp=J(out.tra).replace(/[^A-Za-zÀ-ú0-9 &.\-]/g,' ').replace(/\s+/g,' ').trim();
  return {transp,motorista,placa,data,tipo:J(out.tip),linhas:linhasTab,nfs,volume,ancoras:px.length+py.length};}
// junta palavras soltas (Tesseract) em pedaços por linha, separando colunas distantes
function juntarPalavras(ws){const a=(ws||[]).filter(w=>w&&String(w.t||'').trim()).map(w=>({t:String(w.t).trim(),x:+w.x||0,y:+w.y||0,w:+w.w||0,h:Math.max(1,+w.h||10)}));
  a.sort((p,q)=>(p.y+p.h/2)-(q.y+q.h/2));const g=[];for(const l of a){const cy=l.y+l.h/2,r=g[g.length-1];if(r&&Math.abs(cy-r.cy)<Math.max(r.h,l.h)*0.6)r.c.push(l);else g.push({cy,h:l.h,c:[l]});}
  const out=[];for(const r of g){r.c.sort((p,q)=>p.x-q.x);let cur=null;for(const w of r.c){if(cur&&w.x-(cur.x+cur.w)<1.5*Math.max(cur.h,w.h)){cur.t+=' '+w.t;cur.w=w.x+w.w-cur.x;cur.h=Math.max(cur.h,w.h);cur.y=Math.min(cur.y,w.y);}else{cur=Object.assign({},w);out.push(cur);}}}return out;}
// mistura com a leitura antiga (texto corrido) só onde ficou vazio
function romJuntar(d,velho){velho=velho||{};const o=Object.assign({},d);if(!o.nfs.length&&(velho.nfs||[]).length)o.nfs=velho.nfs.slice();if(!o.volume&&velho.volume)o.volume=velho.volume;
  if(!o.placa&&velho.placa)o.placa=velho.placa;if(!o.transp&&velho.transp)o.transp=velho.transp;return o;}
// tela de conferência -> formulário. Nunca leva CPF.
function romAplicar(f,v,lista){const auto=[],t=s=>SEM_CPF(String(s==null?'':s)).replace(/\s+/g,' ').trim();
  const tr=t(v.transp);if(tr){f.cliente=acharNaLista(tr,lista)||tr;auto.push('cliente');}
  const n=parseNFs(t(v.nfs)).filter(x=>/^\d+$/.test(x)).map(x=>x.replace(/^0+(?=\d)/,''));if(n.length){f.nfs=n.join('-');auto.push('nfs');}
  const vo=t(v.volume).match(/\d{1,5}/);if(vo){f.vt=f.vt||{};f.vt.volume=vo[0];auto.push('volume');}
  const pl=t(v.placa).toUpperCase();if(pl){f.placa=pl;auto.push('placa');}
  const mo=t(v.motorista).replace(/\d/g,'').trim();if(mo){f.motorista=mo;auto.push('motorista');}
  const ex=[];if(t(v.clientes))ex.push('Cliente: '+t(v.clientes));if(t(v.rastreio))ex.push('Rastreio: '+t(v.rastreio));if(t(v.data))ex.push('Data do romaneio: '+t(v.data));
  if(ex.length){const o=ex.join(' · ');if(!String(f.obs||'').includes(o))f.obs=(String(f.obs||'').trim()?String(f.obs).trim()+' · ':'')+o;}
  return {auto,nova:tr&&!acharNaLista(tr,lista)?tr:''};}
// v4.2.1 atualizador
const APK_URL='https://github.com/qlog-expedicao/qlog-expedicao/releases/latest/download/QlogExpedicao.apk';
const SITE_URL='https://qlog-expedicao.github.io/qlog-expedicao/';
function versaoNum(v){return String(v||'').replace(/^[^0-9]*/,'').split(/[^0-9]+/).filter(x=>x!=='').slice(0,3).map(Number);}
function versaoNova(nova,atual){const a=versaoNum(nova),b=versaoNum(atual);if(!a.length)return false;for(let i=0;i<3;i++){const x=a[i]||0,y=b[i]||0;if(x!==y)return x>y;}return false;}
function baixouOk(lido,esperado){return esperado>1000000&&lido===esperado;}

// v4.2.6: avisos de alteração no histórico (só o dono da equipe recebe; ele mesmo não gera aviso)
function avisoPrecisa(atorUid,adminUid){return !!atorUid&&!!adminUid&&atorUid!==adminUid;}
const AV_CAMPOS=[['cliente','Transportadora/cliente'],['nfs','NFs'],['palete','Paletes'],['volume','Volumes'],['placa','Placa'],['motorista','Motorista'],['obs','Observação'],['motivo','Motivo']];
function avVal(r,k){r=r||{};if(k==='nfs')return (r.nfs||[]).join('-');if(k==='palete'||k==='volume')return String((r.vtipos||{})[k]||0);return String(r[k]==null?'':r[k]).trim();}
function avCurto(v){v=String(v);return v.length>40?v.slice(0,40)+'…':v||'(vazio)';}
function avisoMudancas(a,d){const m=[];for(const [k,n] of AV_CAMPOS){const x=avVal(a,k),y=avVal(d,k);if(x!==y)m.push(n+': '+avCurto(x)+' → '+avCurto(y));}
  const fc={fotos:'Fotos produtos',romaneio:'Fotos romaneio',caminhao:'Fotos caminhão'};
  for(const k of FOTO_CAMPOS){const x=Math.max((a&&a[k]||[]).length,Number(a&&a['n_'+k])||0),y=Math.max((d&&d[k]||[]).length,Number(d&&d['n_'+k])||0);
    const mx=d&&d.fotosMexeu&&d.fotosMexeu[k];if(x!==y)m.push((fc[k]||k)+': '+x+' → '+y);else if(mx)m.push((fc[k]||k)+': trocadas');}
  return m;}
function avisoCriar(acao,antes,depois,ator,adminUid,ts){ator=ator||{};if(!avisoPrecisa(ator.uid,adminUid)||!antes)return null;
  const mud=acao==='editou'?avisoMudancas(antes,depois):[];if(acao==='editou'&&!mud.length)return null;
  return {acao,quemUid:ator.uid,quem:String(ator.nome||'').slice(0,60),regId:String(antes.id||''),tipo:antes.tipo||'',cliente:String(antes.cliente||'').slice(0,80),
    nfs:(antes.nfs||[]).slice(0,10).join('-'),regTs:antes.ts||0,mud:mud.slice(0,12),ts:ts||Date.now()};}
function avisoTxt(a){if(!a)return '';const t={coleta:'Coleta',saida:'Saída',recebimento:'Recebimento',estorno:'Estorno'}[a.tipo]||'Registro';
  return (a.quem||'Alguém')+' '+(a.acao==='apagou'?'apagou':'editou')+' '+t+(a.cliente?' · '+a.cliente:'')+(a.nfs?' · NF '+a.nfs:'')+(a.regTs?' ('+fmtData(a.regTs)+')':'');}
// v4.2.8: estorno ligado ao registro de origem
function estOrigens(regs,q){return filtrar((regs||[]).filter(r=>r.tipo==='coleta'||r.tipo==='saida'),q).slice().sort((a,b)=>(b.ts||0)-(a.ts||0)).slice(0,30);}
function origemTxt(r){return codigo(r)+' · '+tipoNome(r.tipo)+(cheio(r.cliente)?' · '+r.cliente.trim():'')+((r.nfs||[]).length?' · NF '+r.nfs.join('-'):'')+' · '+fmtData(r.ts);}
function estDeOrigem(o){const vt=vtNorm(o.vtipos);return {tipo:'estorno',motivo:'',origem:o.id,origemOk:1,cliente:o.cliente||'',nfs:(o.nfs||[]).join('-'),vt:{palete:vt.palete?String(vt.palete):'',volume:vt.volume?String(vt.volume):''},confEsp:'',confLidos:[],motorista:o.motorista||'',placa:o.placa||'',obs:'',fotos:[],romaneio:[],caminhao:[],itens:[],forn:''};}
function estornosDe(regs,id){return id?(regs||[]).filter(r=>r.tipo==='estorno'&&r.origem===id):[];}
const L={estOrigens,origemTxt,estDeOrigem,estornosDe,avisoPrecisa,avisoMudancas,avisoCriar,avisoTxt,APK_URL,SITE_URL,versaoNum,versaoNova,baixouOk,LEITURAS,estavel,estavelMulti,longeTxt,longeBar,corrigirOCR,ROM,romRegioes,juntarPalavras,romJuntar,romAplicar,nfsTxt,fotosTxt,acharPlacas,semAcento,parecido,acharNaLista,limparPrivado,confAdd,confResumo,acharPlaca,acharNFs,acharQtd,lerRomaneio,preencherVazios,renomearNome,regsRenomear,vtNorm,volTotal,volTxt,normCod,parseCods,conferir,confStatus,codigo,proxSeq,fmtData,fmtHora,parseNFs,resumo,filtrar,relatorio,csv,validar,mesKey,meses,htmlMes,extrairCods,casarEsperado,tipoNome,addItem,itensTot,parseSkuLista,skuTexto,conferirSku,recStatus,locNorm,parseLocLista,locCasa,locPrep,locPrevia,locLinha,ocrLinhas,sha256,senhaHash,regNuvem,semAutor,regMescla,podeEditar,editadoTxt,fotoOp,regEditar,editValidar,FOTO_CAMPOS,FOTO_ALVO,tamDataUrl,leveTentativas,fotoSig,fotoDocs,fotosDeDocs,precisaFotos,fotosSync,mesId,mesArquivar,paraLimpar,manterAoRemover,nomeMes,pastaReg,arquivoItens,crc32,utf8,b64bytes,bytesB64,Zip,itemBytes};
if(typeof module!=='undefined')module.exports=L; else root.L=L;})(this);
