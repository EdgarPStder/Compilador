<table style="width:100%;">
<colgroup>
<col style="width: 2%" />
<col style="width: 9%" />
<col style="width: 15%" />
<col style="width: 22%" />
<col style="width: 22%" />
<col style="width: 17%" />
<col style="width: 9%" />
</colgroup>
<tbody>
<tr>
<td><strong>No</strong></td>
<td><strong>Nombre</strong></td>
<td><strong>¿Qué hace?</strong></td>
<td><strong>Formato, Sintaxis Original</strong></td>
<td><strong>Formato, Sintaxis Propio</strong></td>
<td><strong>Programa de Ejemplo</strong></td>
<td><strong>Resultado del Prog. De Ejemplo</strong></td>
</tr>
<tr>
<td>0</td>
<td>equipo</td>
<td>Muestran en pantalla el nombre del equipo y los integrantes, ordenados en formo alfabética por apellidos.</td>
<td><p>No existe.</p>
<p>System.out.println(“Byte Sword”);</p>
<p>System.out.println(“Avalos Castillo Armando de Jesús.”);</p>
<p>System.out.println(“Borjas Arias Ronaldo Antonio.”);</p>
<p>System.out.println(“Pesina Santander Edgar Gael.”);</p>
<p>System.out.println(“Ramos Antonio Saqueo.”);</p>
<p>System.out.println(“Vazquez Romo Marco Antonio.”);</p>
<p>System.out.println(“Verlage Aceves Aram Axel.”);</p>
<p><strong>System</strong>: clase del sistema.<br />
<strong>.</strong>: acceso a miembros.<br />
<strong>out</strong>: salida estándar.<br />
<strong>println</strong>: imprime y salta línea.<br />
<strong>(</strong>: inicio de parámetros.<br />
<strong>“</strong>: inicio de cadena de texto.<br />
<strong>Texto</strong>: contenido del mensaje.<br />
<strong>“</strong>: fin de cadena de texto.<br />
<strong>)</strong>: fin de parámetros.<br />
<strong>;</strong>: termina instrucción.</p></td>
<td><p>equipo(Null);</p>
<p><strong>equipo</strong>: Palabra reservada.</p>
<p><strong>(</strong>: inicio de parametros.</p>
<p><strong>Null</strong>: No debes teclear caracteres aquí.</p>
<p><strong>)</strong>: fin de los parámetros</p>
<p><strong>;</strong>: Termina instrucción.</p></td>
<td><p>clase ejemplo{</p>
<p>clasePrincipal{</p>
<p>equipo(Null);</p>
<p>}</p>
<p>}</p></td>
<td><p>Byte Sword</p>
<p>Avalos Castillo Armando de Jesús.</p>
<p>Borjas Arias Ronaldo Antonio.</p>
<p>Pesina Santander Edgar Gael.</p>
<p>Vazquez Romo Marco Antonio.</p>
<p>Verlage Aceves Aram Axel.</p></td>
</tr>
<tr>
<td>1</td>
<td>Declaración de variables por tipo</td>
<td><p>Reserva un espacio con nombre en la memoria del programa y le asigna un tipo de dato. El tipo determina qué clase de valores puede guardar la variable, cuántos bytes ocupa y qué operaciones se pueden hacer con ella.</p>
<p>Una variable puede declararse sin valor inicial o con un valor inicial usando el operador de asignación =. Una vez declarada, su valor puede cambiar en cualquier momento usando el mismo operador =.</p>
<p>Se pueden declarar varias variables del mismo tipo en una sola línea separándolas con coma.</p></td>
<td><p>tipo identificador = valor;</p>
<p>tipo identificador;</p>
<p>Tipo id1, id2, id3;</p>
<p><strong>tipo</strong>: define que tipo de dato es.<br />
<strong>identificador</strong>: nombre de la variable.<br />
<strong>=</strong>: operador de asignación.<br />
<strong>valor</strong>: dato almacenado.<br />
<strong>;</strong>: fin de instrucción.</p>
<p><strong>idn:</strong> nombre de la variable te permite definir varias variables de un solo tipo separadas por coma.</p>
<p><strong>Constates.</strong></p>
<p>final tipo VAR = valor;</p>
<p><strong>final:</strong> palabra reservada para las constantes.</p>
<p><strong>tipo:</strong> define que tipo de dato es.</p>
<p><strong>VAR:</strong> nombre de la variable en mayúsculas.</p>
<p><strong>=:</strong> operador de asignación.</p>
<p><strong>valor:</strong> dato almacenado.</p>
<p><strong>; :</strong> fin de instrucción.</p>
<p><strong>Estructuras.</strong></p>
<p><strong>Sin definir.</strong></p>
<p>tipo identificador[] = {val1, val2, ...};</p>
<p>tipo identificador[][] = {{val1, val2}, {val3, val4}, ...};</p>
<p><strong>Definidos</strong></p>
<p>Tipo id[] = new tipo[num];</p>
<p>Tipo id[][] = new tipo[num][num];</p>
<p><strong>tipo:</strong> define que tipo de dato es.</p>
<p><strong>id:</strong> nombre de la variable.</p>
<p><strong>[ ] :</strong> indica que es un arreglo.</p>
<p><strong>[ ][ ] :</strong> indica que es una matriz.</p>
<p><strong>= :</strong> operador de asignación.</p>
<p><strong>valn :</strong> dato almacenado.</p>
<p><strong>{ } :</strong> delimitan el contenido del arreglo o matriz.</p>
<p><strong>; :</strong> fin de instrucción.</p>
<p><strong>num :</strong> número entero con el que defines el tamaño del arreglo o matriz.</p>
<p><strong>new :</strong> palabra clave para crear un objeto.</p>
<p><strong>Tipos:</strong></p>
<p><strong>Boolean:</strong> para valores true o false.<strong><br />
byte:</strong> Números enteros de 8 bits.<strong><br />
char:</strong> Un solo carácter Unicode de 16 bits.<strong><br />
short:</strong> Números enteros de 16 bits.<strong><br />
int:</strong> Números enteros de 32 bits.<strong><br />
long:</strong> Números enteros de 64 bits.<strong><br />
float:</strong> Números de punto flotante de 32 bits (decimales simples).<strong><br />
double:</strong> Números de punto flotante de 64 bits (decimales de doble precisión).<strong><br />
String:</strong> No es un primitivo, sino una clase/objeto. Almacena una secuencia de caracteres (texto).</p>
<p><strong>Identificadores</strong></p>
<p><strong>f</strong>: indica que es float</p>
<p><strong>d</strong>: indica que es double</p>
<p>L: indica literal long</p></td>
<td><p>tipo identificador = valor;</p>
<p>tipo identificador;</p>
<p><mark>Tipo id1, id2, id3;</mark></p>
<p><strong>tipo</strong>: define que tipo de datos es.<br />
<strong>identificador</strong>: nombre de la variable.<br />
<strong>=</strong>: operador de asignación.<br />
<strong>valor</strong>: dato almacenado.<br />
<strong>;</strong>: fin de instrucción.</p>
<p><strong>idn:</strong> nombre de la variable te permite definir varias variables de un solo tipo separadas por coma.</p>
<p><strong>Constates.</strong></p>
<p><mark>Constante tipo VAR = valor;</mark></p>
<p><strong>Constante:</strong> palabra reservada para las constantes.</p>
<p><strong>tipo</strong>: define que tipo de dato es.<br />
<strong>VAR</strong>: nombre de la variable en mayusculas.<br />
<strong>=</strong>: operador de asignación.<br />
<strong>valor</strong>: dato almacenado.<br />
<strong>;</strong>: fin de instrucción.</p>
<p><strong><mark>Estructuras.</mark></strong></p>
<p><strong><mark>Sin definir.</mark></strong></p>
<p><mark>Arreglo tipo identificador[] = {val1,val2,va3};</mark></p>
<p><mark>matriz tipo identificador[][] = {{val1,val2},{val3,val4}};</mark></p>
<p><strong><mark>Definidos</mark></strong></p>
<p><mark>Arreglo Tipo id[num];</mark></p>
<p><mark>matriz Tipo id[num][num];</mark></p>
<p><mark>Arreglo Tipo id[num][num];</mark></p>
<p><strong>Arreglo:</strong> palabra reservada para arreglo.</p>
<p><strong>Matriz:</strong> palabra reservada para matriz.</p>
<p><strong>tipo</strong>: define que tipo de dato es.<br />
<strong>identificador</strong>: nombre de la variable.</p>
<p><strong>[ ]:</strong> indica que es un arreglo.</p>
<p><strong>[ ][ ]:</strong> indica que es una matriz.<br />
<strong>=</strong>: operador de asignación.<br />
<strong>valn</strong>: dato almacenado.</p>
<p><strong>{ }:</strong> delimitan el contenido del arreglo o matriz.<br />
<strong>;</strong>: fin de instrucción.</p>
<p><strong>num:</strong> número entero con el que defines el tamaño del arreglo o matriz.</p>
<p><strong>Tipos:</strong></p>
<p><strong>logico:</strong> para valores verdadero o falso.<strong><br />
byte:</strong> Números enteros de 8 bits.<strong><br />
caracter:</strong> Un solo carácter Unicode de 16 bits.<strong><br />
corto:</strong> Números enteros de 16 bits.<strong><br />
entero:</strong> Números enteros de 32 bits.<strong><br />
largo:</strong> Números enteros de 64 bits.<strong><br />
flotante:</strong> Números de punto flotante de 32 bits<strong><br />
decimal:</strong> Números de punto flotante de 64 bits (decimales de doble precisión).<strong><br />
cadena:</strong> No es un primitivo, sino una clase/objeto. Almacena una secuencia de caracteres (texto).</p>
<p><strong>Identificadores</strong></p>
<p><strong>f</strong>: indica que es flotante</p>
<p><strong>d</strong>: indica que es decimal</p>
<p>L: indica literal largo</p></td>
<td><p>clase ejemplo{</p>
<p>clasePrincipal{</p>
<p>logico activo = verdadero;</p>
<p>byte nivel = 10;</p>
<p>caracter letra = 'A';</p>
<p>corto cantidad = 30000;</p>
<p>entero edad = 20;</p>
<p>largo poblacion =8000000L;</p>
<p>flotante promedio = 8.5f;</p>
<p>decimal pi = 3.1416d;</p>
<p>cadena nombre = "Hola";</p>
<p>entero a;</p>
<p>entero x,y,z;</p>
<p>imprimirLn(activo);</p>
<p>imprimirLn(nivel);</p>
<p>imprimirLn(letra);</p>
<p>imprimirLn(cantidad);</p>
<p>imprimirLn(edad); imprimirLn(poblacion); imprimirLn(promedio);</p>
<p>imprimirLn(pi); imprimirLn(nombre);</p>
<p>}</p>
<p>}</p></td>
<td><p>true</p>
<p>10</p>
<p>A</p>
<p>30000</p>
<p>20</p>
<p>8000000</p>
<p>8.5</p>
<p>3.1416</p>
<p>Hola</p></td>
</tr>
<tr>
<td>2</td>
<td><p><mark>Imprimir</mark></p>
<p><mark>imprimirLn</mark></p>
<p><mark>imprimirF</mark></p></td>
<td><p>Envía información desde el programa hacia la pantalla (salida estándar). Es la instrucción principal para mostrar resultados al usuario. Tiene tres variantes según el formato que se necesite:</p>
<p><strong>imprimir</strong>: muestra el texto o variable tal cual, sin agregar ningún salto de línea al final. Si se llama varias veces seguidas, el texto aparece en la misma línea.</p>
<p><strong>imprimirLn</strong>: muestra el texto o variable y agrega automáticamente un salto de línea al final, moviendo el cursor a la siguiente línea.</p>
<p><strong>imprimirF</strong>: muestra una cadena de texto con marcadores de posición (especificadores de formato) que son reemplazados por el valor de las variables indicadas. Permite controlar exactamente cómo se verá el número o texto en pantalla.</p></td>
<td><p>System.out.print("texto");<br />
System.out.println("texto");<br />
System.out.printf("texto %formato”, variable);<br />
<br />
<strong>System</strong>: clase del sistema.<br />
<strong>.</strong>: acceso a miembros.<br />
<strong>out</strong>: salida estándar.<br />
<strong>print</strong>: imprime sin salto de línea.<br />
<strong>println</strong>: imprime y salta línea.<br />
<strong>printf</strong>: imprime texto con formato.<br />
<strong>(</strong>: inicio de parámetros.<br />
<strong>“</strong>: inicio de cadena de texto.<br />
<strong>texto</strong>: cadena de caracteres.<br />
<strong>%</strong>: indica formato especial.<br />
<strong>Formato</strong>: indica el tipo de formato.<br />
<strong>”</strong>: fin de cadena de texto.<br />
<strong>,</strong>: separa el texto de las variables.<br />
<strong>variable</strong>: variable a imprimir.<br />
<strong>)</strong>: fin de parámetros.<br />
<strong>;</strong>: fin de instrucción.</p>
<p><strong>Formatos de printf:</strong><br />
<strong>%d</strong>: entero decimal.<br />
<strong>%f</strong>: número decimal.<br />
<strong>%.2f</strong>: decimal con 2 cifras.<br />
<strong>%s</strong>: cadena de texto.<br />
<strong>%c</strong>: carácter.<br />
<strong>%b</strong>: valor booleano.<br />
<strong>%x</strong>: entero hexadecimal.<br />
<strong>%o</strong>: entero octal.<br />
<strong>%e</strong>: notación científica.<br />
<strong>%n</strong>: salto de línea.<br />
<strong>%%</strong>: imprime el símbolo %.</p></td>
<td><p>imprimir("texto");</p>
<p>imprimir(variable);<br />
imprimirLn("texto");<br />
imprimirF("texto %formato”, variable);<br />
<br />
<strong>imprimir</strong>: muestra texto sin formato.<br />
<strong>imprimirLn</strong>: muestra texto con salto de línea.<br />
<strong>imprimirF</strong>: muestra texto con formato.<br />
<strong>(</strong>: inicio de parámetros.<br />
<strong>“</strong>: inicio de cadena de texto.<br />
<strong>texto</strong>: cadena de caracteres, puede incluir letras, dígitos, símbolos.<br />
<strong>%</strong>: indica formato.</p>
<p><strong>Formato:</strong> indica el tipo de formato.<br />
<strong>”</strong>: fin de cadena de texto.<br />
<strong>,</strong>: separador de parámetros.<br />
<strong>variable</strong>: variable a imprimir.<br />
<strong>)</strong>: fin de parámetros.<br />
<strong>;</strong>: fin de instrucción.</p>
<p><strong>Formatos de imprimirF:</strong><br />
<strong>%d</strong>: entero decimal.<br />
<strong>%f</strong>: número decimal.<br />
<strong>%.2f</strong>: decimal con 2 cifras.<br />
<strong>%s</strong>: cadena de texto.<br />
<strong>%c</strong>: carácter.<br />
<strong>%b</strong>: valor booleano.<br />
<strong>%x</strong>: entero hexadecimal.<br />
<strong>%o</strong>: entero octal.<br />
<strong>%e</strong>: notación científica.<br />
<strong>%n</strong>: salto de línea.<br />
<strong>%%</strong>: imprime el símbolo %.</p></td>
<td>clase ejemplo{<br />
clasePrincipal{<br />
asignar(edad,20);<br />
imprimir("Hola");<br />
imprimirF("Edad: %d",edad);<br />
}<br />
}</td>
<td>Hola<br />
Edad: 20</td>
</tr>
<tr>
<td>3</td>
<td><table style="width:1%;">
<colgroup>
<col style="width: 0%" />
</colgroup>
<tbody>
<tr>
<td></td>
</tr>
</tbody>
</table>
<p>Si/ sinoSi/ sino</p></td>
<td>Evalúa una condición lógica. Si la condición es verdadera se ejecuta un bloque; si es falsa, se ejecuta el bloque alternativo sino. Controla decisiones del programa.</td>
<td><p>If(condición) instrucción;</p>
<p>if(condición){<br />
instrucciones;<br />
}else{<br />
instrucciones;<br />
}</p>
<p>if(condición){<br />
instrucciones;</p>
<p>}else if(condición){</p>
<p>Instrucciones;<br />
}else{<br />
instrucciones;<br />
}</p>
<p><strong>if</strong>: palabra reservada de decisión.<br />
<strong>(</strong>: inicio de condición.<br />
<strong>condición:</strong> expresión lógica que revisa el programa.<br />
<strong>)</strong>: fin de condición.<br />
<strong>{</strong>: inicio de bloque verdadero.<br />
<strong>instrucciones</strong>: instrucciones a ejecutar.<br />
<strong>}</strong>: fin de bloque verdadero.<br />
<strong>else</strong>: alternativa cuando la condición es falsa.<br />
<strong>{</strong>: inicio de bloque falso.<br />
<strong>instrucciones</strong>: instrucciones a ejecutar.<br />
<strong>}</strong>: fin de bloque falso.</p>
<p><strong>Estructura de la condición:</strong></p>
<p>[Operando 1] [Operador] [Operando 2]</p>
<p><strong>Operando:</strong> Los operandos pueden ser variables o números o expresiones.</p>
<p><strong>Operador:</strong> Los operadores pueden ser de comparación o lógicos. Los de comparación se utilizan para comparar ya sea números, variables o expresiones, mientras que los lógicos resultados de comparaciones previas. Su función es evaluar si se cumplen varias condiciones al mismo tiempo o si se cumple al menos una.</p>
<p><strong>Operadores de comparación:</strong></p>
<p>==: igual a. Compara si dos valores son iguales.</p>
<p>!=: diferente de. Verdadero si los valores son distintos.</p>
<p>&lt;: menor que.</p>
<p>&gt;: mayor que.</p>
<p>&lt;=: menor o igual que.</p>
<p>&gt;=: mayor o igual que.</p>
<p><strong>Operadores lógicos (para combinar condiciones):</strong></p>
<p>&amp;&amp;: AND lógico. Verdadero solo si AMBAS condiciones son verdaderas.</p>
<p>||: OR lógico. Verdadero si AL MENOS UNA condición es verdadera.</p>
<p>!: NOT lógico. Invierte el valor: si era verdadero lo vuelve falso y viceversa.</p></td>
<td><p>si(condición){</p>
<p>instrucción;</p>
<p>}</p>
<p>si(condición){<br />
instrucciones;<br />
}sino{<br />
instrucciones;<br />
}</p>
<p>si(condición){<br />
instrucciones;</p>
<p>}sinoSi(condición){</p>
<p>Instrucciones;<br />
}sino{<br />
instrucciones;<br />
}<br />
<br />
<strong>si</strong>: palabra reservada de decisión.<br />
<strong>(</strong>: inicio de condición.<br />
<strong>condición:</strong> expresión lógica que revisa el programa.<br />
<strong>)</strong>: fin de condición.<br />
<strong>{</strong>: inicio de bloque verdadero.<br />
<strong>instrucciones</strong>: instrucciones a ejecutar.<br />
<strong>}</strong>: fin de bloque verdadero.<br />
<strong>sino</strong>: alternativa cuando la condición es falsa.<br />
<strong>{</strong>: inicio de bloque falso.<br />
<strong>instrucciones</strong>: instrucciones a ejecutar.<br />
<strong>}</strong>: fin de bloque falso.</p>
<p><strong>Estructura de la condición:</strong></p>
<p>[Operando 1] [Operador] [Operando 2]</p>
<p><strong>Operando:</strong> Los operandos pueden ser variables o números o expresiones.</p>
<p><strong>Operador:</strong> Los operadores pueden ser de comparación o lógicos. Los de comparación se utilizan para comparar ya sea números, variables o expresiones, mientras que los lógicos resultados de comparaciones previas. Su función es evaluar si se cumplen varias condiciones al mismo tiempo o si se cumple al menos una.</p>
<p><strong>Operadores de comparación:</strong></p>
<p>==: igual a. Compara si dos valores son iguales.</p>
<p>!=: diferente de. Verdadero si los valores son distintos.</p>
<p>&lt;: menor que.</p>
<p>&gt;: mayor que.</p>
<p>&lt;=: menor o igual que.</p>
<p>&gt;=: mayor o igual que.</p>
<p><strong>Operadores lógicos (para combinar condiciones):</strong></p>
<p>Y: AND lógico. Verdadero solo si AMBAS condiciones son verdaderas.</p>
<p>O: OR lógico. Verdadero si AL MENOS UNA condición es verdadera.</p>
<p>NO: NOT lógico. Invierte el valor: si era verdadero lo vuelve falso y viceversa.</p></td>
<td><p>clase ejemplo{<br />
clasePrincipal{</p>
<p>entero edad = 20;</p>
<p>si(edad&gt;=18){<br />
imprimir("Mayor");<br />
}sino{<br />
imprimir("Menor");<br />
}<br />
}<br />
}</p></td>
<td>Mayor</td>
</tr>
<tr>
<td>4</td>
<td>para</td>
<td>Ejecuta un bloque de instrucciones un número definido de veces. Utiliza una variable de control (contador) que se configura en tres partes separadas por punto y coma dentro de los paréntesis.</td>
<td><p>for(inicialización; condición; actualización) {<br />
instrucciones;<br />
}<br />
<br />
<strong>for</strong>: palabra reservada de ciclo.<br />
<strong>(</strong>: inicio de parámetros del ciclo.</p>
<p><strong>Inicialización</strong>: se declara y asigna el valor de inicio al contador. Se ejecuta una sola vez, antes de la primera vuelta.</p>
<p><strong>;:</strong> separador entre las tres secciones.</p>
<p><strong>Condición</strong>: expresión lógica que se evalúa antes de cada vuelta. Si es verdadera, se ejecuta el bloque. Si es falsa, el ciclo termina.</p>
<p><strong>;:</strong> separador entre las tres secciones.</p>
<p><strong>Actualización</strong>: modifica el contador al final de cada vuelta. Los operadores más usados son ++ (incremento de 1) y -- (decremento de 1).</p>
<p><strong>)</strong>: fin de parámetros.<br />
<strong>{</strong> : inicio bloque repetitivo</p>
<p><strong>instrucciones</strong>: instrucciones a ejecutar.</p>
<p><strong>}</strong>: fin bloque repetitivo.</p>
<p><strong>Estructura de la condición:</strong></p>
<p>[Operando 1] [Operador] [Operando 2]</p>
<p><strong>Operando:</strong> Los operandos pueden ser variables o números o expresiones.</p>
<p><strong>Operador:</strong> Los operadores pueden ser de comparación o lógicos. Los de comparación se utilizan para comparar ya sea números, variables o expresiones, mientras que los lógicos resultados de comparaciones previas. Su función es evaluar si se cumplen varias condiciones al mismo tiempo o si se cumple al menos una.</p>
<p><strong>Operadores de comparación:</strong></p>
<p>==: igual a. Compara si dos valores son iguales.</p>
<p>!=: diferente de. Verdadero si los valores son distintos.</p>
<p>&lt;: menor que.</p>
<p>&gt;: mayor que.</p>
<p>&lt;=: menor o igual que.</p>
<p>&gt;=: mayor o igual que.</p>
<p><strong>Operadores lógicos (para combinar condiciones):</strong></p>
<p>&amp;&amp;: AND lógico. Verdadero solo si AMBAS condiciones son verdaderas.</p>
<p>||: OR lógico. Verdadero si AL MENOS UNA condición es verdadera.</p>
<p>!: NOT lógico. Invierte el valor: si era verdadero lo vuelve falso y viceversa.</p></td>
<td><p>para(inicialización; condición; actualización) {</p>
<p>instrucciones;</p>
<p>}</p>
<p><strong>para</strong>: palabra reservada de ciclo.<br />
<strong>(</strong>: inicio de parámetros del ciclo.<br />
<strong>Inicialización</strong>: se declara y asigna el valor de inicio al contador. Se ejecuta una sola vez, antes de la primera vuelta.</p>
<p><strong>;:</strong> separador entre las tres secciones.</p>
<p><strong>Condición</strong>: expresión lógica que se evalúa antes de cada vuelta. Si es verdadera, se ejecuta el bloque. Si es falsa, el ciclo termina. Puede ser variable, operador de comparación y valor.</p>
<p><strong>;:</strong> separador entre las tres secciones.</p>
<p><strong>Actualización</strong>: modifica el contador al final de cada vuelta. Los operadores más usados son ++ (incremento de 1) y -- (decremento de 1).</p>
<p><strong>)</strong>: fin de parámetros.<br />
<strong>{</strong>: inicio bloque repetitivo.<br />
<strong>instrucciones</strong>: instrucciones a ejecutar.<br />
<strong>}</strong>: fin bloque repetitivo.</p>
<p><strong>Estructura de la condición:</strong></p>
<p>[Operando 1] [Operador] [Operando 2]</p>
<p><strong>Operando:</strong> Los operandos pueden ser variables o números o expresiones.</p>
<p><strong>Operador:</strong> Los operadores pueden ser de comparación o lógicos. Los de comparación se utilizan para comparar ya sea números, variables o expresiones, mientras que los lógicos resultados de comparaciones previas. Su función es evaluar si se cumplen varias condiciones al mismo tiempo o si se cumple al menos una.</p>
<p><strong>Operadores de comparación:</strong></p>
<p>==: igual a. Compara si dos valores son iguales.</p>
<p>!=: diferente de. Verdadero si los valores son distintos.</p>
<p>&lt;: menor que.</p>
<p>&gt;: mayor que.</p>
<p>&lt;=: menor o igual que.</p>
<p>&gt;=: mayor o igual que.</p>
<p><strong>Operadores lógicos (para combinar condiciones):</strong></p>
<p>Y: AND lógico. Verdadero solo si AMBAS condiciones son verdaderas.</p>
<p>O: OR lógico. Verdadero si AL MENOS UNA condición es verdadera.</p>
<p>NO: NOT lógico. Invierte el valor: si era verdadero lo vuelve falso y viceversa.</p></td>
<td><p>clase ejemplo{</p>
<p>clasePrincipal{</p>
<p>para(entero i=1;i&lt;=3;i++){</p>
<p>imprimirLn(“i”);</p>
<p>}</p>
<p>}</p>
<p>}</p></td>
<td><p>1</p>
<p>2</p>
<p>3</p></td>
</tr>
<tr>
<td>5</td>
<td>mientras</td>
<td><p>Repite un bloque de instrucciones mientras una condición lógica sea verdadera. La condición se evalúa antes de entrar al bloque en cada vuelta.</p>
<p>Si la condición es falsa desde el inicio, el bloque nunca se ejecuta (cero iteraciones). Si la condición nunca se vuelve falsa, el ciclo se repite indefinidamente (ciclo infinito), lo cual es un error de lógica.</p>
<p>A diferencia de para, el ciclo mientras se usa cuando no se sabe de antemano cuántas veces se va a repetir, sino que depende de una condición que cambia dentro del bloque.</p></td>
<td><p>while(condición){<br />
instrucciones;<br />
}<br />
<br />
<strong>while</strong>: palabra reservada de ciclo.<br />
<strong>(</strong>: inicio de condición.<br />
<strong>condición:</strong> expresión lógica que revisa el programa antes de cada vuelta.<br />
<strong>):</strong> fin de condición.<br />
<strong>{</strong>: inicio de bloque <strong>instrucciones</strong>: instrucciones a ejecutar.<br />
<strong>}</strong>: fin del bloque repetitivo.</p>
<p><strong>Estructura de la condición:</strong></p>
<p>[Operando 1] [Operador] [Operando 2]</p>
<p><strong>Operando:</strong> Los operandos pueden ser variables, números o expresiones.</p>
<p><strong>Operador:</strong> Los operadores pueden ser de comparación o lógicos. Los de comparación se utilizan para comparar ya sea números, variables o expresiones, mientras que los lógicos resultados de comparaciones previas. Su función es evaluar si se cumplen varias condiciones al mismo tiempo o si se cumple al menos una.</p>
<p><strong>Operadores de comparación:</strong></p>
<p>==: igual a. Compara si dos valores son iguales.</p>
<p>!=: diferente de. Verdadero si los valores son distintos.</p>
<p>&lt;: menor que.</p>
<p>&gt;: mayor que.</p>
<p>&lt;=: menor o igual que.</p>
<p>&gt;=: mayor o igual que.</p>
<p><strong>Operadores lógicos (para combinar condiciones):</strong></p>
<p>&amp;&amp;: AND lógico. Verdadero solo si AMBAS condiciones son verdaderas.</p>
<p>||: OR lógico. Verdadero si AL MENOS UNA condición es verdadera.</p>
<p>!: NOT lógico. Invierte el valor: si era verdadero lo vuelve falso y viceversa.</p></td>
<td><p>mientras(condición){</p>
<p>instrucciones;<br />
}<br />
<br />
<strong>mientras</strong>: palabra reservada de ciclo.<br />
<strong>(</strong>: inicio de condición.<br />
<strong>condición:</strong> expresión lógica que revisa el programa antes de cada vuelta. Puede ser variable, operador de comparación y valor.<br />
<strong>)</strong>: fin de condición.<br />
<strong>{</strong>: inicio de bloque <strong>instrucciones</strong>: instrucciones a ejecutar.<br />
<strong>}</strong>: fin del bloque repetitivo.</p>
<p><strong>Estructura de la condición:</strong></p>
<p>[Operando 1] [Operador] [Operando 2]</p>
<p><strong>Operando:</strong> Los operandos pueden ser variables , números o expresiones.</p>
<p><strong>Operador:</strong> Los operadores pueden ser de comparación o lógicos. Los de comparación se utilizan para comparar ya sea números, variables o expresiones, mientras que los lógicos resultados de comparaciones previas. Su función es evaluar si se cumplen varias condiciones al mismo tiempo o si se cumple al menos una.</p>
<p><strong>Operadores de comparación:</strong></p>
<p>==: igual a. Compara si dos valores son iguales.</p>
<p>!=: diferente de. Verdadero si los valores son distintos.</p>
<p>&lt;: menor que.</p>
<p>&gt;: mayor que.</p>
<p>&lt;=: menor o igual que.</p>
<p>&gt;=: mayor o igual que.</p>
<p><strong>Operadores lógicos (para combinar condiciones):</strong></p>
<p>Y: AND lógico. Verdadero solo si AMBAS condiciones son verdaderas.</p>
<p>O: OR lógico. Verdadero si AL MENOS UNA condición es verdadera.</p>
<p>NO: NOT lógico. Invierte el valor: si era verdadero lo vuelve falso y viceversa.</p></td>
<td><p>clase ejemplo{</p>
<p>clasePrincipal{</p>
<p>entero i = 1;</p>
<p>mientras(i&lt;=3){<br />
imprimirLn(i);<br />
i++;<br />
}</p>
<p>}</p>
<p>}</p></td>
<td><p>1</p>
<p>2</p>
<p>3</p></td>
</tr>
<tr>
<td>6</td>
<td>Hacer/mientras</td>
<td><p>Ejecuta un bloque de instrucciones al menos una vez y después evalúa la condición. Si la condición es verdadera, el bloque se repite. Si es falsa, el ciclo termina.</p>
<p>La diferencia clave con mientras es el orden de evaluación:</p>
<p>mientras: evalúa la condición ANTES → puede ejecutarse 0 veces.</p>
<p>hacer/mientras: evalúa la condición DESPUÉS → se ejecuta mínimo 1 vez.</p>
<p>Esto lo hace ideal para menús o validaciones donde siempre se necesita ejecutar el bloque una primera vez antes de saber si repetirlo.</p></td>
<td><p>do{</p>
<p>instrucciones;</p>
<p>}while(condición);</p>
<p><strong>Do</strong>: palabra reservada.</p>
<p><strong>{</strong>: inicio de bloque repetitivo.</p>
<p><strong>Instrucciones:</strong> código que se ejecuta al menos una vez.</p>
<p><strong>}:</strong> fin de bloque repetitivo.</p>
<p><strong>While</strong>: palabra reservada del ciclo.</p>
<p><strong>(</strong>: inicio de condición.</p>
<p><strong>condición:</strong> expresión lógica que revisa el programa antes de cada vuelta.</p>
<p><strong>):</strong> fin de condición.</p>
<p><strong>;</strong>: fin de instrucción.</p>
<p><strong>Operador:</strong> Los operadores pueden ser de comparación o lógicos. Los de comparación se utilizan para comparar ya sea números, variables o expresiones, mientras que los lógicos resultados de comparaciones previas. Su función es evaluar si se cumplen varias condiciones al mismo tiempo o si se cumple al menos una.</p>
<p><strong>Operadores de comparación:</strong></p>
<p>==: igual a. Compara si dos valores son iguales.</p>
<p>!=: diferente de. Verdadero si los valores son distintos.</p>
<p>&lt;: menor que.</p>
<p>&gt;: mayor que.</p>
<p>&lt;=: menor o igual que.</p>
<p>&gt;=: mayor o igual que.</p>
<p><strong>Operadores lógicos (para combinar condiciones):</strong></p>
<p>&amp;&amp;: AND lógico. Verdadero solo si AMBAS condiciones son verdaderas.</p>
<p>||: OR lógico. Verdadero si AL MENOS UNA condición es verdadera.</p>
<p>!: NOT lógico. Invierte el valor: si era verdadero lo vuelve falso y viceversa.</p></td>
<td><p>hacer{</p>
<p>instrucciones;</p>
<p>}mientras(condición);</p>
<p><strong>hacer</strong>: palabra reservada.</p>
<p><strong>{</strong>: inicio de bloque repetitivo.</p>
<p><strong>Instrucciones:</strong> código que se ejecuta al menos una vez.</p>
<p><strong>}:</strong> fin de bloque repetitivo.</p>
<p><strong>mientras</strong>: palabra reservada del ciclo.</p>
<p><strong>(</strong>: inicio de condición.</p>
<p><strong>condición:</strong> expresión lógica que revisa el programa antes de cada vuelta. Puede ser variable, operador de comparación y valor.</p>
<p><strong>):</strong> fin de condición.</p>
<p><strong>;</strong>: fin de instrucción.</p>
<p><strong>Estructura de la condición:</strong></p>
<p>[Operando 1] [Operador] [Operando 2]</p>
<p><strong>Operando:</strong> Los operandos pueden ser variables , números o expresiones.</p>
<p><strong>Operador:</strong> Los operadores pueden ser de comparación o lógicos. Los de comparación se utilizan para comparar ya sea números, variables o expresiones, mientras que los lógicos resultados de comparaciones previas. Su función es evaluar si se cumplen varias condiciones al mismo tiempo o si se cumple al menos una.</p>
<p><strong>Operadores de comparación:</strong></p>
<p>==: igual a. Compara si dos valores son iguales.</p>
<p>!=: diferente de. Verdadero si los valores son distintos.</p>
<p>&lt;: menor que.</p>
<p>&gt;: mayor que.</p>
<p>&lt;=: menor o igual que.</p>
<p>&gt;=: mayor o igual que.</p>
<p><strong>Operadores lógicos (para combinar condiciones):</strong></p>
<p>Y: AND lógico. Verdadero solo si AMBAS condiciones son verdaderas.</p>
<p>O: OR lógico. Verdadero si AL MENOS UNA condición es verdadera.</p>
<p>NO: NOT lógico. Invierte el valor: si era verdadero lo vuelve falso y viceversa.</p></td>
<td><p>clase ejemplo{</p>
<p>clasePrincipal{</p>
<p>entero x = 0;</p>
<p>hacer{</p>
<p>imprimirLN(“Hola”);</p>
<p>x = x + 1;</p>
<p>}mientras(x&lt;1);</p>
<p>}</p>
<p>}</p></td>
<td>Hola</td>
</tr>
<tr>
<td>7</td>
<td>opcion</td>
<td><p>Evalúa el valor de una variable y ejecuta el bloque del caso (caso) que coincida exactamente con ese valor. Si ningún caso coincide, ejecuta el bloque porDefecto (si existe).</p>
<p>Es más eficiente que una cadena de si/sino cuando se compara una misma variable contra múltiples valores concretos.</p></td>
<td><p>switch (variable) {</p>
<p>case valor1:</p>
<p>instrucciones;</p>
<p>break;</p>
<p>case valor2:</p>
<p>instrucciones;</p>
<p>break;</p>
<p>default:</p>
<p>instrucciones;</p>
<p>}</p>
<p><strong>Switch</strong>: palabra reservada para selección múltiple.</p>
<p><strong>(:</strong> inicio de condición.</p>
<p><strong>variable</strong>: valor o variable que se evalúa.</p>
<p><strong>):</strong> fin de condición.</p>
<p><strong>}:</strong> inicio la estructura switch.</p>
<p><strong>Case</strong>: define un valor específico con el que se comparará la variable. Si la variable es igual a ese valor, se ejecutan las instrucciones del caso.</p>
<p><strong>:</strong>: separador</p>
<p><strong>valn</strong>: valor n que se compara con variable.</p>
<p><strong>Instrucciones</strong>: acciones a ejecutar si coincide el caso.</p>
<p><strong>Break</strong>: termina el case y sale del switch.</p>
<p><strong>;</strong>: fin de instrucción.</p>
<p><strong>}:</strong> fin la estructura switch.</p></td>
<td><p>opcion (variable) {</p>
<p>caso valor1:</p>
<p>instrucciones;</p>
<p>romper;</p>
<p>caso valor2:</p>
<p>instrucciones;</p>
<p>romper;</p>
<p>porDefecto:</p>
<p>instrucciones;</p>
<p>}</p>
<p><strong>opcion</strong>: palabra reservada para selección múltiple.</p>
<p><strong>(:</strong> inicio de condición.</p>
<p><strong>variable</strong>: valor o variable que se evalúa.</p>
<p><strong>):</strong> fin de condición.</p>
<p><strong>}:</strong> inicio la estructura switch.</p>
<p><strong>caso</strong>: define un valor específico con el que se comparará la variable. Si la variable es igual a ese valor, se ejecutan las instrucciones del caso.</p>
<p><strong>:</strong>: separador</p>
<p><strong>valn</strong>: valor n que se compara con variable.</p>
<p><strong>Instrucciones</strong>: acciones a ejecutar si coincide el caso.</p>
<p><strong>romper</strong>: termina el case y sale del switch.</p>
<p><strong>porDefecto</strong>: bloque opcional que se ejecuta si la variable no coincidió con ningún caso.</p>
<p><strong>;</strong>: fin de instrucción.</p>
<p><strong>}:</strong> fin la estructura switch.</p></td>
<td><p>clase ejemplo {</p>
<p>clasePrincipal {</p>
<p>entero dia = 3;</p>
<p>opcion (dia) {</p>
<p>caso 1:</p>
<p>imprimirLn("Lunes");</p>
<p>romper;</p>
<p>caso 2:</p>
<p>imprimirLn("Martes");</p>
<p>romper;</p>
<p>caso 3:</p>
<p>imprimirLn("Miercoles");</p>
<p>romper;</p>
<p>porDefecto:</p>
<p>imprimirLn("Otro dia");</p>
<p>}</p>
<p>}</p>
<p>}</p></td>
<td><p>Miercoles</p>
<p>dia = 3 coincide</p>
<p>con caso 3.</p>
<p>romper sale</p>
<p>de la estructura.</p></td>
</tr>
<tr>
<td>8</td>
<td>leer</td>
<td><p>Detiene la ejecución del programa y espera a que el usuario escriba un valor en el teclado y presione Enter. El valor ingresado se guarda en la variable indicada como parámetro.</p>
<p>La variable debe estar previamente declarada. El tipo de dato de la variable determina automáticamente qué tipo de valor se espera leer: si la variable es de tipo entero, se leerá un número entero; si es de tipo cadena, se leerá texto.</p>
<p>Si el usuario ingresa un valor de tipo diferente al de la variable, el programa lanzará un error de ejecución.</p></td>
<td><p>En Java se utiliza la clase Scanner:</p>
<p>Scanner sc = new Scanner(System.in);</p>
<p>variable = sc.nextInt(); // entero</p>
<p>variable = sc.nextDouble(); // decimal</p>
<p>variable = sc.next(); // cadena</p>
<p>variable = sc.nextLine(); // línea completa</p>
<p><strong>Scanner</strong>: clase de Java que permite leer datos del teclado.</p>
<p><strong>sc</strong>: nombre del objeto Scanner creado para leer.</p>
<p><strong>=:</strong> operador de asignación; guarda el valor leído en la variable.</p>
<p><strong>new Scanner(System.in):</strong> crea el objeto Scanner conectado a la entrada del teclado.</p>
<p><strong>sc.nextInt():</strong> espera y lee un número entero del teclado.</p>
<p><strong>sc.nextDouble():</strong> espera y lee un número decimal del teclado.</p>
<p><strong>sc.next():</strong> espera y lee una cadena de texto sin espacios.</p>
<p><strong>sc.nextLine():</strong> espera y lee una línea completa de texto, incluyendo espacios.</p>
<p><strong>;:</strong> fin de instrucción.</p></td>
<td><p>leer(variable);</p>
<p><strong>leer:</strong> palabra reservada para leer por teclado.</p>
<p><strong>(:</strong>.inicio de parámetros.</p>
<p><strong>Variable:</strong> lugar donde se almacene el valor leído por teclado.</p>
<p><strong>):</strong> fin de parámetros.</p>
<p><strong>;</strong>: fin de instrucción</p></td>
<td><p>clase ejemplo {</p>
<p>clasePrincipal {</p>
<p>entero a;</p>
<p>cadena nombre;</p>
<p>imprimir("Escribe un numero: ");</p>
<p>leer(a);</p>
<p>imprimir("Escribe tu nombre: ");</p>
<p>leer(nombre);</p>
<p>imprimirF("%s escribio: %d",</p>
<p>nombre, a);</p>
<p>}</p>
<p>}</p></td>
<td><p>Escribe un numero:</p>
<p>&gt; 7</p>
<p>Escribe tu nombre:</p>
<p>&gt; Luis</p>
<p>Luis escribio: 7</p></td>
</tr>
<tr>
<td>9</td>
<td>funcion</td>
<td><p>Define un bloque de código con nombre propio que puede ser llamado (ejecutado) desde cualquier parte del programa. Permite reutilizar código sin repetirlo.</p>
<p>Una función puede recibir datos de entrada llamados parámetros y puede devolver un valor de salida usando retornar.</p>
<p>Función con retorno: el tipo indicado después de funcion especifica el tipo del valor que devolverá. Debe tener al menos una instrucción retornar valor dentro.</p>
<p>Función sin retorno: se usa vacio como tipo. El bloque ejecuta instrucciones, pero no devuelve ningún valor. El retornar es opcional para salir anticipadamente.</p>
<p>Para ejecutar una función se escribe su nombre seguido de los argumentos entre paréntesis.</p></td>
<td><p>// Función con retorno:</p>
<p>static tipo nombre(tipo param1, tipo param2) {</p>
<p>instrucciones;</p>
<p>return valor;</p>
<p>}</p>
<p>// Función sin retorno:</p>
<p>static void nombre(tipo param1) {</p>
<p>instrucciones;</p>
<p>}</p>
<p><strong>static</strong>: permite llamar la función sin crear un objeto de la clase.</p>
<p><strong>tipo</strong>: tipo de dato que la función devolverá. Ej: int, double, String.</p>
<p><strong>void</strong>: indica que la función no devuelve ningún valor.</p>
<p>nombre: identificador de la función. Se usa para llamarla después.</p>
<p><strong>(:</strong> inicio de la lista de parámetros.</p>
<p>tipo param: tipo y nombre de cada parámetro de entrada, separados por coma.</p>
<p><strong>):</strong> fin de la lista de parámetros.</p>
<p><strong>{:</strong> inicio del bloque de la función.</p>
<p><strong>return</strong>: devuelve el valor al código que llamó la función y termina su ejecución.</p>
<p><strong>}:</strong> fin del bloque de la función.</p></td>
<td><p>// Función con retorno:</p>
<p>funcion tipo nombre(tipo param1, tipo param2) {</p>
<p>instrucciones;</p>
<p>retornar valor;</p>
<p>}</p>
<p>// Función sin retorno:</p>
<p>funcion vacio nombre(tipo param1) {</p>
<p>instrucciones;</p>
<p>}</p>
<p><strong>funcion</strong>: palabra reservada para declarar una función.</p>
<p><strong>tipo</strong>: tipo de dato que la función devolverá. Debe coincidir con el valor que se pone en retornar.</p>
<p><strong>vacio</strong>: indica que la función no devuelve ningún valor. Se usa en lugar del tipo cuando no hay retorno.</p>
<p>nombre: identificador de la función. Se usa para llamarla.</p>
<p><strong>(:</strong> inicio de la lista de parámetros.</p>
<p><strong>tipo param</strong>: tipo y nombre de cada parámetro de entrada, separados por coma.</p>
<p><strong>):</strong> fin de la lista de parámetros.</p>
<p><strong>{:</strong> inicio del bloque de instrucciones de la función.</p>
<p><strong>retornar valor:</strong> devuelve el valor al código que llamó la función y termina su ejecución. Obligatorio en funciones con tipo.</p>
<p><strong>}:</strong> fin del bloque de la función.</p>
<p><strong>Tipos:</strong></p>
<p><strong><u>logico</u>:</strong> para valores verdadero o falso.<strong><br />
byte:</strong> Números enteros de 8 bits.<strong><br />
caracter:</strong> Un solo carácter Unicode de 16 bits.<strong><br />
corto:</strong> Números enteros de 16 bits.<strong><br />
entero:</strong> Números enteros de 32 bits.<strong><br />
largo:</strong> Números enteros de 64 bits.<strong><br />
flotante:</strong> Números de punto flotante de 32 bits<strong><br />
decimal:</strong> Números de punto flotante de 64 bits (decimales de doble precisión).<strong><br />
cadena:</strong> No es un primitivo, sino una clase/objeto. Almacena una secuencia de caracteres (texto).</p></td>
<td><p>clase ejemplo {</p>
<p>funcion entero sumar(entero a,</p>
<p>entero b) {</p>
<p>retornar a + b;</p>
<p>}</p>
<p>funcion vacio saludar(cadena n) {</p>
<p>imprimirLn("Hola " + n);</p>
<p>}</p>
<p>clasePrincipal {</p>
<p>entero resultado;</p>
<p>resultado = sumar(5, 3);</p>
<p>imprimirLn(resultado);</p>
<p>saludar("Ana");</p>
<p>}</p>
<p>}</p></td>
<td><p>8</p>
<p>Hola Ana</p></td>
</tr>
<tr>
<td>10</td>
<td>intentar/capturar</td>
<td><p>Permite ejecutar un bloque de instrucciones que podría fallar en tiempo de ejecución, y capturar el error para que el programa no se detenga abruptamente.</p>
<p><strong>intentar</strong>: contiene las instrucciones que se intentarán ejecutar. Si ocurre un error dentro de este bloque, la ejecución se interrumpe y salta al bloque capturar.</p>
<p><strong>capturar</strong>: contiene el código que se ejecutará si ocurrió un error en el bloque intentar. Recibe un parámetro que contiene la información del error. Las instrucciones dentro del bloque capturar permiten al programa recuperarse del error.</p>
<p>Ejemplos de errores que se pueden capturar: división entre cero, acceso a un índice inexistente en un arreglo, conversión de texto a número cuando el texto no es numérico.</p></td>
<td><p>try {</p>
<p>instrucciones;</p>
<p>} catch (Exception e) {</p>
<p>instrucciones;</p>
<p>}</p>
<p><strong>try</strong>: palabra reservada; inicia el bloque de prueba.</p>
<p><strong>{:</strong> inicio del bloque que podría generar un error.</p>
<p>instrucciones: código que se intentará ejecutar. Si falla en cualquier línea, salta inmediatamente al catch.</p>
<p><strong>}:</strong> fin del bloque try.</p>
<p><strong>catch</strong>: captura el error que ocurrió en el bloque try.</p>
<p><strong>(Exception e):</strong> parámetro que recibe el objeto con la información del error. Exception es el tipo de error; e es el nombre con que se accede a él dentro del bloque.</p>
<p><strong>{:</strong> inicio del bloque de manejo del error.</p>
<p><strong>instrucciones</strong>: código que se ejecuta para manejar el error.</p>
<p><strong>}:</strong> fin del bloque catch.</p></td>
<td><p>intentar {</p>
<p>instrucciones;</p>
<p>} capturar (Error e) {</p>
<p>instrucciones;</p>
<p>}</p>
<p><strong>intentar</strong>: palabra reservada; inicia el bloque de instrucciones que se intentarán ejecutar.</p>
<p><strong>{:</strong> inicio del bloque de prueba.</p>
<p>instrucciones: código que se intentará ejecutar. Si ocurre un error en cualquier línea, la ejecución salta inmediatamente al bloque capturar.</p>
<p><strong>}:</strong> fin del bloque intentar.</p>
<p><strong>capturar</strong>: palabra reservada; inicia el bloque que maneja el error.</p>
<p><strong>(:</strong> inicio del parámetro de error.</p>
<p><strong>Error e</strong>: tipo de error que se capturará y nombre con el que se accede a su información dentro del bloque.</p>
<p><strong>):</strong> fin del parámetro.</p>
<p><strong>{:</strong> inicio del bloque de manejo del error.</p>
<p><strong>instrucciones</strong>: código que se ejecuta para recuperarse del error o mostrar un mensaje al usuario.</p>
<p><strong>}:</strong> fin del bloque capturar.</p></td>
<td><p>clase ejemplo {</p>
<p>clasePrincipal {</p>
<p>intentar {</p>
<p>entero x = 10 / 0;</p>
<p>imprimirLn(x);</p>
<p>} capturar (Error e) {</p>
<p>imprimirLn("Error: division");</p>
<p>imprimirLn("entre cero.");</p>
<p>}</p>
<p>imprimirLn("Programa continua.");</p>
<p>}</p>
<p>}</p></td>
<td><p>Error: division</p>
<p>entre cero.</p>
<p>Programa continua.</p>
<p>La línea 10/0</p>
<p>genera error. El</p>
<p>bloque capturar</p>
<p>lo maneja y el</p>
<p>programa sigue.</p></td>
</tr>
<tr>
<td>11</td>
<td>limpiar</td>
<td><p>Borra todo el texto que se muestra actualmente en la consola, dejándola completamente en blanco. Es útil en programas interactivos o de menú donde se quiere renovar la pantalla para mostrar nueva información sin que el texto anterior genere confusión.</p>
<p>No recibe parámetros. Su efecto es inmediato: todo lo que estaba visible en la consola desaparece y el cursor queda posicionado en la esquina superior izquierda.</p></td>
<td><p>No existe una instrucción directa en Java. Se implementa enviando una secuencia de caracteres especiales llamada Código de Escape ANSI:</p>
<p>System.out.print("\033[H\033[2J");</p>
<p>System.out.flush();</p>
<p><strong>System.out.print:</strong> envía texto a la consola sin salto de línea.</p>
<p><strong>"\033[H\033[2J":</strong> Código de Escape ANSI: la terminal lo interpreta como una orden de control, no como texto. \033 es el carácter de escape (ESC). [H mueve el cursor al inicio de la pantalla. [2J borra todo el contenido visible de la consola.</p>
<p><strong>;:</strong> fin de la instrucción.</p>
<p><strong>System.out.flush():</strong> vacía el búfer de salida para asegurar que la limpieza se aplique de inmediato.</p></td>
<td><p>limpiar();</p>
<p><strong>limpiar</strong>: palabra reservada que borra todo el contenido visible de la consola.</p>
<p><strong>(:</strong> inicio de parámetros.</p>
<p><strong>):</strong> fin de parámetros. Esta instrucción no recibe argumentos: los paréntesis van vacíos.</p>
<p><strong>;:</strong> fin de la instrucción.</p></td>
<td><p>clase ejemplo {</p>
<p>clasePrincipal {</p>
<p>imprimirLn("Texto viejo");</p>
<p>imprimirLn("Mas texto");</p>
<p>esperar(1500);</p>
<p>limpiar();</p>
<p>imprimirLn("Pantalla limpia.");</p>
<p>}</p>
<p>}</p></td>
<td><p>(pantalla limpia)</p>
<p>Pantalla limpia.</p>
<p>"Texto viejo" y</p>
<p>"Mas texto" fueron</p>
<p>borrados de la</p>
<p>consola.</p></td>
</tr>
<tr>
<td>12</td>
<td>longitud</td>
<td><p>Devuelve el número de elementos que contiene una cadena de texto o un arreglo.</p>
<p><strong>En cadenas:</strong> cuenta el número de caracteres. Por ejemplo, "Hola" tiene longitud 4.</p>
<p><strong>En arreglos</strong>: devuelve la cantidad total de posiciones del arreglo, sin importar cuántas estén ocupadas con datos. Por ejemplo, arreglo entero datos[5] tiene longitud 5.</p>
<p>El resultado es de tipo entero y puede guardarse en una variable o usarse directamente en expresiones y condiciones.</p></td>
<td><p>// Para cadenas:</p>
<p>variable.length()</p>
<p>"Hola".length() // resultado: 4</p>
<p>// Para arreglos:</p>
<p>arreglo.length // propiedad, sin paréntesis</p>
<p><strong>variable</strong>: objeto String o nombre del arreglo.</p>
<p><strong>.:</strong> operador de acceso a miembros.</p>
<p><strong>length():</strong> método de String que devuelve la cantidad de caracteres. Lleva paréntesis.</p>
<p><strong>length:</strong> propiedad de un arreglo que devuelve su tamaño. No lleva paréntesis.</p></td>
<td><p>entero Variable = longitud(variable)</p>
<p>entero Variable = longitud(“texto”)</p>
<p><strong>longitud</strong>: devuelve el número de elementos de una cadena o arreglo.</p>
<p><strong>(:</strong> inicio de parámetros.</p>
<p><strong>variable</strong>: nombre de la cadena o del arreglo del que se quiere conocer el tamaño.</p>
<p><strong>):</strong> fin de parámetros.</p>
<p>Nota: No lleva punto y coma porque generalmente se usa dentro de una expresión. Ejemplo: entero tam = longitud(nombre);</p></td>
<td><p>clase ejemplo {</p>
<p>clasePrincipal {</p>
<p>cadena nombre = "Hola";</p>
<p>arreglo entero datos[3];</p>
<p>datos[0] = 10;</p>
<p>datos[1] = 20;</p>
<p>datos[2] = 30;</p>
<p>entero tamCadena;</p>
<p>entero tamArreglo;</p>
<p>tamCadena = longitud(nombre);</p>
<p>tamArreglo = longitud(datos);</p>
<p>imprimirLn(tamCadena);</p>
<p>imprimirLn(tamArreglo);</p>
<p>}</p>
<p>}</p></td>
<td><p>4</p>
<p>3</p>
<p>"Hola" tiene</p>
<p>4 caracteres.</p>
<p>datos tiene</p>
<p>3 posiciones.</p></td>
</tr>
<tr>
<td>13</td>
<td>esperar</td>
<td><p>Detiene la ejecución del programa durante una cantidad específica de tiempo medida en milisegundos, y luego la reanuda automáticamente.</p>
<p>Es útil en programas interactivos para crear pausas visibles, simular animaciones, mostrar mensajes temporales o controlar el ritmo de un juego o menú.</p></td>
<td><p>Thread.sleep(milisegundos);</p>
<p><strong>Thread</strong>: clase de Java que representa un hilo de ejecución del programa.</p>
<p><strong>.:</strong> operador de acceso a miembros.</p>
<p><strong>sleep</strong>: método que pausa el hilo de ejecución actual durante el tiempo indicado.</p>
<p><strong>(:</strong> inicio de parámetros.</p>
<p><strong>milisegundos</strong>: tiempo de pausa expresado en milisegundos. Debe ser un valor entero positivo. 1 segundo = 1000 ms.</p>
<p><strong>):</strong> fin de parámetros.</p>
<p><strong>;:</strong> fin de instrucción.</p></td>
<td><p>esperar(valorentero);</p>
<p><strong>esperar</strong>: palabra reservada que pausa la ejecución del programa.</p>
<p><strong>(:</strong> inicio de parámetros.</p>
<p><strong>valorentero</strong>: tiempo de pausa en milisegundos. Debe ser un número entero positivo. Ejemplos: 1000 = 1 segundo, 500 = medio segundo, 3000 = 3 segundos.</p>
<p><strong>):</strong> fin de parámetros.</p>
<p><strong>;:</strong> fin de la instrucción.</p></td>
<td><p>clase ejemplo {</p>
<p>clasePrincipal {</p>
<p>imprimirLn("Inicio");</p>
<p>esperar(2000);</p>
<p>imprimirLn("Han pasado");</p>
<p>imprimirLn("2 segundos.");</p>
<p>esperar(1000);</p>
<p>imprimirLn("Fin.");</p>
<p>}</p>
<p>}</p></td>
<td><p>Inicio</p>
<p>(pausa 2 segundos)</p>
<p>Han pasado</p>
<p>2 segundos.</p>
<p>(pausa 1 segundo)</p>
<p>Fin.</p></td>
</tr>
<tr>
<td>14</td>
<td>aleatorio</td>
<td><p>Genera y devuelve un número entero aleatorio dentro de un rango definido por un valor mínimo y un valor máximo, ambos inclusive.</p>
<p>El rango es [min, max], lo que significa que tanto min como max pueden ser devueltos como resultado.</p>
<p>Cada vez que se llama a la instrucción, puede producir un resultado diferente. No se garantiza ningún orden ni distribución particular entre llamadas.</p>
<p>El resultado es de tipo entero. Para guardarlo debe usarse una variable de tipo entero.</p></td>
<td><p>(int)(Math.random() * (max - min + 1) + min);</p>
<p><strong>(int):</strong> conversión de tipo (casting): convierte el resultado decimal a entero, descartando los decimales.</p>
<p><strong>Math:</strong> clase de Java con funciones matemáticas.</p>
<p><strong>.:</strong> operador de acceso a miembros.</p>
<p><strong>random():</strong> genera un número decimal aleatorio en el rango [0.0, 1.0); nunca devuelve exactamente 1.0.</p>
<p><strong>* (max - min + 1):</strong> multiplica para escalar el decimal al tamaño del rango. Ej: si min=1 y max=6, el rango tiene 6 posibles valores.</p>
<p><strong>+ min:</strong> suma el mínimo para desplazar el resultado al inicio del rango deseado.</p>
<p><strong>;:</strong> fin de instrucción.</p></td>
<td><p>entero variable = aleatorio(min, max)</p>
<p><strong>entero:</strong> Números enteros de 32 bits.</p>
<p><strong>variable</strong>: nombre de la variable.</p>
<p><strong>aleatorio</strong>: genera un número entero aleatorio en el rango [min, max].</p>
<p><strong>(:</strong> inicio de parámetros.</p>
<p><strong>min</strong>: valor mínimo del rango. Es el número más pequeño que puede devolver la instrucción. Está incluido en el rango.</p>
<p><strong>,:</strong> separador de parámetros.</p>
<p><strong>max</strong>: valor máximo del rango. Es el número más grande que puede devolver la instrucción. Está incluido en el rango.</p>
<p><strong>):</strong> fin de parámetros.</p>
<p>Nota: El resultado es siempre de tipo entero. Para guardarlo usa: entero n = aleatorio(min, max); donde min y max son valores enteros.</p></td>
<td><p>clase ejemplo {</p>
<p>clasePrincipal {</p>
<p>entero dado;</p>
<p>entero moneda;</p>
<p>dado = aleatorio(1, 6);</p>
<p>moneda = aleatorio(0, 1);</p>
<p>imprimirF("Dado: %d", dado);</p>
<p>si (moneda == 0) {</p>
<p>imprimirLn("Cara");</p>
<p>} sino {</p>
<p>imprimirLn("Cruz");</p>
<p>}</p>
<p>}</p>
<p>}</p></td>
<td><p>Dado: 4</p>
<p>Cruz</p>
<p>(resultados de</p>
<p>ejemplo; cambian</p>
<p>en cada ejecución)</p></td>
</tr>
<tr>
<td>15</td>
<td>potencia</td>
<td>Calcula un número elevado a un exponente (base^exponente). Funciona con cualquier número real, no solo enteros.</td>
<td><p>Math.pow(base, exponente);</p>
<p><strong>Math.pow(b, e):</strong> calcula b elevado a e.</p>
<p><strong>;:</strong> fin de instrucción.</p></td>
<td><p>decimal variable = potencia(base, exponente)</p>
<p><strong>decimal:</strong> Números de punto flotante de 64 bits (decimales de doble precisión).</p>
<p><strong>variable</strong>: nombre de la variable.</p>
<p><strong>=</strong>: operador de asignación.</p>
<p><strong>potencia</strong>: calcula base elevado a exponente.</p>
<p><strong>(:</strong> inicio de parámetros.</p>
<p><strong>base</strong>: número base.</p>
<p><strong>,:</strong> separador.</p>
<p>exponente: valor al que se eleva la base.</p>
<p><strong>):</strong> fin de parámetros.</p>
<p>Nota: devuelve tipo decimal. Para entero: entero n = redondear(potencia(2, 10));</p></td>
<td><p>clase ejemplo {</p>
<p>clasePrincipal {</p>
<p>decimal r1 = potencia(2, 10);</p>
<p>decimal r2 = potencia(3, 3);</p>
<p>decimal r3 = potencia(9, 0.5);</p>
<p>imprimirLn(r1);</p>
<p>imprimirLn(r2);</p>
<p>imprimirLn(r3);</p>
<p>}</p>
<p>}</p></td>
<td><p>1024.0</p>
<p>27.0</p>
<p>3.0 (= raiz de 9)</p></td>
</tr>
<tr>
<td>16</td>
<td>redondear</td>
<td>Redondea un número decimal al entero más cercano.</td>
<td><p>Math.round(numero);</p>
<p>Math.round(n): redondea n al entero más cercano.</p>
<p>;: fin de instrucción.</p></td>
<td><p>Entero variable =</p>
<p>redondear(numero)</p>
<p>Entero variable =</p>
<p>redondear(variable)</p>
<p><strong>entero:</strong> Números enteros de 32 bits.</p>
<p><strong>variable</strong>: nombre de la variable.</p>
<p><strong>=</strong>: operador de asignación.</p>
<p><strong>redondear</strong>: redondea al entero más cercano.</p>
<p><strong>(:</strong> inicio de parámetros.</p>
<p><strong>numero</strong>: valor decimal (flotante o decimal) a redondear o puede ser una variable.</p>
<p><strong>):</strong> fin de parámetros.</p>
<p>Nota: siempre devuelve un entero.</p>
<p>Regla: parte decimal &gt;= 0.5 → sube. Parte decimal &lt; 0.5 → baja.</p></td>
<td><p>clase ejemplo {</p>
<p>clasePrincipal {</p>
<p>imprimirLn(redondear(4.7));</p>
<p>imprimirLn(redondear(4.3));</p>
<p>imprimirLn(redondear(-2.6));</p>
<p>imprimirLn(redondear(3.5));</p>
<p>}</p>
<p>}</p></td>
<td><p>5</p>
<p>4</p>
<p>-3</p>
<p>4</p></td>
</tr>
<tr>
<td>17</td>
<td>logaritmo</td>
<td>Calcula el logaritmo natural (base e) de un numero positivo. Si el numero es cero o negativo el resultado es infinito o NaN. Devuelve tipo decimal.</td>
<td><p>Math.log(numero);</p>
<p><strong>Math.log(numero)</strong>: logaritmo natural.</p>
<p>// Logaritmo base 10:</p>
<p>Math.log10(numero);</p>
<p><strong>;</strong>: fin.</p></td>
<td><p>decimal variable = logaritmo(numero);</p>
<p>decimal variable = logaritmo(base,numero);</p>
<p><strong>logaritmo</strong>: calcula el logaritmo natural.</p>
<p><strong>Base</strong>: te permite calcular el logaritmo con base e.</p>
<p><strong>(</strong>: inicio de parametros.</p>
<p><strong>numero</strong>: valor positivo.</p>
<p><strong>)</strong>: fin de parametros.</p>
<p>Nota: para base 10 usar logaritmo10(numero).</p></td>
<td><p>clase ejemplo{</p>
<p>clasePrincipal{</p>
<p>decimal r1=logaritmo(1);</p>
<p>decimal r2=</p>
<p>logaritmo(2.718);</p>
<p>decimal r3=</p>
<p>logaritmo10(10);</p>
<p>imprimirLn(r1);</p>
<p>imprimirLn(r2);</p>
<p>imprimirLn(r3);</p>
<p>}</p>
<p>}</p></td>
<td><p>0.0</p>
<p>~1.0</p>
<p>1.0</p></td>
</tr>
<tr>
<td>18</td>
<td>seno</td>
<td>Calcula el seno de un angulo en radianes. Devuelve un decimal entre -1.0 y 1.0. Para convertir grados a radianes multiplica por PI entre 180.</td>
<td><p>Math.sin(angulo);</p>
<p><strong>Math.sin(angulo)</strong>: seno del angulo en radianes.</p>
<p><strong>;</strong>: fin.</p></td>
<td><p>decimal variable = seno(angulo)</p>
<p><strong>seno</strong>: calcula el seno trigonometrico.</p>
<p><strong>(</strong>: inicio de parametros.</p>
<p><strong>angulo</strong>: angulo en radianes.</p>
<p><strong>)</strong>: fin de parametros.</p>
<p>Nota: para grados: seno(grados*3.1416/180).</p></td>
<td><p>clase ejemplo{</p>
<p>clasePrincipal{</p>
<p>decimal PI=3.14159265;</p>
<p>decimal s0=seno(0);</p>
<p>decimal s90=seno(PI/2);</p>
<p>imprimirLn(s0);</p>
<p>imprimirLn(s90);</p>
<p>}</p>
<p>}</p></td>
<td><p>0.0</p>
<p>1.0</p></td>
</tr>
<tr>
<td>19</td>
<td>coseno</td>
<td>Calcula el coseno de un angulo en radianes. Devuelve un decimal entre -1.0 y 1.0. Para convertir grados a radianes multiplica por PI entre 180.</td>
<td><p>Math.cos(angulo);</p>
<p><strong>Math.cos(angulo)</strong>: coseno del angulo en radianes.</p>
<p><strong>;</strong>: fin.</p></td>
<td><p>decimal variable = coseno(angulo)</p>
<p><strong>coseno</strong>: calcula el coseno trigonometrico.</p>
<p><strong>(</strong>: inicio de parametros.</p>
<p><strong>angulo</strong>: angulo en radianes.</p>
<p><strong>)</strong>: fin de parametros.</p>
<p>Nota: para grados: coseno(grados*3.1416/180).</p></td>
<td><p>clase ejemplo{</p>
<p>clasePrincipal{</p>
<p>decimal PI=3.14159265;</p>
<p>decimal c0=coseno(0);</p>
<p>decimal c90=coseno(PI/2);</p>
<p>imprimirLn(c0);</p>
<p>imprimirLn(c90);</p>
<p>}</p>
<p>}</p></td>
<td><p>1.0</p>
<p>~0.0</p></td>
</tr>
<tr>
<td>20</td>
<td>perimetro</td>
<td>Calcula el perímetro de una figura geométrica. Se especifica la figura con un punto después del nombre y luego los parámetros requeridos por esa figura.</td>
<td>No existe instrucción directa. Se calcula manualmente con fórmulas aritméticas según la figura. <strong>Ejemplo círculo:</strong> 2 * Math.PI * radio; <strong>Ejemplo rectángulo:</strong> 2 * (base + altura); <strong>Ejemplo triángulo:</strong> a + b + c;</td>
<td><p>decimal variable = perimetro.circulo(radio); decimal variable = perimetro.cuadrado(lado); decimal variable = perimetro.rectangulo(base, altura) ;</p>
<p>decimal variable = perimetro.triangulo(a, b, c);</p>
<p><strong>perimetro</strong>: palabra reservada para calcular perímetros.</p>
<p><strong>.</strong>: acceso a la figura geométrica.</p>
<p><strong>circulo / cuadrado / rectangulo / triangulo</strong>: nombre de la figura.</p>
<p><strong>(</strong>: inicio de parámetros.</p>
<p><strong>radio</strong>: distancia del centro al borde del círculo.</p>
<p><strong>lado</strong>: longitud de un lado del polígono regular.</p>
<p><strong>base</strong>: longitud de la base del rectángulo o triángulo.</p>
<p><strong>altura</strong>: longitud perpendicular de la figura.</p>
<p><strong>a, b, c</strong>: longitudes de los tres lados del triángulo.</p>
<p><strong>)</strong>: fin de parámetros.</p>
<p>Nota: devuelve tipo decimal.</p></td>
<td><p>clase ejemplo{</p>
<p>clasePrincipal{</p>
<p>decimal r1 = perimetro.circulo(5); decimal r2 = perimetro.cuadrado(4); decimal r3 = perimetro.rectangulo(3, 6); imprimirLn(r1); imprimirLn(r2); imprimirLn(r3);</p>
<p>}</p>
<p>}</p></td>
<td><p>31.4159….</p>
<p>16.0</p>
<p>18.0</p></td>
</tr>
<tr>
<td>21</td>
<td>area</td>
<td>Calcula el área de una figura geométrica. Se especifica la figura con un punto después del nombre y luego los parámetros requeridos. Devuelve tipo decimal.</td>
<td>No existe instrucción directa. Se calcula manualmente. <strong>Ejemplo círculo:</strong> Math.PI * radio * radio; <strong>Ejemplo rectángulo:</strong> base * altura; <strong>Ejemplo triángulo:</strong> (base * altura) / 2;</td>
<td><p>decimal variable = area.circulo(radio);</p>
<p>decimal variable = area.cuadrado(lado);</p>
<p>decimal variable = area.rectangulo(base, altura);</p>
<p>decimal variable = area.triangulo(base, altura);</p>
<p><strong>decimal</strong>: tipo de dato que devuelve la instrucción.</p>
<p><strong>variable</strong>: nombre donde se almacena el resultado.</p>
<p><strong>=</strong>: operador de asignación.</p>
<p><strong>area</strong>: palabra reservada para calcular áreas.</p>
<p><strong>.</strong>: acceso a la figura geométrica.</p>
<p><strong>circulo / cuadrado / rectangulo / triangulo</strong>: nombre de la figura.</p>
<p><strong>(</strong>: inicio de parámetros.</p>
<p><strong>radio / lado / base / altura / b1, b2 / d1, d2</strong>: parámetros según la figura.</p>
<p><strong>)</strong>: fin de parámetros.</p></td>
<td><p>clase ejemplo{</p>
<p>clasePrincipal{</p>
<p>decimal r1 = area.circulo(5);</p>
<p>decimal r2 = area.rectangulo(3, 6);</p>
<p>decimal r3 = area.triangulo(4, 8);</p>
<p>imprimirLn(r1);</p>
<p>imprimirLn(r2);</p>
<p>imprimirLn(r3);</p>
<p>}</p>
<p>}</p></td>
<td><p>78.5398... 18.0</p>
<p>16.0</p></td>
</tr>
<tr>
<td>22</td>
<td>volumen</td>
<td>Calcula el volumen de una figura geométrica tridimensional. Se especifica la figura con un punto después del nombre y los parámetros requeridos. Devuelve tipo decimal</td>
<td>No existe instrucción directa. Se calcula manualmente. <strong>Ejemplo esfera:</strong> (4.0/3) * Math.PI * Math.pow(radio,3); <strong>Ejemplo cubo:</strong> lado * lado * lado; <strong>Ejemplo cilindro:</strong> Math.PI * radio * radio * altura;</td>
<td><p>decimal variable = volumen.cubo(lado);</p>
<p>decimal variable = volumen.esfera(radio);</p>
<p>decimal variable = volumen.cilindro(radio, altura);</p>
<p>decimal variable = volumen.cono(radio, altura);</p>
<p>decimal variable = volumen.prisma(base, altura);</p>
<p>decimal variable = volumen.piramide(base, altura);</p>
<p><strong>volumen</strong>: palabra reservada para calcular volúmenes.</p>
<p><strong>.</strong>: acceso a la figura geométrica.</p>
<p><strong>cubo / esfera / cilindro / cono / prisma / piramide</strong>: nombre de la figura.</p>
<p><strong>(</strong>: inicio de parámetros.</p>
<p><strong>lado</strong>: longitud de un lado del cubo.</p>
<p><strong>radio</strong>: distancia del centro al borde de la figura circular.</p>
<p><strong>base</strong>: área de la base de la figura (para prisma y pirámide).</p>
<p><strong>altura</strong>: longitud perpendicular de la figura.</p>
<p><strong>)</strong>: fin de parámetros.</p>
<p>Nota: devuelve tipo decimal.</p></td>
<td><p>clase ejemplo{</p>
<p>clasePrincipal{</p>
<p>decimal r1 = volumen.cubo(3);</p>
<p>decimal r2 = volumen.esfera(5);</p>
<p>decimal r3 = volumen.cilindro(3, 10);</p>
<p>imprimirLn(r1);</p>
<p>imprimirLn(r2);</p>
<p>imprimirLn(r3);</p>
<p>}</p>
<p>}</p></td>
<td>27.0 523.598... /282.743...</td>
</tr>
<tr>
<td>23</td>
<td>convertir</td>
<td><p>Convierte el valor de una variable de su tipo de dato actual a un tipo de dato diferente. El resultado de la conversión se asigna a una nueva variable del tipo destino.</p>
<p>Existen dos categorías de conversión:</p>
<p>Conversión numérica: entre tipos numéricos (entero, decimal, flotante, largo, corto, byte). Si se convierte de decimal a entero, la parte decimal se trunca (se elimina sin redondear). Por ejemplo: convertir(3.9, entero) produce 3, no 4.</p>
<p>Conversión a cadena y desde cadena: convierte un número a su representación en texto, o un texto que contiene un número a su valor numérico. Si el texto no representa un número válido, el compilador lanzará un error de ejecución.</p>
<p>La variable original no se modifica. La conversión produce un nuevo valor del tipo destino que debe guardarse en otra variable.</p></td>
<td><p>Conversión numérica (casting):</p>
<p>(tipoDestino) variable;</p>
<p>// entero a decimal:</p>
<p>double d = (double) entero;</p>
<p>// decimal a entero (trunca):</p>
<p>int n = (int) decimal;</p>
<p>Número a cadena:</p>
<p>String s = String.valueOf(numero);</p>
<p>Cadena a número:</p>
<p>int n = Integer.parseInt(cadena);</p>
<p>double d = Double.parseDouble(cadena);</p>
<p>(tipoDestino): operador de casting en Java; convierte el valor al tipo indicado.</p>
<p>String.valueOf(n): convierte cualquier valor numérico a su representación como cadena de texto.</p>
<p>Integer.parseInt(s): convierte una cadena de texto a entero. Error si el texto no es un número entero válido.</p>
<p>Double.parseDouble(s): convierte una cadena de texto a decimal. Error si el texto no es un número válido.</p>
<p>;: fin de instrucción.</p></td>
<td><p>Tipo variable = convertir(variable, tipoDestino);</p>
<p><strong>tipo</strong>: tipo de dato que devuelve la instrucción.</p>
<p><strong>variable</strong>: nombre donde se almacena el resultado.</p>
<p><strong>=</strong>: operador de asignación.</p>
<p><strong>convertir</strong>: palabra reservada que convierte el valor de una variable a otro tipo de dato.</p>
<p><strong>(:</strong> inicio de parámetros.</p>
<p>variable: nombre de la variable cuyo valor se convertirá. La variable original no se modifica.</p>
<p><strong>,:</strong> separador de parámetros.</p>
<p><strong>tipoDestino</strong>: tipo de dato al que se convertirá el valor. Puede ser: entero, decimal, flotante, largo, corto, byte, cadena.</p>
<p>): fin de parámetros.</p>
<p><strong>Conversiones válidas:</strong></p>
<p>entero → decimal: el entero se convierte a decimal exacto. Ej: 5 → 5.0</p>
<p>decimal → entero: la parte decimal se trunca (no se redondea). Ej: 3.9 → 3</p>
<p>entero → cadena: el número se convierte a texto. Ej: 42 → "42"</p>
<p>decimal → cadena: el decimal se convierte a texto. Ej: 3.14 → "3.14"</p>
<p>cadena → entero: el texto se convierte a entero. El texto debe contener solo dígitos.</p>
<p>cadena → decimal: el texto se convierte a decimal. El texto debe ser un número válido.</p>
<p>Nota: Si se convierte una cadena que no representa un número válido (ej: "Hola"), el programa lanzará un error de ejecución. Usa intentar/capturar para manejarlo.</p></td>
<td><p>clase ejemplo {</p>
<p>clasePrincipal {</p>
<p>decimal precio = 9.99;</p>
<p>entero pEntero;</p>
<p>cadena pTexto;</p>
<p>cadena edad = "22";</p>
<p>entero edadNum;</p>
<p>pEntero = convertir(precio, entero);</p>
<p>pTexto = convertir(precio, cadena);</p>
<p>edadNum = convertir(edad, entero);</p>
<p>imprimirLn(pEntero);</p>
<p>imprimirLn(pTexto);</p>
<p>imprimirLn(edadNum + 1);</p>
<p>}</p>
<p>}</p></td>
<td><p>9</p>
<p>9.99</p>
<p>23</p>
<p><em>9.99 → entero = 9</em></p>
<p><em>(trunca, no redondea)</em></p>
<p><em>9.99 → cadena = "9.99"</em></p>
<p><em>"22" → entero = 22</em></p>
<p><em>22 + 1 = 23</em></p></td>
</tr>
</tbody>
</table>
