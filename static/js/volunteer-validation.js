// =============================================
// VALIDATION FUNCTIONS
// =============================================
const validateName = (nombre) => {
    if (!nombre) return false;    // requeried 
    return nombre.trim().length >= 4 && nombre.trim().length <= 50;
};

const validateEmail = (email) => {
    if (!email) return false;      // requeried 
    let re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email) && email.length <= 100;
};

const validateLocation = (ubicacion) => {
    if (!ubicacion) return true;         // Optional
    return ubicacion.trim().length >= 2 && ubicacion.trim().length <= 80;
};

const validateAvailability = (disp) => {
    if (!disp) return false;            // requeried
    return disp.trim().length >= 4 && disp.trim().length <= 150;
};

const validateHours = (horas) => {
    if (!horas) return false;     // requeried 
    return !isNaN(horas) && Number(horas) >= 1 && Number(horas) <= 40; 
};

// =============================================
// VISUAL CONTROL FUNCTIONS 
// =============================================

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

const clearErrors = () => {
    const errorMessages = document.querySelectorAll('.error-msg');
    errorMessages.forEach(msg => {
        msg.style.display = 'none';
        msg.innerText = '';
    });
    const inputs = document.querySelectorAll('.form-control, input[type="checkbox"]');
    inputs.forEach(input => {
        input.style.border = ''; 
        input.style.outline = ''; // for the checkboxes
    });
};

// =============================================
// Validate Form & Dynamic UI
// =============================================

document.addEventListener("DOMContentLoaded", function() {
    
    const form = document.getElementById('formularioVoluntario'); 
    
    // Dynamic logic to show/hide the "Otro" field
    const checkOtro = document.getElementById('check-otro');
    const inputOtro = document.getElementById('interes_otro');
    
    if (checkOtro && inputOtro) {
        checkOtro.addEventListener('change', (e) => {
            if(e.target.checked) {
                inputOtro.style.display = 'block';
                inputOtro.focus();
            } else {
                inputOtro.style.display = 'none';
                inputOtro.value = ''; // Clear the input value when unchecked
            }
        });
    }

    if (form) {
        form.addEventListener("submit", function(event) {
            event.preventDefault();
            clearErrors();

            const nombre = document.getElementById('nombre').value;
            const email = document.getElementById('email').value;
            const ubicacion = document.getElementById('ubicacion').value;
            const disponibilidad = document.getElementById('disponibilidad').value;
            const horasSemanales = document.getElementById('horas_semanales').value;
            const terminos = document.getElementById('terminos').checked;
            const interesesSeleccionados = document.querySelectorAll('input[name="intereses"]:checked');

            let haveError = false;
            
            if (!validateName(nombre)){
                showError('nombre','El nombre debe tener entre 2 y 50 caracteres.');
                haveError=true;
            } 
            if (!validateEmail(email)){
                showError('email','Por favor ingrese un correo electrónico válido.');
                haveError=true;
            } 
            if (!validateLocation(ubicacion)){
                showError('ubicacion','La ubicación ingresada es muy corta o inválida.');
                haveError=true;
            }
            if (!validateAvailability(disponibilidad)) {
                showError('disponibilidad', 'Por favor, detalla tu disponibilidad horaria (ej: fines de semana).');
                haveError = true;
            }

            if (!validateHours(horasSemanales)) {
                showError('horas_semanales', 'Ingresa una cantidad de horas válida (entre 1 y 40).');
                haveError = true;
            }
            
            // Verify that at least one interest or the "Otro" option is selected 
            if (interesesSeleccionados.length === 0 && !checkOtro.checked) {
                showError('intereses','Por favor selecciona al menos un área en la que te gustaría colaborar.');
                haveError=true;
            }

            // Verify that if they selected "Otro", they actually wrote something
            if (checkOtro.checked && inputOtro.value.trim().length < 3) {
                showError('intereses','Por favor especifica tu otro interés de forma clara.');
                inputOtro.style.border = '2px solid red';
                haveError=true;
            }

            // Validate that they accepted the terms
            if (!terminos) {
                showError('terminos','Debes aceptar las condiciones de voluntariado y uso de datos para continuar.');
                document.getElementById('terminos').style.outline = '2px solid red'; // Outline para checkboxes
                haveError=true;
            }

            if (haveError) {
                return;
            }

            // If we passed all validations, we show the confirmation modal
            const modalUI = document.getElementById('modalConfirmacion');
            modalUI.querySelector('h3').innerText = '¿Estás seguro?';
            modalUI.querySelector('p').innerText = 'Revisa que todos tus datos sean correctos antes de enviar tu postulación.';
            document.querySelector('.modal-buttons').style.display = 'flex'; 
            
            modalUI.style.display = 'flex';
        });
    }
    // =============================================
    // MODAL CONTROL (Back and Send buttons)
    // =============================================

    const modal = document.getElementById('modalConfirmacion');
    const btnVolver = document.getElementById('btn-volver');
    const btnMandar = document.getElementById('btn-mandar');

    if (btnVolver) {
        btnVolver.addEventListener('click', function() {
            modal.style.display = 'none'; 
        });
    }

    if (btnMandar) {
        btnMandar.addEventListener('click', function() {
            // Modal mode "Enviando..."
            modal.querySelector('h3').innerText = 'Enviando postulación...';
            modal.querySelector('p').innerText = 'Por favor espera un momento.';
            document.querySelector('.modal-buttons').style.display = 'none'; 
            const data = new FormData(form);
            
            // If "Otro" is checked, we append that info to the interests in a clear way
            if (checkOtro.checked && inputOtro.value) {
                data.append('intereses', `Otro: ${inputOtro.value}`);
            }
            
            fetch(form.action, {
                method: form.method,
                body: data,
                headers: { 'Accept': 'application/json' }
            }).then(response => {
                if (response.ok) {
                    modal.querySelector('h3').innerText = '¡Postulación enviada con éxito!';
                    modal.querySelector('p').innerText = 'Nos pondremos en contacto contigo pronto. Serás redirigido...';
                    
                    setTimeout(() => {
                        form.reset();
                        window.location.href = "/";
                    }, 3000); 
                } else {
                    modal.querySelector('h3').innerText = 'Hubo un error';
                    modal.querySelector('p').innerText = 'No se pudo enviar. Intenta nuevamente.';
                    
                    setTimeout(() => { 
                        modal.style.display = 'none'; 
                    }, 3000);
                }
            }).catch(error => {
                modal.querySelector('h3').innerText = 'Error de conexión';
                modal.querySelector('p').innerText = 'Revisa tu internet e intenta nuevamente.';
                
                setTimeout(() => { 
                    modal.style.display = 'none'; 
                }, 3000);
            });
        });
    }
});