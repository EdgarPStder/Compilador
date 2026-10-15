/**
 * Optimizador.js
 * FASE 5 del compilador: la optimizacion del codigo intermedio (pestaña 5).
 *
 * Toma el codigo de tres direcciones de la fase 4 y lo mejora SIN CAMBIAR LO
 * QUE HACE EL PROGRAMA: calcula desde ahora lo que ya se sabe y quita las
 * instrucciones que sobran.
 *
 *   Antes (fase 4)               Despues (fase 5)
 *   ------------------------     ------------------------
 *   b = 2                        param 6
 *   t1 = b * 3                   call imprimirLn, 1
 *   a = t1
 *   param a
 *   call imprimirLn, 1
 *
 * Las optimizaciones (las clasicas de un compilador):
 *
 *   Plegado de constantes      t1 = 2 * 3            ->  t1 = 6
 *                              x = (decimal) 5       ->  x = 5.0
 *   Propagacion de constantes  b = 2   t1 = b * 3    ->  t1 = 2 * 3
 *   Propagacion de copias      b = a   t1 = b + 1    ->  t1 = a + 1
 *                              t1 = b * c   a = t1   ->  a = b * c
 *   Subexpresiones comunes     t2 = a * b (otra vez) ->  t2 = t1
 *   Simplificacion algebraica  t1 = x * 1            ->  t1 = x
 *   Reduccion de fuerza        t1 = x * 2            ->  t1 = x + x
 *   Codigo muerto              a = 5 (y nadie usa a) ->  (se quita)
 *                              a = 5 (y luego a = 6) ->  (se quita el primero)
 *                              potencia(2, 10) sin usar ->  (se quita, con sus param)
 *   Codigo inalcanzable        lo que va despues de un goto o un return
 *   Optimizacion de saltos     ifFalse verdadero goto L1 (nunca salta), goto a
 *                              la instruccion de abajo, goto a otro goto,
 *                              un if que solo brinca un goto, etiquetas que
 *                              nadie usa
 *
 * Se aplican una y otra vez hasta que ninguna cambia nada: una optimizacion
 * le abre paso a otra (propagar un 2 permite plegar 2 * 3, y entonces la
 * variable ya nadie la usa y se quita).
 *
 * BLOQUES BASICOS. Lo que se sabe de una variable ("a vale 5") solo se usa
 * dentro de un bloque basico: un pedazo de codigo que siempre se ejecuta
 * completo, de arriba hacia abajo. Un bloque empieza en una etiqueta y termina
 * en un salto. Despues de una etiqueta ya no se sabe nada, porque se pudo
 * llegar ahi desde otro lado (por ejemplo, al repetir un ciclo).
 */

const { OPERADORES, rehacer } = require('../04.intermedio/Instrucciones');
const { esEntero, esDecimal, esNumero, esLogico, esLiteral, opuesto, negar, calcular, convertirFijo } = require('./Literales');

/** El nombre de cada optimizacion, para mostrarla. */
const OPTIMIZACIONES = {
  plegado: 'Plegado de constantes',
  propagacion: 'Propagación de constantes',
  copias: 'Propagación de copias',
  subexpresiones: 'Subexpresiones comunes',
  algebraica: 'Simplificación algebraica',
  fuerza: 'Reducción de fuerza',
  muerto: 'Código muerto',
  inalcanzable: 'Código inalcanzable',
  saltos: 'Optimización de saltos'
};

/** Los saltos (las instrucciones que llevan una etiqueta a donde saltar). */
const SALTOS = ['goto', 'if', 'ifFalse', 'if=='];

/** Despues de estas instrucciones empieza otro bloque basico. */
const TERMINAN_BLOQUE = ['goto', 'if', 'ifFalse', 'if==', 'return', 'intentar', 'finIntentar'];

/** Despues de estas, lo que sigue no se ejecuta (hasta la siguiente etiqueta). */
const NO_SIGUEN = ['goto', 'return'];

// ====================================================================
// Que hace cada instruccion con sus campos
// ====================================================================

