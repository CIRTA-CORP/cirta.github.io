#!/usr/bin/env python3
"""
Monitor semanal de www.cirta.cl (lo ejecuta .github/workflows/monitor-semanal.yml).

Revisa el sitio EN VIVO y genera un informe:
  1. Rastrea todas las páginas internas y verifica que respondan 200.
  2. Verifica todos los enlaces (internos y externos) e imágenes/scripts/estilos.
  3. Formularios de contacto y voluntariado (es/en/pt): que tengan el widget de
     Turnstile y que su endpoint de Apps Script esté vivo, conectado a Cloudflare
     y con una Secret Key válida (se envía un token de prueba: no guarda nada).
  4. Newsletter: el endpoint responde (se envía un email inválido: no guarda nada).
  5. Chatbot: responde una pregunta real (queda una fila "monitor-semanal-..." en
     la planilla del chatbot y cuesta una fracción de centavo).
  6. Certificado HTTPS: días hasta que vence.
  7. robots.txt y sitemap.xml accesibles.

El informe queda en el resumen de la ejecución en GitHub. Sale con código 1 si
hay errores: GitHub marca la ejecución como fallida y envía su aviso por correo.

Solo usa la biblioteca estándar de Python.
"""
import datetime
import html.parser
import json
import os
import re
import socket
import ssl
import sys
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor

SITE = os.environ.get("SITE_URL", "https://www.cirta.cl").rstrip("/")
HOST = urllib.parse.urlparse(SITE).hostname
SITE_HOSTS = {HOST, HOST.removeprefix("www."), "cirta.github.io"}
UA = "Mozilla/5.0 (compatible; CIRTA-monitor/1.0; +https://www.cirta.cl)"
TIMEOUT = 30
MAX_PAGES = 300
FORM_PAGES = ["/contact.html", "/volunteer.html",
              "/en/contact.html", "/en/volunteer.html",
              "/pt/contact.html", "/pt/volunteer.html"]
# Respuestas con las que muchos sitios bloquean a robots: aviso, no error.
SOFT_STATUS = {401, 403, 405, 429, 999}
SKIP_SCHEMES = ("mailto:", "tel:", "javascript:", "data:", "#", "whatsapp:")
# Dominios que no se deben verificar (endpoints POST, servicios que no aceptan GET).
SKIP_HOSTS = {"script.google.com", "challenges.cloudflare.com", "fonts.googleapis.com",
              "fonts.gstatic.com"}

errors, warnings, oks = [], [], []


def request(url, data=None, method=None, headers=None):
    """Devuelve (status, body_text, final_url) o (None, mensaje_error, url)."""
    h = {"User-Agent": UA, "Accept": "*/*"}
    h.update(headers or {})
    req = urllib.request.Request(url, data=data, headers=h, method=method)
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
            body = r.read(3_000_000)
            charset = r.headers.get_content_charset() or "utf-8"
            return r.status, body.decode(charset, "replace"), r.geturl()
    except urllib.error.HTTPError as e:
        return e.code, "", url
    except Exception as e:  # DNS, timeout, SSL...
        return None, f"{type(e).__name__}: {e}", url


