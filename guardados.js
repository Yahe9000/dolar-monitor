// guardados.js

// 1. Inyectamos la estructura visual del Modal en el HTML
const modalGuardadosHTML = `
<div id="modal-guardados" class="modal-overlay">
    <div class="modal-card" style="max-width: 400px; max-height: 90vh; display: flex; flex-direction: column;">
        <div class="modal-header">
            <h3><i class="icon-save"></i> Cálculos Guardados</h3>
            <button id="close-modal-guardados" class="btn-circle btn-small"><i class="icon-close"></i></button>
        </div>
        
        <div class="modal-body" style="overflow-y: auto; flex-grow: 1; padding-right: 5px;">
            <!-- Formulario para agregar nuevo -->
            <div class="add-saved-box" style="background: var(--bg-light); padding: 15px; border-radius: 15px; margin-bottom: 20px;">
                <input type="text" id="input-saved-name" placeholder="Ej: Alquiler, Internet..." class="saved-input-text">
                <div style="display: flex; gap: 10px; margin-top: 10px;">
                    <input type="text" inputmode="decimal" id="input-saved-amount" placeholder="Monto" class="saved-input-amount" style="flex: 1;">
                    <select id="select-saved-currency" class="saved-select">
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                    </select>
                    <button id="btn-add-saved" class="btn-circle btn-small primary" style="border-radius: 12px; width: auto; padding: 0 15px; font-weight: bold;">Añadir</button>
                </div>
            </div>

            <!-- Lista donde se renderizarán los cálculos -->
            <div id="saved-list-container" style="display: flex; flex-direction: column; gap: 12px;">
                <!-- Los items se generan aquí con JS -->
            </div>
        </div>
    </div>
</div>
`;
document.body.insertAdjacentHTML('beforeend', modalGuardadosHTML);

// 2. Referencias al DOM
const modalGuardados = document.getElementById('modal-guardados');
const btnCloseGuardados = document.getElementById('close-modal-guardados');
const inputSavedName = document.getElementById('input-saved-name');
const inputSavedAmount = document.getElementById('input-saved-amount');
const selectSavedCurrency = document.getElementById('select-saved-currency');
const btnAddSaved = document.getElementById('btn-add-saved');
const savedListContainer = document.getElementById('saved-list-container');

// Buscar el botón en el menú lateral dinámicamente
const menuItemsGuardados = document.querySelectorAll('.menu-list li');
const btnMenuGuardados = Array.from(menuItemsGuardados).find(item => item.innerHTML.includes('icon-save'));

// Activar el botón en el menú quitando el "Próximamente"
if (btnMenuGuardados) {
    btnMenuGuardados.innerHTML = '<i class="icon-save"></i> Cálculos Guardados';
    btnMenuGuardados.style.color = 'var(--accent-teal)';
}

// 3. Estado: Obtener datos de LocalStorage
let calculosGuardados = JSON.parse(localStorage.getItem('dmd_calculos_guardados')) || [];

// 4. Lógica Principal
const obtenerTasasActuales = () => {
    // Leemos las tasas actuales directamente del localStorage
    const tasasUsd = JSON.parse(localStorage.getItem('dmd_tasas')) || { oficial: 0 };
    const tipoTasaUsd = localStorage.getItem('dmd_tipoTasa') || 'oficial';
    
    return {
        USD: tasasUsd[tipoTasaUsd],
        EUR: parseFloat(localStorage.getItem('dmd_tasa_euro')) || 0
    };
};

const renderizarGuardados = () => {
    savedListContainer.innerHTML = ''; // Limpiar lista
    const tasas = obtenerTasasActuales();

    if (calculosGuardados.length === 0) {
        savedListContainer.innerHTML = '<p style="text-align: center; color: var(--gray-text); font-size: 14px;">No tienes cálculos guardados.</p>';
        return;
    }

    // Usamos DocumentFragment para optimizar la inserción en el DOM y mantener altos los FPS de la UI
    const fragment = document.createDocumentFragment();

    calculosGuardados.forEach((item) => {
        const tasaAplicar = tasas[item.moneda];
        const equivalenteBs = tasaAplicar > 0 ? (item.monto * tasaAplicar) : 0;
        
        const div = document.createElement('div');
        div.className = 'saved-item';
        div.innerHTML = `
            <div class="saved-item-info">
                <h4>${item.nombre}</h4>
                <span class="saved-original">${item.monto.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${item.moneda}</span>
            </div>
            <div class="saved-item-result">
                <span class="saved-bs">${equivalenteBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs</span>
                <button class="btn-delete-saved" data-id="${item.id}"><i class="icon-close"></i></button>
            </div>
        `;
        fragment.appendChild(div);
    });

    savedListContainer.appendChild(fragment);

    // Asignar eventos de eliminación
    document.querySelectorAll('.btn-delete-saved').forEach(btn => {
        btn.addEventListener('click', (e) => eliminarCalculo(e.currentTarget.getAttribute('data-id')));
    });
};

const agregarCalculo = () => {
    const nombre = inputSavedName.value.trim();
    const montoRaw = inputSavedAmount.value.replace(/\./g, '').replace(',', '.');
    const monto = parseFloat(montoRaw);
    const moneda = selectSavedCurrency.value;

    if (!nombre || isNaN(monto) || monto <= 0) {
        mostrarToast('Por favor, ingresa un nombre y un monto válido'); // Usa la función mostrarToast de app.js
        return;
    }

    const nuevoItem = {
        id: Date.now().toString(),
        nombre,
        monto,
        moneda
    };

    calculosGuardados.push(nuevoItem);
    localStorage.setItem('dmd_calculos_guardados', JSON.stringify(calculosGuardados));
    
    // Limpiar inputs
    inputSavedName.value = '';
    inputSavedAmount.value = '';
    
    renderizarGuardados();
    mostrarToast('Cálculo guardado');
};

const eliminarCalculo = (id) => {
    calculosGuardados = calculosGuardados.filter(item => item.id !== id);
    localStorage.setItem('dmd_calculos_guardados', JSON.stringify(calculosGuardados));
    renderizarGuardados();
};

// 5. Eventos
if (btnMenuGuardados) {
    btnMenuGuardados.addEventListener('click', () => {
        modalGuardados.classList.add('active');
        toggleMenu(); // Cerrar menú lateral (función de app.js)
        renderizarGuardados(); // Renderizar justo al abrir para tener tasas frescas
    });
}

btnCloseGuardados.addEventListener('click', () => {
    modalGuardados.classList.remove('active');
});

btnAddSaved.addEventListener('click', agregarCalculo);

// Permitir formateo básico al salir del input de monto
inputSavedAmount.addEventListener('blur', (e) => {
    const valor = parseFloat(e.target.value.replace(/\./g, '').replace(',', '.'));
    if (!isNaN(valor)) {
        e.target.value = valor.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
});
