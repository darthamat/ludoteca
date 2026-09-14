// Importar módulos SDK de Firebase v10 (Añadido 'addDoc')
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Tu configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDRJzjmWyWeFKCu2vxuQoQsiCfHjy5ufYc",
  authDomain: "ludotecaybiblioteca.firebaseapp.com",
  projectId: "ludotecaybiblioteca",
  storageBucket: "ludotecaybiblioteca.firebasestorage.app",
  messagingSenderId: "240120294378",
  appId: "1:240120294378:web:c81859c7145dfbc951e093"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Referencias a elementos del DOM
const modalJuego = document.getElementById('modal-juego');
const btnAbrirModal = document.querySelector('.section-card:nth-child(1) .btn-secondary');
const btnCerrarModal = document.getElementById('btn-cerrar-modal');
const btnCancelar = document.getElementById('btn-cancelar');
const formJuego = document.getElementById('form-juego');

const btnBuscarBGG = document.getElementById('btn-buscar-bgg');
const inputTitulo = document.getElementById('titulo');
const statusBgg = document.getElementById('bgg-status');
const resultadosDiv = document.getElementById('bgg-resultados');
const previewContainer = document.getElementById('preview-container');

// ==========================================
// 1. CARGAR Y RENDERIZAR DASHBOARD
// ==========================================
async function cargarDashboard() {
  try {
    const juegosSnap = await getDocs(collection(db, "juegos"));
    const jugadoresSnap = await getDocs(collection(db, "jugadores"));
    const partidasSnap = await getDocs(collection(db, "partidas"));

    // Actualizar contadores
    document.getElementById("total-juegos").innerText = juegosSnap.size;
    document.getElementById("total-jugadores").innerText = jugadoresSnap.size;
    document.getElementById("total-partidas").innerText = partidasSnap.size;

    // Renderizar lista de juegos recientes
    const listaJuegos = document.getElementById("lista-juegos");
    if (juegosSnap.empty) {
      listaJuegos.innerHTML = `<p class="empty-text">No hay juegos cargados aún.</p>`;
    } else {
      listaJuegos.innerHTML = "";
      juegosSnap.forEach(doc => {
        const juego = doc.data();
        const div = document.createElement("div");
        div.className = "juego-item-mini";
        div.style.cssText = "display:flex; align-items:center; gap:0.75rem; padding:0.5rem 0; border-bottom:1px solid var(--border-color);";
        div.innerHTML = `
          <img src="${juego.imagenUrl || 'https://via.placeholder.com/40'}" style="width:40px; height:40px; object-fit:cover; border-radius:4px;">
          <div>
            <strong style="font-size:0.9rem; display:block;">${juego.titulo}</strong>
            <span style="font-size:0.75rem; color:var(--text-muted);">${juego.minJugadores}-${juego.maxJugadores} jug. | ${juego.duracion} min</span>
          </div>
        `;
        listaJuegos.appendChild(div);
      });
    }

  } catch (error) {
    console.error("Error cargando los datos de Firebase: ", error);
  }
}

window.addEventListener("DOMContentLoaded", cargarDashboard);

// ==========================================
// 2. CONTROL DEL MODAL
// ==========================================
function abrirModal() {
  modalJuego.classList.add('active');
}

function cerrarModal() {
  modalJuego.classList.remove('active');
  formJuego.reset();
  statusBgg.innerText = "";
  resultadosDiv.style.display = "none";
  if (previewContainer) previewContainer.style.display = "none";
}

btnAbrirModal.addEventListener('click', abrirModal);
btnCerrarModal.addEventListener('click', cerrarModal);
btnCancelar.addEventListener('click', cerrarModal);

modalJuego.addEventListener('click', (e) => {
  if (e.target === modalJuego) cerrarModal();
});

// ==========================================
// 3. INTEGRACIÓN CON BGG (SEARCH & THING)
// ==========================================
const BGG_API_SEARCH = "https://boardgamegeek.com/xmlapi2/search";
const BGG_API_THING = "https://boardgamegeek.com/xmlapi2/thing";

