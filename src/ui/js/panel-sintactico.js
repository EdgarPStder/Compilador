/**
 * panel-sintactico.js
 * Pestaña 2: Analizador Léxico-Sintáctico.
 *
 * Pinta las dos cajas de esta pestaña:
 *   - Análisis Léxico:      la salida  a > b  ->  id1 > id2, con colores
 *   - Análisis Sintáctico:  el árbol dibujado (lo dibuja arbol.js)
 *
 * Sus botones deciden qué caja se llena:
 *   'lexico'      solo la caja léxica
 *   'sintactico'  solo el árbol
 *   'ambos'       las dos
 */

/* global window, document, Dom, VistaArbol */

/** Mensajes que aparecen en las cajas cuando todavía no hay resultado. */
const ESPERA_LEXICO = 'Presiona «Análisis Léxico» o «Análisis Léxico-Sintáctico».';
const ESPERA_SINTACTICO = 'Presiona «Análisis Sintáctico» o «Análisis Léxico-Sintáctico».';

class PanelLexicoSintactico {
  constructor () {
    this.salidaLexico = document.getElementById('salida-lexico');
    this.salidaSintactico = document.getElementById('salida-sintactico');
    this.estadoLexico = document.getElementById('estado-lexico');
    this.estadoSintactico = document.getElementById('estado-sintactico');

    // Se encarga del dibujo del árbol: qué rama se ve y qué tan de cerca.
    this.vista = new VistaArbol({
      menos: document.getElementById('zoom-menos'),
      mas: document.getElementById('zoom-mas'),
      ajustar: document.getElementById('zoom-ajustar'),
      nivel: document.getElementById('zoom-nivel'),
      camino: document.getElementById('arbol-camino')
    });
  }

  /** Deja las dos cajas esperando. */
  limpiar (mensajeLexico) {
    Dom.mostrarNota(this.salidaLexico, mensajeLexico || ESPERA_LEXICO);
    Dom.mostrarNota(this.salidaSintactico, ESPERA_SINTACTICO);
    Dom.ponerInsignia(this.estadoLexico, null);
    Dom.ponerInsignia(this.estadoSintactico, null);
    this.vista.limpiar();
  }

  /**
   * @param {object} r   Resultado de Compilador.compilar()
   * @param {string} que 'lexico' | 'sintactico' | 'ambos'
   */
  pintar (r, que) {
    if (que === 'lexico' || que === 'ambos') {
      this._pintarLexico(r);
    } else {
      Dom.mostrarNota(this.salidaLexico, ESPERA_LEXICO);
      Dom.ponerInsignia(this.estadoLexico, null);
    }

    if (que === 'sintactico' || que === 'ambos') {
      this._pintarSintactico(r);
    } else {
      Dom.mostrarNota(this.salidaSintactico, ESPERA_SINTACTICO);
      Dom.ponerInsignia(this.estadoSintactico, null);
      this.vista.limpiar();
    }
  }

  // ------------------------------------------------------------------
  // Caja léxica
  // ------------------------------------------------------------------

  _pintarLexico (r) {
    const caja = this.salidaLexico;
    caja.replaceChildren();

    const errores = r.lexico.errores;
    if (errores.length > 0) {
      Dom.ponerInsignia(this.estadoLexico, 'error', `${errores.length} error(es)`);
      errores.forEach((e) => caja.appendChild(Dom.filaError(e)));
      if (r.lexico.salida.trim() === '') return;
      caja.appendChild(Dom.crear('div', 'separador-salida'));
    } else {
      Dom.ponerInsignia(this.estadoLexico, 'ok', 'correcto');
    }

    const lineas = r.lexico.lineas;
    if (lineas.length === 0) {
      caja.appendChild(Dom.nota('No se encontró ningún token.'));
      return;
    }

    // Salida del curso:  a > b  ->  id1 > id2
    const numerar = lineas.length > 1;
    lineas.forEach((l) => caja.appendChild(this._filaLexica(l, numerar)));
    caja.appendChild(this._leyendaLexica(lineas));
  }

  /** Una línea de la salida léxica, con cada token en el color que le toca. */
  _filaLexica (l, numerar) {
    const fila = Dom.crear('div', 'linea-salida');

    if (numerar) fila.appendChild(Dom.crear('span', 'num', String(l.numero)));

    const codigo = Dom.crear('span');
    if (l.sangria) codigo.appendChild(document.createTextNode(l.sangria));

    l.piezas.forEach((p) => {
      if (p.espacioAntes) codigo.appendChild(document.createTextNode(' '));
      const trozo = Dom.crear('span', 'tk-' + p.categoria, p.texto);
      trozo.title = `${p.lexema}\n${p.tipo}\n${p.descripcion}`;
      codigo.appendChild(trozo);
    });

    fila.appendChild(codigo);
    return fila;
  }

  /** Leyenda con las categorías que aparecieron, en el orden de la jerarquía. */
  _leyendaLexica (lineas) {
    const presentes = new Set();
    lineas.forEach((l) => l.piezas.forEach((p) => presentes.add(p.categoria)));

    const etiquetas = [
      ['logico', 'Lógico (booleano)'],
      ['relacional', 'Relacional'],
      ['aritmetico', 'Aritmético'],
      ['numero', 'Número'],
      ['identificador', 'Identificador']
    ];

    const leyenda = Dom.crear('div', 'leyenda-lexica');
    etiquetas.forEach(([categoria, nombre]) => {
      if (!presentes.has(categoria)) return;
      const item = Dom.crear('span');
      item.appendChild(Dom.crear('b', 'tk-' + categoria, '■'));
      item.appendChild(document.createTextNode(nombre));
      leyenda.appendChild(item);
    });
    return leyenda;
  }

  // ------------------------------------------------------------------
  // Caja del árbol
  // ------------------------------------------------------------------

  _pintarSintactico (r) {
    const caja = this.salidaSintactico;
    caja.replaceChildren();

    if (r.sintactico.modo === 'vacio') {
      Dom.ponerInsignia(this.estadoSintactico, null);
      caja.appendChild(Dom.nota('No hay código que analizar.'));
      this.vista.limpiar();
      return;
    }

    const errores = r.sintactico.errores;
    if (errores.length > 0) {
      Dom.ponerInsignia(this.estadoSintactico, 'error', `${errores.length} error(es)`);
      const lista = Dom.crear('div', 'lista-errores');
      errores.forEach((e) => lista.appendChild(Dom.filaError(e)));
      caja.appendChild(lista);
      this.vista.limpiar();
      return;
    }

    if (!r.sintactico.arbol) {
      Dom.ponerInsignia(this.estadoSintactico, 'error', 'sin árbol');
      caja.appendChild(Dom.nota('No se pudo construir el árbol.'));
      this.vista.limpiar();
      return;
    }

    Dom.ponerInsignia(this.estadoSintactico, 'ok', 'correcto');
    this.vista.mostrar(caja, r.sintactico.arbol);
  }
}

window.PanelLexicoSintactico = PanelLexicoSintactico;
