/**
 * GeneradorJava.js
 * FASE 4 del compilador SwordByte: traduce el AST a codigo Java.
 *
 * El codigo generado es un programa Java completo y compilable:
 *
 *   clase ejemplo {                     public class ejemplo {
 *       clasePrincipal {          ->        public static void main(String[] args) {
 *           imprimirLn("Hola");                 System.out.println("Hola");
 *       }                                   }
 *   }                                   }
 *
 * Solo se llama cuando el analisis lexico, sintactico y semantico terminaron
 * sin errores (ver Compilador.js). Aun asi, cada parte esta protegida para
 * que un nodo inesperado no tumbe la aplicacion.
 */

const { NOMBRE_EQUIPO, nombresCompletos } = require('../comun/Equipo');

// ====================================================================
// Tablas de traduccion
// ====================================================================

/** Tipo de dato de SwordByte -> tipo de Java. */
const TIPOS_JAVA = {
  logico: 'boolean',
  byte: 'byte',
  caracter: 'char',
  corto: 'short',
  entero: 'int',
  largo: 'long',
  flotante: 'float',
  decimal: 'double',
  cadena: 'String',
  vacio: 'void'
};

/** Tipos numericos, del mas chico al mas grande (igual que el semantico). */
const NUMERICOS = ['byte', 'corto', 'entero', 'largo', 'flotante', 'decimal'];
const ENTEROS = ['byte', 'corto', 'entero', 'largo'];

/** Lo que devuelve cada funcion nativa. */
const TIPO_NATIVA = {
  longitud: 'entero',
  aleatorio: 'entero',
  potencia: 'decimal',
  raiz: 'decimal',
  raizCuadrada: 'decimal',
  raizCubica: 'decimal',
  redondear: 'entero',
  logaritmo: 'decimal',
  logaritmo10: 'decimal',
  seno: 'decimal',
  coseno: 'decimal'
};

/**
 * Palabras que no se pueden usar tal cual como nombre en Java. Si el codigo
 * SwordByte usa una (por ejemplo, una variable llamada "int"), se le agrega
 * un guion bajo para que el Java generado compile.
 */
const RESERVADAS_JAVA = new Set([
  'abstract', 'assert', 'boolean', 'break', 'byte', 'case', 'catch', 'char',
  'class', 'const', 'continue', 'default', 'do', 'double', 'else', 'enum',
  'extends', 'final', 'finally', 'float', 'for', 'goto', 'if', 'implements',
  'import', 'instanceof', 'int', 'interface', 'long', 'native', 'new',
  'package', 'private', 'protected', 'public', 'return', 'short', 'static',
  'strictfp', 'super', 'switch', 'synchronized', 'this', 'throw', 'throws',
  'transient', 'try', 'void', 'volatile', 'while', 'true', 'false', 'null',
  'var', 'record', 'sealed', 'permits', 'yield',
  // Nombres que el codigo generado ya usa
  'System', 'Math', 'String', 'Scanner', 'Objects', 'main', '__entrada',
  '__aleatorio'
]);

