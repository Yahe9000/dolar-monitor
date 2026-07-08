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

// Indicador dinámico de símbolo de divisa ($ / € / ₮)
const simboloMoneda = inputUsd ? inputUsd.parentElement.querySelector('span') : null;

// ==========================================
// 3. ESTADO DE LA APLICACIÓN
// ==========================================
let tasas = JSON.parse(localStorage.getItem('dmd_tasas')) || { 
    oficial: 622.21, 
    paralelo: 622.21, 
    usdt: 645.50, 
    euro: 662.15, 
    personalizada: 622.21 
}; 
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

function actualizarSimboloVisual() {
    if (simboloMoneda) {
        if (tipoTasaActual === 'euro') simboloMoneda.textContent = '€';
        else if (tipoTasaActual === 'usdt') simboloMoneda.textContent = '₮';
        else simboloMoneda.textContent = '$';
    }
}

// Alias de control de menú buscado por módulos externos (ej: calculadora-euro)
function toggle() {
    toggleMenu();
}

// ==========================================
// 5. LÓGICA DE CÁLCULO Y API MULTI-TASA
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
        // Ejecución en paralelo de todas las fuentes necesarias
        const [resDolar, resEuro, resUsdt] = await Promise.all([
            fetch('https://ve.dolarapi.com/v1/dolares'),
            fetch('https://ve.dolarapi.com/v1/euros'),
            fetch('https://pydolarvenezuela-api.vercel.app/api/v1/dollar/page?page=binance').catch(() => null)
        ]);
        
        const dataDolar = await resDolar.json();
        const dataEuro = await resEuro.json();
        
        // Sincronizar Dólar Oficial BCV y Paralelo
        const bcv = dataDolar.find(d => d.fuente === 'oficial');
        const paralelo = dataDolar.find(d => d.fuente === 'paralelo');
        if (bcv) tasas.oficial = bcv.promedio;
        if (paralelo) tasas.paralelo = paralelo.promedio;

        // Sincronizar Euro Oficial (BCV)
        if (Array.isArray(dataEuro)) {
            const euroOficial = dataEuro.find(e => e.fuente === 'oficial') || dataEuro[0];
            if (euroOficial) tasas.euro = euroOficial.promedio;
        } else if (dataEuro && dataEuro.promedio) {
            tasas.euro = dataEuro.promedio;
        }

        // Sincronizar USDT Binance (PyDolarVenezuela API)
        if (resUsdt) {
            const dataUsdt = await resUsdt.json();
            if (dataUsdt.monitors && dataUsdt.monitors.binance) {
                tasas.usdt = dataUsdt.monitors.binance.price;
            }
        }

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
            fechaTexto.style.color = "var(--text-main)";
        }
        
        calcular('usd');
        console.log('Todas las tasas sincronizadas con éxito:', tasas);
    } catch (error) {
        console.error('Error obteniendo tasas de los servidores:', error);
        mostrarToast('Usando tasas locales sin conexión');
        
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

// Selector de Tasas Avanzado (BCV / Paralelo / USDT / Euro / Personalizada)
if (tasaSelector) {
    tasaSelector.value = tipoTasaActual;
    actualizarSimboloVisual();
    
    tasaSelector.addEventListener('change', (e) => {
        tipoTasaActual = e.target.value;
        localStorage.setItem('dmd_tipoTasa', tipoTasaActual);
        tasaActual = tasas[tipoTasaActual];
        actualizarSimboloVisual();
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
            let etiqueta = 'USD';
            if(tipoTasaActual === 'euro') etiqueta = 'EUR';
            if(tipoTasaActual === 'usdt') etiqueta = 'USDT';
            mostrarToast(`Monto ${etiqueta} copiado`);
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

// ==========================================
// Generación y captura del Recibo Dinámico
// ==========================================
if (btnCapture) {
    btnCapture.addEventListener('click', () => {
        mostrarToast('Generando recibo...');

        // 1. Crear el contenedor temporal fuera de la pantalla visible
        const recibo = document.createElement('div');
        recibo.style.position = 'fixed';
        recibo.style.left = '-9999px';
        recibo.style.top = '0';
        recibo.style.width = '350px';
        recibo.style.padding = '24px';
        recibo.style.background = '#ffffff';
        recibo.style.color = '#222222';
        recibo.style.fontFamily = "'Courier New', Courier, monospace"; // Look clásico de ticket
        recibo.style.borderRadius = '4px';

        const fechaHoraActual = new Date().toLocaleString('es-VE', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit', hour12: true
        });

        // 2. Estructurar el diseño del ticket de cambio
        recibo.innerHTML = `
            <div style="text-align: center; border-bottom: 2px dashed #aaaaaa; padding-bottom: 14px; margin-bottom: 14px;">
                <img id="recibo-logo" src="Logo_512.png" style="width: 75px; height: 75px; margin-bottom: 8px; object-fit: contain;" />
                <h2 style="margin: 0; font-size: 16px; font-weight: bold; letter-spacing: 1px;">DOLAR MONITOR DIARIO</h2>
                <p style="margin: 4px 0 0 0; font-size: 11px; color: #555;">Comprobante de Conversión</p>
            </div>
            <table style="width: 100%; font-size: 13px; border-collapse: collapse; color: #333;">
                <tr>
                    <td style="padding: 4px 0; text-align: left;"><strong>Fecha:</strong></td>
                    <td style="padding: 4px 0; text-align: right;">${fechaHoraActual}</td>
                </tr>
                <tr>
                    <td style="padding: 4px 0; text-align: left;"><strong>Tasa de cambio:</strong></td>
                    <td style="padding: 4px 0; text-align: right; text-transform: uppercase;">${tipoTasaActual}</td>
                </tr>
                <tr>
                    <td style="padding: 4px 0; text-align: left;"><strong>Valor Tasa:</strong></td>
                    <td style="padding: 4px 0; text-align: right; font-weight: bold;">Bs. ${formatearNumero(tasaActual)}</td>
                </tr>
                <tr>
                    <td colspan="2" style="border-top: 1px dashed #cccccc; padding: 6px 0; margin-top: 6px;"></td>
                </tr>
                <tr style="font-size: 15px;">
                    <td style="padding: 6px 0; text-align: left;"><strong>Monto Divisa:</strong></td>
                    <td style="padding: 6px 0; text-align: right; font-weight: bold; color: #1b5e20;">${simboloMoneda ? simboloMoneda.textContent : '$'} ${inputUsd.value || '0,00'}</td>
                </tr>
                <tr style="font-size: 15px;">
                    <td style="padding: 6px 0; text-align: left;"><strong>Monto VES:</strong></td>
                    <td style="padding: 6px 0; text-align: right; font-weight: bold; color: #0d47a1;">Bs. ${inputVes.value || '0,00'}</td>
                </tr>
            </table>
            <div style="border-top: 2px dashed #aaaaaa; padding-top: 10px; margin-top: 16px; text-align: center; font-size: 10px; color: #777;">
                <p style="margin: 0; text-transform: uppercase;">Verificado Electrónicamente</p>
            </div>
        `;

        document.body.appendChild(recibo);

        const imgLogo = recibo.querySelector('#recibo-logo');

        // 3. Renderizar y procesar la salida (Compartir o Descargar)
        const procesarEnvio = () => {
            html2canvas(recibo, { useCORS: true, backgroundColor: '#ffffff' }).then(canvas => {
                document.body.removeChild(recibo); // Limpieza inmediata del DOM

                canvas.toBlob(blob => {
                    if (!blob) {
                        mostrarToast('Error al procesar el recibo');
                        return;
                    }

                    const nombreArchivo = `Recibo-${Date.now()}.png`;
                    const file = new File([blob], nombreArchivo, { type: 'image/png' });

                    // Validar si el navegador móvil permite compartir archivos nativos
                    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                        navigator.share({
                            files: [file],
                            title: 'Recibo de Conversión',
                            text: `Conversión: ${simboloMoneda ? simboloMoneda.textContent : '$'}${inputUsd.value || '0,00'} = Bs. ${inputVes.value || '0,00'} VES`
                        })
                        .then(() => mostrarToast('¡Recibo compartido!'))
                        .catch(err => {
                            console.log('Compartir cancelado o interrumpido, descargando...', err);
                            descargarImagenFallback(canvas);
                        });
                    } else {
                        // Caída de seguridad si corre en navegadores sin soporte Web Share extendido
                        descargarImagenFallback(canvas);
                    }
                }, 'image/png');
            }).catch(err => {
                console.error('Error procesando el canvas:', err);
                if (document.body.contains(recibo)) document.body.removeChild(recibo);
                mostrarToast('Error al crear el recibo');
            });
        };

        // Forzar validación de carga del logo antes de disparar el canvas
        if (imgLogo.complete) {
            procesarEnvio();
        } else {
            imgLogo.onload = procesarEnvio;
            imgLogo.onerror = () => {
                console.warn('No se pudo incluir el Logo_512.png en el recibo, procesando sin imagen...');
                procesarEnvio();
            };
        }
    });
}

// Función auxiliar para descarga directa
function descargarImagenFallback(canvas) {
    const link = document.createElement('a');
    link.download = `ReciboMonitor-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    mostrarToast('Recibo descargado localmente');
}

// Disparador del Botón de Notificaciones
if (btnEnableNotifications) {
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

// Ejecución inicial al cargar la App
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
