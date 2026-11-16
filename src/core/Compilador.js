/**
 * Compilador.js
 * Une las fases del compilador SwordByte en una sola llamada.
 *
 *   const { compilar } = require('./src/core/Compilador');
 *   const resultado = compilar('a > b');
 *
 * El proyecto tiene tres analizadores, uno por pestaña de la aplicacion:
 *   1. Analisis lexico      -> 01.lexico/AnalizadorLexico.js
 *   2. Analisis sintactico  -> 02.sintactico/AnalizadorSintactico.js
 *   3. Analisis semantico   -> 03.semantico/AnalizadorSemantico.js
 *
 * Los tres trabajan sobre el mismo lenguaje (SwordByte) y con las mismas
 * reglas. Como en Java, el codigo va dentro de una clase:
 *   clase nombre { clasePrincipal { ... } }
 * La unica excepcion son las expresiones sueltas (a = b + c), que el lexico
 * y el sintactico aceptan para practicar; el semantico no.
 *
 * Las tres fases comparten dos piezas de comun/, como en el esquema clasico
 * de un compilador:
 *   - la TABLA DE SIMBOLOS (TablaSimbolos.js): el lexico anota cada
 *     identificador, el sintactico usa sus etiquetas (id1, id2) en el arbol
 *     y el semantico completa cada nombre con su tipo y su ambito;
 *   - el MANEJO DE ERRORES (ErrorCompilacion.js): todas reportan sus errores
 *     con el mismo formato, y aqui se juntan.
 */

const { analizarLexico } = require('./01.lexico/AnalizadorLexico');
const { formatearSalidaLexica } = require('./01.lexico/FormatoLexico');
const { construirTablaLexica } = require('./01.lexico/TablaLexica');
const { analizarSintactico } = require('./02.sintactico/AnalizadorSintactico');
const { aArbolCompacto } = require('./02.sintactico/NodosAST');
const { analizarSemantico } = require('./03.semantico/AnalizadorSemantico');
const { generarJava } = require('./04.codigo/GeneradorJava');
const { TiposToken } = require('./comun/TiposToken');
const { TablaSimbolos } = require('./comun/TablaSimbolos');

/**
 * Compila un programa fuente.
 *
 * @param {string} fuente Codigo en lenguaje SwordByte.
 * @param {object} [opciones]
 * @param {string}  [opciones.modo='auto']      'auto' | 'programa' | 'expresion' | 'instrucciones'
 * @param {boolean} [opciones.soloLexico=false] true para detenerse en la fase 1.
 * @returns {object} Resultado con los tres analisis y la lista de errores
 *                   (lexicos y sintacticos) del lenguaje SwordByte.
 */
