/**
 * Sentencias.js
 * Paso 1 de la fase 6: cada funcion del codigo de tres direcciones (ya
 * optimizado) se "baja" a una lista de SENTENCIAS con expresiones:
 *
 *   Codigo de tres direcciones        Sentencias
 *   --------------------------        ----------------------------------
 *   t1 = c * d                        asignar  t1 = (c * d)
 *   param a                           (se junta con su call)
 *   param t1
 *   t2 = call sumar, 2                asignar  t2 = sumar(a, t1)
 *   ifFalse t2 goto L1                siSalta  !t2 -> L1
 *   L1:                               etiqueta L1
 *
 * Todavia hay etiquetas y saltos: el paso 2 (Estructurador.js) los cambia
 * por if, while, do-while y for.
 *
 * Aqui tambien se calcula el TIPO de cada temporal: el codigo intermedio no
 * lo dice, pero sale de su operacion (t1 = a > b es logico; t2 = x * 1.5
 * es decimal). El de las variables lo dejo anotado la fase 4.
 */

const { Ex, direccion, tipar, retornoNativo } = require('./Expresiones');
const { tipoDeLiteral, esLiteral, promover, elementoDe } = require('./TiposJava');
const { OPERADORES } = require('../04.intermedio/Instrucciones');

const COMPARACIONES = ['==', '!=', '<', '>', '<=', '>='];

/** El nombre al que una instruccion le da valor, o null. */
function nombreDefinido (ins) {
  if (OPERADORES.indexOf(ins.op) !== -1) return ins.resultado;
  if (['=', 'menos', 'NO', 'convertir', '=[]', 'leer', 'reservar', 'capturar'].indexOf(ins.op) !== -1) return ins.resultado;
  if (ins.op === 'call' && ins.resultado) return ins.resultado;
  return null;
}

/**
 * Parte el codigo intermedio en sus funciones (de "funcion f(...)" a "fin f").
 * @returns {Array} [{ nombre, parametros: [nombre], instrucciones: [...] }]
 */
function funcionesDe (instrucciones) {
  const lista = [];
  let actual = null;
  instrucciones.forEach((ins) => {
    if (ins.op === 'funcion') {
      actual = { nombre: ins.arg1, parametros: ins.arg2 ? ins.arg2.split(' ') : [], instrucciones: [], linea: ins.linea };
    } else if (ins.op === 'fin') {
      lista.push(actual);
      actual = null;
    } else if (actual) {
      actual.instrucciones.push(ins);
    }
  });
  return lista;
}

/**
 * El tipo de cada nombre de una funcion: el de las variables viene de la
 * fase 4; el de los temporales sale de la instruccion que les da valor.
 * Se repite hasta que ya no cambia nada, porque un temporal puede copiar a
 * otro que aparece despues (t2 = t1).
 *
 * @param {Array}  instrucciones  Las de la funcion.
 * @param {object} variables      { nombre: tipo } de la fase 4.
 * @param {Function} retorno      funcion -> lo que devuelve
 * @returns {Map} nombre -> tipo
 */
function inferirTipos (instrucciones, variables, retorno) {
  const tipos = new Map(Object.entries(variables));
  const deVariable = new Set(tipos.keys());
  const tipo = (x) => (esLiteral(x) ? tipoDeLiteral(x) : tipos.get(x));

  const deInstruccion = (ins, k) => {
    if (OPERADORES.indexOf(ins.op) !== -1) {
      const a = tipo(ins.arg1);
      const b = tipo(ins.arg2);
      if (COMPARACIONES.indexOf(ins.op) !== -1) return 'logico';
      if (!a || !b) return null;
      if (ins.op === '+' && (a === 'cadena' || b === 'cadena')) return 'cadena';
      return promover(a, b);
    }
    switch (ins.op) {
      case '=': return tipo(ins.arg1) || null;
      case 'menos': return tipo(ins.arg1) ? promover(tipo(ins.arg1), 'entero') : null;
      case 'NO': return 'logico';
      case 'convertir': return ins.arg2;
      case '=[]': return tipo(ins.arg1) ? elementoDe(tipo(ins.arg1)) : null;
      case 'call': return retorno(ins.arg1);
      case 'leer': {
        // leer t1  seguido de  datos[i] = t1: el tipo de los lugares de datos
        const uso = instrucciones.slice(k + 1).find((x) => x.op === '[]=' && x.arg1 === ins.resultado);
        return uso && tipo(uso.resultado) ? elementoDe(tipo(uso.resultado)) : null;
      }
      default: return null;
    }
  };

  for (let vuelta = 0, cambio = true; cambio && vuelta < 50; vuelta++) {
    cambio = false;
    instrucciones.forEach((ins, k) => {
      const n = nombreDefinido(ins);
      if (!n || deVariable.has(n) || tipos.has(n)) return;
      const t = deInstruccion(ins, k);
      if (t) {
        tipos.set(n, t);
        cambio = true;
      }
    });
  }
  return tipos;
}

