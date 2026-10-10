"""
database.py
Módulo de persistencia en TiDB Cloud Serverless (MySQL compatible)
con fallback a almacenamiento local en JSON.
"""

import os
import json
import ssl
import time
from pathlib import Path
from typing import Dict, Any, List, Optional

BASE_DIR = Path(__file__).resolve().parent
CASES_DIR = BASE_DIR / "cases"
CASES_DIR.mkdir(exist_ok=True)

# Variables de entorno para TiDB Cloud
TIDB_HOST = os.environ.get("TIDB_HOST", "gateway01.us-west-2.prod.aws.tidbcloud.com")
TIDB_PORT = int(os.environ.get("TIDB_PORT", 4000))
TIDB_USER = os.environ.get("TIDB_USER", "2bn1VRXAJySSG6k.nutricion_app")
TIDB_PASSWORD = os.environ.get("TIDB_PASSWORD", "NutricionPan2026!")
TIDB_DATABASE = os.environ.get("TIDB_DATABASE", "nutricion_pan_db")

_PYMYSQL_AVAILABLE = False
try:
    import pymysql
    _PYMYSQL_AVAILABLE = True
except ImportError:
    _PYMYSQL_AVAILABLE = False


def _get_connection():
    if not _PYMYSQL_AVAILABLE:
        return None
    try:
        conn = pymysql.connect(
            host=TIDB_HOST,
            port=TIDB_PORT,
            user=TIDB_USER,
            password=TIDB_PASSWORD,
            database=TIDB_DATABASE,
            ssl={'ssl_mode': ssl.CERT_REQUIRED},
            autocommit=True,
            connect_timeout=5
        )
        return conn
    except Exception as e:
        print(f"[TiDB] Advertencia de conexión a TiDB Cloud: {e}. Usando fallback local.")
        return None


def init_db():
    """Inicializa la tabla clinical_cases si no existe en TiDB Cloud."""
    conn = _get_connection()
    if not conn:
        return False
    try:
        with conn.cursor() as cur:
            cur.execute("""
            CREATE TABLE IF NOT EXISTS clinical_cases (
                id VARCHAR(64) PRIMARY KEY,
                patient_name VARCHAR(255) NOT NULL,
                patient_age INT,
                patient_sex VARCHAR(32),
                medical_diagnosis TEXT,
                case_data JSON NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            );
            """)
        conn.close()
        return True
    except Exception as e:
        print(f"[TiDB] Error al inicializar tabla en TiDB: {e}")
        return False


def guardar_caso(data: Dict[str, Any]) -> Dict[str, Any]:
    """Guarda un caso clínico tanto en TiDB Cloud como en archivo local de respaldo."""
    case_id = data.get("id") or f"caso_{int(time.time() * 1000)}"
    data["id"] = case_id

    # Extracción de campos clave para indexación
    filiacion = data.get("filiacion", {})
    nombre = filiacion.get("nombre") or data.get("titulo") or "Paciente sin nombre"
    edad = filiacion.get("edad") or None
    sexo = filiacion.get("sexo") or ""
    diag = data.get("diagnostico_medico") or ""

    # 1. Guardar copia local en JSON
    local_file = CASES_DIR / f"{case_id}.json"
    try:
        with open(local_file, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"[Local] Error guardando respaldo local: {e}")

    # 2. Guardar en TiDB Cloud
    conn = _get_connection()
    if conn:
        try:
            with conn.cursor() as cur:
                sql = """
                INSERT INTO clinical_cases (id, patient_name, patient_age, patient_sex, medical_diagnosis, case_data)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE
                    patient_name = VALUES(patient_name),
                    patient_age = VALUES(patient_age),
                    patient_sex = VALUES(patient_sex),
                    medical_diagnosis = VALUES(medical_diagnosis),
                    case_data = VALUES(case_data);
                """
                json_str = json.dumps(data, ensure_ascii=False)
                cur.execute(sql, (case_id, nombre, edad, sexo, diag, json_str))
            conn.close()
            return {"success": True, "id": case_id, "storage": "tidb_cloud", "message": "Caso guardado exitosamente en TiDB Cloud"}
        except Exception as e:
            print(f"[TiDB] Error guardando en TiDB: {e}")

    return {"success": True, "id": case_id, "storage": "local_fallback", "message": "Caso guardado localmente"}


def listar_casos() -> List[Dict[str, Any]]:
    """Lista todos los casos clínicos desde TiDB Cloud o fallback local."""
    conn = _get_connection()
    if conn:
        try:
            with conn.cursor() as cur:
                cur.execute("SELECT case_data FROM clinical_cases ORDER BY updated_at DESC;")
                rows = cur.fetchall()
                casos = []
                for row in rows:
                    raw = row[0]
                    if isinstance(raw, str):
                        casos.append(json.loads(raw))
                    elif isinstance(raw, dict):
                        casos.append(raw)
                conn.close()
                if casos:
                    return casos
        except Exception as e:
            print(f"[TiDB] Error al listar casos de TiDB: {e}")

    # Fallback a casos locales
    casos = []
    for file_path in CASES_DIR.glob("*.json"):
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                casos.append(json.load(f))
        except Exception:
            continue
    return casos


def obtener_caso_por_id(case_id: str) -> Optional[Dict[str, Any]]:
    """Obtiene un caso clínico específico."""
    conn = _get_connection()
    if conn:
        try:
            with conn.cursor() as cur:
                cur.execute("SELECT case_data FROM clinical_cases WHERE id = %s;", (case_id,))
                row = cur.fetchone()
                if row:
                    raw = row[0]
                    conn.close()
                    return json.loads(raw) if isinstance(raw, str) else raw
        except Exception:
            pass

    local_file = CASES_DIR / f"{case_id}.json"
    if local_file.exists():
        try:
            with open(local_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return None
