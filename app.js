// Estado global
let shoppingList = [];
let listId = null;

// Elementos del DOM
const form = document.getElementById('add-item-form');
const input = document.getElementById('item-input');
const listEl = document.getElementById('shopping-list');
const emptyState = document.getElementById('empty-state');
const countEl = document.getElementById('items-count');
const shareBtn = document.getElementById('share-btn');
const toastEl = document.getElementById('toast');

// Inicialización
function init() {
    // Revisar si hay un ID en la URL
    const urlParams = new URLSearchParams(window.location.search);
    listId = urlParams.get('list');

    if (!listId) {
        // Si no hay lista, crear un ID aleatorio y redirigir
        const newListId = Math.random().toString(36).substring(2, 9);
        window.history.replaceState(null, '', `?list=${newListId}`);
        listId = newListId;
    }

    // Cargar datos iniciales
    loadList();

    // Event Listeners
    form.addEventListener('submit', handleAddItem);
    shareBtn.addEventListener('click', handleShare);
    
    // Polling básico para simular "tiempo real" cada 5 segundos
    setInterval(loadList, 5000);
}

// Cargar la lista desde el backend (Cloudflare Functions)
async function loadList() {
    try {
        const response = await fetch(`/api/list?id=${listId}`);
        if (response.ok) {
            const data = await response.json();
            shoppingList = data.items || [];
            renderList();
        } else {
            console.error("Error cargando la lista");
        }
    } catch (error) {
        console.error("Error de red:", error);
        // Fallback local en caso de error (para desarrollo visual)
        const localData = localStorage.getItem(`list_${listId}`);
        if (localData) {
            shoppingList = JSON.parse(localData);
            renderList();
        }
    }
}

// Guardar lista en el backend
async function saveList() {
    try {
        await fetch(`/api/list?id=${listId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ items: shoppingList })
        });
    } catch (error) {
        console.error("Error guardando la lista:", error);
    }
    // Fallback local
    localStorage.setItem(`list_${listId}`, JSON.stringify(shoppingList));
}

// Añadir nuevo item
function handleAddItem(e) {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;

    const newItem = {
        id: Date.now().toString(),
        text,
        completed: false
    };

    shoppingList.push(newItem);
    input.value = '';
    
    renderList();
    saveList();
}

// Alternar estado de completado
function toggleItem(id) {
    const item = shoppingList.find(i => i.id === id);
    if (item) {
        item.completed = !item.completed;
        renderList();
        saveList();
    }
}

// Eliminar item
function deleteItem(id, event) {
    event.stopPropagation(); // Evitar que dispare el toggle
    shoppingList = shoppingList.filter(i => i.id !== id);
    renderList();
    saveList();
}

// Compartir (Copiar URL)
function handleShare() {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
        showToast('Enlace copiado. ¡Compártelo con tus amigos!');
    }).catch(() => {
        showToast('Error al copiar el enlace');
    });
}

// Mostrar Toast
function showToast(message) {
    toastEl.textContent = message;
    toastEl.classList.remove('hidden');
    
    // Forzar reflow para animación
    void toastEl.offsetWidth; 
    
    toastEl.classList.add('show');
    
    setTimeout(() => {
        toastEl.classList.remove('show');
        setTimeout(() => {
            toastEl.classList.add('hidden');
        }, 300); // Esperar a que termine la animación
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

    // Ordenar: primero los no completados
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
                <span class="item-name">${item.text}</span>
            </div>
            <button class="btn-delete" aria-label="Eliminar producto" onclick="deleteItem('${item.id}', event)">
                <i class="ph ph-trash"></i>
            </button>
        `;
        
        listEl.appendChild(li);
    });
}

// Iniciar app
document.addEventListener('DOMContentLoaded', init);
