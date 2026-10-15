/**
 * Estructurador.js
 * Paso 2 de la fase 6: de saltos y etiquetas a if, while y try.
 *
 * Java no tiene goto, asi que el codigo de tres direcciones no se puede
 * copiar tal cual: hay que volver a encontrar las estructuras. Es el trabajo
 * de un DESCOMPILADOR, y se hace con las herramientas clasicas:
 *
 *   1. BLOQUES BASICOS y su GRAFO DE FLUJO: cada bloque empieza en una
 *      etiqueta y termina en un salto; las flechas dicen a donde puede ir.
 *
 *   2. DOMINADORES: el bloque A domina a B si para llegar a B siempre se pasa
 *      por A. Con eso se sabe que codigo va "adentro" de que.
 *
 *   3. CICLOS: un salto hacia atras (a un bloque que domina al que salta) es
 *      la vuelta de un ciclo; el bloque al que regresa es su cabecera.
 *
 *   4. Se escribe el arbol de dominadores de arriba hacia abajo (el metodo de
 *      Ramsey, "Beyond Relooper", 2022):
 *        - una cabecera de ciclo se vuelve  while (true) { ... }
 *        - un bloque al que llegan dos caminos (union) se pone DESPUES, y
 *          los caminos llegan a el con  break
 *        - un salto hacia atras es  continue
 *        - un bloque con un solo camino de llegada se escribe ahi mismo
 *
 *   El resultado es correcto pero tosco (while (true) con break, bloques con
 *   etiqueta...). Limpieza.js lo deja como lo escribiria una persona:
 *   while (i <= 3), do { } while, for, if / else if...
 *
 * Antes de estructurar se juntan las instrucciones en expresiones (ver
 * juntarExpresiones) y se reconocen los Y / O con corto circuito (ver
 * reconocerYO), que la fase 4 habia escrito con saltos.
 *
 * Un intentar es una REGION: lo que va entre  intentar L  y la etiqueta L
 * (donde empieza capturar). Esa region se estructura aparte, como si fuera
 * otra funcion, y en el grafo de afuera es un solo bloque. Asi el codigo de
 * afuera nunca queda dentro del try por accidente.
 */

const {
  efectos, juntar, sePuedeMoverDespues, cuentaUsos, sustituir, antesDe, Ex, nuevoInfo
} = require('./Expresiones');
const { esNumerico } = require('./TiposJava');

/** Un bloque basico. */
class Nodo {
  constructor (id, etiqueta) {
    this.id = id;
    this.etiqueta = etiqueta;
    this.sentencias = [];
    /** Como termina: salto, si, retornar, fin (se acaba la region) o intentar. */
    this.term = null;
    /** En el primer bloque de un capturar: la variable del error. */
    this.capturar = null;
  }
}

/** Una etiqueta que esta fuera de la region (un salto que sale de un intentar). */
class Externa {
  constructor (etiqueta) { this.etiqueta = etiqueta; }
}

/** Llegar al final de la region (lo que va despues del ultimo if). */
const FIN = { fin: true };

let siguienteId = 0;

// ====================================================================
// Las regiones: una funcion, o el cuerpo de un intentar
// ====================================================================

class Region {
  /**
   * @param {Array} sentencias  Lo que dejo Sentencias.bajar (sin funcion ni fin).
   */
  constructor (sentencias) {
    this.nodos = [];
    this.porEtiqueta = new Map();
    this.externas = new Map();
    this.construir(sentencias);
    this.resolver();
    this.podar();
  }

  /** Arma los bloques basicos. */
  construir (lista) {
    let actual = null;
    let pendiente = null;   // un si que espera su "si no" (el bloque que sigue)
    const empezar = (etiqueta) => {
      const n = new Nodo(++siguienteId, etiqueta);
      this.nodos.push(n);
      if (actual && !actual.term) actual.term = { k: 'salto', a: n };   // cae al que sigue
      if (pendiente) {
        pendiente.term.no = n;
        pendiente = null;
      }
      actual = n;
      return n;
    };
    const abierto = () => actual || empezar(null);

    for (let i = 0; i < lista.length; i++) {
      const s = lista[i];
      switch (s.t) {
        case 'etiqueta': {
          const n = empezar(s.nombre);
          n.porDefecto = s.porDefecto;
          n.hacer = s.hacer;
          this.porEtiqueta.set(s.nombre, n);
          break;
        }
        case 'intentar': {
          // La region: hasta la etiqueta donde empieza capturar
          let fin = i + 1;
          while (fin < lista.length && !(lista[fin].t === 'etiqueta' && lista[fin].nombre === s.manejador)) fin++;
          const n = empezar(null);
          n.term = { k: 'intentar', sentencias: lista.slice(i + 1, fin), manejador: s.manejador, linea: s.linea };
          actual = null;
          i = fin - 1;
          break;
        }
        case 'finIntentar': break;   // en Java el try termina solo al salir de su bloque
        case 'capturar': abierto().capturar = s.variable; break;
        case 'salto': abierto().term = { k: 'salto', a: s.destino }; actual = null; break;
        case 'siSalta': {
          const n = abierto();
          n.term = { k: 'si', cond: s.cond, si: s.destino, no: null, linea: s.linea };
          pendiente = n;
          actual = null;
          break;
        }
        case 'retornar': abierto().term = { k: 'retornar', valor: s.valor, linea: s.linea }; actual = null; break;
        default: abierto().sentencias.push(s);
      }
    }
    if (actual && !actual.term) actual.term = { k: 'fin' };
    if (pendiente) pendiente.term.no = FIN;
    if (this.nodos.length === 0) empezar(null).term = { k: 'fin' };
    this.entrada = this.nodos[0];
  }