/** Una cadena segura para Java (comillas, saltos de linea, etc.). */
function cadenaJava (texto) {
  const mapa = {
    '\\': '\\\\',
    '"': '\\"',
    '\n': '\\n',
    '\r': '\\r',
    '\t': '\\t',
    '\b': '\\b',
    '\f': '\\f',
    '\0': '\\0'
  };
  return '"' + String(texto === null || texto === undefined ? '' : texto)
    .replace(/[\\"\n\r\t\b\f\0]/g, (c) => mapa[c]) + '"';
}

/** Un caracter seguro para Java. */
function caracterJava (texto) {
  const valor = String(texto === null || texto === undefined ? '' : texto);
  if (valor.length === 0) return "'\\0'";
  const mapa = {
    '\\': '\\\\',
    "'": "\\'",
    '\n': '\\n',
    '\r': '\\r',
    '\t': '\\t',
    '\b': '\\b',
    '\f': '\\f',
    '\0': '\\0'
  };
  const c = valor.charAt(0);
  return "'" + (mapa[c] || c) + "'";
}

const esNumero = (t) => NUMERICOS.indexOf(t) !== -1;
const esEntero = (t) => ENTEROS.indexOf(t) !== -1;

/** El tipo mas grande de los dos, como en Java: byte + byte -> int. */
function promover (a, b) {
  const i = Math.max(
    NUMERICOS.indexOf(a), NUMERICOS.indexOf(b), NUMERICOS.indexOf('entero'));
  return NUMERICOS[i];
}

/** Indenta un bloque completo una cantidad de niveles. */
function indentar (texto, niveles = 1) {
  const pad = '    '.repeat(niveles);
  return String(texto)
    .split('\n')
    .map((linea) => (linea === '' ? linea : pad + linea))
    .join('\n');
}

// ====================================================================
// El generador
// ====================================================================

class GeneradorJava {
  /** @param {object} ast Nodo "Programa" del analizador sintactico. */
  constructor (ast) {
    this.ast = ast;
    this.funciones = new Map();
    this.ambitos = [];

    this.usos = {
      scanner: false,
      aleatorio: false
    };

    (ast.funciones || []).forEach((f) => this.funciones.set(f.nombre, f));
  }

  // ------------------------------------------------------------------
  // Punto de entrada
  // ------------------------------------------------------------------

  /** @returns {string} El programa Java completo. */
  generar () {
    const miembros = [];

    (this.ast.funciones || []).forEach((f) => miembros.push(this._funcion(f)));
    if (this.ast.principal) miembros.push(this._main(this.ast.principal));

    // Los usos (Scanner, aleatorio) se descubren al generar los miembros, asi
    // que el encabezado se arma al final.
    const partes = [];
    if (this.usos.scanner) partes.push('import java.util.Scanner;');

    const clase = [];
    clase.push(`public class ${this._id(this.ast.nombre && this.ast.nombre !== '?' ? this.ast.nombre : 'Programa')} {`);

    if (this.usos.scanner) {
      clase.push('    private static final Scanner __entrada = new Scanner(System.in);');
      clase.push('');
    }

    if (this.usos.aleatorio) {
      clase.push('    /** Entero aleatorio entre min y max, ambos incluidos. */');
      clase.push('    private static int __aleatorio (int min, int max) {');
      clase.push('        return (int) (Math.random() * ((long) max - min + 1)) + min;');
      clase.push('    }');
      clase.push('');
    }

    miembros.forEach((m, i) => {
      if (i > 0) clase.push('');
      clase.push(indentar(m, 1));
    });

    clase.push('}');
    partes.push(clase.join('\n'));
    return partes.join('\n\n') + '\n';
  }

  // ------------------------------------------------------------------
  // Miembros de la clase
  // ------------------------------------------------------------------

  _main (principal) {
    this._abrirAmbito();
    const cuerpo = this._bloque(principal.cuerpo);
    this._cerrarAmbito();

    return 'public static void main (String[] args) {\n' +
      indentar(cuerpo, 1) + '\n}';
  }

  _funcion (f) {
    const tipo = TIPOS_JAVA[f.tipoRetorno] || 'void';
    const parametros = f.parametros
      .map((p) => `${TIPOS_JAVA[p.tipoDato] || 'int'} ${this._id(p.nombre)}`)
      .join(', ');

    this._abrirAmbito();
    f.parametros.forEach((p) => this._declarar(p.nombre, p.tipoDato));

    const cuerpo = this._bloque(f.cuerpo);
    this._cerrarAmbito();

    return `public static ${tipo} ${this._id(f.nombre)} (${parametros}) {\n` +
      indentar(cuerpo, 1) + '\n}';
  }

  // ------------------------------------------------------------------
  // Instrucciones
  // ------------------------------------------------------------------

  /** Genera una lista de instrucciones ya indentada como un bloque. */
  _bloque (bloque) {
    this._abrirAmbito();
    const codigo = this._instrucciones(bloque ? bloque.instrucciones : []);
    this._cerrarAmbito();
    return codigo;
  }

  _instrucciones (instrucciones) {
    return (instrucciones || [])
      .map((n) => this._instruccion(n))
      .filter((s) => s && s.trim() !== '')
      .join('\n');
  }

  _instruccion (n) {
    if (!n) return '';

    switch (n.tipo) {
      case 'Declaracion': return this._declaracion(n) + ';';
      case 'Constante': return this._constante(n);
      case 'Arreglo':
      case 'Matriz': return this._arreglo(n);
      case 'Asignacion': return `${this._destino(n.destino)} = ${this._expr(n.valor)};`;
      case 'IncrementoStmt': return `${this._destino(n.destino)}${n.operador};`;
      case 'ExpresionInstruccion': return `${this._expr(n.expresion)};`;
      case 'Impresion': return this._impresion(n);
      case 'Leer': return this._leer(n);
      case 'Equipo': return this._equipo(n);
      case 'Limpiar': return this._limpiar();
      case 'Esperar': return this._esperar(n);
      case 'Si': return this._si(n);
      case 'Para': return this._para(n);
      case 'Mientras': return this._mientras(n);
      case 'HacerMientras': return this._hacerMientras(n);
      case 'Opcion': return this._opcion(n);
      case 'Intentar': return this._intentar(n);
      case 'Retornar': return this._retornar(n);
      case 'Romper': return 'break;';
      default: return '';
    }
  }

  /** entero a = 5, b; */
  _declaracion (n) {
    const tipo = TIPOS_JAVA[n.tipoDato] || 'int';
    const partes = n.declaradores.map((d) => {
      // El valor se lee antes de declarar el nombre, como en Java.
      const valor = d.valor ? ' = ' + this._expr(d.valor) : '';
      this._declarar(d.nombre, n.tipoDato);
      return `${this._id(d.nombre)}${valor}`;
    });
    return `${tipo} ${partes.join(', ')}`;
  }

  /** Constante decimal IVA = 0.16; */
  _constante (n) {
    const valor = this._expr(n.valor);
    this._declarar(n.nombre, n.tipoDato);
    return `final ${TIPOS_JAVA[n.tipoDato] || 'double'} ${this._id(n.nombre)} = ${valor};`;
  }

  /** Arreglo entero datos[3];   matriz entero t[2][2] = {{1,2},{3,4}}; */
  _arreglo (n) {
    const base = TIPOS_JAVA[n.tipoDato] || 'int';
    const dimensiones = n.numDimensiones || (n.tipo === 'Matriz' ? 2 : 1);
    const corchetes = '[]'.repeat(dimensiones);
    const tipo = base + corchetes;

    let inicializacion;
    if (n.valores) {
      inicializacion = `new ${tipo} ${this._inicializador(n.valores)}`;
    } else {
      const tamanos = (n.dimensiones || []).map((d) => this._expr(d));
      while (tamanos.length < dimensiones) tamanos.push('0');
      inicializacion = `new ${base}${tamanos.map((t) => `[${t}]`).join('')}`;
    }

    this._declarar(n.nombre, n.tipoDato + corchetes);
    return `${tipo} ${this._id(n.nombre)} = ${inicializacion};`;
  }

  _inicializador (n) {
    const elementos = (n.elementos || []).map((e) =>
      e.tipo === 'Inicializador' ? this._inicializador(e) : this._expr(e));
    return `{ ${elementos.join(', ')} }`;
  }

  /** imprimir, imprimirLn, imprimirF */
  _impresion (n) {
    const argumentos = n.argumentos.map((a) => this._expr(a));

    if (n.funcion === 'imprimirF') {
      return `System.out.printf(${argumentos.join(', ')});`;
    }
    if (n.funcion === 'imprimir') {
      return `System.out.print(${argumentos.join(', ')});`;
    }
    return `System.out.println(${argumentos.join(', ')});`;
  }

  /** leer(x);  ->  x = __entrada.nextInt(); */
  _leer (n) {
    this.usos.scanner = true;
    const tipo = this._tipoExpr(n.destino);
    const destino = this._destino(n.destino);

    let lectura = '__entrada.nextLine()';
    if (tipo === 'entero') lectura = '__entrada.nextInt()';
    else if (tipo === 'corto') lectura = '__entrada.nextShort()';
    else if (tipo === 'byte') lectura = '__entrada.nextByte()';
    else if (tipo === 'largo') lectura = '__entrada.nextLong()';
    else if (tipo === 'flotante') lectura = '__entrada.nextFloat()';
    else if (tipo === 'decimal') lectura = '__entrada.nextDouble()';
    else if (tipo === 'logico') lectura = '__entrada.nextBoolean()';
    else if (tipo === 'caracter') lectura = '__entrada.next().charAt(0)';

    return `${destino} = ${lectura};`;
  }

  /** equipo();  imprime los datos del equipo. */
  _equipo (n) {
    const lineas = [`System.out.println("Equipo: " + ${cadenaJava(NOMBRE_EQUIPO)});`];
    nombresCompletos().forEach((nombre) => {
      lineas.push(`System.out.println(${cadenaJava(nombre)});`);
    });
    return lineas.join('\n');
  }

  _limpiar () {
    return 'System.out.print("\\033[H\\033[2J");\nSystem.out.flush();';
  }

  _esperar (n) {
    return 'try {\n' +
      indentar(`Thread.sleep((long) (${this._expr(n.milisegundos)}));`, 1) + '\n' +
      '} catch (InterruptedException e) {\n' +
      '    Thread.currentThread().interrupt();\n' +
      '}';
  }

  _si (n) {
    let codigo = `if (${this._expr(n.condicion)}) {\n` +
      indentar(this._bloque(n.entonces), 1) + '\n}';

    (n.ramas || []).forEach((r) => {
      codigo += ` else if (${this._expr(r.condicion)}) {\n` +
        indentar(this._bloque(r.cuerpo), 1) + '\n}';
    });

    if (n.sino) {
      codigo += ' else {\n' + indentar(this._bloque(n.sino.cuerpo), 1) + '\n}';
    }
    return codigo;
  }

  _para (n) {
    this._abrirAmbito();

    const inicializacion = n.inicializacion.tipo === 'Declaracion'
      ? this._declaracion(n.inicializacion)
      : `${this._destino(n.inicializacion.destino)} = ${this._expr(n.inicializacion.valor)}`;

    const condicion = this._expr(n.condicion);

    const actualizacion = n.actualizacion.tipo === 'IncrementoStmt'
      ? `${this._destino(n.actualizacion.destino)}${n.actualizacion.operador}`
      : `${this._destino(n.actualizacion.destino)} = ${this._expr(n.actualizacion.valor)}`;

    const cuerpo = this._bloque(n.cuerpo);
    this._cerrarAmbito();

    return `for (${inicializacion}; ${condicion}; ${actualizacion}) {\n` +
      indentar(cuerpo, 1) + '\n}';
  }

  _mientras (n) {
    return `while (${this._expr(n.condicion)}) {\n` +
      indentar(this._bloque(n.cuerpo), 1) + '\n}';
  }

  _hacerMientras (n) {
    return 'do {\n' + indentar(this._bloque(n.cuerpo), 1) + '\n' +
      `} while (${this._expr(n.condicion)});`;
  }

  _opcion (n) {
    const lineas = [`switch (${this._expr(n.expresion)}) {`];

    (n.casos || []).forEach((c) => {
      lineas.push(`    case ${this._expr(c.valor)}:`);
      const cuerpo = this._bloque(c.cuerpo);
      if (cuerpo.trim() !== '') lineas.push(indentar(cuerpo, 2));
    });

    if (n.porDefecto) {
      lineas.push('    default:');
      const cuerpo = this._bloque(n.porDefecto.cuerpo);
      if (cuerpo.trim() !== '') lineas.push(indentar(cuerpo, 2));
    }

    lineas.push('}');
    return lineas.join('\n');
  }

  _intentar (n) {
    this._abrirAmbito();
    this._declarar(n.variableError, 'Error');
    const manejo = this._instrucciones(n.manejo ? n.manejo.instrucciones : []);
    this._cerrarAmbito();

    return 'try {\n' + indentar(this._bloque(n.cuerpo), 1) + '\n' +
      `} catch (Exception ${this._id(n.variableError)}) {\n` +
      indentar(manejo, 1) + '\n}';
  }

  _retornar (n) {
    return n.valor ? `return ${this._expr(n.valor)};` : 'return;';
  }

  // ------------------------------------------------------------------
  // Expresiones
  // ------------------------------------------------------------------

  _expr (n) {
    if (!n) return 'null';

    switch (n.tipo) {
      case 'Literal': return this._literal(n);
      case 'Variable': return this._id(n.nombre);
      case 'Indexacion':
        return this._id(n.nombre) + n.indices.map((i) => `[${this._expr(i)}]`).join('');
      case 'Binaria': return this._binaria(n);
      case 'Unaria': return this._unaria(n);
      case 'Postfija': return `(${this._expr(n.operando)}${n.operador})`;
      case 'Asignacion':
        return `(${this._destino(n.destino)} = ${this._expr(n.valor)})`;
      case 'Llamada':
        return `${this._id(n.nombre)}(${n.argumentos.map((a) => this._expr(a)).join(', ')})`;
      case 'Nativa': return this._nativa(n);
      case 'Convertir': return this._convertir(n);
      case 'Geometrica': return this._geometrica(n);
      default: return 'null';
    }
  }

  _literal (n) {
    switch (n.tipoDato) {
      case 'LIT_ENTERO':
      case 'LIT_DECIMAL':
        return n.lexema;
      case 'LIT_CADENA':
        return cadenaJava(n.valor);
      case 'LIT_CARACTER':
        return caracterJava(n.valor);
      case 'LIT_LOGICO':
        return n.valor === 'verdadero' || n.valor === true ? 'true' : 'false';
      default:
        return 'null';
    }
  }

  _destino (n) {
    if (!n) return 'null';
    if (n.tipo === 'Indexacion') {
      return this._id(n.nombre) + n.indices.map((i) => `[${this._expr(i)}]`).join('');
    }
    return this._id(n.nombre);
  }

  _binaria (n) {
    const op = n.operador;

    if (op === 'Y' || op === 'AND' || op === '&&') {
      return `(${this._expr(n.izquierda)} && ${this._expr(n.derecha)})`;
    }
    if (op === 'O' || op === 'OR' || op === '||') {
      return `(${this._expr(n.izquierda)} || ${this._expr(n.derecha)})`;
    }
    if (op === '^' || op === '**') {
      return `Math.pow(${this._expr(n.izquierda)}, ${this._expr(n.derecha)})`;
    }
    if (op === '==' || op === '!=') {
      const izquierda = this._expr(n.izquierda);
      const derecha = this._expr(n.derecha);
      const tipoIzq = this._tipoExpr(n.izquierda);
      const tipoDer = this._tipoExpr(n.derecha);
      if (tipoIzq === 'cadena' || tipoDer === 'cadena') {
        const igual = `java.util.Objects.equals(${izquierda}, ${derecha})`;
        return op === '==' ? igual : `(!${igual})`;
      }
      return `(${izquierda} ${op} ${derecha})`;
    }

    return `(${this._expr(n.izquierda)} ${op} ${this._expr(n.derecha)})`;
  }

  _unaria (n) {
    const op = n.operador;
    if (op === 'NO' || op === 'NOT' || op === '!') {
      return `(!${this._expr(n.operando)})`;
    }
    if (op === '√') return `Math.sqrt(${this._expr(n.operando)})`;
    return `(${op}${this._expr(n.operando)})`;
  }

  _nativa (n) {
    const args = n.argumentos.map((a) => this._expr(a));

    switch (n.nombre) {
      case 'longitud': {
        const tipo = this._tipoExpr(n.argumentos[0]);
        return tipo && tipo.endsWith('[]')
          ? `(${args[0]}).length`
          : `(${args[0]}).length()`;
      }
      case 'aleatorio':
        this.usos.aleatorio = true;
        return `__aleatorio(${args[0]}, ${args[1]})`;
      case 'potencia':
        return `Math.pow(${args[0]}, ${args[1]})`;
      case 'raiz':
        return args.length === 2
          ? `Math.pow(${args[0]}, 1.0 / (${args[1]}))`
          : `Math.sqrt(${args[0]})`;
      case 'raizCuadrada':
        return `Math.sqrt(${args[0]})`;
      case 'raizCubica':
        return `Math.cbrt(${args[0]})`;
      case 'redondear':
        return `((int) Math.round(${args[0]}))`;
      case 'logaritmo':
        return args.length === 2
          ? `(Math.log(${args[1]}) / Math.log(${args[0]}))`
          : `Math.log(${args[0]})`;
      case 'logaritmo10':
        return `Math.log10(${args[0]})`;
      case 'seno':
        return `Math.sin(${args[0]})`;
      case 'coseno':
        return `Math.cos(${args[0]})`;
      default:
        return '0';
    }
  }

  _convertir (n) {
    const destino = n.tipoDestino;
    const origen = this._tipoExpr(n.valor);
    const valor = this._expr(n.valor);

    if (destino === 'cadena') return `String.valueOf(${valor})`;

    if (destino === 'logico') {
      return origen === 'cadena' ? `Boolean.parseBoolean(${valor})` : valor;
    }

    if (destino === 'caracter') {
      if (origen === 'cadena') return `(${valor}).charAt(0)`;
      if (origen === 'caracter') return valor;
      return `((char) (${valor}))`;
    }

    if (esEntero(destino)) {
      if (origen === 'cadena') {
        const metodos = {
          byte: 'Byte.parseByte',
          corto: 'Short.parseShort',
          entero: 'Integer.parseInt',
          largo: 'Long.parseLong'
        };
        return `${metodos[destino]}(${valor})`;
      }
      return `((${TIPOS_JAVA[destino]}) (${valor}))`;
    }

    if (destino === 'flotante' || destino === 'decimal') {
      if (origen === 'cadena') {
        return destino === 'flotante'
          ? `Float.parseFloat(${valor})`
          : `Double.parseDouble(${valor})`;
      }
      return `((${TIPOS_JAVA[destino]}) (${valor}))`;
    }

    return valor;
  }

  _geometrica (n) {
    const a = n.argumentos.map((x) => this._expr(x));
    const familia = n.familia;
    const figura = n.figura;

    if (familia === 'perimetro') {
      if (figura === 'circulo') return `(2 * Math.PI * ${a[0]})`;
      if (figura === 'cuadrado') return `(4 * ${a[0]})`;
      if (figura === 'rectangulo') return `(2 * (${a[0]} + ${a[1]}))`;
      if (figura === 'triangulo') return `(${a[0]} + ${a[1]} + ${a[2]})`;
    }

    if (familia === 'area') {
      if (figura === 'circulo') return `(Math.PI * ${a[0]} * ${a[0]})`;
      if (figura === 'cuadrado') return `(${a[0]} * ${a[0]})`;
      if (figura === 'rectangulo') return `(${a[0]} * ${a[1]})`;
      if (figura === 'triangulo') return `(${a[0]} * ${a[1]} / 2.0)`;
    }

    if (familia === 'volumen') {
      if (figura === 'cubo') return `(${a[0]} * ${a[0]} * ${a[0]})`;
      if (figura === 'esfera') return `(4.0 / 3.0 * Math.PI * ${a[0]} * ${a[0]} * ${a[0]})`;
      if (figura === 'cilindro') return `(Math.PI * ${a[0]} * ${a[0]} * ${a[1]})`;
      if (figura === 'cono') return `(Math.PI * ${a[0]} * ${a[0]} * ${a[1]} / 3.0)`;
      if (figura === 'prisma') return `(${a[0]} * ${a[1]})`;
      if (figura === 'piramide') return `(${a[0]} * ${a[1]} / 3.0)`;
    }

    return '0.0';
  }

  // ------------------------------------------------------------------
  // Tipos: para saber si longitud mide un arreglo y para leer
  // ------------------------------------------------------------------

  _tipoExpr (n) {
    if (!n) return null;

    switch (n.tipo) {
      case 'Literal':
        if (n.tipoDato === 'LIT_ENTERO') return /[lL]$/.test(n.lexema) ? 'largo' : 'entero';
        if (n.tipoDato === 'LIT_DECIMAL') return /[fF]$/.test(n.lexema) ? 'flotante' : 'decimal';
        if (n.tipoDato === 'LIT_CADENA') return 'cadena';
        if (n.tipoDato === 'LIT_CARACTER') return 'caracter';
        if (n.tipoDato === 'LIT_LOGICO') return 'logico';
        return null;

      case 'Variable':
      case 'Indexacion': {
        const tipo = this._buscar(n.nombre);
        if (!tipo) return null;
        if (n.tipo === 'Variable') return tipo;
        const indices = n.indices ? n.indices.length : 1;
        let resultado = tipo;
        for (let i = 0; i < indices; i++) {
          if (!resultado.endsWith('[]')) return null;
          resultado = resultado.slice(0, -2);
        }
        return resultado;
      }

      case 'Binaria': {
        const op = n.operador;
        if (op === 'Y' || op === 'AND' || op === '&&' ||
            op === 'O' || op === 'OR' || op === '||' ||
            op === '==' || op === '!=' || op === '<' || op === '>' ||
            op === '<=' || op === '>=') return 'logico';
        if (op === '^' || op === '**') return 'decimal';
        const izq = this._tipoExpr(n.izquierda);
        const der = this._tipoExpr(n.derecha);
        if (op === '+' && (izq === 'cadena' || der === 'cadena')) return 'cadena';
        if (!izq || !der || !esNumero(izq) || !esNumero(der)) return null;
        return promover(izq, der);
      }

      case 'Unaria': {
        const op = n.operador;
        if (op === 'NO' || op === 'NOT' || op === '!') return 'logico';
        if (op === '√') return 'decimal';
        const tipo = this._tipoExpr(n.operando);
        return tipo && esNumero(tipo) ? promover(tipo, 'entero') : null;
      }

      case 'Postfija': return this._tipoExpr(n.operando);
      case 'Asignacion': return this._tipoExpr(n.destino);
      case 'Llamada': {
        const f = this.funciones.get(n.nombre);
        return f ? f.tipoRetorno : null;
      }
      case 'Nativa': return TIPO_NATIVA[n.nombre] || null;
      case 'Convertir': return n.tipoDestino;
      case 'Geometrica': return 'decimal';
      default: return null;
    }
  }

  // ------------------------------------------------------------------
  // Ambitos y nombres
  // ------------------------------------------------------------------

  _abrirAmbito () {
    this.ambitos.push(new Map());
  }

  _cerrarAmbito () {
    this.ambitos.pop();
  }

  _declarar (nombre, tipo) {
    const ambito = this.ambitos[this.ambitos.length - 1];
    if (ambito) ambito.set(nombre, tipo);
  }

  _buscar (nombre) {
    for (let i = this.ambitos.length - 1; i >= 0; i--) {
      if (this.ambitos[i].has(nombre)) return this.ambitos[i].get(nombre);
    }
    return null;
  }

  /** Un nombre que Java acepta, aunque el codigo use una palabra reservada. */
  _id (nombre) {
    const texto = String(nombre === null || nombre === undefined ? '' : nombre);
    return RESERVADAS_JAVA.has(texto) ? texto + '_' : texto;
  }
}

/**
 * Genera el programa Java de un AST.
 * @param {object} ast Nodo "Programa" del analisis sintactico.
 * @returns {string}
 */
function generarJava (ast) {
  return new GeneradorJava(ast).generar();
}

module.exports = { generarJava, cadenaJava, TIPOS_JAVA };
