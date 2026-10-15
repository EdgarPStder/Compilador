/**
 * Literales.js
 * Lo que el optimizador (fase 5) necesita saber de los VALORES FIJOS del
 * codigo intermedio, los que se escribieron tal cual: 20, 3.5, verdadero,
 * "hola"...
 *
 * La pregunta principal es: si los dos lados de una operacion son fijos,
 * ¿se puede calcular desde ahora? (eso es el "plegado de constantes")
 *
 *   t1 = 2 * 3          ->   t1 = 6
 *   t1 = 7 / 2          ->   t1 = 3            (entre enteros, como Java)
 *   t1 = 7.0 / 2        ->   t1 = 3.5
 *   t1 = 2 > 1          ->   t1 = verdadero
 *   t1 = "Ana" == "Ana" ->   t1 = verdadero
 *   t1 = "Hola " + "tú" ->   t1 = "Hola tú"
 *   t1 = "Total: " + 16 ->   t1 = "Total: 16"
 *   x = (decimal) 5     ->   x = 5.0
 *
 * Y cuando NO conviene, se deja como esta, para que el programa haga
 * exactamente lo mismo:
 *   - dividir entre cero: al ejecutarse lanza un Error, y eso debe seguir pasando;
 *   - un entero que se sale de su rango (Java le daria la vuelta);
 *   - numeros con sufijo (8.5f, 20L): su precision es otra;
 *   - numeros con un cero a la izquierda (010): en Java son octales.
 */

const ENTERO = /^-?(0|[1-9]\d*)$/;
const DECIMAL = /^-?\d+\.\d+$/;

/** Hasta donde llega un entero de Java (int). */
const MINIMO_ENTERO = -2147483648;
const MAXIMO_ENTERO = 2147483647;

const esEntero = (x) => ENTERO.test(x);
const esDecimal = (x) => DECIMAL.test(x);
const esNumero = (x) => esEntero(x) || esDecimal(x);
const esLogico = (x) => x === 'verdadero' || x === 'falso';
const esCadena = (x) => /^"/.test(x);
const esCaracter = (x) => /^'/.test(x);

/**
 * Cualquier valor escrito tal cual, tambien con sufijo (8.5f, 20L) o un
 * caracter ('A'). Un valor asi se puede copiar a donde se use.
 */
const esLiteral = (x) => /^-?\d/.test(x) || esLogico(x) || /^["']/.test(x);

/** verdadero o falso, segun la condicion. */
const logico = (condicion) => (condicion ? 'verdadero' : 'falso');

/** El contrario de un logico:  verdadero -> falso */
const opuesto = (x) => (x === 'verdadero' ? 'falso' : 'verdadero');

/**
 * El negativo de un numero escrito:  5 -> -5,   -5 -> 5,   0 -> 0.
 * null si el entero que sale ya no cabe en un entero.
 */
function negar (x) {
  if (esEntero(x)) {
    const r = -Number(x);
    return r <= MAXIMO_ENTERO ? String(r) : null;   // String(-0) es "0"
  }
  return x.startsWith('-') ? x.slice(1) : '-' + x;
}

/**
 * Un decimal escrito como lo escribiria Java:  3 -> 3.0,  3.5 -> 3.5.
 * Si no se puede escribir como un numero normal (infinito, 1e+21), null.
 */
function comoDecimal (r) {
  if (!isFinite(r)) return null;
  const texto = Number.isInteger(r) ? r.toFixed(1) : String(r);
  return /e/i.test(texto) ? null : texto;
}

/**
 * El resultado de  a op b  si los dos son valores fijos, o null si no se
 * puede (o no conviene) calcular desde ahora.
 */
function calcular (op, a, b) {
  // --- Dos numeros ---
  if (esNumero(a) && esNumero(b)) {
    const x = Number(a);
    const y = Number(b);
    const enteros = esEntero(a) && esEntero(b);

    switch (op) {
      case '==': return logico(x === y);
      case '!=': return logico(x !== y);
      case '<': return logico(x < y);
      case '>': return logico(x > y);
      case '<=': return logico(x <= y);
      case '>=': return logico(x >= y);
      default: break;
    }

    let r;
    switch (op) {
      case '+': r = x + y; break;
      case '-': r = x - y; break;
      case '*': r = x * y; break;
      case '/':
        if (y === 0) return null;                       // lanza un Error al ejecutarse
        r = enteros ? Math.trunc(x / y) : x / y;        // entre enteros se quitan los decimales
        break;
      case '%':
        if (y === 0) return null;
        r = x % y;
        break;
      default: return null;
    }

    if (enteros) {
      const cabe = Number.isSafeInteger(r) && r >= MINIMO_ENTERO && r <= MAXIMO_ENTERO;
      return cabe ? String(r) : null;
    }
    return comoDecimal(r);
  }

  // --- Dos logicos: solo se comparan ---
  if (esLogico(a) && esLogico(b) && (op === '==' || op === '!=')) {
    return logico((a === b) === (op === '=='));
  }

  // --- Dos textos o dos caracteres: son iguales si se escriben igual ---
  // (la fase 4 los escribe siempre de la misma forma:  “Ana” y "Ana" quedan "Ana")
  if ((op === '==' || op === '!=') && ((esCadena(a) && esCadena(b)) || (esCaracter(a) && esCaracter(b)))) {
    return logico((a === b) === (op === '=='));
  }

  // --- Dos textos: se juntan ---
  if (op === '+' && esCadena(a) && esCadena(b)) return a.slice(0, -1) + b.slice(1);

  // --- Un texto y un entero: el entero se escribe tal cual ---
  //   "Total: " + 16  ->  "Total: 16"
  // (un decimal no: Java escribe algunos distinto, como 1.0E10)
  if (op === '+' && esCadena(a) && esEntero(b)) return a.slice(0, -1) + b + '"';
  if (op === '+' && esEntero(a) && esCadena(b)) return '"' + a + b.slice(1);

  return null;
}

/**
 * El valor de  (tipo) x  si x es un valor fijo, o null. Se calculan las
 * conversiones a decimal y a entero, de un numero o de un texto que es un
 * numero (como convertir("12", entero)):
 *   (decimal) 5     ->  5.0        (decimal) "2.5"  ->  2.5
 *   (entero) 1.75   ->  1          (entero) "12"    ->  12
 * Las que fallarian al ejecutarse ("hola", un numero que no cabe) se dejan:
 * ese Error debe seguir pasando.
 */
function convertirFijo (x, tipo) {
  let n = null;
  if (esNumero(x)) {
    n = Number(x);
  } else if (esCadena(x) && x.indexOf('\\') === -1) {
    const texto = x.slice(1, -1).trim();
    if (tipo === 'entero' && /^[-+]?\d+$/.test(texto)) n = Number(texto);
    if (tipo === 'decimal' && /^[-+]?(\d+(\.\d*)?|\.\d+)$/.test(texto)) n = Number(texto);
  }
  if (n === null) return null;
  if (tipo === 'decimal') return comoDecimal(n);
  if (tipo === 'entero') {
    const r = Math.trunc(n);   // como (int) en Java: se quitan los decimales
    return r >= MINIMO_ENTERO && r <= MAXIMO_ENTERO ? String(r + 0) : null;
  }
  return null;
}

module.exports = { esEntero, esDecimal, esNumero, esLogico, esLiteral, opuesto, negar, calcular, convertirFijo };
