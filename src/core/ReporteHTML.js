/**
 * ReporteHTML.js
 * El reporte "visual": una pagina web que se abre con doble clic en cualquier
 * navegador y que el compilador puede volver a abrir para seguir trabajando.
 *
 * Por que una pagina web y no un .txt:
 *   - Se ve como en la aplicacion: los colores, la tabla de tokens, el arbol
 *     dibujado y el analisis semantico.
 *   - Es UN solo archivo: los logos y los estilos van adentro, asi que se
 *     puede mandar por correo o copiar a una USB sin que se rompa.
 *   - Se puede imprimir o guardar como PDF desde el navegador (Ctrl+P).
 *   - Lleva guardado el codigo fuente en un bloque de datos, asi que el
 *     compilador lo recupera tal cual al abrirlo.
 *
 * El bloque de datos es un <script type="application/json">. El navegador no
 * lo ejecuta ni lo muestra: solo lo guarda. Se ve asi:
 *
 *   <script type="application/json" id="datos-swordbyte">
 *   {"formato":"reporte-swordbyte","version":1,"pestana":"lexico",
 *    "programa":"analisis.html","fecha":"2026-10-06T18:00:00.000Z",
 *    "codigo":"a = b + c * 24"}
 *   </script>
 *
 * construirReporteHTML() arma la pagina y extraerDatosHTML() lee ese bloque.
 */

const { MATERIA, NOMBRE_EQUIPO, nombresCompletos } = require('./comun/Equipo');
const { arbolATexto } = require('./Reporte');

/** Marca que identifica el bloque de datos de nuestros reportes. */
const FORMATO = 'reporte-swordbyte';
const VERSION_FORMATO = 1;
const ID_DATOS = 'datos-swordbyte';

/** Las tres pestañas de la aplicacion y su nombre completo. */
const PESTANAS = {
  lexico: 'Analizador Léxico',
  sintactico: 'Analizador Léxico-Sintáctico',
  semantico: 'Analizador Semántico'
};

/** Nombre completo de cada institucion, para el texto alterno de su logo. */
const INSTITUCIONES = {
  uat: { siglas: 'UAT', nombre: 'Universidad Autónoma de Tamaulipas' },
  uamm: { siglas: 'UAMM', nombre: 'Unidad Académica Multidisciplinaria Mante' },
  isc: { siglas: 'ISC', nombre: 'Ingeniería en Sistemas Computacionales' }
};

// ====================================================================
// Utilidades
// ====================================================================

/**
 * Escapa un texto para meterlo en HTML. TODO lo que viene del usuario pasa
 * por aqui: si el codigo dice "<b>", en la pagina debe verse "<b>", no negritas.
 */