/** Los campos de una instruccion que son valores que se LEEN. */
function camposLeidos (ins) {
  if (OPERADORES.indexOf(ins.op) !== -1) return ['arg1', 'arg2'];
  switch (ins.op) {
    case '=': case 'menos': case 'NO': case 'convertir': case 'reservar':
    case 'if': case 'ifFalse': case 'param': case 'return':
      return ins.arg1 ? ['arg1'] : [];
    case '=[]': return ['arg2'];                // arg1 es el nombre del arreglo
    case '[]=': case 'if==': return ['arg1', 'arg2'];
    default: return [];
  }
}

/** Los nombres que lee una instruccion (tambien el arreglo de  t = a[i]). */
function nombresLeidos (ins) {
  const nombres = camposLeidos(ins).map((campo) => ins[campo]);
  if (ins.op === '=[]') nombres.push(ins.arg1);
  return nombres;
}

/** El nombre (variable o temporal) al que una instruccion le da valor, o null. */
function nombreDefinido (ins) {
  if (OPERADORES.indexOf(ins.op) !== -1) return ins.resultado;
  if (['=', 'menos', 'NO', 'convertir', '=[]', 'leer', 'capturar'].indexOf(ins.op) !== -1) return ins.resultado;
  if (ins.op === 'call' && ins.resultado) return ins.resultado;
  return null;
}

/** Una operacion: calcula un valor con uno o dos valores (x = a + b, x = - a). */
function esCalculo (ins) {
  return OPERADORES.indexOf(ins.op) !== -1 || ins.op === 'menos' || ins.op === 'NO';
}

/**
 * Una instruccion "pura": solo calcula un valor, sin hacer nada mas. Si nadie
 * usa ese valor, se puede quitar. Dividir no cuenta (entre cero lanza un
 * Error, salvo entre un numero fijo que no es cero), ni leer de un arreglo
 * (fuera de lugar tambien), ni convertir a numero (un texto que no es
 * numero), ni llamar a una funcion (puede imprimir).
 */
function esPura (ins) {
  if ((ins.op === '/' || ins.op === '%') && !divisorSeguro(ins.arg2)) return false;
  // Pasar cualquier valor a texto nunca falla
  if (ins.op === 'convertir' && ins.arg2 === 'cadena') return true;
  return esCalculo(ins) || ins.op === '=';
}

/**
 * Un divisor con el que dividir nunca lanza un Error: un entero fijo que no
 * es cero, o un decimal fijo (entre decimales, 5 / 0.0 da Infinity, no falla).
 */
const divisorSeguro = (x) => esDecimal(x) || (esEntero(x) && Number(x) !== 0);

/**
 * Las funciones del lenguaje que solo calculan un valor: no imprimen, no
 * leen, no fallan y siempre dan lo mismo. Si nadie usa lo que devuelven, la
 * llamada completa sobra (aleatorio no: cambia la serie de numeros al azar).
 */
const NATIVAS_PURAS = ['potencia', 'redondear', 'logaritmo', 'logaritmo10', 'seno', 'coseno', 'longitud'];
const esNativaPura = (f) => NATIVAS_PURAS.indexOf(f) !== -1 || /^(perimetro|area|volumen)\./.test(f);

// ====================================================================
// El optimizador
// ====================================================================

class Optimizador {
  /**
   * @param {Array}  instrucciones El codigo de tres direcciones de la fase 4.
   * @param {object} prefijos      { temporal: 't', etiqueta: 'L' }
   */
  constructor (instrucciones, prefijos) {
    // Se trabaja sobre una copia: la fase 4 se sigue mostrando tal cual.
    this.ins = JSON.parse(JSON.stringify(instrucciones))
      .map((ins) => Object.assign(ins, { original: ins.numero }));
    this.temporal = new RegExp(`^${prefijos.temporal}\\d+$`);
    /** Cada cambio: { optimizacion, nombre, antes, despues, linea } */
    this.cambios = [];
  }

  esTemporal (nombre) {
    return this.temporal.test(nombre);
  }

  /**
   * Le cambia campos a una instruccion (y vuelve a escribir su texto) y anota
   * el cambio:  "t1 = 2 * 3"  ->  "t1 = 6"
   */
  cambiar (ins, campos, optimizacion, antes = ins.texto) {
    Object.assign(ins, rehacer(Object.assign({}, ins, campos)));
    if (!ins.optimizaciones) ins.optimizaciones = [];
    if (ins.optimizaciones.indexOf(optimizacion) === -1) ins.optimizaciones.push(optimizacion);
    this.anotar(optimizacion, antes, ins.texto, ins.linea);
  }

