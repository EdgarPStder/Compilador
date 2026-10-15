/**
 * programas-al-azar.js
 * SOLO PARA LAS PRUEBAS: escribe programas SwordByte al azar, pero correctos
 * (pasan las tres primeras fases sin errores) y que siempre terminan.
 *
 *   const { programaAlAzar } = require('./programas-al-azar');
 *   const { fuente, entradas } = programaAlAzar(17);   // siempre el mismo para la semilla 17
 *
 * Sirven para probar con muchos programas distintos lo que no se puede
 * revisar a mano:
 *   - que el codigo optimizado (fase 5) imprima lo mismo que el original;
 *   - que el programa Java (fase 6) compile e imprima lo mismo.
 *
 * Mezclan todo lo que tiene el lenguaje: si / sinoSi / sino, los tres ciclos
 * con romper, opcion con y sin romper, intentar / capturar con errores de
 * verdad (division entre cero, posiciones que no existen), arreglos, matrices,
 * funciones (con retornar a medio camino), Y / O / NO, x++, leer...
 *
 * Para que Java y el interprete de las pruebas impriman lo mismo, los
 * programas evitan lo que cada uno haria distinto: los enteros nunca se
 * desbordan (cada valor que se guarda se deja entre -1000 y 1000 con % 1000),
 * no se usa aleatorio y no se imprimen decimales con formato (%.2f).
 */

/** Numeros al azar que se repiten con la misma semilla (mulberry32). */
function azarConSemilla (semilla) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TEXTOS = ['"hola"', '"Ana"', '"x"', '"SwordByte"', '"fin"', '""', '"a b"'];
const DECIMALES = ['0.5', '1.25', '2.0', '3.75', '10.5', '0.1'];

class Generador {
  constructor (semilla) {
    this.azar = azarConSemilla(semilla);
    this.contador = 0;
    this.entradas = [];
    this.lineas = [];
    this.sangria = 1;
    this.funciones = [];
    /** Los ambitos abiertos: [ Map(nombre -> { tipo, fijo, tamanos }) ] */
    this.ambitos = [];
    /** Donde se esta: cuantos ciclos / opcion rodean, si se esta en intentar. */
    this.ciclos = 0;
    this.opciones = 0;
    this.intentos = 0;
    this.funcionActual = null;
  }

  // ------------------------------------------------------------ azar
  numero (a, b) { return a + Math.floor(this.azar() * (b - a + 1)); }
  elegir (lista) { return lista[Math.floor(this.azar() * lista.length)]; }
  quizas (p) { return this.azar() < p; }

  // ------------------------------------------------------------ nombres
  nuevoNombre (base = 'v') {
    this.contador++;
    return `${base}${this.contador}`;
  }

  abrir () { this.ambitos.push(new Map()); }
  cerrar () { this.ambitos.pop(); }

  anotar (nombre, datos) {
    this.ambitos[this.ambitos.length - 1].set(nombre, datos);
  }

  visible (nombre) {
    return this.ambitos.some((a) => a.has(nombre));
  }

  /** Las variables que se ven, de un tipo. fijo: los contadores de los ciclos. */
  variables (tipo, { asignables = false } = {}) {
    const lista = [];
    this.ambitos.forEach((a) => a.forEach((d, nombre) => {
      if (d.tipo === tipo && !(asignables && d.fijo)) lista.push(Object.assign({ nombre }, d));
    }));
    return lista;
  }

  escribir (texto) {
    this.lineas.push('    '.repeat(this.sangria) + texto);
  }

  bloque (encabezado, cuerpo, cierre = '}') {
    this.escribir(encabezado + ' {');
    this.sangria++;
    this.abrir();
    cuerpo();
    this.cerrar();
    this.sangria--;
    this.escribir(cierre);
  }

  // ------------------------------------------------------------ expresiones

