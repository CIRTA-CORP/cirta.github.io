/**
 * Chatbot.gs — Backend del Asistente CIRTA con IA (Google Apps Script + API de Claude).
 *
 * Este archivo NO vive en el repo web (github.io es estático); vive en el
 * proyecto Apps Script vinculado a una hoja de cálculo nueva "Chatbot",
 * donde se registra UNA FILA POR CONVERSACIÓN en la pestaña "Conversaciones"
 * (se crea sola con sus encabezados la primera vez). Actúa como proxy: la API key de Claude
 * queda guardada en el servidor y nunca se expone en el navegador.
 *
 * Antes de desplegar:
 * 0. Crea la hoja de cálculo "Chatbot" y abre Extensiones > Apps Script.
 * 1. Configuración del proyecto (ícono de engranaje) > "Propiedades del script":
 *      ANTHROPIC_API_KEY = <tu API key de https://console.anthropic.com>
 * 2. Implementar > Nueva implementación > Tipo "Aplicación web"
 *      Ejecutar como: Yo   |   Quién tiene acceso: Cualquier persona
 * 3. Copia la URL /exec en CHATBOT_ENDPOINT de static/js/chatbot.js.
 */

var MODEL = 'claude-haiku-5-5';
var MAX_TOKENS = 500;
var MAX_HISTORY = 12;          // mensajes que se reenvían a Claude
var MAX_MESSAGE_LENGTH = 500;  // caracteres por mensaje del usuario
var MAX_REQUESTS_PER_HOUR = 300; // tope global para acotar costos

