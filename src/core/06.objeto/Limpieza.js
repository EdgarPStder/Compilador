/**
 * Limpieza.js
 * Paso 3 de la fase 6: deja el arbol de sentencias como lo escribiria una
 * persona. El estructurador (paso 2) entrega algo correcto pero tosco:
 *
 *   L5: while (true) {                    while (i <= 3) {
 *       if (!(i <= 3)) {                      System.out.println(i);
 *           break L5;                         i++;
 *       } else {                  ->      }
 *           System.out.println(i);
 *           i = i + 1;
 *           continue L5;
 *       }
 *   }
 *
 * Cada limpieza es pequeña y no cambia lo que hace el programa:
 *   - un salto que lleva a donde de todos modos se iba a llegar, sobra
 *     (el continue al final del ciclo, el break al final de su bloque);
 *   - lo que va despues de un salto no se ejecuta nunca;
 *   - un bloque con etiqueta al que nadie salta, sobra;
 *   - if (c) { } else { B }  es  if (!c) { B };  y si un lado termina en un
 *     salto, el otro lado puede ir despues del if (menos sangria);
 *   - while (true) { if (!c) break; ... }  es  while (c) { ... };
 *     while (true) { ...; if (!c) break; }  es  do { ... } while (c);
 *     i = 0; while (i < n) { ...; i++; }  es  for (i = 0; i < n; i++) { ... }
 *
 * Se repiten hasta que ninguna cambia nada.
 */

const { negar, iguales, cuentaUsos, efectos } = require('./Expresiones');
const { condicionConstante } = require('./ConstantesJava');

const CICLOS = ['ciclo', 'mientras', 'hacer', 'para'];
const esCiclo = (s) => CICLOS.indexOf(s.t) !== -1;

/** Las listas de sentencias que hay dentro de una sentencia. */
function listasDe (s) {
  switch (s.t) {
    case 'si': return [s.entonces, s.sino];
    case 'bloque': case 'ciclo': case 'mientras': case 'hacer': case 'para': return [s.cuerpo];
    case 'intentar': return [s.cuerpo, s.manejo];
    case 'opcion': return s.casos.map((c) => c.cuerpo);
    default: return [];
  }
}

/** Recorre todas las sentencias (de afuera hacia adentro). */
function recorrer (lista, f) {
  lista.forEach((s) => {
    f(s);
    listasDe(s).forEach((l) => recorrer(l, f));
  });
}

const esSalto = (s) => s.t === 'romper' || s.t === 'continuar' || s.t === 'retornar';

function mismoSalto (a, b) {
  if (a.t !== b.t) return false;
  if (a.t === 'retornar') return (!a.valor && !b.valor) || (a.valor && b.valor && iguales(a.valor, b.valor));
  return a.etiqueta === b.etiqueta;
}

/** true si dentro de la lista hay un break a esa etiqueta. */
function rompeA (lista, etiqueta) {
  let hay = false;
  recorrer(lista, (s) => { if (s.t === 'romper' && s.etiqueta === etiqueta) hay = true; });
  return hay;
}

function continuaA (lista, etiqueta) {
  let hay = false;
  recorrer(lista, (s) => { if (s.t === 'continuar' && s.etiqueta === etiqueta) hay = true; });
  return hay;
}

/** Una condicion que Java sabe desde que compila que siempre es verdadera (ver ConstantesJava). */
const esVerdadero = (c) => condicionConstante(c) === true;

/**
 * true si despues de la sentencia se puede seguir con la siguiente. Son las
 * reglas de Java: si no se puede, lo que va despues es un error de
 * "unreachable statement".
 */
