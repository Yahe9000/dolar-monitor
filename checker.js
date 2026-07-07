const { initializeApp, cert } = require('firebase-admin/app');
const { getMessaging } = require('firebase-admin/messaging');
const { getFirestore } = require('firebase-admin/firestore');

// --- AQUÍ ESTÁ EL CAMBIO ---
// Leemos la credencial desde la variable de entorno (Secret)
const serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function enviarNotificacionMasiva(titulo, cuerpo) {
  try {
    const snapshot = await db.collection('tokens').get();
    const tokens = snapshot.docs.map(doc => doc.id);
    if (tokens.length === 0) return;

    const message = {
      notification: { title: titulo, body: cuerpo },
      tokens: tokens
    };

    const response = await getMessaging().sendMulticast(message);
    console.log(`🚀 Notificación enviada a ${response.successCount} dispositivos.`);
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

async function chequearTasa() {
  console.log('🔄 Verificando cambios...');
  try {
    const res = await fetch('https://ve.dolarapi.com/v1/dolares');
    const data = await res.json();
    const bcv = data.find(d => d.fuente === 'oficial');
    if (!bcv) process.exit(1);

    const tasaActual = bcv.promedio;
    const configRef = db.collection('config').doc('tasa_monitor');
    const docSnap = await configRef.get();
    
    let tasaAnterior = docSnap.exists ? docSnap.data().tasa : 0;

    if (tasaActual !== tasaAnterior) {
      console.log(`⚠️ Cambio detectado: ${tasaAnterior} -> ${tasaActual}`);
      await configRef.set({ tasa: tasaActual });
      await enviarNotificacionMasiva('🚨 Ajuste de Tasa Oficial', `El Dólar BCV ahora es: ${tasaActual} Bs.`);
    }
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

chequearTasa();