/**
 * Baja las instrucciones de una funcion a sentencias.
 *
 * Cada sentencia lleva "t" (que es) y "linea" (de que renglon del programa
 * SwordByte sale):
 *   { t: 'etiqueta', nombre }
 *   { t: 'salto', destino }                 goto
 *   { t: 'siSalta', cond, destino }         if / ifFalse / if== (cond ya negada en ifFalse)
 *   { t: 'retornar', valor }
 *   { t: 'intentar', manejador }   { t: 'finIntentar' }   { t: 'capturar', variable }
 *   { t: 'asignar', nombre, valor }
 *   { t: 'guardar', arreglo, indice, valor }
 *   { t: 'llamar', llamada }
 *
 * @param {Function} tipoDe   nombre -> tipo
 * @param {Function} retorno  funcion -> lo que devuelve
 */
function bajar (instrucciones, tipoDe, retorno) {
  const d = (x) => direccion(x, esLiteral);
  const tipada = (e) => {
    tipar(e, tipoDe, retorno);
    return e;
  };
  const lista = [];
  const parametros = [];
  const poner = (s, ins) => lista.push(Object.assign(s, { linea: ins.linea }));

  instrucciones.forEach((ins) => {
    if (OPERADORES.indexOf(ins.op) !== -1) {
      poner({ t: 'asignar', nombre: ins.resultado, valor: tipada(Ex.bin(ins.op, d(ins.arg1), d(ins.arg2))) }, ins);
      return;
    }
    switch (ins.op) {
      case 'menos': poner({ t: 'asignar', nombre: ins.resultado, valor: tipada(Ex.un('-', d(ins.arg1))) }, ins); break;
      case 'NO': poner({ t: 'asignar', nombre: ins.resultado, valor: tipada(Ex.un('!', d(ins.arg1))) }, ins); break;
      case '=': poner({ t: 'asignar', nombre: ins.resultado, valor: tipada(d(ins.arg1)) }, ins); break;
      case '=[]': poner({ t: 'asignar', nombre: ins.resultado, valor: tipada(Ex.idx(ins.arg1, d(ins.arg2))) }, ins); break;
      case '[]=':
        poner({ t: 'guardar', arreglo: ins.resultado, indice: tipada(d(ins.arg2)), valor: tipada(d(ins.arg1)) }, ins);
        break;
      case 'reservar':
        poner({ t: 'asignar', nombre: ins.resultado, valor: tipada(Ex.nuevo(tipoDe(ins.resultado), d(ins.arg1))) }, ins);
        break;
      case 'convertir': poner({ t: 'asignar', nombre: ins.resultado, valor: tipada(Ex.conv(ins.arg2, d(ins.arg1))) }, ins); break;
      case 'leer': poner({ t: 'asignar', nombre: ins.resultado, valor: tipada(Ex.leer(tipoDe(ins.resultado))) }, ins); break;
      case 'param': parametros.push(d(ins.arg1)); break;
      case 'call': {
        const n = Number(ins.arg2);
        const llamada = tipada(Ex.call(ins.arg1, parametros.splice(parametros.length - n, n)));
        if (ins.resultado) poner({ t: 'asignar', nombre: ins.resultado, valor: llamada }, ins);
        else poner({ t: 'llamar', llamada }, ins);
        break;
      }
      // La etiqueta donde empieza el porDefecto de un opcion lo dice en su
      // comentario (la fase 4 lo pone ahi): sirve para escribir el default.
      // (y la de un hacer, que es un do-while: sirve para escribirlo asi)
      case 'etiqueta':
        poner({
          t: 'etiqueta',
          nombre: ins.resultado,
          porDefecto: (ins.comentarios || []).indexOf('porDefecto:') !== -1,
          hacer: (ins.comentarios || []).indexOf('hacer') !== -1
        }, ins);
        break;
      case 'goto': poner({ t: 'salto', destino: ins.resultado }, ins); break;
      case 'if': poner({ t: 'siSalta', cond: tipada(d(ins.arg1)), destino: ins.resultado }, ins); break;
      case 'ifFalse': poner({ t: 'siSalta', cond: tipada(Ex.un('!', d(ins.arg1))), destino: ins.resultado }, ins); break;
      case 'if==': poner({ t: 'siSalta', cond: tipada(Ex.bin('==', d(ins.arg1), d(ins.arg2))), destino: ins.resultado }, ins); break;
      case 'return': poner({ t: 'retornar', valor: ins.arg1 ? tipada(d(ins.arg1)) : null }, ins); break;
      case 'intentar': poner({ t: 'intentar', manejador: ins.resultado }, ins); break;
      case 'finIntentar': poner({ t: 'finIntentar' }, ins); break;
      case 'capturar': poner({ t: 'capturar', variable: ins.resultado }, ins); break;
      default: throw new Error(`Instruccion desconocida en la fase 6: ${ins.op}`);
    }
  });
  return lista;
}

module.exports = { funcionesDe, inferirTipos, bajar, nombreDefinido, retornoNativo };
