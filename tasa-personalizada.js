// tasa-personalizada.js

// 1. Referencias al DOM (Apuntando exactamente a los IDs de tu HTML)
const modalManual = document.getElementById('modal-manual-rate');
const btnCloseManual = document.getElementById('btn-close-manual-rate');
const inputTasaManual = document.getElementById('input-manual-rate');
const btnSaveManual = document.getElementById('btn-save-manual-rate');
const btnMenuManual = document.getElementById('btn-open-manual-rate'); // <- CORREGIDO

// 2. Inicializar Estado
// Si no existe la tasa personalizada en el objeto global 'tasas', le damos un valor base.
if (!tasas.personalizada) {
    tasas.personalizada = tasas.oficial || 622.21;
}

// 3. Lógica de Guardado y Aplicación
const aplicarTasaManual = () => {
    const valorManual = parsearNumero(inputTasaManual.value);
    
    if (valorManual <= 0 || isNaN(valorManual)) {
        mostrarToast('Ingresa un monto válido');
        return;
    }

    // Guardamos la nueva tasa en tu objeto global de app.js
    tasas.personalizada = valorManual;
    
    // Actualizamos el objeto en el LocalStorage para que no se pierda al reiniciar
    localStorage.setItem('dmd_tasas', JSON.stringify(tasas));
    
    // Cambiamos el selector visualmente a "personalizada" (Tasa Manual)
    tasaSelector.value = 'personalizada';
    
    // Disparamos el evento 'change' del selector para que app.js recalcule todo automáticamente
    tasaSelector.dispatchEvent(new Event('change'));
    
    // Cerramos el modal y notificamos
    modalManual.classList.remove('active');
    mostrarToast('Tasa manual aplicada');
};

// 4. Configurar Eventos
if (btnMenuManual) {
    btnMenuManual.addEventListener('click', () => {
        // Abrimos el modal
        modalManual.classList.add('active');
        
        // Cerramos el menú lateral usando la función global de tu app.js
        if (typeof toggleMenu === 'function') {
            toggleMenu(); 
        }
        
        // Colocamos el valor actual formateado en el input para que sea cómodo cambiarlo
        inputTasaManual.value = formatearNumero(tasas.personalizada);
        
        // Auto-enfoque y selección completa del texto
        setTimeout(() => {
            inputTasaManual.focus(); 
            inputTasaManual.select();
        }, 100);
    });
}

// Evento para cerrar desde la 'X'
if (btnCloseManual) {
    btnCloseManual.addEventListener('click', () => modalManual.classList.remove('active'));
}

// Cerrar si el usuario pisa fuera de la tarjeta del modal
if (modalManual) {
    modalManual.addEventListener('click', (e) => {
        if (e.target === modalManual) {
            modalManual.classList.remove('active');
        }
    });
}

// Guardar al hacer click en el botón azul/verde
if (btnSaveManual) {
    btnSaveManual.addEventListener('click', aplicarTasaManual);
}

// Guardar automáticamente si el usuario presiona "Enter" en el teclado
if (inputTasaManual) {
    inputTasaManual.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') aplicarTasaManual();
    });
}
