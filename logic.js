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
function codigo(r){return (r.tipo==='coleta'?'COL-':'EXP-')+String(r.seq||0).padStart(4,'0');}
function proxSeq(regs,tipo){return regs.filter(r=>r.tipo===tipo).reduce((m,r)=>Math.max(m,r.seq||0),0)+1;}
function resumo(r){const nfs=r.nfs||[];const x=['*'+(r.tipo==='coleta'?'COLETA':'SAÍDA')+' '+codigo(r)+'*',
  'Tipo: '+(r.tipo==='coleta'?'Coleta':'Saída'),'Transportadora: '+(r.cliente||'Sem transportadora'),
  'NFs: '+nfs.map(n=>'NF '+n).join(', '),'NFs '+nfs.join('-'),'Volumes: '+volTxt(r),
  'Data: '+fmtData(r.ts),'Hora: '+fmtHora(r.ts),'Motorista: '+(r.motorista||'-'),'Placa: '+(r.placa||'-')];
  const cs=confStatus(r.conf);if(cs){x.push('Conferência: '+cs);x.push('Códigos esperados: '+r.conf.esperados.join(', '));
    const bad=r.conf.lidos.filter(z=>!z.ok).map(z=>z.cod);if(bad.length)x.push('Códigos diferentes: '+bad.join(', '));}
  if(r.obs)x.push('Obs: '+r.obs);
  x.push('Fotos: '+(r.fotos||[]).length+' produtos, '+(r.romaneio||[]).length+' romaneio, '+(r.caminhao||[]).length+' caminhão');return x.join('\n');}
function filtrar(regs,q){q=String(q||'').trim().toLowerCase(); if(!q)return regs;
  return regs.filter(r=>(r.cliente||'').toLowerCase().includes(q)||(r.nfs||[]).some(n=>n.toLowerCase().includes(q))||fmtData(r.ts).includes(q)||(r.placa||'').toLowerCase().includes(q)||codigo(r).toLowerCase().includes(q));}
function relatorio(regs){const dia={},cli={};
  for(const r of regs){const d=fmtData(r.ts),c=r.cliente||'Sem transportadora',v=Number(r.volumes)||0;
    for(const [o,k] of [[dia,d],[cli,c]]){o[k]=o[k]||{reg:0,vol:0,coleta:0,saida:0,palete:0,caixa:0,unidade:0};o[k].reg++;o[k].vol+=v;for(const [t] of VT)o[k][t]+=Number(r.vtipos&&r.vtipos[t])||0;o[k][r.tipo==='coleta'?'coleta':'saida']++;}}
  return {dia,cli};}
function csv(regs){const q=v=>'"'+String(v==null?'':v).replace(/"/g,'""')+'"';
  const h=['Código','Tipo','Transportadora','NFs','Volumes','Paletes','Caixas','Unidades','Data','Hora','Motorista','Placa','Observação','Fotos produtos','Fotos romaneio','Fotos caminhão','Conferência'];
  return '\ufeff'+[h.map(q).join(';')].concat(regs.map(r=>[codigo(r),r.tipo==='coleta'?'Coleta':'Saída',r.cliente,(r.nfs||[]).join('-'),r.volumes,...VT.map(([t])=>Number(r.vtipos&&r.vtipos[t])||0),fmtData(r.ts),fmtHora(r.ts),r.motorista,r.placa,r.obs,(r.fotos||[]).length,(r.romaneio||[]).length,(r.caminhao||[]).length,confStatus(r.conf)].map(q).join(';'))).join('\r\n');}

function mesKey(ts){const d=new Date(ts);return String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear();}
function meses(regs){return [...new Set(regs.map(r=>mesKey(r.ts)))];}
function htmlMes(regs,mes){const e=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const v=regs.filter(r=>mesKey(r.ts)===mes).sort((a,b)=>a.ts-b.ts);
  const im=(a,t)=>(a&&a.length)?'<h4>'+t+' ('+a.length+')</h4><div class="f">'+a.map(d=>'<a href="'+d+'" target="_blank"><img src="'+d+'"></a>').join('')+'</div>':'';
  return '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Qlog Expedição '+e(mes)+'</title><style>body{font-family:Arial;background:#eef2f6;margin:0;padding:16px}h1{color:#0b4f8a}input{width:100%;font-size:18px;padding:10px;box-sizing:border-box}.r{background:#fff;border-radius:10px;padding:12px;margin:12px 0}pre{white-space:pre-wrap;font-size:15px}.f img{height:160px;margin:4px;border-radius:6px}</style></head><body>'+
  '<h1>Qlog Expedição: registros de '+e(mes)+'</h1><p>'+v.length+' registros. Clique numa foto para abrir grande.</p><input id="q" placeholder="Buscar NF, transportadora, data, placa ou EXP-0001" oninput="var q=this.value.toLowerCase();document.querySelectorAll(\'.r\').forEach(function(x){x.style.display=x.dataset.s.indexOf(q)>-1?\'\':\'none\'})">'+
  v.map(r=>{const t=resumo(r);return '<div class="r" data-s="'+e(t.toLowerCase())+'"><pre>'+e(t)+'</pre>'+im(r.romaneio,'Romaneio')+im(r.caminhao,'Caminhão carregado')+im(r.fotos,'Produtos')+'</div>';}).join('')+'</body></html>';}
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
function validar(r){const e=[]; if(!r.cliente)e.push('Escolha a transportadora'); if(!(r.nfs||[]).length)e.push('Coloque pelo menos uma NF'); if(!(Number(r.volumes)>0))e.push('Coloque os volumes'); return e;}
const L={volTotal,volTxt,normCod,parseCods,conferir,confStatus,codigo,proxSeq,fmtData,fmtHora,parseNFs,resumo,filtrar,relatorio,csv,validar,mesKey,meses,htmlMes,extrairCods,casarEsperado};
if(typeof module!=='undefined')module.exports=L; else root.L=L;})(this);
