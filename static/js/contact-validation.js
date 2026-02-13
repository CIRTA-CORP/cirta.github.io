// =============================================
// FUNCIONES DE VALIDACIÓN 
// =============================================
const validateName = (nombre) => {
    if (!nombre) return false;
    let lengthValid = nombre.trim().length >= 2 && nombre.trim().length <= 50;
    return lengthValid;
};

const validateEmail = (email) => {
    if (!email) return false;
    let re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    let formatValid = re.test(email);
    let lengthValid = email.length <= 100;
    // Devuelve true SOLO si cumple formato Y longitud
    return formatValid && lengthValid;
};

const validateTel = (tel) => {
    // No es obligatorio
    if (!tel) return true;

    // Si escribió algo, verificamos que sean solo números
    let re = /^[0-9]+$/;
    let formatValid = re.test(tel)
    return formatValid;
};

const validateORG = (org) => {
    if (!org) return true;
    let lengthValid = org.trim().length >= 2 && org.trim().length <= 80;
    return lengthValid;
};
const validateMSG = (mensaje) => {
    if (!mensaje) return true;
    let lengthValid = mensaje.trim().length >= 10 && mensaje.trim().length <= 500;
    return lengthValid;
};

// =============================================
// VALIDACIÓN PRINCIPAL DEL FORMULARIO
// =============================================
const validateForm = () => {
    
    const nombre = document.getElementById('nombre').value;
    const email = document.getElementById('email').value;
    const tel = document.getElementById('tel').value;
    const org = document.getElementById('org').value;
    const mensaje = document.getElementById('mensaje').value;

    // Variables para tracking de errores
    let invalidInputs = [];
    let isValid = true;

    const setInvalidInput = (inputAny) => {
        invalidInputs.push(inputAny);
        isValid = false;
    };

    if (!validateName(nombre)) setInvalidInput("Nombre (Inexistente o muy corto)");
    if (!validateEmail(email)) setInvalidInput("Email (Inválido)");
    if (!validateTel(tel)) setInvalidInput("Telefono (Introduzca solo números)");
    if (!validateORG(org)) setInvalidInput("Organización/Institución (Nombre muy corto)");
    if (!validateMSG(mensaje)) setInvalidInput("Mensaje (Minimo 10 caracteres)");

    if (!isValid) {
        // -- CASO DE ERROR --
        alert("Errores en los siguientes campos:\n- " + invalidInputs.join("\n- "));
        return false;
    } else {
        // -- CASO DE EXITO
        const confirmacion = confirm('¿Está seguro que desea enviar este formulario a CIRTA?');
        if (confirmacion) {
            alert('Hemos recibido la información, muchas gracias y nos pondremos en contacto.');
            document.getElementById('formularioContacto').submit();
        }
        // Si cancela no enviamos nada.
        return false;
    }
};