function esc (texto) {
  return String(texto === undefined || texto === null ? '' : texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * JSON listo para ir dentro de <script>. Se cambian < > & por su codigo
 * <... para que un "</script>" escrito en el codigo no cierre el bloque.
 * JSON.parse los vuelve a convertir solo.
 */
function jsonParaHTML (objeto) {
  return JSON.stringify(objeto)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}

/** Fecha y hora en formato dd/mm/aaaa hh:mm:ss. */
function fechaHora (fecha) {
  const dos = (n) => String(n).padStart(2, '0');
  return `${dos(fecha.getDate())}/${dos(fecha.getMonth() + 1)}/${fecha.getFullYear()} ` +
         `${dos(fecha.getHours())}:${dos(fecha.getMinutes())}:${dos(fecha.getSeconds())}`;
}

/** "1 token", "7 tokens". */
function cuantos (n, singular, plural) {
  return `${n} ${n === 1 ? singular : plural}`;
}

/** Lista de errores con su linea y columna. */
function listaErrores (errores) {
  if (!errores || errores.length === 0) return '';
  const filas = errores.map((e) =>
    `<li><span class="sitio">L${e.linea}:C${e.columna}</span> ${esc(e.mensaje)}` +
    (e.sugerencia ? ` <span class="sugerencia">→ ${esc(e.sugerencia)}</span>` : '') +
    '</li>').join('');
  return `<ul class="errores">${filas}</ul>`;
}

// ====================================================================
// Las partes de la pagina
// ====================================================================

function encabezado (opciones, pestana) {
  const logo = (clave) => {
    const datos = INSTITUCIONES[clave];
    const imagen = (opciones.logos || {})[clave];
    return imagen
      ? `<img class="logo" src="${esc(imagen)}" alt="${esc(datos.nombre)}" title="${esc(datos.nombre)}">`
      : `<span class="logo logo-respaldo" title="${esc(datos.nombre)}">${esc(datos.siglas)}</span>`;
  };

  return `
<header class="encabezado">
  <div class="logos">${logo('uat')}</div>
  <div class="titulo">
    <p>${esc(MATERIA.nombre)}</p>
    <h1>Reporte del análisis</h1>
    <p>Equipo ${esc(NOMBRE_EQUIPO)} · Grupo ${esc(MATERIA.grado)}° ${esc(MATERIA.grupo)}</p>
  </div>
  <div class="logos">${logo('uamm')}${logo('isc')}</div>
</header>
<p class="pestana-origen">Guardado desde la pestaña <b>${esc(PESTANAS[pestana])}</b></p>`;
}

function ficha (opciones, fecha, resultado) {
  const nombres = nombresCompletos().map((n) => `<li>${esc(n)}</li>`).join('');
  const lex = resultado.lexico;
  const sin = resultado.sintactico;
  const sem = resultado.semantico;

  const tarjeta = (titulo, valor, detalle, bien) =>
    `<div class="tarjeta ${bien ? 'bien' : 'mal'}"><span>${esc(titulo)}</span>` +
    `<b>${esc(valor)}</b><small>${esc(detalle)}</small></div>`;

  const tarjetas = [
    tarjeta('Análisis léxico',
      cuantos(lex.tabla.length, 'token', 'tokens'),
      lex.errores.length === 0 ? 'sin errores' : cuantos(lex.errores.length, 'error', 'errores'),
      lex.errores.length === 0),
    tarjeta('Análisis sintáctico',
      !sin || sin.errores.length > 0 ? 'con errores'
        : (sin.arbol ? cuantos(sin.estadisticas.nodos, 'nodo', 'nodos') : 'sin árbol'),
      !sin || sin.errores.length === 0 ? 'sin errores' : cuantos(sin.errores.length, 'error', 'errores'),
      !!sin && sin.errores.length === 0 && !!sin.arbol),
    tarjeta('Análisis semántico',
      sem && sem.correcto ? cuantos(sem.reglas.length, 'regla', 'reglas') : 'sin gramática',
      sem && sem.correcto ? 'gramática generada del código'
        : 'el código tiene errores',
      !!sem && sem.correcto)
  ].join('');

  return `
<section class="ficha">
  <dl>
    <dt>Programa</dt><dd>${esc(opciones.nombrePrograma || 'programa')}</dd>
    <dt>Equipo</dt><dd>${esc(NOMBRE_EQUIPO)}</dd>
    <dt>Integrantes</dt><dd><ol class="integrantes">${nombres}</ol></dd>
    <dt>Materia</dt><dd>${esc(MATERIA.nombre)}</dd>
    <dt>Grado y grupo</dt><dd>${esc(MATERIA.grado)}° ${esc(MATERIA.grupo)}</dd>
    <dt>Carrera</dt><dd>${esc(MATERIA.carrera)}</dd>
    <dt>Institución</dt><dd>${esc(MATERIA.institucion)}</dd>
    <dt>Unidad</dt><dd>${esc(MATERIA.unidad)}</dd>
    <dt>Fecha y hora</dt><dd>${esc(fechaHora(fecha))}</dd>
  </dl>
  <div class="tarjetas">${tarjetas}</div>
</section>`;
}

function seccionCodigo (fuente) {
  const lineas = fuente.replace(/\s+$/, '').split(/\r?\n/);
  const filas = lineas.map((l, i) =>
    `<tr><td class="num">${i + 1}</td><td>${esc(l) || ' '}</td></tr>`).join('');
  return `
<section id="codigo" class="seccion">
  <h2><span>1</span> Código fuente</h2>
  <table class="codigo"><tbody>${filas}</tbody></table>
</section>`;
}

function seccionLexico (lex) {
  // La salida  a > b  ->  id1 > id2, con los colores de la aplicacion
  const salida = lex.lineas.map((l) => {
    const piezas = l.piezas.map((p) =>
      (p.espacioAntes ? ' ' : '') + `<span class="tk-${esc(p.categoria)}">${esc(p.texto)}</span>`
    ).join('');
    return `<div>${esc(l.sangria)}${piezas}</div>`;
  }).join('');

  const filas = lex.tabla.map((f) =>
    `<tr class="${f.categoria === 'error' ? 'fila-error' : ''}" ` +
    `title="Línea ${f.linea}, columna ${f.columna}">` +
    `<td class="lexema">${esc(f.lexema)}</td>` +
    `<td class="tk-${esc(f.categoria)}">${esc(f.token)}</td>` +
    `<td>${esc(f.descripcion)}</td></tr>`).join('');

  const ids = lex.identificadores.map((r) =>
    `<li><b class="tk-identificador">${esc(r.etiqueta)}</b> = ${esc(r.nombre)} ` +
    `<small>(${cuantos(r.veces, 'vez', 'veces')})</small></li>`).join('');

  const e = lex.estadisticas;
  return `
<section id="lexico" class="seccion">
  <h2><span>2</span> Análisis léxico</h2>
  ${listaErrores(lex.errores)}
  <h3>Salida del análisis</h3>
  <div class="caja salida">${salida || '<p class="vacio">No se reconoció ningún token.</p>'}</div>
  ${ids ? `<h3>Identificadores</h3><ul class="identificadores">${ids}</ul>` : ''}
  <h3>Tabla de tokens</h3>
  <table class="tabla">
    <thead><tr><th>Lexema</th><th>Token</th><th>Descripción</th></tr></thead>
    <tbody>${filas || '<tr><td colspan="3" class="vacio">Sin tokens.</td></tr>'}</tbody>
  </table>
  <p class="estadisticas">Tokens: ${e.totalTokens} · Líneas: ${e.totalLineas} ·
    Caracteres: ${e.totalCaracteres} · Comentarios: ${e.totalComentarios} ·
    Errores léxicos: ${e.totalErrores}</p>
</section>`;
}

/**
 * El arbol como listas anidadas. Las ramas las dibuja el CSS (ver .arbol en
 * ESTILOS): cada <li> es un nodo y su <ul> son sus hijos.
 */
function arbolHTML (nodo) {
  const hijos = nodo.hijos.length > 0
    ? `<ul>${nodo.hijos.map(arbolHTML).join('')}</ul>`
    : '';
  return `<li><span class="nodo ${esc(nodo.familia)}" ` +
         `title="${esc(nodo.tipoNodo)} — línea ${nodo.linea}, columna ${nodo.columna}">` +
         `${esc(nodo.etiqueta)}</span>${hijos}</li>`;
}

function seccionSintactico (sin) {
  let cuerpo;
  if (!sin || sin.modo === 'vacio') {
    cuerpo = '<p class="vacio">No hay código que analizar.</p>';
  } else if (sin.errores.length > 0 || !sin.arbol) {
    cuerpo = listaErrores(sin.errores) ||
      '<p class="vacio">No se pudo construir el árbol.</p>';
  } else {
    cuerpo = `
  <div class="arbol-caja"><ul class="arbol">${arbolHTML(sin.arbol)}</ul></div>
  <details>
    <summary>Ver el árbol en texto</summary>
    <pre class="caja">${esc(arbolATexto(sin.arbol).join('\n'))}</pre>
  </details>
  <p class="estadisticas">Nodos: ${sin.estadisticas.nodos} ·
    Profundidad: ${sin.estadisticas.profundidad} · Modo de análisis: ${esc(sin.modo)}</p>`;
  }

  return `
<section id="sintactico" class="seccion">
  <h2><span>3</span> Análisis sintáctico</h2>
  ${cuerpo}
</section>`;
}

/**
 * Una alternativa de la gramatica: cada simbolo con su clase, para que el
 * CSS subraye los terminales (como en el pizarron) y aclare la notacion.
 */
function alternativaHTML (a) {
  const simbolos = a.simbolos.map((s) => {
    const palabra = s.clase === 'terminal' && /^[A-Za-zÀ-ɏ]/.test(s.texto);
    return `<span class="${esc(s.clase)}${palabra ? ' palabra' : ''}">${esc(s.texto)}</span>`;
  }).join(' ');
  return `<span class="alternativa" title="En el código: ${esc(a.ejemplo)}">${simbolos}</span>`;
}

function seccionSemantico (sem) {
  let cuerpo;
  if (!sem || sem.vacio) {
    cuerpo = '<p class="vacio">No hay código que analizar.</p>';
  } else if (!sem.correcto) {
    cuerpo = `<div class="veredicto mal"><b>✕ No se pudo generar la gramática</b>
      <p>Primero hay que corregir los errores léxicos y sintácticos del código.</p></div>`;
  } else {
    const filas = sem.reglas.map((r) =>
      `<tr><td class="regla" title="${esc(r.descripcion)}">${esc(r.regla)}</td>` +
      '<td class="flecha">→</td>' +
      `<td>${r.alternativas.map(alternativaHTML).join('<span class="meta"> | </span>')}</td></tr>`
    ).join('');

    cuerpo = `
  <p class="estadisticas">Gramática generada del código dado:
    ${cuantos(sem.reglas.length, 'regla', 'reglas')},
    ${cuantos(sem.totalAlternativas, 'producción', 'producciones')}.
    Los terminales (lo que se escribe tal cual) van <u>subrayados</u> o en negritas.</p>
  <table class="gramatica"><tbody>${filas}</tbody></table>`;
  }

  return `
<section id="semantico" class="seccion">
  <h2><span>4</span> Análisis semántico: la gramática del código</h2>
  ${cuerpo}
</section>`;
}

// ====================================================================
// La pagina completa
// ====================================================================

/**
 * @param {object} resultado Resultado de Compilador.compilar().
 * @param {object} [opciones]
 * @param {string} [opciones.nombrePrograma] Nombre del archivo que se guarda.
 * @param {Date}   [opciones.fecha]          Fecha del reporte.
 * @param {string} [opciones.pestana]        Pestaña desde la que se guardo.
 * @param {object} [opciones.logos]          { uat, uamm, isc } como data: URL.
 * @returns {string} El contenido completo del archivo .html
 */
function construirReporteHTML (resultado, opciones = {}) {
  const fecha = opciones.fecha || new Date();
  const pestana = PESTANAS[opciones.pestana] ? opciones.pestana : 'lexico';
  const fuente = resultado.fuente || '';

  const datos = {
    formato: FORMATO,
    version: VERSION_FORMATO,
    pestana,
    programa: opciones.nombrePrograma || 'programa',
    fecha: fecha.toISOString(),
    codigo: fuente
  };

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="generator" content="Compilador ${esc(NOMBRE_EQUIPO)}">
<title>${esc(datos.programa)} — Reporte del Compilador ${esc(NOMBRE_EQUIPO)}</title>
<style>${ESTILOS}</style>
<!-- Datos para volver a abrir este reporte en el compilador. No se muestran. -->
<script type="application/json" id="${ID_DATOS}">${jsonParaHTML(datos)}</script>
</head>
<body>
<div class="hoja">
${encabezado(opciones, pestana)}
${ficha(opciones, fecha, resultado)}
<nav class="indice">
  <a href="#codigo">1 · Código fuente</a>
  <a href="#lexico">2 · Análisis léxico</a>
  <a href="#sintactico">3 · Análisis sintáctico</a>
  <a href="#semantico">4 · Análisis semántico (gramática)</a>
</nav>
${seccionCodigo(fuente)}
${seccionLexico(resultado.lexico)}
${seccionSintactico(resultado.sintactico)}
${seccionSemantico(resultado.semantico)}
<footer class="pie">
  <b>¿Quieres volver a trabajar con este código?</b>
  Ábrelo en el Compilador ${esc(NOMBRE_EQUIPO)} con <kbd>Archivo → Abrir</kbd> (<kbd>Ctrl+O</kbd>)
  o arrastra este archivo a la ventana. Se recupera el código y la pestaña en la que estabas.
</footer>
</div>
</body>
</html>
`;
}

// ====================================================================
// Volver a abrir un reporte
// ====================================================================

/** true si el texto parece una pagina web. */
function pareceHTML (texto) {
  return /^\s*(<!doctype\s+html|<html)/i.test(String(texto || ''));
}

/**
 * Lee el bloque de datos de un reporte HTML.
 * @returns {{codigo:string, pestana:string, programa:string, fecha:string}|null}
 *          null si el texto no es un reporte de este compilador.
 */
function extraerDatosHTML (texto) {
  const patron = new RegExp(
    `<script[^>]*id=["']${ID_DATOS}["'][^>]*>([\\s\\S]*?)</script>`, 'i');
  const encontrado = patron.exec(String(texto || ''));
  if (!encontrado) return null;

  let datos;
  try {
    datos = JSON.parse(encontrado[1]);
  } catch (e) {
    return null;
  }
  if (!datos || datos.formato !== FORMATO || typeof datos.codigo !== 'string') return null;

  return {
    codigo: datos.codigo,
    pestana: PESTANAS[datos.pestana] ? datos.pestana : null,
    programa: String(datos.programa || ''),
    fecha: String(datos.fecha || '')
  };
}

// ====================================================================
// Los estilos de la pagina: la misma paleta que la aplicacion
// ====================================================================

const ESTILOS = `
:root {
  --fondo: #eef1f6; --panel: #ffffff; --caja: #f7f9fc;
  --borde: #d3dae6; --borde-fuerte: #b9c4d4;
  --texto: #1e2733; --texto-2: #5a6a7e; --texto-3: #8b9aae;
  --azul: #1f4e9c; --azul-claro: #e7effb;
  --verde: #17794f; --verde-claro: #e4f4ec;
  --rojo: #c0392b; --rojo-claro: #fdeceb;
  --morado: #5b3fbf;
  --mono: 'Cascadia Mono', Consolas, 'Courier New', monospace;
  --sans: 'Segoe UI', system-ui, -apple-system, sans-serif;
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--fondo); color: var(--texto); font: 14px/1.5 var(--sans); }
.hoja { max-width: 1060px; margin: 24px auto; background: var(--panel); border: 1px solid var(--borde);
  border-radius: 12px; padding: 0 0 8px; box-shadow: 0 8px 28px rgba(20, 30, 45, .08); }

.encabezado { display: flex; align-items: center; justify-content: space-between; gap: 20px;
  padding: 18px 28px; border-bottom: 1px solid var(--borde); }
.logos { display: flex; gap: 14px; align-items: center; }
.logo { max-height: 62px; max-width: 220px; object-fit: contain; }
.logo-respaldo { font: bold 18px Georgia, serif; color: var(--texto-3); padding: 0 8px; }
.titulo { text-align: center; }
.titulo h1 { margin: 2px 0; font-size: 24px; color: var(--azul); }
.titulo p { margin: 0; font-size: 12.5px; color: var(--texto-2); }
.pestana-origen { margin: 0; padding: 8px 28px; background: var(--azul-claro); color: var(--azul); font-size: 12.5px; }

.ficha { display: grid; grid-template-columns: 1fr 300px; gap: 24px; padding: 22px 28px; }
.ficha dl { display: grid; grid-template-columns: 120px 1fr; gap: 6px 14px; margin: 0; }
.ficha dt { color: var(--texto-2); font-size: 12.5px; }
.ficha dd { margin: 0; font-weight: 600; }
.integrantes { margin: 0; padding-left: 20px; font-weight: 500; }
.tarjetas { display: flex; flex-direction: column; gap: 10px; }
.tarjeta { border: 1px solid var(--borde); border-left-width: 5px; border-radius: 8px; padding: 9px 14px;
  display: grid; grid-template-columns: 1fr auto; align-items: baseline; }
.tarjeta span { font-size: 12.5px; color: var(--texto-2); }
.tarjeta b { font-size: 15px; text-align: right; }
.tarjeta small { grid-column: 1 / 3; color: var(--texto-2); }
.tarjeta.bien { border-left-color: var(--verde); }
.tarjeta.mal { border-left-color: var(--rojo); }

.indice { display: flex; flex-wrap: wrap; gap: 8px; padding: 0 28px 6px; }
.indice a { font-size: 12.5px; color: var(--azul); text-decoration: none; padding: 4px 12px;
  border: 1px solid var(--borde); border-radius: 999px; }
.indice a:hover { background: var(--azul-claro); border-color: var(--azul); }

.seccion { padding: 18px 28px 6px; border-top: 1px solid var(--borde); margin-top: 14px; }
.seccion h2 { display: flex; align-items: center; gap: 10px; margin: 0 0 12px; font-size: 18px; }
.seccion h2 span { display: inline-grid; place-items: center; width: 28px; height: 28px; border-radius: 50%;
  background: var(--azul); color: #fff; font-size: 14px; }
.seccion h3 { font-size: 13px; text-transform: uppercase; letter-spacing: .8px; color: var(--texto-2); margin: 18px 0 8px; }

.caja, .codigo { background: var(--caja); border: 1px solid var(--borde-fuerte); border-radius: 8px;
  font: 13.5px/1.6 var(--mono); padding: 10px 14px; white-space: pre-wrap; word-break: break-word; margin: 0; }
.codigo { border-collapse: separate; width: 100%; padding: 8px 0; }
.codigo td { padding: 0 14px; white-space: pre-wrap; vertical-align: top; }
.codigo td.num { width: 1%; color: var(--texto-3); text-align: right; user-select: none; border-right: 1px solid var(--borde); }
.vacio { color: var(--texto-3); font-style: italic; }

.tabla { width: 100%; border-collapse: collapse; font-size: 13px; }
.tabla th { text-align: left; font-weight: 600; color: var(--texto-2); background: var(--caja);
  border-bottom: 2px solid var(--borde-fuerte); padding: 7px 10px; }
.tabla td { border-bottom: 1px solid var(--borde); padding: 6px 10px; vertical-align: top; }
.tabla tbody tr:nth-child(even) td { background: #fbfcfe; }
.tabla .num { text-align: right; width: 1%; color: var(--texto-2); font-family: var(--mono); }
.tabla .lexema { font-family: var(--mono); font-weight: 600; white-space: pre; }
.fila-error td { background: var(--rojo-claro) !important; color: var(--rojo); }

.tk-logico { color: #0b5ed7; font-weight: 700; }
.tk-relacional { color: #d12a2a; font-weight: 700; }
.tk-aritmetico { color: #000; font-weight: 700; }
.tk-numero { color: #8a5b12; }
.tk-identificador { color: var(--morado); }
.tk-texto { color: var(--verde); }
.tk-reservada { color: var(--texto); font-weight: 600; }
.tk-normal { color: var(--texto-2); }
.tk-error { color: var(--rojo); font-weight: 700; }

.identificadores { display: flex; flex-wrap: wrap; gap: 6px 22px; padding: 0; margin: 0; list-style: none;
  font-family: var(--mono); font-size: 13px; }
.identificadores small { color: var(--texto-3); font-family: var(--sans); }
.estadisticas { color: var(--texto-2); font-size: 12px; margin: 10px 0 4px; }

.errores { list-style: none; padding: 0; margin: 6px 0; color: var(--rojo); }
.errores li { padding: 3px 0; }
.errores .sitio { font-family: var(--mono); font-size: 12px; color: var(--texto-2); margin-right: 6px; }
.errores .sugerencia { color: var(--texto-2); }

/* --- El arbol: listas anidadas con ramas dibujadas por el CSS --- */
.arbol-caja { overflow-x: auto; background: var(--caja); border: 1px solid var(--borde-fuerte);
  border-radius: 8px; padding: 18px 10px; }
.arbol, .arbol ul { list-style: none; margin: 0; padding: 0; display: flex; justify-content: center; }
.arbol { width: max-content; min-width: 100%; }
.arbol ul { padding-top: 20px; position: relative; }
.arbol li { position: relative; padding: 20px 5px 0; display: flex; flex-direction: column; align-items: center; }
.arbol > li { padding-top: 0; }
/* Las dos mitades de la barra horizontal y la bajada hacia cada hijo */
.arbol li::before, .arbol li::after { content: ''; position: absolute; top: 0; right: 50%; width: 50%;
  height: 20px; border-top: 1.6px solid var(--borde-fuerte); }
.arbol li::after { right: auto; left: 50%; border-left: 1.6px solid var(--borde-fuerte); }
.arbol li:only-child::before, .arbol li:only-child::after, .arbol > li::before, .arbol > li::after { display: none; }
.arbol li:only-child { padding-top: 0; }
.arbol li:first-child::before, .arbol li:last-child::after { border: 0 none; }
.arbol li:last-child::before { border-right: 1.6px solid var(--borde-fuerte); border-radius: 0 6px 0 0; }
.arbol li:first-child::after { border-radius: 6px 0 0 0; }
/* La bajada desde el padre hasta la barra */
.arbol ul::before { content: ''; position: absolute; top: 0; left: 50%; height: 20px;
  border-left: 1.6px solid var(--borde-fuerte); }
.nodo { display: inline-block; padding: 5px 11px; border: 1.5px solid; border-radius: 6px;
  font: 600 13px var(--mono); white-space: nowrap; position: relative; z-index: 1; }
.nodo.logico { background: #e3edfd; border-color: #0b5ed7; color: #0b5ed7; }
.nodo.relacional { background: #fdeaea; border-color: #d12a2a; color: #c0392b; }
.nodo.aritmetico { background: #ececec; border-color: #000; color: #000; }
.nodo.identificador { background: #f1ecff; border-color: #5b3fbf; color: #4b32a3; }
.nodo.literal { background: #fdf3e0; border-color: #b7791f; color: #8a5b12; }
.nodo.control { background: #e4f4ec; border-color: #17794f; color: #10593a; }
.nodo.llamada { background: #fdeff5; border-color: #b03a6e; color: #8e2e58; }
.nodo.estructura { background: #eef1f6; border-color: #7b8a9e; color: #44536a; }
.nodo.operador { background: #e7effb; border-color: #1f4e9c; color: #1f4e9c; }
details { margin-top: 10px; }
summary { cursor: pointer; color: var(--azul); font-size: 13px; }
details pre { margin-top: 8px; white-space: pre; overflow-x: auto; }

/* --- Analisis semantico: la gramatica generada --- */
.veredicto { border-radius: 8px; padding: 12px 16px; border: 1px solid; }
.veredicto p { margin: 4px 0 0; }
.veredicto.mal { background: var(--rojo-claro); border-color: var(--rojo); color: var(--rojo); }
.gramatica { border-collapse: collapse; font: 14px/1.7 var(--mono); }
.gramatica td { padding: 3px 8px; vertical-align: top; }
.gramatica .regla { font-weight: 700; color: var(--azul); white-space: nowrap; text-align: right; }
.gramatica .flecha { color: var(--texto-3); padding: 3px 2px; }
.gramatica .alternativa { white-space: nowrap; }
.gramatica .terminal { font-weight: 700; }
.gramatica .terminal.palabra { text-decoration: underline; text-underline-offset: 3px; }
.gramatica .no-terminal { color: var(--morado); }
.gramatica .meta { color: var(--texto-3); }
.gramatica .rango { color: #8a5b12; }

.pie { margin: 22px 28px 14px; padding: 12px 16px; border-radius: 8px; background: var(--azul-claro);
  color: var(--azul); font-size: 13px; }
kbd { font-family: var(--mono); font-size: 12px; background: #fff; border: 1px solid var(--borde-fuerte);
  border-radius: 4px; padding: 0 5px; }

@media (max-width: 760px) {
  .ficha { grid-template-columns: 1fr; }
  .encabezado { flex-direction: column; }
}
@media print {
  body { background: #fff; }
  .hoja { margin: 0; border: 0; box-shadow: none; max-width: none; }
  .indice, .pie { display: none; }
  .seccion { break-inside: avoid-page; }
  .arbol-caja { overflow: visible; }
}
`;

module.exports = {
  construirReporteHTML,
  extraerDatosHTML,
  pareceHTML,
  PESTANAS
};