  /** El destino de una etiqueta: un bloque de aqui, o una salida de la region. */
  destino (etiqueta) {
    if (this.porEtiqueta.has(etiqueta)) return this.porEtiqueta.get(etiqueta);
    if (!this.externas.has(etiqueta)) this.externas.set(etiqueta, new Externa(etiqueta));
    return this.externas.get(etiqueta);
  }

  /** Cambia los nombres de las etiquetas por sus bloques; arma los intentar. */
  resolver () {
    this.nodos.forEach((n) => {
      const t = n.term;
      if (t.k === 'salto' && typeof t.a === 'string') t.a = this.destino(t.a);
      if (t.k === 'si') t.si = this.destino(t.si);
      if (t.k === 'intentar') {
        t.region = new Region(t.sentencias);
        delete t.sentencias;
        t.manejador = this.destino(t.manejador);
        t.salidas = Array.from(t.region.salidasUsadas()).map((e) => this.destino(e));
      }
    });
  }

  /** A donde puede seguir un bloque. */
  sucesores (n) {
    const t = n.term;
    switch (t.k) {
      case 'salto': return [t.a];
      case 'si': return [t.si, t.no];
      case 'intentar': return [t.manejador].concat(t.salidas);
      case 'opcion': return t.casos.map((c) => c.destino).concat([t.defecto]);
      default: return [];
    }
  }

  /** Los sucesores que son bloques de esta region. */
  internos (n) {
    return this.sucesores(n).filter((d) => d instanceof Nodo);
  }

  /** Quita los bloques a los que no se llega nunca. */
  podar () {
    const vistos = new Set();
    const pila = [this.entrada];
    while (pila.length > 0) {
      const n = pila.pop();
      if (vistos.has(n)) continue;
      vistos.add(n);
      this.internos(n).forEach((s) => pila.push(s));
    }
    this.nodos = this.nodos.filter((n) => vistos.has(n));
  }

  /** Las etiquetas de afuera a las que salta algun bloque de aqui. */
  salidasUsadas () {
    const usadas = new Set();
    this.nodos.forEach((n) => this.sucesores(n).forEach((d) => {
      if (d instanceof Externa) usadas.add(d.etiqueta);
    }));
    return usadas;
  }

  /** Quien llega a cada bloque. */
  predecesores () {
    const preds = new Map(this.nodos.map((n) => [n, []]));
    this.nodos.forEach((n) => this.internos(n).forEach((s) => {
      if (preds.has(s)) preds.get(s).push(n);
    }));
    return preds;
  }

  /** Las regiones de los intentar de adentro (y las de adentro de esas). */
  subregiones () {
    const lista = [];
    this.nodos.forEach((n) => {
      if (n.term.k === 'intentar') lista.push(n.term.region, ...n.term.region.subregiones());
    });
    return lista;
  }
}

// ====================================================================
// Juntar instrucciones en expresiones
// ====================================================================

/** Lo que hace una sentencia: que lee, que cambia, si llama o puede fallar. */
function efectosDe (s, esDelPrograma) {
  switch (s.t) {
    case 'asignar': {
      const info = efectos(s.valor, esDelPrograma);
      info.escribe.add(s.nombre);
      return info;
    }
    case 'guardar': {
      const info = juntar(efectos(s.indice, esDelPrograma), efectos(s.valor, esDelPrograma));
      info.escribeArreglos.add(s.arreglo);
      info.lee.add(s.arreglo);
      info.lanza = true;
      return info;
    }
    case 'llamar': return efectos(s.llamada, esDelPrograma);
    default: return nuevoInfo();
  }
}

/** Las expresiones de una sentencia (o de como termina un bloque). */
function expresionesDe (s) {
  switch (s.t || s.k) {
    case 'asignar': return [s.valor];
    case 'guardar': return [s.indice, s.valor];
    case 'llamar': return [s.llamada];
    case 'si': return [s.cond];
    case 'retornar': return s.valor ? [s.valor] : [];
    case 'opcion': return [s.valor];
    default: return [];
  }
}

/** Cambia las expresiones de una sentencia con f. */
function cambiarExpresiones (s, f) {
  switch (s.t || s.k) {
    case 'asignar': s.valor = f(s.valor); break;
    case 'guardar': s.indice = f(s.indice); s.valor = f(s.valor); break;
    case 'llamar': s.llamada = f(s.llamada); break;
    case 'si': s.cond = f(s.cond); break;
    case 'retornar': if (s.valor) s.valor = f(s.valor); break;
    case 'opcion': s.valor = f(s.valor); break;
    default: break;
  }
}