var SYSTEM_PROMPT = [
  'Eres el Asistente CIRTA, el asistente virtual del sitio web de CIRTA (cirta.cl).',
  'Responde de forma breve (máximo 3-4 oraciones), cordial y en el mismo idioma que use la persona (español, inglés o portugués).',
  'Responde solo sobre CIRTA y temas relacionados (robótica, IA aplicada, educación tecnológica). Si te preguntan algo ajeno, redirige amablemente.',
  'No inventes datos: si no sabes algo, sugiere escribir desde la sección "Contacto" o a contacto@cirta.cl.',
  'Responde en texto plano, sin Markdown.',
  '',
  'Información de CIRTA:',
  '- CIRTA es una corporación sin fines de lucro dedicada a la investigación y desarrollo tecnológico, con foco en robótica e inteligencia artificial aplicada.',
  '- Misión: crear y aplicar conocimiento científico y tecnológico para generar innovaciones con impacto tangible y sostenible, promoviendo un progreso equitativo y colaborativo entre empresas, universidades y la sociedad.',
  '- Visión: una sociedad más justa, resiliente y conectada, donde el avance científico y tecnológico contribuya al desarrollo sostenible y la inclusión social.',
  '- Proyectos: Zorzal (clasificación y empaquetamiento robótico de fruta de exportación; piloto en preparación, sin socios por ahora), monitoreo marítimo con un ROV Chasing M2 S (piloto en desarrollo, enfocado en inspección de cascos de barcos), y EduRobotics (plataforma para aprender robótica desde cero). También ofrecemos workshops (menú "Educación"), de distinto largo y contenido, gratuitos y pagados; por ahora no hay fechas: quien quiera aprender puede registrarse como voluntario/a o suscribirse al newsletter.',
  '- Voluntariado: completar el formulario en la sección "Participa"; el equipo contacta según intereses y disponibilidad. Se buscan personas autodidactas y dispuestas al aprendizaje dirigido, principalmente en los proyectos; la dedicación depende de cada persona y cada uno se pone sus metas.',
  '- Equipo: sección "Nosotros" > "Equipo".',
  '- Contacto: formulario de "Contacto" o contacto@cirta.cl.',
  '- Dirección postal: Av. Rodelillo 4299, Valparaíso, Chile.',
  '- Donaciones: página "Dona" (menú "Participa"). Por seguridad los datos bancarios no se publican: se piden por el formulario de "Contacto" con motivo "Donaciones"; para aportes mensuales, de empresas o comprobantes, formulario de "Contacto" con motivo "Donaciones".',
  '- Servicios (página "Servicios"): tres modalidades. (1) Consultoría e integración para empresas (diagnóstico tecnológico, integración de robótica, visión computacional e IA, capacitación de equipos): servicio pagado, con cotización según el alcance. (2) Proyectos en colaboración de I+D con universidades, organismos públicos e instituciones, con financiamiento conjunto (fondos concursables, cofinanciamiento o aportes de los socios). (3) Desafíos para la comunidad CIRTA: ONG y startups que recién comienzan envían un desafío y un equipo de voluntarios en formación, guiado por profesionales de CIRTA y con la garantía de la corporación de que el prototipo funcionará como se acordó, lo trabaja como proyecto formativo (cupos limitados); se pide un aporte para materiales básicos y una donación a la corporación; respondemos en 2 días con una estimación de tiempo, pero como lo hacen voluntarios no hay plazo de desarrollo fijo; el código es de CIRTA, la organización recibe el prototipo y CIRTA puede mostrarlo en su portafolio; si hay interés puede pasar a colaboración. Áreas: prototipos robóticos, visión computacional, inspección submarina con ROV y formación.',
  '- La conversación inicial con CIRTA es sin costo hasta definir juntos el problema y las necesidades del proyecto.',
  '- Formulario de "Contacto": motivo "Consultoría / cotización para empresas", "Propuesta de colaboración" o "Enviar un desafío (ONG / startup)" según el caso. No des precios para consultoría: la cotización depende del alcance.',
  '- Información legal y directorio: sección "Transparencia".',
  '',
  'Cuando alguien cuente que tiene un proyecto, problema o desafío (o pulse "Tengo un proyecto"):',
  '- Primero entiende el caso conversando: haz UNA pregunta por mensaje, breve y concreta. Averigua, según corresponda: qué problema quiere resolver, en qué contexto u organización, qué ha intentado o con qué cuenta hoy, qué resultado espera y si tiene plazos.',
  '- No propongas una reunión ni menciones agendar hasta tener claro el problema, el contexto y el objetivo (normalmente después de 3 o 4 respuestas de la persona). Si la persona pide reunirse antes, acéptalo.',
  '- Cuando ya entiendas el caso, resume en una oración lo que entendiste y propón conversarlo con el equipo en una reunión breve. Antes de dar el botón, pide el nombre de la persona y el nombre de su empresa u organización (si ya los dijo, no los vuelvas a pedir; si no tiene empresa, acepta "Particular").',
  '- Cuando tengas nombre y empresa, confirma en una oración que puede agendar con el botón y termina tu mensaje con la marca [[REUNION|Nombre|Empresa]] (exactamente con ese formato, al final, sin el carácter | dentro de los datos). Ejemplo: [[REUNION|Ana Pérez|Frutícola Sur]]. El sitio mostrará el botón para agendar.',
  '- Nunca escribas enlaces de agenda ni URLs de Calendly u otros; usa solo la marca, y solo una vez por conversación.'
].join('\n');

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var messages = sanitizeMessages_(body.messages);
    if (!messages) {
      return respond_({ result: 'error', message: 'Mensaje inválido.' });
    }
    if (!withinRateLimit_()) {
      return respond_({ result: 'error', message: 'El asistente está muy ocupado. Intenta en unos minutos.' });
    }
    var reply = callClaude_(messages);
    var logStatus = logConversation_(body, messages[messages.length - 1].content, reply);
    return respond_({ result: 'success', reply: reply, log: logStatus });
  } catch (err) {
    console.error(err);
    return respond_({ result: 'error', message: 'No pude responder ahora. Intenta más tarde.' });
  }
}

// Valida el historial recibido desde el navegador: roles alternados,
// textos no vacíos y acotados, terminando en un mensaje del usuario.
function sanitizeMessages_(raw) {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  var msgs = raw.slice(-MAX_HISTORY).map(function (m) {
    return {
      role: m && m.role === 'assistant' ? 'assistant' : 'user',
      content: String((m && m.content) || '').trim().slice(0, MAX_MESSAGE_LENGTH)
    };
  }).filter(function (m) { return m.content; });

  while (msgs.length && msgs[0].role !== 'user') msgs.shift();
  if (!msgs.length || msgs[msgs.length - 1].role !== 'user') return null;
  for (var i = 1; i < msgs.length; i++) {
    if (msgs[i].role === msgs[i - 1].role) return null;
  }
  return msgs;
}

