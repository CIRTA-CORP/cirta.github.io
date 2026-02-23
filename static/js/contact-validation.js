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
                mostrarError('tel','Por favor ingrese un numero de teléfono/celular válido');
                haveError=true
            } 
            if (!validateORG(org)){
                mostrarError('org','El nombre de la organización es muy corto.');
                haveError=true
            }
            if (!validateMSG(mensaje)){
                mostrarError('mensaje','El mensaje debe tener entre 10 y 500 caracteres.')
                haveError=true
            }

            // Si hay errores nos detenemos
            if (haveError) {
                return;
            }

            //  Si todo está bien, preparamos y mostramos el modal
            const modalUI = document.getElementById('modalConfirmacion');
            modalUI.querySelector('h3').innerText = '¿Estás seguro?';
            modalUI.querySelector('p').innerText = 'Revisa que tus datos sean correctos antes de enviar tu mensaje a CIRTA.';
            document.querySelector('.modal-buttons').style.display = 'flex'; // Aseguramos que los botones se vean
            
            modalUI.style.display = 'flex';
        });
    } else {
        console.error("Error: No se encontró el formulario con ID 'formularioContacto'");
    }
    // =============================================
    // CONTROL DEL MODAL (Botones Volver y Mandar)
    // =============================================
    const modal = document.getElementById('modalConfirmacion');
    const btnVolver = document.getElementById('btn-volver');
    const btnMandar = document.getElementById('btn-mandar');

    // Acción: El usuario se arrepiente y quiere editar
    if (btnVolver) {
        btnVolver.addEventListener('click', function() {
            modal.style.display = 'none'; // Oculta el modal
        });
    }

    // Acción: El usuario confirma el envío
    if (btnMandar) {
        btnMandar.addEventListener('click', function() {
            //MODAL modo cargando ...
            modal.querySelector('h3').innerText = 'Enviando mensaje...';
            modal.querySelector('p').innerText = 'Por favor espera un momento.';
            document.querySelector('.modal-buttons').style.display = 'none'; // Ocultamos botones para evitar doble clic

            const data = new FormData(form);
            
            // Enviamos los datos a Google Apps Script
            fetch(form.action, {
                method: form.method,
                body: data,
                headers: { 'Accept': 'application/json' }
            }).then(response => {
                if (response.ok) {
                    modal.querySelector('h3').innerText = '¡Mensaje enviado con éxito!';
                    modal.querySelector('p').innerText = 'Serás redirigido al inicio...';
                    // Redirigimos automáticamente después de 2 segundos (2000 ms)
                    setTimeout(() => {
                        form.reset();
                        window.location.href = "/";
                    }, 2000);
                } else {
                    // MODO ERROR
                    modal.querySelector('h3').innerText = 'Hubo un error';
                    modal.querySelector('p').innerText = 'No se pudo enviar. Intenta nuevamente.';
                    
                    // Restauramos los botones y cerramos el modal después de 3 segundos
                    setTimeout(() => { 
                        modal.style.display = 'none'; 
                    }, 3000);
                
                }
            }).catch(error => {
                // MODO ERROR DE RED
                modal.querySelector('h3').innerText = 'Error de conexión';
                modal.querySelector('p').innerText = 'Revisa tu internet e intenta nuevamente.';
                
                setTimeout(() => { 
                    modal.style.display = 'none'; 
                }, 3000);
            });
        });
    }
});          