/**
 * preload.js
 * Puente seguro entre el proceso principal (Node) y la interfaz (navegador).
 *
 * La interfaz NO tiene acceso a Node ni al sistema de archivos: solo puede
 * llamar a las funciones expuestas aqui, que a su vez hablan por IPC con
 * electron/main.js.
 */

const { contextBridge, ipcRenderer } = require('electron');

/** Ordenes que el menu de la aplicacion manda a la interfaz. */
const CANALES_MENU = [
  'menu:abrir', 'menu:guardar', 'menu:limpiar',
  'menu:analizar', 'menu:equipo', 'menu:salir', 'menu:ejemplo',
  'menu:pestana'
];

contextBridge.exposeInMainWorld('api', {
  // --- Compilador ---
  analizar: (fuente, opciones) => ipcRenderer.invoke('compilador:analizar', fuente, opciones),
  equipo: () => ipcRenderer.invoke('compilador:equipo'),

  // --- Archivos ---
  abrirArchivo: () => ipcRenderer.invoke('archivo:abrir'),
  /** Lee el texto de un archivo que se solto sobre la ventana. */
  leerArchivo: (texto) => ipcRenderer.invoke('archivo:leer', texto),
  guardarReporte: (fuente, pestana) => ipcRenderer.invoke('archivo:guardar', fuente, pestana),
  /** Abre en el navegador el ultimo reporte .html que se guardo. */
  verReporte: () => ipcRenderer.invoke('archivo:verReporte'),

  // --- Cerrar la aplicacion (la interfaz ya pregunto antes) ---
  salir: () => ipcRenderer.invoke('app:salir'),

  /**
   * Recibe las ordenes del menu.
   * @param {Function} manejador (orden, datos) => void
   */
  alMenu: (manejador) => {
    CANALES_MENU.forEach((canal) => {
      ipcRenderer.on(canal, (evento, datos) =>
        manejador(canal.replace('menu:', ''), datos));
    });
  }
});
