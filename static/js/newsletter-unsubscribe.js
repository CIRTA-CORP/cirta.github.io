// Baja del newsletter desde la política de privacidad (backend: google-apps-script/Newsletter.gs, action=unsubscribe).
document.addEventListener("DOMContentLoaded", function () {
    var form = document.getElementById("newsletter-unsubscribe");
    if (!form) return;
    var status = document.getElementById("unsubscribe-status");
    var button = form.querySelector("button[type=submit]");
    form.addEventListener("submit", function (e) {
        e.preventDefault();
        button.disabled = true;
        status.textContent = "";
        fetch(form.action, { method: "POST", body: new FormData(form) })
            .then(function (res) { return res.json(); })
            .then(function (res) {
                status.textContent = (res && res.result === "success") ? form.dataset.ok : form.dataset.err;
                if (res && res.result === "success") form.reset();
            })
            .catch(function () { status.textContent = form.dataset.err; })
            .finally(function () { button.disabled = false; });
    });
});
