// Qlog Expedição — configuração da nuvem (Firebase).
// Enquanto estiver null, o app funciona só no celular, igual antes.
// Depois de criar o projeto no Firebase, troque null pelo objeto "firebaseConfig" do app Web, por exemplo:
// window.QLOG_FB={apiKey:"...",authDomain:"....firebaseapp.com",projectId:"...",storageBucket:"...",messagingSenderId:"...",appId:"..."};
// (Esses dados NÃO são segredo; a proteção é feita pelas regras do Firestore e pela senha da equipe.)
window.QLOG_FB={apiKey:"AIzaSyA5OO3aHUVSdgyXpYSfix7cvYMtdPUhQXw",authDomain:"qlog-expedicao.firebaseapp.com",projectId:"qlog-expedicao",storageBucket:"qlog-expedicao.firebasestorage.app",messagingSenderId:"984053865643",appId:"1:984053865643:web:461aa09abbe3fdc56eabee"};
// v4.3.60: App Check — DESLIGADO. Só ligar depois de: (1) pôr fb-appcheck.js (firebase-app-check-compat 10.14.1) nesta pasta,
// (2) criar a chave reCAPTCHA Enterprise (site) e registrar no App Check do Firebase, (3) todos os celulares atualizados.
// on:true liga; siteKey = chave do site (reCAPTCHA Enterprise); debug só para teste (nunca no app publicado).
window.QLOG_APPCHECK={on:false,siteKey:'',debug:false};
// v4.3.66: dono pela conta Google. Aqui ficam só os códigos (sha256 de 'qlog-dono-v1:' + e-mail do dono), nunca os e-mails.
// O dono tem 2 contas Google (as duas valem). Os mesmos e-mails estão nas regras (firestore.rules, donoEmails). Se mudar, mudar nos dois lugares.
// pkg = pacote do APK (a volta do Chrome para o app só abre este pacote)
window.QLOG_DONO={h:['7ae55f5a39d520a65b154b126c9ad23eb8ccd59edd439209bf3ecd8637b53e42','5bbf813cc8803d2be82dfc7886a4646c5ee6e6a0b83a309a178d868d34917515'],pkg:'br.rodo.qlogexpedicao'};