/**
 * Cuantas veces se le da valor (defs) y cuantas se usa (usos) cada nombre en
 * una funcion, contando las regiones de adentro.
 */
function contar (region) {
  const defs = new Map();
  const usos = new Map();
  const mas = (m, n) => m.set(n, (m.get(n) || 0) + 1);
  const nombres = (e, f) => {
    if (e.k === 'var') f(e.n);
    if (e.k === 'idx') f(e.arr);
    ['a', 'b', 'i', 'n'].forEach((c) => { if (e[c] && typeof e[c] === 'object') nombres(e[c], f); });
    if (e.args) e.args.forEach((x) => nombres(x, f));
  };
  [region].concat(region.subregiones()).forEach((r) => r.nodos.forEach((nodo) => {
    nodo.sentencias.forEach((s) => {
      if (s.t === 'asignar') mas(defs, s.nombre);
      expresionesDe(s).forEach((e) => nombres(e, (n) => mas(usos, n)));
    });
    expresionesDe(nodo.term).forEach((e) => nombres(e, (n) => mas(usos, n)));
  }));
  return { defs: (n) => defs.get(n) || 0, usos: (n) => usos.get(n) || 0 };
}

/**
 * Lo que Java calcula antes de llegar al temporal n dentro de una sentencia
 * (en a[i] = v, primero i y luego v).
 */
function antesEnSentencia (s, n, esDelPrograma) {
  const exprs = expresionesDe(s);
  let antes = nuevoInfo();
  for (const e of exprs) {
    const r = antesDe(e, n, esDelPrograma);
    if (r.encontrada) return { antes: juntar(antes, r.antes), condicional: r.condicional };
    antes = juntar(antes, efectos(e, esDelPrograma));
  }
  return null;
}

/**
 * Mete cada temporal que se usa una sola vez dentro de la expresion que lo
 * usa, si eso no cambia lo que hace el programa:
 *
 *   t1 = c * d
 *   t2 = b + t1        ->     a = b + c * d
 *   a = t2
 *
 * Solo dentro de un mismo bloque, y solo si lo que hay en medio no cambia
 * nada de lo que el temporal lee ni se tiene que hacer en otro orden (ver
 * sePuedeMoverDespues). Un temporal que se usa en el lado derecho de && u
 * || solo se mete si calcularlo no tiene efectos: ahi a veces no se calcula.
 */
function juntarExpresiones (region, contexto) {
  const { esTemporal, esDelPrograma } = contexto;
  let hubo = false;
  let cuentas = contar(contexto.raiz);

  region.nodos.forEach((nodo) => {
    for (let i = 0; i < nodo.sentencias.length; i++) {
      const s = nodo.sentencias[i];
      if (s.t !== 'asignar' || !esTemporal(s.nombre)) continue;
      const t = s.nombre;
      if (cuentas.defs(t) !== 1 || cuentas.usos(t) !== 1) continue;

      // Donde se usa: una sentencia de este bloque, o como termina el bloque
      let j = nodo.sentencias.findIndex((x, k) => k > i && expresionesDe(x).some((e) => cuentaUsos(e, t) > 0));
      const usaTerm = j === -1 && expresionesDe(nodo.term).some((e) => cuentaUsos(e, t) > 0);
      if (j === -1 && !usaTerm) continue;
      if (usaTerm) j = nodo.sentencias.length;

      const info = efectos(s.valor, esDelPrograma);
      let sePuede = true;
      for (let k = i + 1; k < j && sePuede; k++) {
        sePuede = sePuedeMoverDespues(info, efectosDe(nodo.sentencias[k], esDelPrograma));
      }
      if (!sePuede) continue;
      const destino = usaTerm ? nodo.term : nodo.sentencias[j];
      // El valor de un opcion se mete hasta saber si queda como switch (ver planearOpcion)
      if (destino.k === 'opcion') continue;
      const dentro = antesEnSentencia(destino, t, esDelPrograma);
      if (!dentro) continue;
      if (dentro.condicional && (info.efecto || info.lanza)) continue;
      if (!sePuedeMoverDespues(info, dentro.antes)) continue;

      cambiarExpresiones(destino, (e) => sustituir(e, t, s.valor));
      if (s.linea && destino.linea === undefined) destino.linea = s.linea;
      nodo.sentencias.splice(i, 1);
      i--;
      hubo = true;
      cuentas = contar(contexto.raiz);
    }
  });
  return hubo;
}

// ====================================================================
// x++ dentro de una expresion
// ====================================================================

/**
 * La fase 4 escribe  y = x++  guardando antes el valor de x:
 *
 *     t1 = x                         y = x++;
 *     x = x + 1          ->
 *     y = t1
 *
 * Se vuelve a escribir con el x++ de Java, si entre el incremento y donde se
 * usa t1 nadie mas lee ni cambia x (con x++ el cambio pasa hasta ahi).
 */
