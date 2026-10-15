/**
 * GeneradorIntermedio.js
 * FASE 4 del compilador: la generacion de codigo intermedio (pestaña 4).
 *
 * Traduce el arbol de un programa que ya paso las tres fases anteriores a
 * CODIGO DE TRES DIRECCIONES (ver Instrucciones.js): una lista de
 * instrucciones sencillas, cada una con una sola operacion.
 *
 *   SwordByte                        Codigo de tres direcciones
 *   -------------------------        --------------------------
 *   a = b + c * d;                   t1 = c * d
 *                                    t2 = b + t1
 *                                    a = t2
 *
 *   si (a > b) {                     t1 = a > b
 *       imprimirLn(a);               ifFalse t1 goto L1
 *   }                                param a
 *                                    call imprimirLn, 1
 *                                    L1:
 *
 * Aparecen dos clases de nombres nuevos:
 *   - TEMPORALES (t1, t2, ...): guardan los resultados a medio camino.
 *   - ETIQUETAS (L1, L2, ...): marcan a donde saltan las decisiones y los
 *     ciclos.
 *
 * Y las conversiones que Java hace solo se escriben (ver seEnsancha):
 *   decimal x = 5;                   x = (decimal) 5
 *
 * Solo se genera para un programa sin errores: si alguna de las tres fases
 * anteriores encontro uno, primero hay que corregirlo.
 */

const { Instrucciones: I } = require('./Instrucciones');
const { textoExpresion, textoInstruccion } = require('../03.semantico/TextoDeNodo');

/** Los operadores logicos (el lenguaje usa Y, O, NO; los demas son sinonimos). */
const Y = ['Y', 'AND', '&&'];
const O = ['O', 'OR', '||'];
const NO = ['NO', 'NOT', '!'];

/** Las instrucciones que llevan una etiqueta en "resultado" (ver renumerarEtiquetas). */
const CON_ETIQUETA = ['etiqueta', 'goto', 'if', 'ifFalse', 'if==', 'intentar'];

/**
 * true si guardar un valor de tipo "desde" en un lugar de tipo "hacia"
 * necesita una CONVERSION IMPLICITA (un "ensanchamiento"). Java la hace solo
 * cuando un entero se guarda en un decimal (o un flotante en un decimal):
 *   decimal x = 5;     guarda 5.0, no 5
 * En el codigo intermedio esa conversion se escribe, para que cada valor
 * tenga siempre su tipo:   x = (decimal) 5
 * Entre enteros (byte, corto, entero, largo) el valor no cambia.
 *
 * Los tipos los calculo el semantico (n.tipoCalculado).
 */
function seEnsancha (desde, hacia) {
  const decimales = ['flotante', 'decimal'];
  return decimales.indexOf(hacia) !== -1 && Boolean(desde) && desde !== hacia;
}

/** Una instruccion sin el ; del final:  entero i = 1;  ->  entero i = 1 */
const sinPuntoYComa = (texto) => texto.replace(/;$/, '');

/**
 * Como se lee el renglon de codigo del que sale cada grupo de instrucciones.
 * Las estructuras con bloque se muestran solo con su encabezado:
 *   si (edad >= 18)      para (entero i = 1; i <= 3; i++)
 */
