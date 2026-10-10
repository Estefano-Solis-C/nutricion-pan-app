"""
bioquimica_extractor.py
Módulo de extracción, clasificación e interpretación clínica de datos bioquímicos
para el Proceso de Atención Nutricional (PAN) - Nutrición Clínica USIL.
"""

import re
from typing import Dict, Any, List

# Base de conocimiento de valores normales y rangos clínicos
PARAMETROS_BIOQUIMICOS = {
    "trigliceridos": {
        "nombre": "Triglicéridos",
        "unidad": "mg/dL",
        "min": None,
        "max": 150.0,
        "valor_normal_str": "< 150 mg/dL",
        "sinonimos": [r"triglic[eé]ridos?", r"tg"],
        "interpretaciones": {
            "elevado": "Elevado: hipertrigliceridemia, secundaria a dislipidemia urémica por alteración en el aclaramiento de lipoproteínas o resistencia insulínica; incrementa riesgo cardiovascular.",
            "normal": "Dentro del rango normal deseable.",
            "disminuido": "Disminuido: infrecuente, valorar desnutrición severa o malabsorción lipídica."
        }
    },
    "colesterol": {
        "nombre": "Colesterol Total",
        "unidad": "mg/dL",
        "min": None,
        "max": 200.0,
        "valor_normal_str": "< 200 mg/dL",
        "sinonimos": [r"colesterol\s*(?:total)?", r"colest"],
        "interpretaciones": {
            "muy_elevado": "Muy elevado: hipercolesterolemia grave, incrementa exponencialmente el riesgo de enfermedad cardiovascular y aterosclerosis acelerada.",
            "elevado": "Elevado: hipercolesterolemia, riesgo aterogénico incrementado.",
            "normal": "Normal (Dentro del rango óptimo).",
            "disminuido": "Disminuido: posible hipocolesterolemia por fallo hepático, hipercatabolismo o desnutrición severa."
        }
    },
    "hdl": {
        "nombre": "HDL",
        "unidad": "mg/dL",
        "min": 50.0,
        "max": None,
        "valor_normal_str": "≥ 50 mg/dL (mujeres) / ≥ 40 mg/dL (varones)",
        "sinonimos": [r"colesterol\s*hdl", r"hdl(?:\s*colesterol)?"],
        "interpretaciones": {
            "disminuido": "Disminuido: hipoalfalipoproteinemia, reflejo del perfil lipídico aterogénico clásico de la enfermedad renal terminal o síndrome metabólico.",
            "normal": "Normal: niveles protectores adecuados.",
            "elevado": "Elevado: nivel protector cardiovascular óptimo."
        }
    },
    "ldl": {
        "nombre": "LDL",
        "unidad": "mg/dL",
        "min": None,
        "max": 100.0,
        "valor_normal_str": "< 100 mg/dL",
        "sinonimos": [r"colesterol\s*ldl", r"ldl(?:\s*colesterol)?"],
        "interpretaciones": {
            "muy_elevado": "Muy elevado: nivel crítico de colesterol aterogénico; eleva marcadamente el riesgo de eventos vasculares periféricos y coronarios.",
            "elevado": "Elevado: hipercolesterolemia aterogénica, riesgo cardiovascular aumentado.",
            "normal": "Dentro del objetivo terapéutico normal.",
            "disminuido": "Disminuido: valores bajos sin repercusión patológica directa."
        }
    },
    "glucosa": {
        "nombre": "Glucosa basal",
        "unidad": "mg/dL",
        "min": 70.0,
        "max": 100.0,
        "valor_normal_str": "70 - 100 mg/dL",
        "sinonimos": [r"glucosa(?:\s*basal)?", r"glicemia(?:\s*en\s*ayunas)?"],
        "interpretaciones": {
            "muy_elevado": "Elevada: hiperglucemia severa, confirma descompensación metabólica aguda en DM2; alto riesgo hiperosmolar, requiere terapia insulínica y control en soporte nutricional.",
            "elevado": "Aceptable / Leve hiperglucemia de estrés en contexto de ERC o DM2; monitorizar estabilidad hemodinámica y glucometría.",
            "normal": "Dentro de los límites basales normales.",
            "disminuido": "Disminuido: hipoglucemia; riesgo neurológico agudo, requiere corrección rápida."
        }
    },
    "hba1c": {
        "nombre": "HbA1c",
        "unidad": "%",
        "min": None,
        "max": 5.7,
        "valor_normal_str": "< 5.7 % (Meta DM2: < 7.0 %)",
        "sinonimos": [r"hb1?c", r"hba1c", r"hemoglobina\s*glicosilada", r"hemoglobina\s*glucosilada"],
        "interpretaciones": {
            "elevado": "Elevada: refleja mal control glucémico crónico en los últimos 3 meses; considerar posible alteración/sesgo por anemia o vida media reducida del eritrocito en diálisis.",
            "normal": "Normal: adecuado control metabólico a largo plazo.",
            "disminuido": "Disminuida: considerar estados de recambio eritrocitario acelerado o anemia hemolítica."
        }
    },
    "albumina": {
        "nombre": "Albúmina",
        "unidad": "g/dL",
        "min": 3.5,
        "max": 5.0,
        "valor_normal_str": "3.5 - 5.0 g/dL",
        "sinonimos": [r"alb[uú]mina(?:\s*s[eé]rica)?"],
        "interpretaciones": {
            "muy_disminuido": "Muy disminuida: hipoalbuminemia severa; marcador clave de Desgaste Proteico-Energético (DPE), inflamación sistémica, pérdidas renales/dializado y mayor morbimortalidad.",
            "disminuido": "Disminuida: déficit de reservas proteicas viscerales, estado catabólico o respuesta de fase aguda negativa.",
            "normal": "Normal: estado proteico visceral conservado.",
            "elevado": "Elevada: sugiere hemoconcentración o deshidratación grave."
        }
    },
    "prealbumina": {
        "nombre": "Prealbúmina",
        "unidad": "mg/dL",
        "min": 15.0,
        "max": 36.0,
        "valor_normal_str": "15 - 36 mg/dL",
        "sinonimos": [r"prealb[uú]mina(?:\s*s[eé]rica)?"],
        "interpretaciones": {
            "disminuido": "Disminuida: marcador sensible de malnutrición proteica aguda e inflamación sistémica; confirma déficit agudo en reservas proteicas viscerales.",
            "normal": "Normal: adecuada síntesis hepática proteica y recambio a corto plazo.",
            "elevado": "Elevada: puede observarse en insuficiencia renal por menor degradación tubular."
        }
    },
    "hemoglobina": {
        "nombre": "Hemoglobina",
        "unidad": "g/dL",
        "min": 12.0,
        "max": 16.0,
        "valor_normal_str": "12.0 - 16.0 g/dL",
        "sinonimos": [r"hemoglobina(?:\s*total)?", r"hb(?!\d|a1c)"],
        "interpretaciones": {
            "disminuido": "Disminuida: anemia normocítica/microcítica secundaria a ERC por déficit de eritropoyetina y/o pérdidas en hemodiálisis; afecta capacidad funcional y transporte de O2.",
            "normal": "Normal: adecuada masa eritrocitaria.",
            "elevado": "Elevada: policitemia o deshidratación con hemoconcentración."
        }
    },
    "bilirrubina_total": {
        "nombre": "Bilirrubinas Totales",
        "unidad": "mg/dL",
        "min": 0.1,
        "max": 1.2,
        "valor_normal_str": "0.1 - 1.2 mg/dL",
        "sinonimos": [r"bilirrubinas?\s*totales?", r"bt"],
        "interpretaciones": {
            "elevado": "Elevada: hiperbilirrubinemia; sospechar alteración hepatobiliar o hemólisis; correlacionar con ictericia escleral clínica.",
            "normal": "Dentro del rango normal.",
            "disminuido": "Sin relevancia patológica aislada."
        }
    },
    "bilirrubina_indirecta": {
        "nombre": "Bilirrubinas Indirectas",
        "unidad": "mg/dL",
        "min": 0.2,
        "max": 0.8,
        "valor_normal_str": "0.2 - 0.8 mg/dL",
        "sinonimos": [r"bilirrubinas?\s*indirectas?", r"bi"],
        "interpretaciones": {
            "elevado": "Elevada: probable aumento de hemólisis o alteración en conjugación hepática.",
            "normal": "Normal.",
            "disminuido": "Ligeramente disminuida: generalmente carece de relevancia clínica aislada."
        }
    },
    "urea": {
        "nombre": "Urea sérica",
        "unidad": "mg/dL",
        "min": 15.0,
        "max": 40.0,
        "valor_normal_str": "15 - 40 mg/dL",
        "sinonimos": [r"urea(?:\s*s[eé]rica)?"],
        "interpretaciones": {
            "muy_elevado": "Muy elevada: retención severa de toxinas urémicas por falla renal terminal/hipercatabolismo; condiciona náuseas, vómitos, anorexia y disgeusia.",
            "elevado": "Elevada: azoemia por disfunción renal o hipercatabolismo proteico.",
            "normal": "Dentro de límites normales.",
            "disminuido": "Disminuida: sospechar dieta muy pobre en proteínas o hepatopatía severa."
        }
    },
    "creatinina": {
        "nombre": "Creatinina sérica",
        "unidad": "mg/dL",
        "min": 0.6,
        "max": 1.3,
        "valor_normal_str": "0.6 - 1.3 mg/dL",
        "sinonimos": [r"creatinina(?:\s*s[eé]rica)?"],
        "interpretaciones": {
            "muy_elevado": "Muy elevada: refleja pérdida severa de la tasa de filtración glomerular, confirmando requerimiento de diálisis (ERC estadio 5).",
            "elevado": "Elevada: disfunción renal aguda o crónica; monitorizar función renal.",
            "normal": "Función de filtración glomerular normal.",
            "disminuido": "Disminuida: atrofia o masa muscular muy disminuida (sarcopenia marcada)."
        }
    },
    "sodio": {
        "nombre": "Sodio",
        "unidad": "mEq/L",
        "min": 135.0,
        "max": 145.0,
        "valor_normal_str": "135 - 145 mEq/L",
        "sinonimos": [r"sodio(?:\s*s[eé]rico)?", r"na(?:\+|(?:\s*s[eé]rico))?"],
        "interpretaciones": {
            "disminuido": "Ligeramente disminuido: hiponatremia dilucional por sobrecarga hídrica en oligoanuria o pérdidas digestivas.",
            "normal": "Normal: adecuado balance de osmolaridad plasmática.",
            "elevado": "Elevado: hipernatremia por déficit de agua libre o sobrecarga salina."
        }
    },
    "calcio": {
        "nombre": "Calcio",
        "unidad": "mg/dL",
        "min": 8.5,
        "max": 10.2,
        "valor_normal_str": "8.5 - 10.2 mg/dL",
        "sinonimos": [r"calcio(?:\s*s[eé]rico)?", r"ca(?:\+\+?|(?:\s*s[eé]rico))?"],
        "interpretaciones": {
            "disminuido": "Disminuido: hipocalcemia secundaria a déficit de vitamina D activa e hiperfosfatemia en ERC; evaluar junto a albúmina (calcio corregido).",
            "normal": "Calcio total dentro del rango fisiológico.",
            "elevado": "Elevado: hipercalcemia; sospechar hiperparatiroidismo terciario o intoxicación por vitamina D."
        }
    },
    "fosforo": {
        "nombre": "Fósforo",
        "unidad": "mg/dL",
        "min": 2.5,
        "max": 4.5,
        "valor_normal_str": "2.5 - 4.5 mg/dL",
        "sinonimos": [r"f[oó]sforo(?:\s*s[eé]rico)?", r"p(?:\s*s[eé]rico)?"],
        "interpretaciones": {
            "elevado": "Elevado: hiperfosfatemia por falla en la excreción renal; acelera el riesgo cardiovascular, calcificaciones y osteodistrofia renal; requiere quelantes y restricción dietética estricta.",
            "normal": "Nivel dentro del rango objetivo.",
            "disminuido": "Disminuido: hipofosfatemia; alerta crítica de Síndrome de Realimentación tras periodo de ayuno prolongado."
        }
    },
    "potasio": {
        "nombre": "Potasio",
        "unidad": "mEq/L",
        "min": 3.5,
        "max": 5.0,
        "valor_normal_str": "3.5 - 5.0 mEq/L",
        "sinonimos": [r"potasio(?:\s*s[eé]rico)?", r"k(?:\+|(?:\s*s[eé]rico))?"],
        "interpretaciones": {
            "elevado": "Ligeramente elevado / Elevado: hiperpotasemia por excreción renal reducida; riesgo de arritmias cardíacas letales, vigilar EKG y restringir en fórmula enteral (< 3000 mg/día).",
            "normal": "Normal: rango de seguridad cardioprotectora.",
            "disminuido": "Disminuido: hipopotasemia; riesgo por realimentación o diuréticos, puede causar arritmias y debilidad muscular."
        }
    },
    "magnesio": {
        "nombre": "Magnesio",
        "unidad": "mg/dL",
        "min": 1.7,
        "max": 2.2,
        "valor_normal_str": "1.7 - 2.2 mg/dL",
        "sinonimos": [r"magnesio(?:\s*s[eé]rico)?", r"mg(?:\+\+?|(?:\s*s[eé]rico))?"],
        "interpretaciones": {
            "disminuido": "Disminuido: hipomagnesemia secundaria a pérdidas dialíticas y baja ingesta por gastroparesia/ayuno; riesgo en síndrome de realimentación.",
            "normal": "Niveles séricos normales.",
            "elevado": "Elevado: hipermagnesemia en insuficiencia renal avanzada si hay suplementación no controlada."
        }
    }
}