function puedeTerminar (s) {
  switch (s.t) {
    case 'romper': case 'continuar': case 'retornar': return false;
    case 'si': return s.sino.length === 0 || listaTermina(s.entonces) || listaTermina(s.sino);
    case 'bloque': return listaTermina(s.cuerpo) || rompeA(s.cuerpo, s.etiqueta);
    case 'ciclo': return rompeA(s.cuerpo, s.etiqueta);
    case 'mientras': case 'para': return !esVerdadero(s.cond) || rompeA(s.cuerpo, s.etiqueta);
    case 'hacer':
      return rompeA(s.cuerpo, s.etiqueta) ||
        (!esVerdadero(s.cond) && (listaTermina(s.cuerpo) || continuaA(s.cuerpo, s.etiqueta)));
    case 'intentar': return listaTermina(s.cuerpo) || listaTermina(s.manejo);
    case 'opcion':
      // Las reglas del switch de Java
      return s.casos.length === 0 || listaTermina(s.casos[s.casos.length - 1].cuerpo) ||
        !s.casos.some((c) => c.defecto) || s.casos.some((c) => rompeA(c.cuerpo, s.etiqueta));
    default: return true;
  }
}

const listaTermina = (lista) => lista.length === 0 || puedeTerminar(lista[lista.length - 1]);

// ====================================================================
// Saltos que sobran y codigo que no se ejecuta
// ====================================================================

/**
 * Los saltos que hacen lo mismo que llegar a la posicion p de la lista
 * (sin saltar). Al final de la lista: los que se dan en "salidas".
 */
function equivalentes (lista, p, salidas) {
  if (p >= lista.length) return salidas;
  const s = lista[p];
  if (esSalto(s)) return [s];
  if (s.t === 'bloque') {
    return equivalentes(s.cuerpo, 0, [{ t: 'romper', etiqueta: s.etiqueta }].concat(equivalentes(lista, p + 1, salidas)));
  }
  return [];
}

/**
 * Quita los saltos que llevan a donde de todos modos se iba a llegar.
 * @param {Array} salidas  Los saltos que equivalen a llegar al final de la lista.
 */
function quitarSaltosDeMas (lista, salidas) {
  let hubo = false;
  for (let i = lista.length - 1; i >= 0; i--) {
    const despues = equivalentes(lista, i + 1, salidas);
    const s = lista[i];
    switch (s.t) {
      case 'si':
        hubo = quitarSaltosDeMas(s.entonces, despues) || hubo;
        hubo = quitarSaltosDeMas(s.sino, despues) || hubo;
        break;
      case 'bloque':
        hubo = quitarSaltosDeMas(s.cuerpo, [{ t: 'romper', etiqueta: s.etiqueta }].concat(despues)) || hubo;
        break;
      case 'ciclo': case 'mientras': case 'hacer': case 'para':
        // Llegar al final del cuerpo es volver a empezar (o revisar la condicion)
        hubo = quitarSaltosDeMas(s.cuerpo, [{ t: 'continuar', etiqueta: s.etiqueta }]) || hubo;
        break;
      case 'intentar':
        hubo = quitarSaltosDeMas(s.cuerpo, despues) || hubo;
        hubo = quitarSaltosDeMas(s.manejo, despues) || hubo;
        break;
      case 'opcion': {
        // Al final del ultimo caso se sale del switch; al final de otro, se
        // sigue con el caso de abajo.
        let alFinal = [{ t: 'romper', etiqueta: s.etiqueta }].concat(despues);
        for (let k = s.casos.length - 1; k >= 0; k--) {
          hubo = quitarSaltosDeMas(s.casos[k].cuerpo, alFinal) || hubo;
          alFinal = equivalentes(s.casos[k].cuerpo, 0, alFinal);
        }
        // Un default vacio al final no hace nada
        const ultimo = s.casos[s.casos.length - 1];
        if (ultimo && ultimo.defecto && ultimo.cuerpo.length === 0 && ultimo.valores.length === 0) {
          s.casos.pop();
          hubo = true;
        }
        break;
      }
      default: break;
    }
    if (esSalto(s) && despues.some((d) => mismoSalto(d, s))) {
      lista.splice(i, 1);
      hubo = true;
    }
  }
  return hubo;
}

