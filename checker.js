const { initializeApp, cert } = require('firebase-admin/app');
const { getMessaging } = require('firebase-admin/messaging');
const { getFirestore } = require('firebase-admin/firestore');

// 1. Inicializar Firebase con Variables de Entorno (¡Seguro para GitHub!)
// GitHub inyectará este valor de forma oculta al momento de ejecutar.
const serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

// 2. Función para envío MASIVO a todos los tokens en Firestore
async function enviarNotificacionMasiva(titulo, cuerpo) {
  try {
    const snapshot = await db.collection('tokens').get();
    const tokens = snapshot.docs.map(doc => doc.id);

    if (tokens.length === 0) {
      console.log('⚠️ No hay tokens registrados en Firestore. No se envió nada.');
      return;
    }

    const message = {
      notification: { title: titulo, body: cuerpo },
      tokens: tokens
    };

    const response = await getMessaging().sendMulticast(message);
    console.log(`🚀 Notificación enviada a ${response.successCount} dispositivos.`);
    
  } catch (error) {
    console.error('❌ Error enviando push masiva:', error);
  }
}

// 3. Función de chequeo
async function chequearTasa() {
  console.log('🔄 [' + new Date().toLocaleTimeString() + '] Verificando cambios...');
  try {
    const res = await fetch('https://ve.dolarapi.com/v1/dolares');
    const data = await res.json();
    
    const bcv = data.find(d => d.fuente === 'oficial');
    if (!bcv) {
        console.log('❌ No se encontró la tasa BCV.');
        process.exit(1); // Detenemos el script con error
    }

    const tasaActual = bcv.promedio;

    // LEER LA TASA ANTERIOR DESDE FIRESTORE
    const configRef = db.collection('config').doc('tasa_monitor');
    const docSnap = await configRef.get();
    
    let tasaAnterior = 0;
    if (docSnap.exists) {
      tasaAnterior = docSnap.data().tasa;
    }

    // COMPARACIÓN
    if (tasaActual !== tasaAnterior) {
      console.log(`⚠️ ¡Cambio detectado! Antigua: ${tasaAnterior} -> Nueva: ${tasaActual}`);
      
      // GUARDAR LA NUEVA TASA EN FIRESTORE
      await configRef.set({ tasa: tasaActual });

      // NOTIFICAR
      await enviarNotificacionMasiva(
        '🚨 Ajuste de Tasa Oficial',
        `El Dólar BCV acaba de actualizarse a: ${tasaActual} Bs.`
      );
    } else {
      console.log('✅ La tasa no ha variado. No se envía notificación.');
    }

    // Cerramos el proceso exitosamente
    process.exit(0);

  } catch (error) {
    console.error('❌ Error al consultar el API:', error);
    process.exit(1);
  }
}

// Ejecutar una sola vez (GitHub Actions será el que ejecute esto cada 15 min)
chequearTasa();