  /** Una expresion entera. prof: cuanto puede crecer todavia. */
  entero (prof = 2) {
    const vars = this.variables('entero');
    const opciones = ['literal', 'literal', 'variable', 'variable', 'variable'];
    if (prof > 0) opciones.push('suma', 'suma', 'resta', 'por', 'entre', 'modulo', 'menos', 'llamada', 'nativa', 'arreglo', 'matriz', 'convertir');
    if (prof > 0 && vars.some((v) => !v.fijo)) opciones.push('incremento');
    switch (this.elegir(opciones)) {
      case 'variable':
        if (vars.length > 0) return this.elegir(vars).nombre;
        return String(this.numero(0, 20));
      case 'suma': return `${this.entero(prof - 1)} + ${this.entero(prof - 1)}`;
      case 'resta': return `${this.entero(prof - 1)} - ${this.atomoEntero(prof - 1)}`;
      case 'por': return `${this.atomoEntero(prof - 1)} * ${this.numero(0, 9)}`;
      case 'entre': return `${this.atomoEntero(prof - 1)} / ${this.numero(1, 9)}`;
      case 'modulo': return `${this.atomoEntero(prof - 1)} % ${this.numero(1, 9)}`;
      case 'menos': {
        const a = this.atomoEntero(prof - 1);
        return /^\w+$/.test(a) ? `-${a}` : `-(${a})`;
      }
      case 'incremento': {
        const v = this.elegir(vars.filter((x) => !x.fijo));
        return `${v.nombre}${this.elegir(['++', '--'])}`;
      }
      case 'llamada': {
        const f = this.funcionQueDevuelve('entero');
        if (f) return this.llamada(f);
        return `longitud(${this.cadena(0)})`;
      }
      case 'nativa':
        return this.elegir([
          () => `redondear(${this.decimal(prof - 1)})`,
          () => `longitud(${this.cadena(prof - 1)})`,
          () => `convertir(${this.decimal(prof - 1)}, entero)`
        ])();
      case 'arreglo': {
        const a = this.variables('entero[]');
        if (a.length === 0) return String(this.numero(-5, 5));
        const elegido = this.elegir(a);
        return `${elegido.nombre}[${this.indice(elegido.tamanos[0])}]`;
      }
      case 'matriz': {
        const m = this.variables('entero[][]');
        if (m.length === 0) return String(this.numero(-5, 5));
        const elegido = this.elegir(m);
        return `${elegido.nombre}[${this.indice(elegido.tamanos[0])}][${this.indice(elegido.tamanos[1])}]`;
      }
      case 'convertir': return `convertir(${this.elegir(['"12"', '"-3"', '"7"'])}, entero)`;
      default: return String(this.numero(0, 20));
    }
  }

  /** Una expresion entera que puede ir a un lado de * / %: con parentesis si hace falta. */
  atomoEntero (prof) {
    const e = this.entero(prof);
    return /^-?[\w]+(\+\+|--)?$/.test(e) ? e : `(${e})`;
  }

  /**
   * Un indice que existe en un arreglo de ese tamaño. Fuera de intentar, un
   * numero fijo o un contador que no se sale; dentro de intentar, a veces
   * uno que no existe (para que haya un error que capturar).
   */
  indice (tamano) {
    if (this.intentos > 0 && this.quizas(0.25)) {
      const v = this.variables('entero');
      if (v.length > 0) return this.elegir(v).nombre;
    }
    const contadores = this.variables('entero').filter((v) => v.fijo && v.hasta <= tamano);
    if (contadores.length > 0 && this.quizas(0.5)) return this.elegir(contadores).nombre;
    return String(this.numero(0, tamano - 1));
  }

