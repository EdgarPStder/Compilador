/**
 * Instrucciones.js
 * Las instrucciones del codigo intermedio (fase 4): CODIGO DE TRES
 * DIRECCIONES.
 *
 * Cada instruccion hace UNA sola cosa y usa a lo mas tres "direcciones": dos
 * valores y el lugar donde queda el resultado. Cada una se guarda como un
 * CUADRUPLO de cuatro campos:
 *
 *   ( operador, argumento 1, argumento 2, resultado )
 *
 *   t1 = c * d          ->   ( *, c, d, t1 )
 *
 * Estas son todas las formas que se usan:
 *
 *   Forma                        Ejemplo                    Cuadruplo
 *   ---------------------------  -------------------------  -----------------------------
 *   operacion de dos valores     t1 = a + b                 ( +, a, b, t1 )
 *   operacion de un valor        t1 = - a     t1 = NO a     ( menos, a, , t1 )  ( NO, a, , t1 )
 *   copia                        a = t1                     ( =, t1, , a )
 *   leer de un arreglo           t1 = datos[i]              ( =[], datos, i, t1 )
 *   escribir en un arreglo       datos[i] = t1              ( []=, t1, i, datos )
 *   reservar un arreglo          reservar datos, 3          ( reservar, 3, , datos )
 *   conversion de tipo           t1 = (entero) a            ( convertir, a, entero, t1 )
 *   etiqueta (a donde se salta)  L1:                        ( etiqueta, , , L1 )
 *   salto                        goto L1                    ( goto, , , L1 )
 *   salto si es verdadero        if t1 goto L1              ( if, t1, , L1 )
 *   salto si es falso            ifFalse t1 goto L1         ( ifFalse, t1, , L1 )
 *   salto si son iguales         if t1 == 2 goto L1         ( if==, t1, 2, L1 )
 *   parametro de una llamada     param a                    ( param, a, , )
 *   llamada                      t1 = call sumar, 2         ( call, sumar, 2, t1 )
 *   retorno                      return t1                  ( return, t1, , )
 *   leer del teclado             leer a                     ( leer, , , a )
 *   inicio y fin de funcion      funcion sumar(a, b)        ( funcion, sumar, a b, )
 *                                fin sumar                  ( fin, sumar, , )
 *   manejo de errores            intentar L1                ( intentar, , , L1 )
 *                                finIntentar                ( finIntentar, , , )
 *                                capturar e                 ( capturar, , , e )
 *
 * Cada funcion de aqui arma una instruccion: { op, arg1, arg2, resultado,
 * texto }, donde "texto" es como se escribe en el codigo de tres direcciones.
 */

/** Arma una instruccion. Los campos vacios quedan como '' (no null). */
function instruccion (op, arg1, arg2, resultado, texto) {
  return { op, arg1: arg1 || '', arg2: arg2 || '', resultado: resultado || '', texto };
}

