/**
 * interprete-intermedio.js
 * SOLO PARA LAS PRUEBAS: ejecuta el codigo de tres direcciones (el de la
 * fase 4 o el optimizado de la fase 5) y devuelve lo que el programa imprime.
 *
 * Sirve para comprobar lo mas importante del optimizador: que el codigo
 * optimizado hace EXACTAMENTE lo mismo que el original.
 *
 *   const salida = ejecutarIntermedio(resultado.intermedio.instrucciones, { entradas: ['5'] });
 *   // 'Hola\n7\n'
 *
 * Cada valor lleva su tipo:  { tipo, valor }, con tipo 'entero', 'decimal',
 * 'cadena', 'caracter', 'logico', 'arreglo' o 'error'. Asi 5 y 5.0 no son
 * lo mismo:  5 / 2 da 2  y  5.0 / 2 da 2.5, igual que en Java.
 *
 * Las funciones del lenguaje que no se pueden repetir igual (aleatorio) dan
 * siempre la misma serie de numeros, y las de geometria solo multiplican sus
 * medidas: aqui no importa el resultado exacto, sino que antes y despues de
 * optimizar sea el mismo.
 */

/** Un error que el programa puede capturar con intentar / capturar. */
class ErrorDelPrograma extends Error {}

const cero = () => ({ tipo: 'entero', valor: 0 });
const logico = (v) => ({ tipo: 'logico', valor: v });

/** Quita las secuencias de escape de un texto:  \n  \t  \"  \\ */
function sinEscapes (texto) {
  return texto.replace(/\\(.)/g, (_, c) => ({ n: '\n', t: '\t', r: '\r', 0: '\0' }[c] || c));
}

/** Un valor escrito en el codigo (5, 2.5, "hola", 'A', verdadero), o null si es un nombre. */
function literal (x) {
  if (x === 'verdadero' || x === 'falso') return logico(x === 'verdadero');
  if (/^-?\d+[lL]?$/.test(x)) return { tipo: 'entero', valor: parseInt(x, 10) };
  if (/^-?\d+\.\d+[fFdD]?$/.test(x)) return { tipo: 'decimal', valor: parseFloat(x) };
  if (x.startsWith('"')) return { tipo: 'cadena', valor: sinEscapes(x.slice(1, -1)) };
  if (x.startsWith("'")) return { tipo: 'caracter', valor: sinEscapes(x.slice(1, -1)) };
  return null;
}

/** Como se imprime un valor (un decimal siempre con punto, como en Java: 3.0). */
function mostrar (v) {
  switch (v.tipo) {
    case 'decimal': return Number.isInteger(v.valor) ? v.valor.toFixed(1) : String(v.valor);
    case 'logico': return v.valor ? 'verdadero' : 'falso';
    case 'arreglo': return '[arreglo]';
    default: return String(v.valor);
  }
}

const esNumero = (v) => v.tipo === 'entero' || v.tipo === 'decimal';

/** a op b */
function operar (op, a, b) {
  switch (op) {
    case '==': return logico(a.valor === b.valor);
    case '!=': return logico(a.valor !== b.valor);
    case '<': return logico(a.valor < b.valor);
    case '>': return logico(a.valor > b.valor);
    case '<=': return logico(a.valor <= b.valor);
    case '>=': return logico(a.valor >= b.valor);
    default: break;
  }
  if (op === '+' && (a.tipo === 'cadena' || b.tipo === 'cadena')) {
    return { tipo: 'cadena', valor: mostrar(a) + mostrar(b) };
  }
  if (!esNumero(a) || !esNumero(b)) throw new Error(`${op} con ${a.tipo} y ${b.tipo}`);

  const enteros = a.tipo === 'entero' && b.tipo === 'entero';
  const x = a.valor;
  const y = b.valor;
  let r;
  switch (op) {
    case '+': r = x + y; break;
    case '-': r = x - y; break;
    case '*': r = x * y; break;
    case '/':
      if (enteros && y === 0) throw new ErrorDelPrograma('/ by zero');
      r = enteros ? Math.trunc(x / y) : x / y;
      break;
    case '%':
      if (enteros && y === 0) throw new ErrorDelPrograma('/ by zero');
      r = x % y;
      break;
    default: throw new Error(`operador desconocido: ${op}`);
  }
  return { tipo: enteros ? 'entero' : 'decimal', valor: r };
}

