/**
 * EscritorJava.js
 * Paso 5 de la fase 6: escribe el arbol de sentencias como texto de Java.
 *
 * Lo mas delicado son las EXPRESIONES: el arbol ya trae el orden de las
 * operaciones, y al escribirlo hay que poner parentesis exactamente donde
 * Java los necesita para respetar ese orden:
 *
 *   (a + b) * c      a - (b - c)      "Total: " + (x + y)      (int) (a / b)
 *
 * Y cada cosa de SwordByte se escribe con su equivalente de Java:
 *
 *   imprimirLn(x)          System.out.println(x)
 *   potencia(a, b)         Math.pow(a, b)
 *   redondear(x)           (int) Math.round(x)
 *   longitud(texto)        texto.length()        longitud(arreglo)  arreglo.length
 *   convertir(t, entero)   Integer.parseInt(t)   convertir(x, cadena)  String.valueOf(x)
 *   leer(x)                x = entrada.nextInt()   (segun el tipo de x)
 *   a == b  (cadenas)      a.equals(b)
 *   verdadero, Y, NO       true, &&, !
 *
 * Lo que Java no trae tal cual (aleatorio, esperar, logaritmo con base y la
 * geometria) se escribe con una funcion de apoyo al final de la clase (ver
 * GeneradorJava.js).
 */

const { tipoJava, valorInicial, literalJava, esNumerico, esEnteroT, elementoDe, esGeometrica } = require('./TiposJava');
const { iguales, efectos } = require('./Expresiones');
const { NOMBRE_EQUIPO, nombresCompletos } = require('../comun/Equipo');

/** Precedencia de los operadores de Java (mas alto, se calcula primero). */
const PRECEDENCIA = {
  '||': 1, '&&': 2, '==': 3, '!=': 3, '<': 4, '<=': 4, '>': 4, '>=': 4, '+': 5, '-': 5, '*': 6, '/': 6, '%': 6
};
const UNARIO = 7;
const PRIMARIO = 8;

/** Hasta donde llega un byte o un short (para saber si un numero fijo cabe sin conversion). */
const RANGO = { byte: [-128, 127], corto: [-32768, 32767] };

/** Cada leer, segun el tipo de la variable. */
const LECTURA = {
  entero: 'nextInt()',
  largo: 'nextLong()',
  corto: 'nextShort()',
  byte: 'nextByte()',
  decimal: 'nextDouble()',
  flotante: 'nextFloat()',
  cadena: 'next()',
  caracter: 'next().charAt(0)',
  logico: 'next().equals("verdadero")'
};

/** convertir(texto, tipo): la funcion de Java que pasa un texto a ese tipo. */
const DESDE_TEXTO = {
  entero: 'Integer.parseInt',
  largo: 'Long.parseLong',
  corto: 'Short.parseShort',
  byte: 'Byte.parseByte',
  decimal: 'Double.parseDouble',
  flotante: 'Float.parseFloat'
};

/** Las nativas que tienen un metodo de Math que hace lo mismo. */
const DE_MATH = { potencia: 'Math.pow', logaritmo10: 'Math.log10', seno: 'Math.sin', coseno: 'Math.cos' };

const SANGRIA = '    ';

class EscritorJava {
  /**
   * @param {object} opciones
   *   nombre(n)       como se llama en Java un nombre del programa
   *   funciones       Map: funcion del programa -> { tipoRetorno, tiposParametros }
   *   entrada         el nombre del Scanner (si el programa usa leer)
   */
  constructor (opciones) {
    this.nombre = opciones.nombre;
    this.funciones = opciones.funciones;
    this.entrada = opciones.entrada;
    /** Las funciones de apoyo que hacen falta: aleatorio, esperar, logaritmo, area... */
    this.apoyo = new Set();
    this.usaScanner = false;
    /** El tipo de cada nombre del metodo que se escribe. */
    this.tipoDe = () => null;
    /** Cuantas columnas tiene cada matriz del metodo (para su comentario). */
    this.columnas = {};
  }

  // ==================================================================
  // Expresiones: { s: texto, p: precedencia }
  // ==================================================================

