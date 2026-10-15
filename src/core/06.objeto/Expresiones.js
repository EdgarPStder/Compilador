/**
 * Expresiones.js
 * Las EXPRESIONES de la fase 6: lo que se arma al juntar varias
 * instrucciones de tres direcciones en una sola expresion de Java.
 *
 *   t1 = c * d                    a = b + c * d
 *   t2 = b + t1          ->
 *   a = t2
 *
 * Cada expresion es un objeto con su clase (k) y su tipo de SwordByte (t):
 *
 *   { k: 'lit',  v: '5' }                       un valor escrito tal cual
 *   { k: 'var',  n: 'a' }                       una variable o un temporal
 *   { k: 'bin',  op: '+', a, b }                a + b   (tambien && y ||)
 *   { k: 'un',   op: '-', a }                   -a  o  !a
 *   { k: 'idx',  arr: 'datos', i }              datos[i]
 *   { k: 'conv', tipo: 'entero', a }            convertir(a, entero)
 *   { k: 'call', f: 'sumar', args: [...] }      una llamada
 *   { k: 'leer', tipo: 'entero' }               lo que se escribe con el teclado
 *   { k: 'nuevo', tipo: 'entero[]', n }         new int[n]
 *   { k: 'post', op: '++', n: 'x' }             x++  (vale x y luego le suma 1)
 *
 * Aqui tambien esta lo que hace falta para decidir si un temporal se puede
 * meter dentro de otra expresion sin cambiar lo que hace el programa (ver
 * efectos): Java calcula de izquierda a derecha, y llamar a una funcion,
 * leer del teclado o dividir entre cero no pueden cambiar de lugar.
 */

const { promover, tipoDeLiteral, esEnteroT, elementoDe, NATIVAS, NATIVAS_PURAS, esGeometrica } = require('./TiposJava');

const RELACIONALES = ['<', '>', '<=', '>='];
const COMPARACIONES = ['==', '!=', '<', '>', '<=', '>='];

const Ex = {
  lit: (v) => ({ k: 'lit', v }),
  var: (n) => ({ k: 'var', n }),
  bin: (op, a, b) => ({ k: 'bin', op, a, b }),
  un: (op, a) => ({ k: 'un', op, a }),
  idx: (arr, i) => ({ k: 'idx', arr, i }),
  conv: (tipo, a) => ({ k: 'conv', tipo, a }),
  call: (f, args) => ({ k: 'call', f, args }),
  leer: (tipo) => ({ k: 'leer', tipo }),
  nuevo: (tipo, n) => ({ k: 'nuevo', tipo, n })
};

/** Un valor del codigo intermedio (un nombre o un valor fijo) como expresion. */
function direccion (x, esLiteral) {
  return esLiteral(x) ? Ex.lit(x) : Ex.var(x);
}

// ====================================================================
// Tipos
// ====================================================================

/**
 * El tipo de una expresion (y lo deja anotado en e.t).
 * @param {Function} tipoDe   nombre -> tipo de SwordByte
 * @param {Function} retorno  funcion -> lo que devuelve
 */
function tipar (e, tipoDe, retorno) {
  const t = (x) => tipar(x, tipoDe, retorno);
  switch (e.k) {
    case 'lit': e.t = tipoDeLiteral(e.v); break;
    case 'var': e.t = tipoDe(e.n); break;
    case 'bin': {
      const a = t(e.a);
      const b = t(e.b);
      if (COMPARACIONES.indexOf(e.op) !== -1 || e.op === '&&' || e.op === '||') e.t = 'logico';
      else if (e.op === '+' && (a === 'cadena' || b === 'cadena')) e.t = 'cadena';
      else e.t = promover(a, b);
      break;
    }
    case 'un': {
      const a = t(e.a);
      e.t = e.op === '!' ? 'logico' : promover(a, 'entero');
      break;
    }
    case 'idx': t(e.i); e.t = elementoDe(tipoDe(e.arr)); break;
    case 'conv': t(e.a); e.t = e.tipo; break;
    case 'call': e.args.forEach(t); e.t = retorno(e.f); break;
    case 'leer': e.t = e.tipo; break;
    case 'nuevo': t(e.n); e.t = e.tipo; break;
    case 'post': e.t = tipoDe(e.n); break;
    default: e.t = null;
  }
  return e.t;
}

/** Lo que devuelve una funcion nativa de SwordByte (o null si no es nativa). */
function retornoNativo (f) {
  if (esGeometrica(f)) return 'decimal';
  return Object.prototype.hasOwnProperty.call(NATIVAS, f) ? NATIVAS[f] : null;
}

