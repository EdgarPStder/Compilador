/**
 * panel-optimizacion.js
 * Pestaña 5: Optimizador de Código Intermedio.
 *
 * Muestra lo que src/core/05.optimizacion/Optimizador.js hizo con el código
 * de la pestaña 4, de tres formas (los botones junto al título):
 *
 *   1. Optimizado: el código de tres direcciones que quedó. Las instrucciones
 *      que cambiaron van en verde, con lo que se les hizo a la derecha.
 *   2. Cambios: cada cambio, en el orden en que se hizo:
 *
 *        Optimización               Antes             Después
 *        Propagación de constantes  t1 = b * 3        t1 = 2 * 3
 *        Plegado de constantes      t1 = 2 * 3        t1 = 6
 *        Código muerto              b = 2             (se quita)
 *
 *   3. Cuádruplos: la tabla del código optimizado.
 *
 * Arriba, el resumen: de cuántas instrucciones a cuántas, y cuántas veces se
 * usó cada optimización.
 */

/* global window, document, Dom, VistaIntermedio */

const ESPERA_OPTIMIZACION =
  'Escribe un programa SwordByte y presiona «Optimiza»: aquí aparecerá su código ' +
  'intermedio ya optimizado, y cada cambio que se le hizo.';

/** Qué hace cada optimización (se ve al pasar el mouse sobre su nombre). */
const QUE_HACE = {
  plegado: 'Calcula desde ahora lo que solo usa valores fijos:  t1 = 2 * 3  →  t1 = 6',
  propagacion: 'Usa el valor fijo de una variable en lugar de su nombre:  b = 2 … b * 3  →  2 * 3',
  copias: 'Usa el valor original en lugar de su copia, o guarda el cálculo directo en la variable:  t1 = b * c, a = t1  →  a = b * c',
  subexpresiones: 'No vuelve a calcular lo que ya se calculó:  t2 = a * b (otra vez)  →  t2 = t1',
  algebraica: 'Quita operaciones que no cambian nada:  x * 1,  x / 1,  x - 0  →  x',
  fuerza: 'Cambia una operación por otra más barata:  x * 2  →  x + x',
  muerto: 'Quita lo que calcula un valor que nadie usa',
  inalcanzable: 'Quita lo que nunca se ejecuta (lo que va después de un goto o un return)',
  saltos: 'Quita saltos que no hacen falta: a la instrucción de abajo, a otro goto, con una condición que ya se sabe, o etiquetas que nadie usa'
};

class PanelOptimizacion {
  constructor () {
    this.salida = document.getElementById('opt-salida');
    this.estado = document.getElementById('opt-estado');
    this.botones = {
      optimizado: document.getElementById('opt-ver-optimizado'),
      cambios: document.getElementById('opt-ver-cambios'),
      cuadruplos: document.getElementById('opt-ver-cuadruplos')
    };

    /** Qué vista se muestra: 'optimizado', 'cambios' o 'cuadruplos'. */
    this.vista = 'optimizado';
    /** El último resultado: cambiar de vista no vuelve a optimizar. */
    this.optimizado = null;

    Object.keys(this.botones).forEach((vista) =>
      this.botones[vista].addEventListener('click', () => this.verVista(vista)));
  }

  /** Deja la caja esperando. */
  limpiar (mensaje) {
    this.optimizado = null;
    Dom.ponerInsignia(this.estado, null);
    Dom.mostrarNota(this.salida, mensaje || ESPERA_OPTIMIZACION);
  }

  /** @param {object} r Resultado de Compilador.compilar() */
  pintar (r) {
    const o = r.optimizacion;
    if (!o || o.estado === 'vacio') {
      this.limpiar('No hay código que optimizar.');
      return;
    }

    if (o.estado === 'errores-previos') {
      this.optimizado = null;
      Dom.ponerInsignia(this.estado, 'error', 'corrige primero');
      this.salida.replaceChildren(
        VistaIntermedio.erroresPrevios('No se pudo optimizar el código intermedio', o.errores));
      return;
    }

    this.optimizado = o;
    const menos = o.antes - o.instrucciones.length;
    Dom.ponerInsignia(this.estado, 'ok',
      Dom.cuantos(o.instrucciones.length, 'instrucción', 'instrucciones') + (menos > 0 ? ` (−${menos})` : ''));
    this._mostrar();
  }

  /** Cambia entre el código optimizado, los cambios y los cuádruplos. */
  verVista (vista) {
    this.vista = vista;
    VistaIntermedio.marcarVista(this.botones, vista);
    if (this.optimizado) this._mostrar();
  }

  // ------------------------------------------------------------------
  // Las partes
  // ------------------------------------------------------------------

