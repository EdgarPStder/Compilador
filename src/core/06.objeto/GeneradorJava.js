/**
 * GeneradorJava.js
 * FASE 6 del compilador: la generacion de CODIGO OBJETO (pestaña 6).
 *
 * El lenguaje destino de SwordByte es Java. Esta fase toma el codigo
 * intermedio YA OPTIMIZADO (fase 5) y escribe el programa en Java, listo
 * para compilarse con  javac  y ejecutarse con  java:
 *
 *   Codigo optimizado (fase 5)          Codigo objeto: Java (fase 6)
 *   ---------------------------         ---------------------------------
 *   funcion clasePrincipal()            public class control {
 *       i = 1                               public static void main(String[] args) {
 *   L5:                                         for (int i = 1; i <= 3; i++) {
 *       t5 = i <= 3                                 System.out.println(i);
 *       ifFalse t5 goto L6                      }
 *       param i                             }
 *       call imprimirLn, 1              }
 *       i = i + 1
 *       goto L5
 *   L6:
 *   fin clasePrincipal
 *
 * Por partes (una por archivo):
 *   1. Sentencias.js     baja el codigo de tres direcciones a sentencias y
 *                        calcula el tipo de cada temporal.
 *   2. Estructurador.js  junta las instrucciones en expresiones, reconoce
 *                        los Y / O, y cambia saltos y etiquetas por while,
 *                        if y try (Java no tiene goto).
 *   3. Limpieza.js       lo deja legible: while (c), do-while, for, else if...
 *   4. Aqui:             declara cada variable donde se usa por primera vez.
 *   5. EscritorJava.js   escribe el texto de Java.
 *
 * Como sale del codigo OPTIMIZADO, el Java hace solo lo que hace falta: lo
 * que la fase 5 calculo desde antes ya llega calculado, y lo que quito no
 * aparece.
 */

const { funcionesDe, inferirTipos, bajar, retornoNativo } = require('./Sentencias');
const { estructurar } = require('./Estructurador');
const { limpiar, recorrer, aparece } = require('./Limpieza');
const { EscritorJava, SANGRIA } = require('./EscritorJava');
const { tipoJava } = require('./TiposJava');
const { cuentaUsos } = require('./Expresiones');
const { NOMBRE_EQUIPO } = require('../comun/Equipo');
const { resaltarRenglonJava } = require('./ResaltadoJava');

/**
 * Las palabras de Java que no pueden ser nombres, y los nombres que el
 * programa Java usa por su cuenta (System, Math, String...): si una variable
 * se llamara asi, taparia al de Java. Un nombre asi se cambia:  new -> new_
 */
const RESERVADAS_JAVA = new Set([
  'abstract', 'assert', 'boolean', 'break', 'byte', 'case', 'catch', 'char', 'class', 'const',
  'continue', 'default', 'do', 'double', 'else', 'enum', 'extends', 'final', 'finally', 'float',
  'for', 'goto', 'if', 'implements', 'import', 'instanceof', 'int', 'interface', 'long', 'native',
  'new', 'package', 'private', 'protected', 'public', 'return', 'short', 'static', 'strictfp',
  'super', 'switch', 'synchronized', 'this', 'throw', 'throws', 'transient', 'try', 'void',
  'volatile', 'while', 'true', 'false', 'null', 'var', 'yield', 'record', 'sealed', 'permits', '_',
  'String', 'System', 'Math', 'Integer', 'Long', 'Short', 'Byte', 'Float', 'Double', 'Boolean',
  'Character', 'Object', 'Thread', 'Exception', 'InterruptedException', 'Scanner', 'java', 'main', 'args'
]);

/** Las funciones de apoyo: lo que SwordByte tiene y Java no trae tal cual. */
const APOYO = {
  aleatorio: [
    '/** aleatorio(minimo, maximo): un entero al azar entre los dos (los dos cuentan). */',
    'static int aleatorio(long minimo, long maximo) {',
    '    return (int) (Math.random() * (maximo - minimo + 1) + minimo);',
    '}'
  ],
  esperar: [
    '/** esperar(milisegundos): detiene el programa ese tiempo. */',
    'static void esperar(long milisegundos) {',
    '    try {',
    '        Thread.sleep(milisegundos);',
    '    } catch (InterruptedException e) {',
    '        Thread.currentThread().interrupt();',
    '    }',
    '}'
  ],
  logaritmo: [
    '/** logaritmo(base, numero): el logaritmo de numero en esa base. */',
    'static double logaritmo(double base, double numero) {',
    '    return Math.log(numero) / Math.log(base);',
    '}'
  ]
};