function encabezado (n) {
  const e = textoExpresion;
  switch (n.tipo) {
    case 'Funcion':
      return `funcion ${n.tipoRetorno} ${n.nombre}(` +
        n.parametros.map((p) => `${p.tipoDato} ${p.nombre}`).join(', ') + ')';
    case 'ClasePrincipal': return 'clasePrincipal';
    case 'Si': return `si (${e(n.condicion)})`;
    case 'Para':
      return `para (${sinPuntoYComa(textoInstruccion(n.inicializacion))}; ${e(n.condicion)}; ` +
        `${sinPuntoYComa(textoInstruccion(n.actualizacion))})`;
    case 'Mientras': return `mientras (${e(n.condicion)})`;
    case 'HacerMientras': return 'hacer';
    case 'Opcion': return `opcion (${e(n.expresion)})`;
    case 'Intentar': return 'intentar';
    case 'Arreglo':
    case 'Matriz': {
      // Arreglo entero datos[3];    matriz entero t[2][2] = { … };
      const escritos = n.dimensiones.length === n.numDimensiones;
      const corchetes = Array.from({ length: n.numDimensiones },
        (_, k) => `[${escritos ? e(n.dimensiones[k]) : ''}]`).join('');
      return `${n.tipo === 'Matriz' ? 'matriz' : 'Arreglo'} ${n.tipoDato} ${n.nombre}${corchetes}` +
        (n.valores ? ' = { … };' : ';');
    }
    default: return textoInstruccion(n);
  }
}

/**
 * Un nombre para los temporales (o las etiquetas) que no choque con ningun
 * nombre del programa: si alguien llamo t1 a una variable, los temporales
 * pasan a ser tt1, tt2...
 */
function prefijoLibre (base, nombres) {
  let prefijo = base;
  const usado = (p) => nombres.some((n) => new RegExp(`^${p}\\d+$`).test(n));
  while (usado(prefijo)) prefijo += base;
  return prefijo;
}

class GeneradorIntermedio {
  /** @param {string[]} nombres Los identificadores del programa. */
  constructor (nombres) {
    this.instrucciones = [];

    this.prefijoTemporal = prefijoLibre('t', nombres);
    this.prefijoEtiqueta = prefijoLibre('L', nombres);
    this.temporales = 0;
    this.etiquetas = 0;

    /** matriz -> cuantas columnas tiene, para encontrar t[i][j] (ver posicion) */
    this.columnas = new Map();
    /** Las funciones del programa (para saber el tipo de sus parametros). */
    this.funciones = new Map();
    /** Lo que devuelve la funcion que se esta traduciendo. */
    this.tipoRetorno = 'vacio';
    /** A donde salta romper: la salida del ciclo u opcion mas de adentro. */
    this.salidas = [];

    /** Linea del codigo que se esta traduciendo. */
    this.linea = 0;
    /** El codigo de las instrucciones que se empiezan: va como comentario. */
    this.comentarios = [];
  }

  nuevoTemporal () {
    this.temporales++;
    return this.prefijoTemporal + this.temporales;
  }

  nuevaEtiqueta () {
    this.etiquetas++;
    return this.prefijoEtiqueta + this.etiquetas;
  }

  /**
   * Agrega una instruccion. La primera instruccion que sale de un renglon de
   * codigo lleva ese renglon como comentario:
   *   // a = b + c * d;
   *   t1 = c * d
   */
  emitir (instruccion) {
    instruccion.linea = this.linea;
    if (this.comentarios.length > 0) {
      instruccion.comentarios = this.comentarios;
      this.comentarios = [];
    }
    this.instrucciones.push(instruccion);
  }

  /** Lo que se escribira como comentario antes de la siguiente instruccion. */
  comentar (texto) {
    this.comentarios.push(texto);
  }

  // ==================================================================
  // El programa y las instrucciones
  // ==================================================================

  /** clase nombre { funciones y clasePrincipal }, en el orden del codigo. */
  programa (n) {
    n.funciones.forEach((f) => this.funciones.set(f.nombre, f));
    const miembros = n.funciones.concat(n.principal ? [n.principal] : []);
    miembros.sort((a, b) => a.linea - b.linea);
    miembros.forEach((m) => this.instruccion(m));
    this.renumerarEtiquetas();
  }

  /** Traduce una lista de instrucciones, una tras otra. */
  lista (instrucciones) {
    instrucciones.forEach((n) => this.instruccion(n));
  }

