/**
 * main.js
 * Proceso principal de Electron.
 *
 * Responsabilidades:
 *   - Crear la ventana de la aplicacion y su menu.
 *   - Ejecutar el compilador (que vive en src/core) y devolver el resultado
 *     a la interfaz por IPC.
 *   - Atender las operaciones de archivo: guardar el reporte (.html o .bs)
 *     y volver a abrirlo.
 *
 * La interfaz corre con contextIsolation activado: no tiene acceso directo a
 * Node. Todo pasa por el puente definido en preload.js.
 */

const { app, BrowserWindow, ipcMain, dialog, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs');

const { compilar } = require('../src/core/Compilador');
const { contenidoParaGuardar, leerArchivoGuardado } = require('../src/core/ArchivoGuardado');
const { datosEquipo } = require('../src/core/comun/Equipo');
const { logosParaReporte } = require('./logos');

const RAIZ = path.join(__dirname, '..');
let ventana = null;

/** Ruta del ultimo reporte .html guardado, para el boton "Abrir reporte". */
let ultimoReporte = null;

/**
 * Carpeta de la documentacion.
 * Empaquetada la app, docs/ viaja como recurso externo (ver "extraResources"
 * en package.json) porque una carpeta dentro del asar no se puede abrir con
 * el explorador de archivos.
 */
function carpetaDocumentacion () {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'docs')
    : path.join(RAIZ, 'docs');
}

/** Carpeta de los programas de ejemplo. */
function carpetaEjemplos () {
  return path.join(RAIZ, 'ejemplos');
}

/** Lista los programas de ejemplo disponibles. */
function listarEjemplos () {
  const dir = carpetaEjemplos();
  try {
    return fs.readdirSync(dir)
      .filter((f) => f.endsWith('.bs'))
      .sort()
      .map((f) => ({ nombre: f, ruta: path.join(dir, f) }));
  } catch (e) {
    return [];
  }
}

