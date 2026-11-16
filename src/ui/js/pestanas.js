/**
 * pestanas.js
 * Cambia entre las pestañas de la aplicacion:
 *
 *   0. Proyecto Final                  (panel-final)   <- abre aqui
 *   1. Analizador Léxico               (panel-lexico)
 *   2. Analizador Léxico-Sintáctico    (panel-sintactico)
 *   3. Analizador Semántico            (panel-semantico)
 *
 * Cambiar de pestaña solo ESCONDE un panel y MUESTRA otro: nada se borra.
 * Los paneles existen todo el tiempo, asi que lo que se hizo en uno sigue
 * ahi al regresar. Las tres pestañas de los analizadores empiezan ocultas;
 * al elegirlas desde el menu Ver (o con Ctrl+Tab) aparece su boton.
 */

/* global document */

/** Las pestañas, en orden (para Ctrl+Tab). */
const PESTANAS = ['final', 'lexico', 'sintactico', 'semantico'];

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

      // La × esconde otra vez la pestaña del analizador. No debe activar la
      // pestaña: por eso el clic no sigue subiendo hasta el botón.
      const cerrar = b.querySelector('.pestana-cerrar');
      if (!cerrar) return;
      const hacerlo = (e) => {
        e.stopPropagation();
        e.preventDefault();
        this.cerrar(b.dataset.pestana);
      };
      cerrar.addEventListener('click', hacerlo);
      cerrar.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') hacerlo(e);
      });
    });
  }

  /** El botón de una pestaña por su nombre. */
  boton (nombre) {
    return this.botones.find((b) => b.dataset.pestana === nombre) || null;
  }

  /** Vuelve a esconder una pestaña de analizador (la final nunca se cierra). */
  cerrar (nombre) {
    if (nombre === 'final') return;
    const b = this.boton(nombre);
    if (!b || b.classList.contains('oculta-tab')) return;

    b.classList.add('oculta-tab');
    b.classList.remove('activa');
    b.setAttribute('aria-selected', 'false');
    if (this.activa === nombre) this.mostrar('final');
  }

  /** Esconde las tres pestañas de los analizadores de una vez. */
  cerrarAnalizadores () {
    PESTANAS.forEach((nombre) => this.cerrar(nombre));
  }

  /** Muestra una pestaña por su nombre: 'final', 'lexico', 'sintactico' o 'semantico'. */
  mostrar (nombre) {
    if (PESTANAS.indexOf(nombre) === -1) return;

    this.botones.forEach((b) => {
      const esEsta = b.dataset.pestana === nombre;
      b.classList.toggle('activa', esEsta);
      b.setAttribute('aria-selected', esEsta ? 'true' : 'false');
      // Las pestañas de los analizadores estan ocultas al inicio; al entrar
      // a una de ellas se muestra su boton para poder regresar con el mouse.
      if (esEsta) b.classList.remove('oculta-tab');
    });
    this.paneles.forEach((p) => {
      p.classList.toggle('activo', p.dataset.pestana === nombre);
    });

    this.activa = nombre;
    if (this.alCambiar) this.alCambiar(nombre);
  }

  /**
   * Pasa a la pestaña de al lado: +1 la siguiente, -1 la anterior.
   * Solo recorre las pestañas que están abiertas: si el usuario cerró los
   * analizadores, Ctrl+Tab no los vuelve a abrir sin querer.
   */
  mover (paso) {
    const abiertas = PESTANAS.filter((nombre) => {
      const b = this.boton(nombre);
      return b && !b.classList.contains('oculta-tab');
    });
    if (abiertas.length === 0) return;

    const i = Math.max(0, abiertas.indexOf(this.activa));
    const siguiente = (i + paso + abiertas.length) % abiertas.length;
    this.mostrar(abiertas[siguiente]);
  }
}

window.Pestanas = Pestanas;
