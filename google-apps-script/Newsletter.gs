/**
 * Newsletter.gs — Backend de la suscripción al newsletter (Google Apps Script).
 *
 * Este archivo NO vive en el repo web (github.io es estático); vive en un
 * proyecto Apps Script vinculado a una hoja de cálculo nueva "Newsletter".
 *
 * Antes de desplegar:
 * 0. Crea la hoja "Newsletter" y abre Extensiones > Apps Script.
 *    Encabezados sugeridos en la fila 1:
 *      Fecha | Email | Idioma | Página
 * 1. Pega este archivo como Código.gs.
 * 2. Implementar > Nueva implementación > Tipo "Aplicación web"
 *      Ejecutar como: Yo   |   Quién tiene acceso: Cualquier persona
 * 3. Copia la URL /exec en `newsletter_endpoint` de _config.yml.
 *    Mientras ese valor esté vacío, el formulario no se muestra en el sitio.
 *
 * Protección anti-spam: campo trampa (honeypot), validación del email,
 * deduplicación y un tope de suscripciones por hora.
 */

var MAX_SUBSCRIPTIONS_PER_HOUR = 60;

function doPost(e) {
  try {
    var params = e.parameter || {};

    // Honeypot: si viene relleno es un bot. Respondemos éxito sin guardar.
    if (params.website) {
      return respond_({ result: 'success' });
    }

    var email = String(params.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 100) {
      return respond_({ result: 'error', message: 'Email inválido.' });
    }

    if (!withinRateLimit_()) {
      return respond_({ result: 'error', message: 'Intenta de nuevo en unos minutos.' });
    }

    var lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
      var last = sheet.getLastRow();
      if (last > 1) {
        var emails = sheet.getRange(2, 2, last - 1, 1).getValues();
        for (var i = 0; i < emails.length; i++) {
          if (String(emails[i][0]).toLowerCase() === email) {
            // Ya suscrito: respondemos éxito para no revelar quién está en la lista.
            return respond_({ result: 'success' });
          }
        }
      }
      sheet.appendRow([
        new Date(),
        email,
        String(params.lang || '').slice(0, 5),
        String(params.page || '').slice(0, 200)
      ]);
    } finally {
      lock.releaseLock();
    }

    return respond_({ result: 'success' });
  } catch (err) {
    console.error(err);
    return respond_({ result: 'error', message: 'No se pudo completar la suscripción.' });
  }
}

function withinRateLimit_() {
  var cache = CacheService.getScriptCache();
  var key = 'newsletter_' + new Date().toISOString().slice(0, 13); // por hora
  var count = Number(cache.get(key) || 0);
  if (count >= MAX_SUBSCRIPTIONS_PER_HOUR) return false;
  cache.put(key, String(count + 1), 3600);
  return true;
}

function respond_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