  decimal (prof = 2) {
    const vars = this.variables('decimal');
    const opciones = ['literal', 'literal', 'variable', 'variable'];
    if (prof > 0) opciones.push('suma', 'resta', 'por', 'entre', 'entero', 'potencia', 'geometria', 'llamada', 'mezcla');
    switch (this.elegir(opciones)) {
      case 'variable':
        if (vars.length > 0) return this.elegir(vars).nombre;
        return this.elegir(DECIMALES);
      case 'suma': return `${this.decimal(prof - 1)} + ${this.decimal(prof - 1)}`;
      case 'resta': return `${this.decimal(prof - 1)} - ${this.atomoDecimal(prof - 1)}`;
      case 'por': return `${this.atomoDecimal(prof - 1)} * ${this.elegir(['2', '0.5', '3', '1.5'])}`;
      case 'entre': return `${this.atomoDecimal(prof - 1)} / ${this.elegir(['2', '4.0', '3', '8'])}`;
      case 'entero': return `${this.atomoEntero(prof - 1)} * 1.0`;
      case 'mezcla': return `${this.atomoEntero(prof - 1)} / ${this.elegir(['2.0', '4', '8.0'])}`;
      case 'potencia': return `potencia(${this.numero(0, 5)}, ${this.numero(0, 4)})`;
      case 'geometria':
        return this.elegir([
          () => `area.circulo(${this.numero(1, 9)})`,
          () => `area.rectangulo(${this.numero(1, 9)}, ${this.elegir(DECIMALES)})`,
          () => `perimetro.triangulo(3, 4, 5)`,
          () => `volumen.esfera(${this.numero(1, 4)})`,
          () => `volumen.cono(2, ${this.numero(1, 6)})`
        ])();
      case 'llamada': {
        const f = this.funcionQueDevuelve('decimal');
        if (f) return this.llamada(f);
        return this.elegir(DECIMALES);
      }
      default: return this.elegir(DECIMALES);
    }
  }

  atomoDecimal (prof) {
    const e = this.decimal(prof);
    return /^-?[\w.]+$/.test(e) ? e : `(${e})`;
  }

  logico (prof = 2) {
    const vars = this.variables('logico');
    const opciones = ['comparacion', 'comparacion', 'comparacion', 'fijo'];
    if (vars.length > 0) opciones.push('variable', 'variable');
    if (prof > 0) opciones.push('y', 'o', 'no', 'textos', 'decimales');
    switch (this.elegir(opciones)) {
      case 'variable': return this.elegir(vars).nombre;
      case 'fijo': return this.elegir(['verdadero', 'falso']);
      case 'y': return `${this.atomoLogico(prof - 1)} Y ${this.atomoLogico(prof - 1)}`;
      case 'o': return `${this.atomoLogico(prof - 1)} O ${this.atomoLogico(prof - 1)}`;
      case 'no': return `NO ${this.atomoLogico(prof - 1)}`;
      case 'textos': return `${this.cadena(0)} ${this.elegir(['==', '!='])} ${this.elegir(TEXTOS)}`;
      case 'decimales': return `${this.decimal(1)} ${this.elegir(['<', '>=', '=='])} ${this.decimal(0)}`;
      default: return `${this.entero(1)} ${this.elegir(['<', '<=', '>', '>=', '==', '!='])} ${this.entero(1)}`;
    }
  }

  atomoLogico (prof) {
    const e = this.logico(prof);
    return /^(NO )?[\w]+$/.test(e) ? e : `(${e})`;
  }

  cadena (prof = 2) {
    const vars = this.variables('cadena');
    const opciones = ['literal', 'variable', 'variable'];
    if (prof > 0) opciones.push('junta', 'junta', 'convertir');
    switch (this.elegir(opciones)) {
      case 'variable':
        if (vars.length > 0) return this.elegir(vars).nombre;
        return this.elegir(TEXTOS);
      case 'junta': {
        const otro = this.elegir([() => this.atomoEntero(1), () => this.atomoDecimal(0), () => this.cadena(prof - 1),
          () => `(${this.logico(0)})`, () => "'c'"])();
        return this.quizas(0.5) ? `${this.cadena(prof - 1)} + ${otro}` : `${this.elegir(TEXTOS)} + ${otro}`;
      }
      case 'convertir': return `convertir(${this.atomoEntero(1)}, cadena)`;
      default: return this.elegir(TEXTOS);
    }
  }

