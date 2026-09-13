# cirta.github.io
Web Page for cirta corporation

## Descripción

Este repositorio mantiene el código de la página oficial de la corporacion CIRTA

## Desarrollo de la página

La página se desarrolla de acuerdo a los requerimientos de [GitHub Pages](https://pages.github.com/), por lo que sólo contiene código estático: html, css y javascript; además de utilizar [Jekyll](https://jekyllrb.com/) como framework para generar la página estática.

## Cómo probar el sitio localmente

1. Instala Ruby y Bundler (el archivo `.ruby-version` indica la versión esperada), y las dependencias del proyecto:
   ```bash
   bundle install
   ```
2. Levanta el servidor local de Jekyll con recarga automática:
   ```bash
   bundle exec jekyll serve --livereload
   ```
3. Abre `http://localhost:4000` en el navegador.

### Probar los formularios (Contacto / Voluntariado) sin spamear el correo real

Los formularios envían por `POST` al Google Apps Script de producción, así que cualquier envío desde `localhost` llegará igual al correo real de CIRTA. Para probar el flujo completo (validaciones, honeypot y verificación humana) sin generar envíos reales:

* **Verificación humana (Cloudflare Turnstile):** en local no se puede usar el Site Key de producción, porque Turnstile valida el dominio. Reemplaza temporalmente el `data-sitekey` en `contact.html`/`volunteer.html` por una de las [Site Keys de prueba oficiales de Cloudflare](https://developers.cloudflare.com/turnstile/troubleshooting/testing/) (por ejemplo `1x00000000000000000000AA`, que siempre pasa el desafío), y no subas ese cambio a producción.
* **Honeypot:** para simular un bot, escribe cualquier texto en el campo oculto `#website` desde la consola del navegador (`document.getElementById('website').value = 'bot'`) y confirma que el envío se descarta en silencio.
* **Sin enviar datos reales:** cambia momentáneamente el `action` del `<form>` a un endpoint de pruebas como `https://httpbin.org/post` o a un mock local, para validar el JS (`static/js/contact-validation.js`, `static/js/volunteer-validation.js`) sin tocar la hoja de cálculo ni el correo de producción.

La verificación server-side de Turnstile/honeypot vive en Google Apps Script, fuera de este repositorio; ver [`Backend-Forms.md`](Backend-Forms.md) y la carpeta [`google-apps-script/`](google-apps-script/) para el código y cómo desplegarlo.
