// Estado global
let shoppingList = [];
let logsData = [];
let listId = null;
let currentUser = null;

// Elementos del DOM
const form = document.getElementById('add-item-form');
const input = document.getElementById('item-input');
const listEl = document.getElementById('shopping-list');
const emptyState = document.getElementById('empty-state');
const countEl = document.getElementById('items-count');
const shareBtn = document.getElementById('share-btn');
const toastEl = document.getElementById('toast');

// Logs y Login Elements
const loginModal = document.getElementById('login-modal');
const loginForm = document.getElementById('login-form');
const usernameInput = document.getElementById('username-input');
const logsBtn = document.getElementById('logs-btn');
const logsPanel = document.getElementById('logs-panel');
const logsListEl = document.getElementById('logs-list');
const closeLogsBtn = document.getElementById('close-logs-btn');
const logsBadge = document.getElementById('logs-badge');

// Inicialización
function init() {
    // Manejo del Login
    currentUser = localStorage.getItem('username');
    if (!currentUser) {
        loginModal.classList.remove('hidden');
    } else {
        loginModal.classList.add('hidden');
    }

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = usernameInput.value.trim();
        if (name) {
            currentUser = name;
            localStorage.setItem('username', name);
            loginModal.classList.add('hidden');
        }
    });

    // Revisar si hay un ID en la URL
    const urlParams = new URLSearchParams(window.location.search);
    listId = urlParams.get('list');

    if (!listId) {
        const newListId = Math.random().toString(36).substring(2, 9);
        window.history.replaceState(null, '', `?list=${newListId}`);
        listId = newListId;
    }

    // Cargar datos iniciales
    loadList();

    // Event Listeners principales
    form.addEventListener('submit', handleAddItem);
    shareBtn.addEventListener('click', handleShare);
    
    // Listeners del Panel de Logs
    logsBtn.addEventListener('click', () => {
        logsPanel.classList.toggle('hidden');
        logsBadge.classList.add('hidden'); // Ocultar notita roja
    });
    
    closeLogsBtn.addEventListener('click', () => {
        logsPanel.classList.add('hidden');
    });

    // Cierra el panel si haces click afuera
    document.addEventListener('click', (e) => {
        if (!logsPanel.contains(e.target) && !logsBtn.contains(e.target)) {
            logsPanel.classList.add('hidden');
        }
    });

    // Polling súper rápido para "Tiempo real instantáneo" (1 segundo)
    // Se le agrega un parámetro 't' para evitar cualquier caché
    setInterval(loadList, 1000);
}

// Cargar la lista desde el backend (Cloudflare Functions / Worker)
async function loadList() {
    try {
        const response = await fetch(`/api/list?id=${listId}&t=${Date.now()}`);
        if (response.ok) {
            const data = await response.json();
            const newItems = data.items || [];
            const newLogs = data.logs || [];
            
            // Si hay cambios en los logs o en los items, redibujamos
            const changedItems = JSON.stringify(shoppingList) !== JSON.stringify(newItems);
            const changedLogs = JSON.stringify(logsData) !== JSON.stringify(newLogs);

            if (changedItems) {
                shoppingList = newItems;
                renderList();
            }

            if (changedLogs) {
                const isFirstLoad = logsData.length === 0;
                const previousLength = logsData.length;
                
                logsData = newLogs;
                renderLogs();

                // Mostrar notificación roja si hay un log nuevo y no tenemos el panel abierto
                if (!isFirstLoad && logsData.length > previousLength && logsPanel.classList.contains('hidden')) {
                    logsBadge.classList.remove('hidden');
                }
            }
        }
    } catch (error) {
        // Modo fallback ignorado por brevedad
    }
}