function reconocerIncrementos (region, contexto) {
  const { esTemporal, esDelPrograma, tipoDe } = contexto;
  let hubo = false;
  let cuentas = contar(contexto.raiz);
  region.nodos.forEach((nodo) => {
    const ss = nodo.sentencias;
    for (let i = 0; i + 1 < ss.length; i++) {
      const copia = ss[i];
      const paso = ss[i + 1];
      if (copia.t !== 'asignar' || !esTemporal(copia.nombre) || copia.valor.k !== 'var') continue;
      const t = copia.nombre;
      const x = copia.valor.n;
      if (esTemporal(x) || cuentas.defs(t) !== 1 || cuentas.usos(t) !== 1 || !esNumerico(tipoDe(x))) continue;
      const v = paso.valor;
      if (paso.t !== 'asignar' || paso.nombre !== x || v.k !== 'bin' || (v.op !== '+' && v.op !== '-') ||
          v.a.k !== 'var' || v.a.n !== x || v.b.k !== 'lit' || v.b.v !== '1') continue;

      let j = ss.findIndex((s, k) => k > i + 1 && expresionesDe(s).some((e) => cuentaUsos(e, t) > 0));
      const enTerm = j === -1 && expresionesDe(nodo.term).some((e) => cuentaUsos(e, t) > 0);
      if (j === -1 && !enTerm) continue;
      if (enTerm) j = ss.length;
      const tocaX = (s) => expresionesDe(s).some((e) => cuentaUsos(e, x) > 0) || (s.t === 'asignar' && s.nombre === x);
      if (ss.slice(i + 2, j).some(tocaX)) continue;
      const destino = enTerm ? nodo.term : ss[j];
      const dentro = antesEnSentencia(destino, t, esDelPrograma);
      if (!dentro || dentro.condicional || dentro.antes.lee.has(x)) continue;

      const post = { k: 'post', op: v.op === '+' ? '++' : '--', n: x, t: tipoDe(x) };
      cambiarExpresiones(destino, (e) => sustituir(e, t, post));
      ss.splice(i, 2);
      i--;
      hubo = true;
      cuentas = contar(contexto.raiz);
    }
  });
  return hubo;
}

// ====================================================================
// Y / O con corto circuito
// ====================================================================

/**
 * La fase 4 escribe  l = a Y b  con saltos (corto circuito):
 *
 *     t = a                       si a es falso, ya no se calcula b
 *     ifFalse t goto L1
 *     t = b
 *   L1:
 *
 * En el grafo es un triangulo: X (calcula a y decide) -> Y (calcula b) -> L,
 * y X -> L directo. Se cambia por una sola asignacion con el && de Java,
 * que hace lo mismo:  t = a && b.  Con  if t goto L1  es  t = a || b.
 *
 * Despues de optimizar, la condicion puede ser el valor copiado y no t
 * (t = t1; ifFalse t1 goto L1): tambien se reconoce.
 */
function reconocerYO (region, contexto) {
  let hubo = false;
  const preds = region.predecesores();
  for (const x of region.nodos) {
    const term = x.term;
    if (term.k !== 'si' || x.sentencias.length === 0) continue;

    for (const [y, l, alL] of [[term.no, term.si, term.cond], [term.si, term.no, negarSimple(term.cond)]]) {
      if (!(y instanceof Nodo) || y === l || y === x || y.capturar) continue;
      if (preds.get(y).length !== 1 || y.term.k !== 'salto' || y.term.a !== l) continue;
      if (y.sentencias.length !== 1 || y.sentencias[0].t !== 'asignar') continue;
      const t = y.sentencias[0].nombre;
      if (!contexto.esTemporal(t)) continue;

      // X va directo a L cuando "alL" se cumple: v (O) o !v (Y)
      let v;
      let op;
      if (alL.k === 'var') { v = alL.n; op = '||'; } else if (alL.k === 'un' && alL.op === '!' && alL.a.k === 'var') { v = alL.a.n; op = '&&'; } else continue;

      const ultima = x.sentencias[x.sentencias.length - 1];
      if (ultima.t !== 'asignar' || ultima.nombre !== t) continue;
      let primero;
      if (v === t) primero = ultima.valor;
      else if (ultima.valor.k === 'var' && ultima.valor.n === v) primero = ultima.valor;
      else continue;

      ultima.valor = Object.assign(Ex.bin(op, primero, y.sentencias[0].valor), { t: 'logico' });
      x.term = { k: 'salto', a: l };
      region.nodos = region.nodos.filter((n) => n !== y);
      hubo = true;
      break;
    }
    if (hubo) break;
  }
  return hubo;
}

/** !c sin simplificar (para ver de que lado va cada camino). */
function negarSimple (c) {
  if (c.k === 'un' && c.op === '!') return c.a;
  return Ex.un('!', c);
}

/**
 * Un bloque que solo salta a otro al que nadie mas llega: se juntan en uno.
 * (Deja juntos  t = a && b  y el if que lo usa, para meter t en la condicion.)
 */