  /**
   * Traduce una instruccion del codigo. Sus instrucciones de tres
   * direcciones llevan su linea, y la primera, su texto como comentario.
   */
  instruccion (n) {
    const lineaDeAfuera = this.linea;
    const cuantasHabia = this.instrucciones.length;

    this.linea = n.linea;
    this.comentar(encabezado(n));
    this.traducir(n);

    // Si no genero nada (entero a; solo declara), su comentario se descarta.
    if (this.instrucciones.length === cuantasHabia) this.comentarios.pop();
    this.linea = lineaDeAfuera;
  }

  traducir (n) {
    switch (n.tipo) {
      case 'Funcion': return this.funcion(n.nombre, n.parametros.map((p) => p.nombre), n.cuerpo, n.tipoRetorno);
      case 'ClasePrincipal': return this.funcion('clasePrincipal', [], n.cuerpo, 'vacio');
      case 'Declaracion': return this.declaracion(n);
      case 'Constante': return this.asignarA(n.nombre, n.valor, n.tipoDato);
      case 'Arreglo':
      case 'Matriz': return this.arreglo(n);
      case 'Asignacion': return this.asignacion(n);
      case 'IncrementoStmt': return this.incremento(n.destino, n.operador, false);
      case 'ExpresionInstruccion': return this.llamar(n.expresion.nombre, n.expresion.argumentos, false);
      case 'Impresion': return this.llamar(n.funcion, n.argumentos, false);
      case 'Leer': return this.leer(n.destino);
      case 'Equipo': return this.llamar('equipo', [], false);
      case 'Limpiar': return this.llamar('limpiar', [], false);
      case 'Esperar': return this.llamar('esperar', [n.milisegundos], false);
      case 'Si': return this.si(n);
      case 'Para': return this.para(n);
      case 'Mientras': return this.mientras(n);
      case 'HacerMientras': return this.hacer(n);
      case 'Opcion': return this.opcion(n);
      case 'Intentar': return this.intentar(n);
      case 'Retornar': return this.emitir(I.retorno(n.valor ? this.valorPara(n.valor, this.tipoRetorno) : ''));
      case 'Romper': return this.romper();
      default: return null;
    }
  }

  /** funcion nombre(parametros) ... fin nombre */
  funcion (nombre, parametros, cuerpo, tipoRetorno) {
    this.columnas = new Map();   // cada funcion tiene sus propias matrices
    this.tipoRetorno = tipoRetorno;
    this.emitir(I.funcion(nombre, parametros));
    this.lista(cuerpo.instrucciones);
    this.emitir(I.fin(nombre));
  }

  /** entero a = 5, b;   ->   a = 5   (b no lleva valor: no genera nada) */
  declaracion (n) {
    n.declaradores.forEach((d) => {
      if (d.valor) this.asignarA(d.nombre, d.valor, n.tipoDato);
    });
  }

  /**
   * nombre = valor, donde nombre es de tipo "tipo".
   *   entero a = 5;    ->   a = 5
   *   decimal x = 5;   ->   x = (decimal) 5     (ver seEnsancha)
   * @returns {string} Donde quedo el valor que se guardo.
   */
  asignarA (nombre, valor, tipo) {
    const v = this.expresion(valor);
    if (seEnsancha(valor.tipoCalculado, tipo)) {
      this.emitir(I.convertir(v, tipo, nombre));
      return nombre;
    }
    this.emitir(I.copia(v, nombre));
    return v;
  }

  /**
   * Traduce el valor que se va a guardar en un lugar de tipo "tipo" (un
   * parametro, lo que devuelve una funcion, un lugar de un arreglo). Si hace
   * falta, antes lo convierte:   t1 = (decimal) 5
   */
  valorPara (nodo, tipo) {
    const v = this.expresion(nodo);
    if (!seEnsancha(nodo.tipoCalculado, tipo)) return v;
    const t = this.nuevoTemporal();
    this.emitir(I.convertir(v, tipo, t));
    return t;
  }

