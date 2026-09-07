// Asistente CIRTA: responde preguntas frecuentes por coincidencia de palabras clave.
// No usa ningún servicio de IA externo ni backend: corre 100% en el navegador.
document.addEventListener("DOMContentLoaded", function () {
    var FAQS = [
        {
            keywords: ["hola", "buenas", "hey", "hi"],
            answer: "¡Hola! Soy el asistente de CIRTA. Puedo ayudarte con información sobre nuestros proyectos, cómo ser voluntario/a, contacto o quiénes somos."
        },
        {
            keywords: ["que es cirta", "qué es cirta", "quienes son", "quiénes son", "corporacion", "corporación"],
            answer: "CIRTA es una corporación sin fines de lucro dedicada a la investigación y desarrollo tecnológico, con foco en robótica e inteligencia artificial aplicada."
        },
        {
            keywords: ["mision", "misión"],
            answer: "Nuestra misión: crear y aplicar conocimiento científico y tecnológico para generar innovaciones con impacto tangible y sostenible, promoviendo un progreso equitativo y colaborativo entre empresas, universidades y la sociedad."
        },
        {
            keywords: ["vision", "visión"],
            answer: "Nuestra visión: aspiramos a una sociedad más justa, resiliente y conectada, donde el avance científico y tecnológico contribuya al desarrollo sostenible y la inclusión social."
        },
        {
            keywords: ["proyecto", "proyectos", "agrobot", "edurobotics"],
            answer: "Tenemos dos proyectos principales: <b>AgroBot</b> (clasificación y empaquetamiento robótico de fruta de exportación) y <b>EduRobotics</b> (plataforma para aprender robótica desde cero). Puedes ver más en el menú \"Proyectos\"."
        },
        {
            keywords: ["voluntari", "participar", "sumarme", "colaborar"],
            answer: "¡Genial que quieras sumarte! Completa el formulario de voluntariado en la sección \"Participa\" y nos pondremos en contacto contigo según tus intereses y disponibilidad."
        },
        {
            keywords: ["equipo", "quienes trabajan", "quiénes trabajan", "team"],
            answer: "Puedes conocer a todo el equipo de CIRTA en la sección \"Nosotros\" &gt; \"Equipo\"."
        },
        {
            keywords: ["contacto", "email", "correo", "telefono", "teléfono", "escribir"],
            answer: "Puedes escribirnos por el formulario de \"Contacto\" en el menú, o directamente a cirta.contacto@gmail.com."
        },
        {
            keywords: ["direccion", "dirección", "ubicacion", "ubicación", "donde estan", "dónde están"],
            answer: "Nuestra dirección postal es Av. Rodelillo 4299, Valparaíso, Chile."
        },
        {
            keywords: ["donacion", "donación", "donar", "aportar dinero"],
            answer: "Puedes indicar tu interés en donaciones a través del formulario de \"Contacto\", seleccionando el motivo \"Donaciones\"."
        },
        {
            keywords: ["transparencia", "legal", "rut", "directorio"],
            answer: "La información legal y el directorio de CIRTA están disponibles en la sección \"Transparencia\"."
        },
        {
            keywords: ["gracias", "genial", "perfecto"],
            answer: "¡De nada! Si necesitas algo más, aquí estoy."
        }
    ];

    var FALLBACK = "No tengo una respuesta para eso todavía. Prueba preguntando sobre nuestros proyectos, cómo ser voluntario/a, el equipo o cómo contactarnos, o escríbenos directamente desde la sección \"Contacto\".";

    var QUICK_REPLIES = ["¿Qué es CIRTA?", "Proyectos", "Quiero ser voluntario/a", "Contacto"];

    function normalize(text) {
        return text
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
    }

    function findAnswer(text) {
        var normalized = normalize(text);
        for (var i = 0; i < FAQS.length; i++) {
            var faq = FAQS[i];
            for (var j = 0; j < faq.keywords.length; j++) {
                if (normalized.indexOf(normalize(faq.keywords[j])) !== -1) {
                    return faq.answer;
                }
            }
        }
        return FALLBACK;
    }

    var toggleBtn = document.getElementById("cirta-chatbot-toggle");
    var closeBtn = document.getElementById("cirta-chatbot-close");
    var win = document.getElementById("cirta-chatbot-window");
    var messages = document.getElementById("cirta-chatbot-messages");
    var quickReplies = document.getElementById("cirta-chatbot-quick-replies");
    var form = document.getElementById("cirta-chatbot-form");
    var input = document.getElementById("cirta-chatbot-input");

    function addMessage(text, from) {
        var el = document.createElement("div");
        el.className = "cirta-msg cirta-msg-" + from;
        el.innerHTML = text;
        messages.appendChild(el);
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
        if (!text.trim()) return;
        addMessage(text, "user");
        input.value = "";
        setTimeout(function () {
            addMessage(findAnswer(text), "bot");
        }, 300);
    }

    var initialized = false;
    function openChat() {
        win.hidden = false;
        if (!initialized) {
            addMessage("¡Hola! Soy el asistente de CIRTA. ¿En qué te puedo ayudar?", "bot");
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
