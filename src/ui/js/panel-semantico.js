/**
 * panel-semantico.js
 * Pestaña 3: Analizador Semántico.
 *
 * Muestra lo que src/core/03.semantico/AnalizadorSemantico.js encontró en el
 * código:
 *
 *   1. Los errores semánticos (un nombre sin declarar, tipos que no
 *      coinciden...), si hay, y abajo las advertencias. Si no hay errores,
 *      basta con la insignia «sin errores» junto al título.
 *   2. La gramática del código, escrita como en el pizarrón:
 *
 *        prop → clase id { principal }
 *        exp  → id | num | exp / exp
 *
 * Solo trabaja con programas (clase nombre { clasePrincipal { ... } }), como
 * Java. Si falta la clase, o el código tiene errores léxicos o sintácticos,
 * se dice por qué no se analizó.
 */

/* global window, document, Dom */

const ESPERA_SEMANTICO =
  'Escribe un programa SwordByte y presiona «Analiza»: aquí aparecerán ' +
  'sus errores semánticos y su gramática.';

/** El esqueleto de un programa, para cuando falta la clase. */
const EJEMPLO_PROGRAMA = [
  'clase ejemplo {',
  '    clasePrincipal {',
  '        decimal radio = 2.5;',
  '        imprimirLn(area.circulo(radio));',
  '    }',
  '}'
].join('\n');

class PanelSemantico {
  constructor () {
    this.salida = document.getElementById('sem-salida');
    this.estado = document.getElementById('sem-estado');
  }

  /** Deja la caja esperando. */
  limpiar (mensaje) {
    Dom.ponerInsignia(this.estado, null);
    Dom.mostrarNota(this.salida, mensaje || ESPERA_SEMANTICO);
  }

  /** @param {object} r Resultado de Compilador.compilar() */
  pintar (r) {
    const sem = r.semantico;
    if (!sem || sem.estado === 'vacio') {
      this.limpiar('No hay código que analizar.');
      return;
    }

    if (sem.estado === 'sin-clase') {
      Dom.ponerInsignia(this.estado, 'error', 'falta la clase');
      this.salida.replaceChildren(this._sinClase(sem.errores[0]));
      return;
    }

    if (sem.estado === 'errores-previos') {
      Dom.ponerInsignia(this.estado, 'error', 'corrige primero');
      this.salida.replaceChildren(this._erroresPrevios(sem.errores));
      return;
    }

    // estado 'analizado'
    Dom.ponerInsignia(this.estado, sem.correcto ? 'ok' : 'error',
      sem.correcto ? 'sin errores' : Dom.cuantos(sem.errores.length, 'error', 'errores'));

    const partes = [];
    if (!sem.correcto) partes.push(this._errores(sem.errores));
    if (sem.advertencias.length > 0) partes.push(this._advertencias(sem.advertencias));

    partes.push(
      Dom.crear('h3', 'titulo-semantico-parte',
        `Gramática del código (${Dom.cuantos(sem.reglas.length, 'regla', 'reglas')}, ` +
        `${Dom.cuantos(sem.totalAlternativas, 'producción', 'producciones')})`),
      this._gramatica(sem.reglas),
      this._nota()
    );
    this.salida.replaceChildren(...partes);
  }

  // ------------------------------------------------------------------
  // Cuando no se analiza
  // ------------------------------------------------------------------

  /**
   * Una expresión suelta (a = b + c) no es un programa: como en Java, falta
   * la clase. Se muestra el error y cómo se escribe un programa.
   */
  _sinClase (error) {
    const caja = Dom.crear('div', 'veredicto mal');
    caja.append(
      Dom.crear('b', null, '✕ Falta la clase'),
      Dom.filaError(error),
      Dom.crear('p', null, 'Como en Java, el código va dentro de una clase y se ejecuta desde clasePrincipal:'),
      Dom.crear('pre', 'ejemplo-codigo', EJEMPLO_PROGRAMA),
      Dom.crear('p', null,
        'Las expresiones sueltas, como a = b + c, se practican en la pestaña «Analizador Léxico-Sintáctico».')
    );
    return caja;
  }