  valorDe (tipo, prof = 2) {
    switch (tipo) {
      case 'entero': return this.entero(prof);
      case 'decimal': return this.decimal(prof);
      case 'logico': return this.logico(prof);
      default: return this.cadena(prof);
    }
  }

  /** Lo que se guarda en un entero: entre -1000 y 1000, para que nunca se desborde. */
  enteroAcotado () {
    return `(${this.entero(2)}) % 1000`;
  }

  funcionQueDevuelve (tipo) {
    const lista = this.funciones.filter((f) => f.tipo === tipo && f !== this.funcionActual && !f.escribiendo);
    return lista.length > 0 ? this.elegir(lista) : null;
  }

  llamada (f) {
    // factorial se llama con numeros chicos, para que termine pronto
    if (f.recursiva) return `${f.nombre}((${this.entero(1)}) % 7)`;
    return `${f.nombre}(${f.parametros.map((p) => this.valorDe(p.tipo, 1)).join(', ')})`;
  }

  // ------------------------------------------------------------ instrucciones

  instrucciones (cuantas, prof) {
    for (let i = 0; i < cuantas; i++) this.instruccion(prof);
  }

  instruccion (prof) {
    const opciones = ['declarar', 'declarar', 'asignar', 'asignar', 'imprimir', 'imprimir', 'imprimir', 'incremento'];
    if (prof > 0) opciones.push('si', 'si', 'para', 'mientras', 'hacer', 'opcion', 'intentar', 'arreglo', 'llamar');
    if (this.ciclos > 0 || this.opciones > 0) opciones.push('romper');
    if (this.funcionActual) opciones.push('retornar');
    if (this.intentos > 0) opciones.push('arriesgar', 'arriesgar');
    if (this.variables('entero[]').length + this.variables('entero[][]').length > 0) opciones.push('guardarEnArreglo');
    this[this.elegir(opciones)](prof);
  }

  declarar () {
    const tipo = this.elegir(['entero', 'entero', 'decimal', 'logico', 'cadena']);
    const nombre = this.nuevoNombre();
    if (tipo === 'entero' && this.quizas(0.15)) {
      // Se declara sin valor y se lee del teclado
      this.escribir(`entero ${nombre};`);
      this.escribir(`leer(${nombre});`);
    } else {
      let valor = tipo === 'entero' ? this.enteroAcotado() : this.valorDe(tipo);
      if (tipo === 'decimal') valor = `(${valor}) % 1000`;
      this.escribir(`${tipo} ${nombre} = ${valor};`);
    }
    this.anotar(nombre, { tipo });
  }

  asignar () {
    const tipo = this.elegir(['entero', 'entero', 'decimal', 'logico', 'cadena']);
    const vars = this.variables(tipo, { asignables: true });
    if (vars.length === 0) return this.declarar();
    const v = this.elegir(vars);
    let valor = tipo === 'entero' ? this.enteroAcotado() : this.valorDe(tipo);
    if (tipo === 'decimal') valor = `(${valor}) % 1000`;
    // A veces se suma a si mismo, para que el valor pase de una vuelta a otra
    if (tipo === 'cadena' && this.quizas(0.3)) valor = `${v.nombre} + ${this.elegir(TEXTOS)}`;
    if (tipo === 'decimal' && this.quizas(0.3)) valor = `(${v.nombre} + ${this.decimal(1)}) % 1000`;
    // En una asignacion, = va antes que > o Y: el valor logico va entre parentesis
    this.escribir(`${v.nombre} = ${tipo === 'logico' ? `(${valor})` : valor};`);
  }

  incremento () {
    const vars = this.variables('entero', { asignables: true });
    if (vars.length === 0) return this.declarar();
    this.escribir(`${this.elegir(vars).nombre}${this.elegir(['++', '--'])};`);
  }

