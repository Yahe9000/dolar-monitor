// ==========================================
// 1. INICIALIZACIÓN DE FIREBASE (COMPAT)
// ==========================================
if (!firebase.apps.length) {
    firebase.initializeApp({
        apiKey: "AIzaSyCesCFnkX1KISBYzgHNvBdwY2R1Be7c9UQ",
        authDomain: "dolar-monitor-diario.firebaseapp.com",
        projectId: "dolar-monitor-diario",
        storageBucket: "dolar-monitor-diario.firebasestorage.app",
        messagingSenderId: "507179043038",
        appId: "1:507179043038:web:65f5541b7a09cb45531a4f"
    });
}
const db = firebase.firestore();
const messaging = firebase.messaging();

// ==========================================
// 2. REFERENCIAS AL DOM
// ==========================================
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

const btnMenuToggle = document.getElementById('btn-menu-toggle');
const btnCloseMenu = document.getElementById('btn-close-menu');
const sideMenu = document.getElementById('side-menu');
const menuOverlay = document.getElementById('menu-overlay');
const btnQuicks = document.querySelectorAll('.btn-quick');
const copyUsd = document.getElementById('copy-usd');
const copyVes = document.getElementById('copy-ves');
const toast = document.getElementById('toast');
const btnClearInputs = document.getElementById('btn-clear-inputs'); 

// ==========================================
// 3. ESTADO DE LA APLICACIÓN
// ==========================================
let tasas = JSON.parse(localStorage.getItem('dmd_tasas')) || { oficial: 622.21, paralelo: 622.21, personalizada: 622.21 }; 
let tipoTasaActual = localStorage.getItem('dmd_tipoTasa') || 'oficial'; 
let tasaActual = tasas[tipoTasaActual];

// ==========================================
// 4. FUNCIONES HELPER / DE SOPORTE
// ==========================================
function formatearNumero(num) {
    if (isNaN(num) || num === null) return '0,00';
    return Number(num).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function parsearNumero(str) {
    if (!str) return 0;
    return parseFloat(str.replace(/\./g, '').replace(',', '.'));
}

function mostrarToast(mensaje) {
    if (toast) {
        toast.textContent = mensaje;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }
}

function toggleMenu() {
    if (sideMenu && menuOverlay) {
        sideMenu.classList.toggle('active');
        menuOverlay.classList.toggle('active');
    }
}

// Alias de control de menú buscado por módulos externos (ej: calculadora-euro)
function toggle() {
    toggleMenu();
}

// ==========================================
// 5. LÓGICA DE CÁLCULO Y API
// ==========================================
function calcular(origen) {
    const vUsd = parsearNumero(inputUsd.value);
    const vVes = parsearNumero(inputVes.value);
    tasaActual = tasas[tipoTasaActual] || 1;

    if (origen === 'usd') {
        if (!isNaN(vUsd) && inputUsd.value !== '') {
            inputVes.value = formatearNumero(vUsd * tasaActual);
        } else {
            inputVes.value = '';
        }
    } else if (origen === 'ves') {
        if (!isNaN(vVes) && inputVes.value !== '') {
            inputUsd.value = formatearNumero(vVes / tasaActual);
        } else {
            inputUsd.value = '';
        }
    }
}

async function obtenerTasa() {
    if (refreshIcon) refreshIcon.classList.add('spinning');
    try {
        const res = await fetch('https://ve.dolarapi.com/v1/dolares');
        const data = await res.json();
        
        const bcv = data.find(d => d.fuente === 'oficial');
        const paralelo = data.find(d => d.fuente === 'paralelo');

        if (bcv) tasas.oficial = bcv.promedio;
        if (paralelo) tasas.paralelo = paralelo.promedio;

        localStorage.setItem('dmd_tasas', JSON.stringify(tasas));
        tasaActual = tasas[tipoTasaActual];
        
        // Guardamos la fecha exacta de sincronización exitosa
        const ahora = new Date();
        const fechaFormateada = ahora.toLocaleDateString('es-VE', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit', hour12: true
        });
        localStorage.setItem('dmd_ultima_fecha', fechaFormateada);
        
        if (fechaTexto) {
            fechaTexto.innerHTML = fechaFormateada;
            fechaTexto.style.color = "var(--text-main)"; // Color normal
        }
        
        calcular('usd');
        console.log('Tasas sincronizadas con éxito:', tasas);
    } catch (error) {
        console.error('Error obteniendo tasas:', error);
        mostrarToast('Usando tasas locales sin conexión');
        
        // Recuperamos la última fecha y la mostramos en rojo con alerta
        const fechaGuardada = localStorage.getItem('dmd_ultima_fecha') || 'Fecha desconocida';
        if (fechaTexto) {
            fechaTexto.innerHTML = `⚠️ Tasa del: ${fechaGuardada}`;
            fechaTexto.style.color = "#ff3c3c";
        }
        
        tasaActual = tasas[tipoTasaActual];
        calcular('usd');
    } finally {
        if (refreshIcon) refreshIcon.classList.remove('spinning');
    }
}