def clasificar_analito(clave: str, valor: float) -> tuple[str, str]:
    """Determina si un valor está elevado, disminuido o normal y devuelve su interpretación."""
    info = PARAMETROS_BIOQUIMICOS.get(clave)
    if not info:
        return "normal", "Dentro de parámetros evaluados."

    min_val = info.get("min")
    max_val = info.get("max")
    interps = info.get("interpretaciones", {})

    estado = "normal"
    if max_val is not None and valor > max_val:
        if valor >= max_val * 1.5 and "muy_elevado" in interps:
            estado = "muy_elevado"
        else:
            estado = "elevado"
    elif min_val is not None and valor < min_val:
        if valor <= min_val * 0.65 and "muy_disminuido" in interps:
            estado = "muy_disminuido"
        else:
            estado = "disminuido"

    interp_texto = interps.get(estado, interps.get("normal", "Resultado analizado."))
    return estado, interp_texto


def extraer_analitos_de_texto(texto: str) -> List[Dict[str, Any]]:
    """Analiza texto clínico y extrae valores numéricos de analitos con clasificación."""
    resultados = []
    texto_limpio = texto.replace(",", ".")

    for clave, info in PARAMETROS_BIOQUIMICOS.items():
        patrones = []
        for sin in info["sinonimos"]:
            # Coincidencias tipo: "Triglicéridos: 320", "Triglicéridos 320 mg/dl", "Triglicéridos  320"
            patrones.append(rf"(?:^|\n|[\s;,\.])({sin})\s*[:\t= -]*\s*([0-9]+(?:\.[0-9]+)?)\s*(?:mg\/d[lL]|g\/d[lL]|m[eE]q(?:\/[lL])?|%)?")

        valor_encontrado = None
        for pat in patrones:
            match = re.search(pat, texto_limpio, re.IGNORECASE)
            if match:
                try:
                    valor_encontrado = float(match.group(2))
                    break
                except ValueError:
                    continue

        if valor_encontrado is not None:
            estado, interpretacion = clasificar_analito(clave, valor_encontrado)
            resultados.append({
                "clave": clave,
                "nombre": info["nombre"],
                "resultado": valor_encontrado,
                "unidad": info["unidad"],
                "valor_normal": info["valor_normal_str"],
                "estado": estado,
                "interpretacion": interpretacion
            })

    return resultados


