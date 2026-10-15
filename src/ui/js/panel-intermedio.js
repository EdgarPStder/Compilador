/**
 * panel-intermedio.js
 * Pestaña 4: Generador de Código Intermedio.
 *
 * Muestra lo que src/core/04.intermedio/GeneradorIntermedio.js generó para el
 * programa, de dos formas (los botones junto al título):
 *
 *   1. Tres direcciones: el código intermedio como se escribe, con un
 *      comentario que dice de qué renglón del programa sale cada grupo:
 *
 *        // entero a = b + c * d;
 *        t1 = c * d
 *        t2 = b + t1
 *        a = t2
 *
 *   2. Cuádruplos: la misma lista como tabla de cuatro campos:
 *
 *        #   Operador   Arg 1   Arg 2   Resultado
 *        1   *          c       d       t1
 *
 * Solo se genera para un programa sin errores; si tiene alguno, se dice que
 * primero hay que corregirlo. Cómo se dibuja cada vista está en
 * vista-intermedio.js (la pestaña 5 la usa igual).
 */

/* global window, document, Dom, VistaIntermedio */

const ESPERA_INTERMEDIO =
  'Escribe un programa SwordByte y presiona «Genera»: aquí aparecerá su código ' +
  'intermedio, en código de tres direcciones y en cuádruplos.';

class PanelIntermedio {
  constructor () {
    this.salida = document.getElementById('int-salida');
    this.estado = document.getElementById('int-estado');
    this.botones = {
      tres: document.getElementById('int-ver-tres'),
      cuadruplos: document.getElementById('int-ver-cuadruplos')
    };

    /** Qué vista se muestra: 'tres' o 'cuadruplos'. */
    this.vista = 'tres';
    /** El último código generado: cambiar de vista no vuelve a generar. */
    this.codigo = null;

    this.botones.tres.addEventListener('click', () => this.verVista('tres'));
    this.botones.cuadruplos.addEventListener('click', () => this.verVista('cuadruplos'));
  }

  /** Deja la caja esperando. */
  limpiar (mensaje) {
    this.codigo = null;
    Dom.ponerInsignia(this.estado, null);
    Dom.mostrarNota(this.salida, mensaje || ESPERA_INTERMEDIO);
  }

  /** @param {object} r Resultado de Compilador.compilar() */
  pintar (r) {
    const ci = r.intermedio;
    if (!ci || ci.estado === 'vacio') {
      this.limpiar('No hay código que traducir.');
      return;
    }

    if (ci.estado === 'errores-previos') {
      this.codigo = null;
      Dom.ponerInsignia(this.estado, 'error', 'corrige primero');
      this.salida.replaceChildren(
        VistaIntermedio.erroresPrevios('No se pudo generar el código intermedio', ci.errores));
      return;
    }

    this.codigo = ci;
    Dom.ponerInsignia(this.estado, 'ok', Dom.cuantos(ci.instrucciones.length, 'instrucción', 'instrucciones'));
    this._mostrar();
  }

  /** Cambia entre el código de tres direcciones y los cuádruplos. */
  verVista (vista) {
    this.vista = vista;
    VistaIntermedio.marcarVista(this.botones, vista);
    if (this.codigo) this._mostrar();
  }

  _mostrar () {
    const ci = this.codigo;
    const resumen = Dom.crear('p', 'resumen-gramatica',
      `✓ ${Dom.cuantos(ci.instrucciones.length, 'instrucción', 'instrucciones')} · ` +
      `${Dom.cuantos(ci.temporales, 'temporal', 'temporales')} · ` +
      `${Dom.cuantos(ci.etiquetas, 'etiqueta', 'etiquetas')}`);

    const contenido = this.vista === 'tres'
      ? VistaIntermedio.tresDirecciones(ci.instrucciones, ci.prefijos)
      : VistaIntermedio.cuadruplos(ci.instrucciones);
    this.salida.replaceChildren(resumen, contenido, this._nota());
  }

  /** Cómo leer el código intermedio. */
  _nota () {
    const nota = Dom.crear('p', 'nota-gramatica');
    nota.textContent = this.vista === 'tres'
      ? 'Cada instrucción hace una sola operación. t1, t2… son temporales (resultados a medio ' +
        'camino) y L1, L2… son etiquetas: a donde saltan goto, if e ifFalse. En verde, el renglón ' +
        'del programa de donde sale cada grupo. Cambia a «Cuádruplos» para verlo como tabla.'
      : 'Cada cuádruplo es (operador, argumento 1, argumento 2, resultado): t1 = c * d se guarda ' +
        'como ( *, c, d, t1 ). Pasa el mouse sobre una fila para ver la instrucción.';
    return nota;
  }
}

window.PanelIntermedio = PanelIntermedio;
