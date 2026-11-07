// Asistente CIRTA: chat con IA (Claude) a través de un backend en Google Apps Script.
// La API key vive en el servidor (google-apps-script/Chatbot.gs), nunca en el navegador.
document.addEventListener("DOMContentLoaded", function () {
    var CHATBOT_ENDPOINT = "https://script.google.com/macros/s/AKfycbzJRYvJXe45a5GP2hdry3ymOOpP-ZYzZDAwjvh53MAUeuA4EAIavykbuWgk8FTIVDCNXg/exec";

    // Textos según el idioma de la página (<html lang="es|en|pt">).
    var I18N = {
        es: {
            error: "No pude responder ahora. Intenta de nuevo o escríbenos desde la sección \"Contacto\".",
            greeting: "¡Hola! Soy el asistente de CIRTA. ¿En qué te puedo ayudar?",
            typing: "Escribiendo...",
            quickReplies: ["¿Qué es CIRTA?", "Proyectos", "Tengo un proyecto", "Quiero ser voluntario/a", "Contacto"]
        },
        en: {
            error: "I couldn't answer right now. Please try again or write to us from the \"Contact\" page.",
            greeting: "Hi! I'm the CIRTA assistant. How can I help you?",
            typing: "Typing...",
            quickReplies: ["What is CIRTA?", "Projects", "I have a project", "I want to volunteer", "Contact"]
        },
        pt: {
            error: "Não consegui responder agora. Tente novamente ou escreva para nós pela página \"Contato\".",
            greeting: "Olá! Sou o assistente da CIRTA. Como posso ajudar?",
            typing: "Digitando...",
            quickReplies: ["O que é a CIRTA?", "Projetos", "Tenho um projeto", "Quero ser voluntário/a", "Contato"]
        }
    };
    var T = I18N[(document.documentElement.lang || "es").slice(0, 2)] || I18N.es;
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
                history.push({ role: "assistant", content: data.reply });
                typing.remove();
                addMessage(data.reply, "bot");
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
