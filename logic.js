(function(root){
const pad=n=>String(n).padStart(2,'0');
function fmtData(ts){const d=new Date(ts);return pad(d.getDate())+'/'+pad(d.getMonth()+1)+'/'+String(d.getFullYear()).slice(2);}
function fmtHora(ts){const d=new Date(ts);return pad(d.getHours())+':'+pad(d.getMinutes());}
function parseNFs(s){return String(s||'').split(/[^0-9A-Za-z]+/).map(x=>x.trim()).filter(Boolean).filter((x,i,a)=>a.indexOf(x)===i);}
const VT=[['palete','palete','paletes'],['caixa','caixa','caixas'],['unidade','unidade','unidades']];
function volTotal(v){return VT.reduce((s,[k])=>s+(Number(v&&v[k])||0),0);}
function volTxt(r){const v=r.vtipos;const n=Number(r.volumes)||0;if(!v)return String(n);
  const p=VT.filter(([k])=>Number(v[k])>0).map(([k,a,b])=>v[k]+' '+(Number(v[k])===1?a:b));return n+(p.length?' ('+p.join(', ')+')':'');}
const normCod=s=>String(s||'').trim().toUpperCase();
function parseCods(s){return String(s||'').split(/[\s,;]+/).map(normCod).filter(Boolean).filter((x,i,a)=>a.indexOf(x)===i);}
function conferir(esperados,lido){const l=normCod(lido);return {cod:l,ok:!!l&&esperados.map(normCod).includes(l)};}
function confStatus(c){if(!c||!(c.lidos||[]).length)return '';if(c.lidos.some(x=>!x.ok))return 'DIVERGENTE';
  const lid=c.lidos.map(x=>x.cod);return (c.esperados||[]).every(e=>lid.includes(normCod(e)))?'OK':'INCOMPLETA';}
const PFX={coleta:'COL-',saida:'EXP-',recebimento:'REC-'};
const tipoNome=t=>t==='coleta'?'Coleta':t==='recebimento'?'Recebimento':'Saída';
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
function resumoRec(r){const nfs=r.nfs||[],t=itensTot(r.itens),c=conferirSku(r.itens,r.skuEsp);
  const x=['*RECEBIMENTO '+codigo(r)+'*','Tipo: Recebimento','Fornecedor/Cliente: '+(r.cliente||'Não informado'),
    'NFs: '+(nfs.length?nfs.map(n=>'NF '+n).join(', '):'-')];if(nfs.length)x.push('NFs '+nfs.join('-'));
  x.push('Itens: '+t.cods+' códigos · '+t.un+' unidades','Data: '+fmtData(r.ts),'Hora: '+fmtHora(r.ts),'Conferência SKU: '+c.status);
  if(c.status==='DIVERGENTE')x.push('OK '+c.ok.length+' · Qtd diferente '+c.dif.length+' · Faltou '+c.faltou.length+' · A mais '+c.amais.length);
  x.push('Códigos:');const it=r.itens||[],M=30;it.slice(0,M).forEach(i=>x.push(i.cod+' x '+i.qtd));if(it.length>M)x.push('... e mais '+(it.length-M)+' códigos');
  if(r.obs)x.push('Obs: '+r.obs);x.push('Fotos: '+(r.fotos||[]).length+' produtos, '+(r.romaneio||[]).length+' romaneio/NF');return x.join('\n');}
function resumo(r){if(r.tipo==='recebimento')return resumoRec(r);const nfs=r.nfs||[];const x=['*'+(r.tipo==='coleta'?'COLETA':'SAÍDA')+' '+codigo(r)+'*',
  'Tipo: '+(r.tipo==='coleta'?'Coleta':'Saída'),'Transportadora: '+(r.cliente||'Sem transportadora'),
  'NFs: '+nfs.map(n=>'NF '+n).join(', '),'NFs '+nfs.join('-'),'Volumes: '+volTxt(r),
  'Data: '+fmtData(r.ts),'Hora: '+fmtHora(r.ts),'Motorista: '+(r.motorista||'-'),'Placa: '+(r.placa||'-')];
  const cs=confStatus(r.conf);if(cs){x.push('Conferência: '+cs);x.push('Códigos esperados: '+r.conf.esperados.join(', '));
    const bad=r.conf.lidos.filter(z=>!z.ok).map(z=>z.cod);if(bad.length)x.push('Códigos diferentes: '+bad.join(', '));}
  if(r.obs)x.push('Obs: '+r.obs);
  x.push('Fotos: '+(r.fotos||[]).length+' produtos, '+(r.romaneio||[]).length+' romaneio, '+(r.caminhao||[]).length+' caminhão');return x.join('\n');}
function filtrar(regs,q){q=String(q||'').trim().toLowerCase(); if(!q)return regs;
  return regs.filter(r=>(r.cliente||'').toLowerCase().includes(q)||(r.nfs||[]).some(n=>n.toLowerCase().includes(q))||fmtData(r.ts).includes(q)||(r.placa||'').toLowerCase().includes(q)||codigo(r).toLowerCase().includes(q)||(r.itens||[]).some(i=>String(i.cod).toLowerCase().includes(q)));}
function relatorio(regs){const dia={},cli={};
  for(const r of regs){const d=fmtData(r.ts),c=r.cliente||'Sem transportadora',v=Number(r.volumes)||0;
    for(const [o,k] of [[dia,d],[cli,c]]){o[k]=o[k]||{reg:0,vol:0,coleta:0,saida:0,receb:0,palete:0,caixa:0,unidade:0};o[k].reg++;o[k].vol+=v;for(const [t] of VT)o[k][t]+=Number(r.vtipos&&r.vtipos[t])||0;o[k][r.tipo==='coleta'?'coleta':r.tipo==='recebimento'?'receb':'saida']++;}}
  return {dia,cli};}
function csv(regs){const q=v=>'"'+String(v==null?'':v).replace(/"/g,'""')+'"';
  const h=['Código','Tipo','Transportadora','NFs','Volumes','Paletes','Caixas','Unidades','Data','Hora','Motorista','Placa','Observação','Fotos produtos','Fotos romaneio','Fotos caminhão','Conferência','Itens'];
  return '\ufeff'+[h.map(q).join(';')].concat(regs.map(r=>[codigo(r),tipoNome(r.tipo),r.cliente,(r.nfs||[]).join('-'),r.volumes,...VT.map(([t])=>Number(r.vtipos&&r.vtipos[t])||0),fmtData(r.ts),fmtHora(r.ts),r.motorista,r.placa,r.obs,(r.fotos||[]).length,(r.romaneio||[]).length,(r.caminhao||[]).length,r.tipo==='recebimento'?recStatus(r):confStatus(r.conf),(r.itens||[]).map(i=>i.cod+' x '+i.qtd).join(' | ')].map(q).join(';'))).join('\r\n');}

function mesKey(ts){const d=new Date(ts);return String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear();}
function meses(regs){return [...new Set(regs.map(r=>mesKey(r.ts)))];}
function htmlMes(regs,mes){const e=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const v=regs.filter(r=>mesKey(r.ts)===mes).sort((a,b)=>a.ts-b.ts);
  const im=(a,t)=>(a&&a.length)?'<h4>'+t+' ('+a.length+')</h4><div class="f">'+a.map(d=>'<a href="'+d+'" target="_blank"><img src="'+d+'"></a>').join('')+'</div>':'';
  return '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Qlog Expedição '+e(mes)+'</title><style>body{font-family:Arial;background:#eef2f6;margin:0;padding:16px}h1{color:#0b4f8a}input{width:100%;font-size:18px;padding:10px;box-sizing:border-box}.r{background:#fff;border-radius:10px;padding:12px;margin:12px 0}pre{white-space:pre-wrap;font-size:15px}.f img{height:160px;margin:4px;border-radius:6px}table{border-collapse:collapse;margin:6px 0}td,th{border:1px solid #ccd;padding:4px 8px;text-align:left}</style></head><body>'+
  '<h1>Qlog Expedição: registros de '+e(mes)+'</h1><p>'+v.length+' registros. Clique numa foto para abrir grande.</p><input id="q" placeholder="Buscar NF, transportadora, data, placa ou EXP-0001" oninput="var q=this.value.toLowerCase();document.querySelectorAll(\'.r\').forEach(function(x){x.style.display=x.dataset.s.indexOf(q)>-1?\'\':\'none\'})">'+
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
function validar(r){const e=[];if(r.tipo==='recebimento'){if(!(r.itens||[]).length)e.push('Leia ou adicione pelo menos um código');return e;} if(!r.cliente)e.push('Escolha a transportadora'); if(!(r.nfs||[]).length)e.push('Coloque pelo menos uma NF'); if(!(Number(r.volumes)>0))e.push('Coloque os volumes'); return e;}
const L={volTotal,volTxt,normCod,parseCods,conferir,confStatus,codigo,proxSeq,fmtData,fmtHora,parseNFs,resumo,filtrar,relatorio,csv,validar,mesKey,meses,htmlMes,extrairCods,casarEsperado,tipoNome,addItem,itensTot,parseSkuLista,skuTexto,conferirSku,recStatus};
if(typeof module!=='undefined')module.exports=L; else root.L=L;})(this);