/** (tipo) v */
function convertir (v, tipo) {
  const numero = (texto) => {
    const n = Number(texto.trim());
    if (texto.trim() === '' || Number.isNaN(n)) throw new ErrorDelPrograma(`NumberFormatException: "${texto}"`);
    return n;
  };
  switch (tipo) {
    case 'decimal':
    case 'flotante':
      if (v.tipo === 'cadena') return { tipo: 'decimal', valor: numero(v.valor) };
      if (v.tipo === 'caracter') return { tipo: 'decimal', valor: v.valor.charCodeAt(0) };
      return { tipo: 'decimal', valor: v.valor };
    case 'byte': case 'corto': case 'entero': case 'largo': {
      if (v.tipo === 'cadena') {
        if (!/^\s*[-+]?\d+\s*$/.test(v.valor)) throw new ErrorDelPrograma(`NumberFormatException: "${v.valor}"`);
        return { tipo: 'entero', valor: parseInt(v.valor, 10) };
      }
      if (v.tipo === 'caracter') return { tipo: 'entero', valor: v.valor.charCodeAt(0) };
      return { tipo: 'entero', valor: Math.trunc(v.valor) };
    }
    case 'cadena': return { tipo: 'cadena', valor: mostrar(v) };
    case 'logico': return logico(v.tipo === 'logico' ? v.valor : v.valor === 'verdadero');
    case 'caracter':
      return { tipo: 'caracter', valor: v.tipo === 'entero' ? String.fromCharCode(v.valor) : String(v.valor)[0] };
    default: throw new Error(`no se convertir a ${tipo}`);
  }
}

/** imprimirF("Edad: %d, promedio: %.2f", ...) */
function formatear (formato, valores) {
  let k = 0;
  return formato.replace(/%[-#+ 0,(]*\d*(?:\.(\d+))?([a-zA-Z%])/g, (_, decimales, letra) => {
    if (letra === 'n') return '\n';
    if (letra === '%') return '%';
    const v = valores[k++];
    if (decimales !== undefined && esNumero(v)) return v.valor.toFixed(Number(decimales));
    return mostrar(v);
  });
}

/**
 * Ejecuta el codigo de tres direcciones de un programa, desde clasePrincipal.
 *
 * @param {Array}  instrucciones [{ op, arg1, arg2, resultado }]
 * @param {object} [opciones]
 * @param {string[]} [opciones.entradas] Lo que se "escribe" en cada leer.
 * @param {number}   [opciones.limite]   Cuantas instrucciones como maximo
 *                                       (por si un ciclo no termina).
 * @returns {string} Lo que imprime el programa.
 */
