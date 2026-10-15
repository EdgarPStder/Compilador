/**
 * panel-objeto.js
 * Pestaña 6: Generador de Código Objeto.
 *
 * Muestra lo que src/core/06.objeto/GeneradorJava.js escribió: el programa
 * en Java, el lenguaje destino de SwordByte, a partir del código ya
 * optimizado de la pestaña 5. Dos formas de verlo (los botones junto al
 * título):
 *
 *   1. Java: el programa, con sus números de renglón y los colores de Java.
 *      Al pasar el mouse sobre un renglón se ve de qué renglón del programa
 *      SwordByte sale.
 *   2. Junto al optimizado: a la izquierda el código de tres direcciones ya
 *      optimizado (pestaña 5) y a la derecha el Java que sale de él.
 *
 * El botón «Guardar .java» guarda el programa con el nombre de su clase
 * (clase ejemplo -> ejemplo.java), listo para  javac ejemplo.java.
 */

/* global window, document, Dom, VistaIntermedio */

const ESPERA_OBJETO =
  'Escribe un programa SwordByte y presiona «Genera»: aquí aparecerá el programa ' +
  'traducido a Java (el código objeto), escrito a partir del código optimizado de la pestaña 5.';

/** Para qué sirve cada función de apoyo (las que Java no trae tal cual). */
const APOYO = {
  aleatorio: 'aleatorio(mínimo, máximo)',
  esperar: 'esperar(milisegundos)',
  logaritmo: 'logaritmo(base, número)'
};

class PanelObjeto {
  constructor () {
    this.salida = document.getElementById('obj-salida');
    this.estado = document.getElementById('obj-estado');
    this.botones = {
      java: document.getElementById('obj-ver-java'),
      lado: document.getElementById('obj-ver-lado')
    };

    /** Qué vista se muestra: 'java' o 'lado'. */
    this.vista = 'java';
    /** El último resultado: cambiar de vista no vuelve a generar. */
    this.objeto = null;
    this.optimizado = null;

    Object.keys(this.botones).forEach((vista) =>
      this.botones[vista].addEventListener('click', () => this.verVista(vista)));
  }

  /** Deja la caja esperando. */
  limpiar (mensaje) {
    this.objeto = null;
    this.optimizado = null;
    Dom.ponerInsignia(this.estado, null);
    Dom.mostrarNota(this.salida, mensaje || ESPERA_OBJETO);
  }

  /** true si hay un programa Java que se pueda guardar. */
  hayCodigo () {
    return Boolean(this.objeto);
  }

  /** @param {object} r Resultado de Compilador.compilar() */
  pintar (r) {
    const o = r.objeto;
    if (!o || o.estado === 'vacio') {
      this.limpiar('No hay código que traducir.');
      return;
    }

    if (o.estado === 'errores-previos' || o.estado === 'error') {
      this.objeto = null;
      Dom.ponerInsignia(this.estado, 'error', o.estado === 'error' ? 'error interno' : 'corrige primero');
      this.salida.replaceChildren(o.estado === 'error'
        ? this._errorInterno(o)
        : VistaIntermedio.erroresPrevios('No se pudo generar el código objeto', o.errores));
      return;
    }

    this.objeto = o;
    this.optimizado = r.optimizacion;
    Dom.ponerInsignia(this.estado, 'ok', o.archivo);
    this._mostrar();
  }

  /** Cambia entre el Java solo y el Java junto al código optimizado. */
  verVista (vista) {
    this.vista = vista;
    VistaIntermedio.marcarVista(this.botones, vista);
    if (this.objeto) this._mostrar();
  }

  // ------------------------------------------------------------------
  // Las partes
  // ------------------------------------------------------------------

  _mostrar () {
    const o = this.objeto;
    let contenido;
    if (this.vista === 'java') {
      contenido = this._java(o);
    } else {
      contenido = Dom.crear('div', 'lado-a-lado');
      const izquierda = contenido.appendChild(Dom.crear('div', 'lado'));
      izquierda.append(
        Dom.crear('p', 'titulo-lado', 'Código optimizado (pestaña 5)'),
        VistaIntermedio.tresDirecciones(this.optimizado.instrucciones, this.optimizado.prefijos));
      const derecha = contenido.appendChild(Dom.crear('div', 'lado'));
      derecha.append(Dom.crear('p', 'titulo-lado', `Java: ${o.archivo} (pestaña 6)`), this._java(o));
    }
    this.salida.replaceChildren(this._resumen(o), contenido, this._nota());
  }

  /** Arriba: el archivo, cuántos renglones y métodos, y las funciones de apoyo. */
  _resumen (o) {
    const caja = Dom.crear('div', 'resumen-optimizacion');
    caja.appendChild(Dom.crear('p', 'resumen-gramatica',
      `✓ ${o.archivo} · ${Dom.cuantos(o.lineas.length, 'renglón', 'renglones')} de Java · ` +
      `${Dom.cuantos(o.metodos, 'método', 'métodos')} · sale de ` +
      `${Dom.cuantos(o.instrucciones, 'instrucción', 'instrucciones')} del código optimizado`));

    if (o.apoyo.length > 0) {
      const lista = caja.appendChild(Dom.crear('div', 'chips-optimizacion'));
      lista.appendChild(Dom.crear('span', 'chips-titulo', 'Funciones de apoyo:'));
      o.apoyo.forEach((f) => {
        const chip = Dom.crear('span', 'chip-optimizacion', APOYO[f] || f);
        chip.title = 'SwordByte la tiene y Java no la trae tal cual: va al final de la clase.';
        lista.appendChild(chip);
      });
    }
    return caja;
  }

  /** El programa Java: número de renglón y renglón con colores. */
  _java (o) {
    const tabla = Dom.crear('table', 'codigo-java');
    const cuerpo = tabla.appendChild(Dom.crear('tbody'));
    o.lineas.forEach((l, k) => {
      const fila = Dom.crear('tr');
      if (l.linea) fila.title = `Sale de la línea ${l.linea} del programa`;
      const celda = Dom.crear('td', 'java');
      celda.innerHTML = l.html || ' ';   // ya viene escapado (ResaltadoJava.js)
      fila.append(Dom.crear('td', 'num', String(k + 1)), celda);
      cuerpo.appendChild(fila);
    });
    return tabla;
  }

  /** Si el compilador falló al escribir el Java (un error del compilador, no del programa). */
  _errorInterno (o) {
    const caja = Dom.crear('div', 'veredicto mal');
    caja.append(
      Dom.crear('b', null, '✕ No se pudo generar el código objeto'),
      Dom.crear('p', null, o.errores.map((e) => e.mensaje).join(' '))
    );
    return caja;
  }

  /** Cómo leer cada vista. */
  _nota () {
    const nota = Dom.crear('p', 'nota-gramatica');
    nota.textContent = this.vista === 'java'
      ? 'El código objeto de SwordByte es Java. Sale del código optimizado de la pestaña 5: los saltos ' +
        '(goto, if…goto) se volvieron if, while, for y switch, y las instrucciones de tres direcciones se ' +
        'juntaron en expresiones. Pasa el mouse sobre un renglón para ver de qué línea del programa sale. ' +
        'Guárdalo con «Guardar .java» y compílalo con  javac.'
      : 'A la izquierda, el código de tres direcciones optimizado; a la derecha, el Java que se escribió ' +
        'con él. Compara: cada etiqueta y su goto de regreso es un ciclo, y cada ifFalse … goto es un if.';
    return nota;
  }
}

window.PanelObjeto = PanelObjeto;