btnBuscarBGG.addEventListener('click', async () => {
  const query = inputTitulo.value.trim();
  if (!query) {
    statusBgg.innerText = "Por favor, escribe el nombre de un juego.";
    return;
  }

  statusBgg.innerText = "Buscando en BoardGameGeek...";
  resultadosDiv.style.display = "none";
  resultadosDiv.innerHTML = "";

  try {
    const response = await fetch(`${BGG_API_SEARCH}?type=boardgame&query=${encodeURIComponent(query)}`);
    if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);

    const xmlText = await response.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "text/xml");
    const items = xmlDoc.getElementsByTagName("item");

    if (items.length === 0) {
      statusBgg.innerText = "No se encontraron coincidencias en BGG.";
      return;
    }

    statusBgg.innerText = "Selecciona el juego correcto:";
    resultadosDiv.style.display = "block";

    const maxResults = Math.min(items.length, 6);
    for (let i = 0; i < maxResults; i++) {
      const item = items[i];
      const id = item.getAttribute("id");
      const nameNode = item.getElementsByTagName("name")[0];
      const name = nameNode ? nameNode.getAttribute("value") : "Sin título";
      const yearNode = item.getElementsByTagName("yearpublished")[0];
      const year = yearNode ? yearNode.getAttribute("value") : "";

      const div = document.createElement("div");
      div.className = "bgg-item";
      div.innerHTML = `<span><strong>${name}</strong></span> <span class="bgg-item-year">${year ? `(${year})` : ''}</span>`;
      
      div.addEventListener("click", () => obtenerDetalleJuegoBGG(id));
      resultadosDiv.appendChild(div);
    }
  } catch (error) {
    console.error("Error buscando en BGG:", error);
    statusBgg.innerText = "Error de conexión con BGG.";
  }
});

async function obtenerDetalleJuegoBGG(bggId) {
  statusBgg.innerText = "Cargando detalles del juego...";
  resultadosDiv.style.display = "none";

  try {
    const response = await fetch(`${BGG_API_THING}?id=${bggId}`);
    const xmlText = await response.text();

    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "text/xml");
    const item = xmlDoc.getElementsByTagName("item")[0];

    if (!item) throw new Error("Juego no encontrado");

    const titulo = item.querySelector('name[type="primary"]')?.getAttribute("value") || "";
    const anio = item.querySelector("yearpublished")?.getAttribute("value") || "";
    const minPlayers = item.querySelector("minplayers")?.getAttribute("value") || 1;
    const maxPlayers = item.querySelector("maxplayers")?.getAttribute("value") || 4;
    const playingTime = item.querySelector("playingtime")?.getAttribute("value") || 60;
    const image = item.querySelector("image")?.textContent || item.querySelector("thumbnail")?.textContent || "";
    
    const autorNode = item.querySelector('link[type="boardgamedesigner"]');
    const autor = autorNode ? autorNode.getAttribute("value") : "";

    const catNode = item.querySelector('link[type="boardgamecategory"]');
    const categoria = catNode ? catNode.getAttribute("value") : "";

    document.getElementById("titulo").value = titulo;
    document.getElementById("anio").value = anio;
    document.getElementById("autor").value = autor;
    document.getElementById("minJugadores").value = minPlayers;
    document.getElementById("maxJugadores").value = maxPlayers;
    document.getElementById("duracion").value = playingTime;
    document.getElementById("categoria").value = categoria;
    document.getElementById("imagenUrl").value = image;

    if (image && previewContainer) {
      document.getElementById("img-preview").src = image;
      previewContainer.style.display = "flex";
    }

    statusBgg.innerText = "¡Datos rellenados automáticamente!";
  } catch (error) {
    console.error("Error obteniendo detalles del juego:", error);
    statusBgg.innerText = "Error al cargar la ficha del juego.";
  }
}

// ==========================================
// 4. GUARDAR JUEGO EN FIRESTORE
// ==========================================
formJuego.addEventListener('submit', async (e) => {
  e.preventDefault(); // Evita recargar la página

  const nuevoJuego = {
    titulo: document.getElementById("titulo").value,
    autor: document.getElementById("autor").value,
    anio: Number(document.getElementById("anio").value) || null,
    minJugadores: Number(document.getElementById("minJugadores").value),
    maxJugadores: Number(document.getElementById("maxJugadores").value),
    duracion: Number(document.getElementById("duracion").value),
    categoria: document.getElementById("categoria").value,
    imagenUrl: document.getElementById("imagenUrl").value,
    fechaCreacion: new Date()
  };

  try {
    await addDoc(collection(db, "juegos"), nuevoJuego);
    cerrarModal();
    cargarDashboard(); // Recarga la vista para mostrar el nuevo juego
  } catch (error) {
    console.error("Error al guardar el juego:", error);
    alert("Hubo un error al guardar el juego en Firestore.");
  }
});