// ---------------------------------------------------------------- ventana
function crearVentana () {
  // En el ejecutable el icono lo pone electron-builder dentro del .exe; en
  // desarrollo se toma del archivo, si existe.
  const icono = path.join(RAIZ, 'build', 'icono.png');

  ventana = new BrowserWindow({
    width: 1180,
    height: 860,
    minWidth: 900,
    minHeight: 640,
    backgroundColor: '#eef1f6',
    show: false,
    title: 'Compilador SwordByte',
    icon: fs.existsSync(icono) ? icono : undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  ventana.loadFile(path.join(RAIZ, 'src', 'ui', 'index.html'));
  ventana.once('ready-to-show', () => ventana.show());

  // Durante el desarrollo, los errores de la interfaz se ven en la terminal.
  if (!app.isPackaged) {
    ventana.webContents.on('console-message', (e, nivel, mensaje, linea, fuente) => {
      if (nivel >= 2) console.error(`[interfaz] ${mensaje}  (${fuente}:${linea})`);
    });
  }

  ventana.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// ---------------------------------------------------------------- menu
function construirMenu () {
  const ejemplos = listarEjemplos();

  const menuEjemplos = ejemplos.length > 0
    ? ejemplos.map((ej) => ({
        label: ej.nombre,
        click: () => abrirEjemplo(ej)
      }))
    : [{ label: 'No se encontraron ejemplos', enabled: false }];

  const plantilla = [
    {
      label: 'Archivo',
      submenu: [
        { label: 'Abrir...', accelerator: 'CmdOrCtrl+O', click: () => enviar('menu:abrir') },
        { label: 'Guardar reporte...', accelerator: 'CmdOrCtrl+S', click: () => enviar('menu:guardar') },
        { type: 'separator' },
        { label: 'Limpiar', accelerator: 'CmdOrCtrl+L', click: () => enviar('menu:limpiar') },
        { type: 'separator' },
        { label: 'Salir', accelerator: 'CmdOrCtrl+Q', click: () => enviar('menu:salir') }
      ]
    },
    {
      label: 'Analizar',
      submenu: [
        { label: 'Analizar (llena las tres pestañas)', accelerator: 'F5', click: () => enviar('menu:analizar') }
      ]
    },
    {
      label: 'Ejemplos',
      submenu: menuEjemplos
    },
    {
      label: 'Ver',
      submenu: [
        { label: '1. Analizador Léxico', accelerator: 'CmdOrCtrl+1', click: () => enviar('menu:pestana', 'lexico') },
        { label: '2. Analizador Léxico-Sintáctico', accelerator: 'CmdOrCtrl+2', click: () => enviar('menu:pestana', 'sintactico') },
        { label: '3. Analizador Semántico', accelerator: 'CmdOrCtrl+3', click: () => enviar('menu:pestana', 'semantico') },
        { type: 'separator' },
        { role: 'reload', label: 'Recargar' },
        { role: 'toggleDevTools', label: 'Herramientas de desarrollo' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Zoom normal' },
        { role: 'zoomIn', label: 'Acercar' },
        { role: 'zoomOut', label: 'Alejar' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Pantalla completa' }
      ]
    },
    {
      label: 'Ayuda',
      submenu: [
        { label: 'Equipo', click: () => enviar('menu:equipo') },
        { label: 'Documentación del proyecto', click: () => abrirDocumentacion() },
        {
          label: 'Acerca de',
          click: () => {
            dialog.showMessageBox(ventana, {
              type: 'info',
              title: 'Acerca de',
              message: 'Compilador SwordByte 1.0.0',
              detail: 'Analizador léxico, léxico-sintáctico y semántico.\nEquipo SwordByte.'
            });
          }
        }
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(plantilla));
}

/** Lee un ejemplo y lo manda a la interfaz para que lo analice. */
function abrirEjemplo (ejemplo) {
  try {
    const contenido = fs.readFileSync(ejemplo.ruta, 'utf8');
    enviar('menu:ejemplo', { nombre: ejemplo.nombre, contenido });
  } catch (e) {
    dialog.showMessageBox(ventana, {
      type: 'error',
      title: 'Ejemplos',
      message: `No se pudo abrir el ejemplo ${ejemplo.nombre}.`,
      detail: e.message
    });
  }
}

/** Abre la carpeta de documentacion, avisando si no esta disponible. */
async function abrirDocumentacion () {
  const carpeta = carpetaDocumentacion();

  if (!fs.existsSync(carpeta)) {
    await dialog.showMessageBox(ventana, {
      type: 'warning',
      title: 'Documentación del proyecto',
      message: 'No se encontró la carpeta de documentación.',
      detail: `Se buscó en:\n${carpeta}\n\n` +
              'La documentación está en la carpeta docs/ del proyecto:\n' +
              'README.md y los archivos 01 a 07.'
    });
    return;
  }

  const error = await shell.openPath(carpeta);
  if (error) {
    await dialog.showMessageBox(ventana, {
      type: 'warning',
      title: 'Documentación del proyecto',
      message: 'No se pudo abrir la carpeta de documentación.',
      detail: `${error}\n\nLa documentación está en:\n${carpeta}`
    });
  }
}

function enviar (canal, datos) {
  if (ventana && !ventana.isDestroyed()) ventana.webContents.send(canal, datos);
}

// ---------------------------------------------------------------- IPC

/** Ejecuta las fases del compilador sobre el codigo recibido. */
ipcMain.handle('compilador:analizar', (evento, fuente, opciones) => {
  try {
    return { ok: true, resultado: compilar(fuente || '', opciones || {}) };
  } catch (e) {
    return { ok: false, error: e.message, pila: e.stack };
  }
});

/** Datos del equipo y de la materia, para la ventana "Equipo". */
ipcMain.handle('compilador:equipo', () => datosEquipo());

/**
 * Cierra la aplicacion. La pregunta "¿Quieres salir?" ya la hizo la
 * interfaz con su propia ventana (la de Fuga / Salir / Termina), asi que
 * aqui no se vuelve a preguntar.
 */
ipcMain.handle('app:salir', () => {
  app.quit();
  return { ok: true };
});

/**
 * Lee un archivo guardado y devuelve lo que la interfaz necesita:
 * { ok, contenido, pestana } o { ok: false, error }.
 * Que hacer con cada tipo de archivo se decide en ArchivoGuardado.js.
 */
function abrirGuardado (texto) {
  const r = leerArchivoGuardado(texto);
  if (!r.ok) return r;
  return { ok: true, contenido: r.codigo, pestana: r.pestana };
}

/** Dialogo Abrir: reportes .html, programas .bs y texto .txt. */
ipcMain.handle('archivo:abrir', async () => {
  const r = await dialog.showOpenDialog(ventana, {
    title: 'Abrir programa o reporte',
    defaultPath: carpetaEjemplos(),
    filters: [
      { name: 'Archivos del compilador', extensions: ['html', 'htm', 'bs', 'txt'] },
      { name: 'Reportes visuales', extensions: ['html', 'htm'] },
      { name: 'Programas SwordByte', extensions: ['bs'] },
      { name: 'Archivos de texto', extensions: ['txt'] },
      { name: 'Todos los archivos', extensions: ['*'] }
    ],
    properties: ['openFile']
  });
  if (r.canceled || r.filePaths.length === 0) return { ok: false, cancelado: true };

  const ruta = r.filePaths[0];
  try {
    return Object.assign(abrirGuardado(fs.readFileSync(ruta, 'utf8')), { ruta });
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

/** Un archivo que se solto sobre la ventana: la interfaz ya leyo su texto. */
ipcMain.handle('archivo:leer', (evento, texto) => abrirGuardado(texto));

/**
 * Guarda el reporte completo: datos del equipo y la materia, codigo fuente
 * y los tres analisis. El formato depende de la extension elegida:
 *   .html  el reporte visual (se ofrece primero)
 *   .bs    el reporte en texto, que sigue siendo un programa SwordByte
 */
ipcMain.handle('archivo:guardar', async (evento, fuente, pestana) => {
  const r = await dialog.showSaveDialog(ventana, {
    title: 'Guardar reporte del análisis',
    defaultPath: path.join(app.getPath('documents'), 'analisis.html'),
    filters: [
      { name: 'Reporte visual (se abre en el navegador)', extensions: ['html'] },
      { name: 'Reporte en texto (programa SwordByte)', extensions: ['bs'] }
    ]
  });
  if (r.canceled || !r.filePath) return { ok: false, cancelado: true };

  try {
    const resultado = compilar(fuente || '', {});
    const archivo = contenidoParaGuardar(resultado, path.basename(r.filePath), {
      pestana,
      logos: logosParaReporte()
    });
    fs.writeFileSync(r.filePath, archivo.contenido, 'utf8');
    ultimoReporte = archivo.formato === 'html' ? r.filePath : null;
    return { ok: true, ruta: r.filePath, formato: archivo.formato };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

/** Abre en el navegador el ultimo reporte .html guardado. */
ipcMain.handle('archivo:verReporte', async () => {
  if (!ultimoReporte || !fs.existsSync(ultimoReporte)) return { ok: false };
  const error = await shell.openPath(ultimoReporte);
  return { ok: error === '', error };
});

// ---------------------------------------------------------------- ciclo de vida
app.whenReady().then(() => {
  construirMenu();
  crearVentana();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) crearVentana();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
