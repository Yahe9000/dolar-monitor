// 1. Referencias al DOM
const inputUsd = document.getElementById('input-usd');
const inputVes = document.getElementById('input-ves');
const btnRefresh = document.getElementById('btn-refresh');
const refreshIcon = document.getElementById('refresh-icon');
const variacionTexto = document.getElementById('variacion-texto');
const fechaTexto = document.getElementById('fecha-actual');
const tasaSelector = document.getElementById('tasa-selector'); 
const btnCapture = document.getElementById('btn-capture'); 
const themeBtn = document.getElementById('btn-theme');
const btnEnableNotifications = document.getElementById('btn-enable-notifications');

// Referencias Nuevas (UX y Menú)
const btnMenuToggle = document.getElementById('btn-menu-toggle');
const btnCloseMenu = document.getElementById('btn-close-menu');
const sideMenu = document.getElementById('side-menu');
const menuOverlay = document.getElementById('menu-overlay');
const btnQuicks = document.querySelectorAll('.btn-quick');
const copyUsd = document.getElementById('copy-usd');
const copyVes = document.getElementById('copy-ves');
const toast = document.getElementById('toast');
const btnClearInputs = document.getElementById('btn-clear-inputs'); 

// 2. Estado (Ahora con LocalStorage para persistencia)
let tasas = JSON.parse(localStorage.getItem('dmd_tasas')) || { oficial: 622.21, paralelo: 622.21 }; 
let tipoTasaActual = localStorage.getItem('dmd_tipoTasa') || 'oficial'; 
let tasaActual = tasas[tipoTasaActual];

tasaSelector.value = tipoTasaActual;

// 3. Utilidades
const parsearNumero = (valorStr) => {
    if (!valorStr) return 0;
    let limpio = valorStr.toString().replace(/\./g, '').replace(',', '.');
    limpio = limpio.replace(/[^0-9.-]/g, '');
    return parseFloat(limpio) || 0;
};

const formatearNumero = (numero) => {
    return new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(numero);
};

const mostrarToast = (mensaje) => {
    toast.textContent = mensaje;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2000);
};

// 4. Cálculos
const calcular = (origen) => {
    const usd = parsearNumero(inputUsd.value);
    const ves = parsearNumero(inputVes.value);

    if (origen === 'usd') {
        inputVes.value = formatearNumero(usd * tasaActual);
    } else {
        inputUsd.value = formatearNumero(ves / tasaActual);
    }
};

const actualizarVista = () => {
    tasaActual = tasas[tipoTasaActual];
    inputUsd.value = formatearNumero(parsearNumero(inputUsd.value));
    calcular('usd');
    
    const fecha = new Date().toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'numeric', year: 'numeric' });
    fechaTexto.textContent = fecha.charAt(0).toUpperCase() + fecha.slice(1);
};

// 5. API Robusta
const obtenerTasa = async () => {
    refreshIcon.classList.add('spinning'); 
    
    try {
        const respuesta = await fetch('https://ve.dolarapi.com/v1/dolares');
        const data = await respuesta.json();
        
        const bcv = data.find(d => d.fuente === 'oficial');
        const paralelo = data.find(d => d.fuente === 'paralelo');
        
        if (bcv) tasas.oficial = bcv.promedio;
        if (paralelo) tasas.paralelo = paralelo.promedio;
        
        localStorage.setItem('dmd_tasas', JSON.stringify(tasas));
        actualizarVista();

        if (bcv) {
            const variacion = bcv.variacion || 0;
            variacionTexto.innerHTML = `<i class="icon-trending"></i> Variación: <span class="green-text">${variacion > 0 ? '+' : ''}${formatearNumero(variacion)} Bs</span>`;
        }
    } catch (error) {
        variacionTexto.innerHTML = `<i class="icon-clock"></i> Usando última tasa guardada (Sin conexión)`;
        actualizarVista();
    } finally {
        setTimeout(() => refreshIcon.classList.remove('spinning'), 500);
    }
};

// 6. Eventos
inputUsd.addEventListener('input', () => calcular('usd'));
inputVes.addEventListener('input', () => calcular('ves'));

inputUsd.addEventListener('focus', (e) => e.target.select());
inputVes.addEventListener('focus', (e) => e.target.select());

tasaSelector.addEventListener('change', (e) => {
    tipoTasaActual = e.target.value;
    localStorage.setItem('dmd_tipoTasa', tipoTasaActual);
    actualizarVista();
});