function juntarBloques (region) {
  const preds = region.predecesores();
  for (const x of region.nodos) {
    const y = x.term.k === 'salto' ? x.term.a : null;
    if (!(y instanceof Nodo) || y === x || y === region.entrada || y.capturar) continue;
    if (preds.get(y).length !== 1) continue;
    x.sentencias.push(...y.sentencias);
    x.term = y.term;
    x.etiqueta = x.etiqueta || y.etiqueta;
    x.porDefecto = x.porDefecto || y.porDefecto;
    region.nodos = region.nodos.filter((n) => n !== y);
    return true;
  }
  return false;
}

// ====================================================================
// opcion: las comparaciones seguidas con el mismo valor
// ====================================================================

/** Un bloque que termina con  if v == c goto L  (salta si son iguales). */
function pruebaDeOpcion (n) {
  const t = n.term;
  if (t.k !== 'si') return null;
  const c = t.cond;
  if (c.k !== 'bin' || c.op !== '==' || c.a.k !== 'var' || c.b.k !== 'lit' || !(t.si instanceof Nodo)) return null;
  return { variable: c.a.n, expresion: c.a, valor: c.b, destino: t.si };
}

/**
 * La fase 4 escribe  opcion (x) { caso 1: ... caso 2: ... porDefecto: ... }
 * como una fila de comparaciones:
 *
 *     if x == 1 goto L1
 *     if x == 2 goto L2
 *     goto L3
 *
 * Esa fila se junta en un solo bloque que termina en "opcion" (con a donde
 * va cada caso). El estructurador lo escribe como un switch de Java.
 */
function reconocerOpcion (region) {
  const preds = region.predecesores();
  const sirve = (n) => n instanceof Nodo && n.sentencias.length === 0 && preds.get(n).length === 1 &&
    !n.capturar && n !== region.entrada;
  for (const s of region.nodos) {
    const primera = pruebaDeOpcion(s);
    if (!primera) continue;
    const casos = [primera];
    const quitar = [];
    let actual = s;
    for (let sig = s.term.no; sirve(sig); sig = actual.term.no) {
      const p = pruebaDeOpcion(sig);
      if (!p || p.variable !== primera.variable) break;
      casos.push(p);
      quitar.push(sig);
      actual = sig;
    }
    if (casos.length < 2) continue;
    let defecto = actual.term.no;
    if (sirve(defecto) && defecto.term.k === 'salto') {   // el  goto L3  va en su propio bloque
      quitar.push(defecto);
      defecto = defecto.term.a;
    }
    if (!(defecto instanceof Nodo)) continue;
    s.term = {
      k: 'opcion',
      valor: primera.expresion,
      casos: casos.map((c) => ({ valor: c.valor, destino: c.destino })),
      defecto,
      linea: s.term.linea
    };
    region.nodos = region.nodos.filter((n) => quitar.indexOf(n) === -1);
    return true;
  }
  return false;
}

/** Junta expresiones, Y / O y bloques en todas las regiones, hasta que ya no cambia nada. */
function simplificar (raiz, contexto) {
  for (let vuelta = 0; vuelta < 200; vuelta++) {
    let hubo = false;
    [raiz].concat(raiz.subregiones()).forEach((r) => {
      hubo = juntarExpresiones(r, contexto) || hubo;
      hubo = reconocerIncrementos(r, contexto) || hubo;
      hubo = reconocerYO(r, contexto) || hubo;
      hubo = reconocerOpcion(r) || hubo;
      hubo = juntarBloques(r) || hubo;
    });
    if (!hubo) return;
  }
}

// ====================================================================
// Estructurar: dominadores, ciclos y el arbol
// ====================================================================

class Estructurador {
  /**
   * @param {Region} region
   * @param {object} opciones
   *   salidaExterna(etiqueta) -> sentencias para salir de la region (break/continue de afuera)
   *   alFinal() -> sentencias al llegar al final de la region
   */
  constructor (region, opciones) {
    this.region = region;
    this.salidaExterna = opciones.salidaExterna;
    this.alFinal = opciones.alFinal;
    /** { esTemporal, usos }: para escribir el valor de un switch en el switch mismo. */
    this.contexto = opciones.contexto || null;
    this.analizar();
  }

