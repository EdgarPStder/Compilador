/**
 * GeneradorGramatica.js
 * Parte del analisis semantico (pestaña 3): escribe la GRAMATICA del codigo.
 *
 * Recorre el arbol que armo el analizador sintactico y escribe las reglas que
 * producen exactamente ese codigo. Por ejemplo:
 *
 *   Codigo:   clase p { clasePrincipal { a1 = b5 / 20; } }
 *
 *   prop      -> clase id { principal }
 *   principal -> clasePrincipal { inst }
 *   inst      -> id = exp ;
 *   exp       -> id | num | exp / exp
 *   id        -> let ( let | dig )*
 *   num       -> dig ( dig )*
 *   dig       -> 0-9
 *   let       -> a-z
 *
 * Como se hace:
 *
 *   1. Cada nodo del arbol aporta una produccion con la forma en que se
 *      escribio:  una suma aporta  exp -> exp + exp.
 *   2. Solo se escriben las alternativas que de verdad aparecen en el codigo:
 *      si no hay multiplicaciones, no sale  exp -> exp * exp.
 *   3. Al final se agregan las reglas de las palabras (id, num, cadena...) y
 *      de los caracteres (dig, let, LET, simb), tambien solo con lo que se uso.
 */

const { textoExpresion, textoInstruccion } = require('./TextoDeNodo');

// ====================================================================
// Los simbolos de una produccion
// ====================================================================

/** Un no terminal: el nombre de otra regla (exp, id, inst...). */
const N = (texto) => ({ texto, clase: 'no-terminal' });
/** Un terminal: se escribe tal cual en el codigo (si, (, ;, +...). */
const T = (texto) => ({ texto, clase: 'terminal' });
/** Un simbolo de la notacion, no del codigo:  (  |  )*  [  ] */
const M = (texto) => ({ texto, clase: 'meta' });
/** Un rango de caracteres: 0-9, a-z, A-Z. */
const R = (texto) => ({ texto, clase: 'rango' });

/**
 * Orden en que se muestran las reglas, como en el pizarron:
 *   1. prop (el programa) y las reglas de estructura,
 *      de arriba hacia abajo: cada una aparece despues de la primera regla
 *      que la nombra.
 *   2. Las palabras, en este orden fijo.
 *   3. Los caracteres, en este orden fijo.
 */
const REGLAS_DE_PALABRAS = ['tipo', 'id', 'num', 'dec', 'suf', 'cadena', 'TEXTO', 'car', 'logico'];
const REGLAS_DE_CARACTERES = ['dig', 'LET', 'let', 'simb'];

/**
 * Entre alternativas del mismo largo van primero estas, en este orden:
 *   exp -> id | num | cadena ...
 */
const PRIMERO = ['id', 'num', 'dec', 'cadena', 'car', 'logico'];

/** Que dice cada regla, para el texto de ayuda al pasar el mouse. */
const DESCRIPCIONES = {
  prop: 'Una proposición: el programa completo o una instrucción',
  func: 'Una función declarada en la clase',
  principal: 'El bloque principal del programa',
  inst: 'Una instrucción',
  rama: 'Un caso de opcion',
  defecto: 'El caso porDefecto de opcion',
  exp: 'Una expresión',
  ini: 'Una lista de valores iniciales { … }',
  tipo: 'Un tipo de dato',
  id: 'Un identificador (nombre de variable o función)',
  num: 'Un número entero',
  dec: 'Un número decimal',
  suf: 'El sufijo de un número',
  cadena: 'Una cadena de texto entre comillas',
  TEXTO: 'El contenido de una cadena',
  car: 'Un carácter entre comillas simples',
  logico: 'Un valor lógico',
  dig: 'Un dígito',
  LET: 'Una letra mayúscula',
  let: 'Una letra minúscula',
  simb: 'Un símbolo dentro de un texto'
};

// ====================================================================
// Los caracteres
// ====================================================================

