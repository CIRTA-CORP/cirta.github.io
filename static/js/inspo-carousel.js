// Carrusel manual de "Experiencia de nuestro equipo": sin rotación automática.
// Las flechas desplazan una tarjeta; en móvil también se puede deslizar con el dedo.
document.addEventListener("DOMContentLoaded", function () {
    var track = document.getElementById("inspo-track");
    if (!track) return;
    var prev = document.querySelector(".inspo-prev");
    var next = document.querySelector(".inspo-next");

    function step() {
        var card = track.querySelector(".inspo-card");
        return card ? card.getBoundingClientRect().width + 20 : track.clientWidth;
    }
    function update() {
        var max = track.scrollWidth - track.clientWidth - 2;
        prev.disabled = track.scrollLeft <= 2;
        next.disabled = track.scrollLeft >= max;
    }
    prev.addEventListener("click", function () { track.scrollBy({ left: -step(), behavior: "smooth" }); });
    next.addEventListener("click", function () { track.scrollBy({ left: step(), behavior: "smooth" }); });
    track.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();
});
