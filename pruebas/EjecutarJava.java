import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.PrintStream;
import java.lang.reflect.InvocationTargetException;

/**
 * EjecutarJava.java
 * Lo usa pruebas/ejecutar.js para probar el codigo objeto (fase 6): ejecuta
 * varios programas Java ya compilados en una sola maquina virtual, que es
 * mucho mas rapido que abrir un  java  por programa.
 *
 *   java -cp carpeta EjecutarJava clase1 clase2 ...
 *
 * Cada clase lee lo que haya en  clase.in  (lo que se escribiria con el
 * teclado) y lo que imprime se guarda en  clase.out. Si el programa termina
 * con una excepcion, al final de  clase.out  se escribe  EXCEPCION ...
 */
public class EjecutarJava {
    public static void main(String[] clases) throws Exception {
        PrintStream pantalla = System.out;
        InputStream teclado = System.in;
        for (String clase : clases) {
            ByteArrayOutputStream impreso = new ByteArrayOutputStream();
            PrintStream salida = new PrintStream(impreso, true, "UTF-8");
            File entrada = new File(clase + ".in");
            // Antes de cargar la clase: su Scanner se crea al cargarla
            System.setIn(entrada.exists() ? new FileInputStream(entrada) : new ByteArrayInputStream(new byte[0]));
            System.setOut(salida);
            String error = "";
            try {
                Class.forName(clase).getMethod("main", String[].class).invoke(null, (Object) new String[0]);
            } catch (InvocationTargetException e) {
                error = "EXCEPCION " + e.getCause();
            }
            salida.flush();
            System.setOut(pantalla);
            System.setIn(teclado);
            try (FileOutputStream archivo = new FileOutputStream(clase + ".out")) {
                archivo.write(impreso.toByteArray());
                archivo.write(error.getBytes("UTF-8"));
            }
        }
    }
}