  /**
   * Marca una instruccion para quitarla (ver compactar) y anota el cambio.
   * Si nunca se ejecutaba, tambien se van sus comentarios: ese renglon del
   * programa ya no tiene codigo.
   */
  quitar (ins, optimizacion) {
    ins.quitada = true;
    if (optimizacion === 'inalcanzable') ins.comentarios = null;
    this.anotar(optimizacion, ins.texto, '', ins.linea);
  }

  anotar (optimizacion, antes, despues, linea) {
    this.cambios.push({ optimizacion, nombre: OPTIMIZACIONES[optimizacion], antes, despues, linea });
  }

  /**
   * Saca de la lista las instrucciones quitadas. Sus comentarios (el renglon
   * del programa de donde salian) pasan a la siguiente que se queda.
   */
  compactar () {
    let pendientes = [];
    this.ins = this.ins.filter((ins) => {
      if (ins.quitada) {
        pendientes = pendientes.concat(ins.comentarios || []);
        return false;
      }
      if (pendientes.length > 0) {
        ins.comentarios = pendientes.concat(ins.comentarios || []);
        pendientes = [];
      }
      return true;
    });
  }

  /**
   * Aplica todas las optimizaciones una y otra vez, hasta que ninguna cambia
   * nada (o, por si acaso, hasta 50 vueltas).
   */
  optimizar () {
    for (let vuelta = 0; vuelta < 50; vuelta++) {
      let hubo = false;
      hubo = this.porBloques() || hubo;
      hubo = this.unirConCopias() || hubo;
      hubo = this.quitarCodigoMuerto() || hubo;
      hubo = this.quitarValoresPisados() || hubo;
      hubo = this.optimizarSaltos() || hubo;
      if (!hubo) break;
    }
  }

  // ------------------------------------------------------------------
  // Funciones y bloques basicos
  // ------------------------------------------------------------------

  /** Cada funcion del programa: [ inicio (funcion), fin ] */
  funciones () {
    const lista = [];
    let inicio = 0;
    this.ins.forEach((ins, i) => {
      if (ins.op === 'funcion') inicio = i;
      if (ins.op === 'fin') lista.push([inicio, i]);
    });
    return lista;
  }

  /**
   * Los bloques basicos de una funcion: [ desde, hasta ]. Un bloque empieza en
   * una etiqueta y termina en un salto (o un return, intentar, finIntentar).
   */
  bloques (inicio, fin) {
    const lista = [];
    let desde = inicio + 1;
    for (let i = inicio + 1; i < fin; i++) {
      if (this.ins[i].op === 'etiqueta' && i > desde) {
        lista.push([desde, i - 1]);
        desde = i;
      }
      if (TERMINAN_BLOQUE.indexOf(this.ins[i].op) !== -1) {
        lista.push([desde, i]);
        desde = i + 1;
      }
    }
    if (desde < fin) lista.push([desde, fin - 1]);
    return lista;
  }

  /** Cuantas veces se lee cada nombre dentro de una funcion. */
  contarUsos (inicio, fin) {
    const usos = new Map();
    for (let i = inicio; i <= fin; i++) {
      nombresLeidos(this.ins[i]).forEach((n) => usos.set(n, (usos.get(n) || 0) + 1));
    }
    return usos;
  }

  /** Cuantas instrucciones le dan valor a cada nombre dentro de una funcion. */
  contarDefiniciones (inicio, fin) {
    const definiciones = new Map();
    for (let i = inicio; i <= fin; i++) {
      const n = nombreDefinido(this.ins[i]);
      if (n) definiciones.set(n, (definiciones.get(n) || 0) + 1);
    }
    return definiciones;
  }

  // ------------------------------------------------------------------
  // 1. Dentro de cada bloque: propagacion y plegado de constantes,
  //    simplificacion algebraica, reduccion de fuerza, saltos con
  //    condicion fija y subexpresiones comunes
  // ------------------------------------------------------------------

  porBloques () {
    let hubo = false;
    this.funciones().forEach(([inicio, fin]) => {
      this.bloques(inicio, fin).forEach(([desde, hasta]) => {
        if (this.optimizarBloque(desde, hasta)) hubo = true;
      });
    });
    this.compactar();
    return hubo;
  }