/** Las formulas de geometria de SwordByte (las mismas que usa el interprete de las pruebas). */
const GEOMETRIA = {
  perimetro: {
    circulo: ['double radio', '2 * Math.PI * radio'],
    cuadrado: ['double lado', '4 * lado'],
    rectangulo: ['double base, double altura', '2 * (base + altura)'],
    triangulo: ['double a, double b, double c', 'a + b + c']
  },
  area: {
    circulo: ['double radio', 'Math.PI * radio * radio'],
    cuadrado: ['double lado', 'lado * lado'],
    rectangulo: ['double base, double altura', 'base * altura'],
    triangulo: ['double base, double altura', 'base * altura / 2']
  },
  volumen: {
    cubo: ['double lado', 'lado * lado * lado'],
    esfera: ['double radio', '4.0 / 3 * Math.PI * radio * radio * radio'],
    cilindro: ['double radio, double altura', 'Math.PI * radio * radio * altura'],
    cono: ['double radio, double altura', 'Math.PI * radio * radio * altura / 3'],
    prisma: ['double areaBase, double altura', 'areaBase * altura'],
    piramide: ['double areaBase, double altura', 'areaBase * altura / 3']
  }
};

const NOMBRES_FAMILIA = { perimetro: 'perímetro', area: 'área', volumen: 'volumen' };

// ====================================================================
// Paso 4: las declaraciones
// ====================================================================

/** true si la expresion usa el nombre n. */
const usaNombre = (e, n) => e && cuentaUsos(e, n) > 0;

/**
 * true si en la lista, lo primero que se hace con n es darle valor (sin
 * leerlo): en un ciclo, asi ninguna vuelta usa el valor de la vuelta
 * anterior, y n se puede declarar adentro. Si n solo aparece dentro de una
 * sentencia (un if, otro ciclo...), se revisa alla adentro.
 */
function empiezaAsignando (lista, n) {
  const conN = lista.filter((s) => aparece([s], n) > 0);
  if (conN.length === 0) return false;
  const s = conN[0];
  if (s.t === 'asignar' && s.nombre === n && !usaNombre(s.valor, n)) return true;
  // for (j = 1; ...) le da valor a j antes que nada
  if (s.t === 'para' && s.inicio.t === 'asignar' && s.inicio.nombre === n && !usaNombre(s.inicio.valor, n)) return true;
  if (conN.length > 1) return false;
  switch (s.t) {
    case 'bloque': return empiezaAsignando(s.cuerpo, n);
    case 'si':
      return !usaNombre(s.cond, n) && [s.entonces, s.sino].every((l) => aparece(l, n) === 0 || empiezaAsignando(l, n));
    case 'ciclo': case 'mientras': case 'hacer':
      return !usaNombre(s.cond, n) && empiezaAsignando(s.cuerpo, n);
    case 'para':
      return s.inicio.nombre !== n && s.paso.nombre !== n && !usaNombre(s.cond, n) &&
        !usaNombre(s.inicio.valor, n) && !usaNombre(s.paso.valor, n) && empiezaAsignando(s.cuerpo, n);
    case 'intentar': {
      const lados = [s.cuerpo, s.manejo].filter((l) => aparece(l, n) > 0);
      return s.variable !== n && lados.length === 1 && empiezaAsignando(lados[0], n);
    }
    case 'opcion': {
      const casos = s.casos.filter((c) => aparece(c.cuerpo, n) > 0);
      return !usaNombre(s.valor, n) && casos.length === 1 && empiezaAsignando(casos[0].cuerpo, n);
    }
    default: return false;
  }
}

/**
 *   int[] d = new int[3];             int[] d = {10, 20, 30};
 *   d[0] = 10;                  ->
 *   d[1] = 20;
 *   d[2] = 30;
 * Solo si se dan todos los valores, en orden, justo despues.
 */
function inicializadores (lista) {
  for (let i = 0; i < lista.length; i++) {
    const s = lista[i];
    [s.entonces, s.sino, s.cuerpo, s.manejo].forEach((l) => { if (Array.isArray(l)) inicializadores(l); });
    if (s.casos) s.casos.forEach((c) => inicializadores(c.cuerpo));
    if (s.t !== 'declarar' || !s.valor || s.valor.k !== 'nuevo' || s.valor.n.k !== 'lit') continue;
    const n = Number(s.valor.n.v);
    if (!(n > 0) || n > 64 || i + n >= lista.length + 1) continue;
    const valores = [];
    for (let k = 0; k < n; k++) {
      const g = lista[i + 1 + k];
      if (!g || g.t !== 'guardar' || g.arreglo !== s.nombre || g.indice.k !== 'lit' || g.indice.v !== String(k) ||
          usaNombre(g.valor, s.nombre)) break;
      valores.push(g.valor);
    }
    if (valores.length !== n) continue;
    s.valor = { k: 'arreglo', elementos: valores, t: s.tipo };
    lista.splice(i + 1, n);
  }
}