/** Quita lo que va despues de una sentencia que no termina (un salto, un if que salta por los dos lados...). */
function quitarInalcanzable (lista) {
  let hubo = false;
  for (let i = 0; i < lista.length; i++) {
    listasDe(lista[i]).forEach((l) => { hubo = quitarInalcanzable(l) || hubo; });
    if (!puedeTerminar(lista[i]) && i < lista.length - 1) {
      lista.splice(i + 1);
      hubo = true;
    }
  }
  return hubo;
}

// ====================================================================
// Bloques con etiqueta
// ====================================================================

/**
 * Si un bloque termina con un ciclo (o con otro bloque), un break al bloque
 * desde adentro de ese ciclo es lo mismo que un break al ciclo:
 *
 *   L7: {                              L5: while (true) {
 *     L5: while (true) {          ->       ... break L5 ...
 *       ... break L7 ...               }
 *     }
 *   }
 */
function reapuntarRompers (lista) {
  let hubo = false;
  recorrer(lista, (s) => {
    if (s.t !== 'bloque') return;
    alFinalDe(s.cuerpo).forEach((ultima) => {
      recorrer(listasDe(ultima).flat(), (x) => {
        if (x.t === 'romper' && x.etiqueta === s.etiqueta) {
          x.etiqueta = ultima.etiqueta;
          hubo = true;
        }
      });
    });
  });
  return hubo;
}

/**
 * Los ciclos, bloques y switch que quedan "al final" de una lista: al salir
 * de ellos se llega al final de la lista. El ultimo de la lista, y si es un
 * if (o un try), los que quedan al final de cada uno de sus lados.
 */
function alFinalDe (lista) {
  if (lista.length === 0) return [];
  const s = lista[lista.length - 1];
  if (esCiclo(s) || s.t === 'bloque' || s.t === 'opcion') return [s];
  if (s.t === 'si') return alFinalDe(s.entonces).concat(alFinalDe(s.sino));
  if (s.t === 'intentar') return alFinalDe(s.cuerpo).concat(alFinalDe(s.manejo));
  return [];
}

/** Un bloque con etiqueta al que nadie salta: sus sentencias van sueltas. */
function quitarBloquesSinUso (lista) {
  let hubo = false;
  for (let i = 0; i < lista.length; i++) {
    const s = lista[i];
    listasDe(s).forEach((l) => { hubo = quitarBloquesSinUso(l) || hubo; });
    if (s.t === 'bloque' && !rompeA(s.cuerpo, s.etiqueta)) {
      lista.splice(i, 1, ...s.cuerpo);
      i--;
      hubo = true;
    }
  }
  return hubo;
}

// ====================================================================
// if
// ====================================================================

/** Cuantas sentencias hay (para decidir que lado del if va adentro). */
function tamano (lista) {
  let n = 0;
  recorrer(lista, () => { n++; });
  return n;
}

/** Una condicion que no hace nada al calcularse (se puede quitar). */
function esPura (c) {
  const info = efectos(c, () => true);
  return !info.efecto && !info.lanza;
}

/**
 *   if (c) { } else { B }        ->  if (!c) { B }
 *   if (c) { A } else { }        ->  if (c) { A }
 *   if (c) { A; salto } else { B }   ->  if (c) { A; salto }  B
 *   if (c) { if (d) { A } }      ->  if (c && d) { A }
 */
