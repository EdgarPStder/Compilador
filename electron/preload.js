/**
 * preload.js
 * Puente seguro entre el proceso principal (Node) y la interfaz (navegador).
 *
 * La interfaz NO tiene acceso a Node ni al sistema de archivos: solo puede
 * llamar a las funciones expuestas aqui, que a su vez hablan por IPC con
 * electron/main.js.
 */

const { contextBridge, ipcRenderer } = require('electron');

// El coloreado del codigo y el subrayado de errores corren aqui mismo (no
// por IPC) porque se llaman mientras se escribe: asi aparecen al instante,
// sin esperar respuesta.
const { resaltarCodigo } = require('../src/core/01.lexico/ResaltadoCodigo');
const { erroresParaMarcar } = require('../src/core/Compilador');

/** Ordenes que el menu de la aplicacion manda a la interfaz. */
const CANALES_MENU = [
  'menu:abrir', 'menu:guardar', 'menu:guardarJava', 'menu:limpiar',
  'menu:analizar', 'menu:equipo', 'menu:salir', 'menu:ejemplo',
  'menu:pestana'
];

contextBridge.exposeInMainWorld('api', {
  // --- Compilador ---
  analizar: (fuente, opciones) => ipcRenderer.invoke('compilador:analizar', fuente, opciones),
  equipo: () => ipcRenderer.invoke('compilador:equipo'),
  /** El codigo en HTML con los colores de Java (ver ResaltadoCodigo.js). */
  resaltar: (texto) => resaltarCodigo(texto),
  /**
   * El codigo con colores y sus errores subrayados en rojo.
   * @param {string} pestana 'lexico' | 'sintactico' | 'semantico' |
   *                         'intermedio' | 'optimizacion' | 'objeto': que
   *                         errores se marcan (ver erroresParaMarcar).
   * @returns {{html: string, errores: Array}}
   */
  revisar: (texto, pestana) => {
    const errores = erroresParaMarcar(texto, pestana).map((e) => ({
      fase: e.fase, linea: e.linea, columna: e.columna, mensaje: e.mensaje, sugerencia: e.sugerencia
    }));
    return { html: resaltarCodigo(texto, errores), errores };
  },

  // --- Archivos ---
  abrirArchivo: () => ipcRenderer.invoke('archivo:abrir'),
  /** Lee el texto de un archivo que se solto sobre la ventana. */
  leerArchivo: (texto) => ipcRenderer.invoke('archivo:leer', texto),
  guardarReporte: (fuente, pestana) => ipcRenderer.invoke('archivo:guardar', fuente, pestana),
  /** Abre en el navegador el ultimo reporte .html que se guardo. */
  verReporte: () => ipcRenderer.invoke('archivo:verReporte'),
  /** Guarda el programa Java de la fase 6 (clase.java). */
  guardarJava: (fuente) => ipcRenderer.invoke('archivo:guardarJava', fuente),

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