  imprimir () {
    const tipo = this.elegir(['entero', 'entero', 'decimal', 'logico', 'cadena', 'cadena']);
    const forma = this.numero(0, 9);
    if (forma === 0) {
      this.escribir(`imprimirF("%d y %s%n", ${this.entero(1)}, ${this.valorDe(tipo, 1)});`);
    } else if (forma === 1) {
      this.escribir(`imprimir(${this.valorDe(tipo, 1)});`);
      this.escribir('imprimirLn();');
    } else {
      this.escribir(`imprimirLn(${this.valorDe(tipo)});`);
    }
  }

  si (prof) {
    this.bloque(`si (${this.logico()})`, () => this.instrucciones(this.numero(1, 3), prof - 1));
    while (this.quizas(0.3)) {
      this.bloque(`sinoSi (${this.logico()})`, () => this.instrucciones(this.numero(1, 2), prof - 1));
    }
    if (this.quizas(0.5)) this.bloque('sino', () => this.instrucciones(this.numero(1, 3), prof - 1));
  }

  /** Un contador para un ciclo: un nombre que no se ve desde aqui. */
  nombreDeContador () {
    for (const nombre of ['i', 'j', 'k']) if (!this.visible(nombre)) return nombre;
    return this.nuevoNombre('c');
  }

  para (prof) {
    const c = this.nombreDeContador();
    const hasta = this.numero(0, 4);
    this.escribir(`para (entero ${c} = 0; ${c} < ${hasta}; ${c}++) {`);
    this.sangria++;
    this.abrir();
    this.anotar(c, { tipo: 'entero', fijo: true, hasta });
    this.ciclos++;
    this.instrucciones(this.numero(1, 3), prof - 1);
    this.ciclos--;
    this.cerrar();
    this.sangria--;
    this.escribir('}');
  }

  mientras (prof) {
    const c = this.nuevoNombre('w');
    const hasta = this.numero(0, 4);
    this.escribir(`entero ${c} = 0;`);
    this.anotar(c, { tipo: 'entero', fijo: true, hasta: hasta + 1 });
    this.bloque(`mientras (${c} < ${hasta}${this.quizas(0.3) ? ` Y ${this.atomoLogico(0)}` : ''})`, () => {
      this.ciclos++;
      this.instrucciones(this.numero(1, 3), prof - 1);
      this.ciclos--;
      this.escribir(`${c}++;`);
    });
  }

  hacer (prof) {
    const c = this.nuevoNombre('h');
    const hasta = this.numero(0, 3);
    this.escribir(`entero ${c} = 0;`);
    this.anotar(c, { tipo: 'entero', fijo: true, hasta: hasta + 2 });
    this.bloque('hacer', () => {
      this.ciclos++;
      this.instrucciones(this.numero(1, 3), prof - 1);
      this.ciclos--;
      this.escribir(`${c}++;`);
    }, `} mientras (${c} < ${hasta}${this.quizas(0.3) ? ` Y ${this.atomoLogico(0)}` : ''});`);
  }

  opcion (prof) {
    const valores = [0, 1, 2, 3].filter(() => this.quizas(0.7));
    if (valores.length === 0) valores.push(1);
    this.escribir(`opcion ((${this.entero(1)}) % 4) {`);
    this.sangria++;
    this.abrir();
    this.opciones++;
    // Lo que declara un caso no se usa en los otros: en Java, al saltar a
    // otro caso, esa variable no tendria valor.
    valores.forEach((v) => {
      this.escribir(`caso ${this.quizas(0.2) ? -v : v}:`);
      this.sangria++;
      this.abrir();
      this.instrucciones(this.numero(0, 2), prof - 1);
      this.cerrar();
      if (this.quizas(0.7)) this.escribir('romper;');
      this.sangria--;
    });
    if (this.quizas(0.6)) {
      this.escribir('porDefecto:');
      this.sangria++;
      this.abrir();
      this.instrucciones(this.numero(1, 2), prof - 1);
      this.cerrar();
      this.sangria--;
    }
    this.opciones--;
    this.cerrar();
    this.sangria--;
    this.escribir('}');
  }

