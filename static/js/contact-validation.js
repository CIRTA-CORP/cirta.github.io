// =============================================
// FUNCIONES DE VALIDACIÓN 
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
    if (tel.length > 15) return false;
    let re = /^\+?[0-9\s]+$/;
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
// FUNCIONES DE CONTROL VISUAL 
// =============================================

// Función para mostrar el texto rojo debajo del input
const mostrarError = (idInput, mensaje) => {
    // Seleccionamos el contenedor del mensaje de error
    const errorElement = document.getElementById(`error-${idInput}`);
    // Seleccionamos el input que falló (para pintarle el borde rojo)
    const inputElement = document.getElementById(idInput);
    
    // Le ponemos el texto y lo hacemos visible
    if (errorElement) {
        errorElement.innerText = mensaje;
        errorElement.style.display = 'block';
    }
    // Pintamos el borde del input de rojo
    if (inputElement) {
        inputElement.style.border = '2px solid red';
    }
};

// Función para limpiar todos los errores (se ejecuta al inicio de cada intento)
const limpiarErrores = () => {
    // Oculta todos los textos rojos
    const errorMessages = document.querySelectorAll('.error-msg');
    errorMessages.forEach(msg => {
        msg.style.display = 'none';
        msg.innerText = '';
    });

    // Le quita el borde rojo a los inputs
    const inputs = document.querySelectorAll('.form-control');
    inputs.forEach(input => {
        input.style.border = ''; 
    });
};

// =============================================
//  Validar Formulario
// =============================================
document.addEventListener("DOMContentLoaded", function() {
    
    const form = document.getElementById('formularioContacto');

    // Verificamos que el formulario exista para no causar errores
    if (form) {
        form.addEventListener("submit", function(event) {
            
            // Detenemos el envio automatico 
            event.preventDefault();

            // Limpiamos errores anteriores
            limpiarErrores();

            // Capturamos valores
            const nombre = document.getElementById('nombre').value;
            const email = document.getElementById('email').value;
            const tel = document.getElementById('tel').value;
            const org = document.getElementById('org').value;
            const mensaje = document.getElementById('mensaje').value;

            //  Validamos e inyectamos los mensajes visuales si fallan
            let haveError = false;
            
            if (!validateName(nombre)){
                mostrarError('nombre','El nombre debe tener entre 2 y 50 caracteres.');
                haveError=true
            } 
            if (!validateEmail(email)){
                mostrarError('email','Por favor ingrese un correo electrónico válido');
                haveError=true
            } 
            if (!validateTel(tel)){
                mostrarError('tel','El teléfono/celular debe contener solo números.');
                haveError=true
            } 
            if (!validateORG(org)){
                mostrarError('org','El nombre de la organización es muy corto.');
                haveError=true
            }
            if (!validateMSG(mensaje)){
                mostrarError('mensaje','El mensaje debe tener entre 10 y 50 caracteres.')
                haveError=true
            }

            // Si hay errores nos detenemos
            if (haveError) {
                return;
            }

            //  Si todo está bien, enviamos con AJAX (Fetch)
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