/**
 * Declara la variable n (de tipo "tipo") lo mas adentro y lo mas tarde que
 * se pueda, como lo haria una persona:
 *
 *   - Si lo primero que se hace con ella es darle valor:  int x = 5;
 *   - Si solo se usa dentro de un for que empieza dandole valor:
 *     for (int i = 0; ...)
 *   - Si solo se usa dentro de un if (en cada lado por su cuenta), dentro de
 *     un ciclo que en cada vuelta empieza dandole valor, o solo dentro del
 *     try (o solo dentro del catch): se declara alla adentro.
 *   - Si no: se declara antes, con su valor inicial (int x = 0;). Java
 *     exige que una variable tenga valor antes de usarla.
 */
function colocar (lista, n, tipo) {
  const indices = [];
  lista.forEach((s, i) => { if (aparece([s], n) > 0) indices.push(i); });
  if (indices.length === 0) return;
  const declarar = (valor, linea) => ({ t: 'declarar', nombre: n, tipo, valor, linea });
  const i0 = indices[0];
  const s = lista[i0];

  if (s.t === 'asignar' && s.nombre === n && !usaNombre(s.valor, n)) {
    lista[i0] = declarar(s.valor, s.linea);
    return;
  }
  const comoInicioDeFor = (x) => x.t === 'para' && x.inicio.t === 'asignar' && x.inicio.nombre === n && !usaNombre(x.inicio.valor, n);
  if (indices.every((i) => comoInicioDeFor(lista[i]))) {
    indices.forEach((i) => { lista[i].inicio = declarar(lista[i].inicio.valor, lista[i].inicio.linea); });
    return;
  }
  if (indices.length === 1) {
    if (s.t === 'bloque') return colocar(s.cuerpo, n, tipo);
    if (s.t === 'si' && !usaNombre(s.cond, n)) {
      colocar(s.entonces, n, tipo);
      colocar(s.sino, n, tipo);
      return;
    }
    if ((s.t === 'ciclo' || s.t === 'mientras' || s.t === 'hacer') && !usaNombre(s.cond, n) && empiezaAsignando(s.cuerpo, n)) {
      return colocar(s.cuerpo, n, tipo);
    }
    if (s.t === 'para' && s.inicio.nombre !== n && s.paso.nombre !== n && !usaNombre(s.cond, n) &&
        !usaNombre(s.inicio.valor, n) && !usaNombre(s.paso.valor, n) && empiezaAsignando(s.cuerpo, n)) {
      return colocar(s.cuerpo, n, tipo);
    }
    if (s.t === 'intentar' && s.variable !== n) {
      const enCuerpo = aparece(s.cuerpo, n) > 0;
      const enManejo = aparece(s.manejo, n) > 0;
      if (enCuerpo !== enManejo) return colocar(enCuerpo ? s.cuerpo : s.manejo, n, tipo);
    }
    // En un switch, solo si la usa un caso (en Java todos los casos comparten
    // las variables, y saltar a otro caso no le daria valor)
    if (s.t === 'opcion' && !usaNombre(s.valor, n)) {
      const casos = s.casos.filter((c) => aparece(c.cuerpo, n) > 0);
      if (casos.length === 1 && empiezaAsignando(casos[0].cuerpo, n)) return colocar(casos[0].cuerpo, n, tipo);
    }
  }
  lista.splice(i0, 0, declarar(null, s.linea));
}

/** Los nombres a los que el metodo les da valor (sus variables y temporales). */
function nombresConValor (cuerpo) {
  const nombres = new Set();
  recorrer(cuerpo, (s) => {
    if (s.t === 'asignar') nombres.add(s.nombre);
    if (s.t === 'para' && s.inicio.t === 'asignar') nombres.add(s.inicio.nombre);
  });
  return nombres;
}

// ====================================================================
// Nombres de Java
// ====================================================================

/**
 * Como se llama en Java cada nombre del programa: igual, salvo los que
 * chocan con Java (ver RESERVADAS_JAVA), que llevan _ al final.
 */
function nombresDeJava (todos) {
  const mapa = new Map();
  todos.forEach((n) => {
    let nuevo = n;
    while (RESERVADAS_JAVA.has(nuevo) || (nuevo !== n && todos.has(nuevo))) nuevo += '_';
    mapa.set(n, nuevo);
  });
  return (n) => (mapa.has(n) ? mapa.get(n) : n);
}

