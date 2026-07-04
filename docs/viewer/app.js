// Configuración de Mermaid.js
mermaid.initialize({
    startOnLoad: false,
    theme: 'dark', // Se actualizará dinámicamente según el tema
    fontFamily: 'Inter, sans-serif',
    flowchart: {
        curve: 'basis'
    },
    securityLevel: 'loose'
});

// Referencias a elementos DOM
const contentDiv = document.getElementById('content');
const docTitle = document.getElementById('current-doc-title');
const navItems = document.querySelectorAll('.nav-item');
const themeToggle = document.getElementById('theme-toggle');

// Estado de la aplicación
let currentFile = 'FD01-Informe-Factibilidad.md';
let isDarkMode = true;

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    // Configurar tema
    const savedTheme = localStorage.getItem('enmask_theme');
    if (savedTheme === 'light') {
        toggleTheme();
    }

    // Event Listeners para navegación
    navItems.forEach(btn => {
        btn.addEventListener('click', (e) => {
            navItems.forEach(nav => nav.classList.remove('active'));
            const target = e.currentTarget;
            target.classList.add('active');
            
            const file = target.getAttribute('data-file');
            loadMarkdownFile(file, target.innerText.trim());
        });
    });

    // Theme Toggle Listener
    themeToggle.addEventListener('click', toggleTheme);

    // Cargar el documento inicial
    loadMarkdownFile(currentFile, '01 Informe de Factibilidad');
});

// Función para cambiar de tema
function toggleTheme() {
    isDarkMode = !isDarkMode;
    document.body.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
    localStorage.setItem('enmask_theme', isDarkMode ? 'dark' : 'light');
    
    // Actualizar configuración de Mermaid
    mermaid.initialize({
        theme: isDarkMode ? 'dark' : 'default'
    });
    
    // Recargar el diagrama actual con el nuevo tema
    const activeNav = document.querySelector('.nav-item.active');
    loadMarkdownFile(activeNav.getAttribute('data-file'), activeNav.innerText.trim(), false);
}

// Función para cargar y renderizar Markdown
async function loadMarkdownFile(filename, title, showLoader = true) {
    if(showLoader) {
        contentDiv.innerHTML = `
            <div class="loader-container">
                <div class="spinner"></div>
                <p>Cargando ${filename}...</p>
            </div>
        `;
    }
    docTitle.textContent = title.substring(3); // Quitar el número del inicio

    try {
        // Fetching del archivo md (debe estar en el servidor o contexto local apropiado)
        // Como el index.html está en docs/viewer, los MDs están un nivel arriba en docs/
        const response = await fetch(`../${filename}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const text = await response.text();
        renderContent(text);
        
    } catch (error) {
        console.error("Error cargando markdown:", error);
        contentDiv.innerHTML = `
            <div style="text-align:center; padding: 3rem;">
                <h2 style="color: #ef4444; margin-bottom: 1rem;">Error de Carga</h2>
                <p>No se pudo cargar el archivo <strong>${filename}</strong>.</p>
                <p style="font-size: 0.9em; margin-top: 1rem; opacity: 0.7;">
                    Asegúrate de estar ejecutando la aplicación a través de un servidor local (Ej: Live Server, http-server, python -m http.server) para evitar problemas de CORS al hacer peticiones Fetch locales.
                </p>
                <pre style="margin-top:2rem; text-align:left;">${error.message}</pre>
            </div>
        `;
    }
}

// Función para renderizar Markdown + Mermaid
async function renderContent(markdownText) {
    // 1. Configurar marked para tratar los bloques 'mermaid' de manera especial
    const renderer = new marked.Renderer();
    
    renderer.code = function (code, language) {
        if (language === 'mermaid') {
            return `<div class="mermaid">${code}</div>`;
        }
        return `<pre><code class="language-${language}">${code}</code></pre>`;
    };
    
    marked.setOptions({ renderer: renderer });

    // 2. Convertir MD a HTML
    const htmlContent = marked.parse(markdownText);
    
    // 3. Inyectar en el DOM
    contentDiv.innerHTML = htmlContent;
    
    // 4. Hacer trigger del render de Mermaid
    try {
        await mermaid.run({
            querySelector: '.mermaid',
            suppressErrors: true
        });
    } catch (err) {
        console.error("Error renderizando diagramas Mermaid:", err);
    }
}