function compilar (fuente, opciones = {}) {
  const inicio = Date.now();

  // La tabla de simbolos de este codigo: la usan las tres fases.
  const tabla = new TablaSimbolos();

  // ---------- FASE 1: analisis lexico ----------
  const t0 = Date.now();
  const lex = analizarLexico(fuente);
  const formato = formatearSalidaLexica(lex.tokens, tabla);

  const resultado = {
    ok: false,
    fuente,
    lexico: {
      errores: lex.errores.map((e) => e.toJSON()),
      estadisticas: lex.estadisticas,
      // Salida del curso:  a > b  ->  id1 > id2
      salida: formato.texto,
      lineas: formato.lineas,
      // Tabla Lexema | Token | Descripcion de la pestaña "Analizador Lexico"
      tabla: construirTablaLexica(lex.tokens, lex.errores, formato.mapa),
      // Los identificadores de la tabla de simbolos. Despues del semantico
      // cada uno trae tambien sus declaraciones (tipo y ambito).
      identificadores: formato.identificadores,
      mapaIdentificadores: formato.mapa,
      tiempoMs: Date.now() - t0
    },
    sintactico: null,
    semantico: null,
    // Codigo Java generado (fase 4). Se llena al final, solo si el programa
    // paso las tres fases sin errores.
    java: { ok: false, codigo: '', nombreClase: null, error: 'Todavía no se ha generado el código Java.' },
    errores: [],
    tiempoMs: 0
  };
  resultado.errores = resultado.lexico.errores.slice();

  if (opciones.soloLexico) {
    resultado.ok = resultado.errores.length === 0;
    resultado.tiempoMs = Date.now() - inicio;
    return resultado;
  }

  // ---------- FASE 2: analisis sintactico ----------
  // Los tokens de tipo ERROR se excluyen para no encadenar fallas falsas.
  const t1 = Date.now();
  const limpios = lex.tokens.filter((t) => t.tipo !== TiposToken.ERROR);
  const sin = analizarSintactico(limpios, opciones.modo || 'auto');

  resultado.sintactico = {
    ast: sin.ast,
    // Arbol para dibujar, con los identificadores ya como id1, id2...
    arbol: aArbolCompacto(sin.ast, formato.mapa),
    modo: sin.modo,
    errores: sin.errores.map((e) => e.toJSON()),
    estadisticas: sin.estadisticas,
    tiempoMs: Date.now() - t1
  };
  resultado.errores = resultado.errores.concat(resultado.sintactico.errores);

  // ---------- FASE 3: analisis semantico ----------
  // Usa el arbol del sintactico. Si hubo errores lexicos o sintacticos no
  // revisa nada y los repite, para que la pestaña 3 diga por que. Sus propios
  // errores van en resultado.semantico, no en resultado.errores.
  const t2 = Date.now();
  resultado.semantico = analizarSemantico(
    { ast: sin.ast, modo: sin.modo, errores: resultado.sintactico.errores },
    resultado.lexico.errores,
    tabla
  );
  resultado.semantico.tiempoMs = Date.now() - t2;

  // ---------- FASE 4: generacion de codigo Java ----------
  // Solo se traduce un programa completo y correcto. Las expresiones sueltas
  // y los codigos con errores se quedan con el aviso de por que no hay Java.
  resultado.java = generarCodigoJava(resultado);

  resultado.ok = resultado.errores.length === 0;
  resultado.tiempoMs = Date.now() - inicio;
  return resultado;
}

/**
 * Traduce el AST a Java cuando el programa es valido.
 * @param {object} resultado Resultado parcial de compilar().
 * @returns {{ok:boolean, codigo:string, nombreClase:string|null, error:string|null}}
 */
function generarCodigoJava (resultado) {
  const ast = resultado.sintactico ? resultado.sintactico.ast : null;
  const sem = resultado.semantico;

  const nombreClase = ast && ast.tipo === 'Programa' && ast.nombre !== '?'
    ? ast.nombre
    : null;

  if (!ast || ast.tipo !== 'Programa' || !nombreClase) {
    return {
      ok: false,
      codigo: '',
      nombreClase,
      error: 'Solo se genera Java para un programa completo: clase nombre { clasePrincipal { ... } }.'
    };
  }

  if (resultado.errores.length > 0 || !sem || !sem.correcto) {
    return {
      ok: false,
      codigo: '',
      nombreClase,
      error: 'El programa tiene errores: corrígelos antes de generar el código Java.'
    };
  }

  try {
    return {
      ok: true,
      codigo: generarJava(ast),
      nombreClase,
      error: null
    };
  } catch (e) {
    return {
      ok: false,
      codigo: '',
      nombreClase,
      error: `No se pudo generar el código Java: ${e.message}`
    };
  }
}

/**
 * Los errores de un resultado, hasta la fase de una pestaña. Cada pestaña
 * muestra los de su analisis y los de las fases que van antes:
 *   'lexico'      solo los lexicos            (pestaña 1)
 *   'sintactico'  lexicos y sintacticos       (pestaña 2)
 *   'semantico'   los de las tres fases       (pestaña 3)
 *
 * @param {object} r       Resultado de compilar().
 * @returns {Array} [{ fase, mensaje, linea, columna, sugerencia, ... }]
 */
function erroresDe (r, pestana) {
  let errores = r.lexico.errores;
  if ((pestana === 'sintactico' || pestana === 'semantico') && r.sintactico) {
    errores = errores.concat(r.sintactico.errores);
  }
  // Con errores previos, el semantico solo repite los de arriba.
  if (pestana === 'semantico' && r.semantico && r.semantico.estado !== 'errores-previos') {
    errores = errores.concat(r.semantico.errores);
  }
  return errores;
}

/** Los errores que se subrayan en rojo mientras se escribe (ver erroresDe). */
function erroresParaMarcar (fuente, pestana) {
  return erroresDe(compilar(fuente, { soloLexico: pestana === 'lexico' }), pestana);
}

module.exports = { compilar, erroresDe, erroresParaMarcar };