/** Todos los nombres que aparecen en el codigo intermedio. */
function nombresDelCodigo (instrucciones) {
  const nombres = new Set();
  const esNombre = (x) => /^[A-Za-z_À-ɏ][\wÀ-ɏ]*$/.test(x) && x !== 'verdadero' && x !== 'falso';
  instrucciones.forEach((ins) => {
    if (ins.op === 'etiqueta' || ins.op === 'goto' || ins.op === 'intentar') return;
    if (ins.op === 'funcion') {
      nombres.add(ins.arg1);
      (ins.arg2 ? ins.arg2.split(' ') : []).forEach((p) => nombres.add(p));
      return;
    }
    if (ins.op === 'call') {
      if (!/\./.test(ins.arg1)) nombres.add(ins.arg1);
      if (ins.resultado) nombres.add(ins.resultado);
      return;
    }
    if (['if', 'ifFalse', 'if=='].indexOf(ins.op) !== -1) {
      [ins.arg1, ins.arg2].forEach((x) => { if (esNombre(x)) nombres.add(x); });
      return;
    }
    if (ins.op === 'convertir') {
      [ins.arg1, ins.resultado].forEach((x) => { if (esNombre(x)) nombres.add(x); });
      return;
    }
    [ins.arg1, ins.arg2, ins.resultado].forEach((x) => { if (x && esNombre(x)) nombres.add(x); });
  });
  return nombres;
}

// ====================================================================
// La clase completa
// ====================================================================

/**
 * Genera el programa Java.
 *
 * @param {object} optimizacion El resultado de la fase 5.
 * @returns {object} { estado: 'vacio' | 'errores-previos' | 'generado' | 'error',
 *   errores, clase, archivo (clase.java), codigo (el texto), lineas
 *   ([{ texto, linea, html }]: linea es el renglon del programa SwordByte de
 *   donde sale, si se sabe, y html el renglon con colores), metodos
 *   (cuantos), apoyo (las funciones de apoyo que se usaron), instrucciones
 *   (cuantas tenia el codigo optimizado) }
 */
function generarCodigoObjeto (optimizacion) {
  const resultado = {
    estado: 'generado',
    errores: [],
    clase: '',
    archivo: '',
    codigo: '',
    lineas: [],
    metodos: 0,
    apoyo: [],
    instrucciones: 0
  };

  if (!optimizacion || optimizacion.estado === 'vacio') {
    resultado.estado = 'vacio';
    return resultado;
  }
  if (optimizacion.estado !== 'optimizado') {
    resultado.estado = 'errores-previos';
    resultado.errores = optimizacion.errores;
    return resultado;
  }

  try {
    escribirPrograma(optimizacion, resultado);
  } catch (e) {
    // Si algo sale mal aqui es un error del compilador, no del programa.
    resultado.estado = 'error';
    resultado.errores = [{ fase: 'objeto', mensaje: `No se pudo generar el código Java: ${e.message}`, linea: 0, columna: 0 }];
    resultado.codigo = '';
    resultado.lineas = [];
    resultado.pila = e.stack;
  }
  return resultado;
}

