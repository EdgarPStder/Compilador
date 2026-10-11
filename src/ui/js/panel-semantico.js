/**
 * panel-semantico.js
 * Pestaña 3: Analizador Semántico.
 *
 * Muestra la gramática que src/core/semantico/AnalizadorSemantico.js generó
 * para el código dado, escrita como en el pizarrón:
 *
 *   prop → id = exp
 *   exp  → id | num | exp / exp
 *   id   → let ( dig )*
 *   ...
 *
 * Los terminales (lo que se escribe tal cual en el código) van en negritas,
 * y las palabras además subrayadas, como en el pizarrón. Al pasar el mouse
 * sobre una alternativa se ve de qué parte del código salió.
 *
 * Si el código tiene errores léxicos o sintácticos no hay gramática: se
 * muestran los errores para corregirlos.
 */

/* global window, document, Dom */

const ESPERA_SEMANTICO =
  'Escribe cualquier código del lenguaje y presiona «Analiza»: aquí aparecerá su gramática.';

/** Cómo se llama cada tipo de código que reconoce el analizador sintáctico. */
const MODOS = {
  expresion: 'una expresión',
  proposiciones: 'varias proposiciones, una por renglón',
  instrucciones: 'instrucciones',
  programa: 'un programa completo'
};

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
    if (!sem || sem.vacio) {
      this.limpiar('No hay código que analizar.');
      return;
    }

    if (!sem.correcto) {
      Dom.ponerInsignia(this.estado, 'error', 'sin gramática');
      this.salida.replaceChildren(this._errores(sem.errores));
      return;
    }

    Dom.ponerInsignia(this.estado, 'ok',
      Dom.cuantos(sem.reglas.length, 'regla', 'reglas'));

    const resumen = Dom.crear('p', 'resumen-gramatica',
      `✓ Gramática generada del código dado — ${Dom.cuantos(sem.reglas.length, 'regla', 'reglas')}, ` +
      `${Dom.cuantos(sem.totalAlternativas, 'producción', 'producciones')}. ` +
      `Se analizó como ${MODOS[sem.modo] || sem.modo}.`);

    this.salida.replaceChildren(resumen, this._gramatica(sem.reglas), this._nota());
  }

  // ------------------------------------------------------------------
  // Las partes
  // ------------------------------------------------------------------

  /** Recuadro rojo: sin código correcto no hay gramática. */
  _errores (errores) {
    const caja = Dom.crear('div', 'veredicto mal');
    caja.appendChild(Dom.crear('b', null, '✕ No se pudo generar la gramática'));
    caja.appendChild(Dom.crear('p', null,
      'Primero hay que corregir los errores del código:'));
    errores.forEach((e) => caja.appendChild(Dom.filaError(e)));
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
