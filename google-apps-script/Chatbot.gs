/**
 * Chatbot.gs — Backend del Asistente CIRTA con IA (Google Apps Script + API de Claude).
 *
 * Este archivo NO vive en el repo web (github.io es estático); vive en el
 * proyecto Apps Script vinculado a una hoja de cálculo nueva "Chatbot",
 * donde se registra cada mensaje. Actúa como proxy: la API key de Claude
 * queda guardada en el servidor y nunca se expone en el navegador.
 *
 * Antes de desplegar:
 * 0. Crea la hoja de cálculo "Chatbot" y abre Extensiones > Apps Script.
 *    Encabezados sugeridos en la fila 1:
 *      Fecha | ID conversación | Pregunta | Respuesta | Página
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
  '- Proyectos: Zorzal (clasificación y empaquetamiento robótico de fruta de exportación), monitoreo marítimo con un ROV Chasing M2 S, y EduRobotics (plataforma para aprender robótica desde cero). También ofrecemos talleres (menú "Educación").',
  '- Voluntariado: completar el formulario en la sección "Participa"; el equipo contacta según intereses y disponibilidad.',
  '- Equipo: sección "Nosotros" > "Equipo".',
  '- Contacto: formulario de "Contacto" o contacto@cirta.cl.',
  '- Dirección postal: Av. Rodelillo 4299, Valparaíso, Chile.',
  '- Donaciones: página "Dona" (menú "Participa"), con transferencia bancaria; para aportes mensuales, de empresas o comprobantes, formulario de "Contacto" con motivo "Donaciones".',
  '- Servicios (página "Servicios"): tres modalidades. (1) Consultoría e integración para empresas (diagnóstico tecnológico, integración de robótica, visión computacional e IA, capacitación de equipos): servicio pagado, con cotización según el alcance. (2) Proyectos en colaboración de I+D con universidades, organismos públicos e instituciones, con financiamiento conjunto (fondos concursables, cofinanciamiento o aportes de los socios). (3) Desafíos para la comunidad CIRTA: ONG y startups que recién comienzan envían un desafío y un equipo de voluntarios en formación, guiado por profesionales de CIRTA y con la garantía de la corporación de que el prototipo funcionará como se acordó, lo trabaja como proyecto formativo (cupos limitados); se pide un aporte para materiales básicos y una donación a la corporación; respondemos en 2 días con una estimación de tiempo, pero como lo hacen voluntarios no hay plazo de desarrollo fijo; el código es de CIRTA, la organización recibe el prototipo y CIRTA puede mostrarlo en su portafolio; si hay interés puede pasar a colaboración. Áreas: prototipos robóticos, visión computacional, inspección submarina con ROV y formación.',
  '- Formulario de "Contacto": motivo "Consultoría / cotización para empresas", "Propuesta de colaboración" o "Enviar un desafío (ONG / startup)" según el caso. No des precios para consultoría: la cotización depende del alcance.',
  '- Información legal y directorio: sección "Transparencia".'
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
    logConversation_(body, messages[messages.length - 1].content, reply);
    return respond_({ result: 'success', reply: reply });
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

// Guarda una fila por mensaje. Si falla, no se interrumpe la respuesta al usuario.
function logConversation_(body, question, reply) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    sheet.appendRow([
      new Date(),
      String(body.sessionId || '').slice(0, 40),
      question,
      reply,
      String(body.page || '').slice(0, 200)
    ]);
  } catch (err) {
    console.error(err);
  }
}

function respond_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