  /** x = valor;   datos[i] = valor;  (tambien dentro de una expresion) */
  asignacion (n) {
    // El semantico dejo en la asignacion el tipo del lugar que recibe el valor.
    const destino = n.destino;
    if (destino.tipo === 'Variable') return this.asignarA(destino.nombre, n.valor, n.tipoCalculado);

    const lugar = this.posicion(destino);
    const v = this.valorPara(n.valor, n.tipoCalculado);
    this.emitir(I.escribirArreglo(v, destino.nombre, lugar));
    return v;
  }

  /**
   * x++  ->  x = x + 1      (x-- con -)
   * Si se usa su valor (y = x++), se guarda antes el valor de antes.
   * @returns {string} El valor de antes de sumar.
   */
  incremento (destino, operador, seUsaElValor) {
    const signo = operador === '++' ? '+' : '-';

    if (destino.tipo === 'Variable') {
      let antes = destino.nombre;
      if (seUsaElValor) {
        antes = this.nuevoTemporal();
        this.emitir(I.copia(destino.nombre, antes));
      }
      this.emitir(I.operacion(signo, destino.nombre, '1', destino.nombre));
      return antes;
    }

    // datos[i]++  ->  t1 = datos[i]   t2 = t1 + 1   datos[i] = t2
    const lugar = this.posicion(destino);
    const antes = this.nuevoTemporal();
    this.emitir(I.leerArreglo(destino.nombre, lugar, antes));
    const despues = this.nuevoTemporal();
    this.emitir(I.operacion(signo, antes, '1', despues));
    this.emitir(I.escribirArreglo(despues, destino.nombre, lugar));
    return antes;
  }

  /** leer(x);  ->  leer x      leer(datos[i]);  ->  leer t1   datos[i] = t1 */
  leer (destino) {
    if (destino.tipo === 'Variable') {
      this.emitir(I.leer(destino.nombre));
      return;
    }
    const lugar = this.posicion(destino);
    const t = this.nuevoTemporal();
    this.emitir(I.leer(t));
    this.emitir(I.escribirArreglo(t, destino.nombre, lugar));
  }

  /**
   * Una llamada: primero se calculan los valores, luego va un "param" por
   * cada uno y al final el "call" con cuantos son.
   *   sumar(a, b + 1)   ->   t1 = b + 1   param a   param t1   t2 = call sumar, 2
   * @param {boolean} seUsaElValor Si el resultado se guarda en un temporal.
   */
  llamar (nombre, argumentos, seUsaElValor) {
    // A una funcion del programa cada valor se le pasa del tipo de su
    // parametro. Las del lenguaje (imprimirLn, potencia...) lo reciben tal cual.
    const f = this.funciones.get(nombre);
    const valores = argumentos.map((a, i) =>
      (f ? this.valorPara(a, f.parametros[i].tipoDato) : this.expresion(a)));
    valores.forEach((v) => this.emitir(I.parametro(v)));
    const t = seUsaElValor ? this.nuevoTemporal() : '';
    this.emitir(I.llamada(nombre, valores.length, t));
    return t;
  }

  // ==================================================================
  // Arreglos y matrices
  // ==================================================================