/**
 * Dice a que regla de un caracter pertenece c: 'dig', 'LET', 'let' o 'simb'.
 * Las letras con acento y la ñ cuentan como letras, igual que en el
 * analizador lexico.
 */
function claseDeCaracter (c) {
  if (c >= '0' && c <= '9') return 'dig';
  if (c.toLowerCase() !== c.toUpperCase()) {
    return c === c.toUpperCase() ? 'LET' : 'let';
  }
  return 'simb';
}

/** Elementos distintos, en el orden en que aparecen. */
function distintos (lista) {
  return lista.filter((x, i) => lista.indexOf(x) === i);
}

/** El espacio no se ve: en la gramatica se escribe con el simbolo ␣. */
function visible (c) {
  return c === ' ' ? '␣' : c;
}

/** a | b | c : une simbolos con la barra de "o". */
function conBarras (simbolos) {
  return simbolos.flatMap((s, i) => (i === 0 ? [s] : [M('|'), s]));
}

// ====================================================================
// El generador
// ====================================================================

class GeneradorGramatica {
  constructor () {
    /** regla -> Map( texto de la alternativa -> { simbolos, ejemplo } ) */
    this.reglas = new Map();

    // Lo que se va encontrando, para armar al final las reglas de palabras
    this.identificadores = [];
    this.enteros = [];
    this.decimales = [];
    this.cadenas = [];
    this.caracteres = [];
  }

  /** Agrega una alternativa a una regla. Las repetidas se ignoran. */
  agregar (regla, simbolos, ejemplo) {
    if (!this.reglas.has(regla)) this.reglas.set(regla, new Map());
    const alternativas = this.reglas.get(regla);
    const clave = simbolos.map((s) => s.texto).join(' ');
    if (!alternativas.has(clave)) alternativas.set(clave, { simbolos, ejemplo });
  }

  /**
   * Junta las formas de varios elementos de una lista (argumentos,
   * instrucciones de un bloque...):
   *
   *   1 elemento                      X
   *   2 elementos                     X , X
   *   3 o mas, todos iguales          X ( , X )*
   *   3 o mas, distintos              X , Y , Z
   */
  lista (formas, separador) {
    const sep = separador ? [T(separador)] : [];
    if (formas.length === 0) return [];
    if (formas.length === 1) return formas[0];

    const clave = (f) => f.map((s) => s.texto).join(' ');
    const todasIguales = formas.every((f) => clave(f) === clave(formas[0]));

    if (formas.length >= 3 && todasIguales) {
      return [...formas[0], M('('), ...sep, ...formas[0], M(')*')];
    }
    const resultado = [...formas[0]];
    formas.slice(1).forEach((f) => resultado.push(...sep, ...f));
    return resultado;
  }

  // ------------------------------------------------------------------
  // Palabras sueltas: se anotan para las reglas del final
  // ------------------------------------------------------------------

  id (nombre) {
    this.identificadores.push(nombre);
    return N('id');
  }

  tipo (nombre) {
    this.agregar('tipo', [T(nombre)], nombre);
    return N('tipo');
  }

  // ------------------------------------------------------------------
  // La raiz
  // ------------------------------------------------------------------

  /**
   * prop es la proposicion: todo el programa,  clase id { ... }.
   * @param {object} ast  Arbol del programa.
   */
  raiz (ast) {
    this.reglas.set('prop', new Map());
    this.agregar('prop', this.formaPrograma(ast), textoInstruccion(ast));
    this.reglasDePalabras();
  }

  // ------------------------------------------------------------------
  // El programa completo
  // ------------------------------------------------------------------

  /** clase id { func ... principal } */
  formaPrograma (n) {
    const funciones = n.funciones.map((f) => [this.funcion(f)]);
    const principal = n.principal ? [this.principal(n.principal)] : [];
    return [T('clase'), this.id(n.nombre), T('{'),
      ...this.lista(funciones, ''), ...principal, T('}')];
  }

