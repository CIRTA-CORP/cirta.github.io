// Suscripción al newsletter (backend: google-apps-script/Newsletter.gs).
// Apps Script siempre responde HTTP 200: el éxito real viene en result.
document.addEventListener("DOMContentLoaded", function () {
    var form = document.getElementById("newsletter-form");
    if (!form) return;
    var status = form.querySelector(".newsletter-status");
    var button = form.querySelector("button[type=submit]");

    form.addEventListener("submit", function (e) {
        e.preventDefault();
        var data = new FormData(form);
        data.append("page", location.pathname);
        button.disabled = true;
        status.textContent = "";

        fetch(form.action, { method: "POST", body: data })
            .then(function (res) { return res.json(); })
            .then(function (res) {
                if (res && res.result === "success") {
                    status.textContent = form.dataset.ok;
                    form.reset();
                } else {
                    status.textContent = form.dataset.err;
                }
            })
            .catch(function () {
                status.textContent = form.dataset.err;
            })
            .finally(function () {
                button.disabled = false;
            });
    });
});