class LinkParser(html.parser.HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = set()

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        for attr in ("href", "src"):
            v = a.get(attr)
            if v and tag in ("a", "link", "script", "img", "iframe", "source", "video", "audio"):
                if tag == "link" and a.get("rel") in ("preconnect", "dns-prefetch"):
                    continue
                self.links.add(v.strip())


def normalize(base, link):
    if not link or link.startswith(SKIP_SCHEMES):
        return None
    url = urllib.parse.urljoin(base, link)
    url, _ = urllib.parse.urldefrag(url)
    if not url.startswith(("http://", "https://")):
        return None
    return url


def is_internal(url):
    return urllib.parse.urlparse(url).hostname in SITE_HOSTS


def is_page(url):
    path = urllib.parse.urlparse(url).path
    return path.endswith((".html", "/")) or "." not in path.rsplit("/", 1)[-1]


# --------------------------------------------------------------------------
# 1 y 2. Rastreo y enlaces
# --------------------------------------------------------------------------
def crawl():
    pages, queue, seen = {}, [SITE + "/"], {SITE + "/"}
    link_sources = {}  # url -> página donde aparece (la primera)
    while queue and len(pages) < MAX_PAGES:
        url = queue.pop(0)
        status, body, _ = request(url)
        pages[url] = status
        if status != 200:
            continue
        p = LinkParser()
        p.feed(body)
        for raw in p.links:
            link = normalize(url, raw)
            if not link:
                continue
            link_sources.setdefault(link, url)
            if is_internal(link) and is_page(link) and link not in seen:
                seen.add(link)
                queue.append(link)
    return pages, link_sources


def check_link(url):
    host = urllib.parse.urlparse(url).hostname or ""
    if host in SKIP_HOSTS:
        return url, "skip"
    status, msg, _ = request(url, method="HEAD")
    if status is None or status >= 400:
        status, msg, _ = request(url)  # algunos servidores no aceptan HEAD
    return url, status if status is not None else msg


def check_site():
    pages, link_sources = crawl()
    bad_pages = {u: s for u, s in pages.items() if s != 200}
    for u, s in bad_pages.items():
        errors.append(f"Página no disponible ({s}): {u} (enlazada desde {link_sources.get(u, 'inicio')})")
    oks.append(f"{len(pages) - len(bad_pages)} de {len(pages)} páginas internas responden correctamente")

    to_check = [u for u in link_sources if u not in pages]
    broken, blocked = 0, []
    with ThreadPoolExecutor(max_workers=12) as ex:
        for url, result in ex.map(check_link, to_check):
            if result == "skip" or (isinstance(result, int) and result < 400):
                continue
            src = link_sources[url]
            if isinstance(result, int) and result in SOFT_STATUS:
                blocked.append(url)
            elif is_internal(url) or isinstance(result, int):
                errors.append(f"Enlace roto ({result}): {url} (en {src})")
                broken += 1
            else:
                errors.append(f"Enlace inaccesible ({result}): {url} (en {src})")
                broken += 1
    oks.append(f"{len(to_check)} enlaces y recursos revisados, {broken} rotos")
    if blocked:
        hosts = sorted({urllib.parse.urlparse(u).hostname for u in blocked})
        warnings.append(f"{len(blocked)} enlace(s) no se pudieron verificar porque el sitio bloquea robots "
                        f"({', '.join(hosts)}); revísalos a mano de vez en cuando")


# --------------------------------------------------------------------------
# 3. Formularios de contacto y voluntariado
# --------------------------------------------------------------------------
def post_form(endpoint, fields):
    data = urllib.parse.urlencode(fields).encode()
    status, body, _ = request(endpoint, data=data,
                              headers={"Content-Type": "application/x-www-form-urlencoded"})
    try:
        return json.loads(body)
    except Exception:
        return {"_raw": f"HTTP {status}: {body[:150]}"}


def check_forms():
    endpoints = {}
    for path in FORM_PAGES:
        status, body, _ = request(SITE + path)
        if status != 200:
            errors.append(f"Formulario {path}: la página no carga ({status})")
            continue
        m = re.search(r'<form[^>]+action="(https://script\.google\.com/macros/s/[^"]+/exec)"', body)
        if not m:
            errors.append(f"Formulario {path}: no se encontró el endpoint de Apps Script")
            continue
        if 'class="cf-turnstile"' not in body or "data-sitekey=" not in body:
            errors.append(f"Formulario {path}: falta el widget de Turnstile")
        endpoints.setdefault(m.group(1), []).append(path)

    for endpoint, paths in endpoints.items():
        name = "contacto" if "contact" in paths[0] else "voluntariado"
        # Token de prueba de Cloudflare: con una Secret Key válida responde
        # "invalid-input-response"; con una clave incorrecta, "invalid-input-secret".
        res = post_form(endpoint, {"nombre": "Monitor", "email": "monitor@example.com",
                                   "cf-turnstile-response": "XXXX.DUMMY.TOKEN.XXXX"})
        msg = str(res.get("message") or res.get("error") or res.get("_raw") or res)
        if "invalid-input-response" in msg:
            oks.append(f"Formulario de {name}: endpoint activo y verificación de Turnstile funcionando ({', '.join(paths)})")
        elif "Verificación de seguridad fallida" in msg and "(" not in msg:
            warnings.append(f"Formulario de {name}: el endpoint responde, pero sin detalle del motivo (¿código antiguo en Apps Script?): {msg}")
        else:
            errors.append(f"Formulario de {name}: problema en el endpoint ({', '.join(paths)}): {msg}")


# --------------------------------------------------------------------------
# 4. Newsletter
# --------------------------------------------------------------------------
def check_newsletter():
    status, body, _ = request(SITE + "/")
    m = re.search(r'id="newsletter-form"[^>]+action="([^"]+)"', body or "") or \
        re.search(r'action="([^"]+)"[^>]+id="newsletter-form"', body or "")
    if not m:
        warnings.append("Newsletter: no se encontró el formulario en la portada")
        return
    res = post_form(m.group(1), {"email": "no-es-un-email"})
    if "inválido" in str(res.get("message", "")).lower() or "invalid" in str(res.get("message", "")).lower():
        oks.append("Newsletter: endpoint activo (valida el email)")
    else:
        errors.append(f"Newsletter: respuesta inesperada del endpoint: {res}")


# --------------------------------------------------------------------------
# 5. Chatbot
# --------------------------------------------------------------------------
def check_chatbot():
    status, js, _ = request(SITE + "/static/js/chatbot.js")
    m = re.search(r'CHATBOT_ENDPOINT\s*=\s*"([^"]+)"', js or "")
    if not m:
        errors.append("Chatbot: no se encontró CHATBOT_ENDPOINT en chatbot.js")
        return
    payload = json.dumps({
        "messages": [{"role": "user", "content": "Hola, ¿qué es CIRTA? (prueba automática semanal)"}],
        "sessionId": "monitor-semanal-" + datetime.date.today().isoformat(),
        "page": "/monitor-semanal",
    }).encode()
    status, body, _ = request(m.group(1), data=payload,
                              headers={"Content-Type": "text/plain;charset=utf-8"})
    try:
        res = json.loads(body)
    except Exception:
        errors.append(f"Chatbot: respuesta no válida (HTTP {status}): {body[:150]}")
        return
    if res.get("result") != "success":
        errors.append(f"Chatbot: error al responder: {res.get('message')}")
        return
    oks.append("Chatbot: responde correctamente")
    log = res.get("log")
    if log and log != "ok":
        errors.append(f"Chatbot: la conversación no se guardó en la planilla: {log}")
    elif log == "ok":
        oks.append("Chatbot: registro en la planilla funcionando")


# --------------------------------------------------------------------------
# 6 y 7. Certificado, robots.txt y sitemap
# --------------------------------------------------------------------------
def check_cert():
    try:
        ctx = ssl.create_default_context()
        with socket.create_connection((HOST, 443), timeout=TIMEOUT) as s:
            with ctx.wrap_socket(s, server_hostname=HOST) as ss:
                cert = ss.getpeercert()
        expires = datetime.datetime.strptime(cert["notAfter"], "%b %d %H:%M:%S %Y %Z")
        days = (expires - datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)).days
        if days < 14:
            errors.append(f"Certificado HTTPS vence en {days} días")
        elif days < 30:
            warnings.append(f"Certificado HTTPS vence en {days} días (GitHub Pages suele renovarlo solo)")
        else:
            oks.append(f"Certificado HTTPS válido ({days} días restantes)")
    except Exception as e:
        errors.append(f"Certificado HTTPS: no se pudo verificar ({e})")