  intentar (prof) {
    this.intentos++;
    this.bloque('intentar', () => {
      if (this.quizas(0.6)) this.arriesgar();
      this.instrucciones(this.numero(1, 3), prof - 1);
    });
    this.intentos--;
    const e = this.nuevoNombre('e');
    this.escribir('} capturar (Error ' + e + ') {');
    this.lineas.splice(this.lineas.length - 2, 1);   // el } de intentar ya va en esta linea
    this.sangria++;
    this.abrir();
    this.anotar(e, { tipo: 'Error' });
    this.escribir(`imprimirLn("error ${this.contador}");`);
    this.instrucciones(this.numero(0, 2), prof - 1);
    this.cerrar();
    this.sangria--;
    this.escribir('}');
  }

  /** Algo que puede fallar al ejecutarse (solo dentro de intentar). */
  arriesgar () {
    const vars = this.variables('entero');
    const divisor = vars.length > 0 && this.quizas(0.7) ? `(${this.elegir(vars).nombre} % 3)` : '0';
    const nombre = this.nuevoNombre();
    if (this.quizas(0.6) || this.variables('entero[]').length === 0) {
      this.escribir(`entero ${nombre} = ${this.atomoEntero(1)} ${this.elegir(['/', '%'])} ${divisor};`);
      this.anotar(nombre, { tipo: 'entero' });
      this.escribir(`imprimirLn(${nombre});`);
    } else {
      const a = this.elegir(this.variables('entero[]'));
      this.escribir(`imprimirLn(${a.nombre}[${vars.length > 0 ? this.elegir(vars).nombre : a.tamanos[0] - 1}]);`);
    }
  }

  romper () {
    this.escribir(this.quizas(0.6) ? `si (${this.logico(1)}) { romper; }` : 'romper;');
  }

  retornar () {
    const f = this.funcionActual;
    const valor = f.tipo === 'vacio' ? '' : ' ' + (f.tipo === 'entero' ? this.enteroAcotado() : this.valorDe(f.tipo));
    this.escribir(`si (${this.logico(1)}) { retornar${valor}; }`);
  }

  arreglo () {
    const nombre = this.nuevoNombre('d');
    if (this.quizas(0.6)) {
      const tamano = this.numero(1, 4);
      if (this.quizas(0.5)) {
        const valores = Array.from({ length: tamano }, () => String(this.numero(-9, 9)));
        this.escribir(`Arreglo entero ${nombre}[] = {${valores.join(', ')}};`);
      } else {
        this.escribir(`Arreglo entero ${nombre}[${tamano}];`);
      }
      this.anotar(nombre, { tipo: 'entero[]', tamanos: [tamano] });
    } else {
      const r = this.numero(1, 3);
      const c = this.numero(1, 3);
      if (this.quizas(0.5)) {
        const renglones = Array.from({ length: r }, () =>
          `{${Array.from({ length: c }, () => this.numero(0, 9)).join(', ')}}`);
        this.escribir(`matriz entero ${nombre}[][] = {${renglones.join(', ')}};`);
      } else {
        this.escribir(`matriz entero ${nombre}[${r}][${c}];`);
      }
      this.anotar(nombre, { tipo: 'entero[][]', tamanos: [r, c] });
    }
  }

