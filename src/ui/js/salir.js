/**
 * salir.js
 * Ventana que aparece antes de cerrar la aplicacion, con los botones
 * Fuga (pestaña 1), Salir (pestaña 2), Termina (pestaña 3) o Ctrl+Q.
 *
 * Muestra el nombre del equipo y sus integrantes, y pregunta si de verdad se
 * quiere salir. Si hay codigo escrito, avisa que no se va a guardar.
 *
 *   Cancelar, Esc o clic afuera  ->  se cierra la ventana y no pasa nada
 *   Sí, salir                    ->  se cierra la aplicacion
 */

/* global window, document, llenarIntegrantes */

class VentanaSalir {
  constructor () {
    this.modal = document.getElementById('modal-salir');
    this.titulo = document.getElementById('salir-titulo');
    this.lista = document.getElementById('salir-integrantes');
    this.detalle = document.getElementById('salir-detalle');
    this.cancelar = document.getElementById('salir-cancelar');

    this.modal.querySelectorAll('[data-cancelar]').forEach((el) => {
      el.addEventListener('click', () => this.cerrar());
    });
    document.getElementById('salir-confirmar')
      .addEventListener('click', () => this.confirmar());

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.cerrar();
    });
  }

  /** Pone el nombre del equipo y la lista de integrantes. */
  llenar (datos) {
    this.titulo.textContent = datos.nombre;
    llenarIntegrantes(this.lista, datos.integrantes);
  }

  /**
   * @param {boolean} hayCodigo true si hay codigo escrito: se avisa que se
   *                            pierde al salir.
   */
  abrir (hayCodigo) {
    this.detalle.classList.toggle('oculto', !hayCodigo);
    this.modal.classList.remove('oculto');
    // El foco va en Cancelar: un Enter sin pensar no cierra la aplicacion.
    this.cancelar.focus();
  }

  cerrar () { this.modal.classList.add('oculto'); }

  estaAbierta () { return !this.modal.classList.contains('oculto'); }

  confirmar () {
    this.cerrar();
    window.api.salir();
  }
}

window.VentanaSalir = VentanaSalir;
