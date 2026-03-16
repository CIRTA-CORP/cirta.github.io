# Documentación Técnica y Manual de Usuario - Backend CIRTA

## Introducción del Sistema
El ecosistema web de CIRTA cuenta actualmente con dos formularios principales para la captura de datos: **Contacto** y **Voluntariado**. Ambos módulos operan bajo un estándar de recolección de datos seguro, integrando validaciones desde el lado del cliente (frontend) antes de enviar la información al servidor.

Toda la lógica del servidor (Backend) fue desarrollada utilizando **Google Apps Script**, tomando como base de datos relacional los archivos de **Google Sheets**. Estos archivos y scripts se encuentran alojados de forma segura e íntegra en el Google Drive corporativo de la organización. El sistema automatiza el registro cronológico de las entradas y dispara notificaciones por correo electrónico en tiempo real según las reglas de negocio de cada formulario.

---

## Módulo 1: Formulario de Contacto

Este módulo maneja las consultas generales de los usuarios. Al ser un flujo unidireccional, su arquitectura backend es más minimalista.

Si se accede al entorno de desarrollo (Extensiones > Apps Script) desde la hoja de cálculo de Contactos, el sistema se compone de un único archivo:

* **`Codigo.gs`**: Contiene la función principal (`doPost`) encargada de interceptar el paquete de datos enviado por el usuario desde la web. Su lógica operativa consiste en:
    1. Extraer los parámetros del formulario (Nombre, Email, Teléfono, Organización, Motivo y Mensaje).
    2. Insertar un nuevo registro automatizado en la base de datos con una marca de tiempo (timestamp).
    3. Ejecutar el servicio `MailApp` para despachar un correo electrónico a `cirta.contacto@gmail.com` con el resumen de la consulta. Este correo configura el atributo `replyTo` con el email del usuario, permitiendo a la administración responder directamente a la persona con un solo clic.

---

## Módulo 2: Sistema de Voluntariado y Panel Web (SaaS)

Este módulo es una plataforma interactiva completa que permite digitalizar y automatizar la gestión integral de postulantes y voluntarios. 

### Guía de Uso e Interacciones (Frontend)
El panel proporciona una interfaz gráfica para que la administración gestione la base de datos sin interactuar directamente con el Excel. Las funcionalidades principales incluyen:

* **Acceso Autenticado:** El ingreso se realiza mediante una URL privada. El sistema valida las credenciales (correo electrónico y contraseña) contra una lista de acceso restringido antes de renderizar la información.
* **Edición de Datos en Línea (Inline Editing):** Al hacer clic en las celdas de las columnas "Rol" o "Proyecto", el sistema despliega opciones predefinidas y permite la entrada de texto libre. Al presionar "Enter", el sistema ejecuta una petición asíncrona que guarda el dato en el servidor y devuelve un indicador visual (cambio de color) para confirmar el éxito de la transacción, todo sin necesidad de recargar la página.
* **Acciones Masivas (Procesamiento por Lotes):** Permite seleccionar múltiples voluntarios mediante casillas de verificación (checkboxes). Al ejecutar las acciones "Aceptar" o "Rechazar", el sistema actualiza el estado de los registros en la base de datos y despacha correos electrónicos automáticos y personalizados a todos los usuarios seleccionados simultáneamente.
* **Generación de Certificados PDF:** Al seleccionar un voluntario (que cuente con Rol y Proyecto asignado) y presionar el botón de generación, el sistema se conecta con Google Drive, clona una plantilla oficial, inyecta los datos del voluntario, renderiza un archivo PDF, genera un ID de certificado único (ej. `CRT-2026-VOL-XXXX`) y actualiza la tabla de visualización con este nuevo identificador.

### Interfaz de Administración Nativa (Google Sheets)
Además del Panel Web, el sistema cuenta con un menú de control integrado directamente en la interfaz de la base de datos (Google Sheets). Esto garantiza que la administración pueda operar el sistema de correos y certificados sin depender exclusivamente del entorno web.

Al abrir el archivo, el script `MenuPanel.gs` ejecuta un disparador automático (`onOpen`) que compila un menú personalizado en la barra superior llamado **"⚙️ Panel CIRTA"**. 

Las funciones integradas en este menú operan bajo la lógica de **celda activa** (leyendo la fila que el usuario tenga seleccionada con el mouse) y cuentan con mecanismos de seguridad para evitar la sobrescritura accidental de los encabezados (Fila 1). Sus módulos son:

* **Aceptar / Rechazar Voluntario:** 
    * Extrae los datos de la fila seleccionada (Nombre y Correo).
    * Ejecuta una validación de existencia de correo electrónico.
    * Despliega una alerta de confirmación (`getUi().alert`) para prevenir envíos accidentales.
    * Se conecta con Gmail (`MailApp`) para despachar la plantilla de correo correspondiente (Aceptación o Rechazo).
    * Actualiza automáticamente la columna de "Estado" en tiempo real y registra la fecha de modificación.