  expr (e) {
    switch (e.k) {
      case 'lit': {
        const s = literalJava(e.v);
        return { s, p: s.startsWith('-') ? UNARIO : PRIMARIO };
      }
      case 'var': return { s: this.nombre(e.n), p: PRIMARIO };
      case 'post': return { s: this.nombre(e.n) + e.op, p: PRIMARIO };
      case 'idx': return { s: `${this.nombre(e.arr)}[${this.expr(e.i).s}]`, p: PRIMARIO };
      case 'bin': return this.binaria(e);
      case 'un': {
        const a = this.expr(e.a);
        const pegados = e.op === '-' && a.s.startsWith('-');   // - -x se leeria --x
        return { s: e.op + (a.p < UNARIO || pegados ? `(${a.s})` : a.s), p: UNARIO };
      }
      case 'conv': return this.conversion(e);
      case 'call': return this.llamada(e);
      case 'leer':
        this.usaScanner = true;
        return { s: `${this.entrada}.${LECTURA[e.tipo] || 'next()'}`, p: PRIMARIO };
      case 'nuevo': return { s: `new ${tipoJava(elementoDe(e.tipo))}[${this.expr(e.n).s}]`, p: PRIMARIO };
      case 'arreglo': {
        const tipo = elementoDe(e.t);
        return { s: `{${e.elementos.map((x) => this.valorPara(tipo, x)).join(', ')}}`, p: PRIMARIO };
      }
      default: throw new Error(`Expresion desconocida: ${e.k}`);
    }
  }

  texto (e) { return this.expr(e).s; }

  /** Una expresion a la que se le pide algo con punto:  (a + b).length() */
  receptor (e) {
    const r = this.expr(e);
    return r.p < PRIMARIO ? `(${r.s})` : r.s;
  }

  binaria (e) {
    // Dos cadenas se comparan por su contenido: con == Java compara si son el mismo objeto
    if ((e.op === '==' || e.op === '!=') && e.a.t === 'cadena' && e.b.t === 'cadena') {
      const s = `${this.receptor(e.a)}.equals(${this.texto(e.b)})`;
      return e.op === '==' ? { s, p: PRIMARIO } : { s: '!' + s, p: UNARIO };
    }
    const p = PRECEDENCIA[e.op];
    const a = this.expr(e.a);
    const b = this.expr(e.b);
    // Del lado izquierdo, parentesis si se calcula despues; del derecho tambien
    // si es del mismo nivel:  a - (b - c),  "x" + (a + b).  && y || no los necesitan.
    const asociativo = (e.op === '&&' || e.op === '||') && e.b.k === 'bin' && e.b.op === e.op;
    const izq = a.p < p ? `(${a.s})` : a.s;
    const der = b.p < p || (b.p === p && !asociativo) ? `(${b.s})` : b.s;
    return { s: `${izq} ${e.op} ${der}`, p };
  }

  /** convertir(valor, tipo) y las conversiones que la fase 4 escribio. */
  conversion (e) {
    const desde = e.a.t;
    const hacia = e.tipo;
    if (desde === hacia) return this.expr(e.a);
    if (hacia === 'cadena') return { s: `String.valueOf(${this.texto(e.a)})`, p: PRIMARIO };
    if (desde === 'cadena') {
      // Como en SwordByte, los espacios de los lados no cuentan: " 12 " es 12
      // (Double.parseDouble ya los ignora; Integer.parseInt no)
      const texto = DESDE_TEXTO[hacia] && /^(Double|Float)/.test(DESDE_TEXTO[hacia])
        ? this.texto(e.a) : `${this.receptor(e.a)}.trim()`;
      if (DESDE_TEXTO[hacia]) return { s: `${DESDE_TEXTO[hacia]}(${texto})`, p: PRIMARIO };
      if (hacia === 'logico') return { s: `${texto}.equals("verdadero")`, p: PRIMARIO };
      if (hacia === 'caracter') return { s: `${this.receptor(e.a)}.charAt(0)`, p: PRIMARIO };
    }
    const a = this.expr(e.a);
    return { s: `(${tipoJava(hacia)}) ${a.p < UNARIO ? `(${a.s})` : a.s}`, p: UNARIO };
  }

  /** Los valores de una llamada a una funcion del programa, cada uno del tipo de su parametro. */
  argumentos (f, args) {
    const tipos = this.funciones.get(f).tiposParametros;
    return args.map((a, i) => this.valorPara(tipos[i], a, false)).join(', ');
  }

  llamada (e) {
    const a = e.args.map((x) => this.texto(x));
    if (this.funciones.has(e.f)) return { s: `${this.nombre(e.f)}(${this.argumentos(e.f, e.args)})`, p: PRIMARIO };
    if (DE_MATH[e.f]) return { s: `${DE_MATH[e.f]}(${a.join(', ')})`, p: PRIMARIO };
    switch (e.f) {
      case 'redondear': return { s: `(int) Math.round(${a[0]})`, p: UNARIO };
      case 'logaritmo':
        if (a.length === 1) return { s: `Math.log(${a[0]})`, p: PRIMARIO };
        this.apoyo.add('logaritmo');
        return { s: `logaritmo(${a.join(', ')})`, p: PRIMARIO };
      case 'aleatorio':
        this.apoyo.add('aleatorio');
        return { s: `aleatorio(${a.join(', ')})`, p: PRIMARIO };
      case 'longitud':
        return { s: `${this.receptor(e.args[0])}.length${e.args[0].t === 'cadena' ? '()' : ''}`, p: PRIMARIO };
      default:
        if (esGeometrica(e.f)) {
          this.apoyo.add(e.f);
          return { s: `${e.f}(${a.join(', ')})`, p: PRIMARIO };
        }
        throw new Error(`Funcion desconocida en la fase 6: ${e.f}`);
    }
  }

