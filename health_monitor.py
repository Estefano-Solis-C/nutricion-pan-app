"""
health_monitor.py
Monitor de disponibilidad y salud en tiempo real para el servidor PAN Nutrición.
Verifica cada 10 segundos que el servidor responda de forma fluida y sin bloqueos.
"""

import time
import urllib.request
import json
import sys

URL_HEALTH = "http://127.0.0.1:8080/api/health"
URL_HTML = "http://127.0.0.1:8080/index.html"
INTERVALO_SEGUNDOS = 10


def test_endpoint(url: str, timeout_sec: float = 3.0):
    t0 = time.time()
    req = urllib.request.Request(url, headers={"User-Agent": "PAN-HealthMonitor/1.0"})
    with urllib.request.urlopen(req, timeout=timeout_sec) as resp:
        body = resp.read()
        latencia_ms = round((time.time() - t0) * 1000, 2)
        return resp.status, body, latencia_ms


def verificar_una_vez(iteracion: int = 1):
    timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
    try:
        status_health, body_health, lat_health = test_endpoint(URL_HEALTH)
        data = json.loads(body_health.decode("utf-8"))

        status_html, _, lat_html = test_endpoint(URL_HTML)

        print(f"[{timestamp}] [Check #{iteracion}] "
              f"API /api/health: HTTP {status_health} ({lat_health}ms) - "
              f"Uptime: {data.get('uptime_seconds')}s, Hilos: {data.get('active_threads')} | "
              f"HTML index.html: HTTP {status_html} ({lat_html}ms) | "
              f"ESTADO: ACTIVO Y SIN BLOQUEOS")
        sys.stdout.flush()
        return True
    except Exception as e:
        print(f"[{timestamp}] [Check #{iteracion}] ERROR: Servidor no responde: {e}")
        sys.stdout.flush()
        return False


def ejecutar_monitoreo(max_checks: int = 5):
    print(f"Iniciando verificación de salud (intervalo: {INTERVALO_SEGUNDOS}s, total checks: {max_checks})...")
    exitos = 0
    for i in range(1, max_checks + 1):
        ok = verificar_una_vez(i)
        if ok:
            exitos += 1
        if i < max_checks:
            time.sleep(INTERVALO_SEGUNDOS)

    print(f"Verificación finalizada: {exitos}/{max_checks} comprobaciones exitosas sin cuelgues ni demoras.")
    return exitos == max_checks


if __name__ == "__main__":
    repeticiones = int(sys.argv[1]) if len(sys.argv) > 1 else 3
    ejecutar_monitoreo(repeticiones)
