/**
 * AnalizadorSemantico.js
 * FASE 3 del compilador: el analisis semantico (pestaña 3).
 *
 * Las tres fases, con el mismo ejemplo:
 *
 *   entero x = "hola";
 *
 *   1. Lexico:      separa las palabras    entero | x | = | "hola" | ;    bien
 *   2. Sintactico:  revisa la forma        tipo id = valor ;               bien
 *   3. Semantico:   revisa el sentido      un texto no cabe en un entero   ERROR
 *
 * Esta fase solo trabaja con programas de SwordByte. Como en Java, todo el
 * codigo va dentro de una clase:
 *
 *   clase ejemplo {
 *       clasePrincipal { ... }
 *   }
 *
 * Las expresiones sueltas (a = b + c) sirven para practicar la forma en la
 * pestaña 2, pero aqui son un error: falta la clase.
 *
 * Hace dos cosas:
 *   1. VerificadorSemantico.js: revisa los nombres y los tipos, con la tabla
 *      de simbolos que comparten las tres fases (comun/TablaSimbolos.js).
 *   2. GeneradorGramatica.js:   la gramatica que produce el codigo.
 *
 * El resultado trae un "estado":
 *   'vacio'            no hay codigo
 *   'sin-clase'        es una expresion suelta: falta la clase (viene en "errores")
 *   'errores-previos'  hay errores lexicos o sintacticos: se corrigen primero
 *                      (vienen en "errores")
 *   'analizado'        se reviso: "errores" y "advertencias" son semanticos
 */

const { ErrorCompilacion, FASES } = require('../comun/ErrorCompilacion');
const { TablaSimbolos } = require('../comun/TablaSimbolos');
const { verificar } = require('./VerificadorSemantico');
const { generarGramatica, claseDeCaracter, reglaATexto } = require('./GeneradorGramatica');

/**
 * Donde empieza un arbol: el nodo con la menor linea y columna. Sirve para
 * marcar el error de "falta la clase" donde empieza el codigo.
 */
function inicioDe (nodo) {
  let primero = { linea: nodo.linea, columna: nodo.columna };
  Object.keys(nodo).forEach((clave) => {
    const valor = nodo[clave];
    const hijos = Array.isArray(valor) ? valor : [valor];
    hijos.forEach((h) => {
      if (!h || typeof h !== 'object' || typeof h.tipo !== 'string') return;
      const otro = inicioDe(h);
      const antes = otro.linea < primero.linea ||
        (otro.linea === primero.linea && otro.columna < primero.columna);
      if (antes) primero = otro;
    });
  });
  return primero;
}

/**
 * @param {object} sintactico      { ast, modo, errores } del analizador sintactico.
 * @param {Array}  erroresLexicos
 * @param {TablaSimbolos} [tabla]  La tabla de simbolos que lleno el lexico.
 * @returns {object} { estado, vacio, correcto, modo, errores, advertencias,
 *                     reglas, totalAlternativas }
 */
function analizarSemantico (sintactico, erroresLexicos, tabla = new TablaSimbolos()) {
  const modo = sintactico ? sintactico.modo : 'vacio';
  const previos = (erroresLexicos || []).concat(sintactico ? sintactico.errores : []);

  const resultado = {
    estado: 'analizado',
    vacio: false,
    correcto: false,
    modo,
    errores: [],
    advertencias: [],
    reglas: [],
    totalAlternativas: 0
  };

  // 1. Sin codigo no hay nada que revisar.
  const sinArbol = !sintactico || modo === 'vacio' || !sintactico.ast;
  if (sinArbol && previos.length === 0) {
    resultado.estado = 'vacio';
    resultado.vacio = true;
    return resultado;
  }

  // 2. Una expresion suelta no es un programa: falta la clase.
  if (modo === 'expresion') {
    const donde = sintactico.ast ? inicioDe(sintactico.ast) : { linea: 1, columna: 1 };
    resultado.estado = 'sin-clase';
    resultado.errores = [new ErrorCompilacion(
      FASES.SEMANTICA,
      'Falta la clase: todo el código va dentro de una clase.',
      donde.linea, donde.columna,
      {
        esperado: 'clase',
        sugerencia: 'Escríbelo así:  clase ejemplo { clasePrincipal { ... } }. ' +
          'Las expresiones sueltas se practican en la pestaña 2.'
      }
    ).toJSON()];
    return resultado;
  }

  // 3. Con errores lexicos o sintacticos (entre ellos, el de las
  //    instrucciones sin clase), primero hay que corregirlos.
  if (sinArbol || previos.length > 0) {
    resultado.estado = 'errores-previos';
    resultado.errores = previos;
    return resultado;
  }

  // 4. El analisis: los nombres y los tipos, y la gramatica.
  const revision = verificar(sintactico.ast, tabla);
  const gramatica = generarGramatica(sintactico.ast);

  resultado.errores = revision.errores.map((e) => e.toJSON());
  resultado.advertencias = revision.advertencias.map((e) => e.toJSON());
  resultado.correcto = resultado.errores.length === 0;
  resultado.reglas = gramatica.reglas;
  resultado.totalAlternativas = gramatica.totalAlternativas;
  return resultado;
}

module.exports = { analizarSemantico, claseDeCaracter, reglaATexto };