  /**
   * Un valor que se guarda en un lugar de otro tipo. Java no guarda un int
   * en un byte o un short sin una conversion escrita, salvo un numero fijo
   * que le cabe (byte b = 100). En una llamada, ni eso: f((byte) 100).
   */
  valorPara (tipo, e, conNumeroFijo = true) {
    const s = this.texto(e);
    if (!RANGO[tipo] || !esEnteroT(e.t) || e.t === tipo || (tipo === 'corto' && e.t === 'byte')) return s;
    const fijo = e.k === 'lit' && /^-?\d+$/.test(e.v);
    if (conNumeroFijo && fijo && Number(e.v) >= RANGO[tipo][0] && Number(e.v) <= RANGO[tipo][1]) return s;
    const r = this.expr(e);
    return `(${tipoJava(tipo)}) ${r.p < UNARIO ? `(${r.s})` : r.s}`;
  }

  // ==================================================================
  // Sentencias: cada una, uno o varios renglones { texto, linea }
  // ==================================================================

  /**
   * x = x + 1  ->  x++      datos[i] = datos[i] - 1  ->  datos[i]--
   * @returns {string|null}
   */
  incremento (s) {
    const valor = s.valor;
    if (s.t !== 'asignar' && s.t !== 'guardar') return null;
    if (!valor || valor.k !== 'bin' || (valor.op !== '+' && valor.op !== '-')) return null;
    const uno = (x) => x.k === 'lit' && x.v === '1';
    const esLugar = (x) => (s.t === 'asignar'
      ? x.k === 'var' && x.n === s.nombre
      : x.k === 'idx' && x.arr === s.arreglo && iguales(x.i, s.indice) && sinEfectos(s.indice));
    const lugar = s.t === 'asignar' ? this.nombre(s.nombre) : `${this.nombre(s.arreglo)}[${this.texto(s.indice)}]`;
    const tipo = s.t === 'asignar' ? this.tipoDe(s.nombre) : elementoDe(this.tipoDe(s.arreglo));
    if (!esNumerico(tipo)) return null;
    if (esLugar(valor.a) && uno(valor.b)) return lugar + (valor.op === '+' ? '++' : '--');
    if (valor.op === '+' && uno(valor.a) && esLugar(valor.b)) return lugar + '++';
    return null;
  }

  /** Una sentencia simple sin el ; (para el for). */
  simple (s) {
    const inc = this.incremento(s);
    if (inc) return inc;
    if (s.t === 'declarar') {
      return `${tipoJava(s.tipo)} ${this.nombre(s.nombre)} = ` +
        (s.valor ? this.valorPara(s.tipo, s.valor) : valorInicial(s.tipo));
    }
    if (s.t === 'asignar') return `${this.nombre(s.nombre)} = ${this.valorPara(this.tipoDe(s.nombre), s.valor)}`;
    if (s.t === 'guardar') {
      return `${this.nombre(s.arreglo)}[${this.texto(s.indice)}] = ${this.valorPara(elementoDe(this.tipoDe(s.arreglo)), s.valor)}`;
    }
    throw new Error(`No es una sentencia simple: ${s.t}`);
  }

  /** Una llamada sola en su renglon (imprimirLn, equipo, una funcion vacio...). */
  llamadaSola (c) {
    const a = c.args.map((x) => this.texto(x));
    switch (c.f) {
      case 'imprimir': return [`System.out.print(${a[0]});`];
      case 'imprimirLn': return [`System.out.println(${a.length > 0 ? a[0] : ''});`];
      case 'imprimirF': return [`System.out.printf(${a.join(', ')});`];
      case 'equipo':
        return [`Equipo ${NOMBRE_EQUIPO}`].concat(nombresCompletos())
          .map((n) => `System.out.println(${JSON.stringify(n)});`);
      case 'limpiar': return ['System.out.print("\\033[H\\033[2J");', 'System.out.flush();'];
      case 'esperar':
        this.apoyo.add('esperar');
        return [`esperar(${a[0]});`];
      default:
        // Una nativa que solo calcula y cuyo valor no se usa no hace nada
        if (!this.funciones.has(c.f) && sinEfectos(c, (f) => this.funciones.has(f))) return [];
        return [`${this.expr(c).s};`];
    }
  }