// Botones Rápidos
btnQuicks.forEach(btn => {
    btn.addEventListener('click', (e) => {
        if (btn.id === 'btn-clear-inputs') return;
        const valorSumar = parseFloat(e.target.getAttribute('data-val'));
        let actualUsd = parsearNumero(inputUsd.value);
        inputUsd.value = formatearNumero(actualUsd + valorSumar);
        calcular('usd');
    });
});

if (btnClearInputs) {
    btnClearInputs.addEventListener('click', () => {
        inputUsd.value = formatearNumero(0);
        inputVes.value = formatearNumero(0);
        mostrarToast('Calculadora reiniciada');
        inputUsd.focus();
    });
}

// 7. Compartir Resumen
btnCapture.addEventListener('click', async () => {
    const textoResumen = `📊 *Dólar Monitor Diario*
🗓 Fecha: ${fechaTexto.textContent}
💵 Tasa (${tipoTasaActual.toUpperCase()}): ${formatearNumero(tasaActual)} Bs

💰 USD: ${inputUsd.value} $
🇻🇪 Bs: ${inputVes.value} Bs

-------------------------
Calculado con DMD App`;

    if (navigator.share) {
        try {
            await navigator.share({
                title: 'Cálculo DMD',
                text: textoResumen
            });
        } catch (err) {
            console.log('Compartir cancelado');
        }
    } else {
        navigator.clipboard.writeText(textoResumen);
        mostrarToast('Resumen copiado al portapapeles');
    }
});

// Dark Mode Toggle
themeBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
});

btnRefresh.addEventListener('click', obtenerTasa);

const toggle = () => {
    sideMenu.classList.toggle('active');
    menuOverlay.classList.toggle('active');
};
btnMenuToggle.addEventListener('click', toggle);
btnCloseMenu.addEventListener('click', toggle);
menuOverlay.addEventListener('click', toggle);


// ====== CONFIGURACIÓN Y NOTIFICACIONES DE FIREBASE ======
const firebaseConfig = {
  apiKey: "AIzaSyCesCFnkX1KISBYzgHNvBdwY2R1Be7c9UQ",
  authDomain: "dolar-monitor-diario.firebaseapp.com",
  projectId: "dolar-monitor-diario",
  storageBucket: "dolar-monitor-diario.firebasestorage.app",
  messagingSenderId: "507179043038",
  appId: "1:507179043038:web:65f5541b7a09cb45531a4f"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();
const db = firebase.firestore(); 

// Función para solicitar permisos mediante botón
function solicitarPermisos() {
    Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
            console.log('Permiso de notificaciones concedido');
            
            messaging.getToken({ 
                vapidKey: 'BAo47eL2Ro2S9fsWVXjki9-b026QHG2iPtMNONzbSOA988x93F1vKlmnnkIjMJFbZIErXmk-FW7A66QptBkcFf4'
            }).then((currentToken) => {
                if (currentToken) {
                    db.collection('tokens').doc(currentToken).set({
                        token: currentToken,
                        fecha: firebase.firestore.FieldValue.serverTimestamp()
                    })
                    .then(() => {
                        console.log('¡Token guardado!');
                        mostrarToast('¡Notificaciones activadas!');
                    })
                    .catch((err) => console.error('Error al guardar:', err));
                }
            }).catch((err) => {
                console.log('Error al obtener el token:', err);
            });
mostrarToast('¡Notificaciones activas!'); 
       
          
        } else {
            console.log('Permiso denegado por el usuario');
            mostrarToast('Permiso denegado');
        }
    });
}

// Evento para el botón
if (btnEnableNotifications) {
    btnEnableNotifications.addEventListener('click', solicitarPermisos);
}

// Detectar notificaciones cuando la app SÍ está abierta (Primer Plano)
messaging.onMessage((payload) => {
    console.log('Mensaje en primer plano:', payload);
    alert(`🔔 ¡Notificación en vivo!\n\nTítulo: ${payload.notification.title}\nTexto: ${payload.notification.body}`);
});

// Ejecución inicial
obtenerTasa();

// ====== REGISTRO DEL SERVICE WORKER ======
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./firebase-messaging-sw.js')
      .then((registration) => {
        console.log('¡Service Worker registrado con éxito!', registration.scope);
      })
      .catch((error) => {
        console.error('Fallo al registrar el Service Worker:', error);
      });
  });
            }
    