  /**
   * Recorre un bloque de arriba hacia abajo recordando dos cosas:
   *   - valores:     lo que vale cada nombre, si se sabe: un valor fijo
   *                  (a -> 5) o el de otro nombre (b -> a, despues de  b = a)
   *   - calculados:  que operaciones ya estan en un temporal   (a * b -> t1)
   * Cada instruccion que le da otro valor a un nombre borra lo que se sabia
   * de el.
   */
  optimizarBloque (desde, hasta) {
    let hubo = false;
    const valores = new Map();
    let calculados = [];   // [{ op, arg1, arg2, temporal }]

    for (let i = desde; i <= hasta; i++) {
      const ins = this.ins[i];

      // Propagacion de constantes:  b = 2  ...  t1 = b * 3  ->  t1 = 2 * 3
      // Propagacion de copias:      b = a  ...  t1 = b * 3  ->  t1 = a * 3
      const constantes = {};
      const copias = {};
      camposLeidos(ins).forEach((campo) => {
        if (!valores.has(ins[campo])) return;
        const valor = valores.get(ins[campo]);
        if (esLiteral(valor)) constantes[campo] = valor;
        else copias[campo] = valor;
      });
      if (Object.keys(constantes).length > 0) {
        this.cambiar(ins, constantes, 'propagacion');
        hubo = true;
      }
      if (Object.keys(copias).length > 0) {
        this.cambiar(ins, copias, 'copias');
        hubo = true;
      }

      if (this.simplificar(ins)) hubo = true;
      if (ins.quitada) continue;

      // Subexpresiones comunes:  t1 = a * b ... t2 = a * b  ->  t2 = t1
      if (esCalculo(ins)) {
        const igual = calculados.find((c) =>
          c.op === ins.op && c.arg1 === ins.arg1 && c.arg2 === ins.arg2 && c.temporal !== ins.resultado);
        if (igual) {
          this.cambiar(ins, { op: '=', arg1: igual.temporal, arg2: '' }, 'subexpresiones');
          hubo = true;
        }
      }

      // Lo que se sabe despues de esta instruccion. Si cambia el valor de
      // "definido", ya no se sabe lo que valia, ni lo que valian sus copias.
      const definido = nombreDefinido(ins);
      if (definido) {
        valores.delete(definido);
        valores.forEach((valor, nombre) => { if (valor === definido) valores.delete(nombre); });
        calculados = calculados.filter((c) =>
          c.arg1 !== definido && c.arg2 !== definido && c.temporal !== definido);
        // Se recuerda la copia  x = valor. Pero si x es una variable y el
        // valor un temporal (x = t1), no: es mejor que el calculo del
        // temporal vaya directo a x (ver unirConCopias).
        const seUneDespues = !this.esTemporal(definido) && this.esTemporal(ins.arg1);
        if (ins.op === '=' && ins.arg1 !== definido && !seUneDespues) valores.set(definido, ins.arg1);
        if (esCalculo(ins) && this.esTemporal(definido) &&
            ins.arg1 !== definido && ins.arg2 !== definido) {
          calculados.push({ op: ins.op, arg1: ins.arg1, arg2: ins.arg2, temporal: definido });
        }
      }
    }
    return hubo;
  }