def check_seo_files():
    for path in ("/robots.txt", "/sitemap.xml"):
        status, _, _ = request(SITE + path)
        if status == 200:
            oks.append(f"{path} accesible")
        else:
            warnings.append(f"{path} no accesible ({status})")


# --------------------------------------------------------------------------
# Informe y correo
# --------------------------------------------------------------------------
def build_report():
    fecha = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=-3))).strftime("%d/%m/%Y %H:%M")
    estado = "✅ El sitio funciona correctamente" if not errors else f"❌ Se encontraron {len(errors)} problema(s)"
    lines = [f"Monitor semanal de {SITE} — {fecha}", "", estado, ""]
    if errors:
        lines += ["PROBLEMAS:"] + [f"  ✗ {e}" for e in errors] + [""]
    if warnings:
        lines += ["AVISOS (revisar, no necesariamente fallas):"] + [f"  ! {w}" for w in warnings] + [""]
    lines += ["FUNCIONANDO:"] + [f"  ✓ {o}" for o in oks] + [""]
    run_url = os.environ.get("RUN_URL")
    if run_url:
        lines += [f"Detalle de la ejecución: {run_url}"]
    return estado, "\n".join(lines)


def main():
    for check in (check_site, check_forms, check_newsletter, check_chatbot, check_cert, check_seo_files):
        try:
            check()
        except Exception as e:
            errors.append(f"La revisión {check.__name__} falló inesperadamente: {e}")
    _, report = build_report()
    print(report)
    summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary:
        with open(summary, "a", encoding="utf-8") as f:
            f.write("```\n" + report + "\n```\n")
    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