  funcion (f) {
    const parametros = f.parametros.map((p) => [this.tipo(p.tipoDato), this.id(p.nombre)]);
    this.agregar('func', [T('funcion'), this.tipo(f.tipoRetorno), this.id(f.nombre),
      T('('), ...this.lista(parametros, ','), T(')'), ...this.bloque(f.cuerpo)],
    textoInstruccion(f));
    return N('func');
  }

  principal (p) {
    this.agregar('principal', [T('clasePrincipal'), ...this.bloque(p.cuerpo)],
      textoInstruccion(p));
    return N('principal');
  }

  // ------------------------------------------------------------------
  // Instrucciones
  // ------------------------------------------------------------------

  /** { inst inst ... } */
  bloque (b) {
    const formas = b.instrucciones.map((i) => [this.instruccion(i)]);
    return [T('{'), ...this.lista(formas, ''), T('}')];
  }

  /** Registra  inst -> (la forma de n)  y devuelve el simbolo inst. */
  instruccion (n) {
    this.agregar('inst', this.formaInstruccion(n), textoInstruccion(n));
    return N('inst');
  }

  /** La forma en que se escribio una instruccion. */
  formaInstruccion (n) {
    const exp = (x) => this.expresion(x);
    const argumentos = (xs) => this.lista(xs.map((x) => [exp(x)]), ',');

    switch (n.tipo) {
      case 'Declaracion': {
        const declaradores = n.declaradores.map((d) => (d.valor
          ? [this.id(d.nombre), T('='), exp(d.valor)]
          : [this.id(d.nombre)]));
        return [this.tipo(n.tipoDato), ...this.lista(declaradores, ','), T(';')];
      }
      case 'Constante':
        return [T('Constante'), this.tipo(n.tipoDato), this.id(n.nombre), T('='),
          exp(n.valor), T(';')];
      case 'Arreglo':
      case 'Matriz':
        return [T(n.tipo === 'Matriz' ? 'matriz' : 'Arreglo'), this.tipo(n.tipoDato),
          this.id(n.nombre), ...this.dimensiones(n),
          ...(n.valores ? [T('='), this.inicializador(n.valores)] : []), T(';')];
      case 'Asignacion':
        return [...this.destino(n.destino), T('='), exp(n.valor), T(';')];
      case 'IncrementoStmt':
        return [...this.destino(n.destino), T(n.operador), T(';')];
      case 'ExpresionInstruccion':
        return [...this.formaExpresion(n.expresion), T(';')];
      case 'Impresion':
        return [T(n.funcion), T('('), ...argumentos(n.argumentos), T(')'), T(';')];
      case 'Leer':
        return [T('leer'), T('('), ...this.destino(n.destino), T(')'), T(';')];
      case 'Equipo':
        return [T('equipo'), T('('), ...(n.conNull ? [T('Null')] : []), T(')'), T(';')];
      case 'Limpiar':
        return [T('limpiar'), T('('), T(')'), T(';')];
      case 'Esperar':
        return [T('esperar'), T('('), exp(n.milisegundos), T(')'), T(';')];
      case 'Si': {
        const forma = [T('si'), T('('), exp(n.condicion), T(')'), ...this.bloque(n.entonces)];
        n.ramas.forEach((r) => forma.push(
          T('sinoSi'), T('('), exp(r.condicion), T(')'), ...this.bloque(r.cuerpo)));
        if (n.sino) forma.push(T('sino'), ...this.bloque(n.sino.cuerpo));
        return forma;
      }
      case 'Para':
        return [T('para'), T('('), ...this.formaInicioPara(n.inicializacion), T(';'),
          exp(n.condicion), T(';'), ...this.formaPasoPara(n.actualizacion), T(')'),
          ...this.bloque(n.cuerpo)];
      case 'Mientras':
        return [T('mientras'), T('('), exp(n.condicion), T(')'), ...this.bloque(n.cuerpo)];
      case 'HacerMientras':
        return [T('hacer'), ...this.bloque(n.cuerpo), T('mientras'), T('('),
          exp(n.condicion), T(')'), T(';')];
      case 'Opcion': {
        const ramas = n.casos.map((c) => [this.rama(c)]);
        const defecto = n.porDefecto ? [this.defecto(n.porDefecto)] : [];
        return [T('opcion'), T('('), exp(n.expresion), T(')'), T('{'),
          ...this.lista(ramas, ''), ...defecto, T('}')];
      }
      case 'Intentar':
        return [T('intentar'), ...this.bloque(n.cuerpo), T('capturar'), T('('),
          T('Error'), this.id(n.variableError), T(')'), ...this.bloque(n.manejo)];
      case 'Retornar':
        return [T('retornar'), ...(n.valor ? [exp(n.valor)] : []), T(';')];
      case 'Romper':
        return [T('romper'), T(';')];
      default:
        return [T(n.tipo)];
    }
  }