const Instrucciones = {
  /** x = y op z   (op: + - * / % == != < > <=  >=) */
  operacion: (op, y, z, x) => instruccion(op, y, z, x, `${x} = ${y} ${op} ${z}`),

  /** x = - y   o   x = NO y */
  unaria: (op, y, x) => instruccion(op, y, '', x, op === 'menos' ? `${x} = - ${y}` : `${x} = ${op} ${y}`),

  /** x = y */
  copia: (y, x) => instruccion('=', y, '', x, `${x} = ${y}`),

  /** x = a[i] */
  leerArreglo: (a, i, x) => instruccion('=[]', a, i, x, `${x} = ${a}[${i}]`),

  /** a[i] = y */
  escribirArreglo: (y, a, i) => instruccion('[]=', y, i, a, `${a}[${i}] = ${y}`),

  /** reservar a, n   (lugar para n valores) */
  reservar: (a, n) => instruccion('reservar', n, '', a, `reservar ${a}, ${n}`),

  /** x = (tipo) y */
  convertir: (y, tipo, x) => instruccion('convertir', y, tipo, x, `${x} = (${tipo}) ${y}`),

  /** L: */
  etiqueta: (L) => instruccion('etiqueta', '', '', L, `${L}:`),

  /** goto L */
  salto: (L) => instruccion('goto', '', '', L, `goto ${L}`),

  /** if x goto L */
  siVerdadero: (x, L) => instruccion('if', x, '', L, `if ${x} goto ${L}`),

  /** ifFalse x goto L */
  siFalso: (x, L) => instruccion('ifFalse', x, '', L, `ifFalse ${x} goto ${L}`),

  /** if x == y goto L */
  siIgual: (x, y, L) => instruccion('if==', x, y, L, `if ${x} == ${y} goto ${L}`),

  /** param x */
  parametro: (x) => instruccion('param', x, '', '', `param ${x}`),

  /** x = call f, n   o, si no se guarda el resultado,   call f, n */
  llamada: (f, n, x) => instruccion('call', f, String(n), x,
    x ? `${x} = call ${f}, ${n}` : `call ${f}, ${n}`),

  /** return x   o   return */
  retorno: (x) => instruccion('return', x, '', '', x ? `return ${x}` : 'return'),

  /** leer x */
  leer: (x) => instruccion('leer', '', '', x, `leer ${x}`),

  /** funcion f(a, b) */
  funcion: (f, parametros) => instruccion('funcion', f, parametros.join(' '), '',
    `funcion ${f}(${parametros.join(', ')})`),

  /** fin f */
  fin: (f) => instruccion('fin', f, '', '', `fin ${f}`),

  /** intentar L   (si algo falla de aqui a finIntentar, se salta a L) */
  intentar: (L) => instruccion('intentar', '', '', L, `intentar ${L}`),

  /** finIntentar */
  finIntentar: () => instruccion('finIntentar', '', '', '', 'finIntentar'),

  /** capturar e   (e recibe el error) */
  capturar: (e) => instruccion('capturar', '', '', e, `capturar ${e}`)
};

/** Las operaciones de dos valores (las que se escriben  x = y op z). */
const OPERADORES = ['+', '-', '*', '/', '%', '==', '!=', '<', '>', '<=', '>='];

/**
 * Vuelve a armar una instruccion con sus campos (y su texto) despues de
 * cambiarle algo. La usa el optimizador (fase 5): si en  t1 = a + 1  se
 * cambia a por 5, el texto tambien debe decir  t1 = 5 + 1.
 *
 * @param {object} c { op, arg1, arg2, resultado }
 */
function rehacer (c) {
  const I = Instrucciones;
  if (OPERADORES.indexOf(c.op) !== -1) return I.operacion(c.op, c.arg1, c.arg2, c.resultado);
  switch (c.op) {
    case 'menos':
    case 'NO': return I.unaria(c.op, c.arg1, c.resultado);
    case '=': return I.copia(c.arg1, c.resultado);
    case '=[]': return I.leerArreglo(c.arg1, c.arg2, c.resultado);
    case '[]=': return I.escribirArreglo(c.arg1, c.resultado, c.arg2);
    case 'reservar': return I.reservar(c.resultado, c.arg1);
    case 'convertir': return I.convertir(c.arg1, c.arg2, c.resultado);
    case 'etiqueta': return I.etiqueta(c.resultado);
    case 'goto': return I.salto(c.resultado);
    case 'if': return I.siVerdadero(c.arg1, c.resultado);
    case 'ifFalse': return I.siFalso(c.arg1, c.resultado);
    case 'if==': return I.siIgual(c.arg1, c.arg2, c.resultado);
    case 'param': return I.parametro(c.arg1);
    case 'call': return I.llamada(c.arg1, c.arg2, c.resultado);
    case 'return': return I.retorno(c.arg1);
    case 'leer': return I.leer(c.resultado);
    case 'funcion': return I.funcion(c.arg1, c.arg2 ? c.arg2.split(' ') : []);
    case 'fin': return I.fin(c.arg1);
    case 'intentar': return I.intentar(c.resultado);
    case 'finIntentar': return I.finIntentar();
    case 'capturar': return I.capturar(c.resultado);
    default: throw new Error(`Instruccion desconocida: ${c.op}`);
  }
}

module.exports = { Instrucciones, OPERADORES, rehacer };
