/**
 * vista-intermedio.js
 * Cómo se dibuja el código de tres direcciones. Lo usan dos pestañas:
 *   4. Código Intermedio  (el código que generó la fase 4)
 *   5. Optimización       (el mismo código ya optimizado por la fase 5)
 *
 * Así las dos lo muestran igual:
 *
 *   tresDirecciones()   número · instrucción, con el renglón del programa
 *                       como comentario en verde:
 *                          // entero a = b + c * d;
 *                        1     t1 = c * d
 *   cuadruplos()        la tabla  # · Operador · Arg 1 · Arg 2 · Resultado
 *   erroresPrevios()    el recuadro rojo cuando el programa tiene errores
 */

/* global window, document, Dom */

/** Las palabras del código de tres direcciones (se pintan como control de flujo). */
const PALABRAS_INTERMEDIO = ['goto', 'if', 'ifFalse', 'param', 'call', 'return', 'funcion',
  'fin', 'leer', 'reservar', 'intentar', 'finIntentar', 'capturar'];

/** Un renglón del código de tres direcciones partido en piezas: "Hola mundo" es una sola. */
const PIEZAS = /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\S+/g;

const VistaIntermedio = {
  /**
   * El código de tres direcciones: una fila por instrucción, con su número,
   * y antes de cada grupo, en verde, el renglón del programa de donde sale.
   *
   * @param {Array}    instrucciones
   * @param {object}   prefijos  { temporal: 't', etiqueta: 'L' }
   * @param {Function} [decorar] (fila, ins) para agregarle algo a cada fila
   *                             (la pestaña 5 marca las que cambiaron).
   */
  tresDirecciones (instrucciones, prefijos, decorar) {
    const tabla = Dom.crear('table', 'codigo-intermedio');
    const cuerpo = tabla.appendChild(Dom.crear('tbody'));

    instrucciones.forEach((ins) => {
      (ins.comentarios || []).forEach((texto) => {
        const fila = Dom.crear('tr', 'comentario');
        fila.append(Dom.crear('td', 'num'), Dom.crear('td', null, `// ${texto}`));
        cuerpo.appendChild(fila);
      });

      const fila = Dom.crear('tr', ins.op === 'etiqueta' ? 'etiqueta' : null);
      fila.title = `Sale de la línea ${ins.linea} del programa`;
      fila.append(Dom.crear('td', 'num', String(ins.numero)), VistaIntermedio.instruccion(ins.texto, prefijos));
      if (decorar) decorar(fila, ins);
      cuerpo.appendChild(fila);
    });
    return tabla;
  },

  /**
   * Una instrucción con sus piezas pintadas: palabras (goto, call...),
   * temporales, etiquetas, textos y números.
   */
  instruccion (texto, prefijos) {
    const celda = Dom.crear('td', 'instruccion');
    const temporal = new RegExp(`^${prefijos.temporal}\\d+,?$`);
    const etiqueta = new RegExp(`^${prefijos.etiqueta}\\d+:?$`);

    (texto.match(PIEZAS) || []).forEach((pieza, i) => {
      if (i > 0) celda.appendChild(document.createTextNode(' '));
      let clase = null;
      if (PALABRAS_INTERMEDIO.indexOf(pieza) !== -1) clase = 'ci-palabra';
      else if (temporal.test(pieza)) clase = 'ci-temporal';
      else if (etiqueta.test(pieza)) clase = 'ci-etiqueta';
      else if (/^["']/.test(pieza)) clase = 'j-cadena';
      else if (/^-?\d/.test(pieza)) clase = 'j-numero';
      celda.appendChild(clase ? Dom.crear('span', clase, pieza) : document.createTextNode(pieza));
    });
    return celda;
  },

  /** La tabla de cuádruplos: # · Operador · Arg 1 · Arg 2 · Resultado */
  cuadruplos (instrucciones) {
    const tabla = Dom.crear('table', 'tabla-cuadruplos');
    const encabezado = tabla.appendChild(Dom.crear('thead')).appendChild(Dom.crear('tr'));
    ['#', 'Operador', 'Arg 1', 'Arg 2', 'Resultado'].forEach((t) =>
      encabezado.appendChild(Dom.crear('th', null, t)));

    const cuerpo = tabla.appendChild(Dom.crear('tbody'));
    instrucciones.forEach((ins) => {
      const fila = Dom.crear('tr');
      fila.title = `${ins.texto}   (línea ${ins.linea} del programa)`;
      fila.append(
        Dom.crear('td', 'num', String(ins.numero)),
        Dom.crear('td', 'op', ins.op),
        Dom.crear('td', null, ins.arg1),
        Dom.crear('td', null, ins.arg2),
        Dom.crear('td', null, ins.resultado)
      );
      cuerpo.appendChild(fila);
    });
    return tabla;
  },

  /** Sin un programa correcto no hay código intermedio: los errores, en rojo. */
  erroresPrevios (titulo, errores) {
    const caja = Dom.crear('div', 'veredicto mal');
    caja.append(
      Dom.crear('b', null, `✕ ${titulo}`),
      Dom.crear('p', null, 'Primero hay que corregir los errores del programa (léxicos, sintácticos o semánticos):')
    );
    errores.forEach((e) => caja.appendChild(Dom.filaError(e)));
    return caja;
  },

  /**
   * Los botones de las vistas (Tres direcciones | Cuádruplos...): el de la
   * vista que se ve, azul.
   * @param {object} botones { vista: boton }
   */
  marcarVista (botones, vista) {
    Object.keys(botones).forEach((v) => {
      botones[v].classList.toggle('activa', v === vista);
      botones[v].setAttribute('aria-selected', v === vista ? 'true' : 'false');
    });
  }
};

window.VistaIntermedio = VistaIntermedio;
