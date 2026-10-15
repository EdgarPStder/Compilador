/**
 * editor.js
 * Le agrega a un cuadro de código (textarea) tres cosas:
 *
 *   1. Los números de renglón, en una columna a la izquierda.
 *   2. Los colores de Java: mientras se escribe, las palabras reservadas,
 *      los textos y los comentarios se pintan (ver ResaltadoCodigo.js).
 *   3. El subrayado rojo de los errores: cuando se deja de escribir un
 *      momento, el código se revisa y cada error queda subrayado, con el
 *      número de su renglón en rojo. Al pasar el mouse sobre ese renglón se
 *      ve el mensaje.
 *
 * Un <textarea> no puede tener colores, así que se usa el truco de siempre:
 *
 *   ┌────┬──────────────────────────────┐
 *   │  1 │ entero a = 5;                │  <pre> con el texto coloreado (atrás)
 *   │  2 │ si (a > 3) { ... }           │  <textarea> transparente (adelante):
 *   │  3 │                              │  solo se ve su cursor y la selección
 *   └────┴──────────────────────────────┘
 *    números
 *
 * Para que no haya desfase, el <pre>, el <textarea> y la columna de números
 * usan exactamente la misma letra, el mismo tamaño, el mismo alto de renglón
 * y el mismo relleno de arriba (ver .editor-codigo en estilos.css), y cuando
 * el textarea se desplaza, los otros dos se mueven lo mismo.
 */

/* global window, Dom, getComputedStyle */

/**
 * Cuánto se espera, después de la última tecla, para revisar los errores.
 * Mientras se escribe el código está a medias (entero a = ...) y casi todo
 * sería error; por eso se espera a que la persona haga una pausa.
 */
const ESPERA_ERRORES = 500;

class EditorCodigo {
  /** @param {HTMLTextAreaElement} textarea El cuadro de código que ya existe. */
  constructor (textarea) {
    this.textarea = textarea;
    this.renglones = 0;

    // Qué errores marca este cuadro: los de su pestaña y los de las fases
    // anteriores ('lexico', 'sintactico' o 'semantico', ver index.html).
    this.pestana = textarea.dataset.revision || null;
    this.errores = [];
    this.espera = null;

    // Se arma la caja alrededor del textarea, en el mismo lugar donde estaba.
    this.caja = Dom.crear('div', 'editor-codigo');
    this.numeros = Dom.crear('div', 'editor-numeros');
    this.lista = Dom.crear('div', 'editor-numeros-lista');
    this.zona = Dom.crear('div', 'editor-zona');
    this.colores = Dom.crear('pre', 'editor-colores');
    this.colores.setAttribute('aria-hidden', 'true');
    this.numeros.setAttribute('aria-hidden', 'true');

    textarea.parentNode.insertBefore(this.caja, textarea);
    this.numeros.appendChild(this.lista);
    this.zona.append(this.colores, textarea);
    this.caja.append(this.numeros, this.zona);

    textarea.addEventListener('input', () => this.refrescar());
    textarea.addEventListener('scroll', () => this.seguirDesplazamiento());
    textarea.addEventListener('mousemove', (e) => this.mostrarErrorDelRenglon(e));

    this.refrescar();
  }

  /**
   * Vuelve a pintar los colores y los números con el texto actual. Los
   * subrayados se quitan mientras se escribe y vuelven después de una pausa.
   */
  refrescar () {
    this._pintar(window.api.resaltar(this.textarea.value), []);

    clearTimeout(this.espera);
    if (this.pestana) this.espera = setTimeout(() => this.marcarErrores(), ESPERA_ERRORES);
  }

  /** Revisa el código y subraya en rojo dónde están los errores. */
  marcarErrores () {
    const r = window.api.revisar(this.textarea.value, this.pestana);
    this._pintar(r.html, r.errores);
  }

  /** Pone el texto coloreado, los números y los errores. */
  _pintar (html, errores) {
    const texto = this.textarea.value;
    this.errores = errores;

    // Si el texto termina en salto de línea, el último renglón está vacío y
    // el <pre> no lo dibujaría: con un espacio al final sí cuenta.
    this.colores.innerHTML = html + (texto.endsWith('\n') ? ' ' : '');

    // Un número por renglón; los renglones con error, en rojo.
    const renglones = texto.split('\n').length;
    const conError = new Set(errores.map((e) => e.linea));
    const lista = [];
    for (let i = 1; i <= renglones; i++) {
      lista.push(conError.has(i) ? `<span class="renglon-con-error">${i}</span>` : String(i));
    }
    this.lista.innerHTML = lista.join('\n');

    if (renglones !== this.renglones) {
      this.renglones = renglones;
      // La lista va encimada, así que la columna no sabe cuánto mide: se le
      // da el ancho de los dígitos del número más grande, más el relleno.
      this.numeros.style.width = `calc(${String(renglones).length}ch + 22px)`;
    }

    if (errores.length === 0) this.textarea.removeAttribute('title');
    this.seguirDesplazamiento();
  }

  /**
   * Al pasar el mouse sobre un renglón con errores, sus mensajes salen como
   * ayuda (el texto de "title" del cuadro). El renglón se calcula con el alto
   * de renglón, que es el mismo en todo el cuadro.
   */
  mostrarErrorDelRenglon (evento) {
    if (this.errores.length === 0) return;

    const estilo = getComputedStyle(this.textarea);
    const arriba = this.textarea.getBoundingClientRect().top + parseFloat(estilo.paddingTop);
    const y = evento.clientY - arriba + this.textarea.scrollTop;
    const renglon = Math.floor(y / parseFloat(estilo.lineHeight)) + 1;

    const delRenglon = this.errores.filter((e) => e.linea === renglon);
    if (delRenglon.length === 0) {
      this.textarea.removeAttribute('title');
      return;
    }
    this.textarea.title = delRenglon
      .map((e) => `✕ ${e.mensaje}` + (e.sugerencia ? `\n   → ${e.sugerencia}` : ''))
      .join('\n');
  }

  /** Mueve los colores y los números junto con el texto al desplazarse. */
  seguirDesplazamiento () {
    const arriba = this.textarea.scrollTop;
    const izquierda = this.textarea.scrollLeft;
    this.colores.style.transform = `translate(${-izquierda}px, ${-arriba}px)`;
    this.lista.style.transform = `translateY(${-arriba}px)`;
  }
}

window.EditorCodigo = EditorCodigo;
