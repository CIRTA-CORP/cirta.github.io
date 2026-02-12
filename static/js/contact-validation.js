
const validateEmail = (email) => {
    if (!email) return false;
    
    let re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    let formatValid = re.test(email);
    
    let lengthValid = email.length <= 100;
    
    // Devuelve true SOLO si cumple formato Y longitud
    return formatValid && lengthValid;
};

const validatePhone = (tel) => {
    // No es obligatorio
    if (tel === "") return true;

    // Si escribió algo, verificamos que sean solo números
    let re = /^[0-9]+$/;
    return re.test(tel);
};

const validateForm = () => {
    
    const nombre = document.getElementById('nombre').value;
    const email = document.getElementById('email').value;
    const tel = document.getElementById('tel').value;
    const institucion = document.getElementById('institucion').value;

    if (nombre === "") {
        alert("El nombre es obligatorio.");
        return false; 
    }

    if (!validateEmail(email)){
        alert("Correo Invalido");
        return false;
    }
    if (!validatePhone(tel)){
        alert("El telefono solo debe contener números");
        return false;
    }

    return true; 
};