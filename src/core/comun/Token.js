/**
 * Token.js
 * Unidad lexica producida por el analizador lexico y consumida por el sintactico.
 *
 * No sale del compilador: la interfaz recibe la salida ya formateada por
 * FormatoLexico.js, no los tokens en crudo.
 */

class Token {
  /**
   * @param {object} d
   * @param {number} d.numero      Consecutivo del token (base 1).
   * @param {string} d.tipo        Categoria lexica (ver TiposToken).
   * @param {string} d.lexema      Texto exacto tomado del codigo fuente.
   * @param {*}      d.valor       Valor ya interpretado (numero, texto sin comillas...).
   * @param {number} d.linea       Linea donde inicia (base 1).
   * @param {number} d.columna     Columna donde inicia (base 1).
   * @param {string} d.estadoFinal Estado del AFD en el que se acepto.
   * @param {string} d.descripcion Texto explicativo (se ve al pasar el mouse).
   * @param {boolean} d.ignorado   true en comentarios: no llegan al parser.
   */
  constructor (d) {
    this.numero = d.numero;
    this.tipo = d.tipo;
    this.lexema = d.lexema;
    this.valor = d.valor !== undefined ? d.valor : d.lexema;
    this.linea = d.linea;
    this.columna = d.columna;
    this.estadoFinal = d.estadoFinal || null;
    this.descripcion = d.descripcion || '';
    this.ignorado = !!d.ignorado;
  }

}

module.exports = { Token };
