/* v4.3.60: carrega o Firebase (fora do HTML por causa da CSP). App Check só entra se QLOG_APPCHECK.on (firebase-config.js) */
if(window.QLOG_FB){document.write('<script src="fb-app.js"><\/script><script src="fb-auth.js"><\/script><script src="fb-firestore.js"><\/script>'+(window.QLOG_APPCHECK&&window.QLOG_APPCHECK.on?'<script src="fb-appcheck.js"><\/script>':''));}