  /**
   * Arreglo entero datos[3];        ->  reservar datos, 3
   * matriz entero t[2][3];          ->  t1 = 2 * 3
   *                                     reservar t, t1
   * Con valores iniciales, despues se guarda cada uno en su lugar:
   *   Arreglo entero d[] = {10, 20} ->  reservar d, 2
   *                                     d[0] = 10
   *                                     d[1] = 20
   *
   * Una matriz se guarda renglon por renglon, en un solo bloque: el lugar de
   * t[i][j] es  i * columnas + j. Por eso de cada matriz se recuerda cuantas
   * columnas tiene.
   */
  arreglo (n) {
    const valores = n.valores ? n.valores.elementos : [];
    // Los tamanos escritos entre [ ]; si no se escribieron, salen de los valores.
    const escritos = n.dimensiones.length === n.numDimensiones;
    const tamano = (k, segunLosValores) =>
      (escritos ? this.expresion(n.dimensiones[k]) : String(segunLosValores));

    if (n.numDimensiones === 1) {
      this.emitir(I.reservar(n.nombre, tamano(0, valores.length)));
      valores.forEach((v, k) => this.emitir(I.escribirArreglo(this.valorPara(v, n.tipoDato), n.nombre, String(k))));
      return;
    }

    const renglones = tamano(0, valores.length);
    const masLargo = Math.max(0, ...valores.map((r) => (r.elementos ? r.elementos.length : 0)));
    const columnas = tamano(1, masLargo);
    this.columnas.set(n.nombre, columnas);

    const total = this.nuevoTemporal();
    this.emitir(I.operacion('*', renglones, columnas, total));
    this.emitir(I.reservar(n.nombre, total));

    valores.forEach((renglon, i) => (renglon.elementos || []).forEach((v, j) => {
      const valor = this.valorPara(v, n.tipoDato);
      // Con columnas fijas, el lugar ya se sabe:  {{1, 2}, {3, 4}}  ->  0 1 2 3
      const lugar = /^\d+$/.test(columnas)
        ? String(i * Number(columnas) + j)
        : this.lugarEnMatriz(String(i), String(j), columnas);
      this.emitir(I.escribirArreglo(valor, n.nombre, lugar));
    }));
  }

  /** i * columnas + j, en dos instrucciones. Devuelve el temporal con el lugar. */
  lugarEnMatriz (i, j, columnas) {
    const t1 = this.nuevoTemporal();
    this.emitir(I.operacion('*', i, columnas, t1));
    const t2 = this.nuevoTemporal();
    this.emitir(I.operacion('+', t1, j, t2));
    return t2;
  }

  /** El lugar dentro de un arreglo:  datos[i] -> i      tabla[i][j] -> i * columnas + j */
  posicion (n) {
    if (n.indices.length === 1) return this.expresion(n.indices[0]);
    const i = this.expresion(n.indices[0]);
    const j = this.expresion(n.indices[1]);
    return this.lugarEnMatriz(i, j, this.columnas.get(n.nombre));
  }

  // ==================================================================
  // Decisiones y ciclos
  // ==================================================================

  /**
   * si (c1) { A } sinoSi (c2) { B } sino { C }
   *
   *     t1 = c1
   *     ifFalse t1 goto L1
   *     A
   *     goto L3
   *   L1:
   *     t2 = c2
   *     ifFalse t2 goto L2
   *     B
   *     goto L3
   *   L2:
   *     C
   *   L3:
   */
  si (n) {
    const ramas = [{ condicion: n.condicion, cuerpo: n.entonces }]
      .concat(n.ramas.map((r) => ({ condicion: r.condicion, cuerpo: r.cuerpo })));
    const hayMasDeUnCamino = ramas.length > 1 || n.sino !== null;
    const fin = this.nuevaEtiqueta();

    ramas.forEach((rama, k) => {
      if (k > 0) this.comentar(`sinoSi (${textoExpresion(rama.condicion)})`);
      const t = this.expresion(rama.condicion);
      const siguiente = this.nuevaEtiqueta();
      this.emitir(I.siFalso(t, siguiente));
      this.lista(rama.cuerpo.instrucciones);
      if (hayMasDeUnCamino) this.emitir(I.salto(fin));
      this.emitir(I.etiqueta(siguiente));
    });

    if (n.sino) {
      this.comentar('sino');
      this.lista(n.sino.cuerpo.instrucciones);
    }
    if (hayMasDeUnCamino) this.emitir(I.etiqueta(fin));
  }

  /**
   * mientras (c) { A }
   *
   *   L1:
   *     t1 = c
   *     ifFalse t1 goto L2
   *     A
   *     goto L1
   *   L2:
   */
  mientras (n) {
    const inicio = this.nuevaEtiqueta();
    const salida = this.nuevaEtiqueta();
    this.emitir(I.etiqueta(inicio));
    const t = this.expresion(n.condicion);
    this.emitir(I.siFalso(t, salida));
    this.dentroDe(salida, () => this.lista(n.cuerpo.instrucciones));
    this.emitir(I.salto(inicio));
    this.emitir(I.etiqueta(salida));
  }

