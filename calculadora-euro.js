// calculadora-euro.js

// 1. Inyectamos la estructura visual de la calculadora (Modal) en el HTML desde aquí
const modalHTML = `
<div id="modal-euro" class="modal-overlay">
    <div class="modal-card">
        <div class="modal-header">
            <h3>Calculadora Euro</h3>
            <button id="close-modal-euro" class="btn-circle btn-small"><i class="icon-close"></i></button>
        </div>
        <div class="modal-body">
            <p class="subtitle" id="tasa-euro-text" style="margin-bottom: 5px;">Cargando tasa oficial...</p>
            <div class="input-row">
                <span>€</span>
                <input type="text" inputmode="decimal" id="input-eur" value="1,00">
            </div>
            <div class="input-row">
                <span>Bs</span>
                <input type="text" inputmode="decimal" id="input-ves-eur" value="0,00">
            </div>
        </div>
    </div>
</div>
`;
// Esto lo agrega automáticamente al final de tu página
document.body.insertAdjacentHTML('beforeend', modalHTML);

// 2. Referencias a los elementos que acabamos de crear
const modalEuro = document.getElementById('modal-euro');
const btnCloseEuro = document.getElementById('close-modal-euro');
const inputEur = document.getElementById('input-eur');
const inputVesEur = document.getElementById('input-ves-eur');
const tasaEuroText = document.getElementById('tasa-euro-text');

// 3. Buscar el botón en tu menú lateral dinámicamente y activarlo
const menuItems = document.querySelectorAll('.menu-list li');
const btnMenuEuro = Array.from(menuItems).find(item => item.innerHTML.includes('icon-euro'));

// Actualizamos el texto para quitar el "(Próximamente)"
if (btnMenuEuro) {
    btnMenuEuro.innerHTML = '<i class="icon-euro"></i> Calculadora EUR/VES';
    btnMenuEuro.style.color = 'var(--accent-teal)'; // Le damos color para que se vea activo
}

// 4. Variables de la tasa (Guarda en caché por si falla el internet)
let tasaEuroActual = parseFloat(localStorage.getItem('dmd_tasa_euro')) || 0;

// 5. Lógica matemática (Aprovecha las funciones de app.js)
const calcularEuro = (origen) => {
    const eur = parsearNumero(inputEur.value);
    const ves = parsearNumero(inputVesEur.value);

    if (origen === 'eur') {
        inputVesEur.value = formatearNumero(eur * tasaEuroActual);
    } else {
        inputEur.value = formatearNumero(ves / tasaEuroActual);
    }
};

// 6. Consultar la API (DolarAPI - Euro Oficial)
const obtenerTasaEuro = async () => {
    tasaEuroText.textContent = "Obteniendo tasa...";
    try {
        // CORRECCIÓN: La API devuelve un array en /v1/euros, igual que con los dólares
        const respuesta = await fetch('https://ve.dolarapi.com/v1/euros');
        const data = await respuesta.json();
        
        // Buscamos la fuente oficial (BCV) dentro de la respuesta
        const euroOficial = data.find(d => d.fuente === 'oficial');
        
        if (euroOficial) {
            tasaEuroActual = euroOficial.promedio;
        } else if (data.length > 0) {
            tasaEuroActual = data[0].promedio; // Respaldo analítico
        }
        
        localStorage.setItem('dmd_tasa_euro', tasaEuroActual);
        
        tasaEuroText.innerHTML = `Tasa oficial BCV: <strong>${formatearNumero(tasaEuroActual)} Bs / €</strong>`;
        calcularEuro('eur'); 
    } catch (error) {
        console.error("Error cargando euro:", error);
        tasaEuroText.innerHTML = `Tasa guardada: <strong>${formatearNumero(tasaEuroActual)} Bs / €</strong> (Sin conexión)`;
        calcularEuro('eur');
    }
};


// 7. Eventos
if (btnMenuEuro) {
    btnMenuEuro.addEventListener('click', () => {
        modalEuro.classList.add('active'); // Mostrar ventanita flotante
        
        // CORRECCIÓN: Cambiado toggleMenu() por toggle() que es la que declaraste en app.js
        if (typeof toggle === 'function') {
            toggle(); 
        }
        
        obtenerTasaEuro(); // Buscar el precio actualizado de forma segura
    });
}

btnCloseEuro.addEventListener('click', () => {
    modalEuro.classList.remove('active'); // Cerrar ventanita
});

// Detectar cuando escribes
inputEur.addEventListener('input', () => calcularEuro('eur'));
inputVesEur.addEventListener('input', () => calcularEuro('ves'));

// Seleccionar todo al tocar (Mejora UX)
inputEur.addEventListener('focus', (e) => e.target.select());
inputVesEur.addEventListener('focus', (e) => e.target.select());

// Formatear al salir del input
inputEur.addEventListener('blur', (e) => e.target.value = formatearNumero(parsearNumero(e.target.value)));
inputVesEur.addEventListener('blur', (e) => e.target.value = formatearNumero(parsearNumero(e.target.value)));