function normalizarSi (lista) {
  let hubo = false;
  for (let i = 0; i < lista.length; i++) {
    const s = lista[i];
    listasDe(s).forEach((l) => { hubo = normalizarSi(l) || hubo; });
    if (s.t !== 'si') continue;

    if (s.entonces.length === 0 && s.sino.length === 0 && esPura(s.cond)) {
      lista.splice(i, 1);
      i--;
      hubo = true;
      continue;
    }
    if (s.entonces.length === 0 && s.sino.length > 0) {
      s.cond = negar(s.cond);
      s.entonces = s.sino;
      s.sino = [];
      hubo = true;
    }
    if (s.sino.length > 0) {
      const saltaEntonces = !listaTermina(s.entonces);
      const saltaSino = !listaTermina(s.sino);
      // El lado que salta va adentro; el otro, despues del if. Si los dos
      // saltan, adentro va el mas corto. Si da igual, se prefiere la
      // condicion sin negar:  if (a > b) { A } else { B }  y no  if (!(a > b)) { B } else { A }
      const negada = s.cond.k === 'un' && s.cond.op === '!';
      const voltear = (saltaSino && !saltaEntonces) ||
        (saltaSino && saltaEntonces && (tamano(s.sino) < tamano(s.entonces) ||
          (tamano(s.sino) === tamano(s.entonces) && negada))) ||
        (!saltaSino && !saltaEntonces && negada);
      if (voltear) {
        const otro = s.entonces;
        s.cond = negar(s.cond);
        s.entonces = s.sino;
        s.sino = otro;
      }
      if (saltaEntonces || saltaSino) {
        lista.splice(i + 1, 0, ...s.sino);
        s.sino = [];
        hubo = true;
      }
    }
    // if (c) { if (d) { A } }  ->  if (c && d) { A }
    if (s.sino.length === 0 && s.entonces.length === 1 && s.entonces[0].t === 'si' && s.entonces[0].sino.length === 0) {
      const adentro = s.entonces[0];
      s.cond = Object.assign({ k: 'bin', op: '&&', a: s.cond, b: adentro.cond }, { t: 'logico' });
      s.entonces = adentro.entonces;
      hubo = true;
    }
  }
  return hubo;
}

// ====================================================================
// Ciclos
// ====================================================================

const esRomperA = (s, etiqueta) => s.t === 'romper' && s.etiqueta === etiqueta;

/** if (c) { break L; }  sin else. */
const siRompe = (s, etiqueta) => s && s.t === 'si' && s.sino.length === 0 &&
  s.entonces.length === 1 && esRomperA(s.entonces[0], etiqueta);

/** if (c) { salto }  sin else (break, continue o return). */
const siSalta = (s) => s && s.t === 'si' && s.sino.length === 0 && s.entonces.length === 1 && esSalto(s.entonces[0]);

/** Los nombres que lee una expresion. */
function usa (e, n) {
  return cuentaUsos(e, n) > 0;
}

/** Cuantas veces aparece un nombre en una lista de sentencias (como valor o como destino). */
function aparece (lista, n) {
  let veces = 0;
  const contar = (e) => { if (e) veces += cuentaUsos(e, n); };
  recorrer(lista, (s) => {
    if ((s.t === 'asignar' || s.t === 'declarar') && s.nombre === n) veces++;
    if (s.t === 'guardar' && s.arreglo === n) veces++;
    if (s.t === 'intentar' && s.variable === n) veces++;
    [s.valor, s.indice, s.llamada, s.cond].forEach(contar);
    if (s.t === 'para') {
      [s.inicio, s.paso].forEach((x) => {
        if (x.nombre === n) veces++;
        contar(x.valor);
      });
    }
  });
  return veces;
}

/** true si la sentencia le da valor a n sin leerlo antes (n = 0; o un for que empieza asi). */
function empiezaConValorNuevo (s, n) {
  if (s.t === 'asignar') return s.nombre === n && !usa(s.valor, n);
  if (s.t === 'para') return s.inicio.nombre === n && !usa(s.inicio.valor, n);
  return false;
}

/**
 * true si el contador n del ciclo (lista[i] es su valor inicial y lista[j]
 * el ciclo) es solo de ese ciclo: el valor con el que termina no lo lee
 * nadie. Asi el for puede declararlo (for (int i = 0; ...)) y otro ciclo
 * puede volver a usar el mismo nombre.
 *   - n solo aparece en esta lista de sentencias;
 *   - lo primero que se hace con n en la lista es darle un valor nuevo
 *     (por si la lista es el cuerpo de otro ciclo y se repite);
 *   - despues del ciclo, lo siguiente que se hace con n es darle un valor nuevo.
 */