// Guardar datos en el backend
async function saveList() {
    try {
        await fetch(`/api/list?id=${listId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ items: shoppingList, logs: logsData })
        });
    } catch (error) {
        console.error("Error guardando la lista:", error);
    }
}

// Helper para agregar log
function addLog(action, itemName) {
    const newLog = {
        id: Date.now().toString(),
        user: currentUser || 'Alguien',
        action: action, // 'added', 'completed', 'deleted'
        itemName: itemName,
        time: Date.now()
    };

    logsData.unshift(newLog);
    // Mantener solo los últimos 40 logs
    if (logsData.length > 40) {
        logsData = logsData.slice(0, 40);
    }
}

// Añadir nuevo item
function handleAddItem(e) {
    e.preventDefault();
    const text = input.value.trim();
    if (!text || !currentUser) return; // Requiere estar logueado

    const newItem = {
        id: Date.now().toString(),
        text,
        completed: false,
        author: currentUser
    };

    shoppingList.push(newItem);
    addLog('added', text);
    
    input.value = '';
    
    renderList();
    renderLogs();
    saveList();
}

// Alternar estado de completado
window.toggleItem = function(id) {
    const item = shoppingList.find(i => i.id === id);
    if (item) {
        item.completed = !item.completed;
        addLog(item.completed ? 'completed' : 'uncompleted', item.text);
        renderList();
        renderLogs();
        saveList();
    }
};

// Eliminar item
window.deleteItem = function(id, event) {
    event.stopPropagation(); // Evitar que dispare el toggle
    const item = shoppingList.find(i => i.id === id);
    if (item) {
        addLog('deleted', item.text);
        shoppingList = shoppingList.filter(i => i.id !== id);
        renderList();
        renderLogs();
        saveList();
    }
};

// Compartir (Copiar URL)
function handleShare() {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
        showToast('Enlace copiado. ¡Compártelo con tus amigos!');
    }).catch(() => {
        showToast('Error al copiar el enlace');
    });
}

// Formatear tiempo relativo (ej: "Hace 2 minutos")
function timeAgo(ms) {
    const seconds = Math.floor((Date.now() - ms) / 1000);
    if (seconds < 60) return "Justo ahora";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `Hace ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Hace ${hours} h`;
    return `Hace ${Math.floor(hours / 24)} días`;
}

// Mostrar Toast
function showToast(message) {
    toastEl.textContent = message;
    toastEl.classList.remove('hidden');
    void toastEl.offsetWidth; 
    toastEl.classList.add('show');
    
    setTimeout(() => {
        toastEl.classList.remove('show');
        setTimeout(() => {
            toastEl.classList.add('hidden');
        }, 300);
    }, 3000);
}

// Renderizar la interfaz
function renderList() {
    listEl.innerHTML = '';
    countEl.textContent = shoppingList.length;

    if (shoppingList.length === 0) {
        emptyState.classList.remove('hidden');
        return;
    }

    emptyState.classList.add('hidden');

    const sortedList = [...shoppingList].sort((a, b) => {
        if (a.completed === b.completed) return 0;
        return a.completed ? 1 : -1;
    });

    sortedList.forEach(item => {
        const li = document.createElement('li');
        li.className = `shopping-item ${item.completed ? 'completed' : ''}`;
        
        li.innerHTML = `
            <div class="item-content" onclick="toggleItem('${item.id}')">
                <div class="checkbox-custom">
                    <i class="ph ph-check"></i>
                </div>
                <div class="item-details">
                    <span class="item-name">${item.text}</span>
                    ${item.author ? `<span class="item-author">Añadido por ${item.author}</span>` : ''}
                </div>
            </div>
            <button class="btn-delete" aria-label="Eliminar producto" onclick="deleteItem('${item.id}', event)">
                <i class="ph ph-trash"></i>
            </button>
        `;
        listEl.appendChild(li);
    });
}

function renderLogs() {
    logsListEl.innerHTML = '';
    
    if (logsData.length === 0) {
        logsListEl.innerHTML = '<li class="log-item" style="text-align: center; color: var(--text-muted)">Sin actividad aún</li>';
        return;
    }

    logsData.forEach(log => {
        const li = document.createElement('li');
        li.className = `log-item ${log.action}`;
        
        let actionText = '';
        if (log.action === 'added') actionText = 'añadió';
        else if (log.action === 'completed') actionText = 'tachó';
        else if (log.action === 'uncompleted') actionText = 'desmarcó';
        else if (log.action === 'deleted') actionText = 'eliminó';

        li.innerHTML = `
            <span><strong>${log.user}</strong> ${actionText} <em>${log.itemName}</em></span>
            <span class="log-time">${timeAgo(log.time)}</span>
        `;
        logsListEl.appendChild(li);
    });
}

// Iniciar app
document.addEventListener('DOMContentLoaded', init);
