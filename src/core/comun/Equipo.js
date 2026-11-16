/**
 * Equipo.js
 * Datos del equipo y de la materia.
 *
 * Es la UNICA fuente de estos datos: los usan la ventana "Equipo" de la
 * aplicacion y el encabezado de los reportes que se guardan. Si cambia algo
 * (un integrante, el grupo, la materia), se cambia aqui y queda corregido en
 * los dos lados.
 */

/** Datos academicos que van en el encabezado del reporte. */
const MATERIA = {
  nombre: 'Programación de Sistemas de Base II',
  grado: '9',
  grupo: 'F',
  carrera: 'Ingeniería en Sistemas Computacionales',
  institucion: 'Universidad Autónoma de Tamaulipas',
  unidad: 'Unidad Académica Multidisciplinaria Mante'
};

const NOMBRE_EQUIPO = 'SwordByte';

/**
 * Si se quiere un solo autor en el encabezado, se escribe aqui su nombre.
 * Con la cadena vacia se listan los seis integrantes.
 */
const AUTOR = '';

/** Integrantes. Apellidos y nombres van aparte para poder ordenar y alinear. */
const INTEGRANTES = [
  { apellidos: 'Avalos Castillo', nombres: 'Armando de Jesús' },
  { apellidos: 'Borjas Arias', nombres: 'Ronaldo Antonio' },
  { apellidos: 'Pesina Santander', nombres: 'Edgar Gael' },
  { apellidos: 'Ramos Antonio', nombres: 'Saqueo' },
  { apellidos: 'Vazquez Romo', nombres: 'Marco Antonio' },
  { apellidos: 'Verlage Aceves', nombres: 'Axel Aram' }
];

/** Quita acentos para que la comparacion alfabetica no dependa de ellos. */
function sinAcentos (texto) {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** Integrantes ordenados alfabeticamente por apellidos. */
function integrantesOrdenados () {
  return INTEGRANTES.slice().sort((a, b) =>
    sinAcentos(a.apellidos).localeCompare(sinAcentos(b.apellidos), 'es')
  );
}

/** Lista de nombres completos, ya ordenada: "Apellidos Nombres". */
function nombresCompletos () {
  return integrantesOrdenados().map((p) => `${p.apellidos} ${p.nombres}`);
}

/** Copia plana para enviarla a la interfaz por IPC. */
function datosEquipo () {
  return {
    nombre: NOMBRE_EQUIPO,
    autor: AUTOR,
    materia: MATERIA,
    integrantes: integrantesOrdenados()
  };
}

module.exports = {
  NOMBRE_EQUIPO,
  AUTOR,
  MATERIA,
  INTEGRANTES,
  integrantesOrdenados,
  nombresCompletos,
  datosEquipo
};
