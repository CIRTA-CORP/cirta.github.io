// Asistente CIRTA: chat con IA (Claude) a través de un backend en Google Apps Script.
// La API key vive en el servidor (google-apps-script/Chatbot.gs), nunca en el navegador.
document.addEventListener("DOMContentLoaded", function () {
    // Enlace para agendar reunión (p. ej. página de citas de Google Calendar o Calendly).
    // Si está vacío, el chatbot ofrece el formulario de contacto con el motivo "proyecto".
    var MEETING_URL = "https://calendly.com/lmmartiner/30min";

    var CHATBOT_ENDPOINT = "https://script.google.com/macros/s/AKfycbzJRYvJXe45a5GP2hdry3ymOOpP-ZYzZDAwjvh53MAUeuA4EAIavykbuWgk8FTIVDCNXg/exec";

    // Textos según el idioma de la página (<html lang="es|en|pt">).
    var I18N = {
        es: {
            error: "No pude responder ahora. Intenta de nuevo o escríbenos desde la sección \"Contacto\".",
            greeting: "¡Hola! Soy el asistente de CIRTA. ¿En qué te puedo ayudar?",
            typing: "Escribiendo...",
            meetingText: "¿Quieres conversarlo con nuestro equipo?",
            meetingBtn: "Agendar una reunión",
            contactBtn: "Contarnos tu proyecto",
            quickReplies: ["¿Qué es CIRTA?", "Proyectos", "Tengo un proyecto", "Quiero ser voluntario/a", "Contacto"]
        },
        en: {
            error: "I couldn't answer right now. Please try again or write to us from the \"Contact\" page.",
            greeting: "Hi! I'm the CIRTA assistant. How can I help you?",
            typing: "Typing...",
            meetingText: "Would you like to talk it through with our team?",
            meetingBtn: "Book a meeting",
            contactBtn: "Tell us about your project",
            quickReplies: ["What is CIRTA?", "Projects", "I have a project", "I want to volunteer", "Contact"]
        },
        pt: {
            error: "Não consegui responder agora. Tente novamente ou escreva para nós pela página \"Contato\".",
            greeting: "Olá! Sou o assistente da CIRTA. Como posso ajudar?",
            typing: "Digitando...",
            meetingText: "Quer conversar sobre isso com a nossa equipe?",
            meetingBtn: "Agendar uma reunião",
            contactBtn: "Conte-nos sobre seu projeto",
            quickReplies: ["O que é a CIRTA?", "Projetos", "Tenho um projeto", "Quero ser voluntário/a", "Contato"]
        }
    };
    var LANG = (document.documentElement.lang || "es").slice(0, 2);
    var T = I18N[LANG] || I18N.es;
    var LANG_PREFIX = (LANG === "en" || LANG === "pt") ? "/" + LANG : "";
    // Marca que agrega la IA cuando ya entendió el caso y corresponde ofrecer reunión.
    var MEETING_MARKER = "[[REUNION]]";
    var meetingOffered = false;
    var ERROR_MESSAGE = T.error;
    var QUICK_REPLIES = T.quickReplies;

    var toggleBtn = document.getElementById("cirta-chatbot-toggle");
    var closeBtn = document.getElementById("cirta-chatbot-close");
    var win = document.getElementById("cirta-chatbot-window");
    var messages = document.getElementById("cirta-chatbot-messages");
    var quickReplies = document.getElementById("cirta-chatbot-quick-replies");
    var form = document.getElementById("cirta-chatbot-form");
    var input = document.getElementById("cirta-chatbot-input");

    // Historial que se envía a Claude (sin el saludo inicial, que es local).
    var history = [];
    // ID aleatorio para agrupar los mensajes de esta visita en la planilla.
    var sessionId = Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
    var waiting = false;

    function addMessage(text, from) {
        var el = document.createElement("div");
        el.className = "cirta-msg cirta-msg-" + from;
        // textContent: las respuestas de la IA nunca se interpretan como HTML.
        el.textContent = text;
        messages.appendChild(el);
        messages.scrollTop = messages.scrollHeight;
        return el;
    }

    // Botón para agendar reunión (o ir al formulario). Solo se muestra cuando la IA,
    // tras entender el problema, agrega la marca [[REUNION]] a su respuesta.
    function offerMeeting() {
        if (meetingOffered) return;
        meetingOffered = true;
        var el = addMessage(T.meetingText, "bot");
        var link = document.createElement("a");
        link.className = "cirta-msg-action";
        if (MEETING_URL) {
            link.href = MEETING_URL;
            link.target = "_blank";
            link.rel = "noopener";
            link.textContent = T.meetingBtn;
        } else {
            link.href = LANG_PREFIX + "/contact.html?motivo=proyecto";
            link.textContent = T.contactBtn;
        }
        el.appendChild(document.createElement("br"));
        el.appendChild(link);
        messages.scrollTop = messages.scrollHeight;
    }

    function renderQuickReplies() {
        quickReplies.innerHTML = "";
        QUICK_REPLIES.forEach(function (label) {
            var btn = document.createElement("button");
            btn.type = "button";
            btn.className = "cirta-quick-reply";
            btn.textContent = label;
            btn.addEventListener("click", function () {
                handleUserMessage(label);
            });
            quickReplies.appendChild(btn);
        });
    }

    function handleUserMessage(text) {
        text = text.trim();
        if (!text || waiting) return;
        addMessage(text, "user");
        input.value = "";
        quickReplies.innerHTML = "";
        history.push({ role: "user", content: text });

        waiting = true;
        var typing = addMessage(T.typing, "bot");
        typing.classList.add("cirta-msg-typing");

        // text/plain evita el preflight CORS, que Apps Script no soporta.
        fetch(CHATBOT_ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({ messages: history, sessionId: sessionId, page: location.pathname })
        })
            .then(function (res) { return res.json(); })
            .then(function (data) {
                if (data.result !== "success") throw new Error(data.message || ERROR_MESSAGE);
                var reply = String(data.reply || "");
                var wantsMeeting = reply.indexOf(MEETING_MARKER) !== -1;
                // Se quita la marca y cualquier enlace de agenda que la IA haya escrito.
                reply = reply.split(MEETING_MARKER).join("")
                    .replace(/https?:\/\/(www\.)?calendly\.com\/\S*/gi, "")
                    .trim();
                history.push({ role: "assistant", content: reply });
                typing.remove();
                addMessage(reply, "bot");
                if (wantsMeeting) offerMeeting();
            })
            .catch(function (err) {
                // Se descarta la pregunta sin respuesta para mantener roles alternados.
                history.pop();
                typing.remove();
                addMessage(err && err.message && err.message !== "Failed to fetch" ? err.message : ERROR_MESSAGE, "bot");
            })
            .finally(function () {
                waiting = false;
                input.focus();
            });
    }

    var initialized = false;
    function openChat() {
        win.hidden = false;
        if (!initialized) {
            addMessage(T.greeting, "bot");
            renderQuickReplies();
            initialized = true;
        }
        input.focus();
    }

    toggleBtn.addEventListener("click", function () {
        if (win.hidden) {
            openChat();
        } else {
            win.hidden = true;
        }
    });

    closeBtn.addEventListener("click", function () {
        win.hidden = true;
    });

    form.addEventListener("submit", function (e) {
        e.preventDefault();
        handleUserMessage(input.value);
    });
});
