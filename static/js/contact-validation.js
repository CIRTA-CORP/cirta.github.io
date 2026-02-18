// =============================================
// 1. FUNCIONES DE VALIDACIÓN 
// =============================================
const validateName = (nombre) => {
    if (!nombre) return false;
    return nombre.trim().length >= 2 && nombre.trim().length <= 50;
};

const validateEmail = (email) => {
    if (!email) return false;
    let re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email) && email.length <= 100;
};

const validateTel = (tel) => {
    if (!tel) return true; // Opcional
    let re = /^[0-9]+$/;
    return re.test(tel);
};

const validateORG = (org) => {
    if (!org) return true; // Opcional
    return org.trim().length >= 2 && org.trim().length <= 80;
};

const validateMSG = (mensaje) => {
    if (!mensaje) return false; // Obligatorio
    return mensaje.trim().length >= 10 && mensaje.trim().length <= 500;
};

// =============================================
// 2. Validar Formulario
// =============================================
document.addEventListener("DOMContentLoaded", function() {
    
    const form = document.getElementById('formularioContacto');

    // Verificamos que el formulario exista para no causar errores
    if (form) {
        form.addEventListener("submit", function(event) {
            
            // Detenemos el envio automatico 
            event.preventDefault();

            // 1. Capturamos valores
            const nombre = document.getElementById('nombre').value;
            const email = document.getElementById('email').value;
            const tel = document.getElementById('tel').value;
            const org = document.getElementById('org').value;
            const mensaje = document.getElementById('mensaje').value;

            // 2. Validamos
            let invalidInputs = [];
            
            if (!validateName(nombre)) invalidInputs.push("Nombre");
            if (!validateEmail(email)) invalidInputs.push("Email");
            if (!validateTel(tel)) invalidInputs.push("Teléfono");
            if (!validateORG(org)) invalidInputs.push("Organización");
            if (!validateMSG(mensaje)) invalidInputs.push("Mensaje");

            // 3. Si hay errores, avisamos y NO hacemos nada más
            if (invalidInputs.length > 0) {
                alert("Por favor corrige los siguientes campos:\n- " + invalidInputs.join("\n- "));
                return; // Se acaba la función aquí
            }

            // 4. Si todo está bien, enviamos con AJAX (Fetch)
            const confirmacion = confirm('¿Enviar mensaje a CIRTA?');
            
            if (confirmacion) {
                const data = new FormData(form);
                
                // Enviamos los datos "por debajo" sin recargar
                fetch(form.action, {
                    method: form.method,
                    body: data,
                    headers: {
                        'Accept': 'application/json'
                    }
                }).then(response => {
                    if (response.ok) {
                        alert('¡Mensaje enviado con éxito! Volviendo al inicio...');
                        form.reset();
                        window.location.href = "/"; // <-- REDIRECCIÓN AL INICIO
                    } else {
                        alert("Hubo un error al enviar el formulario. Intenta nuevamente.");
                    }
                }).catch(error => {
                    alert("Error de conexión. Revisa tu internet.");
                });
            }
        });
    } else {
        console.error("Error: No se encontró el formulario con ID 'formularioContacto'");
    }
});