  /** Con errores léxicos o sintácticos no se puede revisar el sentido. */
  _erroresPrevios (errores) {
    const caja = Dom.crear('div', 'veredicto mal');
    caja.append(
      Dom.crear('b', null, '✕ No se pudo hacer el análisis semántico'),
      Dom.crear('p', null, 'Primero hay que corregir los errores léxicos y sintácticos del código:')
    );
    errores.forEach((e) => caja.appendChild(Dom.filaError(e)));
    return caja;
  }

  // ------------------------------------------------------------------
  // Las partes del análisis
  // ------------------------------------------------------------------

  /** Recuadro rojo con los errores semánticos. */
  _errores (errores) {
    const caja = Dom.crear('div', 'veredicto mal');
    caja.append(
      Dom.crear('b', null, '✕ ' + Dom.cuantos(errores.length, 'error semántico', 'errores semánticos')),
      Dom.crear('p', null, 'El código está bien escrito, pero algo no tiene sentido:')
    );
    errores.forEach((e) => caja.appendChild(Dom.filaError(e)));
    return caja;
  }

  /** Lo que se puede ejecutar pero parece un descuido. */
  _advertencias (advertencias) {
    const caja = Dom.crear('div', 'veredicto advertencia');
    caja.appendChild(Dom.crear('b', null, '⚠ ' + Dom.cuantos(advertencias.length, 'advertencia', 'advertencias')));
    advertencias.forEach((e) => caja.appendChild(Dom.filaError(e, '⚠')));
    return caja;
  }

  /** Una fila por regla:  regla  →  alternativa | alternativa | ... */
  _gramatica (reglas) {
    const tabla = Dom.crear('table', 'gramatica');
    const cuerpo = tabla.appendChild(Dom.crear('tbody'));

    reglas.forEach((r) => {
      const tr = Dom.crear('tr');
      const regla = Dom.crear('td', 'regla', r.regla);
      regla.title = r.descripcion;

      const alternativas = Dom.crear('td');
      r.alternativas.forEach((a, i) => {
        if (i > 0) alternativas.appendChild(Dom.crear('span', 'meta', ' | '));
        alternativas.appendChild(this._alternativa(a));
      });

      tr.append(regla, Dom.crear('td', 'flecha', '→'), alternativas);
      cuerpo.appendChild(tr);
    });
    return tabla;
  }

  /** Una alternativa: cada símbolo con su clase (terminal, no terminal...). */
  _alternativa (a) {
    const caja = Dom.crear('span', 'alternativa');
    caja.title = 'En el código: ' + a.ejemplo;

    a.simbolos.forEach((s, i) => {
      if (i > 0) caja.appendChild(document.createTextNode(' '));
      const simbolo = Dom.crear('span', s.clase, s.texto);
      // Las palabras terminales van subrayadas, como en el pizarrón
      if (s.clase === 'terminal' && /^[A-Za-zÀ-ɏ]/.test(s.texto)) {
        simbolo.classList.add('palabra');
      }
      caja.appendChild(simbolo);
    });
    return caja;
  }

  /** Cómo leer la gramática. */
  _nota () {
    const nota = Dom.crear('p', 'nota-gramatica');
    nota.append(
      document.createTextNode('Terminales en '),
      Dom.crear('b', null, 'negritas'),
      document.createTextNode(' (las palabras, subrayadas): se escriben tal cual. ' +
        'Los no terminales, en morado, son otras reglas. ( … )* significa «cero o más veces» ' +
        'y [ … ] «opcional». Pasa el mouse sobre una producción para ver de qué parte del código salió.')
    );
    return nota;
  }
}

window.PanelSemantico = PanelSemantico;