function escribirPrograma (optimizacion, resultado) {
  const simbolos = new Map(optimizacion.simbolos.map((f) => [f.nombre, f]));
  const funciones = funcionesDe(optimizacion.instrucciones);
  const todos = nombresDelCodigo(optimizacion.instrucciones);
  todos.add(optimizacion.clase);

  const nombre = nombresDeJava(todos);
  let entrada = 'entrada';
  while (todos.has(entrada)) entrada += '_';

  const temporal = new RegExp(`^${optimizacion.prefijos.temporal}\\d+$`);
  const retorno = (f) => (simbolos.has(f) ? simbolos.get(f).tipoRetorno : retornoNativo(f));
  const contexto = { esTemporal: (n) => temporal.test(n), esDelPrograma: (f) => simbolos.has(f) };

  const firmas = new Map();
  funciones.forEach((f) => {
    if (f.nombre === 'clasePrincipal') return;
    const s = simbolos.get(f.nombre);
    firmas.set(f.nombre, { tipoRetorno: s.tipoRetorno, tiposParametros: s.parametros.map((p) => s.variables[p]) });
  });

  const escritor = new EscritorJava({ nombre, funciones: firmas, entrada });
  const metodos = [];

  funciones.forEach((f) => {
    const s = simbolos.get(f.nombre);
    const tipos = inferirTipos(f.instrucciones, s.variables, retorno);
    const tipoDe = (n) => tipos.get(n);
    const sentencias = bajar(f.instrucciones, tipoDe, retorno);
    const cuerpo = limpiar(estructurar(sentencias, Object.assign({ tipoDe }, contexto)), s.tipoRetorno === 'vacio');

    // Las variables y los temporales que quedaron se declaran (los parametros y
    // la variable del catch ya vienen declarados)
    const declarados = new Set(s.parametros);
    recorrer(cuerpo, (x) => { if (x.t === 'intentar') declarados.add(x.variable); });
    nombresConValor(cuerpo).forEach((n) => {
      if (!declarados.has(n)) colocar(cuerpo, n, tipos.get(n));
    });
    inicializadores(cuerpo);

    // El texto del metodo
    escritor.tipoDe = tipoDe;
    escritor.tipoRetorno = s.tipoRetorno;
    escritor.columnas = s.columnas || {};
    const renglones = [];
    const esPrincipal = f.nombre === 'clasePrincipal';
    if (esPrincipal) {
      renglones.push({ texto: `${SANGRIA}public static void main(String[] args) {`, linea: f.linea });
    } else {
      const parametros = s.parametros.map((p) => `${tipoJava(s.variables[p])} ${nombre(p)}`).join(', ');
      renglones.push({ texto: `${SANGRIA}static ${tipoJava(s.tipoRetorno)} ${nombre(f.nombre)}(${parametros}) {`, linea: f.linea });
    }
    escritor.lista(cuerpo, 2, renglones);
    renglones.push({ texto: `${SANGRIA}}`, linea: null });
    metodos.push(renglones);
  });

  // ---------------- El archivo ----------------
  const clase = nombre(optimizacion.clase);
  const L = [];
  const pon = (texto, linea = null) => L.push({ texto, linea });

  if (escritor.usaScanner) {
    pon('import java.util.Scanner;');
    pon('');
  }
  pon('/**');
  pon(` * ${clase}.java`);
  pon(` * Programa SwordByte traducido a Java por el Compilador ${NOMBRE_EQUIPO}`);
  pon(' * (fase 6: código objeto, a partir del código intermedio optimizado).');
  pon(' *');
  pon(` * Compilar:  javac -encoding UTF-8 ${clase}.java`);
  pon(` * Ejecutar:  java ${clase}`);
  pon(' */');
  pon(`public class ${clase} {`);
  if (escritor.usaScanner) {
    pon('');
    pon(`${SANGRIA}/** De aquí lee leer(...) lo que se escribe con el teclado. */`);
    pon(`${SANGRIA}static Scanner ${entrada} = new Scanner(System.in);`);
  }
  metodos.forEach((renglones) => {
    pon('');
    L.push(...renglones);
  });

  // ---------------- Las funciones de apoyo ----------------
  const apoyo = Array.from(escritor.apoyo);
  if (apoyo.length > 0) {
    pon('');
    pon(`${SANGRIA}// ------------------------------------------------------------------`);
    pon(`${SANGRIA}// Funciones de apoyo: lo que SwordByte tiene y Java no trae tal cual`);
    pon(`${SANGRIA}// ------------------------------------------------------------------`);
  }
  Object.keys(APOYO).forEach((f) => {
    if (!escritor.apoyo.has(f)) return;
    pon('');
    APOYO[f].forEach((t) => pon(SANGRIA + t));
  });
  Object.keys(GEOMETRIA).forEach((familia) => {
    const figuras = Object.keys(GEOMETRIA[familia]).filter((fig) => escritor.apoyo.has(`${familia}.${fig}`));
    if (figuras.length === 0) return;
    pon('');
    pon(`${SANGRIA}/** ${familia}.figura(...): el ${NOMBRES_FAMILIA[familia]} de cada figura. */`);
    pon(`${SANGRIA}static class ${familia} {`);
    figuras.forEach((fig) => {
      const [parametros, formula] = GEOMETRIA[familia][fig];
      pon(`${SANGRIA}${SANGRIA}static double ${fig}(${parametros}) {`);
      pon(`${SANGRIA}${SANGRIA}${SANGRIA}return ${formula};`);
      pon(`${SANGRIA}${SANGRIA}}`);
    });
    pon(`${SANGRIA}}`);
  });
  pon('}');

  resultado.clase = clase;
  resultado.archivo = `${clase}.java`;
  resultado.lineas = L.map((l) => Object.assign(l, { html: resaltarRenglonJava(l.texto) }));
  resultado.codigo = L.map((l) => l.texto).join('\n') + '\n';
  resultado.metodos = metodos.length;
  resultado.apoyo = apoyo;
  resultado.instrucciones = optimizacion.instrucciones.length;
}

module.exports = { generarCodigoObjeto };
