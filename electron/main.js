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
const { nombreDelArchivo, contenidoParaGuardar, leerArchivoGuardado } = require('../src/core/ArchivoGuardado');
const { datosEquipo } = require('../src/core/comun/Equipo');
const { logosParaReporte } = require('./logos');

const RAIZ = path.join(__dirname, '..');
let ventana = null;

/** Ruta del ultimo reporte .html guardado, para el boton "Abrir reporte". */
let ultimoReporte = null;

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
        { label: 'Guardar fuente (.sb)...', click: () => enviar('menu:guardarFuente') },
        { label: 'Guardar compilado (.java)...', click: () => enviar('menu:guardarCompilado') },
        { type: 'separator' },
        { label: 'Limpiar', accelerator: 'CmdOrCtrl+L', click: () => enviar('menu:limpiar') },
        { type: 'separator' },
        { label: 'Salir', accelerator: 'CmdOrCtrl+Q', click: () => enviar('menu:salir') }
      ]
    },
    {
      label: 'Editar',
      submenu: [
        // El atajo lo atiende la interfaz (dentro del cuadro de código), así
        // que el menú solo lo muestra.
        { label: 'Insertar clase y clasePrincipal', accelerator: 'CmdOrCtrl+Shift+N',
          registerAccelerator: false, click: () => enviar('menu:insertarClase') },
        { type: 'separator' },
        { role: 'undo', label: 'Deshacer' },
        { role: 'redo', label: 'Rehacer' },
        { type: 'separator' },
        { role: 'cut', label: 'Cortar' },
        { role: 'copy', label: 'Copiar' },
        { role: 'paste', label: 'Pegar' },
        { role: 'selectAll', label: 'Seleccionar todo' }
      ]
    },
    {
      label: 'Analizar',
      submenu: [
        { label: 'Analizar (llena todas las pestañas)', accelerator: 'F5', click: () => enviar('menu:analizar') }
      ]
    },
    {
      label: 'Ejemplos',
      submenu: menuEjemplos
    },
    {
      label: 'Ver',
      submenu: [
        { label: 'Proyecto Final', accelerator: 'CmdOrCtrl+0', click: () => enviar('menu:pestana', 'final') },
        { type: 'separator' },
        { label: '1. Analizador Léxico', accelerator: 'CmdOrCtrl+1', click: () => enviar('menu:pestana', 'lexico') },
        { label: '2. Analizador Léxico-Sintáctico', accelerator: 'CmdOrCtrl+2', click: () => enviar('menu:pestana', 'sintactico') },
        { label: '3. Analizador Semántico', accelerator: 'CmdOrCtrl+3', click: () => enviar('menu:pestana', 'semantico') },
        { label: 'Cerrar pestañas de analizadores', click: () => enviar('menu:cerrarPestanas') },
        { type: 'separator' },
        { role: 'reload', label: 'Recargar' },
        { role: 'toggleDevTools', label: 'Herramientas de desarrollo' },
        { type: 'separator' },
        // El atajo lo atiende la interfaz. registerAccelerator:false deja que
        // el menú lo muestre sin que Electron se quede con la tecla.
        { label: 'Zoom normal', accelerator: 'CmdOrCtrl+Shift+0', registerAccelerator: false,
          click: () => enviar('menu:zoom', 'normal') },
        { label: 'Acercar', accelerator: 'CmdOrCtrl+Plus', registerAccelerator: false,
          click: () => enviar('menu:zoom', 'mas') },
        { label: 'Alejar', accelerator: 'CmdOrCtrl+-', registerAccelerator: false,
          click: () => enviar('menu:zoom', 'menos') },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Pantalla completa' }
      ]
    },
    {
      label: 'Ayuda',
      submenu: [
        { label: 'Equipo', click: () => enviar('menu:equipo') },
        { label: 'Documentación', accelerator: 'F1', registerAccelerator: false,
          click: () => enviar('menu:documentacion') },
        {
          label: 'Acerca de',
          click: () => {
            dialog.showMessageBox(ventana, {
              type: 'info',
              title: 'Acerca de',
              message: 'Compilador SwordByte 1.0.0',
              detail: 'Analizador léxico, léxico-sintáctico, semántico y generador de Java.\n' +
                      'Proyecto Final de Programación de Sistemas Base II.\nEquipo SwordByte.'
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
 *
 * Como en Java, el archivo se llama igual que su clase: clase ejemplo ->
 * ejemplo.html. Ese es el nombre que se propone, y si se escribe otro, se
 * pregunta antes de guardarlo con el nombre de la clase.
 */
ipcMain.handle('archivo:guardar', async (evento, fuente, pestana) => {
  const resultado = compilar(fuente || '', {});
  const nombre = nombreDelArchivo(resultado);

  const r = await dialog.showSaveDialog(ventana, {
    title: 'Guardar reporte del análisis',
    defaultPath: path.join(app.getPath('documents'), nombre + '.html'),
    filters: [
      { name: 'Reporte visual (se abre en el navegador)', extensions: ['html'] },
      { name: 'Reporte en texto (programa SwordByte)', extensions: ['bs'] }
    ]
  });
  if (r.canceled || !r.filePath) return { ok: false, cancelado: true };

  let ruta = r.filePath;
  const extension = path.extname(ruta);
  const elegido = path.basename(ruta, extension);

  // Se escribio otro nombre: el archivo debe llamarse como la clase.
  if (nombre !== 'analisis' && elegido !== nombre) {
    ruta = path.join(path.dirname(ruta), nombre + extension);
    const yaExiste = fs.existsSync(ruta);
    const respuesta = await dialog.showMessageBox(ventana, {
      type: 'question',
      title: 'El archivo se llama como la clase',
      message: `El archivo se guardará como ${path.basename(ruta)}`,
      detail: `Como en Java, el archivo de una clase se llama igual que ella: la clase ` +
        `es «${nombre}», no «${elegido}».` +
        (yaExiste ? `\n\nYa existe ${path.basename(ruta)} en esa carpeta: se reemplazará.` : ''),
      buttons: [`Guardar como ${path.basename(ruta)}`, 'Cancelar'],
      defaultId: 0,
      cancelId: 1
    });
    if (respuesta.response !== 0) return { ok: false, cancelado: true };
  }

  try {
    const archivo = contenidoParaGuardar(resultado, path.basename(ruta), {
      pestana,
      logos: logosParaReporte()
    });
    fs.writeFileSync(ruta, archivo.contenido, 'utf8');
    ultimoReporte = archivo.formato === 'html' ? ruta : null;
    return { ok: true, ruta, formato: archivo.formato };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

/**
 * Pide la carpeta donde crear la carpeta de la clase y la crea.
 * @param {string} nombreClase Nombre de la clase (y de la carpeta).
 * @param {string} titulo      Titulo del dialogo.
 * @returns {Promise<string|null>} Ruta de la carpeta, o null si se cancelo.
 */
async function crearCarpetaDeClase (nombreClase, titulo) {
  const r = await dialog.showOpenDialog(ventana, {
    title: titulo,
    defaultPath: app.getPath('documents'),
    buttonLabel: 'Guardar aquí',
    properties: ['openDirectory', 'createDirectory']
  });
  if (r.canceled || r.filePaths.length === 0) return null;

  const carpeta = path.join(r.filePaths[0], nombreClase);
  fs.mkdirSync(carpeta, { recursive: true });
  return carpeta;
}

/**
 * Guarda la fuente SwordByte en  <carpeta elegida>/<clase>/<clase>.sb
 * La carpeta y el archivo llevan el nombre de la clase del programa.
 */
ipcMain.handle('archivo:guardarFuente', async (evento, fuente) => {
  const resultado = compilar(fuente || '', {});
  const nombre = nombreDelArchivo(resultado);

  if (nombre === 'analisis') {
    return {
      ok: false,
      error: 'Para guardar la fuente, el código debe ser un programa completo con su clase.'
    };
  }

  const carpeta = await crearCarpetaDeClase(
    nombre, `Elige dónde crear la carpeta de la clase «${nombre}»`);
  if (!carpeta) return { ok: false, cancelado: true };

  const ruta = path.join(carpeta, nombre + '.sb');
  try {
    fs.writeFileSync(ruta, String(fuente || ''), 'utf8');
    return { ok: true, ruta, carpeta };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

/**
 * Guarda el Java generado en  <carpeta elegida>/<clase>/<clase>.java
 */
ipcMain.handle('archivo:guardarCompilado', async (evento, fuente) => {
  const resultado = compilar(fuente || '', {});
  const nombre = nombreDelArchivo(resultado);

  if (!resultado.java || !resultado.java.ok) {
    return {
      ok: false,
      error: resultado.java && resultado.java.error
        ? resultado.java.error
        : 'Todavía no hay código Java para guardar.'
    };
  }

  const carpeta = await crearCarpetaDeClase(
    nombre, `Elige dónde crear la carpeta de la clase «${nombre}»`);
  if (!carpeta) return { ok: false, cancelado: true };

  const ruta = path.join(carpeta, nombre + '.java');
  try {
    fs.writeFileSync(ruta, resultado.java.codigo, 'utf8');
    return { ok: true, ruta, carpeta };
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