def evaluar_todos_los_analitos(datos_dict: Dict[str, float]) -> List[Dict[str, Any]]:
    """Recibe un diccionario clave->valor y genera la tabla completa con interpretaciones."""
    resultados = []
    for clave, info in PARAMETROS_BIOQUIMICOS.items():
        valor = datos_dict.get(clave)
        if valor is not None:
            estado, interpretacion = clasificar_analito(clave, float(valor))
            resultados.append({
                "clave": clave,
                "nombre": info["nombre"],
                "resultado": float(valor),
                "unidad": info["unidad"],
                "valor_normal": info["valor_normal_str"],
                "estado": estado,
                "interpretacion": interpretacion
            })
    return resultados


if __name__ == "__main__":
    # Test con fragmento de caso 1
    texto_prueba = """
    Bioquímica:
    Triglicéridos: 320 mg/dl
    Colesterol: 500 mg/dl
    HDL: 22 mg/dl
    LDL: 250 mg/dl
    Glucosa basal: 159 mg/dl
    Hb1C: 7.5 mg/dl
    Albúmina: 1.6 g/dl
    Prealbúmina: 11 mg/dl
    Hemoglobina: 9.1 g/dl
    Urea sérica: 150 mg/dl
    Creatinina sérica: 6.51 mg/dl
    Sodio: 134 meq
    Calcio: 7 mg/dl
    Fósforo: 5.9 mg/dl
    Potasio: 5.3 meq
    Magnesio: 1.5 mg/dl
    """
    hallados = extraer_analitos_de_texto(texto_prueba)
    print(f"Detectados {len(hallados)} analitos:")
    for h in hallados:
        print(f"- {h['nombre']}: {h['resultado']} {h['unidad']} [{h['estado']}] -> {h['interpretacion']}")
