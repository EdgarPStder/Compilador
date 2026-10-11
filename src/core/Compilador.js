/**
 * Compilador.js
 * Une las fases del compilador SwordByte en una sola llamada.
 *
 *   const { compilar } = require('./src/core/Compilador');
 *   const resultado = compilar('a > b');
 *
 * El proyecto tiene tres analizadores, uno por pestaña de la aplicacion:
 *   1. Analisis lexico      -> lexico/AnalizadorLexico.js
 *   2. Analisis sintactico  -> sintactico/AnalizadorSintactico.js
 *   3. Analisis semantico   -> semantico/AnalizadorSemantico.js
 *
 * Los tres trabajan sobre el mismo lenguaje (SwordByte) y con las mismas
 * reglas. El semantico toma el arbol que armo el sintactico y genera la
 * gramatica del codigo dado:  a1 = b5 / 20  ->  prop -> id = exp, ...
 */

const { analizarLexico } = require('./lexico/AnalizadorLexico');
const { formatearSalidaLexica } = require('./lexico/FormatoLexico');
const { construirTablaLexica } = require('./lexico/TablaLexica');
const { analizarSintactico } = require('./sintactico/AnalizadorSintactico');
const { aArbolCompacto } = require('./sintactico/NodosAST');
const { analizarSemantico } = require('./semantico/AnalizadorSemantico');
const { TiposToken } = require('./comun/TiposToken');

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

  // ---------- FASE 1: analisis lexico ----------
  const t0 = Date.now();
  const lex = analizarLexico(fuente);
  const formato = formatearSalidaLexica(lex.tokens);

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
      identificadores: formato.identificadores,
      mapaIdentificadores: formato.mapa,
      tiempoMs: Date.now() - t0
    },
    sintactico: null,
    semantico: null,
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

  // ---------- Analisis semantico: la gramatica del codigo ----------
  // Usa el arbol del sintactico. Si hubo errores, no genera nada y los
  // repite para que la pestaña 3 diga por que.
  const t2 = Date.now();
  resultado.semantico = analizarSemantico(
    { ast: sin.ast, modo: sin.modo, errores: resultado.sintactico.errores },
    resultado.lexico.errores
  );
  resultado.semantico.tiempoMs = Date.now() - t2;

  resultado.ok = resultado.errores.length === 0;
  resultado.tiempoMs = Date.now() - inicio;
  return resultado;
}

module.exports = { compilar };