  /**
   * hacer { A } mientras (c);
   *
   *   L1:
   *     A
   *     t1 = c
   *     if t1 goto L1
   */
  hacer (n) {
    const inicio = this.nuevaEtiqueta();
    const salida = this.nuevaEtiqueta();
    this.emitir(I.etiqueta(inicio));
    const huboRomper = this.dentroDe(salida, () => this.lista(n.cuerpo.instrucciones));
    this.comentar(`mientras (${textoExpresion(n.condicion)})`);
    const t = this.expresion(n.condicion);
    this.emitir(I.siVerdadero(t, inicio));
    if (huboRomper) this.emitir(I.etiqueta(salida));
  }

  /**
   * para (inicio; c; paso) { A }
   *
   *     inicio
   *   L1:
   *     t1 = c
   *     ifFalse t1 goto L2
   *     A
   *     paso
   *     goto L1
   *   L2:
   */
  para (n) {
    if (n.inicializacion.tipo === 'Declaracion') this.declaracion(n.inicializacion);
    else this.asignacion(n.inicializacion);

    const inicio = this.nuevaEtiqueta();
    const salida = this.nuevaEtiqueta();
    this.emitir(I.etiqueta(inicio));
    const t = this.expresion(n.condicion);
    this.emitir(I.siFalso(t, salida));
    this.dentroDe(salida, () => this.lista(n.cuerpo.instrucciones));

    const paso = n.actualizacion;
    if (paso.tipo === 'IncrementoStmt') this.incremento(paso.destino, paso.operador, false);
    else this.asignacion(paso);

    this.emitir(I.salto(inicio));
    this.emitir(I.etiqueta(salida));
  }

  /**
   * opcion (x) { caso 1: A  caso 2: B  porDefecto: C }
   *
   *     if x == 1 goto L1
   *     if x == 2 goto L2
   *     goto L3
   *   L1:
   *     A           <- sin romper, sigue con B (como en Java)
   *   L2:
   *     B
   *   L3:
   *     C
   *   L4:           <- a donde salta romper
   */
  opcion (n) {
    const valor = this.expresion(n.expresion);
    const destinos = n.casos.map(() => this.nuevaEtiqueta());
    n.casos.forEach((c, k) => this.emitir(I.siIgual(valor, this.expresion(c.valor), destinos[k])));

    const salida = this.nuevaEtiqueta();
    const defecto = n.porDefecto ? this.nuevaEtiqueta() : salida;
    this.emitir(I.salto(defecto));

    this.dentroDe(salida, () => {
      n.casos.forEach((c, k) => {
        this.comentar(`caso ${textoExpresion(c.valor)}:`);
        this.emitir(I.etiqueta(destinos[k]));
        this.lista(c.cuerpo.instrucciones);
      });
      if (n.porDefecto) {
        this.comentar('porDefecto:');
        this.emitir(I.etiqueta(defecto));
        this.lista(n.porDefecto.cuerpo.instrucciones);
      }
    });
    this.emitir(I.etiqueta(salida));
  }

  /**
   * intentar { A } capturar (Error e) { B }
   *
   *     intentar L1        <- si algo falla dentro de A, se salta a L1
   *     A
   *     finIntentar
   *     goto L2
   *   L1:
   *     capturar e
   *     B
   *   L2:
   */
  intentar (n) {
    const captura = this.nuevaEtiqueta();
    const fin = this.nuevaEtiqueta();
    this.emitir(I.intentar(captura));
    this.lista(n.cuerpo.instrucciones);
    this.emitir(I.finIntentar());
    this.emitir(I.salto(fin));
    this.comentar(`capturar (Error ${n.variableError})`);
    this.emitir(I.etiqueta(captura));
    this.emitir(I.capturar(n.variableError));
    this.lista(n.manejo.instrucciones);
    this.emitir(I.etiqueta(fin));
  }