// ====================================================================
// Efectos: que lee, que cambia, si puede fallar
// ====================================================================

/**
 * Lo que hace una expresion al calcularse:
 *   lee       los nombres cuyo valor usa
 *   arreglos  los arreglos de los que lee un lugar
 *   efecto    si hace algo ademas de calcular (imprime, lee del teclado,
 *             da un numero al azar, llama a una funcion del programa)
 *   llama     si llama a una funcion del programa (puede cambiar un arreglo)
 *   lanza     si puede fallar (dividir entre cero, un lugar que no existe,
 *             convertir un texto que no es numero...)
 *
 * @param {Function} esDelPrograma  f -> true si f es una funcion del programa
 */
function efectos (e, esDelPrograma, info = nuevoInfo()) {
  const ver = (x) => efectos(x, esDelPrograma, info);
  switch (e.k) {
    case 'var': info.lee.add(e.n); break;
    case 'bin':
      ver(e.a);
      ver(e.b);
      if ((e.op === '/' || e.op === '%') && esEnteroT(e.t) && !divisorSeguro(e.b)) info.lanza = true;
      break;
    case 'un': ver(e.a); break;
    case 'idx':
      ver(e.i);
      info.lee.add(e.arr);
      info.arreglos.add(e.arr);
      info.lanza = true;
      break;
    case 'conv':
      ver(e.a);
      if (e.a.t === 'cadena' && e.tipo !== 'cadena') info.lanza = true;
      break;
    case 'call':
      e.args.forEach(ver);
      if (esDelPrograma(e.f)) {
        info.efecto = true;
        info.llama = true;
        info.lanza = true;
      } else if (NATIVAS_PURAS.indexOf(e.f) === -1 && e.f !== 'logaritmo' && e.f !== 'longitud' && !esGeometrica(e.f)) {
        info.efecto = true;
      }
      break;
    case 'leer': info.efecto = true; info.lanza = true; break;
    case 'nuevo': ver(e.n); info.lanza = true; break;
    case 'post': info.lee.add(e.n); info.escribe.add(e.n); info.efecto = true; break;
    default: break;
  }
  return info;
}

function nuevoInfo () {
  return { lee: new Set(), arreglos: new Set(), efecto: false, llama: false, lanza: false, escribe: new Set(), escribeArreglos: new Set() };
}

/** Un divisor entero que nunca es cero: un numero fijo distinto de 0. */
function divisorSeguro (b) {
  return b.k === 'lit' && /^-?\d+[lL]?$/.test(b.v) && !/^-?0+[lL]?$/.test(b.v);
}

/** Junta dos resumenes de efectos. */
function juntar (a, b) {
  const r = nuevoInfo();
  [a, b].forEach((x) => {
    x.lee.forEach((n) => r.lee.add(n));
    x.arreglos.forEach((n) => r.arreglos.add(n));
    x.escribe.forEach((n) => r.escribe.add(n));
    x.escribeArreglos.forEach((n) => r.escribeArreglos.add(n));
    r.efecto = r.efecto || x.efecto;
    r.llama = r.llama || x.llama;
    r.lanza = r.lanza || x.lanza;
  });
  return r;
}

/**
 * true si el calculo "e" (que hoy se hace ANTES) se puede hacer DESPUES de
 * "otro" sin que el programa cambie:
 *   - otro no cambia nada de lo que e lee;
 *   - si e lee lugares de un arreglo, otro no los cambia (ni llama a una
 *     funcion, que podria cambiarlos);
 *   - si e llama a una funcion, otro no lee lugares de arreglos;
 *   - no pueden hacer algo (o fallar) los dos: el orden importaria.
 */
function sePuedeMoverDespues (e, otro) {
  for (const n of otro.escribe) if (e.lee.has(n)) return false;
  for (const n of e.escribe) if (otro.lee.has(n) || otro.escribe.has(n)) return false;
  if (e.arreglos.size > 0) {
    if (otro.llama) return false;
    for (const n of otro.escribeArreglos) if (e.arreglos.has(n)) return false;
  }
  if (e.llama && otro.arreglos.size > 0) return false;
  if ((e.efecto || e.lanza) && (otro.efecto || otro.lanza)) return false;
  return true;
}

// ====================================================================
// Recorrer y cambiar
// ====================================================================