  /** caso exp : inst ... */
  rama (c) {
    const instrucciones = c.cuerpo.instrucciones.map((i) => [this.instruccion(i)]);
    this.agregar('rama', [T('caso'), this.expresion(c.valor), T(':'),
      ...this.lista(instrucciones, '')], textoInstruccion(c));
    return N('rama');
  }

  /** porDefecto : inst ... */
  defecto (d) {
    const instrucciones = d.cuerpo.instrucciones.map((i) => [this.instruccion(i)]);
    this.agregar('defecto', [T('porDefecto'), T(':'), ...this.lista(instrucciones, '')],
      textoInstruccion(d));
    return N('defecto');
  }

  /** El primer pedazo de para:  entero i = 1   o   i = 1 */
  formaInicioPara (n) {
    if (n.tipo === 'Declaracion') {
      const d = n.declaradores[0];
      return [this.tipo(n.tipoDato), this.id(d.nombre), T('='), this.expresion(d.valor)];
    }
    return [...this.destino(n.destino), T('='), this.expresion(n.valor)];
  }

  /** El ultimo pedazo de para:  i++   o   i = i + 2 */
  formaPasoPara (n) {
    if (n.tipo === 'IncrementoStmt') return [...this.destino(n.destino), T(n.operador)];
    return [...this.destino(n.destino), T('='), this.expresion(n.valor)];
  }

  /** [ exp ] por cada dimension de un arreglo o matriz; [ ] si va vacia. */
  dimensiones (n) {
    const forma = [];
    for (let i = 0; i < n.numDimensiones; i++) {
      const tamano = n.dimensiones[i];
      forma.push(T('['), ...(tamano ? [this.expresion(tamano)] : []), T(']'));
    }
    return forma;
  }

  /** ini -> { exp , exp , ... } */
  inicializador (n) {
    const elementos = n.elementos.map((e) =>
      [e.tipo === 'Inicializador' ? this.inicializador(e) : this.expresion(e)]);
    this.agregar('ini', [T('{'), ...this.lista(elementos, ','), T('}')], '{ … }');
    return N('ini');
  }

  /** A donde se asigna:  id   o   id [ exp ]   o   id [ exp ] [ exp ] */
  destino (n) {
    const forma = [this.id(n.nombre)];
    (n.indices || []).forEach((i) => forma.push(T('['), this.expresion(i), T(']')));
    return forma;
  }

  // ------------------------------------------------------------------
  // Expresiones
  // ------------------------------------------------------------------

  /** Registra  exp -> (la forma de n)  y devuelve el simbolo exp. */
  expresion (n) {
    this.agregar('exp', this.formaExpresion(n), textoExpresion(n));
    return N('exp');
  }

