/**
 * generar-gramatica.js
 * Regenera docs/04-gramatica-ebnf.md a partir de Gramatica.js.
 *
 *   npm run gramatica
 *
 * Asi la gramatica documentada y la que implementa el parser no se separan:
 * el archivo del compilador es la unica fuente.
 */

const fs = require('fs');
const path = require('path');
const { GRAMATICA } = require('../src/core/02.sintactico/Gramatica');

const DOC = path.join(__dirname, '..', 'docs', '04-gramatica-ebnf.md');
const INICIO = '## Producciones\n\n';
const FIN = '## Propiedades de la gramática';

let producciones = '';
for (const grupo of GRAMATICA) {
  producciones += `### ${grupo.grupo}\n\n\`\`\`ebnf\n`;
  for (const regla of grupo.reglas) producciones += regla.ebnf + '\n';
  producciones += '```\n\n';
}

// Se normalizan los saltos de linea para que el archivo se pueda editar
// desde cualquier editor sin romper la busqueda de las marcas.
const doc = fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
const desde = doc.indexOf(INICIO) + INICIO.length;
const hasta = doc.indexOf(FIN);

if (desde < INICIO.length || hasta === -1) {
  console.error('No se encontraron las marcas de la seccion de producciones.');
  process.exit(1);
}

fs.writeFileSync(DOC, doc.slice(0, desde) + producciones + doc.slice(hasta), 'utf8');
console.log(`Gramatica regenerada en docs/04-gramatica-ebnf.md ` +
            `(${GRAMATICA.reduce((n, g) => n + g.reglas.length, 0)} reglas)`);