  /**
   * Lo que se puede simplificar de una sola instruccion. Devuelve true si
   * la cambio (o la quito).
   */
  simplificar (ins) {
    const { op, arg1: a, arg2: b } = ins;
    const copiar = (valor, optimizacion) => this.cambiar(ins, { op: '=', arg1: valor, arg2: '' }, optimizacion);

    // Plegado de constantes: los dos valores son fijos
    if (OPERADORES.indexOf(op) !== -1) {
      const r = calcular(op, a, b);
      if (r !== null) {
        copiar(r, 'plegado');
        return true;
      }
    }
    if (op === 'menos' && esNumero(a) && negar(a) !== null) { copiar(negar(a), 'plegado'); return true; }
    if (op === 'NO' && esLogico(a)) { copiar(opuesto(a), 'plegado'); return true; }
    if (op === 'convertir' && convertirFijo(a, b) !== null) { copiar(convertirFijo(a, b), 'plegado'); return true; }

    // Simplificacion algebraica: x * 1,  1 * x,  x / 1,  x - 0  ->  x
    if ((op === '*' || op === '/') && b === '1') { copiar(a, 'algebraica'); return true; }
    if (op === '-' && b === '0') { copiar(a, 'algebraica'); return true; }
    if (op === '*' && a === '1') { copiar(b, 'algebraica'); return true; }

    // Reduccion de fuerza: multiplicar por 2 es sumar el valor consigo mismo
    if (op === '*' && b === '2') { this.cambiar(ins, { op: '+', arg2: a }, 'fuerza'); return true; }
    if (op === '*' && a === '2') { this.cambiar(ins, { op: '+', arg1: b }, 'fuerza'); return true; }

    // Saltos con condicion fija:  ifFalse verdadero goto L1  nunca salta
    if ((op === 'if' || op === 'ifFalse') && esLogico(a)) {
      const salta = (a === 'verdadero') === (op === 'if');
      if (salta) this.cambiar(ins, { op: 'goto', arg1: '', arg2: '' }, 'saltos');
      else this.quitar(ins, 'saltos');
      return true;
    }
    if (op === 'if==') {
      const iguales = calcular('==', a, b);
      if (iguales !== null) {
        if (iguales === 'verdadero') this.cambiar(ins, { op: 'goto', arg1: '', arg2: '' }, 'saltos');
        else this.quitar(ins, 'saltos');
        return true;
      }
    }
    return false;
  }

  // ------------------------------------------------------------------
  // 2. Propagacion de copias: un temporal de mas
  // ------------------------------------------------------------------

  /**
   * Un temporal que solo sirve para pasarle su valor a una variable sobra:
   * el calculo va directo a la variable.
   *   t2 = b + t1      ->    a = b + t1
   *   a = t2
   */
  unirConCopias () {
    let hubo = false;
    this.funciones().forEach(([inicio, fin]) => {
      const usos = this.contarUsos(inicio, fin);
      const definiciones = this.contarDefiniciones(inicio, fin);

      for (let i = inicio; i < fin; i++) {
        const ins = this.ins[i];
        const copia = this.ins[i + 1];
        const t = nombreDefinido(ins);
        if (!t || !this.esTemporal(t) || ins.op === 'leer' || ins.op === 'capturar') continue;
        if (copia.op !== '=' || copia.arg1 !== t || copia.comentarios) continue;
        if (usos.get(t) !== 1 || definiciones.get(t) !== 1) continue;

        this.cambiar(ins, { resultado: copia.resultado }, 'copias', `${ins.texto}  ·  ${copia.texto}`);
        copia.quitada = true;
        hubo = true;
        i++;   // la copia ya se quito
      }
    });
    this.compactar();
    return hubo;
  }

  // ------------------------------------------------------------------
  // 3. Codigo muerto
  // ------------------------------------------------------------------

  /**
   * Una instruccion que le da valor a un nombre que nadie lee no hace nada:
   * se quita. Si es una llamada, se deja la llamada (puede imprimir algo) y
   * solo se quita donde se guardaba el resultado.
   */
  quitarCodigoMuerto () {
    let hubo = false;
    this.funciones().forEach(([inicio, fin]) => {
      const usos = this.contarUsos(inicio, fin);
      for (let i = inicio; i <= fin; i++) {
        const ins = this.ins[i];
        if (ins.quitada) continue;
        // Una funcion del lenguaje que solo calcula, y nadie usa su valor:
        // se va la llamada con sus param (que siempre van justo antes).
        if (ins.op === 'call' && esNativaPura(ins.arg1) && !(ins.resultado && usos.get(ins.resultado))) {
          const params = this.ins.slice(i - Number(ins.arg2), i);
          params.forEach((p) => { p.quitada = true; });
          ins.quitada = true;
          this.anotar('muerto', params.map((p) => p.texto).concat([ins.texto]).join('  ·  '), '', ins.linea);
          hubo = true;
          continue;
        }
        const definido = nombreDefinido(ins);
        if (!definido || usos.get(definido)) continue;
        if (esPura(ins)) {
          this.quitar(ins, 'muerto');
          hubo = true;
        } else if (ins.op === 'call') {
          this.cambiar(ins, { resultado: '' }, 'muerto');
          hubo = true;
        }
      }
    });
    this.compactar();
    return hubo;
  }

