// =============================================
// VALIDATION FUNCTIONS
// =============================================
const validateName = (nombre) => {
    if (!nombre) return false;     // requeried 
    return nombre.trim().length >= 2 && nombre.trim().length <= 50;
};

const validateEmail = (email) => {
    if (!email) return false;     // requeried 
    let re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email) && email.length <= 100;
};

const validateTel = (tel) => {
    if (!tel) return true;    // Optional
    if (tel.length > 15) return false;
    let re = /^\+?[0-9\s]+$/;
    return re.test(tel);
};

const validateORG = (org) => {
    if (!org) return true;    // Optional
    return org.trim().length >= 2 && org.trim().length <= 80;
};

const validateMSG = (mensaje) => {
    if (!mensaje) return false;   // requeried 
    return mensaje.trim().length >= 10 && mensaje.trim().length <= 500;
};

// =============================================
// VISUAL CONTROL FUNCTIONS 
// =============================================

// Error state: add red text
const showError = (idInput, mensaje) => {
    const errorElement = document.getElementById(`error-${idInput}`);
    const inputElement = document.getElementById(idInput);
    if (errorElement) {
        errorElement.innerText = mensaje;
        errorElement.style.display = 'block';
    }
    if (inputElement) {
        inputElement.style.border = '2px solid red';
    }
};

// Function to clear all errors
const clearErrors = () => {
    const errorMessages = document.querySelectorAll('.error-msg');
    errorMessages.forEach(msg => {
        msg.style.display = 'none';
        msg.innerText = '';
    });
    const inputs = document.querySelectorAll('.form-control');
    inputs.forEach(input => {
        input.style.border = ''; 
    });
};

// =============================================
//  Validate Form
// =============================================

document.addEventListener("DOMContentLoaded", function() {
    
    const form = document.getElementById('formularioContacto');

    if (form) {
        form.addEventListener("submit", function(event) {

            event.preventDefault();
            clearErrors();

            const nombre = document.getElementById('nombre').value;
            const email = document.getElementById('email').value;
            const tel = document.getElementById('tel').value;
            const org = document.getElementById('org').value;
            const mensaje = document.getElementById('mensaje').value;

            //  Validate and inject the visual messages if they fail
            let haveError = false;
            
            if (!validateName(nombre)){
                showError('nombre','El nombre debe tener entre 2 y 50 caracteres.');
                haveError=true
            } 
            if (!validateEmail(email)){
                showError('email','Por favor ingrese un correo electrónico válido');
                haveError=true
            } 
            if (!validateTel(tel)){
                showError('tel','Por favor ingrese un numero de teléfono/celular válido');
                haveError=true
            } 
            if (!validateORG(org)){
                showError('org','El nombre de la organización es muy corto.');
                haveError=true
            }
            if (!validateMSG(mensaje)){
                showError('mensaje','El mensaje debe tener entre 10 y 500 caracteres.')
                haveError=true
            }

            if (haveError) {
                return;
            }

            // If all is okey, show the modal for confirmation 
            const modalUI = document.getElementById('modalConfirmacion');
            modalUI.querySelector('h3').innerText = '¿Estás seguro?';
            modalUI.querySelector('p').innerText = 'Revisa que tus datos sean correctos antes de enviar tu mensaje a CIRTA.';
            document.querySelector('.modal-buttons').style.display = 'flex'; 
            
            modalUI.style.display = 'flex';
        });
    } else {
        console.error("Error: No se encontró el formulario con ID 'formularioContacto'");
    }
    // =============================================
    // MODAL CONTROL (Back and Send buttons)
    // =============================================

    const modal = document.getElementById('modalConfirmacion');
    const btnVolver = document.getElementById('btn-volver');
    const btnMandar = document.getElementById('btn-mandar');

    // Action: The user regrets their decision and wants to edit.
    if (btnVolver) {
        btnVolver.addEventListener('click', function() {
            modal.style.display = 'none'; 
        });
    }

    // Action: The user confirms the shipment
    if (btnMandar) {
        btnMandar.addEventListener('click', function() {
            //MODAL modo cargando ...
            modal.querySelector('h3').innerText = 'Enviando mensaje...';
            modal.querySelector('p').innerText = 'Por favor espera un momento.';
            document.querySelector('.modal-buttons').style.display = 'none'; 

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
                    // We automatically redirect after 2 seconds (2000 ms)
                    setTimeout(() => {
                        form.reset();
                        window.location.href = "/";
                    }, 2000);
                } else {
                    
                    // ERROR MODE
                    modal.querySelector('h3').innerText = 'Hubo un error';
                    modal.querySelector('p').innerText = 'No se pudo enviar. Intenta nuevamente.';
                    
                    // Restore the buttons and close the modal after 3 seconds
                    setTimeout(() => { 
                        modal.style.display = 'none'; 
                    }, 3000);
                
                }
            }).catch(error => {
                // NETWORK ERROR MODE
                modal.querySelector('h3').innerText = 'Error de conexión';
                modal.querySelector('p').innerText = 'Revisa tu internet e intenta nuevamente.';
                
                setTimeout(() => { 
                    modal.style.display = 'none'; 
                }, 3000);
            });
        });
    }
});          