// ==========================================
// 6. GESTIÓN DE NOTIFICACIONES PUSH
// ==========================================
function solicitarPermisos() {
    // Eliminamos el 'return' temprano para permitir re-sincronizar el token siempre
    Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
            console.log('Permiso de notificaciones concedido');
            
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.ready.then((registration) => {
                    messaging.getToken({ 
                        vapidKey: 'BAo47eL2Ro2S9fsWVXjki9-b026QHG2iPtMNONzbSOA988x93F1vKlmnnkIjMJFbZIErXmk-FW7A66QptBkcFf4',
                        serviceWorkerRegistration: registration 
                    }).then((currentToken) => {
                        if (currentToken) {
                            db.collection('tokens').doc(currentToken).set({
                                token: currentToken,
                                fecha: firebase.firestore.FieldValue.serverTimestamp()
                            })
                            .then(() => {
                                console.log('¡Token guardado!');
                                
                                localStorage.setItem('dmd_notificaciones_activas', 'true');
                                
                                // Cambiamos el color para indicar éxito sin bloquear el botón
                                if (btnEnableNotifications) {
                                    btnEnableNotifications.style.color = "var(--accent-teal)";
                                }
                                
                                mostrarToast('¡Notificaciones activadas!');
                            })
                            .catch((err) => console.error('Error al guardar en Firestore:', err));
                        }
                    }).catch((err) => {
                        console.error('Error al obtener el token de FCM:', err);
                    });
                }).catch((err) => {
                    console.error('Error con el Service Worker activo:', err);
                });
            }
        } else {
            console.log('Permiso denegado por el usuario');
            mostrarToast('Permiso denegado');
        }
    });
}

// ==========================================
// 7. EVENTOS Y ESCUCHADORES DE LA INTERFAZ
// ==========================================

// Entradas numéricas
if (inputUsd) {
    inputUsd.addEventListener('input', () => calcular('usd'));
    inputUsd.addEventListener('focus', (e) => e.target.select());
}
if (inputVes) {
    inputVes.addEventListener('input', () => calcular('ves'));
    inputVes.addEventListener('focus', (e) => e.target.select());
}

// Botón de actualización manual de la API
if (btnRefresh) btnRefresh.addEventListener('click', obtenerTasa);

// Selector de Tasas (BCV / Paralelo / Personalizada)
if (tasaSelector) {
    tasaSelector.value = tipoTasaActual;
    tasaSelector.addEventListener('change', (e) => {
        tipoTasaActual = e.target.value;
        localStorage.setItem('dmd_tipoTasa', tipoTasaActual);
        tasaActual = tasas[tipoTasaActual];
        calcular('usd');
    });
}

// Botón para limpiar cajas de texto
if (btnClearInputs) {
    btnClearInputs.addEventListener('click', () => {
        inputUsd.value = '';
        inputVes.value = '';
    });
}

// Copiar al portapapeles
if (copyUsd && inputUsd) {
    copyUsd.addEventListener('click', () => {
        if(inputUsd.value) {
            navigator.clipboard.writeText(inputUsd.value);
            mostrarToast('Monto USD copiado');
        }
    });
}
if (copyVes && inputVes) {
    copyVes.addEventListener('click', () => {
        if(inputVes.value) {
            navigator.clipboard.writeText(inputVes.value);
            mostrarToast('Monto Bs copiado');
        }
    });
}

// Botones rápidos de incremento (+1, +5, etc)
btnQuicks.forEach(btn => {
    btn.addEventListener('click', () => {
        const valorAgregar = parseFloat(btn.getAttribute('data-val')) || 0;
        let actualUsd = parsearNumero(inputUsd.value) || 0;
        inputUsd.value = formatearNumero(actualUsd + valorAgregar);
        calcular('usd');
    });
});

// Controladores del Menú Desplegable
if (btnMenuToggle) btnMenuToggle.addEventListener('click', toggleMenu);
if (btnCloseMenu) btnCloseMenu.addEventListener('click', toggleMenu);
if (menuOverlay) menuOverlay.addEventListener('click', toggleMenu);

// Control de Tema (Oscuro / Claro)
if (themeBtn) {
    if (localStorage.getItem('dmd_theme') === 'dark') {
        document.body.classList.add('dark-mode');
        themeBtn.innerHTML = '<i class="icon-sun"></i>';
    }
    themeBtn.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        if (document.body.classList.contains('dark-mode')) {
            localStorage.setItem('dmd_theme', 'dark');
            themeBtn.innerHTML = '<i class="icon-sun"></i>';
        } else {
            localStorage.setItem('dmd_theme', 'light');
            themeBtn.innerHTML = '<i class="icon-moon"></i>';
        }
    });
}

// Captura de Pantalla del Monitor
if (btnCapture) {
    btnCapture.addEventListener('click', () => {
        const objetivo = document.querySelector('.container') || document.body;
        mostrarToast('Generando imagen...');
        html2canvas(objetivo, { useCORS: true, backgroundColor: null }).then(canvas => {
            canvas.toBlob(blob => {
                const item = new ClipboardItem({ "image/png": blob });
                navigator.clipboard.write([item]).then(() => {
                    mostrarToast('¡Imagen copiada al portapapeles!');
                }).catch(err => {
                    console.error('Fallo de portapapeles, descargando alternativamente...', err);
                    const link = document.createElement('a');
                    link.download = `DolarMonitor-${Date.now()}.png`;
                    link.href = canvas.toDataURL();
                    link.click();
                });
            });
        });
    });
}

// Disparador del Botón de Notificaciones
if (btnEnableNotifications) {
    // Si ya activó las notifs, le damos color al ícono, pero siempre será clickeable
    if (localStorage.getItem('dmd_notificaciones_activas') === 'true') {
        btnEnableNotifications.style.color = "var(--accent-teal)";
    }
    btnEnableNotifications.addEventListener('click', solicitarPermisos);
}

// Captura de mensajes Push mientras la App está abierta (Primer plano)
messaging.onMessage((payload) => {
    console.log('Mensaje recibido en tiempo real:', payload);
    alert(`🔔 ¡Notificación en vivo!\n\nTítulo: ${payload.notification.title}\nTexto: ${payload.notification.body}`);
});

// Execución inicial al cargar la App
obtenerTasa();

// ==========================================
// 8. REGISTRO OFICIAL DEL SERVICE WORKER
// ==========================================
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