  guardarEnArreglo () {
    const arreglos = this.variables('entero[]');
    const matrices = this.variables('entero[][]');
    if (arreglos.length > 0 && (matrices.length === 0 || this.quizas(0.5))) {
      const a = this.elegir(arreglos);
      const lugar = `${a.nombre}[${this.indice(a.tamanos[0])}]`;
      this.escribir(this.quizas(0.3) ? `${lugar}++;` : `${lugar} = ${this.enteroAcotado()};`);
    } else {
      const m = this.elegir(matrices);
      const lugar = `${m.nombre}[${this.indice(m.tamanos[0])}][${this.indice(m.tamanos[1])}]`;
      this.escribir(`${lugar} = ${this.enteroAcotado()};`);
    }
  }

  llamar () {
    const vacias = this.funciones.filter((f) => f.tipo === 'vacio' && f !== this.funcionActual && !f.escribiendo);
    if (vacias.length > 0 && this.quizas(0.6)) {
      this.escribir(this.llamada(this.elegir(vacias)) + ';');
      return;
    }
    const otra = this.funcionQueDevuelve(this.elegir(['entero', 'decimal', 'cadena']));
    if (otra) this.escribir(`imprimirLn(${this.llamada(otra)});`);
  }

  // ------------------------------------------------------------ el programa

  funcion (f) {
    f.escribiendo = true;
    this.funcionActual = f;
    this.ciclos = 0;
    this.opciones = 0;
    this.intentos = 0;
    this.escribir(`funcion ${f.tipo} ${f.nombre}(${f.parametros.map((p) => `${p.tipo} ${p.nombre}`).join(', ')}) {`);
    this.sangria++;
    this.abrir();
    f.parametros.forEach((p) => this.anotar(p.nombre, { tipo: p.tipo }));
    this.instrucciones(this.numero(1, 4), 2);
    if (f.tipo !== 'vacio') {
      this.escribir(`retornar ${f.tipo === 'entero' ? this.enteroAcotado() : this.valorDe(f.tipo)};`);
    }
    this.cerrar();
    this.sangria--;
    this.escribir('}');
    this.escribir('');
    f.escribiendo = false;
    this.funcionActual = null;
  }

  programa () {
    const nombreClase = `prueba${this.numero(1, 99999)}`;
    this.lineas.push(`clase ${nombreClase} {`);

    // Las funciones: cada una solo llama a las que se escribieron antes (asi
    // ninguna se llama a si misma sin fin). A veces, una recursiva que si termina.
    const cuantas = this.numero(0, 3);
    for (let k = 0; k < cuantas; k++) {
      const f = {
        nombre: `f${k + 1}`,
        tipo: this.elegir(['entero', 'entero', 'decimal', 'cadena', 'vacio']),
        parametros: Array.from({ length: this.numero(0, 3) }, (_, i) =>
          ({ nombre: `p${i + 1}`, tipo: this.elegir(['entero', 'entero', 'decimal', 'cadena', 'logico']) }))
      };
      this.funcion(f);
      this.funciones.push(f);
    }
    if (this.quizas(0.3)) {
      this.lineas.push('    funcion entero factorial(entero n) {',
        '        si (n <= 1) { retornar 1; }',
        '        retornar n * factorial(n - 1);',
        '    }', '');
      this.funciones.push({ nombre: 'factorial', tipo: 'entero', parametros: [{ nombre: 'n', tipo: 'entero' }], recursiva: true });
    }

    this.escribir('clasePrincipal {');
    this.sangria++;
    this.abrir();
    this.instrucciones(this.numero(4, 10), 3);
    this.cerrar();
    this.sangria--;
    this.escribir('}');
    this.lineas.push('}');
    // Lo que se escribe en cada leer (los ciclos pueden leer muchas veces)
    for (let k = 0; k < 300; k++) this.entradas.push(String(this.numero(-20, 50)));
    return { fuente: this.lineas.join('\n'), entradas: this.entradas, clase: nombreClase };
  }
}

/**
 * Un programa al azar, siempre el mismo para la misma semilla.
 * @returns {{fuente: string, entradas: string[], clase: string}}
 */
function programaAlAzar (semilla) {
  return new Generador(semilla).programa();
}

module.exports = { programaAlAzar };