  /**
   * Un valor que se cambia antes de que alguien lo use tampoco sirve:
   *   v = 14          (nadie lee v aqui)      ->   (se quita)
   *   v = 13
   * Solo dentro de un bloque, y fuera de un intentar: ahi, si algo falla en
   * medio, el capturar podria usar el valor de antes.
   */
  quitarValoresPisados () {
    let hubo = false;
    const enIntentar = this.dentroDeIntentar();
    this.funciones().forEach(([inicio, fin]) => {
      this.bloques(inicio, fin).forEach(([desde, hasta]) => {
        for (let i = desde; i <= hasta; i++) {
          const ins = this.ins[i];
          if (ins.quitada || !esPura(ins) || enIntentar[i]) continue;
          const x = nombreDefinido(ins);
          for (let j = i + 1; j <= hasta; j++) {
            const otra = this.ins[j];
            if (otra.quitada) continue;
            if (nombresLeidos(otra).indexOf(x) !== -1) break;
            if (nombreDefinido(otra) === x) {
              this.quitar(ins, 'muerto');
              hubo = true;
              break;
            }
          }
        }
      });
    });
    this.compactar();
    return hubo;
  }

  /** Para cada instruccion: true si esta dentro de un intentar (entre  intentar L  y  L:). */
  dentroDeIntentar () {
    const dentro = this.ins.map(() => false);
    this.ins.forEach((ins, i) => {
      if (ins.op !== 'intentar') return;
      for (let j = i + 1; j < this.ins.length && !(this.ins[j].op === 'etiqueta' && this.ins[j].resultado === ins.resultado); j++) {
        dentro[j] = true;
      }
    });
    return dentro;
  }

  // ------------------------------------------------------------------
  // 4. Saltos y codigo inalcanzable
  // ------------------------------------------------------------------

  /** Las etiquetas que van justo despues de la instruccion i (puede haber varias seguidas). */
  etiquetasDespues (i) {
    const etiquetas = new Set();
    for (let j = i + 1; j < this.ins.length && this.ins[j].op === 'etiqueta'; j++) {
      etiquetas.add(this.ins[j].resultado);
    }
    return etiquetas;
  }

  optimizarSaltos () {
    let hubo = false;

    // Un salto condicional que solo brinca un goto se voltea:
    //   ifFalse t1 goto L1             if t1 goto L2
    //   goto L2              ->      L1:
    // L1:
    for (let i = 0; i + 2 < this.ins.length; i++) {
      const si = this.ins[i];
      const salto = this.ins[i + 1];
      if ((si.op !== 'if' && si.op !== 'ifFalse') || salto.op !== 'goto') continue;
      if (!this.etiquetasDespues(i + 1).has(si.resultado)) continue;

      const antes = `${si.texto}  ·  ${salto.texto}`;
      this.cambiar(si, { op: si.op === 'if' ? 'ifFalse' : 'if', resultado: salto.resultado }, 'saltos', antes);
      // El renglon del goto (romper;, por ejemplo) ahora lo hace el if
      if (salto.comentarios) si.comentarios = (si.comentarios || []).concat(salto.comentarios);
      salto.quitada = true;
      hubo = true;
      i++;
    }
    this.compactar();

    // Donde esta cada etiqueta (ya sin las instrucciones quitadas), y la
    // primera instruccion despues de ella que no es otra etiqueta.
    const posicion = new Map();
    this.ins.forEach((ins, i) => { if (ins.op === 'etiqueta') posicion.set(ins.resultado, i); });
    const despuesDe = (etiqueta) => {
      let j = posicion.get(etiqueta) + 1;
      while (j < this.ins.length && this.ins[j].op === 'etiqueta') j++;
      return this.ins[j];
    };

    this.ins.forEach((ins, i) => {
      if (SALTOS.indexOf(ins.op) === -1) return;

      // Un salto a otro goto: se salta directo a donde va ese goto
      //   goto L1   ...   L1: goto L2      ->   goto L2
      let destino = ins.resultado;
      const vistos = new Set([destino]);
      for (let ahi = despuesDe(destino); ahi && ahi.op === 'goto' && !vistos.has(ahi.resultado); ahi = despuesDe(destino)) {
        destino = ahi.resultado;
        vistos.add(destino);
      }
      if (destino !== ins.resultado) {
        this.cambiar(ins, { resultado: destino }, 'saltos');
        hubo = true;
      }

      // Un salto a la instruccion de abajo no hace falta:   goto L1   L1:
      if (this.etiquetasDespues(i).has(ins.resultado)) {
        this.quitar(ins, 'saltos');
        hubo = true;
      }
    });
    this.compactar();

    // Codigo inalcanzable: lo que sigue a un goto o a un return no se ejecuta
    // nunca, hasta la siguiente etiqueta (a donde si se puede saltar).
    for (let i = 0; i < this.ins.length; i++) {
      if (NO_SIGUEN.indexOf(this.ins[i].op) === -1) continue;
      let j = i + 1;
      while (j < this.ins.length && ['etiqueta', 'fin', 'funcion'].indexOf(this.ins[j].op) === -1) {
        this.quitar(this.ins[j], 'inalcanzable');
        hubo = true;
        j++;
      }
      i = j - 1;
    }
    this.compactar();

    // Etiquetas a las que ya ningun salto llega
    const usadas = new Set(this.ins
      .filter((ins) => SALTOS.indexOf(ins.op) !== -1 || ins.op === 'intentar')
      .map((ins) => ins.resultado));
    this.ins.forEach((ins) => {
      if (ins.op === 'etiqueta' && !usadas.has(ins.resultado)) {
        this.quitar(ins, 'saltos');
        hubo = true;
      }
    });
    this.compactar();
    return hubo;
  }
}