/** Las subexpresiones de una expresion, en el orden en que Java las calcula. */
function hijos (e) {
  switch (e.k) {
    case 'bin': return [e.a, e.b];
    case 'un': case 'conv': return [e.a];
    case 'idx': return [e.i];
    case 'call': return e.args;
    case 'nuevo': return [e.n];
    default: return [];
  }
}

/** Cuantas veces aparece el nombre n en la expresion. */
function cuentaUsos (e, n) {
  let k = ((e.k === 'var' || e.k === 'post') && e.n === n) ? 1 : 0;
  if (e.k === 'idx' && e.arr === n) k++;
  hijos(e).forEach((h) => { k += cuentaUsos(h, n); });
  return k;
}

/** Cambia la variable n por la expresion valor (devuelve la expresion nueva). */
function sustituir (e, n, valor) {
  if (e.k === 'var') return e.n === n ? valor : e;
  const s = (x) => sustituir(x, n, valor);
  switch (e.k) {
    case 'bin': return Object.assign({}, e, { a: s(e.a), b: s(e.b) });
    case 'un': return Object.assign({}, e, { a: s(e.a) });
    case 'conv': return Object.assign({}, e, { a: s(e.a) });
    case 'idx': return Object.assign({}, e, { i: s(e.i) });
    case 'call': return Object.assign({}, e, { args: e.args.map(s) });
    case 'nuevo': return Object.assign({}, e, { n: s(e.n) });
    default: return e;
  }
}

/**
 * Lo que Java calcula ANTES de llegar a la variable n dentro de e, y si n
 * esta en un lugar que a veces no se calcula (el lado derecho de && o ||).
 * @returns {{encontrada, antes: object (efectos), condicional}}
 */
function antesDe (e, n, esDelPrograma) {
  let antes = nuevoInfo();
  let condicional = false;
  const buscar = (x, enCondicional) => {
    if (x.k === 'var' && x.n === n) {
      condicional = enCondicional;
      return true;
    }
    const subs = hijos(x);
    for (let i = 0; i < subs.length; i++) {
      const enDerecha = x.k === 'bin' && (x.op === '&&' || x.op === '||') && i === 1;
      if (buscar(subs[i], enCondicional || enDerecha)) return true;
      antes = juntar(antes, efectos(subs[i], esDelPrograma));
    }
    return false;
  };
  const encontrada = buscar(e, false);
  return { encontrada, antes, condicional };
}

// ====================================================================
// Negar una condicion
// ====================================================================

const OPUESTO = { '==': '!=', '!=': '==', '<': '>=', '>=': '<', '>': '<=', '<=': '>' };

/**
 * La condicion contraria, lo mas sencilla posible:
 *   !(!x) -> x      a == b -> a != b      a < b -> a >= b (solo con enteros)
 * Con decimales  a < b  no se voltea:  NaN < 1  y  NaN >= 1  son los dos
 * falsos, asi que se escribe  !(a < b).
 */
function negar (c) {
  if (c.k === 'un' && c.op === '!') return c.a;
  if (c.k === 'lit' && (c.v === 'verdadero' || c.v === 'falso')) {
    return Object.assign(Ex.lit(c.v === 'verdadero' ? 'falso' : 'verdadero'), { t: 'logico' });
  }
  if (c.k === 'bin' && OPUESTO[c.op]) {
    const exacto = (t) => esEnteroT(t) || t === 'caracter';
    if (RELACIONALES.indexOf(c.op) === -1 || (exacto(c.a.t) && exacto(c.b.t))) {
      return Object.assign({}, c, { op: OPUESTO[c.op] });
    }
  }
  return Object.assign(Ex.un('!', c), { t: 'logico' });
}

/** true si dos expresiones son iguales (mismo arbol). */
function iguales (a, b) {
  return JSON.stringify(sinTipos(a)) === JSON.stringify(sinTipos(b));
}

function sinTipos (e) {
  const copia = Object.assign({}, e);
  delete copia.t;
  ['a', 'b', 'i', 'n'].forEach((c) => { if (copia[c] && typeof copia[c] === 'object') copia[c] = sinTipos(copia[c]); });
  if (copia.args) copia.args = copia.args.map(sinTipos);
  return copia;
}

module.exports = {
  Ex,
  direccion,
  tipar,
  retornoNativo,
  efectos,
  nuevoInfo,
  juntar,
  sePuedeMoverDespues,
  hijos,
  cuentaUsos,
  sustituir,
  antesDe,
  negar,
  iguales
};
