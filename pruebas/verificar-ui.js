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

/** Un codigo dentro de su clase, como lo pide Java. */
const enClase = (...renglones) =>
  ['clase figuras {', '    clasePrincipal {', ...renglones.map((r) => '        ' + r), '    }', '}'].join('\n');

/** Un ciclo, para ver etiquetas y temporales en la pestaña 4. */
const EJEMPLO_INTERMEDIO = enClase('entero i = 0;', 'mientras (i < 3) {', '    i++;', '}', 'imprimirLn(i);');

/**
 * Un programa con valores que ya se saben, para la pestaña 5: usa las nueve
 * optimizaciones.
 */
const EJEMPLO_OPTIMIZACION = enClase('entero base = 4;', 'entero altura = base * 2;',
  'entero superficie = base * altura / 2;', 'entero lado;', 'leer(lado);',
  'entero doble = lado * 2 + lado * 2;', 'si (superficie > 10) {', '    imprimirLn("Grande: " + superficie);',
  '} sino {', '    imprimirLn("Chico");', '}', 'imprimirLn(doble * 1);');

/** Un programa con un ciclo, una decision y un opcion, para la pestaña 6 (Java). */
const EJEMPLO_OBJETO = enClase('entero n;', 'leer(n);', 'entero suma = 0;', 'para (entero i = 1; i <= n; i++) {',
  '    suma = suma + i;', '}', 'si (suma > 10) {', '    imprimirLn("Grande: " + suma);', '} sino {',
  '    imprimirLn("Chico");', '}', 'opcion (n % 3) {', '    caso 0: imprimirLn("cero"); romper;',
  '    caso 1: imprimirLn("uno"); romper;', '    porDefecto: imprimirLn("dos");', '}');

/** Donde la prueba guarda el programa Java (el boton Guardar .java). */
const JAVA_PRUEBA = path.join(RAIZ, 'salida', 'figuras.java');

