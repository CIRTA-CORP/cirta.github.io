/**
 * API.gs — Backend del formulario de Voluntariado (Google Apps Script).
 *
 * Este archivo NO vive en el repo web (github.io es estático); vive en el
 * proyecto Apps Script vinculado a la hoja de cálculo de Voluntariado.
 * Cópialo dentro de Extensiones > Apps Script y reemplaza el doPost actual
 * (conserva el resto de tus archivos como MenuPanel.gs, Panel.html, etc.).
 *
 * Antes de desplegar:
 * 1. Abre el proyecto Apps Script > Configuración del proyecto (ícono de
 *    engranaje) > "Propiedades del script" y agrega:
 *      TURNSTILE_SECRET_KEY = <Secret Key de Cloudflare Turnstile>
 * 2. Implementar > Gestionar implementaciones > editar > Nueva versión > Implementar.
 */

function doPost(e) {
  try {
    var params = e.parameter;

    // 1) Honeypot: si el campo trampa viene relleno, es un bot.
    //    Respondemos "éxito" para no delatar el filtro, pero no guardamos nada.
    if (params.website) {
      return ContentService.createTextOutput(JSON.stringify({ result: 'success' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 2) Verificación de Turnstile.
    if (!verifyTurnstile_(params['cf-turnstile-response'])) {
      return ContentService.createTextOutput(JSON.stringify({ result: 'error', message: 'Verificación de seguridad fallida.' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 3) Revalidación de campos obligatorios en servidor (mismas reglas que
    //    static/js/volunteer-validation.js, pero no confiar solo en el JS del navegador).
    var nombre = (params.nombre || '').trim();
    var email = (params.email || '').trim();
    var disponibilidad = (params.disponibilidad || '').trim();
    var horas = Number(params.horas_semanales);

    if (nombre.length < 4 || nombre.length > 50) {
      return ContentService.createTextOutput(JSON.stringify({ result: 'error', message: 'Nombre inválido.' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 100) {
      return ContentService.createTextOutput(JSON.stringify({ result: 'error', message: 'Email inválido.' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    if (disponibilidad.length < 4 || disponibilidad.length > 150) {
      return ContentService.createTextOutput(JSON.stringify({ result: 'error', message: 'Disponibilidad inválida.' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    if (isNaN(horas) || horas < 1 || horas > 40) {
      return ContentService.createTextOutput(JSON.stringify({ result: 'error', message: 'Horas semanales inválidas.' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // --- Lógica original: guardar la postulación en Sheets y notificar ---
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

    // Capturar múltiples checkboxes seleccionados
    var intereses = "";
    if (e.parameters.intereses) {
      intereses = e.parameters.intereses.join(", ");
    } else if (params.intereses) {
      intereses = params.intereses;
    }

    // Generar ID unico
    var idUnico = "VOL-" + Math.floor(1000 + Math.random() * 9000);

    // Preparamos la fila
    var rowData = [];
    rowData.push(idUnico);
    rowData.push(new Date());
    rowData.push(nombre);
    rowData.push(email);
    rowData.push(params.ubicacion || "");
    rowData.push(intereses);
    rowData.push(disponibilidad);
    rowData.push(params.horas_semanales || "");
    rowData.push(params.experiencia || "");
    rowData.push(params.habilidades || "");
    rowData.push(params.comentarios || "");
    rowData.push("");
    rowData.push("");
    rowData.push("");
    rowData.push("Pendiente de revisión");
    rowData.push("");

    sheet.appendRow(rowData);

    // Enviar correo automático a los administradores
    var correoDestino = "cirta.contacto@gmail.com";
    var asunto = "Postulante a Voluntariado: " + nombre;
    var cuerpo = "Tienes una nueva postulación de voluntariado desde la web:\n\n" +
                 "Nombre: " + nombre + "\n" +
                 "Email: " + email + "\n" +
                 "Ubicación: " + (params.ubicacion || "") + "\n" +
                 "Intereses: " + intereses + "\n" +
                 "Disponibilidad: " + disponibilidad + " (" + (params.horas_semanales || "0") + " horas semanales)\n\n" +
                 "Experiencia previa:\n" + (params.experiencia || "No indicó") + "\n\n" +
                 "Habilidades específicas:\n" + (params.habilidades || "No indicó") + "\n\n" +
                 "Comentarios adicionales:\n" + (params.comentarios || "Ninguno") + "\n\n" +
                 "Todos los datos han sido guardados automáticamente en tu base de datos (Google Sheets).";

    MailApp.sendEmail({
      to: correoDestino,
      subject: asunto,
      body: cuerpo,
      replyTo: email
    });

    return ContentService.createTextOutput(JSON.stringify({ result: "success" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ result: "error", error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function verifyTurnstile_(token) {
  if (!token) return false;

  var secret = PropertiesService.getScriptProperties().getProperty('TURNSTILE_SECRET_KEY');
  if (!secret) return false;

  var response = UrlFetchApp.fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'post',
    payload: {
      secret: secret,
      response: token
    },
    muteHttpExceptions: true
  });

  var json = JSON.parse(response.getContentText());
  return json.success === true;
}