  /** romper;  ->  goto (la salida del ciclo u opcion de adentro) */
  romper () {
    const salida = this.salidas[this.salidas.length - 1];
    salida.usada = true;
    this.emitir(I.salto(salida.etiqueta));
  }

  /**
   * Traduce el cuerpo de un ciclo u opcion recordando su salida, que es a
   * donde salta romper. Devuelve true si algun romper la uso.
   */
  dentroDe (etiqueta, traducirCuerpo) {
    this.salidas.push({ etiqueta, usada: false });
    traducirCuerpo();
    return this.salidas.pop().usada;
  }

  // ==================================================================
  // Expresiones: cada una devuelve donde quedo su valor
  // ==================================================================

  /**
   * Traduce una expresion y devuelve su "direccion": el nombre, el numero o
   * el temporal donde queda su valor.
   *   b + c * d   ->   emite  t1 = c * d   t2 = b + t1   y devuelve t2
   *   edad        ->   no emite nada y devuelve edad
   */
  expresion (n) {
    switch (n.tipo) {
      case 'Literal': return n.lexema;
      case 'Variable': return n.nombre;
      case 'Indexacion': {
        const lugar = this.posicion(n);
        const t = this.nuevoTemporal();
        this.emitir(I.leerArreglo(n.nombre, lugar, t));
        return t;
      }
      case 'Binaria': return this.binaria(n);
      case 'Unaria': return this.unaria(n);
      case 'Postfija': return this.incremento(n.operando, n.operador, true);
      case 'Asignacion': return this.asignacion(n);
      case 'Llamada':
      case 'Nativa': return this.llamar(n.nombre, n.argumentos, true);
      case 'Geometrica': return this.llamar(`${n.familia}.${n.figura}`, n.argumentos, true);
      case 'Convertir': {
        const v = this.expresion(n.valor);
        const t = this.nuevoTemporal();
        this.emitir(I.convertir(v, n.tipoDestino, t));
        return t;
      }
      default: return '?';
    }
  }

  /** a + b,  a > b ...  ->  t = a op b.   Y / O van aparte (ver logico). */
  binaria (n) {
    if (Y.indexOf(n.operador) !== -1) return this.logico(n, true);
    if (O.indexOf(n.operador) !== -1) return this.logico(n, false);

    const a = this.expresion(n.izquierda);
    const b = this.expresion(n.derecha);
    const t = this.nuevoTemporal();
    this.emitir(I.operacion(n.operador, a, b, t));
    return t;
  }

  /** -x  ->  t = - x      NO x  ->  t = NO x      (-5 es solo un numero) */
  unaria (n) {
    if (n.operador === '+') return this.expresion(n.operando);
    if (n.operador === '-' && n.operando.tipo === 'Literal') return '-' + n.operando.lexema;

    const v = this.expresion(n.operando);
    const t = this.nuevoTemporal();
    this.emitir(I.unaria(NO.indexOf(n.operador) !== -1 ? 'NO' : 'menos', v, t));
    return t;
  }

  /**
   * a Y b,  a O b, con "corto circuito" como en Java: si con a ya se sabe el
   * resultado, b ni se calcula.
   *
   *   a Y b                      a O b
   *     t1 = a                     t1 = a
   *     ifFalse t1 goto L1         if t1 goto L1
   *     t1 = b                     t1 = b
   *   L1:                        L1:
   */
  logico (n, esY) {
    const a = this.expresion(n.izquierda);
    const t = this.nuevoTemporal();
    const fin = this.nuevaEtiqueta();
    this.emitir(I.copia(a, t));
    this.emitir(esY ? I.siFalso(t, fin) : I.siVerdadero(t, fin));
    const b = this.expresion(n.derecha);
    this.emitir(I.copia(b, t));
    this.emitir(I.etiqueta(fin));
    return t;
  }