  analizar () {
    const r = this.region;
    const preds = r.predecesores();
    this.preds = preds;

    // Orden inverso de postorden (RPO): un bloque va antes que los que siguen de el
    const post = [];
    const vistos = new Set();
    const visitar = (inicio) => {
      const pila = [[inicio, 0]];
      vistos.add(inicio);
      while (pila.length > 0) {
        const tope = pila[pila.length - 1];
        const sucs = r.internos(tope[0]);
        if (tope[1] < sucs.length) {
          const s = sucs[tope[1]++];
          if (!vistos.has(s)) {
            vistos.add(s);
            pila.push([s, 0]);
          }
        } else {
          post.push(tope[0]);
          pila.pop();
        }
      }
    };
    visitar(r.entrada);
    this.rpo = post.reverse();
    this.numero = new Map(this.rpo.map((n, i) => [n, i]));

    // Dominadores inmediatos (Cooper, Harvey y Kennedy)
    const idom = new Map([[r.entrada, r.entrada]]);
    const interseccion = (a, b) => {
      while (a !== b) {
        while (this.numero.get(a) > this.numero.get(b)) a = idom.get(a);
        while (this.numero.get(b) > this.numero.get(a)) b = idom.get(b);
      }
      return a;
    };
    for (let cambio = true; cambio;) {
      cambio = false;
      this.rpo.slice(1).forEach((b) => {
        let nuevo = null;
        preds.get(b).forEach((p) => {
          if (!idom.has(p)) return;
          nuevo = nuevo === null ? p : interseccion(p, nuevo);
        });
        if (nuevo !== null && idom.get(b) !== nuevo) {
          idom.set(b, nuevo);
          cambio = true;
        }
      });
    }
    this.idom = idom;

    // Ciclos: cada salto hacia atras regresa a una cabecera
    this.cuerpos = new Map();   // cabecera -> Set de los bloques del ciclo
    const vueltas = new Set();  // los bloques que regresan a la cabecera
    this.rpo.forEach((u) => r.internos(u).forEach((h) => {
      if (this.numero.get(h) > this.numero.get(u)) return;
      vueltas.add(u);
      if (!this.domina(h, u)) throw new Error('El flujo del programa no se puede escribir con ciclos de Java.');
      if (!this.cuerpos.has(h)) this.cuerpos.set(h, new Set([h]));
      const cuerpo = this.cuerpos.get(h);
      const pila = [u];
      while (pila.length > 0) {
        const m = pila.pop();
        if (cuerpo.has(m)) continue;
        cuerpo.add(m);
        preds.get(m).forEach((p) => pila.push(p));
      }
    }));

    // Los que se ponen despues de un bloque con etiqueta: las uniones (llegan
    // dos caminos) y las salidas de un intentar (para que su codigo no quede
    // dentro del try).
    this.forzados = new Set();
    this.rpo.forEach((n) => {
      if (n.term.k === 'intentar') n.term.salidas.forEach((s) => { if (s instanceof Nodo) this.forzados.add(s); });
    });

    // Como se escribe cada opcion (ver planearOpcion)
    this.opciones = new Map();
    this.dentroDeOpcion = new Set();

    // Donde se escribe cada bloque: debajo de su dominador inmediato. Pero si
    // ese dominador esta dentro de un ciclo y el bloque no, el bloque es una
    // SALIDA del ciclo: se escribe despues del ciclo (del mas de afuera que
    // deja), y se llega a el con break.
    const ciclosDeAfueraAdentro = Array.from(this.cuerpos.keys())
      .sort((a, b) => this.cuerpos.get(b).size - this.cuerpos.get(a).size);
    this.padre = new Map();
    this.esSalidaDeCiclo = new Map();
    // (Una salida corta de en medio del ciclo, como  if (c) { return x; }  o
    // else { x = 3; break; }, se queda dentro del ciclo, donde estaba. La
    // salida normal, la de la condicion del ciclo, si va despues.)
    this.rpo.slice(1).forEach((v) => {
      const p = idom.get(v);
      const desde = preds.get(v)[0];
      const destino = v.term.k === 'salto' ? v.term.a : null;
      const terminaCorto = v.term.k === 'retornar' ||
        (v.term.k === 'salto' && (!(destino instanceof Nodo) || preds.get(destino).length >= 2));
      const corta = terminaCorto && v.sentencias.length <= 3 && preds.get(v).length === 1 &&
        !this.cuerpos.has(desde) && !vueltas.has(desde);
      const ciclo = corta ? null : ciclosDeAfueraAdentro.find((h) => this.cuerpos.get(h).has(p) && !this.cuerpos.get(h).has(v));
      this.padre.set(v, ciclo || p);
      this.esSalidaDeCiclo.set(v, Boolean(ciclo));
    });

    this.rpo.forEach((n) => { if (n.term.k === 'opcion') this.planearOpcion(n); });
  }

  /**
   * Decide como se escribe un opcion. Lo normal es un switch de Java, con
   * cada caso en su lugar y en el orden del programa:
   *
   *   switch (x) {
   *       case 1:  ...            <- sin break, sigue con el caso 2 (como en SwordByte)
   *       case 2:  ...  break;
   *       default: ...
   *   }
   *
   * Para eso a cada caso solo se puede llegar desde el switch o cayendo desde
   * el caso de arriba. El porDefecto va adentro si existe (su etiqueta lo
   * dice); si no, a donde salta es la salida, y va despues del switch. Si el
   * flujo no se puede escribir asi (muy raro, despues de optimizar), el
   * opcion se escribe como  if (x == 1) ... else if (x == 2) ...
   */
  planearOpcion (s) {
    const t = s.term;
    // Los lugares a donde va cada caso, en el orden del programa (el
    // porDefecto tambien, si su etiqueta dice que es el porDefecto)
    const destinos = [];
    t.casos.forEach((c) => { if (destinos.indexOf(c.destino) === -1) destinos.push(c.destino); });
    if (t.defecto.porDefecto && destinos.indexOf(t.defecto) === -1) destinos.push(t.defecto);
    destinos.sort((a, b) => a.id - b.id);

    // Uno por uno: un caso va dentro del switch si solo se llega a el desde
    // el switch o cayendo desde el caso de arriba. Si no (por ejemplo, un
    // caso vacio que salta a la salida), ese caso se escribe como un salto:
    // case 3: break;
    const orden = [];
    destinos.forEach((d) => {
      if (this.esSalidaDeCiclo.get(d)) return;
      const previo = orden[orden.length - 1];
      if (this.preds.get(d).every((p) => p === s || (previo && this.domina(previo, p)))) orden.push(d);
    });
    if (orden.length === 0) {
      this.opciones.set(s, { modo: 'si' });
      return;
    }
    // A donde se salta sin estar dentro (la salida, casi siempre) va despues del switch
    t.casos.map((c) => c.destino).concat([t.defecto]).forEach((d) => {
      if (orden.indexOf(d) === -1) this.forzados.add(d);
    });
    orden.forEach((d) => this.dentroDeOpcion.add(d));
    this.opciones.set(s, { modo: 'switch', orden, defectoDentro: orden.indexOf(t.defecto) !== -1 });

    // switch (n % 3): el valor se calcula en el switch mismo
    const ultima = s.sentencias[s.sentencias.length - 1];
    if (t.valor.k === 'var' && ultima && ultima.t === 'asignar' && ultima.nombre === t.valor.n && this.contexto &&
        this.contexto.esTemporal(t.valor.n) && this.contexto.usos(t.valor.n) === 1) {
      t.valor = ultima.valor;
      s.sentencias.pop();
    }
  }