  /** La forma en que se escribio una expresion. */
  formaExpresion (n) {
    // Entre parentesis:  exp -> ( exp )  y adentro, la expresion misma.
    if (n.parentesis) {
      const adentro = Object.assign({}, n, { parentesis: false });
      this.expresion(adentro);
      return [T('('), N('exp'), T(')')];
    }

    const exp = (x) => this.expresion(x);
    const argumentos = (xs) => this.lista(xs.map((x) => [exp(x)]), ',');

    switch (n.tipo) {
      case 'Literal': return [this.literal(n)];
      case 'Variable':
      case 'Indexacion': return this.destino(n);
      case 'Binaria': return [exp(n.izquierda), T(n.operador), exp(n.derecha)];
      case 'Unaria': return [T(n.operador), exp(n.operando)];
      case 'Postfija': return [exp(n.operando), T(n.operador)];
      case 'Asignacion': return [...this.destino(n.destino), T('='), exp(n.valor)];
      case 'Llamada':
        return [this.id(n.nombre), T('('), ...argumentos(n.argumentos), T(')')];
      case 'Nativa':
        return [T(n.nombre), T('('), ...argumentos(n.argumentos), T(')')];
      case 'Convertir':
        return [T('convertir'), T('('), exp(n.valor), T(','), this.tipo(n.tipoDestino), T(')')];
      case 'Geometrica':
        return [T(n.familia), T('.'), T(n.figura), T('('), ...argumentos(n.argumentos), T(')')];
      default:
        return [T(n.tipo)];
    }
  }

  /** num, dec, cadena, car o logico, segun el literal. */
  literal (n) {
    switch (n.tipoDato) {
      case 'LIT_ENTERO': this.enteros.push(n.lexema); return N('num');
      case 'LIT_DECIMAL': this.decimales.push(n.lexema); return N('dec');
      case 'LIT_CADENA': this.cadenas.push(n.lexema); return N('cadena');
      case 'LIT_CARACTER': this.caracteres.push(n.lexema); return N('car');
      default:
        this.agregar('logico', [T(n.lexema)], n.lexema);
        return N('logico');
    }
  }

  // ------------------------------------------------------------------
  // Las reglas de las palabras y de los caracteres
  // ------------------------------------------------------------------

  /**
   * Escribe id, num, dec, cadena, TEXTO, car y, al final, dig, LET, let y
   * simb, usando solo los caracteres que de verdad aparecen en el codigo.
   */
  reglasDePalabras () {
    // Cada caracter usado, por su regla: { dig: ['2','0'], let: ['a','b'], ... }
    const usados = { dig: [], LET: [], let: [], simb: [] };
    const anotar = (c) => usados[claseDeCaracter(c)].push(c);

    this.reglaId(anotar);
    this.reglasNumericas(anotar);
    this.reglasDeTexto(anotar);

    // --- Los caracteres: dig, LET, let, simb ---
    const ejemplo = (clase) => distintos(usados[clase]).map(visible).join(' ');
    if (usados.dig.length > 0) this.agregar('dig', [R('0-9')], ejemplo('dig'));
    this.reglaDeLetras('LET', 'A-Z', /[A-Z]/, usados.LET);
    this.reglaDeLetras('let', 'a-z', /[a-z]/, usados.let);
    distintos(usados.simb).forEach((c) => this.agregar('simb', [T(visible(c))], visible(c)));
  }

  /**
   * id -> inicio ( resto )*
   * "inicio" son las clases con las que empiezan los nombres usados y
   * "resto" las que aparecen despues:  a1, b5  ->  id -> let ( dig )*
   */
  reglaId (anotar) {
    const ids = distintos(this.identificadores);
    if (ids.length === 0) return;

    /** El simbolo de un caracter de un nombre: dig / let / LET, o el _ tal cual. */
    const simboloDe = (c) => (c === '_' ? T('_') : N(claseDeCaracter(c)));
    /** Los simbolos distintos de una lista, sin repetir. */
    const sinRepetir = (simbolos) => distintos(simbolos.map((s) => s.texto))
      .map((t) => simbolos.find((s) => s.texto === t));

    const inicio = sinRepetir(ids.map((nombre) => simboloDe(nombre[0])));
    const resto = sinRepetir(ids.flatMap((nombre) => Array.from(nombre.slice(1)).map(simboloDe)));
    ids.forEach((nombre) => Array.from(nombre).forEach((c) => { if (c !== '_') anotar(c); }));

    const forma = inicio.length === 1 ? [inicio[0]] : [M('('), ...conBarras(inicio), M(')')];
    if (resto.length > 0) forma.push(M('('), ...conBarras(resto), M(')*'));
    this.agregar('id', forma, ids.join(', '));
  }