  /**
   * Escribe una lista de sentencias.
   * @param {Array}  lista
   * @param {number} nivel   La sangria.
   * @param {Array}  salida  [{ texto, linea }] donde se agregan los renglones.
   */
  lista (lista, nivel, salida) {
    lista.forEach((s) => this.sentencia(s, nivel, salida));
  }

  sentencia (s, nivel, salida) {
    const pon = (texto, linea = s.linea) => salida.push({ texto: SANGRIA.repeat(nivel) + texto, linea });
    const etiqueta = s.conEtiqueta ? `${s.etiqueta}: ` : '';
    switch (s.t) {
      case 'declarar': case 'asignar': case 'guardar': {
        // Una matriz se guarda renglon por renglon, como en el codigo intermedio
        const columnas = s.t === 'declarar' && /\[\]\[\]$/.test(s.tipo) ? this.columnas[s.nombre] : null;
        const nota = columnas
          ? `   // matriz de ${columnas} columna${columnas === '1' ? '' : 's'}: ${this.nombre(s.nombre)}[i][j] es ` +
            `${this.nombre(s.nombre)}[i * ${/^\d+$/.test(columnas) ? columnas : this.nombre(columnas)} + j]`
          : '';
        pon(this.simple(s) + ';' + nota);
        break;
      }
      case 'llamar':
        this.llamadaSola(s.llamada).forEach((t) => pon(t));
        break;
      case 'retornar':
        pon(s.valor ? `return ${this.valorPara(this.tipoRetorno, s.valor)};` : 'return;');
        break;
      case 'romper':
        pon(s.sinEtiqueta ? 'break;' : `break ${s.etiqueta};`);
        break;
      case 'continuar':
        pon(s.sinEtiqueta ? 'continue;' : `continue ${s.etiqueta};`);
        break;
      case 'si': this.si(s, nivel, salida, ''); break;
      case 'ciclo':
        pon(`${etiqueta}while (true) {`);
        this.lista(s.cuerpo, nivel + 1, salida);
        pon('}');
        break;
      case 'mientras':
        pon(`${etiqueta}while (${this.texto(s.cond)}) {`);
        this.lista(s.cuerpo, nivel + 1, salida);
        pon('}');
        break;
      case 'hacer':
        pon(`${etiqueta}do {`);
        this.lista(s.cuerpo, nivel + 1, salida);
        pon(`} while (${this.texto(s.cond)});`);
        break;
      case 'para':
        pon(`${etiqueta}for (${this.simple(s.inicio)}; ${this.texto(s.cond)}; ${this.simple(s.paso)}) {`);
        this.lista(s.cuerpo, nivel + 1, salida);
        pon('}');
        break;
      case 'bloque':
        pon(`${etiqueta}{`);
        this.lista(s.cuerpo, nivel + 1, salida);
        pon('}');
        break;
      case 'opcion':
        pon(`${etiqueta}switch (${this.texto(s.valor)}) {`);
        s.casos.forEach((c) => {
          c.valores.forEach((v) => salida.push({ texto: SANGRIA.repeat(nivel + 1) + `case ${this.texto(v)}:`, linea: s.linea }));
          if (c.defecto) salida.push({ texto: SANGRIA.repeat(nivel + 1) + 'default:', linea: s.linea });
          this.lista(c.cuerpo, nivel + 2, salida);
        });
        pon('}');
        break;
      case 'intentar':
        pon('try {');
        this.lista(s.cuerpo, nivel + 1, salida);
        pon(`} catch (Exception ${this.nombre(s.variable)}) {`);
        this.lista(s.manejo, nivel + 1, salida);
        pon('}');
        break;
      default: throw new Error(`Sentencia desconocida: ${s.t}`);
    }
  }

  /** if / else if / else */
  si (s, nivel, salida, antes) {
    const pon = (texto) => salida.push({ texto: SANGRIA.repeat(nivel) + texto, linea: s.linea });
    if (antes) salida[salida.length - 1].texto += ` if (${this.texto(s.cond)}) {`;
    else pon(`if (${this.texto(s.cond)}) {`);
    this.lista(s.entonces, nivel + 1, salida);
    if (s.sino.length === 1 && s.sino[0].t === 'si') {
      pon('} else');
      this.si(s.sino[0], nivel, salida, 'else');
      return;
    }
    if (s.sino.length > 0) {
      pon('} else {');
      this.lista(s.sino, nivel + 1, salida);
    }
    pon('}');
  }
}

/**
 * true si calcular la expresion no hace nada mas (ni falla).
 * @param {Function} [esDelPrograma] Sin ella, cualquier llamada cuenta como que hace algo.
 */
function sinEfectos (e, esDelPrograma = () => true) {
  const info = efectos(e, esDelPrograma);
  return !info.efecto && !info.lanza;
}

module.exports = { EscritorJava, SANGRIA };
