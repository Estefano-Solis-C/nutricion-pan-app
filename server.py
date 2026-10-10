"""
server.py
Servidor HTTP y API REST para la aplicación de Proceso de Atención Nutricional (PAN).
Nutrición Clínica USIL.
Permite acceso local y en red LAN (0.0.0.0), carga y análisis de PDF y cálculo clínico.
"""

import http.server
import socketserver
import json
import urllib.parse
import os
import sys
import socket
import time
import threading
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

# Importar extractores clínicos y base de datos TiDB
import database
from clinical_parser import extraer_historia_clinica_completa
from bioquimica_extractor import (
    extraer_analitos_de_texto,
    evaluar_todos_los_analitos,
    PARAMETROS_BIOQUIMICOS
)

CASES_DIR = BASE_DIR / "cases"
CASES_DIR.mkdir(exist_ok=True)

PORT = int(os.environ.get("PORT", 8080))

MIME_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".pdf": "application/pdf"
}

SERVER_START_TIME = time.time()


def get_local_ips() -> list[str]:
    """Obtiene las direcciones IP locales accesibles por otros dispositivos en la red."""
    ips = []
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(0.5)
        s.connect(('8.8.8.8', 80))
        primary = s.getsockname()[0]
        s.close()
        if primary and primary not in ips and not primary.startswith('127.'):
            ips.append(primary)
    except Exception:
        pass
    try:
        hostname = socket.gethostname()
        for ip in socket.gethostbyname_ex(hostname)[2]:
            if ip not in ips and not ip.startswith('127.'):
                ips.append(ip)
    except Exception:
        pass
    if not ips:
        ips.append('192.168.18.186')
    return ips


class ClinicalHandler(http.server.SimpleHTTPRequestHandler):
    timeout = 15

    def end_headers(self):
        # Habilitar CORS y control de caché
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        parsed_url = urllib.parse.urlparse(self.path)

        if parsed_url.path == "/api/health":
            uptime = round(time.time() - SERVER_START_TIME, 2)
            active_threads = threading.active_count()
            self._send_json({
                "status": "healthy",
                "uptime_seconds": uptime,
                "active_threads": active_threads,
                "message": "Servidor clínico USIL respondiendo correctamente"
            })

        elif parsed_url.path in ("/api/network", "/api/info"):
            local_ips = get_local_ips()
            urls = [f"http://{ip}:{PORT}" for ip in local_ips]
            self._send_json({
                "success": True,
                "port": PORT,
                "local_ips": local_ips,
                "primary_ip": local_ips[0] if local_ips else "127.0.0.1",
                "network_urls": urls,
                "qr_target": urls[0] if urls else f"http://localhost:{PORT}"
            })

        elif parsed_url.path == "/api/load-cases":
            casos = database.listar_casos()
            # Incluir también los casos de muestra predeterminados
            sample_file = BASE_DIR / "sample_cases.json"
            sample_data = {}
            if sample_file.exists():
                try:
                    with open(sample_file, "r", encoding="utf-8") as f:
                        sample_data = json.load(f)
                except Exception:
                    pass
            self._send_json({"success": True, "casos": casos, "sample_cases": sample_data})

        elif parsed_url.path == "/api/parametros-bioquimicos":
            self._send_json({"success": True, "parametros": PARAMETROS_BIOQUIMICOS})

        else:
            # Servir archivos estáticos desde BASE_DIR
            clean_path = parsed_url.path.lstrip("/")
            if not clean_path:
                clean_path = "index.html"

            file_path = BASE_DIR / clean_path
            if file_path.exists() and file_path.is_file():
                suffix = file_path.suffix.lower()
                content_type = MIME_TYPES.get(suffix, "application/octet-stream")
                try:
                    with open(file_path, "rb") as f:
                        content = f.read()
                    self.send_response(200)
                    self.send_header("Content-Type", content_type)
                    self.send_header("Content-Length", str(len(content)))
                    self.end_headers()
                    self.wfile.write(content)
                except Exception as e:
                    self.send_error(500, f"Error reading file: {e}")
            else:
                self.send_error(404, f"File not found: {clean_path}")

    def do_POST(self):
        parsed_url = urllib.parse.urlparse(self.path)
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length)

        if parsed_url.path == "/api/analyze-clinical-history":
            try:
                data = json.loads(body.decode("utf-8")) if body else {}
                texto = data.get("text", "")

                # Extraer historia clínica completa
                resultado_clinico = extraer_historia_clinica_completa(texto)

                response_data = {
                    "success": True,
                    "total_analitos": len(resultado_clinico.get("bioquimica", [])),
                    "datos": resultado_clinico
                }
                self._send_json(response_data)
            except Exception as e:
                self._send_json({"success": False, "error": str(e)}, status=500)

        elif parsed_url.path == "/api/save-case":
            try:
                data = json.loads(body.decode("utf-8")) if body else {}
                resultado = database.guardar_caso(data)
                self._send_json(resultado)
            except Exception as e:
                self._send_json({"success": False, "error": str(e)}, status=500)

        elif parsed_url.path == "/api/evaluate-analytes":
            try:
                data = json.loads(body.decode("utf-8")) if body else {}
                evaluados = evaluar_todos_los_analitos(data.get("analitos", {}))
                self._send_json({"success": True, "analitos": evaluados})
            except Exception as e:
                self._send_json({"success": False, "error": str(e)}, status=500)

        else:
            self.send_error(404, "Endpoint not found")

    def _send_json(self, data: dict, status: int = 200):
        response_bytes = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(response_bytes)))
        self.end_headers()
        self.wfile.write(response_bytes)


def run_server(port=PORT):
    # Bind a 0.0.0.0 para acceso tanto local como por otros dispositivos en la red LAN/Wi-Fi
    httpd = http.server.ThreadingHTTPServer(("0.0.0.0", port), ClinicalHandler)
    httpd.allow_reuse_address = True
    local_ips = get_local_ips()
    primary_ip = local_ips[0] if local_ips else "127.0.0.1"

    print("==================================================================")
    print(f" Servidor Clínico PAN USIL Activo (Multi-Dispositivo)")
    print(f" Acceso en esta PC:   http://localhost:{port}")
    print(f" Acceso Celular/LAN:  http://{primary_ip}:{port}")
    print(f" Directorio raíz:     {BASE_DIR}")
    print("==================================================================")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor detenido por el usuario.")
    finally:
        httpd.server_close()


if __name__ == "__main__":
    port_to_use = int(sys.argv[1]) if len(sys.argv) > 1 else PORT
    run_server(port_to_use)
