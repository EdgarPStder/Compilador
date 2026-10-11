/**
 * verificar-ui.js
 * Prueba de humo de la interfaz: abre la ventana real, espera a que la
 * aplicacion arranque y comprueba que cada parte se haya construido.
 *
 *   npm run pruebas:ui
 *   npm run capturas      (ademas guarda imagenes en docs/capturas/)
 *
 * Devuelve codigo 0 si todo esta bien, 1 si alguna comprobacion falla.
 */

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const RAIZ = path.join(__dirname, '..');
const erroresInterfaz = [];

/** Donde la prueba guarda el reporte .html para revisarlo y reabrirlo. */
const REPORTE_PRUEBA = path.join(RAIZ, 'salida', 'prueba-reporte.html');

/** Cuantas veces la interfaz pidio cerrar la aplicacion. */
let vecesQuePidioSalir = 0;

/**
 * Codigo (para correr dentro de la ventana) que lee una fila de la gramatica
 * con sus celdas separadas por un espacio:  "prop → id = exp"
 */
const TEXTO_FILA = `(tr) => Array.from(tr.children).map((td) => td.textContent).join(' ')
  .replace(/\\s+/g, ' ').trim()`;

app.disableHardwareAcceleration();

app.whenReady().then(async () => {
  // Al tomar capturas la ventana debe estar visible: una ventana oculta
  // limita la composicion y devuelve cuadros atrasados.
  const capturando = process.argv.includes('--capturas');

  const ventana = new BrowserWindow({
    show: capturando,
    width: 1180,
    height: 860,
    backgroundColor: '#eef1f6',
    webPreferences: {
      preload: path.join(RAIZ, 'electron', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      backgroundThrottling: false
    }
  });

  ventana.webContents.on('console-message', (e, nivel, mensaje, linea, fuente) => {
    if (nivel >= 2) erroresInterfaz.push(`${mensaje} (${fuente}:${linea})`);
  });

  registrarIPC();

  /** Ejecuta codigo dentro de la ventana y devuelve el resultado. */
  const js = (codigo) => ventana.webContents.executeJavaScript(codigo);
  /** Escribe en un cuadro de codigo como lo haria el usuario. */
  const escribir = (id, texto) => js(`
    (function () {
      const ta = document.getElementById(${JSON.stringify(id)});
      ta.value = ${JSON.stringify(texto)};
      ta.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    })()`);
  const clic = (selector) => js(`document.querySelector(${JSON.stringify(selector)}).click(); true`);
  const pestana = (nombre) => clic(`.pestana[data-pestana="${nombre}"]`);

  await ventana.loadFile(path.join(RAIZ, 'src', 'ui', 'index.html'));
  await esperar(2200);

  // ---------- Arranque: en blanco y en la primera pestaña ----------
  const arranque = await js(`(function () {
    const q = (s) => document.querySelector(s);
    const qq = (s) => Array.from(document.querySelectorAll(s));
    const textos = (s) => qq(s).map((e) => e.textContent.trim()).join(' | ');
    return {
      appCreada:     typeof window.app === 'object' && window.app !== null,
      // El texto de cada pestaña sin su número:  "1 Analizador Léxico" -> "Analizador Léxico"
      pestanas:      qq('.pestana').map((b) => b.lastChild.textContent.trim()).join(' | '),
      activa:        q('.pestana.activa').dataset.pestana,
      panelesVisibles: qq('.panel').filter((p) => p.offsetParent !== null).map((p) => p.id).join(','),
      // Cada pestaña lleva sus logos donde los pide su diseño
      logosLexico:   qq('#panel-lexico .encabezado-lexico .logo').map((e) => e.dataset.logo).join(','),
      logosSintactico: qq('#panel-sintactico .encabezado .logo').map((e) => e.dataset.logo).join(','),
      logosSemantico: qq('#panel-semantico .logos-columna .logo').map((e) => e.dataset.logo).join(','),
      logosCargados: qq('.logo img').length,
      tituloLexico:  q('#panel-lexico .titulo-lexico').textContent.replace(/\\s+/g, ' ').trim(),
      pieLexico:     q('#panel-lexico .pie-lexico').textContent.replace(/\\s+/g, ' ').trim(),
      tituloSemantico: q('#panel-semantico .titulo-semantico').textContent.replace(/\\s+/g, ' ').trim(),
      columnasTabla: qq('#panel-lexico .tabla-tokens th').map((th) => th.textContent).join(' | '),
      ordenLexico:   qq('#panel-lexico .cuerpo > *').map((e) => e.tagName).join(','),
      ordenSintactico: qq('#panel-sintactico .cuerpo > *').map((e) => e.tagName).join(','),
      codigos:       ['lex-codigo', 'codigo', 'sem-codigo'].map((id) => document.getElementById(id).value),
      filasTabla:    qq('#lex-tabla tr').length,
      nodos:         qq('#salida-sintactico .arbol-nodo').length,
      notaSemantico: q('#sem-salida').textContent,
      botonesLexico: textos('#panel-lexico .btn'),
      botonesSemantico: textos('#panel-semantico .btn'),
      ordenSemantico: qq('#panel-semantico .cuerpo > *').map((e) => e.tagName).join(',')
    };
  })()`);

  // ---------- Pestaña 1: la tabla de tokens ----------
  await escribir('lex-codigo', 'a = b + c * 24');
  const compartido = await js(`['lex-codigo', 'codigo', 'sem-codigo']
    .map((id) => document.getElementById(id).value)`);
  await clic('#lex-analizar');
  await esperar(400);
  const lexico = await js(`(function () {
    const filas = Array.from(document.querySelectorAll('#lex-tabla tr'));
    const celda = (f, i) => f.children[i].textContent;
    filas[2].click();
    return {
      total:    filas.length,
      lexemas:  filas.map((f) => celda(f, 0)),
      tokens:   filas.map((f) => celda(f, 1)),
      descripcionNumero: celda(filas[6], 2),
      resumen:  document.getElementById('lex-resumen').textContent,
      insignia: document.getElementById('lex-estado').textContent,
      seleccionada: document.querySelectorAll('#lex-tabla tr.seleccionada').length === 1 &&
                    filas[2].classList.contains('seleccionada')
    };
  })()`);

  // ---------- Cambiar de pestaña: el analisis ya esta hecho en las otras ----------
  await pestana('sintactico');
  await esperar(300);
  const enSintactico = await js(`({
    visible: document.getElementById('panel-sintactico').offsetParent !== null,
    codigo:  document.getElementById('codigo').value,
    lexica:  document.querySelector('#salida-lexico .linea-salida')
               ? document.querySelector('#salida-lexico .linea-salida').textContent.trim() : '',
    nodos:   document.querySelectorAll('#salida-sintactico .arbol-nodo').length
  })`);

  await pestana('semantico');
  await esperar(300);
  const enSemantico = await js(`({
    visible:  document.getElementById('panel-semantico').offsetParent !== null,
    codigo:   document.getElementById('sem-codigo').value,
    insignia: document.getElementById('sem-estado').textContent,
    prop:     document.querySelector('#sem-salida .gramatica tr')
                ? (${TEXTO_FILA})(document.querySelector('#sem-salida .gramatica tr')) : ''
  })`);

  // Ctrl+Tab vuelve a la primera pestaña; la tabla sigue ahi
  await js(`document.dispatchEvent(new KeyboardEvent('keydown',
    { key: 'Tab', ctrlKey: true, bubbles: true })); true`);
  await esperar(250);
  const deRegreso = await js(`({
    activa: document.querySelector('.pestana.activa').dataset.pestana,
    filas:  document.querySelectorAll('#lex-tabla tr').length,
    seleccionada: document.querySelectorAll('#lex-tabla tr.seleccionada').length
  })`);

  // ---------- Pestaña 3: la gramatica del ejemplo del pizarron ----------
  await pestana('semantico');
  await escribir('sem-codigo', 'a1 = b5 / 20');
  await clic('#sem-analiza');
  await esperar(400);
  const semantico = await js(`(function () {
    const qq = (s) => Array.from(document.querySelectorAll(s));
    return {
      insignia: document.getElementById('sem-estado').textContent,
      resumen:  document.querySelector('#sem-salida .resumen-gramatica').textContent,
      reglas:   qq('#sem-salida .gramatica tr').map(${TEXTO_FILA}),
      ejemplo:  qq('#sem-salida .gramatica .alternativa')
                  .map((a) => a.title).find((t) => t === 'En el código: b5 / 20') || '',
      filasLexico: document.querySelectorAll('#lex-tabla tr').length
    };
  })()`);

  await escribir('sem-codigo', 'si (a > 1) { romper; }');
  await clic('#sem-analiza');
  await esperar(400);
  const semanticoSi = await js(`({
    prop: (${TEXTO_FILA})(document.querySelector('#sem-salida .gramatica tr')),
    subrayadas: Array.from(document.querySelectorAll('#sem-salida .terminal.palabra')).map((e) => e.textContent)
  })`);

  // Varias proposiciones, una por renglon, como las escribe el usuario
  await escribir('sem-codigo', 'a = b + c\na && b || c + f > d');
  await clic('#sem-analiza');
  await esperar(400);
  const semanticoVarias = await js(`({
    insignia: document.getElementById('sem-estado').textContent,
    reglas:   Array.from(document.querySelectorAll('#sem-salida .gramatica tr')).slice(0, 3).map(${TEXTO_FILA}),
    resumen:  document.querySelector('#sem-salida .resumen-gramatica').textContent,
    nodos:    document.querySelectorAll('#salida-sintactico .arbol-nodo').length
  })`);

  await escribir('sem-codigo', 'entero = 5;');
  await clic('#sem-analiza');
  await esperar(400);
  const semanticoMal = await js(`({
    insignia: document.getElementById('sem-estado').textContent,
    titulo:   document.querySelector('#sem-salida .veredicto.mal b')
                ? document.querySelector('#sem-salida .veredicto.mal b').textContent : '',
    errores:  document.querySelectorAll('#sem-salida .veredicto.mal .error-linea').length,
    gramatica: document.querySelectorAll('#sem-salida .gramatica').length
  })`);

  // ---------- Fuga: el equipo y la pregunta de salida ----------
  await pestana('lexico');
  await clic('#lex-fuga');
  await esperar(200);
  const fuga = await js(`(function () {
    const filas = Array.from(document.querySelectorAll('#salir-integrantes li'));
    return {
      abierta:   !document.getElementById('modal-salir').classList.contains('oculto'),
      titulo:    document.getElementById('salir-titulo').textContent,
      total:     filas.length,
      apellidos: filas.map((f) => f.querySelector('.apellidos').textContent),
      pregunta:  document.getElementById('salir-pregunta').textContent,
      avisaCodigo: !document.getElementById('salir-detalle').classList.contains('oculto'),
      foco:      document.activeElement && document.activeElement.id
    };
  })()`);
  await clic('#salir-cancelar');
  await esperar(150);
  fuga.cerradaAlCancelar = await js("document.getElementById('modal-salir').classList.contains('oculto')");
  fuga.salidasAlCancelar = vecesQuePidioSalir;

  await clic('#sem-termina');
  await esperar(150);
  fuga.terminaAbre = await js("!document.getElementById('modal-salir').classList.contains('oculto')");
  await clic('#salir-confirmar');
  await esperar(300);
  fuga.salidasAlConfirmar = vecesQuePidioSalir;

  // ---------- Guardar el reporte visual y volver a abrirlo ----------
  if (fs.existsSync(REPORTE_PRUEBA)) fs.unlinkSync(REPORTE_PRUEBA);
  await pestana('semantico');
  await escribir('sem-codigo', 'a1 = b5 / 20');
  await clic('#sem-analiza');
  await esperar(300);
  await js('window.app.guardarReporte(); true');
  await esperar(900);
  const guardado = await js(`({
    avisoVisible: !document.getElementById('aviso').classList.contains('oculto'),
    aviso:  document.getElementById('aviso-texto').textContent,
    accion: document.getElementById('aviso-accion').classList.contains('oculto')
              ? '' : document.getElementById('aviso-accion').textContent
  })`);
  guardado.contenido = fs.existsSync(REPORTE_PRUEBA) ? fs.readFileSync(REPORTE_PRUEBA, 'utf8') : '';

  // Se limpia todo, se cambia de pestaña y se abre el reporte guardado
  await clic('#sem-limpieza');
  await pestana('lexico');
  await js('window.app.abrirArchivo(); true');
  await esperar(600);
  const reabierto = await js(`({
    activa: document.querySelector('.pestana.activa').dataset.pestana,
    codigos: ['lex-codigo', 'codigo', 'sem-codigo'].map((id) => document.getElementById(id).value),
    insignia: document.getElementById('sem-estado').textContent
  })`);

  // Soltar el reporte sobre la ventana hace lo mismo que abrirlo
  await clic('#lex-borrar');
  await js(`(function () {
    const dt = new DataTransfer();
    dt.items.add(new File([${JSON.stringify(guardado.contenido)}], 'reporte.html', { type: 'text/html' }));
    document.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
    return true;
  })()`);
  await esperar(700);
  const soltado = await js(`({
    codigo: document.getElementById('codigo').value,
    filas:  document.querySelectorAll('#lex-tabla tr').length
  })`);

  // ---------- Pestaña 2: lo que ya hacia la aplicacion ----------
  await pestana('sintactico');
  await clic('#btn-limpiar');
  await escribir('codigo', 'a > b');
  await clic('#btn-ambos');
  await esperar(400);
  const inicial = await js(`(function () {
    const q = (s) => document.querySelector(s);
    const qq = (s) => document.querySelectorAll(s);
    return {
      botones:      qq('#panel-sintactico .botonera .btn').length,
      textoBotones: Array.from(qq('#panel-sintactico .botonera .btn')).map((b) => b.textContent).join(' | '),
      titulos:      Array.from(qq('#panel-sintactico .bloque h2')).map((h) => h.firstChild.textContent.trim()).join(' | '),
      codigo:       q('#codigo').value,
      salidaLexica: q('#salida-lexico').textContent.replace(/\\s+/g, ' ').trim(),
      nodosArbol:   qq('#salida-sintactico .arbol-nodo').length,
      ramasArbol:   qq('#salida-sintactico .arbol-rama').length,
      etiquetas:    Array.from(qq('#salida-sintactico .arbol-nodo text')).map((t) => t.textContent),
      modalOculto:  q('#modal-equipo').classList.contains('oculto'),
      estadoLexico: q('#estado-lexico').textContent,
      estadoSint:   q('#estado-sintactico').textContent,
      colorLogico:  !!q('#salida-lexico .tk-logico'),
      colorRelacional: !!q('#salida-lexico .tk-relacional'),
      hayIdentificadores: /IDENTIFICADORES/i.test(q('#salida-lexico').textContent)
    };
  })()`);

  // ---------- La ventana del equipo ----------
  const equipo = await js(`(function () {
    document.getElementById('btn-equipo').click();
    const filas = Array.from(document.querySelectorAll('#lista-integrantes li'));
    return {
      abierto:   !document.getElementById('modal-equipo').classList.contains('oculto'),
      titulo:    document.getElementById('modal-titulo').textContent,
      total:     filas.length,
      apellidos: filas.map((f) => f.querySelector('.apellidos').textContent)
    };
  })()`);

  // ---------- Los botones de la pestaña 2 ----------
  await clic('#modal-equipo [data-cerrar]');
  await esperar(200);

  await clic('#btn-limpiar');
  await esperar(300);
  const trasLimpiar = await js(`({
    codigos: ['lex-codigo', 'codigo', 'sem-codigo'].map((id) => document.getElementById(id).value),
    nodos:  document.querySelectorAll('#salida-sintactico .arbol-nodo').length,
    filas:  document.querySelectorAll('#lex-tabla tr').length,
    gramatica: document.querySelectorAll('#sem-salida .gramatica').length
  })`);

  await escribir('codigo', 'entero total = a + b * 2;');
  await clic('#btn-lexico');
  await esperar(400);
  const soloLexico = await js(`({
    lexica: document.querySelector('#salida-lexico .linea-salida')
              ? document.querySelector('#salida-lexico .linea-salida').textContent.trim() : '',
    nodos:  document.querySelectorAll('#salida-sintactico .arbol-nodo').length
  })`);

  await clic('#btn-sintactico');
  await esperar(400);
  const soloSintactico = await js(`({
    lexicaVacia: !document.querySelector('#salida-lexico .linea-salida'),
    nodos:       document.querySelectorAll('#salida-sintactico .arbol-nodo').length
  })`);

  // ---------- La expresion del enunciado, sin punto y coma ----------
  await escribir('codigo', 'a = b + c > 9 AND d > e OR f <= 30');
  await clic('#btn-ambos');
  await esperar(500);
  const expresion = await js(`(function () {
    const qq = (s) => document.querySelectorAll(s);
    const nivel = () => {
      // Agrupa las etiquetas del arbol por su altura en el dibujo
      const filas = {};
      qq('#salida-sintactico .arbol-nodo').forEach((g) => {
        const y = Math.round(Number(g.querySelector('rect').getAttribute('y')));
        (filas[y] = filas[y] || []).push(g.querySelector('text').textContent);
      });
      return Object.keys(filas).sort((a, b) => a - b).map((y) => filas[y]);
    };
    return {
      lexica:     document.querySelector('#salida-lexico .linea-salida').textContent.trim(),
      logicos:    Array.from(qq('#salida-lexico .linea-salida .tk-logico')).map((e) => e.textContent),
      relacionales: Array.from(qq('#salida-lexico .linea-salida .tk-relacional')).map((e) => e.textContent),
      aritmeticos: Array.from(qq('#salida-lexico .linea-salida .tk-aritmetico')).map((e) => e.textContent),
      numeros:    Array.from(qq('#salida-lexico .linea-salida .tk-numero')).map((e) => e.textContent),
      errores:    qq('#panel-sintactico .error-linea').length,
      niveles:    nivel()
    };
  })()`);

  // ---------- Potencias y raices ----------
  await escribir('codigo', '2 * 3 ^ 2 + √16 ** 2');
  await clic('#btn-ambos');
  await esperar(450);
  const potencias = await js(`(function () {
    const qq = (s) => Array.from(document.querySelectorAll(s));
    const nodos = qq('#salida-sintactico .arbol-nodo');
    const etiqueta = (g) => g.querySelector('text').textContent;
    return {
      lexica: document.querySelector('#salida-lexico .linea-salida').textContent.trim(),
      // Los simbolos nuevos deben salir en negro, con los aritmeticos
      aritmeticos: qq('#salida-lexico .linea-salida .tk-aritmetico').map((e) => e.textContent),
      etiquetas: nodos.map(etiqueta),
      errores: qq('#panel-sintactico .error-linea').length
    };
  })()`);

  // ---------- El menu Ejemplos ----------
  await js(`window.app.cargarEjemplo({ nombre: '99-prueba.bs', contenido: 'x = a * 2' }); true`);
  await esperar(450);
  const ejemplo = await js(`({
    codigos: ['lex-codigo', 'codigo', 'sem-codigo'].map((id) => document.getElementById(id).value),
    nombre: window.app.nombreArchivo,
    lexica: document.querySelector('#salida-lexico .linea-salida').textContent.trim(),
    nodos:  document.querySelectorAll('#salida-sintactico .arbol-nodo').length,
    filas:  document.querySelectorAll('#lex-tabla tr').length
  })`);

  // ---------- El zoom del arbol ----------
  await escribir('codigo', 'a > b');
  await clic('#btn-ambos');
  await esperar(450);
  const zoom = await js(`(function () {
    const svg = () => document.querySelector('#salida-sintactico svg');
    const nivel = () => document.getElementById('zoom-nivel').textContent;
    const ancho = () => Number(svg().getAttribute('width'));

    const viewBoxAntes = svg().getAttribute('viewBox');
    const inicial = { nivel: nivel(), ancho: ancho() };

    document.getElementById('zoom-mas').click();
    document.getElementById('zoom-mas').click();
    const acercado = { nivel: nivel(), ancho: ancho() };

    document.getElementById('zoom-menos').click();
    const alejado = { nivel: nivel(), ancho: ancho() };

    document.getElementById('zoom-ajustar').click();
    const ajustado = { nivel: nivel(), ancho: ancho() };

    // El viewBox no cambia: lo que crece es el tamano dibujado
    const viewBoxDespues = svg().getAttribute('viewBox');

    return { inicial, acercado, alejado, ajustado, viewBoxAntes, viewBoxDespues };
  })()`);

  // ---------- Abrir una rama del arbol ----------
  await escribir('codigo', 'a = b + c > 9 AND d > e OR f <= 30');
  await clic('#btn-ambos');
  await esperar(450);
  const rama = await js(`(function () {
    const qq = (s) => Array.from(document.querySelectorAll(s));
    const nodos = () => qq('#salida-sintactico .arbol-nodo');
    const raiz = () => nodos()[0].querySelector('text').textContent;
    const pasos = () => qq('#arbol-camino .camino-paso').map((b) => b.textContent);
    // Cuanto mide en pantalla el recuadro del nodo que dice "AND"
    const mideAnd = () => nodos()
      .find((g) => g.querySelector('text').textContent === 'AND')
      .getBoundingClientRect().width;

    const completo = {
      total: nodos().length,
      raiz: raiz(),
      mideAnd: mideAnd(),
      abribles: qq('#salida-sintactico .arbol-nodo.con-rama').length,
      ayuda: document.getElementById('arbol-camino').textContent,
      pasos: pasos()
    };

    // Clic en la rama AND
    const and = nodos().find((g) => g.querySelector('text').textContent === 'AND');
    and.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    const abierta = {
      total: nodos().length,
      raiz: raiz(),
      mideAnd: mideAnd(),
      nivel: document.getElementById('zoom-nivel').textContent,
      pasos: pasos()
    };

    // El primer paso del camino regresa al arbol completo
    qq('#arbol-camino .camino-paso')[0].click();
    const regreso = { total: nodos().length, raiz: raiz(), pasos: pasos() };

    return { completo, abierta, regreso };
  })()`);

  // ---------- Un programa con error ----------
  await escribir('codigo', 'entero a = 4.;');
  await clic('#btn-ambos');
  await esperar(400);
  const conError = await js(`({
    erroresMostrados: document.querySelectorAll('#panel-sintactico .error-linea').length,
    insignia: document.getElementById('estado-lexico').textContent,
    filaError: document.querySelectorAll('#lex-tabla tr.fila-error').length
  })`);

  // ---------- Capturas ----------
  if (capturando) {
    const dir = path.join(RAIZ, 'docs', 'capturas');
    fs.mkdirSync(dir, { recursive: true });

    /**
     * Guarda la imagen de la ventana. Si la ventana no se esta viendo en la
     * pantalla (pantalla apagada, otra ventana encima), Windows no la pinta
     * y la captura nunca llega: por eso tiene tiempo limite y avisa.
     */
    const capturar = async (nombre) => {
      // El aviso del guardado no debe salir en las capturas
      await js("document.getElementById('aviso').classList.add('oculto'); true");
      await esperar(900);
      const listo = await conTiempoLimite((async () => {
        await ventana.webContents.capturePage(); // descarta el cuadro atrasado
        await esperar(250);
        const imagen = await ventana.webContents.capturePage();
        fs.writeFileSync(path.join(dir, nombre + '.png'), imagen.toPNG());
      })(), 20000);
      console.log(listo
        ? '  captura: docs/capturas/' + nombre + '.png'
        : `  (no se pudo capturar ${nombre}: la ventana debe estar a la vista)`);
    };
    /** Escribe, analiza desde la pestaña dada y deja esa pestaña a la vista. */
    const analizarEn = async (nombrePestana, idCodigo, boton, texto) => {
      await pestana(nombrePestana);
      await escribir(idCodigo, texto);
      await clic(boton);
      await esperar(300);
    };

    // Pestaña 1
    await analizarEn('lexico', 'lex-codigo', '#lex-analizar', 'a = b + c * 24');
    await js("document.querySelectorAll('#lex-tabla tr')[2].click(); true");
    await capturar('lexico');

    await clic('#lex-fuga');
    await capturar('fuga');
    await clic('#salir-cancelar');

    // Pestaña 2
    await analizarEn('sintactico', 'codigo', '#btn-ambos', 'a > b');
    await capturar('principal');

    await analizarEn('sintactico', 'codigo', '#btn-ambos', 'a = b + c > 9 AND d > e OR f <= 30');
    await capturar('expresion');

    // La misma expresion, pero con la rama AND abierta
    await js(`
      Array.from(document.querySelectorAll('#salida-sintactico .arbol-nodo'))
        .find((g) => g.querySelector('text').textContent === 'AND')
        .dispatchEvent(new MouseEvent('click', { bubbles: true })); true`);
    await capturar('rama');

    await analizarEn('sintactico', 'codigo', '#btn-ambos',
      'si (edad >= 18) {\n    imprimirLn("Mayor");\n} sino {\n    imprimirLn("Menor");\n}');
    await capturar('programa');

    await clic('#btn-equipo');
    await capturar('equipo');
    await clic('#modal-equipo [data-cerrar]');

    await analizarEn('sintactico', 'codigo', '#btn-ambos', 'entero a = 4.;');
    await capturar('errores');

    // Pestaña 3
    await analizarEn('semantico', 'sem-codigo', '#sem-analiza', 'a1 = b5 / 20');
    await capturar('semantico');

    await analizarEn('semantico', 'sem-codigo', '#sem-analiza',
      'opcion (a) {\n    caso 1: imprimir("Hola"); romper;\n}');
    await capturar('semantico-opcion');

    await analizarEn('semantico', 'sem-codigo', '#sem-analiza',
      'a = b + c\na && b || c + f > d');
    await capturar('semantico-proposiciones');

    // El reporte visual, abierto como lo veria un navegador. Se carga en la
    // misma ventana (ya no se necesita la aplicacion): una segunda ventana
    // puede quedar tapada, y Windows no pinta una ventana tapada.
    const listo = await conTiempoLimite(
      capturarPaginaCompleta(ventana, REPORTE_PRUEBA, path.join(dir, 'reporte.png')), 30000);
    console.log(listo
      ? '  captura: docs/capturas/reporte.png'
      : '  (no se pudo capturar el reporte: la ventana debe estar a la vista)');
  }

  if (fs.existsSync(REPORTE_PRUEBA)) fs.unlinkSync(REPORTE_PRUEBA);

  informar({ arranque, compartido, lexico, enSintactico, enSemantico, deRegreso,
    semantico, semanticoSi, semanticoVarias, semanticoMal, fuga, guardado, reabierto, soltado, inicial, equipo,
    trasLimpiar, soloLexico, soloSintactico, expresion, potencias, ejemplo, zoom,
    rama, conError });
  ventana.destroy();
  app.quit();
});

function esperar (ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Espera una promesa, pero no mas de cierto tiempo.
 * @returns {Promise<boolean>} true si termino a tiempo.
 */
function conTiempoLimite (promesa, ms) {
  return Promise.race([
    promesa.then(() => true),
    esperar(ms).then(() => false)
  ]);
}

/**
 * Carga una pagina en la ventana w y guarda una imagen de la pagina
 * completa, aunque sea mas alta que la pantalla. Usa el protocolo de las
 * herramientas de desarrollo, que puede pintar mas alla de lo visible.
 */
async function capturarPaginaCompleta (w, archivo, destino) {
  // Lo que diga la consola desde aqui ya no es de la aplicacion: es de la
  // pagina del reporte (Electron advierte que no trae CSP). No se cuenta.
  w.webContents.removeAllListeners('console-message');
  await w.loadFile(archivo);
  await esperar(700);
  // Una captura normal obliga a la ventana a pintar antes de la completa.
  await w.webContents.capturePage();
  const alto = await w.webContents.executeJavaScript('document.documentElement.scrollHeight');
  w.webContents.debugger.attach('1.3');
  const r = await w.webContents.debugger.sendCommand('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: true,
    clip: { x: 0, y: 0, width: 1180, height: Math.min(alto, 4000), scale: 1 }
  });
  fs.writeFileSync(destino, Buffer.from(r.data, 'base64'));
  w.webContents.debugger.detach();
}

/** Manejadores IPC que necesita la interfaz. */
function registrarIPC () {
  const { compilar } = require('../src/core/Compilador');
  const { datosEquipo } = require('../src/core/comun/Equipo');
  const { contenidoParaGuardar, leerArchivoGuardado } = require('../src/core/ArchivoGuardado');
  const { logosParaReporte } = require('../electron/logos');

  ipcMain.handle('compilador:analizar', (e, fuente, opciones) =>
    ({ ok: true, resultado: compilar(fuente || '', opciones || {}) }));
  ipcMain.handle('compilador:equipo', () => datosEquipo());

  // Salir no cierra nada: solo se cuenta, para saber que se pidio.
  ipcMain.handle('app:salir', () => { vecesQuePidioSalir++; return { ok: true }; });

  // Guardar hace el trabajo de verdad, en salida/, para poder revisar el
  // archivo que produce. Abrir lee ese mismo archivo.
  ipcMain.handle('archivo:guardar', (e, fuente, pestana) => {
    const archivo = contenidoParaGuardar(compilar(fuente || '', {}),
      path.basename(REPORTE_PRUEBA), { pestana, logos: logosParaReporte() });
    fs.mkdirSync(path.dirname(REPORTE_PRUEBA), { recursive: true });
    fs.writeFileSync(REPORTE_PRUEBA, archivo.contenido, 'utf8');
    return { ok: true, ruta: REPORTE_PRUEBA, formato: archivo.formato };
  });
  const abrir = (texto) => {
    const r = leerArchivoGuardado(texto);
    return r.ok ? { ok: true, contenido: r.codigo, pestana: r.pestana } : r;
  };
  ipcMain.handle('archivo:abrir', () => {
    if (!fs.existsSync(REPORTE_PRUEBA)) return { ok: false, cancelado: true };
    return Object.assign(abrir(fs.readFileSync(REPORTE_PRUEBA, 'utf8')), { ruta: REPORTE_PRUEBA });
  });
  ipcMain.handle('archivo:leer', (e, texto) => abrir(texto));
  ipcMain.handle('archivo:verReporte', () => ({ ok: true }));
}

function informar (d) {
  const { arranque: ar, compartido: co, lexico: lx, enSintactico: es, enSemantico: em,
    deRegreso: dr, semantico: se, semanticoSi: ss2, semanticoVarias: sv, semanticoMal: sm, fuga: fu, guardado: g, reabierto: ra,
    soltado: so, inicial: i, equipo: eq, trasLimpiar: tl, soloLexico: sl,
    soloSintactico: ss, expresion: ex, potencias: po, ejemplo: ej2, zoom: z, rama: rm,
    conError: ce } = d;

  const ORDEN_ESPERADO = [
    'Avalos Castillo', 'Borjas Arias', 'Pesina Santander',
    'Ramos Antonio', 'Vazquez Romo', 'Verlage Aceves'
  ];
  const EJEMPLO_PIZARRON = 'a1 = b5 / 20';

  const comprobaciones = [
    ['la aplicacion se construyo', ar.appCreada === true],

    // Logos: cada pestaña los lleva donde los pide su diseño
    ['pestaña 1: UAT a la izquierda y UAMM a la derecha', ar.logosLexico === 'uat,uamm'],
    ['pestaña 2: los tres logos arriba (UAT, UAMM, ISC)', ar.logosSintactico === 'uat,uamm,isc'],
    ['pestaña 3: los tres logos en columna a la izquierda', ar.logosSemantico === 'uat,uamm,isc'],
    ['los ocho logos cargaron su imagen', ar.logosCargados === 8],

    // Encabezados y disposición de cada pestaña
    ['pestaña 1: el encabezado dice la carrera, el analizador, el grupo y el equipo',
      ar.tituloLexico === 'Ingeniería en Sistemas Computacionales Analizador Léxico Grupo : 9° F | Equipo : SwordByte'],
    ['pestaña 1: el pie lleva el equipo y el grupo',
      ar.pieLexico === 'Equipo SwordByte — UAT / UAMMC — Grupo: 9° F'],
    ['pestaña 1: la tabla tiene Lexema, Token y Descripción',
      ar.columnasTabla === 'Lexema | Token | Descripción'],
    ['pestaña 1: el análisis a la izquierda y los botones a la derecha', ar.ordenLexico === 'MAIN,NAV'],
    ['pestaña 2: los botones a la izquierda y el análisis a la derecha', ar.ordenSintactico === 'NAV,MAIN'],
    ['pestaña 3: logos, análisis y botones, de izquierda a derecha', ar.ordenSemantico === 'ASIDE,MAIN,NAV'],
    ['pestaña 3: el título del pizarrón con el nombre del equipo',
      ar.tituloSemantico === 'Programación de Sistemas de Base II Analizador Semántico “SwordByte”'],

    // Pestañas
    ['hay tres pestañas, en el orden pedido',
      ar.pestanas === 'Analizador Léxico | Analizador Léxico-Sintáctico | Analizador Semántico'],
    ['la aplicacion abre en la pestaña del analizador lexico',
      ar.activa === 'lexico' && ar.panelesVisibles === 'panel-lexico'],
    ['la pestaña 1 tiene sus cuatro botones',
      ar.botonesLexico === 'Realizar Análisis | Guardar | Borrar | Fuga'],
    ['la pestaña 3 tiene los botones del pizarron',
      ar.botonesSemantico === 'Limpieza | Analiza | Equipo | Termina'],

    // Arranque limpio
    ['la aplicacion abre con el codigo vacio en las tres pestañas',
      ar.codigos.every((c) => c === '')],
    ['y sin tabla ni arbol', ar.filasTabla === 0 && ar.nodos === 0],
    ['la pestaña semantica explica que ahi saldra la gramatica', /gramática/.test(ar.notaSemantico)],

    // Codigo compartido
    ['lo que se escribe en una pestaña aparece en las otras dos',
      co.every((c) => c === 'a = b + c * 24')],

    // Pestaña 1
    ['la tabla tiene un renglon por token', lx.total === 7],
    ['la tabla trae los lexemas en orden', lx.lexemas.join(' ') === 'a = b + c * 24'],
    ['cada token lleva su nombre',
      lx.tokens.join(',') === 'identificador,operador asignación,identificador,' +
        'operador suma,identificador,operador multiplicación,número entero'],
    ['el numero lleva su valor en la descripcion', lx.descripcionNumero === 'Valor numérico entero (24)'],
    ['abajo dice cuantos tokens encontro',
      lx.resumen === '✓ Análisis completado — 7 tokens encontrados.'],
    ['la insignia dice correcto', lx.insignia === 'correcto'],
    ['un clic marca la fila', lx.seleccionada === true],

    // Cambiar de pestaña
    ['al pasar a la pestaña 2 se ve su panel', es.visible === true],
    ['la pestaña 2 ya tiene el mismo codigo', es.codigo === 'a = b + c * 24'],
    ['y ya trae el analisis hecho, sin volver a presionar nada',
      es.lexica === 'id1 = id2 + id3 * num(24)' && es.nodos > 0],
    ['la pestaña 3 tambien tiene el codigo y su gramatica ya generada',
      em.visible && em.codigo === 'a = b + c * 24' && em.prop === 'prop → id = exp'],
    ['Ctrl+Tab cambia de pestaña', dr.activa === 'lexico'],
    ['al regresar nada se borro: la tabla y la fila marcada siguen',
      dr.filas === 7 && dr.seleccionada === 1],

    // Pestaña 3: la gramatica del codigo dado
    ['el ejemplo del pizarron genera su gramatica', se.insignia === '6 reglas' &&
      /Gramática generada/.test(se.resumen)],
    ['la gramatica es la del pizarron',
      se.reglas.join(' / ') === 'prop → id = exp / exp → id | num | exp / exp / ' +
      'id → let ( dig )* / num → dig ( dig )* / dig → 0-9 / let → a-z'],
    ['cada produccion dice de que parte del codigo salio', se.ejemplo === 'En el código: b5 / 20'],
    ['y la pestaña 1 se lleno con el mismo codigo', se.filasLexico === 5],
    ['funciona con cualquier codigo del lenguaje',
      ss2.prop === 'prop → si ( exp ) { inst }'],
    ['funciona con varias proposiciones, una por renglon',
      sv.reglas.join(' / ') === 'props → prop prop / prop → id = exp | exp || exp / ' +
      'exp → id | exp + exp | exp && exp | exp > exp' && /varias proposiciones/.test(sv.resumen)],
    ['y la pestaña 2 dibuja las dos proposiciones', sv.nodos === 15],
    ['las palabras terminales van subrayadas, como en el pizarron',
      ss2.subrayadas.includes('si') && ss2.subrayadas.includes('romper')],
    ['con errores no se genera gramatica y se dicen los errores',
      sm.insignia === 'sin gramática' && /No se pudo generar/.test(sm.titulo) &&
      sm.errores > 0 && sm.gramatica === 0],

    // Fuga
    ['Fuga abre la ventana de salida', fu.abierta === true],
    ['la ventana muestra al equipo', fu.titulo === 'SwordByte' && fu.total === 6 &&
      JSON.stringify(fu.apellidos) === JSON.stringify(ORDEN_ESPERADO)],
    ['y pregunta si se quiere salir', fu.pregunta === '¿Quieres salir del compilador?'],
    ['avisa que el codigo escrito no se guarda', fu.avisaCodigo === true],
    ['el foco queda en Cancelar', fu.foco === 'salir-cancelar'],
    ['Cancelar cierra la ventana sin salir', fu.cerradaAlCancelar && fu.salidasAlCancelar === 0],
    ['Termina abre la misma ventana', fu.terminaAbre === true],
    ['Si, salir cierra la aplicacion', fu.salidasAlConfirmar === 1],

    // Guardar y volver a abrir
    ['al guardar avisa y ofrece abrir el reporte',
      g.avisoVisible && /guardado/i.test(g.aviso) && g.accion === 'Abrir reporte'],
    ['el reporte es una pagina web con los datos de la materia',
      g.contenido.startsWith('<!DOCTYPE html>') && g.contenido.includes('Programación de Sistemas de Base II')],
    ['el reporte lleva los tres logos adentro',
      g.contenido.split('src="data:image/jpeg;base64,').length - 1 === 3],
    ['el reporte trae las cuatro secciones',
      ['Código fuente', 'Análisis léxico', 'Análisis sintáctico', 'Análisis semántico']
        .every((t) => g.contenido.includes(t))],
    ['el reporte guarda el codigo para volver a abrirlo',
      g.contenido.includes('id="datos-swordbyte"') && g.contenido.includes('"pestana":"semantico"')],
    ['al abrirlo regresa el codigo a las tres pestañas',
      ra.codigos.every((c) => c === EJEMPLO_PIZARRON)],
    ['y regresa a la pestaña desde la que se guardo',
      ra.activa === 'semantico' && ra.insignia === '6 reglas'],
    ['soltar el reporte sobre la ventana tambien lo abre',
      so.codigo === EJEMPLO_PIZARRON && so.filas === 5],

    // Pestaña 2: columnas y botones
    ['la pestaña 2 tiene seis botones', i.botones === 6],
    ['los botones son los pedidos, en orden',
      i.textoBotones === 'Limpiar | Análisis Léxico | Análisis Sintáctico | ' +
      'Análisis Léxico-Sintáctico | Equipo | Salir'],
    ['los tres titulos son los pedidos',
      i.titulos === 'Código Fuente | Análisis Léxico | Análisis Sintáctico'],
    ['ya no aparece la tabla de identificadores', i.hayIdentificadores === false],

    // El ejemplo del enunciado: a > b
    ['el codigo escrito es "a > b"', i.codigo === 'a > b'],
    ['el analisis lexico da "id1 > id2"', i.salidaLexica.startsWith('id1 > id2')],
    ['el arbol tiene tres nodos', i.nodosArbol === 3],
    ['el arbol tiene dos ramas', i.ramasArbol === 2],
    ['la raiz del arbol es ">"', i.etiquetas[0] === '>'],
    ['la rama izquierda es id1', i.etiquetas[1] === 'id1'],
    ['la rama derecha es id2', i.etiquetas[2] === 'id2'],
    ['ambas fases marcan correcto',
      i.estadoLexico === 'correcto' && i.estadoSint === 'correcto'],

    // Ventana del equipo
    ['la ventana del equipo abre', eq.abierto === true],
    ['muestra el nombre del equipo', eq.titulo === 'SwordByte'],
    ['lista a los seis integrantes', eq.total === 6],
    ['estan en orden alfabetico por apellidos',
      JSON.stringify(eq.apellidos) === JSON.stringify(ORDEN_ESPERADO)],

    // Botones
    ['Limpiar vacia el codigo y los resultados de las tres pestañas',
      tl.codigos.every((c) => c === '') && tl.nodos === 0 && tl.filas === 0 && tl.gramatica === 0],
    ['Analisis Lexico solo llena la caja lexica',
      sl.lexica.includes('entero id1 = id2 + id3 * num(2);') && sl.nodos === 0],
    ['Analisis Sintactico solo dibuja el arbol',
      ss.lexicaVacia === true && ss.nodos > 3],

    // La expresion del enunciado
    ['la expresion con AND/OR se analiza sin punto y coma', ex.errores === 0],
    ['su salida lexica es la esperada',
      ex.lexica === 'id1 = id2 + id3 > num(9) AND id4 > id5 OR id6 <= num(30)'],
    ['los logicos salen en azul', JSON.stringify(ex.logicos) === '["AND","OR"]'],
    ['los relacionales salen en rojo', JSON.stringify(ex.relacionales) === '[">",">","<="]'],
    ['los aritmeticos salen en negro (el = va en ese grupo)',
      JSON.stringify(ex.aritmeticos) === '["=","+"]'],
    ['los numeros salen como num(valor)',
      JSON.stringify(ex.numeros) === '["num(9)","num(30)"]'],
    // OR / AND arriba, relacionales en medio, = y + hasta abajo
    ['hasta arriba del arbol va el booleano OR', ex.niveles[0].join() === 'OR'],
    ['debajo van el AND y el otro relacional', ex.niveles[1].join() === 'AND,<='],
    ['luego los relacionales', ex.niveles[2].join() === '>,>,id6,num(30)'],
    ['el igual queda con los aritmeticos, abajo',
      ex.niveles[3].join() === '=,num(9),id4,id5'],
    ['y la suma todavia mas abajo', ex.niveles[4].join() === 'id1,+'],

    // Cargar un ejemplo
    ['un ejemplo del menu se carga en las tres pestañas y se analiza',
      ej2.codigos.every((c) => c === 'x = a * 2') && ej2.lexica === 'id1 = id2 * num(2)' &&
      ej2.nodos > 0 && ej2.filas === 5],
    ['y queda registrado su nombre', ej2.nombre === '99-prueba.bs'],

    // Zoom del arbol
    ['el arbol empieza al 100 %', z.inicial.nivel === '100%'],
    ['el boton + acerca el arbol',
      z.acercado.nivel === '120%' && z.acercado.ancho > z.inicial.ancho],
    ['el boton - aleja el arbol',
      z.alejado.nivel === '110%' && z.alejado.ancho < z.acercado.ancho],
    ['Ajustar deja el arbol a un tamano que cabe', z.ajustado.ancho <= z.inicial.ancho],
    ['el zoom cambia el tamano dibujado, no el viewBox',
      z.viewBoxAntes === z.viewBoxDespues],

    // Potencias y raices
    ['la potencia y la raiz salen en la salida lexica',
      po.lexica === 'num(2) * num(3) ^ num(2) + √num(16) ** num(2)'],
    ['los simbolos nuevos se pintan de negro, con los aritmeticos',
      po.aritmeticos.includes('^') && po.aritmeticos.includes('**') &&
      po.aritmeticos.includes('√')],
    ['la potencia y la raiz se dibujan en el arbol',
      po.etiquetas.includes('^') && po.etiquetas.includes('**') &&
      po.etiquetas.includes('√')],
    ['ninguna de las dos da error', po.errores === 0],

    // Abrir una rama del arbol
    ['todos los nodos con hijos se pueden abrir, menos la raiz',
      rm.completo.abribles > 0 && rm.completo.abribles < rm.completo.total],
    ['el arbol completo explica como abrir una rama',
      /clic/i.test(rm.completo.ayuda) && rm.completo.pasos.length === 0],
    ['al abrir la rama AND esa queda de raiz', rm.abierta.raiz === 'AND'],
    ['la rama abierta tiene menos nodos que el arbol completo',
      rm.abierta.total < rm.completo.total],
    ['la rama abierta se ve mas grande',
      rm.abierta.mideAnd > rm.completo.mideAnd &&
      parseInt(rm.abierta.nivel, 10) > 100],
    ['el camino muestra de donde viene la rama',
      rm.abierta.pasos.join(' > ') === 'Árbol completo > AND'],
    ['el camino regresa al arbol completo',
      rm.regreso.raiz === 'OR' && rm.regreso.total === rm.completo.total &&
      rm.regreso.pasos.length === 0],

    // Errores
    ['los errores se muestran en la caja', ce.erroresMostrados > 0],
    ['la insignia avisa del error', /error/i.test(ce.insignia)],
    ['en la tabla lexica el error sale en rojo', ce.filaError === 1]
  ];

  let fallas = 0;
  console.log('\n\x1b[1mVerificacion de la interfaz\x1b[0m');
  for (const [nombre, ok] of comprobaciones) {
    console.log(`  ${ok ? '\x1b[32mOK\x1b[0m   ' : '\x1b[31mFALLA\x1b[0m'} ${nombre}`);
    if (!ok) fallas++;
  }

  if (erroresInterfaz.length) {
    console.log('\n\x1b[31mErrores reportados por la interfaz:\x1b[0m');
    erroresInterfaz.forEach((e) => console.log('  - ' + e));
    fallas += erroresInterfaz.length;
  }

  if (fallas > 0) {
    const datos = Object.assign({}, d, { guardado: Object.assign({}, d.guardado, { contenido: '(...)' }) });
    console.log('\nDatos medidos:', JSON.stringify(datos));
  }
  console.log(`\n${fallas === 0 ? '\x1b[32mInterfaz correcta\x1b[0m' : `\x1b[31m${fallas} problema(s)\x1b[0m`}\n`);
  process.exitCode = fallas === 0 ? 0 : 1;
}