* **Motor de Generación de Certificados PDF:**
    * **Procesamiento por Lotes:** Permite seleccionar múltiples filas simultáneamente arrastrando el mouse.
    * **Validación Estricta:** El algoritmo recorre las filas seleccionadas y verifica que existan los datos críticos obligatorios (*Rol* y *Proyecto*). Si a un voluntario le falta un dato, el sistema lo omite inteligentemente para no generar un documento incompleto y continúa con el siguiente, sumando el error a un contador interno.
    * **Renderizado de Documentos:** Se conecta con la API de Google Drive, clona la plantilla base oficial de CIRTA (un documento de Google Docs preconfigurado con "etiquetas" de texto, como por ejemplo: *"Certificamos que {{NOMBRE_COMPLETO}} ha participado en el proyecto {{PROYECTO_ASIGNADO}}"*). Luego, utiliza el método `replaceText` para buscar esas etiquetas exactas e inyectar los datos reales del voluntario, aplicando formatos automáticos a las fechas y estandarizando los nombres (ej. aplicando *Title Case* para corregir mayúsculas y minúsculas).
    * **Generación de Folio y Exportación:** Crea un identificador único para el certificado (ej. `CRT-2026-VOL-XXXX`), estampa el ID en la base de datos, exporta el documento final como un archivo PDF estático, lo guarda en la carpeta oficial de Drive y elimina el archivo temporal de texto para mantener el servidor limpio.
    * **Reporte de Ejecución:** Al finalizar, despliega un resumen en pantalla indicando cuántos PDFs se crearon con éxito y cuántas filas fueron omitidas por falta de datos.

### Arquitectura Técnica y Flujo de Trabajo (Backend)
A diferencia de una página web estática, este sistema opera mediante una arquitectura dinámica en la nube. Google Apps Script actúa como el controlador que orquesta la base de datos (Google Sheets), el servicio SMTP (Gmail) y el sistema de archivos (Google Drive).

**Estructura del Código Fuente:**
El repositorio de código está modularizado para garantizar la mantenibilidad y escalabilidad del proyecto:

* **`API.gs`**: Es el controlador principal de enrutamiento y seguridad. Se encarga de manejar las peticiones HTTP del sistema:
  * Contiene la función `doGet()`, que actúa como el motor de renderizado (`HtmlService`) para compilar y mostrar la interfaz gráfica (`Panel.html`) en el navegador del cliente.
  * Gestiona el punto de entrada de datos (`doPost`) para capturar las nuevas postulaciones que llegan desde el formulario público.
  * **`validarYObtenerDatos()`**: Verifica las sesiones. **Aquí es donde se configuran los accesos del panel:** dentro de esta función se definen explícitamente la contraseña universal (`claveUniversal`) y la lista blanca de correos autorizados (`correosPermitidos`) que tienen permiso para ver y editar la base de datos.
* **`MenuPanel.gs`**: Aloja la lógica de negocio del sistema. Contiene las funciones de ejecución para modificar las celdas del Excel, estructurar el envío de correos electrónicos automáticos de aceptación/rechazo y ejecutar la rutina de creación de los certificados en formato PDF.
* **`Panel.html`**: Estructura el Document Object Model (DOM) de la interfaz de administración.
* **`javascript.html`**: Contiene los algoritmos del lado del cliente. Escucha los eventos del usuario (clics, ingresos de texto), manipula el DOM para dibujar la tabla de datos y realiza las peticiones asíncronas (`google.script.run`) hacia el servidor para ejecutar las tareas pesadas.
* **`css.html`**: Define las hojas de estilo en cascada, integrando el framework Bootstrap 5 para garantizar un diseño responsivo y la correcta visualización de los componentes de la interfaz.
* **`menuExcel.gs`**: Aloja la lógica de interactividad de la Interfaz de Administración Nativa (Google Sheets) explicado anteriormente.

**Flujo de Transmisión de Datos:**
1. El usuario envía el formulario desde la web principal de CIRTA.
2. `API.gs` captura el payload, inserta una nueva fila en Google Sheets con el estado "Pendiente de revisión" y notifica a la administración.
3. El coordinador accede al Panel Web. El sistema verifica sus credenciales y, de ser válidas, extrae el arreglo de datos del Excel para renderizar la tabla en el navegador.
4. El coordinador emite una instrucción (ej. "Aceptar Voluntario").
5. El cliente JavaScript captura la instrucción y la envía al servidor. `MenuPanel.gs` procesa la actualización de la base de datos, despacha los correos correspondientes y retorna un código de estado (Success/Error) al cliente para actualizar la interfaz gráfica.

### Mantenimiento y Actualizaciones: Cómo Desplegar Cambios
Cualquier modificación futura realizada en el código fuente (archivos `.gs` o `.html`) requiere ser "desplegada" (deployed) para que los usuarios finales puedan verla en la URL oficial. Guardar el archivo (ícono del disquete) únicamente actualiza el entorno de desarrollo interno.

Para empujar los cambios a producción de manera segura, se debe seguir el protocolo de control de versiones nativo de Google Apps Script:

1. En la barra superior derecha del editor de código, hacer clic en el botón azul **Implementar** y seleccionar **Gestionar implementaciones**.
2. En la ventana emergente, hacer clic en el **ícono del lápiz** (Editar) ubicado en la esquina superior derecha de la configuración activa.
3. En el apartado **Versión**, abrir el menú desplegable y seleccionar obligatoriamente **Nueva versión**. *(Opcional: se recomienda agregar una breve descripción técnica de lo que se modificó).*
4. Hacer clic en el botón **Implementar** en la parte inferior.

*Nota Crítica: Si se omite el paso de crear una "Nueva versión", la URL en producción seguirá mostrando la versión almacenada en caché antes de las modificaciones, ignorando el nuevo código.*