/** Un programa de geometria correcto, para la pestaña 3. */
const EJEMPLO_SEMANTICO = enClase('decimal radio = 2.5;', 'decimal a = area.circulo(radio);', 'imprimirLn(a);');

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
      codigos:       ['lex-codigo', 'codigo', 'sem-codigo', 'int-codigo', 'opt-codigo', 'obj-codigo'].map((id) => document.getElementById(id).value),
      filasTabla:    qq('#lex-tabla tr').length,
      nodos:         qq('#salida-sintactico .arbol-nodo').length,
      notaSemantico: q('#sem-salida').textContent,
      botonesLexico: textos('#panel-lexico .btn'),
      botonesSemantico: textos('#panel-semantico .btn'),
      botonesIntermedio: textos('#panel-intermedio .btn'),
      notaIntermedio: q('#int-salida').textContent,
      botonesOptimizacion: textos('#panel-optimizacion .btn'),
      notaOptimizacion: q('#opt-salida').textContent,
      tituloOptimizacion: q('#panel-optimizacion .titulo-semantico').textContent.replace(/\\s+/g, ' ').trim(),
      logosOptimizacion: qq('#panel-optimizacion .logos-columna .logo').map((e) => e.dataset.logo).join(','),
      botonesObjeto: textos('#panel-objeto .btn'),
      notaObjeto: q('#obj-salida').textContent,
      tituloObjeto: q('#panel-objeto .titulo-semantico').textContent.replace(/\\s+/g, ' ').trim(),
      logosObjeto: qq('#panel-objeto .logos-columna .logo').map((e) => e.dataset.logo).join(','),
      ordenSemantico: qq('#panel-semantico .cuerpo > *').map((e) => e.tagName).join(',')
    };
  })()`);

  // ---------- Pestaña 1: la tabla de tokens ----------
  await escribir('lex-codigo', 'a = b + c * 24');
  const compartido = await js(`['lex-codigo', 'codigo', 'sem-codigo', 'int-codigo', 'opt-codigo', 'obj-codigo']
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
    lexica:  document.querySelector('#salida-lexico .linea-salida .codigo-linea')
               ? document.querySelector('#salida-lexico .linea-salida .codigo-linea').textContent.trim() : '',
    nodos:   document.querySelectorAll('#salida-sintactico .arbol-nodo').length
  })`);

  await pestana('semantico');
  await esperar(300);
  // a = b + c * 24 es una expresion suelta: la pestaña 3 dice que falta la
  // clase y no genera nada.
  const enSemantico = await js(`({
    visible:  document.getElementById('panel-semantico').offsetParent !== null,
    codigo:   document.getElementById('sem-codigo').value,
    insignia: document.getElementById('sem-estado').textContent,
    aviso:    document.querySelector('#sem-salida .veredicto.mal b')
                ? document.querySelector('#sem-salida .veredicto.mal b').textContent : '',
    gramatica: document.querySelectorAll('#sem-salida .gramatica').length
  })`);

  // En la pestaña 4 tampoco se genera: a la expresion le falta la clase
  await pestana('intermedio');
  await esperar(300);
  const enIntermedio = await js(`({
    visible:  document.getElementById('panel-intermedio').offsetParent !== null,
    codigo:   document.getElementById('int-codigo').value,
    insignia: document.getElementById('int-estado').textContent
  })`);

  // En la pestaña 5 tampoco: no hay codigo intermedio que optimizar
  await pestana('optimizacion');
  await esperar(300);
  const enOptimizacion = await js(`({
    visible:  document.getElementById('panel-optimizacion').offsetParent !== null,
    codigo:   document.getElementById('opt-codigo').value,
    insignia: document.getElementById('opt-estado').textContent
  })`);

  // En la pestaña 6 tampoco: no hay codigo optimizado que escribir en Java
  await pestana('objeto');
  await esperar(300);
  const enObjeto = await js(`({
    visible:  document.getElementById('panel-objeto').offsetParent !== null,
    codigo:   document.getElementById('obj-codigo').value,
    insignia: document.getElementById('obj-estado').textContent
  })`);

  // Ctrl+Tab desde la ultima pestaña vuelve a la primera; la tabla sigue ahi
  await js(`document.dispatchEvent(new KeyboardEvent('keydown',
    { key: 'Tab', ctrlKey: true, bubbles: true })); true`);
  await esperar(250);
  const deRegreso = await js(`({
    activa: document.querySelector('.pestana.activa').dataset.pestana,
    filas:  document.querySelectorAll('#lex-tabla tr').length,
    seleccionada: document.querySelectorAll('#lex-tabla tr.seleccionada').length
  })`);

  // ---------- Pestaña 3: un programa de geometria que tiene sentido ----------
  await pestana('semantico');
  await escribir('sem-codigo', EJEMPLO_SEMANTICO);
  await clic('#sem-analiza');
  await esperar(400);
  const semantico = await js(`(function () {
    const qq = (s) => Array.from(document.querySelectorAll(s));
    return {
      insignia: document.getElementById('sem-estado').textContent,
      // Sin errores no hay recuadros: lo dice la insignia
      recuadros: qq('#sem-salida .veredicto').length,
      tablaSimbolos: qq('#sem-salida table').length - qq('#sem-salida table.gramatica').length,
      titulos:  qq('#sem-salida .titulo-semantico-parte').map((h) => h.textContent),
      reglas:   qq('#sem-salida .gramatica tr').map(${TEXTO_FILA}),
      ejemplo:  qq('#sem-salida .gramatica .alternativa')
                  .map((a) => a.title).find((t) => t === 'En el código: area.circulo(radio)') || '',
      filasLexico: document.querySelectorAll('#lex-tabla tr').length
    };
  })()`);

  // Un codigo bien escrito pero sin sentido: los errores semanticos
  await escribir('sem-codigo', enClase('entero x = "hola";', 'imprimirLn(y);'));
  await clic('#sem-analiza');
  await esperar(400);
  const semanticoErrores = await js(`(function () {
    const qq = (s) => Array.from(document.querySelectorAll(s));
    return {
      insignia: document.getElementById('sem-estado').textContent,
      titulo:   document.querySelector('#sem-salida .veredicto.mal b')
                  ? document.querySelector('#sem-salida .veredicto.mal b').textContent : '',
      errores:  qq('#sem-salida .veredicto.mal .error-linea').map((e) => e.textContent),
      avisos:   qq('#sem-salida .veredicto.advertencia .error-linea').map((e) => e.textContent),
      gramatica: qq('#sem-salida .gramatica').length
    };
  })()`);

  await escribir('sem-codigo', enClase('entero a = 2;', 'si (a > 1) { romper; }'));
  await clic('#sem-analiza');
  await esperar(400);
  const semanticoSi = await js(`({
    inst: Array.from(document.querySelectorAll('#sem-salida .gramatica tr')).map(${TEXTO_FILA})
            .find((f) => f.startsWith('inst')) || '',
    subrayadas: Array.from(document.querySelectorAll('#sem-salida .terminal.palabra')).map((e) => e.textContent)
  })`);

  // Varias proposiciones, una por renglon: el lexico y el sintactico las
  // aceptan, pero en el semantico, como en Java, falta la clase.
  await escribir('sem-codigo', 'a = b + c\na && b || c + f > d');
  await clic('#sem-analiza');
  await esperar(400);
  const semanticoVarias = await js(`({
    insignia: document.getElementById('sem-estado').textContent,
    insigniaVisible: getComputedStyle(document.getElementById('sem-estado')).display !== 'none',
    // El recuadro va dentro de la caja de resultados, arriba, y no flotando
    // como la notificacion de "guardado".
    enSuLugar: (function () {
      const caja = document.querySelector('#sem-salida .veredicto');
      const salida = document.getElementById('sem-salida');
      return !!caja && getComputedStyle(caja).position === 'static' &&
        caja.getBoundingClientRect().top - salida.getBoundingClientRect().top < 40;
    })(),
    aviso:    document.querySelector('#sem-salida .veredicto.mal b')
                ? document.querySelector('#sem-salida .veredicto.mal b').textContent : '',
    ejemplo:  document.querySelector('#sem-salida .ejemplo-codigo')
                ? document.querySelector('#sem-salida .ejemplo-codigo').textContent : '',
    gramatica: document.querySelectorAll('#sem-salida .gramatica').length,
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

  // ---------- Pestaña 4: el codigo intermedio de un ciclo ----------
  await pestana('intermedio');
  await escribir('int-codigo', EJEMPLO_INTERMEDIO);
  await clic('#int-genera');
  await esperar(400);
  const intermedio = await js(`(function () {
    const qq = (s) => Array.from(document.querySelectorAll(s));
    return {
      insignia: document.getElementById('int-estado').textContent,
      resumen: document.querySelector('#int-salida .resumen-gramatica').textContent,
      instrucciones: qq('#int-salida .codigo-intermedio td.instruccion').map((td) => td.textContent).join(' / '),
      numeros: qq('#int-salida .codigo-intermedio tr:not(.comentario) td.num').map((td) => td.textContent).join(','),
      comentarios: qq('#int-salida .codigo-intermedio tr.comentario').map((tr) => tr.textContent),
      temporales: qq('#int-salida .ci-temporal').map((e) => e.textContent),
      etiquetas: qq('#int-salida .ci-etiqueta').map((e) => e.textContent),
      vistaActiva: document.querySelector('.btn-vista.activa').id
    };
  })()`);

  await clic('#int-ver-cuadruplos');
  await esperar(150);
  Object.assign(intermedio, await js(`(function () {
    const qq = (s) => Array.from(document.querySelectorAll(s));
    const filas = qq('#int-salida .tabla-cuadruplos tbody tr');
    return {
      columnas: qq('#int-salida .tabla-cuadruplos th').map((th) => th.textContent).join(' | '),
      cuadruplos: filas.length,
      quinto: Array.from(filas[4].children).map((td) => td.textContent),
      vistaCuadruplos: document.querySelector('.btn-vista.activa').id
    };
  })()`));
  await clic('#int-ver-tres');

  // Con errores no se genera: primero hay que corregirlos
  await escribir('int-codigo', 'a = b + c');
  await clic('#int-genera');
  await esperar(400);
  const intermedioMal = await js(`({
    insignia: document.getElementById('int-estado').textContent,
    titulo: document.querySelector('#int-salida .veredicto.mal b')
              ? document.querySelector('#int-salida .veredicto.mal b').textContent : '',
    errores: Array.from(document.querySelectorAll('#int-salida .error-linea')).map((e) => e.textContent)
  })`);

  // ---------- Pestaña 5: el codigo optimizado ----------
  await pestana('optimizacion');
  await escribir('opt-codigo', EJEMPLO_OPTIMIZACION);
  await clic('#opt-optimiza');
  await esperar(400);
  const optimizacion = await js(`(function () {
    const qq = (s) => Array.from(document.querySelectorAll(s));
    const chip = document.querySelector('#opt-salida .chip-optimizacion');
    return {
      insignia: document.getElementById('opt-estado').textContent,
      resumen: document.querySelector('#opt-salida .resumen-gramatica').textContent,
      chips: qq('#opt-salida .chip-optimizacion').map((c) => c.textContent),
      ayuda: chip ? chip.title : '',
      instrucciones: qq('#opt-salida .codigo-intermedio td.instruccion').map((td) => td.textContent).join(' / '),
      cambiadas: qq('#opt-salida .codigo-intermedio tr.cambiada td.ci-cambios').map((td) => td.textContent),
      origen: qq('#opt-salida .codigo-intermedio tr.cambiada')[0].title,
      vistaActiva: document.querySelector('#panel-optimizacion .btn-vista.activa').id
    };
  })()`);

  await clic('#opt-ver-cambios');
  await esperar(150);
  Object.assign(optimizacion, await js(`(function () {
    const qq = (s) => Array.from(document.querySelectorAll(s));
    const filas = qq('#opt-salida .tabla-cambios tbody tr');
    return {
      columnasCambios: qq('#opt-salida .tabla-cambios th').map((th) => th.textContent).join(' | '),
      cambios: filas.length,
      primero: Array.from(filas[0].children).map((td) => td.textContent),
      quitadas: qq('#opt-salida .tabla-cambios td.quitada').length,
      vistaCambios: document.querySelector('#panel-optimizacion .btn-vista.activa').id
    };
  })()`));

  await clic('#opt-ver-cuadruplos');
  await esperar(150);
  Object.assign(optimizacion, await js(`({
    cuadruplos: document.querySelectorAll('#opt-salida .tabla-cuadruplos tbody tr').length,
    segundo: Array.from(document.querySelectorAll('#opt-salida .tabla-cuadruplos tbody tr')[2].children)
      .map((td) => td.textContent)
  })`));
  await clic('#opt-ver-optimizado');

  // La pestaña 4 tiene el mismo programa, sin optimizar
  optimizacion.enIntermedio = await js("document.getElementById('int-estado').textContent");

  // Con errores tampoco se optimiza
  await escribir('opt-codigo', 'a = b + c');
  await clic('#opt-optimiza');
  await esperar(400);
  const optimizacionMal = await js(`({
    insignia: document.getElementById('opt-estado').textContent,
    titulo: document.querySelector('#opt-salida .veredicto.mal b')
              ? document.querySelector('#opt-salida .veredicto.mal b').textContent : '',
    errores: document.querySelectorAll('#opt-salida .error-linea').length
  })`);

  // ---------- Pestaña 6: el codigo objeto (Java) ----------
  await pestana('objeto');
  await escribir('obj-codigo', EJEMPLO_OBJETO);
  await clic('#obj-genera');
  await esperar(400);
  const objeto = await js(`(function () {
    const qq = (s) => Array.from(document.querySelectorAll(s));
    const renglones = qq('#obj-salida .codigo-java td.java').map((td) => td.textContent.trim());
    return {
      insignia: document.getElementById('obj-estado').textContent,
      resumen: document.querySelector('#obj-salida .resumen-gramatica').textContent,
      renglones,
      numeros: qq('#obj-salida .codigo-java td.num').length,
      clases: {
        control: qq('#obj-salida .codigo-java .j-control').map((e) => e.textContent),
        tipo: qq('#obj-salida .codigo-java .j-tipo').map((e) => e.textContent),
        cadena: qq('#obj-salida .codigo-java .j-cadena').length
      },
      origen: (qq('#obj-salida .codigo-java tr').find((tr) => /for \\(/.test(tr.textContent)) || {}).title || '',
      vistaActiva: document.querySelector('#panel-objeto .btn-vista.activa').id
    };
  })()`);
  await clic('#obj-ver-lado');
  await esperar(150);
  Object.assign(objeto, await js(`({
    lados: Array.from(document.querySelectorAll('#obj-salida .lado-a-lado .titulo-lado')).map((p) => p.textContent),
    tresDirecciones: document.querySelectorAll('#obj-salida .lado-a-lado .codigo-intermedio tr:not(.comentario)').length,
    javaAlLado: document.querySelectorAll('#obj-salida .lado-a-lado .codigo-java tr').length,
    vistaLado: document.querySelector('#panel-objeto .btn-vista.activa').id
  })`));
  await clic('#obj-ver-java');

  // Guardar .java: el archivo se llama como la clase
  if (fs.existsSync(JAVA_PRUEBA)) fs.unlinkSync(JAVA_PRUEBA);
  await clic('#obj-guardar');
  await esperar(500);
  objeto.aviso = await js("document.getElementById('aviso-texto').textContent");
  objeto.archivo = fs.existsSync(JAVA_PRUEBA) ? fs.readFileSync(JAVA_PRUEBA, 'utf8') : '';
  if (fs.existsSync(JAVA_PRUEBA)) fs.unlinkSync(JAVA_PRUEBA);

  // Con errores no se genera
  await escribir('obj-codigo', 'a = b + c');
  await clic('#obj-genera');
  await esperar(400);
  const objetoMal = await js(`({
    insignia: document.getElementById('obj-estado').textContent,
    titulo: document.querySelector('#obj-salida .veredicto.mal b')
              ? document.querySelector('#obj-salida .veredicto.mal b').textContent : '',
    errores: document.querySelectorAll('#obj-salida .error-linea').length
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
  await escribir('sem-codigo', EJEMPLO_SEMANTICO);
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
    codigos: ['lex-codigo', 'codigo', 'sem-codigo', 'int-codigo', 'opt-codigo', 'obj-codigo'].map((id) => document.getElementById(id).value),
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
      salidaLexica: q('#salida-lexico .codigo-linea').textContent.replace(/\\s+/g, ' ').trim(),
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

  // ---------- Números de renglón y colores de Java ----------
  await escribir('codigo', [
    'entero edad = 20;   // la edad',
    '',
    'si (edad >= 18 Y verdadero) {',
    '    imprimirLn("Mayor");',
    '}'
  ].join('\n'));
  await clic('#btn-ambos');
  await esperar(400);
  const editor = await js(`(function () {
    const caja = document.getElementById('codigo').closest('.editor-codigo');
    const qq = (s) => Array.from(caja.querySelectorAll(s));
    const textos = (s) => qq(s).map((e) => e.textContent).join(' ');
    const color = (s) => caja.querySelector(s) ? getComputedStyle(caja.querySelector(s)).color : '';
    const filas = Array.from(document.querySelectorAll('#salida-lexico .linea-salida'));
    return {
      enLosTres: ['lex-codigo', 'codigo', 'sem-codigo', 'int-codigo', 'opt-codigo', 'obj-codigo'].every((id) => {
        const c = document.getElementById(id).closest('.editor-codigo');
        return !!c && !!c.querySelector('.editor-numeros') && !!c.querySelector('.editor-colores');
      }),
      numeros:     caja.querySelector('.editor-numeros-lista').textContent,
      // Cada palabra con la clase que le da su color (como Java en VS Code)
      clases: {
        tipo: textos('.j-tipo'),
        control: textos('.j-control'),
        operador: textos('.j-operador'),
        constante: textos('.j-constante'),
        funcion: textos('.j-funcion'),
        variable: textos('.j-variable'),
        numero: textos('.j-numero')
      },
      cadenas:     qq('.j-cadena').map((e) => e.textContent),
      comentarios: qq('.j-comentario').map((e) => e.textContent),
      colores: {
        control: color('.j-control'),
        tipo: color('.j-tipo'),
        constante: color('.j-constante'),
        funcion: color('.j-funcion'),
        variable: color('.j-variable'),
        cadena: color('.j-cadena'),
        numero: color('.j-numero'),
        comentario: color('.j-comentario')
      },
      filasLexico: filas.map((f) => f.querySelector('.num').textContent + ':' +
                                    f.querySelector('.codigo-linea').textContent.trim())
    };
  })()`);

  // Veinte renglones: el cuadro se desplaza y los números y colores lo siguen
  await escribir('codigo',
    Array.from({ length: 20 }, (_, i) => `x${i + 1} = ${i + 1};`).join('\n'));
  await esperar(200);
  await js(`(function () {
    const ta = document.getElementById('codigo');
    ta.scrollTop = ta.scrollHeight;
    return true;
  })()`);
  await esperar(200);
  const alineado = await js(`(function () {
    const ta = document.getElementById('codigo');
    const caja = ta.closest('.editor-codigo');
    const pre = caja.querySelector('.editor-colores');
    const lista = caja.querySelector('.editor-numeros-lista');
    // La letra y el alto de renglon de cada uno, y donde empieza el primer
    // renglon: el texto y los colores tienen relleno arriba; la lista de
    // numeros va encimada y se baja lo mismo con "top".
    const estilo = (e, arriba) => {
      const c = getComputedStyle(e);
      return [c.fontFamily, c.fontSize, c.lineHeight, c.tabSize, c[arriba]].join(' | ');
    };
    const caracter = (nodo, i) => {
      const r = document.createRange();
      r.setStart(nodo, i);
      r.setEnd(nodo, i + 1);
      return r.getBoundingClientRect();
    };
    // El ultimo numero ("20") y el ultimo caracter del ultimo renglon (";").
    // Se buscan en los nodos de texto: los renglones con error van en un
    // <span> rojo, asi que la lista ya no es un solo texto.
    const textosDe = (nodo) => {
      const textos = [];
      const recorrer = (n) => n.nodeType === 3 ? textos.push(n) : n.childNodes.forEach(recorrer);
      recorrer(nodo);
      return textos.filter((t) => t.textContent.trim() !== '');
    };
    const numeros = textosDe(lista).pop();
    const ultimo = textosDe(pre).pop();
    // La negrita no debe cambiar el ancho de las letras (desfase de lado)
    const ancho = (negrita) => {
      const s = document.createElement('span');
      s.textContent = 'imprimirLn';
      s.style.fontWeight = negrita ? '700' : '400';
      pre.appendChild(s);
      const w = s.getBoundingClientRect().width;
      s.remove();
      return w;
    };
    return {
      desplazado: ta.scrollTop > 0,
      mismasMedidas: estilo(ta, 'paddingTop') === estilo(pre, 'paddingTop') &&
        estilo(pre, 'paddingTop') === estilo(lista, 'top')
        ? 'iguales' : [estilo(ta, 'paddingTop'), estilo(pre, 'paddingTop'), estilo(lista, 'top')].join(' / '),
      altoTexto: ta.scrollHeight,
      altoColores: pre.offsetHeight,
      altoUltimoNumero: caracter(numeros, numeros.length - 1).top,
      altoUltimoRenglon: caracter(ultimo, ultimo.length - 1).top,
      anchoNegrita: ancho(true),
      anchoNormal: ancho(false)
    };
  })()`);

  // ---------- Mucho codigo: el cuadro no se estira, se desplaza ----------
  // (antes la columna de numeros crecia con cada renglon y estiraba el
  // cuadro hasta el alto de la ventana)
  const muchoCodigo = Array.from({ length: 80 }, (_, i) => `entero v${i + 1} = ${i + 1};`).join('\n');
  const medirCuadro = (id) => js(`(function () {
    const ta = document.getElementById(${JSON.stringify(id)});
    const caja = ta.closest('.editor-codigo');
    const numeros = caja.querySelector('.editor-numeros');
    return {
      altoCuadro: caja.getBoundingClientRect().height,
      altoTexto: ta.getBoundingClientRect().height,
      altoNumeros: numeros.getBoundingClientRect().height,
      seDesplaza: ta.scrollHeight > ta.clientHeight,
      ultimoNumero: caja.querySelector('.editor-numeros-lista').textContent.split('\\n').pop()
    };
  })()`);
  await escribir('codigo', muchoCodigo);
  await esperar(300);
  const largo = { sintactico: await medirCuadro('codigo') };
  await pestana('semantico');
  await esperar(250);
  largo.semantico = await medirCuadro('sem-codigo');
  await pestana('lexico');
  await esperar(250);
  largo.lexico = await medirCuadro('lex-codigo');
  await pestana('sintactico');
  await esperar(250);

  // ---------- El subrayado rojo de los errores mientras se escribe ----------
  // Sin la clase, unas instrucciones sueltas son un error (como en Java).
  await escribir('codigo', 'entero a = 5;\nimprimirLn(a);');
  await esperar(100);
  const subrayado = {
    alEscribir: await js("document.getElementById('codigo').closest('.editor-codigo').querySelectorAll('.j-marca').length")
  };
  await esperar(700);
  Object.assign(subrayado, await js(`(function () {
    const ta = document.getElementById('codigo');
    const caja = ta.closest('.editor-codigo');
    // El mouse sobre el renglon 1 (relleno de arriba + medio renglon)
    const r = ta.getBoundingClientRect();
    ta.dispatchEvent(new MouseEvent('mousemove', { clientX: r.left + 40, clientY: r.top + 12 + 10, bubbles: true }));
    return {
      marcas: Array.from(caja.querySelectorAll('.j-marca')).map((e) => e.textContent),
      renglones: Array.from(caja.querySelectorAll('.renglon-con-error')).map((e) => e.textContent),
      ayuda: ta.title,
      color: getComputedStyle(caja.querySelector('.j-marca')).textDecorationLine
    };
  })()`));
  // En la pestaña 3 se subrayan tambien los errores semanticos
  await pestana('semantico');
  await escribir('sem-codigo', enClase('entero x = "hola";', 'imprimirLn(x);'));
  await esperar(700);
  Object.assign(subrayado, await js(`(function () {
    const caja = document.getElementById('sem-codigo').closest('.editor-codigo');
    return {
      semantico: Array.from(caja.querySelectorAll('.j-marca')).map((e) => e.textContent),
      renglonSemantico: Array.from(caja.querySelectorAll('.renglon-con-error')).map((e) => e.textContent)
    };
  })()`));
  await pestana('sintactico');
  await esperar(150);

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
    codigos: ['lex-codigo', 'codigo', 'sem-codigo', 'int-codigo', 'opt-codigo', 'obj-codigo'].map((id) => document.getElementById(id).value),
    nodos:  document.querySelectorAll('#salida-sintactico .arbol-nodo').length,
    filas:  document.querySelectorAll('#lex-tabla tr').length,
    gramatica: document.querySelectorAll('#sem-salida .gramatica').length
  })`);

  await escribir('codigo', 'total = a + b * 2');
  await clic('#btn-lexico');
  await esperar(400);
  const soloLexico = await js(`({
    lexica: document.querySelector('#salida-lexico .linea-salida .codigo-linea')
              ? document.querySelector('#salida-lexico .linea-salida .codigo-linea').textContent.trim() : '',
    nodos:  document.querySelectorAll('#salida-sintactico .arbol-nodo').length
  })`);

  await clic('#btn-sintactico');
  await esperar(400);
  const soloSintactico = await js(`({
    lexicaVacia: !document.querySelector('#salida-lexico .linea-salida .codigo-linea'),
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
      lexica:     document.querySelector('#salida-lexico .linea-salida .codigo-linea').textContent.trim(),
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
      lexica: document.querySelector('#salida-lexico .linea-salida .codigo-linea').textContent.trim(),
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
    codigos: ['lex-codigo', 'codigo', 'sem-codigo', 'int-codigo', 'opt-codigo', 'obj-codigo'].map((id) => document.getElementById(id).value),
    nombre: window.app.nombreArchivo,
    lexica: document.querySelector('#salida-lexico .linea-salida .codigo-linea').textContent.trim(),
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

  // ---------- El zoom con un arbol ancho (el ejemplo de las variables) ----------
  // Antes el dibujo se encogia para caber en la caja: el + no lo agrandaba a
  // lo ancho y la parte izquierda no se podia ver.
  const variables = fs.readFileSync(path.join(RAIZ, 'ejemplos', '02-variables.bs'), 'utf8');
  await js(`window.app.cargarEjemplo({ nombre: '02-variables.bs', contenido: ${JSON.stringify(variables)} }); true`);
  await esperar(500);
  const medirArbol = () => js(`(function () {
    const l = document.querySelector('#salida-sintactico .arbol-lienzo');
    const s = l.querySelector('svg');
    const raiz = document.querySelector('#salida-sintactico .arbol-nodo rect').getBoundingClientRect();
    const caja = l.getBoundingClientRect();
    return {
      nivel: document.getElementById('zoom-nivel').textContent,
      atributo: Math.round(Number(s.getAttribute('width'))),
      dibujado: Math.round(s.getBoundingClientRect().width),
      ancho: l.clientWidth,
      desplazable: l.scrollWidth - l.clientWidth,
      raizVisible: raiz.left >= caja.left && raiz.right <= caja.right,
      // que tan lejos del centro de la caja quedo la raiz, en pixeles
      centroRaiz: Math.round(raiz.left + raiz.width / 2 - caja.left - l.clientWidth / 2)
    };
  })()`);
  const zoomGrande = { inicio: await medirArbol() };
  await clic('#zoom-mas');
  await clic('#zoom-mas');
  zoomGrande.acercado = await medirArbol();
  zoomGrande.orillaIzquierda = await js(`(function () {
    const l = document.querySelector('#salida-sintactico .arbol-lienzo');
    l.scrollLeft = 0;
    return Math.round(l.querySelector('svg').getBoundingClientRect().left - l.getBoundingClientRect().left);
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
      enClase('entero edad = 20;', 'si (edad >= 18) {', '    imprimirLn("Mayor");', '} sino {',
        '    imprimirLn("Menor");', '}'));
    await capturar('programa');

    await clic('#btn-equipo');
    await capturar('equipo');
    await clic('#modal-equipo [data-cerrar]');

    await analizarEn('sintactico', 'codigo', '#btn-ambos', 'entero a = 4.;');
    await capturar('errores');

    // El subrayado rojo: falta el ; al final del renglon 3
    await analizarEn('sintactico', 'codigo', '#btn-ambos', enClase('entero edad = 20', 'imprimirLn(edad);'));
    await esperar(800);
    await capturar('subrayado');

    // Pestaña 3
    await analizarEn('semantico', 'sem-codigo', '#sem-analiza', EJEMPLO_SEMANTICO);
    await capturar('semantico');

    await analizarEn('semantico', 'sem-codigo', '#sem-analiza',
      enClase('entero a = area.cuadrado(-4);', 'decimal p = perimetro.triangulo(1, 2, 10);',
        'logico l = a > 0 && p > 0;', 'imprimirLn(total);'));
    await capturar('semantico-errores');

    await analizarEn('semantico', 'sem-codigo', '#sem-analiza',
      'a = b + c\na && b || c + f > d');
    await capturar('semantico-proposiciones');

    // Pestaña 4: el codigo intermedio, en sus dos vistas
    await analizarEn('intermedio', 'int-codigo', '#int-genera', enClase(
      'entero suma = 0;', 'para (entero i = 1; i <= 3; i++) {', '    si (i > 1 Y i < 3) {',
      '        suma = suma + i * 2;', '    }', '}', 'imprimirLn(suma);'));
    await capturar('intermedio');
    await clic('#int-ver-cuadruplos');
    await capturar('intermedio-cuadruplos');
    await clic('#int-ver-tres');

    // Pestaña 5: el codigo optimizado y sus cambios. La caja del resultado se
    // desplaza para que se vea el codigo (o la tabla de cambios) desde arriba.
    const verEnLaCaja = (selector) => js(`(function () {
      const caja = document.getElementById('opt-salida');
      const tabla = caja.querySelector(${JSON.stringify(selector)});
      caja.scrollTop += tabla.getBoundingClientRect().top - caja.getBoundingClientRect().top - 10;
      return true;
    })()`);
    await analizarEn('optimizacion', 'opt-codigo', '#opt-optimiza', EJEMPLO_OPTIMIZACION);
    await capturar('optimizacion-resumen');
    await verEnLaCaja('.codigo-intermedio');
    await capturar('optimizacion');
    await clic('#opt-ver-cambios');
    await verEnLaCaja('.tabla-cambios');
    await capturar('optimizacion-cambios');
    await clic('#opt-ver-optimizado');

    // Pestaña 6: el programa en Java, solo y junto al codigo optimizado. La
    // caja se desplaza hasta la clase, para que se vea el main y no solo el
    // comentario del principio.
    const verClaseJava = () => js(`(function () {
      const caja = document.getElementById('obj-salida');
      const tablas = caja.querySelectorAll('table.codigo-java');
      const tabla = tablas[tablas.length - 1];
      const fila = Array.from(tabla.rows).find((f) => /public class/.test(f.textContent));
      caja.scrollTop += fila.getBoundingClientRect().top - caja.getBoundingClientRect().top - 10;
      return true;
    })()`);
    await analizarEn('objeto', 'obj-codigo', '#obj-genera', EJEMPLO_OBJETO);
    await verClaseJava();
    await capturar('objeto');
    await clic('#obj-ver-lado');
    await verClaseJava();
    await capturar('objeto-lado');
    await clic('#obj-ver-java');

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

  informar({ arranque, compartido, lexico, enSintactico, enSemantico, enIntermedio, intermedio, intermedioMal, deRegreso,
    enOptimizacion, optimizacion, optimizacionMal, enObjeto, objeto, objetoMal,
    semantico, semanticoErrores, semanticoSi, semanticoVarias, semanticoMal, fuga, guardado, reabierto,
    soltado, inicial, equipo, trasLimpiar, soloLexico, soloSintactico, expresion, potencias, ejemplo, zoom,
    rama, conError, editor, alineado, largo, zoomGrande, subrayado });
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
  // Guardar .java escribe de verdad, en salida/, con el nombre de la clase
  ipcMain.handle('archivo:guardarJava', (e, fuente) => {
    const objeto = compilar(fuente || '', {}).objeto;
    if (objeto.estado !== 'generado') return { ok: false, error: 'El programa tiene errores.' };
    const ruta = path.join(path.dirname(JAVA_PRUEBA), objeto.archivo);
    fs.mkdirSync(path.dirname(ruta), { recursive: true });
    fs.writeFileSync(ruta, objeto.codigo, 'utf8');
    return { ok: true, ruta, archivo: objeto.archivo };
  });
}

function informar (d) {
  const { arranque: ar, compartido: co, lexico: lx, enSintactico: es, enSemantico: em,
    enIntermedio: ei, intermedio: ci, intermedioMal: cm, deRegreso: dr,
    enOptimizacion: eo, optimizacion: op, optimizacionMal: om, enObjeto: eb, objeto: ob, objetoMal: obm,
    semantico: se, semanticoErrores: sx, semanticoSi: ss2, semanticoVarias: sv,
    semanticoMal: sm, fuga: fu, guardado: g, reabierto: ra,
    soltado: so, inicial: i, equipo: eq, trasLimpiar: tl, soloLexico: sl,
    soloSintactico: ss, expresion: ex, potencias: po, ejemplo: ej2, zoom: z, rama: rm,
    conError: ce, editor: ed, alineado: al, largo: lg, zoomGrande: zg, subrayado: sb } = d;

  const ORDEN_ESPERADO = [
    'Avalos Castillo', 'Borjas Arias', 'Pesina Santander',
    'Ramos Antonio', 'Vazquez Romo', 'Verlage Aceves'
  ];

  // Con 80 renglones el cuadro mide lo mismo que su texto (no se estira),
  // se desplaza por dentro, y la columna de numeros llega hasta el 80.
  const noSeEstira = (m) => m.altoCuadro <= 320 && Math.abs(m.altoCuadro - m.altoTexto) <= 2 &&
    Math.abs(m.altoNumeros - m.altoTexto) <= 1 && m.seDesplaza && m.ultimoNumero === '80';

  const comprobaciones = [
    ['la aplicacion se construyo', ar.appCreada === true],

    // Logos: cada pestaña los lleva donde los pide su diseño
    ['pestaña 1: UAT a la izquierda y UAMM a la derecha', ar.logosLexico === 'uat,uamm'],
    ['pestaña 2: los tres logos arriba (UAT, UAMM, ISC)', ar.logosSintactico === 'uat,uamm,isc'],
    ['pestaña 3: los tres logos en columna a la izquierda', ar.logosSemantico === 'uat,uamm,isc'],
    ['pestaña 5: los tres logos en columna a la izquierda', ar.logosOptimizacion === 'uat,uamm,isc'],
    ['pestaña 6: los tres logos en columna a la izquierda', ar.logosObjeto === 'uat,uamm,isc'],
    ['los diecisiete logos cargaron su imagen', ar.logosCargados === 17],

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
    ['hay seis pestañas, en el orden de las fases',
      ar.pestanas === 'Analizador Léxico | Analizador Léxico-Sintáctico | Analizador Semántico | ' +
      'Código Intermedio | Optimización | Código Objeto'],
    ['la aplicacion abre en la pestaña del analizador lexico',
      ar.activa === 'lexico' && ar.panelesVisibles === 'panel-lexico'],
    ['la pestaña 1 tiene sus cuatro botones',
      ar.botonesLexico === 'Realizar Análisis | Guardar | Borrar | Fuga'],
    ['la pestaña 3 tiene los botones del pizarron',
      ar.botonesSemantico === 'Limpieza | Analiza | Equipo | Termina'],
    ['la pestaña 4 tiene sus botones y explica lo que ahi saldra',
      ar.botonesIntermedio === 'Limpieza | Genera | Equipo | Termina' &&
      /código de tres direcciones y en cuádruplos/.test(ar.notaIntermedio)],
    ['la pestaña 5 tiene su título, sus botones y explica lo que ahi saldra',
      ar.tituloOptimizacion === 'Programación de Sistemas de Base II Optimizador de Código Intermedio “SwordByte”' &&
      ar.botonesOptimizacion === 'Limpieza | Optimiza | Equipo | Termina' &&
      /ya optimizado/.test(ar.notaOptimizacion)],
    ['la pestaña 6 tiene su título, sus botones (con Guardar .java) y explica lo que ahi saldra',
      ar.tituloObjeto === 'Programación de Sistemas de Base II Generador de Código Objeto “SwordByte”' &&
      ar.botonesObjeto === 'Limpieza | Genera | Guardar .java | Equipo | Termina' &&
      /traducido a Java/.test(ar.notaObjeto)],

    // Arranque limpio
    ['la aplicacion abre con el codigo vacio en las seis pestañas',
      ar.codigos.every((c) => c === '')],
    ['y sin tabla ni arbol', ar.filasTabla === 0 && ar.nodos === 0],
    ['la pestaña semantica explica lo que ahi saldra',
      /errores semánticos/.test(ar.notaSemantico) && /gramática/.test(ar.notaSemantico)],

    // Codigo compartido
    ['lo que se escribe en una pestaña aparece en las otras cinco',
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
    ['la pestaña 3 tambien tiene el codigo, y dice que a una expresion suelta le falta la clase',
      em.visible && em.codigo === 'a = b + c * 24' && em.insignia === 'falta la clase' &&
      /Falta la clase/.test(em.aviso) && em.gramatica === 0],
    ['la pestaña 4 tambien tiene el codigo, y sin la clase pide corregir primero',
      ei.visible && ei.codigo === 'a = b + c * 24' && ei.insignia === 'corrige primero'],
    ['la pestaña 5 tambien tiene el codigo, y sin la clase pide corregir primero',
      eo.visible && eo.codigo === 'a = b + c * 24' && eo.insignia === 'corrige primero'],
    ['la pestaña 6 tambien tiene el codigo, y sin la clase pide corregir primero',
      eb.visible && eb.codigo === 'a = b + c * 24' && eb.insignia === 'corrige primero'],
    ['Ctrl+Tab cambia de pestaña (de la ultima vuelve a la primera)', dr.activa === 'lexico'],

    // Pestaña 4: el codigo intermedio
    ['el ciclo se traduce a codigo de tres direcciones',
      ci.insignia === '11 instrucciones' && ci.resumen === '✓ 11 instrucciones · 1 temporal · 2 etiquetas' &&
      ci.instrucciones === 'funcion clasePrincipal() / i = 0 / L1: / t1 = i < 3 / ifFalse t1 goto L2 / ' +
      'i = i + 1 / goto L1 / L2: / param i / call imprimirLn, 1 / fin clasePrincipal'],
    ['cada instruccion lleva su numero y cada grupo el renglon de donde sale',
      ci.numeros === '1,2,3,4,5,6,7,8,9,10,11' &&
      ci.comentarios.join(' | ') === '// clasePrincipal | // entero i = 0; | // mientras (i < 3) | // i++; | // imprimirLn(i);'],
    ['los temporales y las etiquetas tienen su color',
      ci.temporales.join() === 't1,t1' && ci.etiquetas.join() === 'L1:,L2,L1,L2:'],
    ['la vista de cuadruplos es una tabla de cuatro campos',
      ci.vistaActiva === 'int-ver-tres' && ci.vistaCuadruplos === 'int-ver-cuadruplos' &&
      ci.columnas === '# | Operador | Arg 1 | Arg 2 | Resultado' && ci.cuadruplos === 11 &&
      ci.quinto.join('|') === '5|ifFalse|t1||L2'],
    ['con errores no se genera y se dice por que',
      cm.insignia === 'corrige primero' && cm.titulo === '✕ No se pudo generar el código intermedio' &&
      cm.errores.length === 1 && /Falta la clase/.test(cm.errores[0])],
    // Pestaña 5: la optimizacion
    ['lo que ya se sabe se calcula desde ahora y lo que sobra se quita',
      op.insignia === '9 instrucciones (−17)' && op.enIntermedio === '26 instrucciones' &&
      op.resumen === '✓ De 26 instrucciones a 9 (17 menos) · 1 temporal · 0 etiquetas' &&
      op.instrucciones === 'funcion clasePrincipal() / leer lado / t4 = lado + lado / doble = t4 + t4 / ' +
      'param "Grande: 16" / call imprimirLn, 1 / param doble / call imprimirLn, 1 / fin clasePrincipal'],
    ['arriba van las nueve optimizaciones, con sus veces y lo que hace cada una',
      op.chips.length === 9 && op.chips[0] === 'Plegado de constantes×5' && /^Calcula desde ahora/.test(op.ayuda)],
    ['las instrucciones que cambiaron dicen que se les hizo',
      op.cambiadas.join(' | ') === 'Reducción de fuerza | Propagación de copias | Propagación de constantes | ' +
      'Propagación de copias' && /era la instrucción 9$/.test(op.origen) && op.vistaActiva === 'opt-ver-optimizado'],
    ['la vista de cambios trae cada paso con su antes y su despues',
      op.vistaCambios === 'opt-ver-cambios' && op.columnasCambios === '# | Optimización | Antes | Después | Línea' &&
      op.cambios === 37 && op.quitadas === 16 &&
      op.primero.join('|') === '1|Propagación de constantes|t1 = base * 2|t1 = 4 * 2|4'],
    ['y la de cuadruplos, la tabla del codigo optimizado',
      op.cuadruplos === 9 && op.segundo.join('|') === '3|+|lado|lado|t4'],
    ['con errores no se optimiza y se dice por que',
      om.insignia === 'corrige primero' && om.titulo === '✕ No se pudo optimizar el código intermedio' && om.errores === 1],
    // Pestaña 6: el codigo objeto (Java)
    ['el programa se traduce a Java: la clase, el main, el for, el if y el switch',
      ob.insignia === 'figuras.java' && /^✓ figuras\.java · \d+ renglones de Java · 1 método/.test(ob.resumen) &&
      ob.renglones.includes('public class figuras {') &&
      ob.renglones.includes('public static void main(String[] args) {') &&
      ob.renglones.includes('for (int i = 1; i <= n; i++) {') &&
      ob.renglones.includes('if (suma > 10) {') && ob.renglones.includes('switch (n % 3) {')],
    ['leer usa un Scanner y los renglones van numerados',
      ob.renglones.includes('import java.util.Scanner;') && ob.renglones.includes('int n = entrada.nextInt();') &&
      ob.numeros === ob.renglones.length],
    ['el Java lleva sus colores y cada renglon dice de donde sale',
      ob.clases.control.includes('for') && ob.clases.control.includes('switch') && ob.clases.tipo.includes('int') &&
      ob.clases.cadena > 0 && /^Sale de la línea 6 del programa$/.test(ob.origen) && ob.vistaActiva === 'obj-ver-java'],
    ['la otra vista pone el codigo optimizado junto al Java',
      ob.vistaLado === 'obj-ver-lado' && ob.lados.join(' | ') === 'Código optimizado (pestaña 5) | Java: figuras.java (pestaña 6)' &&
      ob.tresDirecciones > 0 && ob.javaAlLado === ob.renglones.length],
    ['Guardar .java guarda el programa con el nombre de la clase',
      /Código Java guardado/.test(ob.aviso) && /figuras\.java/.test(ob.aviso) &&
      ob.archivo.includes('public class figuras {')],
    ['con errores no se genera el Java y se dice por que',
      obm.insignia === 'corrige primero' && obm.titulo === '✕ No se pudo generar el código objeto' && obm.errores === 1],
    ['al regresar nada se borro: la tabla y la fila marcada siguen',
      dr.filas === 7 && dr.seleccionada === 1],

    // Pestaña 3: el analisis semantico
    ['un programa de geometria correcto no tiene errores semanticos',
      se.insignia === 'sin errores'],
    ['sin errores no hay recuadros ni tabla de simbolos: solo la gramatica',
      se.recuadros === 0 && se.tablaSimbolos === 0 &&
      se.titulos.join(' / ') === 'Gramática del código (9 reglas, 12 producciones)'],
    ['la gramatica es la del codigo dado',
      se.reglas.slice(0, 4).join(' / ') === 'prop → clase id { principal } / ' +
      'principal → clasePrincipal { inst ( inst )* } / ' +
      'inst → tipo id = exp ; | imprimirLn ( exp ) ; / exp → id | dec | area . circulo ( exp )'],
    ['cada produccion dice de que parte del codigo salio',
      se.ejemplo === 'En el código: area.circulo(radio)'],
    ['y la pestaña 1 se lleno con el mismo codigo', se.filasLexico === 27],
    ['un codigo bien escrito pero sin sentido muestra sus errores semanticos',
      sx.insignia === '2 errores' && sx.titulo === '✕ 2 errores semánticos' &&
      /'x' es entero y el valor es cadena/.test(sx.errores[0]) &&
      /'y' no está declarada/.test(sx.errores[1])],
    ['las advertencias van aparte y la gramatica se genera igual',
      sx.avisos.length === 1 && /nunca se usa/.test(sx.avisos[0]) && sx.gramatica === 1],
    ['funciona con cualquier programa del lenguaje',
      ss2.inst === 'inst → romper ; | tipo id = exp ; | si ( exp ) { inst }'],
    ['las palabras terminales van subrayadas, como en el pizarron',
      ss2.subrayadas.includes('si') && ss2.subrayadas.includes('romper')],
    ['a las proposiciones sueltas les falta la clase en la pestaña 3',
      sv.insignia === 'falta la clase' && sv.aviso === '✕ Falta la clase' && sv.gramatica === 0 &&
      sv.ejemplo.startsWith('clase ejemplo {')],
    ['el aviso se ve en su lugar, con su insignia', sv.enSuLugar && sv.insigniaVisible],
    ['pero la pestaña 2 si dibuja las dos proposiciones', sv.nodos === 15],
    ['con errores lexicos o sintacticos se piden corregir primero',
      sm.insignia === 'corrige primero' && /No se pudo hacer el análisis semántico/.test(sm.titulo) &&
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
    ['el reporte trae las siete secciones',
      ['Código fuente', 'Análisis léxico', 'Análisis sintáctico', 'Análisis semántico', 'Código intermedio',
        'Código optimizado', 'Código objeto (Java)'].every((t) => g.contenido.includes(t))],
    ['el reporte guarda el codigo para volver a abrirlo',
      g.contenido.includes('id="datos-swordbyte"') && g.contenido.includes('"pestana":"semantico"')],
    ['al abrirlo regresa el codigo a las seis pestañas',
      ra.codigos.every((c) => c === EJEMPLO_SEMANTICO)],
    ['y regresa a la pestaña desde la que se guardo',
      ra.activa === 'semantico' && ra.insignia === 'sin errores'],
    ['soltar el reporte sobre la ventana tambien lo abre',
      so.codigo === EJEMPLO_SEMANTICO && so.filas === 27],

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
    ['Limpiar vacia el codigo y los resultados de las seis pestañas',
      tl.codigos.every((c) => c === '') && tl.nodos === 0 && tl.filas === 0 && tl.gramatica === 0],
    ['Analisis Lexico solo llena la caja lexica',
      sl.lexica.includes('id1 = id2 + id3 * num(2)') && sl.nodos === 0],
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
    ['un ejemplo del menu se carga en las seis pestañas y se analiza',
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
    ['en la tabla lexica el error sale en rojo', ce.filaError === 1],

    // Numeros de renglon y colores de Java
    ['los seis cuadros de codigo llevan numeros y colores', ed.enLosTres === true],
    ['hay un numero por renglon, del 1 al 5', ed.numeros === '1\n2\n3\n4\n5'],
    ['cada palabra se pinta mientras se escribe, segun lo que es (como Java)',
      ed.clases.tipo === 'entero' && ed.clases.control === 'si' && ed.clases.operador === 'Y' &&
      ed.clases.constante === 'verdadero' && ed.clases.funcion === 'imprimirLn' &&
      ed.clases.variable === 'edad edad' && ed.clases.numero === '20 18'],
    ['los textos y los comentarios tambien',
      ed.cadenas.join() === '"Mayor"' && ed.comentarios.join() === '// la edad'],
    ['con los colores de Java en VS Code (Light+)',
      ed.colores.control === 'rgb(175, 0, 219)' && ed.colores.tipo === 'rgb(38, 127, 153)' &&
      ed.colores.constante === 'rgb(0, 0, 255)' && ed.colores.funcion === 'rgb(121, 94, 38)' &&
      ed.colores.variable === 'rgb(0, 16, 128)' && ed.colores.cadena === 'rgb(163, 21, 21)' &&
      ed.colores.numero === 'rgb(9, 134, 88)' && ed.colores.comentario === 'rgb(0, 128, 0)'],
    ['el analisis lexico lleva el mismo numero que su renglon de codigo',
      ed.filasLexico.join(' / ') === '1:entero id1 = num(20); / 2: / ' +
      '3:si (id1 >= num(18) Y verdadero) { / 4:imprimirLn("Mayor"); / 5:}'],
    ['texto, colores y numeros usan las mismas medidas', al.mismasMedidas === 'iguales'],
    ['el texto y sus colores miden lo mismo de alto', Math.abs(al.altoTexto - al.altoColores) < 1],
    ['desplazado, el ultimo numero queda a la altura del ultimo renglon',
      al.desplazado && Math.abs(al.altoUltimoNumero - al.altoUltimoRenglon) < 1],
    ['las negritas no cambian el ancho de las letras', Math.abs(al.anchoNegrita - al.anchoNormal) < 0.5],
    ['con mucho codigo el cuadro de la pestaña 2 no se estira: se desplaza', noSeEstira(lg.sintactico)],
    ['tampoco el de la pestaña 3', noSeEstira(lg.semantico)],
    ['ni el de la pestaña 1', noSeEstira(lg.lexico)],

    // El zoom con el arbol ancho del ejemplo de las variables
    ['un arbol ancho se dibuja de su tamaño real, sin encogerse para caber',
      zg.inicio.dibujado === zg.inicio.atributo && zg.inicio.atributo > zg.inicio.ancho &&
      zg.inicio.desplazable > 0],
    ['al dibujarlo, la raiz queda a la vista y centrada',
      zg.inicio.raizVisible && Math.abs(zg.inicio.centroRaiz) <= 2],
    ['el + agranda el arbol de verdad, tambien a lo ancho',
      zg.acercado.nivel === '120%' && zg.acercado.dibujado === zg.acercado.atributo &&
      zg.acercado.dibujado > zg.inicio.dibujado * 1.15],
    ['al acercar no se pierde de vista lo que estaba en el centro',
      zg.acercado.raizVisible && Math.abs(zg.acercado.centroRaiz) <= 2],
    ['se puede desplazar hasta la orilla izquierda del arbol',
      zg.orillaIzquierda >= 0 && zg.orillaIzquierda <= 20],

    // El subrayado rojo de los errores
    ['mientras se escribe todavia no se subraya nada', sb.alEscribir === 0],
    ['al hacer una pausa el error se subraya en rojo, con su renglon en rojo',
      sb.marcas.join() === 'entero' && sb.renglones.join() === '1' && sb.color === 'underline'],
    ['codigo sin clase: el error dice que falta la clase', /Falta la clase/.test(sb.ayuda)],
    ['en la pestaña 3 se subrayan tambien los errores semanticos',
      sb.semantico.join() === 'x' && sb.renglonSemantico.join() === '3']
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