  /** num -> dig ( dig )*      dec -> dig ( dig )* . dig ( dig )* */
  reglasNumericas (anotar) {
    const SUFIJO = /[fdLFDl]$/;
    const sufijos = [];
    /** Los digitos de un numero, sin su sufijo (que se anota aparte). */
    const sinSufijo = (lexema) => {
      if (SUFIJO.test(lexema)) {
        sufijos.push(lexema.slice(-1));
        return lexema.slice(0, -1);
      }
      return lexema;
    };
    const conSufijo = (lexemas) => (lexemas.some((l) => SUFIJO.test(l))
      ? [M('['), N('suf'), M(']')] : []);

    const enteros = distintos(this.enteros);
    if (enteros.length > 0) {
      const digitos = enteros.map(sinSufijo);
      digitos.forEach((d) => Array.from(d).forEach(anotar));
      // Si todos los numeros son de un solo digito basta con  num -> dig
      const forma = digitos.every((d) => d.length === 1)
        ? [N('dig')]
        : [N('dig'), M('('), N('dig'), M(')*')];
      this.agregar('num', [...forma, ...conSufijo(enteros)], enteros.join(', '));
    }

    const decimales = distintos(this.decimales);
    if (decimales.length > 0) {
      decimales.map(sinSufijo).forEach((d) =>
        Array.from(d).forEach((c) => { if (c !== '.') anotar(c); }));
      this.agregar('dec', [N('dig'), M('('), N('dig'), M(')*'), T('.'),
        N('dig'), M('('), N('dig'), M(')*'), ...conSufijo(decimales)], decimales.join(', '));
    }

    distintos(sufijos).forEach((s) => this.agregar('suf', [T(s)], s));
  }

  /** cadena -> " TEXTO "    TEXTO -> ( LET | let | dig | simb )*    car -> ' c ' */
  reglasDeTexto (anotar) {
    const clasesDe = (texto) => ['LET', 'let', 'dig', 'simb'].filter((clase) =>
      Array.from(texto).some((c) => claseDeCaracter(c) === clase));

    const cadenas = distintos(this.cadenas);
    if (cadenas.length > 0) {
      const contenidos = cadenas.map((c) => c.slice(1, -1));
      contenidos.forEach((c) => Array.from(c).forEach(anotar));
      const clases = clasesDe(contenidos.join(''));

      if (clases.length > 0) {
        this.agregar('cadena', [T('"'), N('TEXTO'), T('"')], cadenas.join('  '));
        this.agregar('TEXTO', [M('('), ...conBarras(clases.map(N)), M(')*')],
          contenidos.join('  '));
      } else {
        // Solo cadenas vacias: ""
        this.agregar('cadena', [T('"'), T('"')], cadenas.join('  '));
      }
    }

    const caracteres = distintos(this.caracteres);
    if (caracteres.length > 0) {
      const contenidos = caracteres.map((c) => c.slice(1, -1));
      contenidos.forEach((c) => Array.from(c).forEach(anotar));
      const clases = clasesDe(contenidos.join('')).map(N);
      const centro = clases.length === 1 ? clases : [M('('), ...conBarras(clases), M(')')];
      this.agregar('car', [T("'"), ...centro, T("'")], caracteres.join(', '));
    }
  }