/**
 * Optimiza el codigo intermedio.
 *
 * @param {object} intermedio El resultado de la fase 4.
 * @returns {object} { estado: 'vacio' | 'errores-previos' | 'optimizado', errores,
 *   antes (cuantas instrucciones habia), instrucciones (las que quedan, con
 *   numero, original, op, arg1, arg2, resultado, texto, linea, comentarios y
 *   optimizaciones), cambios ([{ optimizacion, nombre, antes, despues, linea }]),
 *   porOptimizacion ([{ clave, nombre, veces }]), temporales, etiquetas, prefijos,
 *   y, para la fase 6, clase y simbolos (los mismos de la fase 4) }
 */
function optimizarCodigo (intermedio) {
  const resultado = {
    estado: 'optimizado',
    errores: [],
    antes: 0,
    instrucciones: [],
    cambios: [],
    porOptimizacion: [],
    temporales: 0,
    etiquetas: 0,
    prefijos: intermedio ? intermedio.prefijos : { temporal: 't', etiqueta: 'L' },
    // Lo que la fase 6 necesita y no cambia al optimizar: la clase y los tipos
    clase: intermedio ? intermedio.clase : '',
    simbolos: intermedio ? intermedio.simbolos : []
  };

  if (!intermedio || intermedio.estado === 'vacio') {
    resultado.estado = 'vacio';
    return resultado;
  }
  if (intermedio.estado !== 'generado') {
    resultado.estado = 'errores-previos';
    resultado.errores = intermedio.errores;
    return resultado;
  }

  const optimizador = new Optimizador(intermedio.instrucciones, intermedio.prefijos);
  optimizador.optimizar();

  resultado.antes = intermedio.instrucciones.length;
  resultado.instrucciones = optimizador.ins.map((ins, k) => {
    const limpia = Object.assign({}, ins, { numero: k + 1 });
    delete limpia.quitada;
    return limpia;
  });
  resultado.cambios = optimizador.cambios;
  resultado.porOptimizacion = Object.keys(OPTIMIZACIONES)
    .map((clave) => ({
      clave,
      nombre: OPTIMIZACIONES[clave],
      veces: optimizador.cambios.filter((c) => c.optimizacion === clave).length
    }))
    .filter((o) => o.veces > 0);

  // Los temporales y las etiquetas que quedaron
  const temporales = new Set();
  resultado.instrucciones.forEach((ins) => {
    [ins.arg1, ins.arg2, ins.resultado].forEach((x) => { if (optimizador.esTemporal(x)) temporales.add(x); });
  });
  resultado.temporales = temporales.size;
  resultado.etiquetas = resultado.instrucciones.filter((ins) => ins.op === 'etiqueta').length;
  return resultado;
}

module.exports = { optimizarCodigo, OPTIMIZACIONES };