  // ==================================================================
  // Al final
  // ==================================================================

  /**
   * Las etiquetas se crean conforme se necesitan, asi que su numero no
   * siempre sigue el orden del codigo (la salida de un ciclo se crea antes
   * que las etiquetas de lo que va adentro). Al final se renumeran en el
   * orden en que aparecen: L1 es la primera que se ve, L2 la segunda...
   */
  renumerarEtiquetas () {
    const nuevas = new Map();
    this.instrucciones.forEach((ins) => {
      if (ins.op === 'etiqueta') nuevas.set(ins.resultado, this.prefijoEtiqueta + (nuevas.size + 1));
    });

    this.instrucciones.forEach((ins) => {
      if (CON_ETIQUETA.indexOf(ins.op) === -1) return;
      const L = nuevas.get(ins.resultado);
      // Se vuelve a armar la instruccion con su etiqueta nueva (y su texto).
      let nueva;
      if (ins.op === 'etiqueta') nueva = I.etiqueta(L);
      else if (ins.op === 'goto') nueva = I.salto(L);
      else if (ins.op === 'if') nueva = I.siVerdadero(ins.arg1, L);
      else if (ins.op === 'ifFalse') nueva = I.siFalso(ins.arg1, L);
      else if (ins.op === 'if==') nueva = I.siIgual(ins.arg1, ins.arg2, L);
      else nueva = I.intentar(L);
      Object.assign(ins, nueva);
    });
    this.etiquetas = nuevas.size;
  }
}

/**
 * Genera el codigo intermedio de un programa.
 *
 * @param {object} ast      Arbol del programa.
 * @param {Array}  previos  Los errores de las fases 1 a 3. Con alguno, no se genera.
 * @param {string[]} [nombres] Los identificadores del programa (para que los
 *                             temporales y las etiquetas no choquen con ellos).
 * @returns {object} { estado: 'vacio' | 'errores-previos' | 'generado', errores,
 *                     instrucciones: [{ numero, op, arg1, arg2, resultado, texto,
 *                     linea, comentarios }], temporales, etiquetas, prefijos }
 */
function generarCodigoIntermedio (ast, previos, nombres = []) {
  const resultado = {
    estado: 'generado',
    errores: [],
    instrucciones: [],
    temporales: 0,
    etiquetas: 0,
    // Como empiezan los temporales y las etiquetas (t1, L1; tt1 si el programa ya usa t1)
    prefijos: { temporal: 't', etiqueta: 'L' }
  };

  if (!ast && previos.length === 0) {
    resultado.estado = 'vacio';
    return resultado;
  }
  if (previos.length > 0 || !ast || ast.tipo !== 'Programa') {
    resultado.estado = 'errores-previos';
    resultado.errores = previos;
    return resultado;
  }

  const generador = new GeneradorIntermedio(nombres);
  generador.programa(ast);

  resultado.instrucciones = generador.instrucciones.map((ins, i) => Object.assign({ numero: i + 1 }, ins));
  resultado.temporales = generador.temporales;
  resultado.etiquetas = generador.etiquetas;
  resultado.prefijos = { temporal: generador.prefijoTemporal, etiqueta: generador.prefijoEtiqueta };
  return resultado;
}

/** El codigo de tres direcciones en texto, con sus comentarios (para el reporte .bs). */
function codigoIntermedioATexto (instrucciones) {
  const lineas = [];
  instrucciones.forEach((ins) => {
    (ins.comentarios || []).forEach((c) => lineas.push(`// ${c}`));
    // Las etiquetas van a la orilla; las demas instrucciones, con sangria.
    lineas.push(ins.op === 'etiqueta' ? ins.texto : '    ' + ins.texto);
  });
  return lineas;
}

module.exports = { generarCodigoIntermedio, codigoIntermedioATexto };
