/**
 * Reporte.js
 * Arma el reporte en texto (.bs): encabezado, codigo fuente, analisis lexico,
 * analisis sintactico, analisis semantico, codigo intermedio, codigo
 * optimizado y codigo objeto (Java).
 *
 * Es la forma "clasica" de guardar. La que se ofrece primero es el reporte
 * visual en HTML (ver ReporteHTML.js); esta se conserva para quien quiera un
 * archivo de texto.
 *
 * El reporte se escribe de modo que SIGUE SIENDO un programa SwordByte valido:
 * todo lo que no es codigo va en comentarios de una linea. Asi el mismo archivo
 * sirve para entregar y para volver a abrirlo en el compilador.
 *
 * Al abrirlo, extraerCodigoFuente() recupera solo la parte del codigo usando
 * las marcas INICIO/FIN, para que guardar dos veces no anide reportes.
 */

const { MATERIA, NOMBRE_EQUIPO, AUTOR, nombresCompletos } = require('./comun/Equipo');
const { codigoIntermedioATexto } = require('./04.intermedio/GeneradorIntermedio');

const ANCHO = 74;
const MARCA_INICIO = '// >>>>> INICIO DEL CODIGO FUENTE';
const MARCA_FIN = '// <<<<< FIN DEL CODIGO FUENTE';

// ====================================================================
// Utilidades de formato
// ====================================================================

/** Línea de comentario con un carácter repetido: // ====== */
function regla (caracter = '=') {
  return '// ' + caracter.repeat(ANCHO);
}

/** Línea de comentario normal. */
function linea (texto = '') {
  return texto ? '//  ' + texto : '//';
}

/** Ancho reservado para la etiqueta más los puntos, antes del valor. */
const ANCHO_ETIQUETA = 18;

/** "Etiqueta .......... valor" alineado. */
function campo (etiqueta, valor) {
  const puntos = '.'.repeat(Math.max(2, ANCHO_ETIQUETA - etiqueta.length));
  return linea(`${etiqueta} ${puntos} ${valor}`);
}

/** Sangría para continuar un campo en la línea siguiente, bajo su valor. */
function sangriaCampo () {
  return ' '.repeat(ANCHO_ETIQUETA + 2);
}

/** Título de sección centrado entre reglas. */
function seccion (numero, titulo) {
  return [regla('-'), linea(`${numero}. ${titulo}`), regla('-'), ''];
}

/** Fecha y hora en formato dd/mm/aaaa hh:mm:ss. */
function fechaHora (fecha = new Date()) {
  const dos = (n) => String(n).padStart(2, '0');
  return `${dos(fecha.getDate())}/${dos(fecha.getMonth() + 1)}/${fecha.getFullYear()} ` +
         `${dos(fecha.getHours())}:${dos(fecha.getMinutes())}:${dos(fecha.getSeconds())}`;
}

// ====================================================================
// El arbol en texto
// ====================================================================

/**
 * Escribe el arbol sintactico como una lista con sangria.
 *
 *   OR
 *   ├── AND
 *   │   ├── >
 *   │   │   ├── id1
 *   │   │   └── num(9)
 *   │   └── >
 *   └── <=
 *
 * Se usa esta forma y no un dibujo con ramas porque cabe en el ancho de
 * cualquier archivo de texto, por grande que sea el programa.
 *
 * @param {object} raiz Arbol compacto ({ etiqueta, hijos }).
 * @returns {string[]} Una linea por nodo.
 */
function arbolATexto (raiz) {
  if (!raiz) return ['(no se construyó ningún árbol)'];

  const lineas = [];

  // sangria: lo que va antes de la rama de este nodo
  // esUltimo: true si es el ultimo hijo de su padre (cambia ├ por └)
  const escribir = (n, sangria, esUltimo, esRaiz) => {
    if (esRaiz) {
      lineas.push(n.etiqueta);
    } else {
      lineas.push(sangria + (esUltimo ? '└── ' : '├── ') + n.etiqueta);
    }

    // Los hijos se corren a la derecha. La linea vertical solo sigue hacia
    // abajo si a este nodo todavia le faltan hermanos.
    const sangriaHijos = esRaiz ? '' : sangria + (esUltimo ? '    ' : '│   ');

    n.hijos.forEach((hijo, i) =>
      escribir(hijo, sangriaHijos, i === n.hijos.length - 1, false));
  };

  escribir(raiz, '', true, true);
  return lineas;
}