function contadorPropio (lista, i, j, n, metodo) {
  if (aparece(metodo, n) !== aparece(lista, n)) return false;
  const primera = lista.find((s) => aparece([s], n) > 0);
  if (!empiezaConValorNuevo(primera, n)) return false;
  const despues = lista.slice(j + 1).find((s) => aparece([s], n) > 0);
  return !despues || empiezaConValorNuevo(despues, n);
}

/**
 *   L: while (true) { if (c) break L; A }    ->   while (!c) { A }
 *   L: while (true) { A; if (c) break L; }   ->   do { A } while (!c);
 * y un while con su contador:
 *   i = 0; while (i < n) { A; i = i + 1; }   ->   for (i = 0; i < n; i = i + 1) { A }
 * (solo si i no se usa fuera del ciclo: asi se declara en el for).
 */
function reconocerCiclos (lista, metodo) {
  let hubo = false;
  for (let i = 0; i < lista.length; i++) {
    const s = lista[i];
    listasDe(s).forEach((l) => { hubo = reconocerCiclos(l, metodo) || hubo; });

    if (s.t === 'ciclo') {
      const primera = s.cuerpo[0];
      const ultima = s.cuerpo[s.cuerpo.length - 1];
      // if (c) { salto }: con break al ciclo, o con otro salto si nadie mas sale
      // del ciclo con break (ese salto se escribe despues del ciclo)
      const sale = (x) => siRompe(x, s.etiqueta) ||
        (siSalta(x) && !rompeA(s.cuerpo, s.etiqueta) && i === lista.length - 1);
      const comoMientras = sale(primera);
      const comoHacer = sale(ultima) && ultima !== primera && !continuaA(s.cuerpo, s.etiqueta);
      // Si se puede de las dos formas, la pista de la fase 4 dice cual era (hacer o mientras)
      const usar = comoMientras && !(comoHacer && s.pista === 'hacer') ? primera : (comoHacer ? ultima : null);
      if (usar) {
        const nuevo = usar === primera
          ? { t: 'mientras', etiqueta: s.etiqueta, cond: negar(usar.cond), cuerpo: s.cuerpo.slice(1), linea: usar.linea }
          : { t: 'hacer', etiqueta: s.etiqueta, cond: negar(usar.cond), cuerpo: s.cuerpo.slice(0, -1), linea: usar.linea };
        const salto = usar.entonces[0];
        lista.splice(i, 1, ...(esRomperA(salto, s.etiqueta) ? [nuevo] : [nuevo, salto]));
        hubo = true;
      }
    }

    const ciclo = lista[i];
    const antes = lista[i - 1];
    if (ciclo.t === 'mientras' && antes && antes.t === 'asignar' && ciclo.cuerpo.length > 1) {
      const v = antes.nombre;
      const paso = ciclo.cuerpo[ciclo.cuerpo.length - 1];
      const esPaso = paso.t === 'asignar' && paso.nombre === v && usa(paso.valor, v);
      if (esPaso && !usa(antes.valor, v) && usa(ciclo.cond, v) && !continuaA(ciclo.cuerpo, ciclo.etiqueta) &&
          contadorPropio(lista, i - 1, i, v, metodo)) {
        lista.splice(i - 1, 2, {
          t: 'para', etiqueta: ciclo.etiqueta, inicio: antes, cond: ciclo.cond, paso,
          cuerpo: ciclo.cuerpo.slice(0, -1), linea: antes.linea
        });
        i--;
        hubo = true;
      }
    }
  }
  return hubo;
}

// ====================================================================
// Las etiquetas que hay que escribir
// ====================================================================

/**
 * Un break o continue al ciclo de mas adentro no necesita etiqueta:
 * break L5  ->  break.  Solo los demas la llevan, y solo esos ciclos y
 * bloques escriben su etiqueta (L5: while ...).
 */
