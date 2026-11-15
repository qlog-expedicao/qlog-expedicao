/* v4.3.60: splash fora do HTML (CSP sem script dentro da página) */
(function(){var d=document.getElementById('splash'),bx=document.getElementById('splashB'),f=0;
// 4.3.28: animação em WebP animado (sem vídeo: no Android a camada de vídeo ignorava o fade). Alinha com o splash nativo.
var m=/[?&]sb=(\d+)/.exec(location.search);if(m){var dy=screen.height/2-(+m[1]+innerHeight/2);bx.style.transform='translate(-50%,-50%) translateY('+dy+'px)'}
function nat(){try{window.AndroidSplash&&AndroidSplash.fim()}catch(e){}}
function tira(){if(d.parentNode)d.remove();nat()}
function fim(){if(f)return;f=1;d.style.pointerEvents='none';d.style.opacity='0';setTimeout(tira,420)}
d.onclick=fim;setTimeout(fim,2600);setTimeout(tira,3500)})()