// ====================================================================
// El analisis semantico en texto
// ====================================================================

/**
 * Escribe el analisis semantico: el veredicto con sus errores, las
 * advertencias y la gramatica del codigo. Si una regla
 * de la gramatica tiene varias alternativas, cada una va en su renglon,
 * alineada bajo la flecha:
 *
 *   prop  → id = exp ;
 *   exp   → id
 *         | num
 *         | exp / exp
 *
 * @param {object|null} sem resultado.semantico
 * @returns {string[]} Una linea por renglon (sin el "//" de comentario).
 */
function semanticoATexto (sem) {
  if (!sem) return ['No se ejecutó el análisis semántico.'];
  if (sem.estado === 'vacio') return ['No hay código que analizar.'];
  if (sem.estado === 'sin-clase') {
    return ['Falta la clase: el código va dentro de una clase:',
      '  clase ejemplo { clasePrincipal { ... } }'];
  }
  if (sem.estado === 'errores-previos') {
    return ['No se analizó: primero hay que corregir',
      'los errores léxicos y sintácticos del código.'];
  }

  const lineas = [];
  const fila = (e) => `  Línea ${e.linea}, columna ${e.columna}: ${e.mensaje}` +
    (e.sugerencia ? ` — ${e.sugerencia}` : '');

  // --- El veredicto ---
  if (sem.correcto) {
    lineas.push('Sin errores semánticos: el código tiene sentido.');
  } else {
    lineas.push(`Errores semánticos (${sem.errores.length}):`);
    sem.errores.forEach((e) => lineas.push(fila(e)));
  }
  if (sem.advertencias.length > 0) {
    lineas.push('', `Advertencias (${sem.advertencias.length}):`);
    sem.advertencias.forEach((e) => lineas.push(fila(e)));
  }

  // --- La gramatica ---
  lineas.push('', `Gramática del código (${sem.reglas.length} reglas):`, '');
  const ancho = Math.max(...sem.reglas.map((r) => r.regla.length));
  sem.reglas.forEach((r) => {
    r.alternativas.forEach((a, i) => {
      const izquierda = i === 0 ? r.regla.padEnd(ancho) + ' →' : ' '.repeat(ancho) + ' |';
      lineas.push(`${izquierda} ${a.texto}`);
    });
  });
  return lineas;
}

/**
 * El codigo intermedio en texto: el codigo de tres direcciones, con los
 * renglones del programa como comentarios.
 */
function intermedioATexto (ci) {
  if (!ci || ci.estado === 'vacio') return ['No hay código que traducir.'];
  if (ci.estado === 'errores-previos') {
    return ['No se generó: primero hay que corregir los errores del programa.'];
  }
  return [`${ci.instrucciones.length} instrucciones, ${ci.temporales} temporales y ` +
    `${ci.etiquetas} etiquetas:`, ''].concat(codigoIntermedioATexto(ci.instrucciones));
}

/**
 * El codigo optimizado en texto: de cuantas instrucciones a cuantas, las
 * optimizaciones que se usaron, el codigo que quedo y cada cambio.
 */
function optimizacionATexto (o) {
  if (!o || o.estado === 'vacio') return ['No hay código que optimizar.'];
  if (o.estado === 'errores-previos') {
    return ['No se optimizó: primero hay que corregir los errores del programa.'];
  }

  const lineas = [`De ${o.antes} instrucciones a ${o.instrucciones.length}, con ${o.temporales} ` +
    `temporales y ${o.etiquetas} etiquetas.`];
  lineas.push(o.porOptimizacion.length === 0
    ? 'No hubo nada que mejorar.'
    : 'Optimizaciones: ' + o.porOptimizacion.map((x) => `${x.nombre} (${x.veces})`).join(', ') + '.');
  lineas.push('', ...codigoIntermedioATexto(o.instrucciones));

  if (o.cambios.length > 0) {
    lineas.push('', `Cambios, en el orden en que se hicieron (${o.cambios.length}):`);
    o.cambios.forEach((c, k) =>
      lineas.push(`   ${k + 1}. ${c.nombre}:  ${c.antes}  ->  ${c.despues || '(se quita)'}`));
  }
  return lineas;
}