  /**
   * LET -> A-Z   o   let -> a-z. Si se usaron letras fuera del rango (ñ,
   * letras con acento), se agregan como alternativas:  let -> a-z | ñ
   */
  reglaDeLetras (regla, rango, patron, letras) {
    if (letras.length === 0) return;
    const comunes = distintos(letras.filter((c) => patron.test(c)));
    if (comunes.length > 0) this.agregar(regla, [R(rango)], comunes.join(' '));
    distintos(letras.filter((c) => !patron.test(c))).forEach((c) =>
      this.agregar(regla, [T(c)], c));
  }

  /**
   * Los nombres de las reglas, en el orden en que se muestran (ver
   * REGLAS_DE_PALABRAS). Las de estructura se ordenan de arriba hacia abajo:
   * se empieza en prop y cada regla nombrada se agrega a la
   * cola la primera vez que aparece.
   */
  ordenDeReglas () {
    const existe = (r) => this.reglas.has(r) && this.reglas.get(r).size > 0;
    const esDeEstructura = (r) =>
      REGLAS_DE_PALABRAS.indexOf(r) === -1 && REGLAS_DE_CARACTERES.indexOf(r) === -1;

    const estructura = ['prop'];
    for (let i = 0; i < estructura.length; i++) {
      this.reglas.get(estructura[i]).forEach((alternativa) => {
        alternativa.simbolos.forEach((s) => {
          const nombrada = s.clase === 'no-terminal' && esDeEstructura(s.texto) && existe(s.texto);
          if (nombrada && estructura.indexOf(s.texto) === -1) estructura.push(s.texto);
        });
      });
    }

    return estructura
      .concat(REGLAS_DE_PALABRAS.filter(existe))
      .concat(REGLAS_DE_CARACTERES.filter(existe));
  }

  /** Las reglas, en el orden del pizarron y listas para mostrarse. */
  resultado () {
    return this.ordenDeReglas().map((regla) => {
      const alternativas = Array.from(this.reglas.get(regla).values())
        .map((a, orden) => ({
          simbolos: a.simbolos,
          texto: a.simbolos.map((s) => s.texto).join(' '),
          ejemplo: a.ejemplo || '',
          orden
        }));

      // Las alternativas cortas primero, y entre las de un solo simbolo las
      // de PRIMERO en su orden:  exp -> id | num | exp / exp
      const prioridad = (a) => {
        const i = PRIMERO.indexOf(a.texto);
        return i === -1 ? PRIMERO.length : i;
      };
      alternativas.sort((a, b) =>
        a.simbolos.length - b.simbolos.length ||
        prioridad(a) - prioridad(b) ||
        a.orden - b.orden);

      return {
        regla,
        descripcion: DESCRIPCIONES[regla] || '',
        alternativas: alternativas.map(({ simbolos, texto, ejemplo }) => ({ simbolos, texto, ejemplo }))
      };
    });
  }
}

// ====================================================================
// La gramatica completa
// ====================================================================

/**
 * @param {object} ast  Arbol del programa (sin errores).
 * @returns {{reglas: Array, totalAlternativas: number}}
 *   reglas: [{ regla, descripcion, alternativas: [{ simbolos, texto, ejemplo }] }]
 */
function generarGramatica (ast) {
  const generador = new GeneradorGramatica();
  generador.raiz(ast);
  const reglas = generador.resultado();
  return {
    reglas,
    totalAlternativas: reglas.reduce((total, r) => total + r.alternativas.length, 0)
  };
}

/**
 * Una regla como una sola linea de texto:  exp -> id | num | exp / exp
 * La usan el reporte en texto y las pruebas.
 */
function reglaATexto (r, ancho = 0) {
  return `${r.regla.padEnd(ancho)} → ${r.alternativas.map((a) => a.texto).join(' | ')}`;
}

module.exports = { generarGramatica, claseDeCaracter, reglaATexto };