function withinRateLimit_() {
  var cache = CacheService.getScriptCache();
  var key = 'chat_count_' + Utilities.formatDate(new Date(), 'UTC', 'yyyyMMddHH');
  var lock = LockService.getScriptLock();
  lock.waitLock(5000);
  try {
    var count = Number(cache.get(key) || 0);
    if (count >= MAX_REQUESTS_PER_HOUR) return false;
    cache.put(key, String(count + 1), 3600);
    return true;
  } finally {
    lock.releaseLock();
  }
}

function callClaude_(messages) {
  var apiKey = PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY');
  var res = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    payload: JSON.stringify({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      messages: messages
    }),
    muteHttpExceptions: true
  });

  if (res.getResponseCode() !== 200) {
    throw new Error('Claude API ' + res.getResponseCode() + ': ' + res.getContentText());
  }
  var data = JSON.parse(res.getContentText());
  return data.content
    .filter(function (block) { return block.type === 'text'; })
    .map(function (block) { return block.text; })
    .join('');
}

// Registro: UNA FILA POR CONVERSACIÓN (pestaña "Conversaciones").
// Cada mensaje actualiza la fila de su sesión: se agrega la pregunta y la
// respuesta al texto de la conversación. Si la IA ofrece la reunión con la
// marca [[REUNION|Nombre|Empresa]], se completan Nombre, Empresa y Reunión.
// Si el registro falla, no se interrumpe la respuesta al usuario.
var LOG_SHEET = 'Conversaciones';
var LOG_HEADERS = ['Inicio', 'Última actividad', 'ID conversación', 'Página',
  'Nombre', 'Empresa', 'Reunión ofrecida', 'Mensajes', 'Conversación'];
var MEETING_RE = /\[\[REUNION(?:\|([^|\]]*))?(?:\|([^\]]*))?\]\]/;

function logConversation_(body, question, reply) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    // Planilla: la vinculada al proyecto, o la indicada en la propiedad
    // del script CHATBOT_SHEET_ID (si el proyecto no está vinculado a una hoja).
    var sheetId = PropertiesService.getScriptProperties().getProperty('CHATBOT_SHEET_ID');
    var ss = sheetId ? SpreadsheetApp.openById(sheetId.trim()) : SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) return 'error: el proyecto no está vinculado a una planilla (define CHATBOT_SHEET_ID)';
    var sheet = ss.getSheetByName(LOG_SHEET);
    if (!sheet) {
      sheet = ss.insertSheet(LOG_SHEET, 0);
      sheet.appendRow(LOG_HEADERS);
      sheet.setFrozenRows(1);
    }

    var sessionId = String(body.sessionId || '').slice(0, 40) || 'sin-id';
    var now = new Date();
    var meeting = String(reply).match(MEETING_RE);
    var cleanReply = String(reply).replace(MEETING_RE, '').trim();
    var turn = 'Persona: ' + question + '\nAsistente: ' + cleanReply;

    var found = sheet.getRange('C:C').createTextFinder(sessionId)
      .matchEntireCell(true).findNext();

    if (!found) {
      sheet.appendRow([
        now, now, sessionId, String(body.page || '').slice(0, 200),
        meeting ? (meeting[1] || '').trim() : '',
        meeting ? (meeting[2] || '').trim() : '',
        meeting ? now : '',
        1,
        turn
      ]);
      return 'ok';
    }

    var row = found.getRow();
    var values = sheet.getRange(row, 1, 1, LOG_HEADERS.length).getValues()[0];
    values[1] = now;
    if (meeting) {
      if (meeting[1]) values[4] = meeting[1].trim();
      if (meeting[2]) values[5] = meeting[2].trim();
      if (!values[6]) values[6] = now;
    }
    values[7] = Number(values[7] || 0) + 1;
    // Una celda admite ~50.000 caracteres: se conserva lo más reciente.
    values[8] = (String(values[8] || '') + '\n\n' + turn).slice(-49000);
    sheet.getRange(row, 1, 1, LOG_HEADERS.length).setValues([values]);
    return 'ok';
  } catch (err) {
    console.error(err);
    return 'error: ' + String(err && err.message || err).slice(0, 200);
  } finally {
    lock.releaseLock();
  }
}

function respond_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
