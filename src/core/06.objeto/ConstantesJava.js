/**
 * ConstantesJava.js
 * Las EXPRESIONES CONSTANTES de Java: las que solo tienen valores escritos
 * tal cual (2 == (int) 1.25,  'a' < 'b',  2147483647 + 1 > 0).
 *
 * Java las calcula al compilar y las usa para decidir que codigo se puede
 * alcanzar. Por eso importan en la condicion de un ciclo:
 *
 *   while (2 == (int) 1.25) { ... }    -> error: "unreachable statement"
 *                                         (la condicion siempre es falsa)
 *
 * La fase 5 calcula casi todas, pero no todas (no calcula un entero que se
 * desborda, ni las conversiones a entero). Aqui se calculan con las reglas
 * de Java (un int que se pasa da la vuelta, (int) 1.25 es 1...) para que la
 * fase 6 quite un ciclo que nunca se repite, o sepa que uno nunca termina.
 */

const { tipoDeLiteral } = require('./TiposJava');

/** Un valor constante: { t: 'int' | 'long' | 'float' | 'double' | 'char' | 'boolean', v } */
const N = (t, v) => ({ t, v });

const ENTEROS = ['int', 'long', 'char'];

function literal (x) {
  switch (tipoDeLiteral(x)) {
    case 'entero': return N('int', BigInt.asIntN(32, BigInt(x)));
    case 'largo': return N('long', BigInt.asIntN(64, BigInt(x.slice(0, -1))));
    case 'decimal': return N('double', Number(x.replace(/[dD]$/, '')));
    case 'flotante': return N('float', Math.fround(Number(x.slice(0, -1))));
    case 'logico': return N('boolean', x === 'verdadero');
    case 'caracter': {
      const c = x.slice(1, -1);
      const escapes = { '\\n': 10, '\\t': 9, '\\r': 13, '\\0': 0, "\\'": 39, '\\"': 34, '\\\\': 92 };
      return N('char', c.length === 1 ? c.charCodeAt(0) : (escapes[c] !== undefined ? escapes[c] : c.charCodeAt(c.length - 1)));
    }
    default: return null;   // los textos no cuentan: se comparan con equals
  }
}

/** El tipo de una operacion entre dos numeros (promocion numerica de Java). */
function promocion (a, b) {
  if (a.t === 'double' || b.t === 'double') return 'double';
  if (a.t === 'float' || b.t === 'float') return 'float';
  if (a.t === 'long' || b.t === 'long') return 'long';
  return 'int';
}

/** Un valor numerico pasado a otro tipo numerico, como en Java. */
function aTipo (a, t) {
  const comoNumero = ENTEROS.indexOf(a.t) !== -1 ? Number(a.v) : a.v;
  switch (t) {
    case 'double': return N('double', comoNumero);
    case 'float': return N('float', Math.fround(comoNumero));
    case 'long':
    case 'int': {
      const bits = t === 'long' ? 64 : 32;
      if (ENTEROS.indexOf(a.t) !== -1) return N(t, BigInt.asIntN(bits, BigInt(a.v)));
      // Un decimal a entero: se quitan los decimales; NaN es 0 y lo que no cabe se queda en el limite
      if (Number.isNaN(a.v)) return N(t, 0n);
      const max = (1n << BigInt(bits - 1)) - 1n;
      const min = -(1n << BigInt(bits - 1));
      if (a.v === Infinity || a.v >= Number(max)) return N(t, max);
      if (a.v === -Infinity || a.v <= Number(min)) return N(t, min);
      return N(t, BigInt(Math.trunc(a.v)));
    }
    default: return null;
  }
}

function esNumerica (a) { return a && a.t !== 'boolean'; }

/** El valor de una expresion constante de Java, o null si no es constante. */
function constante (e) {
  switch (e.k) {
    case 'lit': return literal(e.v);
    case 'un': {
      const a = constante(e.a);
      if (!a) return null;
      if (e.op === '!') return a.t === 'boolean' ? N('boolean', !a.v) : null;
      if (!esNumerica(a)) return null;
      const t = promocion(a, N('int', 0n));
      const x = aTipo(a, t);
      if (t === 'int' || t === 'long') return N(t, BigInt.asIntN(t === 'int' ? 32 : 64, -x.v));
      return N(t, t === 'float' ? Math.fround(-x.v) : -x.v);
    }
    case 'conv': {
      const a = constante(e.a);
      if (!esNumerica(a)) return null;
      switch (e.tipo) {
        case 'entero': return aTipo(a, 'int');
        case 'largo': return aTipo(a, 'long');
        case 'decimal': return aTipo(a, 'double');
        case 'flotante': return aTipo(a, 'float');
        case 'corto': return N('int', BigInt.asIntN(16, aTipo(a, 'int').v));
        case 'byte': return N('int', BigInt.asIntN(8, aTipo(a, 'int').v));
        case 'caracter': return N('char', Number(BigInt.asUintN(16, aTipo(a, 'int').v)));
        default: return null;
      }
    }
    case 'bin': return binaria(e);
    default: return null;
  }
}

function binaria (e) {
  const a = constante(e.a);
  const b = constante(e.b);
  if (!a || !b) return null;

  if (e.op === '&&' || e.op === '||') {
    if (a.t !== 'boolean' || b.t !== 'boolean') return null;
    return N('boolean', e.op === '&&' ? a.v && b.v : a.v || b.v);
  }
  if ((e.op === '==' || e.op === '!=') && a.t === 'boolean' && b.t === 'boolean') {
    return N('boolean', (a.v === b.v) === (e.op === '=='));
  }
  if (!esNumerica(a) || !esNumerica(b)) return null;

  const t = promocion(a, b);
  const x = aTipo(a, t).v;
  const y = aTipo(b, t).v;
  const entero = t === 'int' || t === 'long';
  const bits = t === 'int' ? 32 : 64;
  const ajustar = (v) => (entero ? N(t, BigInt.asIntN(bits, v)) : N(t, t === 'float' ? Math.fround(v) : v));

  switch (e.op) {
    case '==': return N('boolean', x === y);
    case '!=': return N('boolean', x !== y);
    case '<': return N('boolean', x < y);
    case '>': return N('boolean', x > y);
    case '<=': return N('boolean', x <= y);
    case '>=': return N('boolean', x >= y);
    case '+': return ajustar(x + y);
    case '-': return ajustar(x - y);
    case '*': return ajustar(x * y);
    case '/':
      if (entero && y === 0n) return null;   // Java no la calcula: lanzaria un error
      return ajustar(x / y);
    case '%':
      if (entero && y === 0n) return null;
      return ajustar(x % y);
    default: return null;
  }
}

/** true o false si la condicion es constante para Java; null si depende de algo que cambia. */
function condicionConstante (c) {
  const v = constante(c);
  return v && v.t === 'boolean' ? v.v : null;
}

module.exports = { condicionConstante, constante };
