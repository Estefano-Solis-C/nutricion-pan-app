"""
clinical_parser.py
Módulo de extracción inteligente y procesamiento de Historias Clínicas para el
Proceso de Atención Nutricional (PAN) - Nutrición Clínica USIL.
"""

import re
from typing import Dict, Any, List
from bioquimica_extractor import extraer_analitos_de_texto, PARAMETROS_BIOQUIMICOS

def extraer_historia_clinica_completa(texto: str) -> Dict[str, Any]:
    """
    Analiza exhaustivamente el texto completo de una Historia Clínica y extrae:
    1. Filiación
    2. Enfermedad de Ingreso y Signos Vitales
    3. Funciones Biológicas
    4. Antecedentes (Personales, Fisiológicos, Patológicos, Familiares)
    5. Examen Físico / Apreciación
    6. Diagnóstico Médico de Ingreso
    7. Tratamiento Farmacológico
    8. Datos Bioquímicos (18 analitos con valores e interpretación)
    9. Datos Antropométricos iniciales
    """
    datos = {
        "filiacion": {},
        "enfermedad_ingreso": {},
        "funciones_biologicas": {},
        "antecedentes": {},
        "examen_fisico": {},
        "diagnostico_medico": "",
        "tratamiento_farmacologico": "",
        "antropometria": {},
        "bioquimica": []
    }

    # Normalizar saltos de línea y espacios
    t = texto.replace("\r\n", "\n").replace("\r", "\n")

    # -------------------------------------------------------------
    # 1. FILIACIÓN
    # -------------------------------------------------------------
    # Nombre
    m = re.search(r"(?:Nombre|Paciente)[:\s\t]+([A-Za-zÁÉÍÓÚñáéíóú\s]+?)(?=\n|Edad|Estado civil|,|$)", t, re.IGNORECASE)
    if m:
        nombre = m.group(1).strip()
        if len(nombre) > 2 and "filiaci" not in nombre.lower():
            datos["filiacion"]["nombre"] = nombre

    # Edad
    m = re.search(r"(?:Edad)[:\s\t]+(\d+)\s*(?:a[ñn]os)?", t, re.IGNORECASE)
    if m:
        datos["filiacion"]["edad"] = int(m.group(1))

    # Sexo
    if re.search(r"\b(?:mujer|femenino)\b", t, re.IGNORECASE):
        datos["filiacion"]["sexo"] = "femenino"
    elif re.search(r"\b(?:var[oó]n|hombre|masculino)\b", t, re.IGNORECASE):
        datos["filiacion"]["sexo"] = "masculino"

    # Estado civil
    m = re.search(r"(?:Estado\s*civil)[:\s\t]+([A-Za-zÁÉÍÓÚñáéíóú]+)", t, re.IGNORECASE)
    if m:
        datos["filiacion"]["estado_civil"] = m.group(1).strip()

    # Religión
    m = re.search(r"(?:Religi[oó]n)[:\s\t]+([A-Za-zÁÉÍÓÚñáéíóú\s]+?)(?=\n|Lugar|$)", t, re.IGNORECASE)
    if m:
        datos["filiacion"]["religion"] = m.group(1).strip()

    # Lugar de Nacimiento
    m = re.search(r"(?:Lugar\s*de\s*Nacimiento)[:\s\t]+([A-Za-zÁÉÍÓÚñáéíóú\s]+?)(?=\n|Lugar|$)", t, re.IGNORECASE)
    if m:
        datos["filiacion"]["lugar_nacimiento"] = m.group(1).strip()

    # Lugar de Procedencia
    m = re.search(r"(?:Lugar\s*de\s*Procedencia)[:\s\t]+([A-Za-zÁÉÍÓÚñáéíóú\s]+?)(?=\n|Ocupaci[oó]n|$)", t, re.IGNORECASE)
    if m:
        datos["filiacion"]["lugar_procedencia"] = m.group(1).strip()

    # Ocupación actual
    m = re.search(r"(?:Ocupaci[oó]n(?:\s*actual)?)[:\s\t]+([A-Za-zÁÉÍÓÚñáéíóú\s]+?)(?=\n|Enfermedad|$)", t, re.IGNORECASE)
    if m:
        datos["filiacion"]["ocupacion"] = m.group(1).strip()

    # -------------------------------------------------------------
    # 2. ENFERMEDAD DE INGRESO Y SIGNOS VITALES
    # -------------------------------------------------------------
    # Temperatura
    m = re.search(r"(?:T°|Temp(?:eratura)?|T)[:\s\t]+([0-9]+(?:\.[0-9]+)?)\s*(?:°?C)?", t, re.IGNORECASE)
    if m:
        datos["enfermedad_ingreso"]["temperatura"] = m.group(1)

    # Frecuencia cardiaca
    m = re.search(r"(?:F\.?\s*C\.?|Pulso)[:\s\t]+(\d+)\s*(?:lpm)?", t, re.IGNORECASE)
    if m:
        datos["enfermedad_ingreso"]["fc"] = m.group(1)

    # Frecuencia respiratoria
    m = re.search(r"(?:F\.?\s*R\.?)[:\s\t]+(\d+)\s*(?:rpm)?", t, re.IGNORECASE)
    if m:
        datos["enfermedad_ingreso"]["fr"] = m.group(1)

    # Presión arterial
    m = re.search(r"(?:P\.?\s*A\.?|Presi[oó]n\s*Arterial)[:\s\t]+(\d+\/\d+)\s*(?:mmHg)?", t, re.IGNORECASE)
    if m:
        datos["enfermedad_ingreso"]["pa"] = m.group(1)

    # Tiempo de enfermedad
    m = re.search(r"(?:Tiempo\s*de\s*Enfermedad)[:\s\t]+([^\n]+)", t, re.IGNORECASE)
    if m:
        datos["enfermedad_ingreso"]["tiempo_enfermedad"] = m.group(1).strip()

    # Forma de inicio
    m = re.search(r"(?:Forma\s*de\s*Inicio)[:\s\t]+([^\n]+)", t, re.IGNORECASE)
    if m:
        datos["enfermedad_ingreso"]["forma_inicio"] = m.group(1).strip()

    # Curso
    m = re.search(r"(?:Curso)[:\s\t]+([^\n]+)", t, re.IGNORECASE)
    if m:
        datos["enfermedad_ingreso"]["curso"] = m.group(1).strip()

    # Relato
    m = re.search(r"(?:Relato)[:\s\t]+(.*?)(?=\n\s*(?:Funciones\s*Biol[oó]gicas|Antecedentes|Apreciaci[oó]n|Diagn[oó]stico)|$)", t, re.IGNORECASE | re.DOTALL)
    if m:
        datos["enfermedad_ingreso"]["relato"] = " ".join(m.group(1).split())

    # -------------------------------------------------------------
    # 3. FUNCIONES BIOLÓGICAS
    # -------------------------------------------------------------
    m = re.search(r"(?:Apetito)[:\s\t]+([^\n]+)", t, re.IGNORECASE)
    if m:
        datos["funciones_biologicas"]["apetito"] = m.group(1).strip()

    m = re.search(r"(?:Sed)[:\s\t]+([^\n]+)", t, re.IGNORECASE)
    if m:
        datos["funciones_biologicas"]["sed"] = m.group(1).strip()

    m = re.search(r"(?:Orina|Diuresis)[:\s\t]+(\d+)\s*(?:ml(?:\/d[ií]a)?)?", t, re.IGNORECASE)
    if m:
        try:
            datos["funciones_biologicas"]["orina"] = int(m.group(1))
        except ValueError:
            pass

    m = re.search(r"(?:Deposiciones)[:\s\t]+([^\n]+)", t, re.IGNORECASE)
    if m:
        datos["funciones_biologicas"]["deposiciones"] = m.group(1).strip()

    m = re.search(r"(?:Sudoraci[oó]n)[:\s\t]+([^\n]+)", t, re.IGNORECASE)
    if m:
        datos["funciones_biologicas"]["sudoracion"] = m.group(1).strip()

    m = re.search(r"(?:Sue[ñn]o)[:\s\t]+([^\n]+)", t, re.IGNORECASE)
    if m:
        datos["funciones_biologicas"]["sueno"] = m.group(1).strip()

    m = re.search(r"(?:[AÁ]nimo)[:\s\t]+([^\n]+)", t, re.IGNORECASE)
    if m:
        datos["funciones_biologicas"]["animo"] = m.group(1).strip()

    # Peso y Talla en funciones biológicas o antropometría
    m = re.search(r"(?:Peso(?:\s+actual)?|Peso)[:\s\t]+([0-9]+(?:\.[0-9]+)?)\s*k?g?", t, re.IGNORECASE)
    if m:
        val_p = float(m.group(1))
        datos["funciones_biologicas"]["peso"] = val_p
        datos["antropometria"]["peso_actual"] = val_p

    m = re.search(r"(?:Talla|Estatura)[:\s\t]+([0-9]+(?:\.[0-9]+)?)\s*(?:cm|m)?", t, re.IGNORECASE)
    if m:
        val_t = float(m.group(1))
        val_cm = val_t if val_t > 3 else round(val_t * 100, 1)
        datos["funciones_biologicas"]["talla"] = val_cm
        datos["antropometria"]["talla"] = val_cm

    # -------------------------------------------------------------
    # 4. ANTECEDENTES
    # -------------------------------------------------------------
    m = re.search(r"(?:Generales)[:\s\t]+(.*?)(?=\n\s*(?:Fisiol[oó]gicos|Patol[oó]gicos|Familiares)|$)", t, re.IGNORECASE | re.DOTALL)
    if m:
        datos["antecedentes"]["personales_generales"] = " ".join(m.group(1).split())

    m = re.search(r"(?:Fisiol[oó]gicos)[:\s\t]+(.*?)(?=\n\s*(?:Patol[oó]gicos|Familiares|Diagn[oó]stico)|$)", t, re.IGNORECASE | re.DOTALL)
    if m:
        datos["antecedentes"]["fisiologicos"] = " ".join(m.group(1).split())

    m = re.search(r"(?:Patol[oó]gicos)[:\s\t]+(.*?)(?=\n\s*(?:Familiares|Apreciaci[oó]n|Diagn[oó]stico)|$)", t, re.IGNORECASE | re.DOTALL)
    if m:
        datos["antecedentes"]["patologicos"] = " ".join(m.group(1).split())

    m = re.search(r"(?:Familiares)[:\s\t]+(.*?)(?=\n\s*(?:Apreciaci[oó]n|Diagn[oó]stico|Tratamiento|1\.)|$)", t, re.IGNORECASE | re.DOTALL)
    if m:
        datos["antecedentes"]["familiares"] = " ".join(m.group(1).split())

    # -------------------------------------------------------------
    # 5. EXAMEN FÍSICO / APRECIACIÓN GENERAL
    # -------------------------------------------------------------
    m = re.search(r"(?:Apreciaci[oó]n\s*general)[:\s\t]+(.*?)(?=\n\s*(?:Piel\s*y\s*Anexos|Cavidad|T[oó]rax|Diagn[oó]stico)|$)", t, re.IGNORECASE | re.DOTALL)
    if m:
        datos["examen_fisico"]["apreciacion_general"] = " ".join(m.group(1).split())

    m = re.search(r"(?:Piel\s*y\s*Anexos)[:\s\t]+(.*?)(?=\n\s*(?:Cavidad|T[oó]rax|Diagn[oó]stico)|$)", t, re.IGNORECASE | re.DOTALL)
    if m:
        datos["examen_fisico"]["piel_anexos"] = " ".join(m.group(1).split())

    m = re.search(r"(?:Cavidad\s*Oral)[:\s\t]+(.*?)(?=\n\s*(?:T[oó]rax|Diagn[oó]stico)|$)", t, re.IGNORECASE | re.DOTALL)
    if m:
        datos["examen_fisico"]["cavidad_oral"] = " ".join(m.group(1).split())

    m = re.search(r"(?:T[oó]rax\s*y\s*Abdomen)[:\s\t]+(.*?)(?=\n\s*(?:Diagn[oó]stico|Tratamiento)|$)", t, re.IGNORECASE | re.DOTALL)
    if m:
        datos["examen_fisico"]["torax_abdomen"] = " ".join(m.group(1).split())

    # -------------------------------------------------------------
    # 6. DIAGNÓSTICO MÉDICO
    # -------------------------------------------------------------
    m = re.search(r"(?:Diagn[oó]stico(?:\s*M[eé]dico)?(?:\s*de\s*Ingreso)?)[:\s\t]+(.*?)(?=\n\s*(?:Tratamiento\s*Farmacol[oó]gico|Datos\s*Bioqu[ií]micos|1\.)|$)", t, re.IGNORECASE | re.DOTALL)
    if m:
        datos["diagnostico_medico"] = " ".join(m.group(1).split())

    # -------------------------------------------------------------
    # 7. TRATAMIENTO FARMACOLÓGICO
    # -------------------------------------------------------------
    m = re.search(r"(?:Tratamiento\s*Farmacol[oó]gico(?:\s*Actual)?)[:\s\t]+(.*?)(?=\n\s*(?:Datos\s*Bioqu[ií]micos|1\.\s*EVALUACI[OÓ]N)|$)", t, re.IGNORECASE | re.DOTALL)
    if m:
        datos["tratamiento_farmacologico"] = m.group(1).strip()

    # -------------------------------------------------------------
    # 8. ANTROPOMETRÍA ADICIONAL
    # -------------------------------------------------------------
    m = re.search(r"(?:Peso\s*habitual)[:\s\t]+([0-9]+(?:\.[0-9]+)?)\s*k?g?", t, re.IGNORECASE)
    if m:
        datos["antropometria"]["peso_habitual"] = float(m.group(1))

    m = re.search(r"(?:Peso\s*seco)[:\s\t]+([0-9]+(?:\.[0-9]+)?)\s*k?g?", t, re.IGNORECASE)
    if m:
        datos["antropometria"]["peso_seco"] = float(m.group(1))

    m = re.search(r"(?:Peso\s*ideal)[:\s\t]+([0-9]+(?:\.[0-9]+)?)\s*k?g?", t, re.IGNORECASE)
    if m:
        datos["antropometria"]["peso_ideal"] = float(m.group(1))

    m = re.search(r"(?:Per[ií]metro\s*Abdominal)[:\s\t]+([0-9]+(?:\.[0-9]+)?)\s*cm", t, re.IGNORECASE)
    if m:
        datos["antropometria"]["perimetro_abdominal"] = float(m.group(1))

    m = re.search(r"(?:Per[ií]metro\s*Braquial|CB)[:\s\t]+([0-9]+(?:\.[0-9]+)?)\s*cm", t, re.IGNORECASE)
    if m:
        datos["antropometria"]["cb"] = float(m.group(1))

    m = re.search(r"(?:Pliegue\s*Tricipital|PCT)[:\s\t]+([0-9]+(?:\.[0-9]+)?)\s*mm", t, re.IGNORECASE)
    if m:
        datos["antropometria"]["pct"] = float(m.group(1))

    m = re.search(r"(?:Per[ií]metro\s*de\s*Pantorrilla|CP)[:\s\t]+([0-9]+(?:\.[0-9]+)?)\s*cm", t, re.IGNORECASE)
    if m:
        datos["antropometria"]["cp"] = float(m.group(1))

    # -------------------------------------------------------------
    # 9. DATOS BIOQUÍMICOS (18 analitos con valores e interpretación)
    # -------------------------------------------------------------
    analitos_extraidos = extraer_analitos_de_texto(t)
    datos["bioquimica"] = analitos_extraidos

    return datos
