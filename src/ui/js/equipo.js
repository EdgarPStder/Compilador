/**
 * equipo.js
 * Ventana emergente con el nombre del equipo y sus integrantes.
 *
 * Los datos NO viven aqui: vienen de src/core/comun/Equipo.js a traves de
 * window.api.equipo(), para que la ventana, la de salida y el encabezado de
 * los reportes digan siempre lo mismo.
 */

/* global window, document */

/**
 * Llena una lista <ol> con los integrantes:  1.  Apellidos  Nombres
 * La usan la ventana del equipo y la ventana de salida.
 */
function llenarIntegrantes (lista, integrantes) {
  lista.textContent = '';
  integrantes.forEach((persona, i) => {
    const li = document.createElement('li');

    const numero = document.createElement('span');
    numero.className = 'numero';
    numero.textContent = (i + 1) + '.';

    const apellidos = document.createElement('span');
    apellidos.className = 'apellidos';
    apellidos.textContent = persona.apellidos;

    const nombres = document.createElement('span');
    nombres.className = 'nombres';
    nombres.textContent = persona.nombres;

    li.appendChild(numero);
    li.appendChild(apellidos);
    li.appendChild(nombres);
    lista.appendChild(li);
  });
}

class VentanaEquipo {
  constructor () {
    this.modal = document.getElementById('modal-equipo');
    this.lista = document.getElementById('lista-integrantes');
    this.titulo = document.getElementById('modal-titulo');

    // Cualquier elemento con data-cerrar cierra la ventana
    this.modal.querySelectorAll('[data-cerrar]').forEach((el) => {
      el.addEventListener('click', () => this.cerrar());
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.cerrar();
    });
  }

  /** Pide los datos al compilador y llena la ventana. */
  async cargar () {
    const datos = await window.api.equipo();
    this.datos = datos;
    this.titulo.textContent = datos.nombre;
    llenarIntegrantes(this.lista, datos.integrantes);
    return datos;
  }

  abrir () { this.modal.classList.remove('oculto'); }
  cerrar () { this.modal.classList.add('oculto'); }
}

window.VentanaEquipo = VentanaEquipo;
window.llenarIntegrantes = llenarIntegrantes;
