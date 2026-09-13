/**
 * Codigo.gs — Backend del formulario de Contacto (Google Apps Script).
 *
 * Este archivo NO vive en el repo web (github.io es estático); vive en el
 * proyecto Apps Script vinculado a la hoja de cálculo "Contactos".
 * Cópialo dentro de Extensiones > Apps Script y reemplaza el doPost actual.
 *
 * Antes de desplegar:
 * 1. Abre el proyecto Apps Script > Configuración del proyecto (ícono de
 *    engranaje) > "Propiedades del script" y agrega:
 *      TURNSTILE_SECRET_KEY = <Secret Key de Cloudflare Turnstile>
 * 2. Implementar > Gestionar implementaciones > editar > Nueva versión > Implementar.
 */

function doPost(e) {
  var params = e.parameter;

  // 1) Honeypot: si el campo trampa viene relleno, es un bot.
  //    Respondemos "éxito" para no delatar el filtro, pero no guardamos nada.
  if (params.website) {
    return respond_({ result: 'success' });
  }

  // 2) Verificación de Turnstile.
  var turnstileToken = params['cf-turnstile-response'];
  if (!verifyTurnstile_(turnstileToken)) {
    return respond_({ result: 'error', message: 'Verificación de seguridad fallida.' });
  }

  // 3) Revalidación de campos en servidor (no confiar solo en el JS del navegador).
  var nombre = (params.nombre || '').trim();
  var email = (params.email || '').trim();
  var telefono = (params.telefono || '').trim();
  var organizacion = (params.organizacion || '').trim();
  var mensaje = (params.mensaje || '').trim();

  if (nombre.length < 2 || nombre.length > 50) {
    return respond_({ result: 'error', message: 'Nombre inválido.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 100) {
    return respond_({ result: 'error', message: 'Email inválido.' });
  }
  if (telefono && (telefono.length > 15 || !/^\+?[0-9\s]+$/.test(telefono))) {
    return respond_({ result: 'error', message: 'Teléfono inválido.' });
  }
  if (organizacion && (organizacion.length < 2 || organizacion.length > 80)) {
    return respond_({ result: 'error', message: 'Organización inválida.' });
  }
  if (mensaje.length < 10 || mensaje.length > 500) {
    return respond_({ result: 'error', message: 'Mensaje inválido.' });
  }

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  sheet.appendRow([
    new Date(),
    nombre,
    email,
    telefono,
    organizacion,
    params.motivo || '',
    mensaje
  ]);

  MailApp.sendEmail({
    to: 'cirta.contacto@gmail.com',
    replyTo: email,
    subject: params._subject || 'Nuevo contacto desde web CIRTA',
    body: 'Nombre: ' + nombre + '\n' +
          'Email: ' + email + '\n' +
          'Teléfono: ' + telefono + '\n' +
          'Organización: ' + organizacion + '\n' +
          'Motivo: ' + (params.motivo || '') + '\n\n' +
          mensaje
  });

  return respond_({ result: 'success' });
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

function respond_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
