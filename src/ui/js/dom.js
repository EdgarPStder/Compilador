/**
 * dom.js
 * Ayudas pequeñas para construir la interfaz. Las usan los tres paneles, asi
 * que un error, una nota o una insignia se ven igual en todas las pestañas.
 */

/* global window, document */

const Dom = {
  /** Crea un elemento con su clase y, si se da, su texto. */
  crear (etiqueta, clase, texto) {
    const el = document.createElement(etiqueta);
    if (clase) el.className = clase;
    if (texto !== undefined) el.textContent = texto;
    return el;
  },

  /** Mensaje gris de "todavía no hay nada aquí". */
  nota (mensaje) {
    return Dom.crear('div', 'salida-vacia', mensaje);
  },

  /** Deja una caja con una sola nota adentro. */
  mostrarNota (caja, mensaje) {
    caja.replaceChildren(Dom.nota(mensaje));
  },

  /**
   * Un renglón de error:  ✕  L1:C5  mensaje  → sugerencia
   * Las advertencias usan la misma fila con otra marca:  ⚠
   */
  filaError (e, marca = '✕') {
    const fila = Dom.crear('div', 'error-linea');
    fila.append(
      Dom.crear('span', 'marca', marca),
      Dom.crear('span', 'sitio', `L${e.linea}:C${e.columna}`),
      Dom.crear('span', null, e.mensaje + (e.sugerencia ? '  → ' + e.sugerencia : ''))
    );
    return fila;
  },

  /**
   * Pone la insignia junto a un título: verde con clase 'ok', roja con
   * 'error', ámbar con 'advertencia', o la esconde si clase es null.
   */
  ponerInsignia (elemento, clase, texto) {
    elemento.className = 'insignia';
    if (!clase) { elemento.textContent = ''; return; }
    elemento.classList.add('visible', clase);
    elemento.textContent = texto || '';
  },

  /** "1 token", "7 tokens". */
  cuantos (n, singular, plural) {
    return `${n} ${n === 1 ? singular : plural}`;
  }
};

window.Dom = Dom;