function marcarEtiquetas (lista) {
  const usadas = new Set();
  // break sin etiqueta sale del ciclo o switch de mas adentro; continue, del ciclo
  const visitar = (l, rompibles, ciclos) => l.forEach((s) => {
    if (s.t === 'romper' || s.t === 'continuar') {
      const pila = s.t === 'romper' ? rompibles : ciclos;
      const deAdentro = pila.length > 0 && pila[pila.length - 1] === s.etiqueta;
      s.sinEtiqueta = deAdentro;
      if (!deAdentro) usadas.add(s.etiqueta);
    }
    const r = esCiclo(s) || s.t === 'opcion' ? rompibles.concat([s.etiqueta]) : rompibles;
    const c = esCiclo(s) ? ciclos.concat([s.etiqueta]) : ciclos;
    listasDe(s).forEach((x) => visitar(x, r, c));
  });
  visitar(lista, [], []);
  recorrer(lista, (s) => {
    if (esCiclo(s) || s.t === 'bloque' || s.t === 'opcion') s.conEtiqueta = s.t === 'bloque' || usadas.has(s.etiqueta);
  });
}

/**
 * Un while o un for cuya condicion Java ya sabe que es falsa no se repite
 * nunca, y Java ni siquiera lo acepta (su cuerpo seria "unreachable"): se
 * quita. Del for se queda su inicio, que si se hace.
 */
function ciclosConstantes (lista) {
  let hubo = false;
  for (let i = 0; i < lista.length; i++) {
    const s = lista[i];
    listasDe(s).forEach((l) => { hubo = ciclosConstantes(l) || hubo; });
    if ((s.t === 'mientras' || s.t === 'para') && condicionConstante(s.cond) === false) {
      lista.splice(i, 1, ...(s.t === 'para' ? [s.inicio] : []));
      i--;
      hubo = true;
    }
  }
  return hubo;
}

/** Cambia con f cada expresion del arbol (de adentro hacia afuera). */
function mapearExpresiones (lista, f) {
  const cambiar = (e) => {
    if (!e || typeof e !== 'object' || !e.k) return e;
    const copia = Object.assign({}, e);
    ['a', 'b', 'i', 'n'].forEach((c) => { if (copia[c] && copia[c].k) copia[c] = cambiar(copia[c]); });
    if (copia.args) copia.args = copia.args.map(cambiar);
    return f(copia);
  };
  recorrer(lista, (s) => {
    ['valor', 'indice', 'llamada', 'cond'].forEach((c) => { if (s[c]) s[c] = cambiar(s[c]); });
    if (s.t === 'para') {
      [s.inicio, s.paso].forEach((x) => { if (x.valor) x.valor = cambiar(x.valor); });
    }
  });
}

/**
 * Las negaciones que se pueden escribir sin el !:
 *   !(a == b) -> a != b      !(i < n) -> i >= n (enteros)      !!x -> x
 */
function quitarNegaciones (lista) {
  mapearExpresiones(lista, (e) => {
    if (e.k !== 'un' || e.op !== '!') return e;
    const otra = negar(e.a);
    return otra.k === 'un' && otra.op === '!' ? e : otra;
  });
}

/**
 * Limpia el cuerpo de un metodo.
 * @param {Array}   cuerpo  El arbol que dio el estructurador (se cambia ahi mismo).
 * @param {boolean} esVacio Si el metodo es void (llegar al final es return).
 */
function limpiar (cuerpo, esVacio) {
  const salidas = esVacio ? [{ t: 'retornar', valor: null }] : [];
  for (let vuelta = 0; vuelta < 100; vuelta++) {
    let hubo = false;
    hubo = quitarSaltosDeMas(cuerpo, salidas) || hubo;
    hubo = quitarInalcanzable(cuerpo) || hubo;
    hubo = reapuntarRompers(cuerpo) || hubo;
    hubo = quitarBloquesSinUso(cuerpo) || hubo;
    hubo = normalizarSi(cuerpo) || hubo;
    hubo = reconocerCiclos(cuerpo, cuerpo) || hubo;
    hubo = ciclosConstantes(cuerpo) || hubo;
    if (!hubo) break;
  }
  quitarNegaciones(cuerpo);
  marcarEtiquetas(cuerpo);
  return cuerpo;
}

module.exports = { limpiar, recorrer, listasDe, aparece, puedeTerminar, listaTermina };