  domina (a, b) {
    for (let x = b; ; x = this.idom.get(x)) {
      if (x === a) return true;
      if (x === this.region.entrada) return a === x;
    }
  }

  esCabecera (n) { return this.cuerpos.has(n); }

  /**
   * La etiqueta de un bloque. Casi todos tienen la del codigo intermedio
   * (L5); al que se llega sin salto (cayendo desde el de arriba) se le
   * inventa una: B12 (las del codigo intermedio siempre empiezan con L).
   */
  etq (n) {
    if (!n.etiqueta) n.etiqueta = `B${n.id}`;
    return n.etiqueta;
  }

  /** Llegan dos o mas caminos hacia adelante (o es la salida de un intentar). */
  esUnion (n) {
    if (this.forzados.has(n)) return true;
    const delante = this.preds.get(n).filter((p) => this.numero.get(p) < this.numero.get(n));
    return delante.length >= 2;
  }

  /** Se escribe despues de un bloque con etiqueta, y se llega a el con break. */
  vaDespues (n) {
    if (this.dentroDeOpcion.has(n)) return false;   // un caso: va dentro de su switch
    return this.esSalidaDeCiclo.get(n) || this.esUnion(n);
  }

  hijos (x) {
    return this.rpo.filter((v) => this.padre.get(v) === x);
  }

  /** El arbol de sentencias de toda la region. */
  estructurar () {
    return this.arbol(this.region.entrada, []);
  }

  /** Las sentencias de un bloque y de todo lo que se escribe debajo de el. */
  arbol (x, ctx) {
    const hijos = this.hijos(x);
    const salidas = hijos.filter((v) => this.esSalidaDeCiclo.get(v));
    const uniones = hijos.filter((v) => !this.esSalidaDeCiclo.get(v) && this.esUnion(v) && !this.dentroDeOpcion.has(v));
    return this.envolver(salidas, ctx, (c) => {
      if (!this.esCabecera(x)) return this.dentro(x, uniones, c);
      const c2 = c.concat([{ tipo: 'ciclo', nodo: x }]);
      return [{ t: 'ciclo', etiqueta: this.etq(x), pista: x.hacer ? 'hacer' : null, cuerpo: this.dentro(x, uniones, c2) }];
    });
  }

  /**
   * Pone los bloques "ys" despues de lo que arma interior(), cada uno con su
   * bloque con etiqueta alrededor, para poder llegar a el con break:
   *
   *   y2: {
   *     y1: {
   *       interior        (break y1 -> va a y1;  break y2 -> va a y2)
   *     }
   *     y1
   *   }
   *   y2
   */
  envolver (ys, ctx, interior) {
    if (ys.length === 0) return interior(ctx);
    const y = ys[ys.length - 1];
    const c2 = ctx.concat([{ tipo: 'bloque', nodo: y }]);
    return [{ t: 'bloque', etiqueta: this.etq(y), cuerpo: this.envolver(ys.slice(0, -1), c2, interior) }]
      .concat(this.arbol(y, ctx));
  }

  dentro (x, uniones, ctx) {
    return this.envolver(uniones, ctx, (c) => x.sentencias.map((s) => Object.assign({}, s)).concat(this.ramificar(x, c)));
  }