  _mostrar () {
    const o = this.optimizado;
    let contenido;
    if (this.vista === 'optimizado') contenido = this._codigo(o);
    else if (this.vista === 'cambios') contenido = this._cambios(o);
    else contenido = VistaIntermedio.cuadruplos(o.instrucciones);
    this.salida.replaceChildren(this._resumen(o), contenido, this._nota());
  }

  /**
   * Arriba: de cuántas instrucciones a cuántas, y cada optimización que se
   * usó con sus veces:  Plegado de constantes ×2   Código muerto ×5
   */
  _resumen (o) {
    const caja = Dom.crear('div', 'resumen-optimizacion');
    const despues = o.instrucciones.length;

    let texto;
    if (o.cambios.length === 0) {
      texto = `✓ Ya no se puede mejorar: ${Dom.cuantos(despues, 'instrucción', 'instrucciones')}, las mismas de la pestaña 4`;
    } else if (despues < o.antes) {
      texto = `✓ De ${o.antes} instrucciones a ${despues} (${o.antes - despues} menos)`;
    } else {
      texto = `✓ ${Dom.cuantos(despues, 'instrucción', 'instrucciones')}: las mismas, pero más sencillas`;
    }
    texto += ` · ${Dom.cuantos(o.temporales, 'temporal', 'temporales')} · ` +
      `${Dom.cuantos(o.etiquetas, 'etiqueta', 'etiquetas')}`;
    caja.appendChild(Dom.crear('p', 'resumen-gramatica', texto));

    if (o.porOptimizacion.length > 0) {
      const lista = caja.appendChild(Dom.crear('div', 'chips-optimizacion'));
      o.porOptimizacion.forEach((opt) => {
        const chip = Dom.crear('span', 'chip-optimizacion', opt.nombre);
        chip.appendChild(Dom.crear('b', null, `×${opt.veces}`));
        chip.title = QUE_HACE[opt.clave];
        lista.appendChild(chip);
      });
    }
    return caja;
  }

  /** El código optimizado: las instrucciones que cambiaron, en verde. */
  _codigo (o) {
    const nombres = {};
    o.porOptimizacion.forEach((opt) => { nombres[opt.clave] = opt.nombre; });

    return VistaIntermedio.tresDirecciones(o.instrucciones, o.prefijos, (fila, ins) => {
      fila.title += ` · en la pestaña 4 era la instrucción ${ins.original}`;
      if (!ins.optimizaciones) return;
      fila.classList.add('cambiada');
      fila.appendChild(Dom.crear('td', 'ci-cambios', ins.optimizaciones.map((c) => nombres[c]).join(' · ')));
    });
  }

  /** Cada cambio, en el orden en que se hizo: # · Optimización · Antes · Después · Línea */
  _cambios (o) {
    if (o.cambios.length === 0) {
      return Dom.nota('No hubo ningún cambio: el código de la pestaña 4 ya no se puede mejorar.');
    }

    const tabla = Dom.crear('table', 'tabla-cuadruplos tabla-cambios');
    const encabezado = tabla.appendChild(Dom.crear('thead')).appendChild(Dom.crear('tr'));
    ['#', 'Optimización', 'Antes', 'Después', 'Línea'].forEach((t) =>
      encabezado.appendChild(Dom.crear('th', null, t)));

    const cuerpo = tabla.appendChild(Dom.crear('tbody'));
    o.cambios.forEach((c, k) => {
      const fila = Dom.crear('tr');
      const nombre = Dom.crear('td', 'optimizacion', c.nombre);
      nombre.title = QUE_HACE[c.optimizacion];
      fila.append(
        Dom.crear('td', 'num', String(k + 1)),
        nombre,
        Dom.crear('td', null, c.antes),
        c.despues ? Dom.crear('td', null, c.despues) : Dom.crear('td', 'quitada', '(se quita)'),
        Dom.crear('td', 'num', String(c.linea))
      );
      cuerpo.appendChild(fila);
    });
    return tabla;
  }

  /** Cómo leer cada vista. */
  _nota () {
    const nota = Dom.crear('p', 'nota-gramatica');
    if (this.vista === 'optimizado') {
      nota.textContent = 'Hace lo mismo que el código de la pestaña 4, con menos trabajo: se calculó ' +
        'desde ahora lo que ya se sabía y se quitó lo que sobraba. En verde, las instrucciones que ' +
        'cambiaron y lo que se les hizo. Pasa el mouse sobre una optimización para ver qué hace.';
    } else if (this.vista === 'cambios') {
      nota.textContent = 'Cada fila es un cambio, en el orden en que se hizo. Una optimización le abre ' +
        'paso a otra: propagar  b = 2  permite calcular  2 * 3, y entonces b ya nadie la usa y se quita.';
    } else {
      nota.textContent = 'Los cuádruplos del código optimizado: (operador, argumento 1, argumento 2, ' +
        'resultado). Compáralos con los de la pestaña 4.';
    }
    return nota;
  }
}

window.PanelOptimizacion = PanelOptimizacion;