/** El codigo objeto en texto: el programa Java, renglon por renglon. */
function objetoATexto (o) {
  if (!o || o.estado === 'vacio') return ['No hay código que traducir.'];
  if (o.estado === 'errores-previos') {
    return ['No se generó: primero hay que corregir los errores del programa.'];
  }
  if (o.estado !== 'generado') return o.errores.map((e) => e.mensaje);
  return [`${o.archivo}: ${o.lineas.length} renglones de Java y ${o.metodos} método(s),`,
    `escritos a partir del código optimizado. Se compila con  javac -encoding UTF-8 ${o.archivo}`, '']
    .concat(o.lineas.map((l) => l.texto));
}

// ====================================================================
// Construccion del reporte
// ====================================================================

/**
 * @param {object} resultado Resultado de Compilador.compilar().
 * @param {object} [opciones]
 * @param {string} [opciones.nombrePrograma] Nombre del archivo que se guarda.
 * @param {Date}   [opciones.fecha]          Fecha del reporte.
 * @returns {string} El contenido completo del archivo.
 */
function construirReporte (resultado, opciones = {}) {
  const nombrePrograma = opciones.nombrePrograma || 'programa.bs';
  const fecha = opciones.fecha || new Date();
  const fuente = resultado.fuente || '';
  const lex = resultado.lexico;
  const sin = resultado.sintactico;
  const errores = resultado.errores || [];

  const L = [];

  // ---------------- Encabezado ----------------
  L.push(regla('='));
  L.push(linea('C O M P I L A D O R   S W O R D B Y T E'));
  L.push(linea('Reporte de las seis fases: del código SwordByte al código Java'));
  L.push(regla('='));
  L.push(campo('Programa', nombrePrograma));
  L.push(campo('Equipo', NOMBRE_EQUIPO));

  if (AUTOR) {
    L.push(campo('Autor', AUTOR));
  } else {
    const nombres = nombresCompletos();
    L.push(campo('Autores', nombres[0]));
    nombres.slice(1).forEach((n) => L.push(linea(sangriaCampo() + n)));
  }

  L.push(campo('Materia', MATERIA.nombre));
  L.push(campo('Grado y grupo', `${MATERIA.grado}° ${MATERIA.grupo}`));
  L.push(campo('Carrera', MATERIA.carrera));
  L.push(campo('Institución', MATERIA.institucion));
  L.push(campo('Unidad', MATERIA.unidad));
  L.push(campo('Fecha y hora', fechaHora(fecha)));
  L.push(campo('Resultado', errores.length === 0
    ? 'Análisis correcto, sin errores'
    : `${errores.length} error(es) encontrado(s)`));
  L.push(regla('='));
  L.push('');
  L.push('');

  // ---------------- 1. Código fuente ----------------
  L.push(...seccion(1, 'CÓDIGO FUENTE'));
  L.push(MARCA_INICIO);
  L.push(fuente.replace(/\s+$/, ''));
  L.push(MARCA_FIN);
  L.push('');
  L.push('');

  // ---------------- 2. Análisis léxico ----------------
  L.push(...seccion(2, 'ANÁLISIS LÉXICO'));
  if (lex) {
    if (lex.lineas.length === 0) {
      L.push(linea('(no se reconoció ningún token)'));
    } else {
      lex.lineas.forEach((l) => L.push(linea(l.texto)));
    }

    if (lex.identificadores.length > 0) {
      L.push(linea());
      L.push(linea(`Identificadores (${lex.identificadores.length}):`));
      lex.identificadores.forEach((r) =>
        L.push(linea(`   ${r.etiqueta} = ${r.nombre}   (aparece ${r.veces} ${r.veces === 1 ? 'vez' : 'veces'})`)));
    }

    const e = lex.estadisticas;
    L.push(linea());
    L.push(linea(`Tokens: ${e.totalTokens}   Líneas: ${e.totalLineas}   ` +
                 `Caracteres: ${e.totalCaracteres}   Comentarios: ${e.totalComentarios}`));
    L.push(linea(`Errores léxicos: ${e.totalErrores}   Tiempo: ${lex.tiempoMs} ms`));

    if (lex.errores.length > 0) {
      L.push(linea());
      L.push(linea('Errores léxicos:'));
      lex.errores.forEach((err) =>
        L.push(linea(`   Línea ${err.linea}, columna ${err.columna}: ${err.mensaje}`)));
    }
  }
  L.push('');
  L.push('');

  // ---------------- 3. Análisis sintáctico ----------------
  L.push(...seccion(3, 'ANÁLISIS SINTÁCTICO'));
  if (sin) {
    if (sin.errores.length > 0) {
      L.push(linea('Errores sintácticos:'));
      sin.errores.forEach((err) =>
        L.push(linea(`   Línea ${err.linea}, columna ${err.columna}: ${err.mensaje}`)));
      L.push(linea());
    }

    if (sin.arbol) {
      L.push(linea('Árbol sintáctico:'));
      L.push(linea());
      arbolATexto(sin.arbol).forEach((l) => L.push(linea(l)));
      L.push(linea());
    } else {
      L.push(linea('No se construyó el árbol.'));
      L.push(linea());
    }

    const e = sin.estadisticas;
    L.push(linea(`Nodos: ${e.nodos}   Profundidad: ${e.profundidad}   ` +
                 `Modo de análisis: ${sin.modo}`));
    L.push(linea(`Errores sintácticos: ${e.totalErrores}   Tiempo: ${sin.tiempoMs} ms`));
  } else {
    L.push(linea('No se ejecutó el análisis sintáctico.'));
  }
  L.push('');
  L.push('');

  // ---------------- 4. Análisis semántico ----------------
  L.push(...seccion(4, 'ANÁLISIS SEMÁNTICO'));
  L.push(...semanticoATexto(resultado.semantico).map((l) => linea(l)));
  L.push('');
  L.push('');

  // ---------------- 5. Código intermedio ----------------
  L.push(...seccion(5, 'CÓDIGO INTERMEDIO (TRES DIRECCIONES)'));
  L.push(...intermedioATexto(resultado.intermedio).map((l) => linea(l)));
  L.push('');
  L.push('');

  // ---------------- 6. Código optimizado ----------------
  L.push(...seccion(6, 'CÓDIGO INTERMEDIO OPTIMIZADO'));
  L.push(...optimizacionATexto(resultado.optimizacion).map((l) => linea(l)));
  L.push('');
  L.push('');

  // ---------------- 7. Código objeto ----------------
  L.push(...seccion(7, 'CÓDIGO OBJETO (JAVA)'));
  L.push(...objetoATexto(resultado.objeto).map((l) => linea(l)));

  L.push('');
  L.push(regla('='));
  L.push(linea('Fin del reporte'));
  L.push(regla('='));
  L.push('');

  return L.join('\r\n');
}

/**
 * Recupera solo el codigo fuente de un archivo guardado por la aplicacion.
 * Si el texto no trae las marcas del reporte, se devuelve tal cual: asi
 * funciona igual con un .bs escrito a mano.
 */
function extraerCodigoFuente (texto) {
  const contenido = String(texto || '');
  const inicio = contenido.indexOf(MARCA_INICIO);
  const fin = contenido.indexOf(MARCA_FIN);
  if (inicio === -1 || fin === -1 || fin < inicio) return contenido;

  return contenido
    .slice(inicio + MARCA_INICIO.length, fin)
    .replace(/^\r?\n/, '')
    .replace(/\s+$/, '');
}

module.exports = {
  construirReporte,
  extraerCodigoFuente,
  arbolATexto,
  semanticoATexto,
  intermedioATexto,
  optimizacionATexto,
  objetoATexto
};