function ejecutarIntermedio (instrucciones, opciones = {}) {
  const entradas = (opciones.entradas || []).slice();
  const limite = opciones.limite || 200000;
  let salida = '';
  let pasos = 0;
  let semilla = 7;

  // Donde empieza cada funcion y donde esta cada etiqueta
  const funciones = new Map();
  const etiquetas = new Map();
  instrucciones.forEach((ins, i) => {
    if (ins.op === 'funcion') funciones.set(ins.arg1, i);
    if (ins.op === 'etiqueta') etiquetas.set(ins.resultado, i);
  });

  /** Las funciones del lenguaje. */
  function nativa (nombre, args) {
    const n = (k) => args[k].valor;
    switch (nombre) {
      case 'imprimir': salida += mostrar(args[0]); return undefined;
      case 'imprimirLn': salida += (args[0] ? mostrar(args[0]) : '') + '\n'; return undefined;
      case 'imprimirF': salida += formatear(n(0), args.slice(1)); return undefined;
      case 'equipo': salida += '[equipo]\n'; return undefined;
      case 'limpiar': salida += '[limpiar]\n'; return undefined;
      case 'esperar': return undefined;
      case 'longitud': return { tipo: 'entero', valor: n(0).length };
      case 'aleatorio':
        semilla = (semilla * 1103515245 + 12345) % 2147483648;
        return { tipo: 'entero', valor: n(0) + (semilla % (n(1) - n(0) + 1)) };
      case 'potencia': return { tipo: 'decimal', valor: Math.pow(n(0), n(1)) };
      case 'redondear': return { tipo: 'entero', valor: Math.round(n(0)) };
      case 'logaritmo': return { tipo: 'decimal', valor: Math.log(n(0)) / (args[1] ? Math.log(n(1)) : 1) };
      case 'logaritmo10': return { tipo: 'decimal', valor: Math.log10(n(0)) };
      case 'seno': return { tipo: 'decimal', valor: Math.sin(n(0)) };
      case 'coseno': return { tipo: 'decimal', valor: Math.cos(n(0)) };
      default:
        if (/^(area|perimetro|volumen)\./.test(nombre)) {
          return { tipo: 'decimal', valor: args.reduce((p, a) => p * a.valor, 1) };
        }
        throw new Error(`funcion desconocida: ${nombre}`);
    }
  }

  /** Ejecuta una funcion del programa y devuelve lo que retorna. */
  function llamar (nombre, args) {
    if (!funciones.has(nombre)) return nativa(nombre, args);

    const inicio = funciones.get(nombre);
    const marco = { variables: new Map(), parametros: [], manejadores: [], error: null };
    const nombres = instrucciones[inicio].arg2 ? instrucciones[inicio].arg2.split(' ') : [];
    nombres.forEach((p, k) => marco.variables.set(p, args[k]));

    const valor = (x) => {
      const fijo = literal(x);
      if (fijo) return fijo;
      if (!marco.variables.has(x)) throw new Error(`'${x}' se usa sin valor`);
      return marco.variables.get(x);
    };
    const guardar = (x, v) => marco.variables.set(x, v);

    let pc = inicio + 1;
    for (;;) {
      if (++pasos > limite) throw new Error('LIMITE');
      const ins = instrucciones[pc];
      let siguiente = pc + 1;
      try {
        switch (ins.op) {
          case 'fin': return undefined;
          case 'return': return ins.arg1 ? valor(ins.arg1) : undefined;
          case 'etiqueta': break;
          case '=': guardar(ins.resultado, valor(ins.arg1)); break;
          case 'menos': {
            const v = valor(ins.arg1);
            guardar(ins.resultado, { tipo: v.tipo, valor: -v.valor });
            break;
          }
          case 'NO': guardar(ins.resultado, logico(!valor(ins.arg1).valor)); break;
          case 'convertir': guardar(ins.resultado, convertir(valor(ins.arg1), ins.arg2)); break;
          case 'reservar': {
            const tamano = valor(ins.arg1).valor;
            guardar(ins.resultado, { tipo: 'arreglo', valor: Array.from({ length: tamano }, cero) });
            break;
          }
          case '=[]':
          case '[]=': {
            const arreglo = valor(ins.op === '=[]' ? ins.arg1 : ins.resultado).valor;
            const i = valor(ins.arg2).valor;
            if (i < 0 || i >= arreglo.length) throw new ErrorDelPrograma(`Index ${i} out of bounds`);
            if (ins.op === '=[]') guardar(ins.resultado, arreglo[i]);
            else arreglo[i] = valor(ins.arg1);
            break;
          }
          case 'goto': siguiente = etiquetas.get(ins.resultado); break;
          case 'if': if (valor(ins.arg1).valor) siguiente = etiquetas.get(ins.resultado); break;
          case 'ifFalse': if (!valor(ins.arg1).valor) siguiente = etiquetas.get(ins.resultado); break;
          case 'if==':
            if (valor(ins.arg1).valor === valor(ins.arg2).valor) siguiente = etiquetas.get(ins.resultado);
            break;
          case 'param': marco.parametros.push(valor(ins.arg1)); break;
          case 'call': {
            const cuantos = Number(ins.arg2);
            const argumentos = marco.parametros.splice(marco.parametros.length - cuantos, cuantos);
            const r = llamar(ins.arg1, argumentos);
            if (ins.resultado) guardar(ins.resultado, r);
            break;
          }
          case 'leer': {
            if (entradas.length === 0) throw new Error('leer sin entradas');
            // Lo que se escribe es un numero (5, 2.5), un logico o un texto
            const escrito = entradas.shift();
            const fijo = /^["']/.test(escrito) ? null : literal(escrito);
            guardar(ins.resultado, fijo || { tipo: 'cadena', valor: escrito });
            break;
          }
          case 'intentar': marco.manejadores.push(ins.resultado); break;
          case 'finIntentar': marco.manejadores.pop(); break;
          case 'capturar': guardar(ins.resultado, { tipo: 'error', valor: marco.error }); break;
          default: guardar(ins.resultado, operar(ins.op, valor(ins.arg1), valor(ins.arg2)));
        }
      } catch (e) {
        // Un error dentro de intentar salta a su capturar; si no, sube a quien llamo.
        if (!(e instanceof ErrorDelPrograma) || marco.manejadores.length === 0) throw e;
        marco.error = e.message;
        siguiente = etiquetas.get(marco.manejadores.pop());
      }
      pc = siguiente;
    }
  }

  try {
    llamar('clasePrincipal', []);
  } catch (e) {
    salida += `ERROR: ${e.message}\n`;
  }
  return salida;
}

module.exports = { ejecutarIntermedio };
