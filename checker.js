const { initializeApp, cert } = require('firebase-admin/app');
const { getMessaging } = require('firebase-admin/messaging');
const { getFirestore } = require('firebase-admin/firestore');

// Leemos la credencial desde la variable de entorno (Secret de GitHub)
const serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function enviarNotificacionMasiva(titulo, cuerpo) {
  try {
    const snapshot = await db.collection('tokens').get();
    const tokens = snapshot.docs.map(doc => doc.id);
    
    if (tokens.length === 0) {
        console.log('⚠️ No hay tokens registrados para enviar notificaciones.');
        return;
    }

    const message = {
      notification: { title: titulo, body: cuerpo },
      tokens: tokens
    };

    // =========================================================
    // CORRECCIÓN CRÍTICA: sendEachForMulticast
    // =========================================================
    const response = await getMessaging().sendEachForMulticast(message);
    console.log(`🚀 Notificación enviada con éxito a ${response.successCount} dispositivos (Fallaron: ${response.failureCount}).`);

    // =========================================================
    // LÓGICA DE LIMPIEZA ("TOKEN PRUNING")
    // =========================================================
    if (response.failureCount > 0) {
      const tokensInvalidos = [];
      
      // Iteramos sobre las respuestas individuales que nos da Firebase
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const errorCode = resp.error?.code;
          
          // Si el error indica que el token ya no existe o fue revocado
          if (
            errorCode === 'messaging/invalid-registration-token' ||
            errorCode === 'messaging/registration-token-not-registered'
          ) {
            tokensInvalidos.push(tokens[idx]);
          } else {
            // Si es otro tipo de error, lo mostramos para monitoreo
            console.error(`❌ Error al enviar al token ${tokens[idx]}:`, errorCode);
          }
        }
      });

      // Si encontramos tokens muertos, los borramos de Firestore usando un Batch
      if (tokensInvalidos.length > 0) {
        console.log(`🗑️ Limpiando la base de datos: Eliminando ${tokensInvalidos.length} tokens inválidos/zombies...`);
        
        const batch = db.batch();
        tokensInvalidos.forEach(token => {
          batch.delete(db.collection('tokens').doc(token));
        });
        
        await batch.commit();
        console.log('✅ Base de datos limpia.');
      }
    }

  } catch (error) {
    console.error('❌ Error crítico en enviarNotificacionMasiva:', error);
  }
}

async function chequearTasa() {
  console.log('🔄 Verificando cambios...');
  try {
    const res = await fetch('https://ve.dolarapi.com/v1/dolares');
    const data = await res.json();
    const bcv = data.find(d => d.fuente === 'oficial');
    
    if (!bcv) {
        console.log('❌ No se encontró la tasa oficial en la API.');
        process.exit(1);
    }

    const tasaActual = bcv.promedio;
    const configRef = db.collection('config').doc('tasa_monitor');
    const docSnap = await configRef.get();
    
    let tasaAnterior = docSnap.exists ? docSnap.data().tasa : 0;

    // Redondeamos a 4 decimales para evitar problemas de precisión
    const actualFixed = parseFloat(tasaActual).toFixed(4);
    const anteriorFixed = parseFloat(tasaAnterior).toFixed(4);

    if (actualFixed !== anteriorFixed) {
      console.log(`⚠️ Cambio detectado: ${anteriorFixed} -> ${actualFixed}`);
      await configRef.set({ tasa: tasaActual });
      await enviarNotificacionMasiva('🚨 Ajuste de Tasa Oficial', `El Dólar BCV ahora es: ${actualFixed} Bs.`);
    } else {
      console.log('✅ Sin cambios en la tasa.');
    }
    process.exit(0);
  } catch (error) {
    console.error('❌ Error al chequear la tasa:', error);
    process.exit(1);
  }
}

chequearTasa();
