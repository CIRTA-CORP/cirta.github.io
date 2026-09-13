/**
 * API.gs — Fragmento a insertar al inicio de doPost(e) del proyecto Apps
 * Script de Voluntariado, antes de la lógica existente que guarda la
 * postulación en Google Sheets.
 *
 * Requiere la misma propiedad de script que Contacto:
 *   TURNSTILE_SECRET_KEY = <Secret Key de Cloudflare Turnstile>
 * (Configuración del proyecto > Propiedades del script)
 */

function doPost(e) {
  var params = e.parameter;

  // 1) Honeypot: descarta en silencio si el bot rellenó el campo trampa.
  if (params.website) {
    return ContentService
      .createTextOutput(JSON.stringify({ result: 'success' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // 2) Verificación de Turnstile.
  if (!verifyTurnstile_(params['cf-turnstile-response'])) {
    return ContentService
      .createTextOutput(JSON.stringify({ result: 'error', message: 'Verificación de seguridad fallida.' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // 3) Revalidación de campos obligatorios (mismas reglas que
  //    static/js/volunteer-validation.js, pero en servidor).
  var nombre = (params.nombre || '').trim();
  var email = (params.email || '').trim();
  var disponibilidad = (params.disponibilidad || '').trim();
  var horas = Number(params.horas_semanales);

  if (nombre.length < 4 || nombre.length > 50) {
    return ContentService
      .createTextOutput(JSON.stringify({ result: 'error', message: 'Nombre inválido.' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 100) {
    return ContentService
      .createTextOutput(JSON.stringify({ result: 'error', message: 'Email inválido.' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  if (disponibilidad.length < 4 || disponibilidad.length > 150) {
    return ContentService
      .createTextOutput(JSON.stringify({ result: 'error', message: 'Disponibilidad inválida.' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  if (isNaN(horas) || horas < 1 || horas > 40) {
    return ContentService
      .createTextOutput(JSON.stringify({ result: 'error', message: 'Horas semanales inválidas.' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // --- A partir de aquí sigue la lógica original de doPost(e) de API.gs ---
  // (guardar la fila en Sheets con estado "Pendiente de revisión", etc.)
}

// La misma función auxiliar que en Codigo.gs — cópiala también aquí si
// API.gs no la tiene ya definida.
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
