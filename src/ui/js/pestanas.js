/**
 * pestanas.js
 * Cambia entre las seis pestañas de la aplicacion:
 *
 *   1. Analizador Léxico               (panel-lexico)
 *   2. Analizador Léxico-Sintáctico    (panel-sintactico)
 *   3. Analizador Semántico            (panel-semantico)
 *   4. Generador de Código Intermedio  (panel-intermedio)
 *   5. Optimizador de Código Intermedio (panel-optimizacion)
 *   6. Generador de Código Objeto      (panel-objeto)
 *
 * Cambiar de pestaña solo ESCONDE un panel y MUESTRA otro: nada se borra.
 * Los seis paneles existen todo el tiempo, asi que lo que se hizo en uno
 * sigue ahi al regresar.
 */

/* global document */

/** Las pestañas, en orden (para Ctrl+Tab). */
const PESTANAS = ['lexico', 'sintactico', 'semantico', 'intermedio', 'optimizacion', 'objeto'];

class Pestanas {
  /**
   * @param {Function} alCambiar Se llama con el nombre de la pestaña nueva.
   */
  constructor (alCambiar) {
    this.alCambiar = alCambiar;
    this.botones = Array.from(document.querySelectorAll('.pestana'));
    this.paneles = Array.from(document.querySelectorAll('.panel'));
    this.activa = null;

    this.botones.forEach((b) => {
      b.addEventListener('click', () => this.mostrar(b.dataset.pestana));
    });
  }

  /** Muestra una pestaña por su nombre: 'lexico', 'sintactico', 'semantico', 'intermedio', 'optimizacion' u 'objeto'. */
  mostrar (nombre) {
    if (PESTANAS.indexOf(nombre) === -1) return;

    this.botones.forEach((b) => {
      const esEsta = b.dataset.pestana === nombre;
      b.classList.toggle('activa', esEsta);
      b.setAttribute('aria-selected', esEsta ? 'true' : 'false');
    });
    this.paneles.forEach((p) => {
      p.classList.toggle('activo', p.dataset.pestana === nombre);
    });

    this.activa = nombre;
    if (this.alCambiar) this.alCambiar(nombre);
  }

  /** Pasa a la pestaña de al lado: +1 la siguiente, -1 la anterior. */
  mover (paso) {
    const i = PESTANAS.indexOf(this.activa);
    const siguiente = (i + paso + PESTANAS.length) % PESTANAS.length;
    this.mostrar(PESTANAS[siguiente]);
  }
}

window.Pestanas = Pestanas;
