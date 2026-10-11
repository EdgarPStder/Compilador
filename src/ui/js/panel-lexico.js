/**
 * panel-lexico.js
 * Pestaña 1: Analizador Léxico.
 *
 * Pinta la tabla de tokens que arma src/core/lexico/TablaLexica.js:
 *
 *   Lexema   Token                     Descripción
 *   a        identificador             Variable o nombre definido... (id1)
 *   =        operador asignación       Asigna un valor a una variable
 *
 * y abajo la linea de estado:  ✓ Análisis completado — 7 tokens encontrados.
 * Un clic en una fila la deja marcada, para señalarla al explicar.
 */

/* global window, document, Dom */

const ESPERA_TABLA = 'Escribe el código y presiona «Realizar Análisis».';

class PanelLexico {
  constructor () {
    this.tabla = document.getElementById('lex-tabla');
    this.vacio = document.getElementById('lex-vacio');
    this.estado = document.getElementById('lex-estado');
    this.resumen = document.getElementById('lex-resumen');

    // Un solo escuchador para toda la tabla: marca la fila a la que se le
    // hizo clic y desmarca la anterior.
    this.tabla.addEventListener('click', (e) => {
      const fila = e.target.closest('tr');
      if (!fila) return;
      this.tabla.querySelectorAll('tr.seleccionada')
        .forEach((f) => f.classList.remove('seleccionada'));
      fila.classList.add('seleccionada');
    });
  }

  /** Deja la tabla vacia, con el mensaje de espera. */
  limpiar (mensaje) {
    this.tabla.replaceChildren();
    this.vacio.textContent = mensaje || ESPERA_TABLA;
    this.vacio.classList.remove('oculto');
    Dom.ponerInsignia(this.estado, null);
    this.resumen.textContent = '';
    this.resumen.className = 'linea-estado';
  }

  /** @param {object} r Resultado de Compilador.compilar() */
  pintar (r) {
    const filas = r.lexico.tabla;
    const errores = r.lexico.errores;

    this.tabla.replaceChildren(...filas.map((f) => this._fila(f)));
    this.vacio.textContent = filas.length === 0 ? 'No se encontró ningún token.' : '';
    this.vacio.classList.toggle('oculto', filas.length > 0);

    const tokens = Dom.cuantos(filas.length, 'token encontrado', 'tokens encontrados');
    if (errores.length === 0) {
      Dom.ponerInsignia(this.estado, 'ok', 'correcto');
      this.resumen.textContent = `✓ Análisis completado — ${tokens}.`;
      this.resumen.className = 'linea-estado ok';
    } else {
      const cuantos = Dom.cuantos(errores.length, 'error léxico', 'errores léxicos');
      Dom.ponerInsignia(this.estado, 'error', cuantos);
      this.resumen.textContent = `✕ Análisis con ${cuantos} — ${tokens}.`;
      this.resumen.className = 'linea-estado error';
    }
  }

  /**
   * Una fila de la tabla. El token va del color de su categoria; la linea y
   * la columna se ven al pasar el mouse.
   */
  _fila (f) {
    const tr = Dom.crear('tr', f.categoria === 'error' ? 'fila-error' : '');
    tr.title = `Línea ${f.linea}, columna ${f.columna}`;
    tr.append(
      Dom.crear('td', 'lexema', f.lexema),
      Dom.crear('td', 'tk-' + f.categoria, f.token),
      Dom.crear('td', null, f.descripcion)
    );
    return tr;
  }
}

window.PanelLexico = PanelLexico;