  /** Como termina un bloque. */
  ramificar (x, ctx) {
    const t = x.term;
    switch (t.k) {
      case 'salto': return this.saltar(x, t.a, ctx);
      case 'si': return [{ t: 'si', cond: t.cond, entonces: this.saltar(x, t.si, ctx), sino: this.saltar(x, t.no, ctx), linea: t.linea }];
      case 'retornar': return [{ t: 'retornar', valor: t.valor, linea: t.linea }];
      case 'fin': return this.alFinal();
      case 'intentar': {
        const manejador = t.manejador;
        const dentroDelTry = new Estructurador(t.region, {
          // Salir del try es saltar desde aqui (nunca escribir el codigo de afuera adentro)
          salidaExterna: (etiqueta) => this.saltar(x, this.region.destino(etiqueta), ctx),
          alFinal: () => [],
          contexto: this.contexto
        });
        return [{
          t: 'intentar',
          cuerpo: dentroDelTry.estructurar(),
          variable: manejador.capturar,
          manejo: this.saltar(x, manejador, ctx),
          linea: t.linea
        }];
      }
      case 'opcion': return this.opcion(x, ctx);
      default: throw new Error(`Bloque sin final: ${t.k}`);
    }
  }

  /** Un opcion: un switch de Java, o (si no se puede) if / else if. */
  opcion (x, ctx) {
    const t = x.term;
    const plan = this.opciones.get(x);
    const comparar = (valor) => Object.assign(Ex.bin('==', t.valor, valor), { t: 'logico' });

    if (plan.modo === 'si') {
      let resto = this.saltar(x, t.defecto, ctx);
      for (let i = t.casos.length - 1; i >= 0; i--) {
        resto = [{ t: 'si', cond: comparar(t.casos[i].valor), entonces: this.saltar(x, t.casos[i].destino, ctx), sino: resto, linea: t.linea }];
      }
      return resto;
    }

    const etiqueta = `S${x.id}`;
    const c2 = ctx.concat([{ tipo: 'opcion', nodo: x }]);
    const casos = [];
    // Un caso que salta a otro lado (afuera de un ciclo, por ejemplo)
    t.casos.filter((c) => plan.orden.indexOf(c.destino) === -1)
      .forEach((c) => casos.push({ valores: [c.valor], defecto: false, cuerpo: this.saltar(x, c.destino, ctx) }));
    // Cada caso en su lugar. Llegar al caso de abajo es salir del bloque del caso.
    plan.orden.forEach((d, k) => {
      const etiquetaCaso = `C${d.id}`;
      const c3 = c2.concat([{ tipo: 'caso', siguiente: plan.orden[k + 1] || null, etiqueta: etiquetaCaso }]);
      casos.push({
        valores: t.casos.filter((c) => c.destino === d).map((c) => c.valor),
        defecto: plan.defectoDentro && d === t.defecto,
        cuerpo: [{ t: 'bloque', etiqueta: etiquetaCaso, cuerpo: this.arbol(d, c3) }]
      });
    });
    if (!plan.defectoDentro) casos.push({ valores: [], defecto: true, cuerpo: this.saltar(x, t.defecto, ctx) });
    return [{ t: 'opcion', etiqueta, valor: t.valor, casos, linea: t.linea }];
  }

  /** Ir del bloque x al bloque "destino". */
  saltar (x, destino, ctx) {
    // Del final de un caso al caso de abajo: se sale del bloque del caso y se sigue
    const caso = ctx.find((c) => c.tipo === 'caso' && c.siguiente === destino);
    if (caso) return [{ t: 'romper', etiqueta: caso.etiqueta }];
    if (this.dentroDeOpcion.has(destino)) throw new Error(`Un salto al caso ${this.etq(destino)} desde otro lado.`);
    if (destino === FIN) return this.alFinal();
    if (destino instanceof Externa) return this.salidaExterna(destino.etiqueta);
    if (this.numero.get(destino) <= this.numero.get(x)) {
      this.buscar(ctx, 'ciclo', destino);
      return [{ t: 'continuar', etiqueta: this.etq(destino) }];
    }
    if (this.vaDespues(destino)) {
      this.buscar(ctx, 'bloque', destino);
      return [{ t: 'romper', etiqueta: this.etq(destino) }];
    }
    return this.arbol(destino, ctx);
  }

  /** Revisa que el ciclo o bloque al que se salta este alrededor. */
  buscar (ctx, tipo, nodo) {
    if (!ctx.some((c) => c.tipo === tipo && c.nodo === nodo)) {
      throw new Error(`No se encontro el ${tipo} de ${nodo.etiqueta} al estructurar.`);
    }
  }
}

/**
 * Estructura una funcion.
 * @param {Array}  sentencias  Las de Sentencias.bajar.
 * @param {object} contexto    { esTemporal, esDelPrograma }
 * @returns {Array} El arbol de sentencias (con ciclo, bloque, si, intentar,
 *                  romper, continuar, retornar y las sentencias simples).
 */
function estructurar (sentencias, contexto) {
  const raiz = new Region(sentencias);
  const ctx = Object.assign({ raiz }, contexto);
  simplificar(raiz, ctx);
  [raiz].concat(raiz.subregiones()).forEach((r) => r.podar());
  const cuentas = contar(raiz);
  return new Estructurador(raiz, {
    salidaExterna: (etiqueta) => { throw new Error(`La etiqueta ${etiqueta} no existe.`); },
    alFinal: () => [{ t: 'retornar', valor: null }],
    contexto: { esTemporal: contexto.esTemporal, usos: cuentas.usos }
  }).estructurar();
}

module.exports = { estructurar, Region };
