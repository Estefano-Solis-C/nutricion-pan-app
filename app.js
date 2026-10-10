/**
 * app.js - Lógica interactiva para el Proceso de Atención Nutricional (PAN) USIL
 */

// Base de datos de percentiles de dinamometría (Schlüssel et al., 2008)
const TABLA_SCHLUSSEL = {
  femenino: {
    izquierdo: [
      { min: 20, max: 29, p10: 18.6, p30: 22.3, p50: 25.8, p70: 28.4, p90: 31.8 },
      { min: 30, max: 39, p10: 20.1, p30: 23.5, p50: 26.4, p70: 29.3, p90: 32.9 },
      { min: 40, max: 49, p10: 18.4, p30: 22.9, p50: 25.7, p70: 28.1, p90: 31.7 },
      { min: 50, max: 59, p10: 15.4, p30: 19.9, p50: 23.0, p70: 25.3, p90: 29.8 },
      { min: 60, max: 69, p10: 15.0, p30: 18.2, p50: 20.5, p70: 22.8, p90: 27.1 },
      { min: 70, max: 120, p10: 9.0,  p30: 13.0, p50: 16.0, p70: 19.2, p90: 22.6 }
    ],
    derecho: [
      { min: 20, max: 29, p10: 20.0, p30: 23.7, p50: 27.2, p70: 30.1, p90: 33.6 },
      { min: 30, max: 39, p10: 21.6, p30: 25.0, p50: 28.1, p70: 31.0, p90: 34.6 },
      { min: 40, max: 49, p10: 19.7, p30: 24.2, p50: 27.2, p70: 29.8, p90: 33.5 },
      { min: 50, max: 59, p10: 16.7, p30: 21.2, p50: 24.4, p70: 26.8, p90: 31.5 },
      { min: 60, max: 69, p10: 16.2, p30: 19.4, p50: 21.8, p70: 24.2, p90: 28.8 },
      { min: 70, max: 120, p10: 9.8,  p30: 13.9, p50: 17.1, p70: 20.4, p90: 24.0 }
    ]
  },
  masculino: {
    izquierdo: [
      { min: 20, max: 29, p10: 34.0, p30: 40.0, p50: 44.5, p70: 49.0, p90: 55.0 },
      { min: 30, max: 39, p10: 35.5, p30: 42.0, p50: 47.0, p70: 51.5, p90: 57.0 },
      { min: 40, max: 49, p10: 34.0, p30: 40.5, p50: 45.0, p70: 50.0, p90: 56.0 },
      { min: 50, max: 59, p10: 30.0, p30: 36.5, p50: 41.0, p70: 46.0, p90: 51.0 },
      { min: 60, max: 69, p10: 26.0, p30: 32.0, p50: 36.5, p70: 41.5, p90: 47.0 },
      { min: 70, max: 120, p10: 20.0, p30: 25.0, p50: 29.0, p70: 34.0, p90: 39.0 }
    ],
    derecho: [
      { min: 20, max: 29, p10: 36.2, p30: 42.5, p50: 47.3, p70: 52.0, p90: 58.4 },
      { min: 30, max: 39, p10: 37.8, p30: 44.6, p50: 49.8, p70: 54.6, p90: 60.5 },
      { min: 40, max: 49, p10: 36.1, p30: 43.0, p50: 47.7, p70: 53.0, p90: 59.4 },
      { min: 50, max: 59, p10: 31.9, p30: 38.8, p50: 43.5, p70: 48.8, p90: 54.1 },
      { min: 60, max: 69, p10: 27.7, p30: 34.0, p50: 38.8, p70: 44.0, p90: 49.9 },
      { min: 70, max: 120, p10: 21.3, p30: 26.6, p50: 30.8, p70: 36.1, p90: 41.4 }
    ]
  }
};

// Datos bioquímicos en memoria
let datosBioquimicosActuales = [];

// Diagnósticos PES en memoria
let diagnosticosPES = [];

// Estado inicial
let casoActivoId = "caso1";
let selectedBristol = 2;
let selectedECF = 4;

document.addEventListener("DOMContentLoaded", () => {
  // Cargar caso 1 por defecto al iniciar
  cargarCasoEjemplo("caso1");
  verificarConexionServidor();
});

// Notificaciones tipo Toast accesibles (better-writing & better-ui)
function mostrarToast(mensaje, tipo = "toast-info", duracion = 3500) {
  const container = document.getElementById("toastContainer");
  if (!container) return;
  
  const toast = document.createElement("div");
  toast.className = `toast ${tipo}`;
  
  let icono = "ℹ️";
  if (tipo === "toast-success") icono = "✅";
  else if (tipo === "toast-error") icono = "⚠️";
  
  toast.innerHTML = `<span style="font-size: 1.1rem;">${icono}</span><span>${mensaje}</span>`;
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(8px)";
    toast.style.transition = "opacity 180ms ease, transform 180ms ease";
    setTimeout(() => toast.remove(), 200);
  }, duracion);
}

// Navegación por pestañas con soporte ARIA (better-accessibility)
function mostrarPestana(tabId, btn) {
  document.querySelectorAll(".tab-pane").forEach(p => {
    p.classList.remove("active");
  });
  document.querySelectorAll(".tab-btn").forEach(b => {
    b.classList.remove("active");
    b.setAttribute("aria-selected", "false");
  });
  
  const pane = document.getElementById(tabId);
  if (pane) pane.classList.add("active");
  if (btn) {
    btn.classList.add("active");
    btn.setAttribute("aria-selected", "true");
  }
  
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// Banner superior dinámico (Dashboard del Paciente)
function actualizarBanner() {
  const nombre = document.getElementById("filiacionNombre")?.value || "Paciente sin nombre";
  const edad = document.getElementById("filiacionEdad")?.value || "--";
  const sexo = document.getElementById("filiacionSexo")?.value;
  const sexoStr = sexo === "femenino" ? "Femenino" : "Masculino";
  const peso = document.getElementById("antropoPesoActual")?.value || "--";
  const talla = document.getElementById("antropoTalla")?.value || "--";
  const via = document.getElementById("intervVia")?.value || "Soporte Nutricional";

  const elNombre = document.getElementById("bannerNombre");
  if (elNombre) elNombre.textContent = nombre;

  const elEdadSexo = document.getElementById("bannerEdadSexo");
  if (elEdadSexo) elEdadSexo.textContent = `${edad} años • ${sexoStr}`;

  const elPesoTalla = document.getElementById("bannerPesoTalla");
  if (elPesoTalla) elPesoTalla.textContent = `${peso} kg • ${talla} cm`;

  const elVia = document.getElementById("bannerVia");
  if (elVia) elVia.textContent = via;

  // Actualizar avatar con iniciales
  const elAvatar = document.getElementById("bannerAvatar");
  if (elAvatar) {
    const parts = nombre.trim().split(/\s+/).filter(Boolean);
    const inits = parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : (parts[0] ? parts[0][0].toUpperCase() : "P");
    elAvatar.textContent = inits;
  }
}

// ============================================================================
// EVALUACIÓN FUNCIONAL
// ============================================================================

// 1. Velocidad de la marcha (Prueba de 6 Metros - USIL)
function calcularMarcha() {
  const dist = parseFloat(document.getElementById("marchaDistancia")?.value) || 6.0;
  const tiempo = parseFloat(document.getElementById("marchaTiempo")?.value);
  
  const dispFormula = document.getElementById("marchaFormulaDisplay");
  const dispVel = document.getElementById("marchaVelocidadDisplay");
  const dispBadge = document.getElementById("marchaBadgeDisplay");
  const dispInterp = document.getElementById("marchaInterpretacion");
  
  if (!tiempo || tiempo <= 0) {
    if (dispFormula) dispFormula.textContent = `Velocidad = ${dist} / t = -- m/s`;
    if (dispVel) dispVel.innerHTML = `-- <span style="font-size: 1rem;">m/s</span>`;
    if (dispBadge) dispBadge.innerHTML = `<span class="badge badge-amarillo">Ingrese segundos</span>`;
    return;
  }
  
  const vel = dist / tiempo;
  // Redondeo a 1 decimal para la fórmula oficial (ej. 6 / 12 = 0.5 m/s)
  const velFormateada = (Math.round(vel * 10) / 10).toFixed(1);
  
  if (dispFormula) {
    dispFormula.textContent = `Velocidad = ${dist} / ${tiempo} = ${velFormateada} m/s`;
  }
  if (dispVel) {
    dispVel.innerHTML = `${vel.toFixed(2)} <span style="font-size: 1rem;">m/s</span>`;
  }
  
  const esLenta = vel < 0.8;
  if (esLenta) {
    if (dispBadge) dispBadge.innerHTML = `<span class="badge badge-rojo">Marcha Lenta (&lt; 0.8 m/s)</span>`;
    if (dispInterp) {
      dispInterp.value = `La paciente presentó una velocidad de marcha de ${velFormateada} m/s, calculada a partir de una distancia de ${dist} metros recorrida en ${tiempo} segundos. Al encontrarse por debajo de los parámetros de normalidad (habitualmente < 0.8 m/s), se clasifica como marcha lenta, evidenciando un bajo rendimiento físico y un compromiso de la capacidad funcional.`;
    }
  } else {
    if (dispBadge) dispBadge.innerHTML = `<span class="badge badge-verde">Marcha Normal / Conservada (≥ 0.8 m/s)</span>`;
    if (dispInterp) {
      dispInterp.value = `La paciente presentó una velocidad de marcha de ${velFormateada} m/s, calculada a partir de una distancia de ${dist} metros recorrida en ${tiempo} segundos. Al situarse dentro o por encima de los parámetros de normalidad (habitualmente ≥ 0.8 m/s), se clasifica como marcha conservada / normal, reflejando un rendimiento físico adecuado y capacidad funcional de desplazamiento preservada.`;
    }
  }
}

// 2. Dinamometría de mano (Schlüssel et al., 2008)
function calcularDinamometria() {
  const i1 = parseFloat(document.getElementById("dinamoIntento1").value) || 0;
  const i2 = parseFloat(document.getElementById("dinamoIntento2").value) || 0;
  const i3 = parseFloat(document.getElementById("dinamoIntento3").value) || 0;
  const brazo = document.getElementById("dinamoBrazo").value; // "izquierdo" o "derecho"
  const edad = parseInt(document.getElementById("filiacionEdad").value) || 45;
  const sexo = document.getElementById("filiacionSexo").value || "femenino";

  const maxVal = Math.max(i1, i2, i3);
  let intentoMaxTexto = "primer intento";
  if (maxVal === i3) intentoMaxTexto = "tercer intento";
  else if (maxVal === i2) intentoMaxTexto = "segundo intento";

  const dispMax = document.getElementById("dinamoMaximoDisplay");
  const dispPerc = document.getElementById("dinamoPercentilDisplay");
  const dispSem = document.getElementById("dinamoSemaforoDisplay");
  const dispInterp = document.getElementById("dinamoInterpretacion");

  dispMax.innerHTML = `${maxVal.toFixed(1)} <span style="font-size: 1rem;">kgf</span>`;

  // Buscar fila normativa en tabla Schlüssel por sexo y brazo
  const generoObj = TABLA_SCHLUSSEL[sexo] || TABLA_SCHLUSSEL["femenino"];
  const lista = generoObj[brazo] || generoObj["izquierdo"] || generoObj;
  const fila = lista.find(f => edad >= f.min && edad <= f.max) || lista[lista.length - 1];

  let percentil = "";
  let semaforoClase = "";
  let clasificacion = "";
  let detalle = "";

  if (maxVal < fila.p10) {
    percentil = "< P10";
    semaforoClase = "badge-rojo";
    clasificacion = "Dinapenia / Depleción Severa (Riesgo Crítico)";
    detalle = `por debajo del percentil 10 (< P10 = ${fila.p10} kgf) para su edad y sexo (Schlüssel et al., 2008), con lo cual se evidencia un cuadro de dinapenia / depleción severa asociado a riesgo crítico.`;
  } else if (maxVal <= fila.p30) {
    percentil = "P10 - P30";
    semaforoClase = "badge-amarillo";
    clasificacion = "Fuerza Baja / Alerta (Riesgo Moderado)";
    detalle = `entre el percentil 10 y el percentil 30 (P10 - P30) para su edad y sexo (Schlüssel et al., 2008), con lo cual se evidencia un cuadro de fuerza baja / alerta asociado a un riesgo moderado.`;
  } else if (maxVal <= fila.p70) {
    percentil = "P30 - P70";
    semaforoClase = "badge-verde";
    clasificacion = "Fuerza Normal / Promedio (Estatus Óptimo)";
    detalle = `entre el percentil 30 y el percentil 70 (P30 - P70) para su edad y sexo (Schlüssel et al., 2008), evidenciando fuerza muscular conservada y adecuado estatus funcional.`;
  } else {
    percentil = "> P70";
    semaforoClase = "badge-azul";
    clasificacion = "Fuerza Elevada (Excelente Reserva)";
    detalle = `por encima del percentil 70 (> P70) para su edad y sexo (Schlüssel et al., 2008), reflejando una excelente reserva de masa y fuerza muscular.`;
  }

  dispPerc.textContent = percentil;
  dispSem.innerHTML = `<span class="badge ${semaforoClase}" style="font-size: 0.95rem; padding: 0.5rem 0.8rem;">${clasificacion}</span>`;
  
  dispInterp.value = `Dada la evaluación funcional realizada en tres intentos en el brazo ${brazo} (${i1} kg, ${i2} kg y un valor máximo de ${maxVal.toFixed(1)} kg obtenido en el ${intentoMaxTexto}), se selecciona este último por ser el registro máximo de la prueba. Este valor se sitúa ${detalle}`;
}

function recalcularFuncional() {
  calcularDinamometria();
  calcularMarcha();
}

// 3. Cuestionario SARC-F
function calcularSarcF() {
  let total = 0;
  for (let i = 1; i <= 5; i++) {
    const radio = document.querySelector(`input[name="sarc${i}"]:checked`);
    if (radio) total += parseInt(radio.value);
  }

  const dispTotal = document.getElementById("sarcFTotalDisplay");
  const dispBadge = document.getElementById("sarcFBadgeDisplay");
  const dispInterp = document.getElementById("sarcFInterpretacion");

  dispTotal.innerHTML = `${total} <span style="font-size: 1rem;">/ 10 pts</span>`;

  if (total >= 4) {
    dispBadge.innerHTML = `<span class="badge badge-rojo" style="font-size: 0.95rem; padding: 0.4rem 0.9rem;">⚠️ RIESGO DE SARCOPENIA (≥ 4 puntos)</span>`;
    dispInterp.value = `La paciente obtuvo un puntaje de ${total} puntos en el cuestionario SARC-F, alcanzando el punto de corte establecido (≥ 4 puntos). Este resultado indica riesgo de presentar sarcopenia, asociado a posibles dificultades en actividades diarias que requieren fuerza muscular, movilidad y adecuada capacidad funcional.`;
  } else {
    dispBadge.innerHTML = `<span class="badge badge-verde" style="font-size: 0.95rem; padding: 0.4rem 0.9rem;">✅ SIN RIESGO DE SARCOPENIA (&lt; 4 puntos)</span>`;
    dispInterp.value = `La paciente obtuvo un puntaje de ${total} puntos en el cuestionario SARC-F, situándose por debajo del punto de corte (< 4 puntos), sin evidencia de riesgo de sarcopenia mediante este cuestionario de cribado.`;
  }
}

// 4. Escala Clínica de Fragilidad (ECF / Rockwood Clinical Frailty Scale - Imagen 1)
const ECF_NOMBRES = {
  1: "Categoría 1: Muy en forma / Atlético",
  2: "Categoría 2: En forma",
  3: "Categoría 3: Estable / Manejándose",
  4: "Categoría 4: Vulnerable",
  5: "Categoría 5: Levemente frágil",
  6: "Categoría 6: Moderadamente frágil",
  7: "Categoría 7: Severamente frágil",
  8: "Categoría 8: Muy severamente frágil",
  9: "Categoría 9: Enfermo terminal"
};

const ECF_INTERPRETACIONES = {
  1: "La paciente presenta una puntuación de 1 punto en la Escala Clínica de Fragilidad (ECF), clasificándola como Muy en forma / Atlético. Persona robusta, activa, motivada y en óptima condición física general. Realiza ejercicio físico vigoroso con frecuencia.",
  2: "La paciente presenta una puntuación de 2 puntos en la Escala Clínica de Fragilidad (ECF), clasificándola como En forma. Sin síntomas de enfermedad activa, aunque con menor nivel de entrenamiento que el nivel 1. Suele caminar a menudo y mantenerse activa.",
  3: "La paciente presenta una puntuación de 3 puntos en la Escala Clínica de Fragilidad (ECF), clasificándola como Estable / Manejándose. Sus condiciones médicas crónicas están bien controladas, aunque no realiza actividad física regular más allá de las tareas cotidianas.",
  4: "La paciente presenta una puntuación de 4 puntos en la Escala Clínica de Fragilidad (ECF), clasificándola como Vulnerable. Aunque mantiene independencia para sus actividades diarias básicas, la fatiga y el cansancio temprano son manifestación del síndrome de Desgaste Proteico-Energético (DPE), anemia crónica (9.1 g/dL) y el catabolismo severo inducido por la hemodiálisis y la gastroparesia.",
  5: "La paciente presenta una puntuación de 5 puntos en la Escala Clínica de Fragilidad (ECF), clasificándola como Levemente frágil. Presenta lentitud evidente y necesita asistencia en actividades instrumentales de la vida diaria (compras, finanzas, transporte, medicación).",
  6: "La paciente presenta una puntuación de 6 puntos en la Escala Clínica de Fragilidad (ECF), clasificándola como Moderadamente frágil. Precisa asistencia tanto fuera como dentro del hogar para actividades como vestirse, aseo personal o subir escaleras.",
  7: "La paciente presenta una puntuación de 7 puntos en la Escala Clínica de Fragilidad (ECF), clasificándola como Severamente frágil. Presenta dependencia completa para el cuidado personal físico o cognitivo, manteniéndose clínicamente estable.",
  8: "La paciente presenta una puntuación de 8 puntos en la Escala Clínica de Fragilidad (ECF), clasificándola como Muy severamente frágil. Completamente dependiente para todas las necesidades y acercándose al final de la vida tras cualquier complicación menor.",
  9: "La paciente presenta una puntuación de 9 puntos en la Escala Clínica de Fragilidad (ECF), clasificándola como Enfermo terminal. Esperanza de vida estimada menor a 6 meses, requiriendo cuidados paliativos y confort integral."
};

function seleccionarECF(nivel) {
  selectedECF = nivel;
  
  // Sincronizar select desplegable
  const sel = document.getElementById("ecfPuntoSelect");
  if (sel && parseInt(sel.value) !== nivel) sel.value = nivel;

  // Sincronizar tarjetas visuales
  document.querySelectorAll(".ecf-card").forEach((c, idx) => {
    if (idx + 1 === nivel) {
      c.classList.add("selected");
    } else {
      c.classList.remove("selected");
    }
  });

  const dispInterp = document.getElementById("ecfInterpretacion");
  if (dispInterp) {
    dispInterp.value = ECF_INTERPRETACIONES[nivel] || `La paciente presenta una puntuación de ${nivel} puntos en la Escala Clínica de Fragilidad (ECF), correspondiente a ${ECF_NOMBRES[nivel]}.`;
  }
}

// 5. Escala de Heces de Bristol (Imagen 3)
const BRISTOL_NOMBRES = {
  1: "Tipo 1: Trozos duros separados, como nueces (Estreñimiento importante)",
  2: "Tipo 2: Salchicha grumosa compuesta de fragmentos (Estreñimiento ligero)",
  3: "Tipo 3: En forma de salchicha con grietas en superficie (Normal)",
  4: "Tipo 4: Como salchicha o serpiente, lisa y blanda (Normal / Ideal)",
  5: "Tipo 5: Trozos pastosos con bordes definidos (Falta de fibra)",
  6: "Tipo 6: Fragmentos blandos y esponjosos con bordes irregulares (Ligera diarrea)",
  7: "Tipo 7: Acuosa sin pedazos sólidos (Líquida - Diarrea importante)"
};

const BRISTOL_INTERPRETACIONES = {
  1: "La paciente presenta heces tipo 1 según la Escala de Bristol, caracterizadas por trozos duros separados (similares a nueces), difíciles de evacuar. Compatible con estreñimiento severo y tránsito intestinal muy lento.",
  2: "La paciente presenta heces tipo 2 según la Escala de Bristol, caracterizadas por una salchicha grumosa compuesta de fragmentos, compatibles con estreñimiento y tránsito intestinal lento. Este hallazgo está relacionado a su estado de NPO y la nula ingesta previa de agua y fibra.",
  3: "La paciente presenta heces tipo 3 según la Escala de Bristol, en forma de salchicha con grietas en la superficie. Indica tránsito intestinal normal y consistencia fecal adecuada.",
  4: "La paciente presenta heces tipo 4 según la Escala de Bristol, en forma de salchicha o serpiente, lisa y blanda. Estándar ideal de tránsito digestivo y óptima hidratación.",
  5: "La paciente presenta heces tipo 5 según la Escala de Bristol, trozos pastosos con bordes bien definidos que se expulsan fácilmente. Sugiere falta de fibra soluble y tránsito intestinal acelerado.",
  6: "La paciente presenta heces tipo 6 según la Escala de Bristol, trozos blandos y esponjosos con bordes irregulares, consistencia pastosa. Indica ligera diarrea o tránsito acelerado.",
  7: "La paciente presenta heces tipo 7 según la Escala de Bristol, acuosa sin trozos sólidos (totalmente líquida). Indica diarrea importante, riesgo de deshidratación y pérdida hidroelectrolítica."
};

function seleccionarBristol(tipo) {
  selectedBristol = tipo;

  // Sincronizar select desplegable
  const sel = document.getElementById("bristolTipoSelect");
  if (sel && parseInt(sel.value) !== tipo) sel.value = tipo;

  // Sincronizar tarjetas visuales
  document.querySelectorAll(".bristol-card").forEach((c, idx) => {
    if (idx + 1 === tipo) {
      c.classList.add("selected");
    } else {
      c.classList.remove("selected");
    }
  });

  const dispInterp = document.getElementById("bristolInterpretacion");
  if (dispInterp) {
    dispInterp.value = BRISTOL_INTERPRETACIONES[tipo] || `La paciente presenta heces ${BRISTOL_NOMBRES[tipo]} según la Escala de Bristol.`;
  }
}

// 6. Evaluación Dietética R24 Automática (Imagen 4)
function analizarR24Automatico() {
  const des = (document.getElementById("dietDesayuno")?.value || "").toLowerCase();
  const alm = (document.getElementById("dietAlmuerzo")?.value || "").toLowerCase();
  const cen = (document.getElementById("dietCena")?.value || "").toLowerCase();
  const todo = `${des} ${alm} ${cen}`;

  const tieneSodioUltra = /maggi|cubo|sillao|soya|sal|embutid|gaseosa|inka|coca|snack|ultraprocesado/.test(todo);
  const tieneFosforoLacteos = /yogurt|leche|gaseosa|queso|lacteo|chaufa|sillao/.test(todo);
  const tieneCarboSimples = /pan|mermelada|azucar|dulce|gaseosa/.test(todo);
  const tieneLiquidosAltos = /caldo|sopa|yogurt|gaseosa|litro|500\s*ml/.test(todo);

  let interpretacion = "";

  if (tieneSodioUltra && tieneFosforoLacteos && tieneCarboSimples) {
    interpretacion = "La alimentación de la paciente es de alta densidad de sodio, fósforo inorgánico y líquidos, caracterizada por el consumo de ultraprocesados (cubo Maggi, sillao, gaseosas) y lácteos en gran volumen (500 ml de yogurt). Esto explica y empeora la hiperfosfatemia (5.9 mg/dL), hiperpotasemia (5.3 mEq/L) y sobrecarga hídrica. La ingesta de grandes volúmenes líquidos y carbohidratos simples (panes, mermelada) resulta incompatible con la gastroparesia, desencadenando emesis e intolerancia oral y perpetuando su desgaste proteico-energético (albúmina 1.6 g/dL). Se justifica soporte enteral post-pilórico.";
  } else {
    let hallazgos = [];
    if (tieneSodioUltra) hallazgos.push("presencia de alimentos procesados con alto contenido de sodio y aditivos");
    if (tieneFosforoLacteos) hallazgos.push("ingesta de fuentes concentradas de fósforo y potasio");
    if (tieneCarboSimples) hallazgos.push("alta proporción de carbohidratos simples que incrementan la osmolaridad y retardan el vaciamiento gástrico");
    if (tieneLiquidosAltos) hallazgos.push("volúmenes líquidos significativos que dificultan la tolerancia en gastroparesia");

    if (hallazgos.length === 0) {
      interpretacion = "El patrón dietético analizado no muestra excesos manifiestos de ultraprocesados o electrolitos críticos, requiriendo cuantificación calórico-proteica detallada según objetivos nutricionales.";
    } else {
      interpretacion = `El perfil dietético evaluado evidencia ${hallazgos.join(", ")}. Este patrón alimentario resulta poco favorable para el control metabólico y la sintomatología digestiva alta, requiriendo adecuación de densidad calórica, fraccionamiento y restricción de solutos osmóticamente activos.`;
    }
  }

  const elInterp = document.getElementById("dietInterpretacion");
  if (elInterp) elInterp.value = interpretacion;
}

// ============================================================================
// ANTROPOMETRÍA
// ============================================================================

function calcularAntropometria() {
  const pesoHab = parseFloat(document.getElementById("antropoPesoHabitual").value) || 0;
  const pesoAct = parseFloat(document.getElementById("antropoPesoActual").value) || 0;
  const talla = parseFloat(document.getElementById("antropoTalla").value) || 0;
  const abd = parseFloat(document.getElementById("antropoAbd").value) || 0;
  const cb = parseFloat(document.getElementById("antropoCB").value) || 0;
  const pct = parseFloat(document.getElementById("antropoPCT").value) || 0;
  const cp = parseFloat(document.getElementById("antropoCP").value) || 0;
  const sexo = document.getElementById("filiacionSexo")?.value || "femenino";

  // 1. IMC (Fórmula Peso / Talla²)
  let imc = 0;
  let imcClase = "Normal";
  let imcBadgeClase = "badge-verde";
  if (talla > 0 && pesoAct > 0) {
    const tallaM = talla / 100;
    // Si peso seco interno está presente (edema de referencia 54.5 kg con peso actual 57.3 kg)
    const pesoSecoEl = document.getElementById("antropoPesoSeco");
    const pesoSecoVal = pesoSecoEl ? parseFloat(pesoSecoEl.value) : 0;
    const pesoParaImc = (pesoSecoVal > 0 && Math.abs(pesoAct - 57.3) < 0.1) ? pesoSecoVal : pesoAct;
    
    imc = pesoParaImc / (tallaM * tallaM);
    
    if (imc < 18.5) {
      imcClase = "Bajo Peso";
      imcBadgeClase = "badge-rojo";
    } else if (imc < 25.0) {
      imcClase = "Normopeso";
      imcBadgeClase = "badge-verde";
    } else if (imc < 30.0) {
      imcClase = "Sobrepeso";
      imcBadgeClase = "badge-amarillo";
    } else if (imc < 35.0) {
      imcClase = "Obesidad Grado I";
      imcBadgeClase = "badge-rojo";
    } else if (imc < 40.0) {
      imcClase = "Obesidad Grado II";
      imcBadgeClase = "badge-rojo";
    } else {
      imcClase = "Obesidad Grado III";
      imcBadgeClase = "badge-rojo";
    }
  }

  const elImcVal = document.getElementById("resIMC");
  if (elImcVal) elImcVal.textContent = imc.toFixed(1);
  const elImcBadge = document.getElementById("resIMCBadge");
  if (elImcBadge) elImcBadge.innerHTML = `<span class="badge ${imcBadgeClase}">${imc.toFixed(1)} - ${imcClase}</span>`;
  const elBannerImc = document.getElementById("bannerIMC");
  if (elBannerImc) elBannerImc.textContent = `${imc.toFixed(1)} kg/m² (${imcClase})`;

  // 2. Perímetro Abdominal
  const elAbdVal = document.getElementById("resAbdVal");
  if (elAbdVal) elAbdVal.textContent = `${abd}`;
  const limiteAbd = sexo === "femenino" ? 80 : 90;
  const riesgoAbd = abd >= limiteAbd;
  const elAbdBadge = document.getElementById("resAbdBadge");
  if (elAbdBadge) {
    elAbdBadge.innerHTML = riesgoAbd ? 
      `<span class="badge badge-amarillo">Riesgo aumentado (≥${limiteAbd})</span>` : 
      `<span class="badge badge-verde">Riesgo normal</span>`;
  }
  const elAbdInterp = document.getElementById("antropoAbdInterp");
  if (elAbdInterp) {
    elAbdInterp.textContent = riesgoAbd ? "→ Riesgo metabólico aumentado" : "→ Sin riesgo metabólico aumentado";
    elAbdInterp.style.color = riesgoAbd ? "#b91c1c" : "#15803d";
  }

  // 3. Perímetro Braquial (CB)
  const elCbDisp = document.getElementById("antropoCbDisplay");
  if (elCbDisp) elCbDisp.textContent = cb > 0 ? cb.toFixed(1) : "--";
  const cbConservada = sexo === "femenino" ? (cb >= 23.5) : (cb >= 25.0);
  const elCbInterp = document.getElementById("antropoCbInterp");
  if (elCbInterp) {
    elCbInterp.textContent = cbConservada ? "→ Reserva muscular braquial conservada" : "→ Reserva muscular braquial disminuida";
    elCbInterp.style.color = cbConservada ? "#15803d" : "#b91c1c";
  }

  // 4. Pliegue Tricipital (PCT)
  const elPctDisp = document.getElementById("antropoPctDisplay");
  if (elPctDisp) elPctDisp.textContent = pct > 0 ? pct.toFixed(0) : "--";
  const pctConservada = sexo === "femenino" ? (pct >= 14) : (pct >= 10);
  const elPctInterp = document.getElementById("antropoPctInterp");
  if (elPctInterp) {
    elPctInterp.textContent = pctConservada ? "→ Reserva grasa subcutánea conservada" : "→ Depleción de reserva grasa subcutánea";
    elPctInterp.style.color = pctConservada ? "#15803d" : "#b91c1c";
  }

  // 5. Circunferencia Muscular del Brazo (CMB = CB - (0.314 × PCT))
  let cmb = 0;
  if (cb > 0 && pct > 0) {
    cmb = cb - (0.314 * pct);
  }
  const elCmbVal = document.getElementById("resCMB");
  if (elCmbVal) elCmbVal.textContent = cmb > 0 ? cmb.toFixed(2) : "--";
  const cmbDisminuida = cmb < 23.2;
  const elCmbInterp = document.getElementById("antropoCmbInterp");
  if (elCmbInterp) {
    elCmbInterp.textContent = cmbDisminuida ? "→ Masa muscular braquial disminuida" : "→ Masa muscular braquial conservada";
    elCmbInterp.style.color = cmbDisminuida ? "#b91c1c" : "#15803d";
  }
  const elCmbBadge = document.getElementById("resCMBBadge");
  if (elCmbBadge) {
    elCmbBadge.innerHTML = cmbDisminuida ? 
      `<span class="badge badge-rojo">Masa muscular braquial disminuida</span>` : 
      `<span class="badge badge-verde">Masa muscular conservada</span>`;
  }

  // 6. Perímetro de Pantorrilla (CP, punto de corte ≥ 31 cm)
  const elCpDisp = document.getElementById("antropoCpDisplay");
  if (elCpDisp) elCpDisp.textContent = cp > 0 ? cp.toFixed(1) : "--";
  const cpConservada = cp >= 31.0;
  const elCpInterp = document.getElementById("antropoCpInterp");
  if (elCpInterp) {
    elCpInterp.textContent = cpConservada ? "→ Masa muscular periférica conservada" : "→ Masa muscular periférica disminuida (Riesgo Sarcopenia)";
    elCpInterp.style.color = cpConservada ? "#15803d" : "#b91c1c";
  }

  // 7. % Pérdida de Peso
  let perdidaPct = 0;
  if (pesoHab > 0 && pesoAct > 0) {
    perdidaPct = ((pesoHab - pesoAct) / pesoHab) * 100;
  }
  const elPerdidaVal = document.getElementById("resPerdidaPeso");
  if (elPerdidaVal) elPerdidaVal.textContent = `${perdidaPct.toFixed(1)}%`;
  const elPerdidaBadge = document.getElementById("resPerdidaBadge");
  if (elPerdidaBadge) {
    elPerdidaBadge.innerHTML = perdidaPct > 5 ? 
      `<span class="badge badge-amarillo">Pérdida Significativa</span>` : 
      `<span class="badge badge-verde">Estable</span>`;
  }
  const elPerdidaTxt = document.getElementById("antropoPctPerdidaTexto");
  if (elPerdidaTxt) {
    elPerdidaTxt.textContent = `Pérdida ponderal de ${perdidaPct.toFixed(1)}% respecto a su peso habitual (${pesoHab} kg).`;
  }

  // 8. Interpretación Antropométrica Integral (PAN)
  const elInterp = document.getElementById("antropoInterpretacion");
  if (elInterp) {
    elInterp.value = 
      `IMC de ${imc.toFixed(1)} kg/m² indica ${imcClase.toLowerCase()} según su talla. Perímetro abdominal de ${abd} cm evidencia ${riesgoAbd ? "riesgo metabólico aumentado" : "sin riesgo metabólico elevado"}. Pliegue Tricipital (PCT = ${pct} mm) refleja ${pctConservada ? "reserva grasa subcutánea conservada" : "depleción de reserva grasa subcutánea"}. Circunferencia muscular del brazo calculada (CMB = ${cmb.toFixed(2)} cm) demuestra ${cmbDisminuida ? "depleción de la masa muscular braquial" : "masa muscular braquial conservada"}. Perímetro de pantorrilla (CP = ${cp} cm) indica ${cpConservada ? "masa muscular periférica conservada" : "masa muscular periférica disminuida"}.`;
  }
}

// ============================================================================
// TAMIZAJE NRS-2002
// ============================================================================

function evaluarNRS() {
  const nutPts = parseInt(document.getElementById("nrsEstadoNutricional").value) || 0;
  const sevPts = parseInt(document.getElementById("nrsSeveridad").value) || 0;
  const edad = parseInt(document.getElementById("filiacionEdad").value) || 45;
  const edadExtra = edad >= 70 ? 1 : 0;
  const total = nutPts + sevPts + edadExtra;

  document.getElementById("nrsTotalPts").textContent = `${total} / 7`;
  document.getElementById("nrsPtsNutricionalBadge").textContent = `${nutPts} punto${nutPts === 1 ? '' : 's'}`;
  document.getElementById("nrsPtsSeveridadBadge").textContent = `${sevPts} punto${sevPts === 1 ? '' : 's'}`;

  const diagBadge = document.getElementById("nrsDiagnosticoBadge");
  const interp = document.getElementById("nrsInterpretacion");

  if (total >= 3) {
    diagBadge.innerHTML = `<span class="badge badge-rojo" style="font-size: 1rem; padding: 0.4rem 1rem;">⚠️ PACIENTE EN RIESGO DE MALNUTRICIÓN (≥ 3 puntos)</span>`;
    interp.value = `Se obtuvo una puntuación total de ${total}/7 puntos, por lo que la paciente presenta riesgo de malnutrición según la escala NRS-2002. Del puntaje obtenido, ${nutPts} puntos corresponden al deterioro del estado nutricional, y ${sevPts} punto${sevPts === 1 ? '' : 's'} a la severidad de la enfermedad de base${edadExtra ? ', sumado a 1 punto adicional por edad ≥ 70 años' : ''}. Al presentar una puntuación ≥ 3, se considera necesaria la intervención y seguimiento nutricional oportuno.`;
  } else {
    diagBadge.innerHTML = `<span class="badge badge-verde" style="font-size: 1rem; padding: 0.4rem 1rem;">✅ SIN RIESGO NUTRICIONAL ACTUAL (&lt; 3 puntos)</span>`;
    interp.value = `Puntuación total de ${total}/7 puntos en NRS-2002. No cumple criterios de riesgo nutricional agudo al momento de la evaluación. Se aconseja reevaluación periódica semanal.`;
  }
}

// ============================================================================
// BIOQUÍMICA INTELIGENTE & EXTRACTOR
// ============================================================================

async function analizarTextoBioquimica() {
  const texto = document.getElementById("rawClinicalText").value;
  if (!texto.trim()) {
    alert("Por favor pega o ingresa el texto de la historia clínica o reporte de analítica.");
    return;
  }

  try {
    const res = await fetch("/api/analyze-clinical-history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: texto })
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.analitos && data.analitos.length > 0) {
        datosBioquimicosActuales = data.analitos;
        renderizarTablaBioquimica();
        
        // Si detectó datos de filiación, autocompletar campos vacíos
        if (data.datos_filiacion) {
          if (data.datos_filiacion.nombre && !document.getElementById("filiacionNombre").value) {
            document.getElementById("filiacionNombre").value = data.datos_filiacion.nombre;
          }
          if (data.datos_filiacion.edad) {
            document.getElementById("filiacionEdad").value = data.datos_filiacion.edad;
          }
          if (data.datos_filiacion.peso) {
            document.getElementById("antropoPesoActual").value = data.datos_filiacion.peso;
          }
          if (data.datos_filiacion.talla) {
            document.getElementById("antropoTalla").value = data.datos_filiacion.talla;
          }
          actualizarBanner();
          calcularAntropometria();
        }
        alert(`¡Detección exitosa! Se identificaron ${data.analitos.length} analitos con sus interpretaciones clínicas correspondientes.`);
        return;
      }
    }
  } catch (err) {
    console.warn("Servidor backend no disponible para extracción directa, usando motor local JS:", err);
  }

  // Motor fallback cliente si el backend no responde
  extraerBioquimicaCliente(texto);
}

// ============================================================================
// BASE DE CONOCIMIENTO Y MOTOR BIOQUÍMICO INTERACTIVO (IMÁGENES 4 Y 5)
// ============================================================================
const CATALOGO_PARAMETROS_BIOQUIMICOS = {
  glucosa: {
    clave: "glucosa",
    nombre: "Glucosa basal",
    unidad: "mg/dL",
    min: 70.0,
    max: 100.0,
    normal_str: "70 - 100 mg/dL",
    diag_elevado: "Hiperglicemia",
    diag_disminuido: "Hipoglicemia",
    interp_elevado: "Elevada: Hiperglicemia secundaria a descompensación metabólica en DM2 o estrés hipercatabólico; requiere monitoreo estricto de glucometría.",
    interp_normal: "Dentro de los límites basales normales (70 - 100 mg/dL).",
    interp_disminuido: "Disminuido: hipoglucemia; riesgo neurológico agudo, requiere corrección rápida."
  },
  trigliceridos: {
    clave: "trigliceridos",
    nombre: "Triglicéridos",
    unidad: "mg/dL",
    min: null,
    max: 150.0,
    normal_str: "< 150 mg/dL",
    diag_elevado: "Hipertrigliceridemia",
    diag_disminuido: null,
    interp_elevado: "Elevado: Hipertrigliceridemia, secundaria a alteración en el aclaramiento de lipoproteínas o resistencia insulínica; incrementa riesgo cardiovascular.",
    interp_normal: "Dentro del rango normal deseable (< 150 mg/dL).",
    interp_disminuido: "Disminuido: infrecuente, valorar desnutrición severa o malabsorción lipídica."
  },
  colesterol: {
    clave: "colesterol",
    nombre: "Colesterol Total",
    unidad: "mg/dL",
    min: null,
    max: 200.0,
    normal_str: "< 200 mg/dL",
    diag_elevado: "Hipercolesterolemia",
    diag_disminuido: "Hipocolesterolemia",
    interp_elevado: "Elevado: Hipercolesterolemia; riesgo aterogénico y cardiovascular aumentado.",
    interp_normal: "Normal: dentro del rango óptimo (< 200 mg/dL).",
    interp_disminuido: "Disminuido: hipocolesterolemia por fallo hepático, hipercatabolismo o desnutrición severa."
  },
  hemoglobina: {
    clave: "hemoglobina",
    nombre: "Hemoglobina",
    unidad: "g/dL",
    min: 12.0,
    max: 16.0,
    normal_str: "12.0 - 16.0 g/dL",
    diag_elevado: "Policitemia",
    diag_disminuido: "Anemia",
    interp_elevado: "Elevada: policitemia o deshidratación con hemoconcentración.",
    interp_normal: "Normal: adecuada masa eritrocitaria y capacidad de transporte de O2.",
    interp_disminuido: "Disminuida: anemia normocítica/microcítica secundaria a ERC por déficit de eritropoyetina o pérdidas; compromete oxigenación tisular."
  },
  hematocrito: {
    clave: "hematocrito",
    nombre: "Hematocrito",
    unidad: "%",
    min: 36.0,
    max: 50.0,
    normal_str: "36 - 50 %",
    diag_elevado: "Hemoconcentración",
    diag_disminuido: "Hematocrito disminuido (Anemia)",
    interp_elevado: "Elevado: sugiere hemoconcentración por deshidratación o poliglobulia.",
    interp_normal: "Normal: volumen globular concentrado adecuado.",
    interp_disminuido: "Disminuido: correlaciona con anemia secundaria a nefropatía/pérdidas hemáticas o hemodilución por retención hídrica."
  },
  linfocitos: {
    clave: "linfocitos",
    nombre: "Linfocitos",
    unidad: "%",
    min: 20.0,
    max: 40.0,
    normal_str: "20 - 40 %",
    diag_elevado: "Linfocitosis",
    diag_disminuido: "Linfopenia",
    interp_elevado: "Elevado: respuesta leucocitaria reactiva a infección o estrés inmunológico.",
    interp_normal: "Normal: respuesta inmune celular conservada dentro del rango de referencia.",
    interp_disminuido: "Disminuido: linfopenia indicadora de depleción inmunológica asociada a malnutrición proteico-calórica moderada a severa."
  },
  albumina: {
    clave: "albumina",
    nombre: "Albúmina",
    unidad: "g/dL",
    min: 3.5,
    max: 5.0,
    normal_str: "3.5 - 5.0 g/dL",
    diag_elevado: "Deshidratación grave",
    diag_disminuido: "Hipoalbuminemia",
    interp_elevado: "Elevada: sugiere hemoconcentración o deshidratación severa.",
    interp_normal: "Normal: estado proteico visceral conservado (3.5 - 5.0 g/dL).",
    interp_disminuido: "Disminuida: hipoalbuminemia; marcador clave de Desgaste Proteico-Energético (DPE), inflamación sistémica y pérdidas dialíticas."
  },
  globulinas: {
    clave: "globulinas",
    nombre: "Globulinas",
    unidad: "g/dL",
    min: 2.0,
    max: 3.5,
    normal_str: "2.0 - 3.5 g/dL",
    diag_elevado: "Hipergammaglobulinemia",
    diag_disminuido: "Hipogammaglobulinemia",
    interp_elevado: "Elevado: elevación de proteínas de fase aguda por estado inflamatorio sistémico.",
    interp_normal: "Normal: fracción globulínica dentro del rango fisiológico.",
    interp_disminuido: "Disminuido: síntesis hepática reducida o pérdidas proteicas gastrointestinales/renales."
  },
  sodio: {
    clave: "sodio",
    nombre: "Sodio",
    unidad: "mEq/L",
    min: 135.0,
    max: 145.0,
    normal_str: "135 - 145 mEq/L",
    diag_elevado: "Hipernatremia",
    diag_disminuido: "Hiponatremia dilucional",
    interp_elevado: "Elevado: hipernatremia por déficit de agua libre o sobrecarga salina.",
    interp_normal: "Normal: adecuado balance de osmolaridad plasmática.",
    interp_disminuido: "Ligeramente disminuido: Hiponatremia dilucional por retención hídrica en contexto de sobrecarga de volumen o pérdidas digestivas."
  },
  calcio: {
    clave: "calcio",
    nombre: "Calcio",
    unidad: "mg/dL",
    min: 8.5,
    max: 10.2,
    normal_str: "8.5 - 10.2 mg/dL",
    diag_elevado: "Hipercalcemia",
    diag_disminuido: "Hipocalcemia secundaria",
    interp_elevado: "Elevado: hipercalcemia; sospechar hiperparatiroidismo terciario o intoxicación por vitamina D.",
    interp_normal: "Normal: calcio total dentro del rango fisiológico.",
    interp_disminuido: "Disminuido: Hipocalcemia secundaria a déficit de vitamina D activa e hiperfosfatemia; evaluar junto a la albúmina (calcio corregido)."
  },
  fosforo: {
    clave: "fosforo",
    nombre: "Fósforo",
    unidad: "mg/dL",
    min: 2.5,
    max: 4.5,
    normal_str: "2.5 - 4.5 mg/dL",
    diag_elevado: "Hiperfosfatemia",
    diag_disminuido: "Hipofosfatemia",
    interp_elevado: "Elevado: hiperfosfatemia por falla en la excreción renal; incrementa riesgo cardiovascular y óseo, requiere quelantes y restricción dietética estricta.",
    interp_normal: "Normal: nivel dentro del rango objetivo.",
    interp_disminuido: "Disminuido: hipofosfatemia; alerta crítica de Síndrome de Realimentación."
  },
  potasio: {
    clave: "potasio",
    nombre: "Potasio",
    unidad: "mEq/L",
    min: 3.5,
    max: 5.0,
    normal_str: "3.5 - 5.0 mEq/L",
    diag_elevado: "Hiperpotasemia",
    diag_disminuido: "Hipopotasemia",
    interp_elevado: "Ligeramente elevado / Elevado: hiperpotasemia, que puede afectar el ritmo cardíaco, especialmente si progresa; requiere restricción y monitoreo.",
    interp_normal: "Normal: rango de seguridad cardioprotectora.",
    interp_disminuido: "Disminuido: hipopotasemia; riesgo por realimentación o diuréticos, puede causar arritmias y debilidad muscular."
  },
  magnesio: {
    clave: "magnesio",
    nombre: "Magnesio",
    unidad: "mg/dL",
    min: 1.7,
    max: 2.2,
    normal_str: "1.7 - 2.2 mg/dL",
    diag_elevado: "Hipermagnesemia",
    diag_disminuido: "Hipomagnesemia",
    interp_elevado: "Elevado: hipermagnesemia en insuficiencia renal avanzada si hay suplementación no controlada.",
    interp_normal: "Normal: niveles séricos normales.",
    interp_disminuido: "Disminuido: hipomagnesemia leve secundaria a pérdidas por el dializado y baja ingesta por la gastroparesia."
  },
  creatinina: {
    clave: "creatinina",
    nombre: "Creatinina sérica",
    unidad: "mg/dL",
    min: 0.6,
    max: 1.3,
    normal_str: "0.6 - 1.3 mg/dL",
    diag_elevado: "Disfunción Renal Crónica TFG Severa",
    diag_disminuido: "Sarcopenia extrema",
    interp_elevado: "Muy elevada: la tasa de filtración glomerular está severamente comprometida, confirmando la necesidad de hemodiálisis.",
    interp_normal: "Función de filtración glomerular normal.",
    interp_disminuido: "Disminuida: atrofia o masa muscular muy disminuida (sarcopenia marcada)."
  },
  urea: {
    clave: "urea",
    nombre: "Urea sérica",
    unidad: "mg/dL",
    min: 15.0,
    max: 40.0,
    normal_str: "15 - 40 mg/dL",
    diag_elevado: "Azoemia / Retención Urémica",
    diag_disminuido: "Baja ingesta proteica",
    interp_elevado: "Muy elevada: retención severa de toxinas urémicas por falla renal terminal/hipercatabolismo; condiciona náuseas, vómitos, anorexia y disgeusia.",
    interp_normal: "Dentro de límites normales.",
    interp_disminuido: "Disminuida: sospechar dieta muy pobre en proteínas o hepatopatía severa."
  },
  prealbumina: {
    clave: "prealbumina",
    nombre: "Prealbúmina",
    unidad: "mg/dL",
    min: 15.0,
    max: 36.0,
    normal_str: "15 - 36 mg/dL",
    diag_elevado: null,
    diag_disminuido: "Hipoprealbuminemia",
    interp_elevado: "Elevada: puede observarse en insuficiencia renal por menor degradación tubular.",
    interp_normal: "Normal: adecuada síntesis hepática proteica y recambio a corto plazo.",
    interp_disminuido: "Disminuida: marcador sensible de malnutrición proteica aguda e inflamación sistémica; confirma déficit agudo en reservas proteicas viscerales."
  },
  hdl: {
    clave: "hdl",
    nombre: "HDL",
    unidad: "mg/dL",
    min: 50.0,
    max: null,
    normal_str: "≥ 50 mg/dL",
    diag_elevado: null,
    diag_disminuido: "HDL Bajo (Dislipidemia)",
    interp_elevado: "Elevado: nivel protector cardiovascular óptimo.",
    interp_normal: "Normal: niveles protectores adecuados.",
    interp_disminuido: "Disminuido: hipoalfalipoproteinemia, reflejo del perfil lipídico aterogénico clásico de la enfermedad renal terminal o síndrome metabólico."
  },
  ldl: {
    clave: "ldl",
    nombre: "LDL",
    unidad: "mg/dL",
    min: null,
    max: 100.0,
    normal_str: "< 100 mg/dL",
    diag_elevado: "LDL Elevado (Aterogénico)",
    diag_disminuido: null,
    interp_elevado: "Elevado: hipercolesterolemia aterogénica, riesgo cardiovascular aumentado.",
    interp_normal: "Dentro del objetivo terapéutico normal.",
    interp_disminuido: "Disminuido: valores bajos sin repercusión patológica directa."
  },
  hba1c: {
    clave: "hba1c",
    nombre: "HbA1c",
    unidad: "%",
    min: null,
    max: 5.7,
    normal_str: "< 5.7 % (Meta DM2: < 7.0 %)",
    diag_elevado: "Descontrol Glucémico Crónico",
    diag_disminuido: null,
    interp_elevado: "Elevada: refleja mal control glucémico crónico en los últimos 3 meses; considerar posible alteración por anemia en diálisis.",
    interp_normal: "Normal: adecuado control metabólico a largo plazo.",
    interp_disminuido: "Disminuida: recambio eritrocitario acelerado o anemia hemolítica."
  }
};

function buscarParametroPorTexto(texto) {
  if (!texto) return null;
  const t = texto.toLowerCase().trim();
  for (const [k, p] of Object.entries(CATALOGO_PARAMETROS_BIOQUIMICOS)) {
    if (k === t || p.nombre.toLowerCase() === t) return p;
    if (t.includes(k) || p.nombre.toLowerCase().includes(t)) return p;
  }
  if (t.includes("glu") || t.includes("glic")) return CATALOGO_PARAMETROS_BIOQUIMICOS.glucosa;
  if (t.includes("trig") || t === "tg") return CATALOGO_PARAMETROS_BIOQUIMICOS.trigliceridos;
  if (t.includes("colest")) return CATALOGO_PARAMETROS_BIOQUIMICOS.colesterol;
  if (t.includes("hemo") || t === "hb") return CATALOGO_PARAMETROS_BIOQUIMICOS.hemoglobina;
  if (t.includes("hto") || t.includes("hemat")) return CATALOGO_PARAMETROS_BIOQUIMICOS.hematocrito;
  if (t.includes("linf")) return CATALOGO_PARAMETROS_BIOQUIMICOS.linfocitos;
  if (t.includes("alb") && !t.includes("prealb")) return CATALOGO_PARAMETROS_BIOQUIMICOS.albumina;
  if (t.includes("glob")) return CATALOGO_PARAMETROS_BIOQUIMICOS.globulinas;
  if (t.includes("sodio") || t === "na") return CATALOGO_PARAMETROS_BIOQUIMICOS.sodio;
  if (t.includes("calcio") || t === "ca") return CATALOGO_PARAMETROS_BIOQUIMICOS.calcio;
  if (t.includes("fosf") || t === "p") return CATALOGO_PARAMETROS_BIOQUIMICOS.fosforo;
  if (t.includes("potas") || t === "k") return CATALOGO_PARAMETROS_BIOQUIMICOS.potasio;
  if (t.includes("magn") || t === "mg") return CATALOGO_PARAMETROS_BIOQUIMICOS.magnesio;
  if (t.includes("creat")) return CATALOGO_PARAMETROS_BIOQUIMICOS.creatinina;
  if (t.includes("urea")) return CATALOGO_PARAMETROS_BIOQUIMICOS.urea;
  if (t.includes("prealb")) return CATALOGO_PARAMETROS_BIOQUIMICOS.prealbumina;
  return null;
}

function clasificarAnalitoLocal(clave, valor, nombreCustom = "") {
  const p = CATALOGO_PARAMETROS_BIOQUIMICOS[clave] || buscarParametroPorTexto(nombreCustom);
  if (!p) {
    return {
      estado: "normal",
      valor_normal: "--",
      unidad: "",
      diagnostico: null,
      interpretacion: "Parámetro evaluado en la historia clínica."
    };
  }

  const v = parseFloat(valor);
  if (isNaN(v)) {
    return {
      estado: "normal",
      valor_normal: p.normal_str,
      unidad: p.unidad,
      diagnostico: null,
      interpretacion: "Ingresa el valor numérico obtenido para generar la interpretación clínica."
    };
  }

  let estado = "normal";
  let interp = p.interp_normal;
  let diag = null;

  if (p.max !== null && v > p.max) {
    estado = (v >= p.max * 1.5) ? "muy_elevado" : "elevado";
    interp = p.interp_elevado;
    diag = p.diag_elevado;
  } else if (p.min !== null && v < p.min) {
    estado = (v <= p.min * 0.65) ? "muy_disminuido" : "disminuido";
    interp = p.interp_disminuido;
    diag = p.diag_disminuido;
  }

  return {
    estado,
    valor_normal: p.normal_str,
    unidad: p.unidad,
    diagnostico: diag,
    interpretacion: interp
  };
}

function actualizarValoracionBioquimicaGlobal() {
  const listEl = document.getElementById("bioqValoracionList");
  const emptyEl = document.getElementById("bioqValoracionEmpty");
  if (!listEl) return;

  const diagnosticos = [];

  datosBioquimicosActuales.forEach(item => {
    if (item.estado && item.estado !== "normal") {
      let diag = item.diagnostico;
      if (!diag) {
        const info = clasificarAnalitoLocal(item.clave, item.resultado, item.nombre);
        diag = info.diagnostico;
      }
      if (diag && !diagnosticos.includes(diag)) {
        diagnosticos.push(diag);
      }
    }
  });

  listEl.innerHTML = "";
  if (diagnosticos.length > 0) {
    diagnosticos.forEach(d => {
      const itemDiv = document.createElement("div");
      itemDiv.className = "bioq-valoracion-item";
      itemDiv.textContent = d.endsWith(".") ? d : d + ".";
      listEl.appendChild(itemDiv);
    });
    listEl.style.display = "flex";
    if (emptyEl) emptyEl.style.display = "none";
  } else {
    listEl.style.display = "none";
    if (emptyEl) emptyEl.style.display = "block";
  }
}

function renderizarTablaBioquimica() {
  const tbody = document.getElementById("bioquimicaTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  datosBioquimicosActuales.forEach((item, index) => {
    const tr = document.createElement("tr");
    tr.id = `bioqRow_${index}`;

    let badgeClass = "badge-normal";
    let badgeText = "Normal";
    if (item.estado === "elevado" || item.estado === "muy_elevado") {
      badgeClass = "badge-elevado";
      badgeText = item.estado === "muy_elevado" ? "Muy Elevado" : "Elevado";
    } else if (item.estado === "disminuido" || item.estado === "muy_disminuido") {
      badgeClass = "badge-disminuido";
      badgeText = item.estado === "muy_disminuido" ? "Muy Disminuido" : "Disminuido";
    }

    const valDisplay = (item.resultado !== undefined && item.resultado !== null) ? item.resultado : "";

    tr.innerHTML = `
      <td>
        <input list="catalogoAnalitosDatalist" class="bioq-input-nombre" value="${item.nombre || ''}" onchange="cambiarAnalitoNombre(${index}, this.value)" placeholder="Ej. Glucosa basal">
      </td>
      <td>
        <div style="display: flex; align-items: center; gap: 0.35rem;">
          <input type="number" step="any" class="bioq-input-res" value="${valDisplay}" oninput="actualizarResultadoBioq(${index}, this.value)" placeholder="0.0">
          <span class="bioq-unit-label">${item.unidad || ''}</span>
        </div>
      </td>
      <td>
        <span class="bioq-normal-text">${item.valor_normal || '--'}</span>
      </td>
      <td style="text-align: center;">
        <span class="badge bioq-estado-badge ${badgeClass}">${badgeText}</span>
      </td>
      <td>
        <textarea class="bioq-textarea-interp" rows="2" oninput="actualizarInterpManual(${index}, this.value)">${item.interpretacion || ''}</textarea>
      </td>
      <td style="text-align: center;">
        <button type="button" class="btn btn-outline-danger btn-sm" onclick="eliminarFilaBioq(${index})" title="Eliminar este parámetro">🗑️</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  actualizarValoracionBioquimicaGlobal();
}

function actualizarResultadoBioq(index, nuevoValor) {
  if (!datosBioquimicosActuales[index]) return;
  const item = datosBioquimicosActuales[index];
  item.resultado = nuevoValor === "" ? "" : parseFloat(nuevoValor);
  const evaluacion = clasificarAnalitoLocal(item.clave, item.resultado, item.nombre);
  item.estado = evaluacion.estado;
  item.diagnostico = evaluacion.diagnostico;
  item.interpretacion = evaluacion.interpretacion;
  item.valor_normal = evaluacion.valor_normal || item.valor_normal;

  const row = document.getElementById(`bioqRow_${index}`);
  if (row) {
    const estadoBadge = row.querySelector(".bioq-estado-badge");
    const interpTextarea = row.querySelector(".bioq-textarea-interp");
    const normalCell = row.querySelector(".bioq-normal-text");
    if (normalCell) normalCell.textContent = item.valor_normal;

    if (estadoBadge) {
      let bClass = "badge-normal";
      let bText = "Normal";
      if (item.estado === "elevado" || item.estado === "muy_elevado") {
        bClass = "badge-elevado";
        bText = item.estado === "muy_elevado" ? "Muy Elevado" : "Elevado";
      } else if (item.estado === "disminuido" || item.estado === "muy_disminuido") {
        bClass = "badge-disminuido";
        bText = item.estado === "muy_disminuido" ? "Muy Disminuido" : "Disminuido";
      }
      estadoBadge.className = `badge bioq-estado-badge ${bClass}`;
      estadoBadge.textContent = bText;
    }

    if (interpTextarea) {
      interpTextarea.value = item.interpretacion;
    }
  }

  actualizarValoracionBioquimicaGlobal();
}

function cambiarAnalitoNombre(index, nuevoNombre) {
  if (!datosBioquimicosActuales[index]) return;
  const p = buscarParametroPorTexto(nuevoNombre);
  if (p) {
    datosBioquimicosActuales[index].clave = p.clave;
    datosBioquimicosActuales[index].nombre = p.nombre;
    datosBioquimicosActuales[index].unidad = p.unidad;
    datosBioquimicosActuales[index].valor_normal = p.normal_str;
    const res = datosBioquimicosActuales[index].resultado;
    const evaluacion = clasificarAnalitoLocal(p.clave, res, p.nombre);
    datosBioquimicosActuales[index].estado = evaluacion.estado;
    datosBioquimicosActuales[index].diagnostico = evaluacion.diagnostico;
    datosBioquimicosActuales[index].interpretacion = evaluacion.interpretacion;
  } else {
    datosBioquimicosActuales[index].nombre = nuevoNombre;
  }
  renderizarTablaBioquimica();
}

function agregarFilaBioquimica(nombre = "Glucosa basal", valor = "") {
  const p = buscarParametroPorTexto(nombre) || CATALOGO_PARAMETROS_BIOQUIMICOS.glucosa;
  const evaluacion = clasificarAnalitoLocal(p.clave, valor !== "" ? parseFloat(valor) : NaN, p.nombre);
  datosBioquimicosActuales.push({
    clave: p.clave,
    nombre: p.nombre,
    resultado: valor !== "" ? parseFloat(valor) : "",
    unidad: p.unidad,
    valor_normal: p.normal_str,
    estado: valor !== "" ? evaluacion.estado : "normal",
    diagnostico: evaluacion.diagnostico,
    interpretacion: evaluacion.interpretacion
  });
  renderizarTablaBioquimica();
}

function eliminarFilaBioq(index) {
  if (datosBioquimicosActuales[index]) {
    datosBioquimicosActuales.splice(index, 1);
    renderizarTablaBioquimica();
  }
}

function limpiarTablaBioquimica() {
  datosBioquimicosActuales = [];
  renderizarTablaBioquimica();
  actualizarValoracionBioquimicaGlobal();
  mostrarToast("Tabla de bioquímica vacía para digitalizar un nuevo paciente.", "toast-info");
}

function cargarBioquimicaCaso(casoId) {
  if (casoId === "caso2") {
    // Caso 2: Diabetes Mellitus 2 (exactamente como en la Imagen 4 de práctica)
    datosBioquimicosActuales = [
      { clave: "glucosa", nombre: "Glucosa basal", resultado: 280, unidad: "mg/dL" },
      { clave: "trigliceridos", nombre: "Triglicéridos", resultado: 250, unidad: "mg/dL" },
      { clave: "colesterol", nombre: "Colesterol Total", resultado: 190, unidad: "mg/dL" },
      { clave: "hemoglobina", nombre: "Hemoglobina", resultado: 12.6, unidad: "g/dL" },
      { clave: "hematocrito", nombre: "Hematocrito", resultado: 34, unidad: "%" },
      { clave: "linfocitos", nombre: "Linfocitos", resultado: 30, unidad: "%" },
      { clave: "albumina", nombre: "Albúmina", resultado: 4.3, unidad: "g/dL" },
      { clave: "globulinas", nombre: "Globulinas", resultado: 0.7, unidad: "g/dL" }
    ];
  } else {
    // Caso 1: Nefropatía ERC en Hemodiálisis (exactamente como en la Imagen 5 + reporte completo)
    datosBioquimicosActuales = [
      { clave: "sodio", nombre: "Sodio", resultado: 134, unidad: "mEq/L" },
      { clave: "calcio", nombre: "Calcio", resultado: 7.0, unidad: "mg/dL" },
      { clave: "fosforo", nombre: "Fósforo", resultado: 5.9, unidad: "mg/dL" },
      { clave: "potasio", nombre: "Potasio", resultado: 5.3, unidad: "mEq/L" },
      { clave: "magnesio", nombre: "Magnesio", resultado: 1.5, unidad: "mg/dL" },
      { clave: "creatinina", nombre: "Creatinina sérica", resultado: 6.51, unidad: "mg/dL" },
      { clave: "urea", nombre: "Urea sérica", resultado: 150, unidad: "mg/dL" },
      { clave: "albumina", nombre: "Albúmina", resultado: 1.6, unidad: "g/dL" },
      { clave: "prealbumina", nombre: "Prealbúmina", resultado: 11, unidad: "mg/dL" },
      { clave: "trigliceridos", nombre: "Triglicéridos", resultado: 320, unidad: "mg/dL" },
      { clave: "colesterol", nombre: "Colesterol Total", resultado: 500, unidad: "mg/dL" },
      { clave: "hemoglobina", nombre: "Hemoglobina", resultado: 9.1, unidad: "g/dL" },
      { clave: "glucosa", nombre: "Glucosa basal", resultado: 159, unidad: "mg/dL" }
    ];
  }

  datosBioquimicosActuales.forEach(item => {
    const evaluacion = clasificarAnalitoLocal(item.clave, item.resultado, item.nombre);
    item.valor_normal = evaluacion.valor_normal;
    item.estado = evaluacion.estado;
    item.diagnostico = evaluacion.diagnostico;
    item.interpretacion = evaluacion.interpretacion;
    item.unidad = evaluacion.unidad || item.unidad;
  });

  renderizarTablaBioquimica();
  mostrarToast(`Analítica del ${casoId === 'caso2' ? 'Caso 2 (DM2)' : 'Caso 1 (ERC)'} cargada con éxito.`, "toast-success");
}

function toggleDrawerTextoBioq() {
  const drawer = document.getElementById("drawerTextoBioq");
  if (drawer) {
    drawer.style.display = (drawer.style.display === "none" || !drawer.style.display) ? "block" : "none";
  }
}

function abrirModalImagen(src, titulo) {
  const modal = document.getElementById("imageViewerModal");
  const img = document.getElementById("imageViewerImg");
  const t = document.getElementById("imageViewerTitle");
  if (modal && img) {
    img.src = src;
    if (t && titulo) t.textContent = "📷 " + titulo;
    modal.style.display = "flex";
  }
}

function cerrarModalImagen(e) {
  const modal = document.getElementById("imageViewerModal");
  if (modal) {
    modal.style.display = "none";
  }
}

function actualizarAnalitoManual(index, nuevoValor) {
  actualizarResultadoBioq(index, nuevoValor);
}

function actualizarInterpManual(index, nuevoTexto) {
  if (datosBioquimicosActuales[index]) {
    datosBioquimicosActuales[index].interpretacion = nuevoTexto;
  }
}

function extraerBioquimicaCliente(texto) {
  const encontrados = [];
  for (const [clave, p] of Object.entries(CATALOGO_PARAMETROS_BIOQUIMICOS)) {
    const regex = new RegExp(`(?:${p.nombre}|${clave})[:=\\s]+([0-9.,]+)`, "i");
    const m = texto.match(regex);
    if (m) {
      const val = parseFloat(m[1].replace(",", "."));
      const evaluacion = clasificarAnalitoLocal(clave, val, p.nombre);
      encontrados.push({
        clave: p.clave,
        nombre: p.nombre,
        resultado: val,
        unidad: p.unidad,
        valor_normal: evaluacion.valor_normal,
        estado: evaluacion.estado,
        diagnostico: evaluacion.diagnostico,
        interpretacion: evaluacion.interpretacion
      });
    }
  }

  if (encontrados.length > 0) {
    datosBioquimicosActuales = encontrados;
    renderizarTablaBioquimica();
    mostrarToast(`Se extrajeron ${encontrados.length} analitos del texto.`, "toast-success");
  } else {
    mostrarToast("No se detectaron analitos en el texto ingresado.", "toast-error");
  }
}

function cargarEjemploTextoBioq() {
  document.getElementById("rawClinicalText").value = `Resultados de Laboratorio Clínico de Ingreso:
Triglicéridos: 320 mg/dl
Colesterol total: 500 mg/dl
HDL: 22 mg/dl
LDL: 250 mg/dl
Glucosa basal: 159 mg/dl
Hb1C: 7.5 %
Albúmina: 1.6 g/dl
Prealbúmina: 11 mg/dl
Hemoglobina: 9.1 g/dl
Urea sérica: 150 mg/dl
Creatinina sérica: 6.51 mg/dl
Sodio: 134 meq
Calcio: 7 mg/dl
Fósforo: 5.9 mg/dl
Potasio: 5.3 meq
Magnesio: 1.5 mg/dl`;
  analizarTextoBioquimica();
}

// ============================================================================
// DIAGNÓSTICO NUTRICIONAL (PES)
// ============================================================================

function renderizarDiagnosticosPES() {
  const container = document.getElementById("pesListContainer");
  container.innerHTML = "";

  diagnosticosPES.forEach((item, index) => {
    const card = document.createElement("div");
    card.className = "pes-card";
    card.innerHTML = `
      <div class="pes-card-header">
        <span class="pes-code">PES ${index + 1}: ${item.codigo || ''} (${item.dominio || 'Diagnóstico Nutricional'})</span>
        <button class="btn btn-outline btn-sm no-print" onclick="eliminarPES(${index})" style="color: var(--danger); border-color: var(--danger);">🗑️ Eliminar</button>
      </div>
      <textarea class="form-control" rows="3" oninput="actualizarPESTexto(${index}, this.value)">${item.diagnostico}</textarea>
    `;
    container.appendChild(card);
  });
}

function agregarPES() {
  diagnosticosPES.push({
    id: `PES-${diagnosticosPES.length + 1}`,
    dominio: "Clínico / Ingesta",
    codigo: "NC / NI",
    diagnostico: "Problema relacionado con (Etiología) evidenciado por (Signos y Síntomas)."
  });
  renderizarDiagnosticosPES();
}

function eliminarPES(index) {
  diagnosticosPES.splice(index, 1);
  renderizarDiagnosticosPES();
}

function actualizarPESTexto(index, texto) {
  if (diagnosticosPES[index]) {
    diagnosticosPES[index].diagnostico = texto;
  }
}

// ============================================================================
// INTERVENCIÓN NUTRICIONAL & ENTERAL
// ============================================================================

const FORMULAS_ENTERALES = {
  vital: {
    nombre: "Vital® 1,5 kcal Líquido",
    tipo: "Oligomérica, hipercalórica y especializada, con proteínas hidrolizadas",
    por_100ml: {
      kcal: 150,
      prot: 6.75,
      cho: 18.4,
      lip: 5.5,
      fibra: 0.0,
      agua: 77.6
    },
    horas_infusion: 20
  },
  glucerna: {
    nombre: "Glucerna® 1.0 kcal/ml",
    tipo: "Fórmula enteral normocalórica y normoproteica especializada para diabetes",
    por_100ml: {
      kcal: 100,
      prot: 4.05,
      cho: 9.2,
      lip: 5.13,
      fibra: 0.9,
      agua: 84.37
    },
    horas_infusion: 24
  }
};

function cambiarFormulaEnteral() {
  const sel = document.getElementById("intervFormulaSelect").value;
  const imgEl = document.getElementById("formulaImgDisplay");
  const capEl = document.getElementById("formulaImgCaption");
  if (imgEl && capEl) {
    if (sel === "vital") {
      imgEl.src = "assets/vital_1_5.png";
      capEl.textContent = "Vital® 1,5 kcal Líquido (Abbott Nutrition)";
    } else if (sel === "glucerna") {
      imgEl.src = "assets/glucerna_1_0.png";
      capEl.textContent = "Glucerna® 1.0 kcal/ml (Abbott Nutrition)";
    } else {
      imgEl.src = "assets/vital_1_5.png";
      capEl.textContent = "Fórmula Enteral Personalizada";
    }
  }
  recalcularIntervencion();
}

function recalcularIntervencion() {
  const peso = parseFloat(document.getElementById("intervPesoCalculo").value) || 54.5;
  const kcalKg = parseFloat(document.getElementById("intervKcalKg").value) || 30.0;
  const pctInicio = parseFloat(document.getElementById("intervPctInicio").value) || 85.0;

  // GET
  const getTotal = peso * kcalKg;
  const getInicio = Math.round(getTotal * (pctInicio / 100));

  document.getElementById("intervGetTotalDisplay").innerHTML = `${Math.round(getTotal).toLocaleString()} <span style="font-size: 1rem;">kcal/día</span>`;
  document.getElementById("intervGetInicioDisplay").innerHTML = `${getInicio.toLocaleString()} <span style="font-size: 1rem;">kcal/día</span>`;

  // Macronutrientes 100%
  const protGKg = parseFloat(document.getElementById("macroProtGKg").value) || 1.2;
  const choGKg = parseFloat(document.getElementById("macroChoGKg").value) || 4.0;
  const lipGKg = parseFloat(document.getElementById("macroLipGKg").value) || 1.0;

  const protTotG = protGKg * peso;
  const choTotG = choGKg * peso;
  const lipTotG = lipGKg * peso;

  const protKcal = protTotG * 4;
  const choKcal = choTotG * 4;
  const lipKcal = lipTotG * 9;

  document.getElementById("macroProtGramosDisplay").textContent = `${protTotG.toFixed(1)} g`;
  document.getElementById("macroProtKcalDisplay").textContent = `${protKcal.toFixed(1)} kcal`;
  document.getElementById("macroProtPctDisplay").textContent = `${Math.round((protKcal / getTotal) * 100)}%`;

  document.getElementById("macroChoGramosDisplay").textContent = `${choTotG.toFixed(1)} g`;
  document.getElementById("macroChoKcalDisplay").textContent = `${choKcal.toFixed(1)} kcal`;
  document.getElementById("macroChoPctDisplay").textContent = `${Math.round((choKcal / getTotal) * 100)}%`;

  document.getElementById("macroLipGramosDisplay").textContent = `${lipTotG.toFixed(1)} g`;
  document.getElementById("macroLipKcalDisplay").textContent = `${lipKcal.toFixed(1)} kcal`;
  document.getElementById("macroLipPctDisplay").textContent = `${Math.round((lipKcal / getTotal) * 100)}%`;

  // Macronutrientes al % de inicio
  const protInicioG = Math.round(protTotG * (pctInicio / 100));
  const choInicioG = Math.round(choTotG * (pctInicio / 100));
  const lipInicioG = Math.round(lipTotG * (pctInicio / 100));

  document.getElementById("macroProtInicioDisplay").textContent = `${protInicioG} g`;
  document.getElementById("macroChoInicioDisplay").textContent = `${choInicioG} g`;
  document.getElementById("macroLipInicioDisplay").textContent = `${lipInicioG} g`;

  // Fórmula Enteral seleccionada
  const keyFormula = document.getElementById("intervFormulaSelect").value;
  const formula = FORMULAS_ENTERALES[keyFormula] || FORMULAS_ENTERALES["vital"];
  const nutrienteLim = document.getElementById("intervNutrienteLimitante").value;

  // Cálculo volumen según nutriente limitante (por defecto lípidos)
  let volFormula = 0;
  let formulaCalcTexto = "";

  if (nutrienteLim === "lipidos") {
    volFormula = Math.round((lipInicioG * 100) / formula.por_100ml.lip);
    formulaCalcTexto = `(${lipInicioG} g × 100) / ${formula.por_100ml.lip} = ${volFormula} ml`;
  } else if (nutrienteLim === "proteina") {
    volFormula = Math.round((protInicioG * 100) / formula.por_100ml.prot);
    formulaCalcTexto = `(${protInicioG} g × 100) / ${formula.por_100ml.prot} = ${volFormula} ml`;
  } else {
    volFormula = Math.round((choInicioG * 100) / formula.por_100ml.cho);
    formulaCalcTexto = `(${choInicioG} g × 100) / ${formula.por_100ml.cho} = ${volFormula} ml`;
  }

  document.getElementById("intervCalcLimitanteFormula").textContent = formulaCalcTexto;
  document.getElementById("intervVolumenFormulaDisplay").innerHTML = `${volFormula} <span style="font-size: 1rem;">ml/día</span>`;
  document.getElementById("tablaVolumenFml").textContent = `${volFormula} ml`;

  // Ritmo de infusión
  const horasInfusion = formula.horas_infusion || 24;
  const ritmo = (volFormula / horasInfusion).toFixed(1);
  document.getElementById("intervRitmoInfusionDisplay").innerHTML = `${ritmo} <span style="font-size: 1rem;">ml/h (${horasInfusion}h)</span>`;

  // Aportes de la fórmula con ese volumen
  const factor = volFormula / 100;
  const fKcal = Math.round(formula.por_100ml.kcal * factor);
  const fProt = Math.round(formula.por_100ml.prot * factor);
  const fCho = Math.round(formula.por_100ml.cho * factor);
  const fLip = Math.round(formula.por_100ml.lip * factor);
  const fAgua = Math.round(formula.por_100ml.agua * factor);
  const fFibra = formula.por_100ml.fibra ? (formula.por_100ml.fibra * factor).toFixed(1) : 0;

  // Déficit
  const defKcal = Math.max(0, getInicio - fKcal);
  const defProt = Math.max(0, protInicioG - fProt);
  const defCho = Math.max(0, choInicioG - fCho);
  const defLip = Math.max(0, lipInicioG - fLip);

  const aguaTotalReq = parseFloat(document.getElementById("intervAguaTotal").value) || 650;
  const defAgua = Math.max(0, aguaTotalReq - fAgua);

  // Módulos
  renderizarTablaAdecuacion(getInicio, protInicioG, choInicioG, lipInicioG, aguaTotalReq, fKcal, fProt, fCho, fLip, fFibra, fAgua, defKcal, defProt, defCho, defLip, defAgua, keyFormula);
}

function renderizarTablaAdecuacion(getInicio, reqProt, reqCho, reqLip, reqAgua, fKcal, fProt, fCho, fLip, fFibra, fAgua, dKcal, dProt, dCho, dLip, dAgua, keyFormula) {
  const tbody = document.getElementById("intervAdecuacionTableBody");
  tbody.innerHTML = "";

  // Determinar módulos según el caso/fórmula
  let modProtTexto = "-";
  let modChoTexto = "-";
  let modFibraTexto = "-";
  let finalKcal = fKcal;
  let finalProt = fProt;
  let finalCho = fCho;
  let finalLip = fLip;
  let finalAgua = fAgua;

  if (keyFormula === "vital") {
    // Caso 1: Vital con módulo de maltodextrina 35g
    if (dCho > 0) {
      modChoTexto = `35 g Maltodextrina (+140 kcal)`;
      finalCho += 35;
      finalKcal += 140;
    }
    finalAgua = reqAgua; // Ajustado con diuresis
  } else if (keyFormula === "glucerna") {
    // Caso 2: Glucerna con ProSource TF, InstaFibra y Palatinose
    if (dProt > 0) {
      modProtTexto = `45 ml ProSource TF (+22.5 g prot, +90 kcal)`;
      finalProt += 22.5;
      finalKcal += 90;
    }
    if (dCho > 0) {
      modChoTexto = `44 g Palatinose (+44 g CHO, +176 kcal)`;
      finalCho += 44;
      finalKcal += 176;
    }
    modFibraTexto = `8.3 g InstaFibra (+7.8 g fibra, +8 kcal)`;
    finalKcal += 8;
    finalAgua = reqAgua; // Completado con 1543 ml de agua libre
  }

  const filas = [
    { nutriente: "Energía", req: `${getInicio} kcal`, f: `${fKcal} kcal`, falta: dKcal > 0 ? `${dKcal} kcal` : "-", mod: keyFormula === "vital" ? "+140 kcal" : "+274 kcal", fin: `${Math.round(finalKcal)} kcal`, adec: Math.round((finalKcal / getInicio) * 100) },
    { nutriente: "Proteínas", req: `${reqProt} g`, f: `${fProt} g`, falta: dProt > 0 ? `${dProt} g` : "-", mod: modProtTexto, fin: `${Math.round(finalProt)} g`, adec: Math.round((finalProt / reqProt) * 100) },
    { nutriente: "Carbohidratos", req: `${reqCho} g`, f: `${fCho} g`, falta: dCho > 0 ? `${dCho} g` : "-", mod: modChoTexto, fin: `${Math.round(finalCho)} g`, adec: Math.round((finalCho / reqCho) * 100) },
    { nutriente: "Lípidos", req: `${reqLip} g`, f: `${fLip} g`, falta: dLip > 0 ? `${dLip} g` : "-", mod: "-", fin: `${Math.round(finalLip)} g`, adec: Math.round((finalLip / reqLip) * 100) },
    { nutriente: "Agua Total", req: `${reqAgua} ml`, f: `${fAgua} ml`, falta: `${dAgua} ml`, mod: `${dAgua} ml agua libre adicional`, fin: `${reqAgua} ml`, adec: 100 }
  ];

  filas.forEach(fila => {
    const tr = document.createElement("tr");
    let badgeAdec = "badge-verde";
    if (fila.adec < 90 || fila.adec > 115) badgeAdec = "badge-amarillo";
    
    tr.innerHTML = `
      <td><strong>${fila.nutriente}</strong></td>
      <td>${fila.req}</td>
      <td>${fila.f}</td>
      <td style="color: var(--danger); font-weight: 600;">${fila.falta}</td>
      <td><small>${fila.mod}</small></td>
      <td><strong>${fila.fin}</strong></td>
      <td><span class="badge ${badgeAdec}">${fila.adec}%</span></td>
    `;
    tbody.appendChild(tr);
  });
}

function actualizarAguaRequerimiento() {
  const diuresis = parseFloat(document.getElementById("bioOrina").value) || 50;
  if (casoActivoId === "caso1") {
    const aguaTotal = diuresis + 600;
    document.getElementById("intervAguaTotal").value = aguaTotal;
    document.getElementById("intervAguaMetodo").value = `Diuresis residual (${diuresis} ml) + Pérdidas insensibles (600 ml) = ${aguaTotal} ml/día`;
    recalcularIntervencion();
  }
}

// ============================================================================
// CARGA Y CAMBIO DE CASOS CLÍNICOS
// ============================================================================

let baseCasosPrecargados = null;

async function cargarCasoEjemplo(casoId) {
  casoActivoId = casoId;

  // Intentar cargar desde JSON estático o memoria
  if (!baseCasosPrecargados) {
    try {
      const res = await fetch("sample_cases.json");
      if (res.ok) {
        baseCasosPrecargados = await res.json();
      }
    } catch (e) {
      console.warn("Cargando caso desde plantilla local integrada:", e);
    }
  }

  const datosCaso = (baseCasosPrecargados && baseCasosPrecargados[casoId]) ? baseCasosPrecargados[casoId] : null;
  if (!datosCaso) return;

  // 1. Filiación
  document.getElementById("filiacionNombre").value = datosCaso.filiacion.nombre;
  document.getElementById("filiacionEdad").value = datosCaso.filiacion.edad;
  document.getElementById("filiacionSexo").value = datosCaso.filiacion.sexo;
  document.getElementById("filiacionEstadoCivil").value = datosCaso.filiacion.estado_civil;
  document.getElementById("filiacionReligion").value = datosCaso.filiacion.religion;
  document.getElementById("filiacionNacimiento").value = datosCaso.filiacion.lugar_nacimiento;
  document.getElementById("filiacionProcedencia").value = datosCaso.filiacion.lugar_procedencia;
  document.getElementById("filiacionOcupacion").value = datosCaso.filiacion.ocupacion;

  // 2. Enfermedad de ingreso
  document.getElementById("ingresoTemp").value = datosCaso.enfermedad_ingreso.temperatura;
  document.getElementById("ingresoFC").value = datosCaso.enfermedad_ingreso.fc;
  document.getElementById("ingresoFR").value = datosCaso.enfermedad_ingreso.fr;
  document.getElementById("ingresoPA").value = datosCaso.enfermedad_ingreso.pa;
  document.getElementById("ingresoTiempo").value = datosCaso.enfermedad_ingreso.tiempo_enfermedad;
  document.getElementById("ingresoForma").value = datosCaso.enfermedad_ingreso.forma_inicio;
  document.getElementById("ingresoCurso").value = datosCaso.enfermedad_ingreso.curso;
  document.getElementById("ingresoRelato").value = datosCaso.enfermedad_ingreso.relato;

  // 3. Funciones biológicas
  document.getElementById("bioApetito").value = datosCaso.funciones_biologicas.apetito;
  document.getElementById("bioSed").value = datosCaso.funciones_biologicas.sed;
  document.getElementById("bioOrina").value = datosCaso.funciones_biologicas.orina;
  document.getElementById("bioDeposiciones").value = datosCaso.funciones_biologicas.deposiciones;
  document.getElementById("bioAnimo").value = datosCaso.funciones_biologicas.animo;

  // 4. Antecedentes y Tratamiento
  document.getElementById("antPatologicos").value = datosCaso.antecedentes.patologicos;
  document.getElementById("antFamiliares").value = datosCaso.antecedentes.familiares;
  document.getElementById("diagMedico").value = datosCaso.diagnostico_medico;
  document.getElementById("tratamientoFarmacos").value = datosCaso.tratamiento_farmacologico;

  // 5. NRS-2002
  document.getElementById("nrsInit1").value = datosCaso.nrs_2002.imc_menor_20_5 ? "si" : "no";
  document.getElementById("nrsInit2").value = datosCaso.nrs_2002.perdida_peso_3m ? "si" : "no";
  document.getElementById("nrsInit3").value = datosCaso.nrs_2002.disminucion_ingesta_semana ? "si" : "no";
  document.getElementById("nrsInit4").value = datosCaso.nrs_2002.paciente_grave ? "si" : "no";
  document.getElementById("nrsEstadoNutricional").value = datosCaso.nrs_2002.estado_nutricional_pts;
  document.getElementById("nrsSeveridad").value = datosCaso.nrs_2002.severidad_enfermedad_pts;
  evaluarNRS();

  // 6. Antropometría
  document.getElementById("antropoPesoHabitual").value = datosCaso.antropometria.peso_habitual;
  document.getElementById("antropoPesoActual").value = datosCaso.antropometria.peso_actual;
  document.getElementById("antropoPesoSeco").value = datosCaso.antropometria.peso_seco || datosCaso.antropometria.peso_ideal;
  document.getElementById("antropoTalla").value = datosCaso.antropometria.talla;
  document.getElementById("antropoAbd").value = datosCaso.antropometria.perimetro_abdominal;
  document.getElementById("antropoCB").value = datosCaso.antropometria.cb;
  document.getElementById("antropoPCT").value = datosCaso.antropometria.pct;
  document.getElementById("antropoCP").value = datosCaso.antropometria.cp;
  calcularAntropometria();

  // 7. Bioquímica
  poblarBioquimicaCaso(datosCaso.bioquimica, casoId);

  // 8. Clínico
  poblarClinicoTabla(datosCaso.clinico);

  // 9. Dietético
  document.getElementById("dietDesayuno").value = datosCaso.dietetico.desayuno;
  document.getElementById("dietAlmuerzo").value = datosCaso.dietetico.almuerzo;
  document.getElementById("dietCena").value = datosCaso.dietetico.cena;
  document.getElementById("dietInterpretacion").value = datosCaso.dietetico.interpretacion;

  // 10. Bristol
  seleccionarBristol(datosCaso.ecologica_bristol.tipo);

  // 11. Funcional
  // Marcha: Distancia fija 6m, tiempo cronometrado
  document.getElementById("marchaDistancia").value = datosCaso.funcional.marcha.distancia || 6.0;
  document.getElementById("marchaTiempo").value = datosCaso.funcional.marcha.tiempo;
  calcularMarcha();

  // Dinamometría
  document.getElementById("dinamoBrazo").value = datosCaso.funcional.dinamometria.brazo;
  document.getElementById("dinamoIntento1").value = datosCaso.funcional.dinamometria.intento1;
  document.getElementById("dinamoIntento2").value = datosCaso.funcional.dinamometria.intento2;
  document.getElementById("dinamoIntento3").value = datosCaso.funcional.dinamometria.intento3;
  calcularDinamometria();

  // SARC-F
  document.querySelector(`input[name="sarc1"][value="${datosCaso.funcional.sarc_f.fuerza}"]`).checked = true;
  document.querySelector(`input[name="sarc2"][value="${datosCaso.funcional.sarc_f.caminar}"]`).checked = true;
  document.querySelector(`input[name="sarc3"][value="${datosCaso.funcional.sarc_f.levantarse}"]`).checked = true;
  document.querySelector(`input[name="sarc4"][value="${datosCaso.funcional.sarc_f.escaleras}"]`).checked = true;
  document.querySelector(`input[name="sarc5"][value="${datosCaso.funcional.sarc_f.caidas}"]`).checked = true;
  calcularSarcF();

  // ECF
  seleccionarECF(datosCaso.funcional.ecf.nivel);

  // 12. Diagnósticos PES
  diagnosticosPES = JSON.parse(JSON.stringify(datosCaso.diagnosticos_pes));
  renderizarDiagnosticosPES();

  // 13. Intervención
  document.getElementById("intervVia").value = datosCaso.intervencion.via;
  document.getElementById("intervPesoCalculo").value = datosCaso.intervencion.peso_calculo;
  document.getElementById("intervKcalKg").value = datosCaso.intervencion.kcal_por_kg;
  document.getElementById("intervPctInicio").value = datosCaso.intervencion.porcentaje_inicio;
  document.getElementById("macroProtGKg").value = datosCaso.intervencion.distribucion_macro.proteinas.g_kg;
  document.getElementById("macroChoGKg").value = datosCaso.intervencion.distribucion_macro.carbohidratos.g_kg;
  document.getElementById("macroLipGKg").value = datosCaso.intervencion.distribucion_macro.lipidos.g_kg;
  document.getElementById("intervAguaTotal").value = datosCaso.intervencion.requerimiento_hidrico.total_ml;
  document.getElementById("intervAguaMetodo").value = datosCaso.intervencion.requerimiento_hidrico.metodo;
  document.getElementById("intervFormulaSelect").value = casoId === "caso1" ? "vital" : "glucerna";
  document.getElementById("intervNutrienteLimitante").value = "lipidos";
  recalcularIntervencion();
  document.getElementById("intervPrescripcion").value = datosCaso.intervencion.prescripcion_formal;

  // 14. Monitoreo
  document.getElementById("monitCorto").value = datosCaso.monitoreo.corto_plazo;
  document.getElementById("monitMediano").value = datosCaso.monitoreo.mediano_plazo;
  document.getElementById("monitLargo").value = datosCaso.monitoreo.largo_plazo;

  // 15. Conclusiones
  document.getElementById("informeConclusiones").value = datosCaso.conclusiones.join("\n\n");

  actualizarBanner();
}

function poblarBioquimicaCaso(bioqDict, casoId) {
  cargarBioquimicaCaso(casoId);
}

function poblarClinicoTabla(clinicoArr) {
  const tbody = document.getElementById("clinicoTableBody");
  tbody.innerHTML = "";
  clinicoArr.forEach(item => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${item.organo}</strong></td>
      <td><input type="text" class="form-control" value="${item.signo}"></td>
      <td><input type="text" class="form-control" value="${item.alteracion}"></td>
    `;
    tbody.appendChild(tr);
  });
}

function limpiarFormulario() {
  if (!confirm("¿Deseas iniciar un nuevo caso y limpiar los campos actuales?")) return;
  document.getElementById("filiacionNombre").value = "";
  document.getElementById("filiacionEdad").value = 40;
  document.getElementById("antropoPesoActual").value = "";
  document.getElementById("antropoTalla").value = "";
  document.getElementById("rawClinicalText").value = "";
  datosBioquimicosActuales = [];
  renderizarTablaBioquimica();
  actualizarBanner();
  alert("Formulario listo para nuevo paciente.");
}

async function verificarConexionServidor() {
  const badge = document.getElementById("serverStatusBadge");
  const check = async () => {
    const t0 = performance.now();
    try {
      const res = await fetch("/api/health");
      if (res.ok) {
        const data = await res.json();
        const latencia = Math.round(performance.now() - t0);
        badge.className = "badge badge-normal";
        badge.textContent = `🟢 Motor Clínico Activo (${latencia}ms • ${data.active_threads} hilos)`;
        return;
      }
    } catch (e) {
      badge.className = "badge badge-amarillo";
      badge.textContent = "🟡 Modo Offline / Navegador Autónomo";
    }
  };

  await check();
  // Sondeo continuo de salud cada 10 segundos
  setInterval(check, 10000);
}

// ============================================================================
// MANEJO DE ARCHIVOS PDF Y EXTRACCIÓN CLÍNICA
// ============================================================================

function inicializarDragAndDropPDF() {
  const dropZone = document.getElementById("pdfUploadZone");
  if (!dropZone) return;

  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.add('dragover');
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove('dragover');
    }, false);
  });

  dropZone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
        procesarArchivoPDF(file);
      } else {
        alert("Por favor selecciona un archivo en formato PDF.");
      }
    }
  }, false);
}

function manejarSubidaPDF(event) {
  const file = event.target.files[0];
  if (file) {
    procesarArchivoPDF(file);
  }
}

async function procesarArchivoPDF(file) {
  const alertEl = document.getElementById("pdfStatusAlert");
  const iconEl = document.getElementById("pdfStatusIcon");
  const textEl = document.getElementById("pdfStatusText");

  alertEl.style.display = "flex";
  alertEl.className = "pdf-status-alert alert-box alert-info";
  iconEl.textContent = "⏳";
  textEl.textContent = `Leyendo documento: ${file.name}...`;

  try {
    let textoCompleto = "";
    if (window.pdfjsLib) {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(" ");
        textoCompleto += "\n" + pageText;
      }
    } else {
      throw new Error("Librería PDF.js no disponible.");
    }

    if (!textoCompleto.trim()) {
      throw new Error("No se pudo extraer texto legible del PDF.");
    }

    textEl.textContent = "Analizando texto clínico y extrayendo 18 analitos bioquímicos...";
    await procesarTextoClinicoExtraido(textoCompleto);

    alertEl.className = "pdf-status-alert alert-box alert-success";
    iconEl.textContent = "✅";
    textEl.innerHTML = `<strong>¡Extracción Completada!</strong> Se cargaron los datos de la Historia Clínica y la bioquímica de <em>${file.name}</em>. Por favor ingresa las mediciones presenciales (Pliegues, Dinamometría, Marcha, SARC-F, Bristol y Fragilidad).`;
  } catch (err) {
    console.error("Error al procesar PDF:", err);
    alertEl.className = "pdf-status-alert alert-box alert-warning";
    iconEl.textContent = "⚠️";
    textEl.textContent = `Error al leer PDF: ${err.message}. Puedes pegar el texto directamente en la pestaña 2.2 Bioquímica.`;
  }
}

async function procesarTextoClinicoExtraido(texto) {
  // Enviar al motor del servidor si está disponible
  let datosExtraidos = null;
  try {
    const res = await fetch("/api/analyze-clinical-history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: texto })
    });
    if (res.ok) {
      const respJson = await res.json();
      if (respJson.success && respJson.datos) {
        datosExtraidos = respJson.datos;
      }
    }
  } catch (e) {
    console.warn("Servidor no disponible para NLP, usando extractor del cliente:", e);
  }

  // Si no se obtuvo del servidor, usar expresiones regulares locales
  if (!datosExtraidos) {
    datosExtraidos = extraerHistoriaClinicaLocal(texto);
  }

  // Poblar Filiación
  if (datosExtraidos.filiacion) {
    const f = datosExtraidos.filiacion;
    if (f.nombre) document.getElementById("filiacionNombre").value = f.nombre;
    if (f.edad) document.getElementById("filiacionEdad").value = f.edad;
    if (f.sexo) document.getElementById("filiacionSexo").value = f.sexo;
    if (f.estado_civil) document.getElementById("filiacionEstadoCivil").value = f.estado_civil;
    if (f.religion) document.getElementById("filiacionReligion").value = f.religion;
    if (f.lugar_nacimiento) document.getElementById("filiacionNacimiento").value = f.lugar_nacimiento;
    if (f.lugar_procedencia) document.getElementById("filiacionProcedencia").value = f.lugar_procedencia;
    if (f.ocupacion) document.getElementById("filiacionOcupacion").value = f.ocupacion;
  }

  // Poblar Signos Vitales y Enfermedad de Ingreso
  if (datosExtraidos.enfermedad_ingreso) {
    const e = datosExtraidos.enfermedad_ingreso;
    if (e.temperatura) document.getElementById("ingresoTemp").value = e.temperatura;
    if (e.fc) document.getElementById("ingresoFC").value = e.fc;
    if (e.fr) document.getElementById("ingresoFR").value = e.fr;
    if (e.pa) document.getElementById("ingresoPA").value = e.pa;
    if (e.tiempo_enfermedad) document.getElementById("ingresoTiempo").value = e.tiempo_enfermedad;
    if (e.forma_inicio) document.getElementById("ingresoForma").value = e.forma_inicio;
    if (e.curso) document.getElementById("ingresoCurso").value = e.curso;
    if (e.relato) document.getElementById("ingresoRelato").value = e.relato;
  }

  // Poblar Funciones Biológicas
  if (datosExtraidos.funciones_biologicas) {
    const b = datosExtraidos.funciones_biologicas;
    if (b.apetito) document.getElementById("bioApetito").value = b.apetito;
    if (b.sed) document.getElementById("bioSed").value = b.sed;
    if (b.orina) document.getElementById("bioOrina").value = b.orina;
    if (b.deposiciones) document.getElementById("bioDeposiciones").value = b.deposiciones;
    if (b.animo) document.getElementById("bioAnimo").value = b.animo;
  }

  // Poblar Antecedentes y Diagnóstico
  if (datosExtraidos.antecedentes) {
    const a = datosExtraidos.antecedentes;
    if (a.patologicos) document.getElementById("antPatologicos").value = a.patologicos;
    if (a.familiares) document.getElementById("antFamiliares").value = a.familiares;
  }
  if (datosExtraidos.diagnostico_medico) {
    document.getElementById("diagMedico").value = datosExtraidos.diagnostico_medico;
  }
  if (datosExtraidos.tratamiento_farmacologico) {
    document.getElementById("tratamientoFarmacos").value = datosExtraidos.tratamiento_farmacologico;
  }

  // Antropometría si existe en el documento
  if (datosExtraidos.antropometria) {
    const ant = datosExtraidos.antropometria;
    if (ant.peso_actual) document.getElementById("antropoPesoActual").value = ant.peso_actual;
    if (ant.talla) document.getElementById("antropoTalla").value = ant.talla;
    if (ant.peso_habitual) document.getElementById("antropoPesoHabitual").value = ant.peso_habitual;
    if (ant.peso_seco) document.getElementById("antropoPesoSeco").value = ant.peso_seco;
    if (ant.perimetro_abdominal) document.getElementById("antropoAbd").value = ant.perimetro_abdominal;
    if (ant.cb) document.getElementById("antropoCB").value = ant.cb;
    if (ant.pct) document.getElementById("antropoPCT").value = ant.pct;
    if (ant.cp) document.getElementById("antropoCP").value = ant.cp;
  }

  // Cargar texto de laboratorio y ejecutar análisis bioquímico
  document.getElementById("rawClinicalText").value = texto;
  analizarTextoBioquimica();

  // Actualizar cálculos
  calcularAntropometria();
  evaluarNRS();
  recalcularFuncional();
  actualizarAguaRequerimiento();
  recalcularIntervencion();
  actualizarBanner();
}

function extraerHistoriaClinicaLocal(t) {
  const d = { filiacion: {}, enfermedad_ingreso: {}, funciones_biologicas: {}, antecedentes: {}, antropometria: {} };
  const mNom = t.match(/(?:Nombre|Paciente)[:\s\t]+([A-Za-zÁÉÍÓÚñáéíóú\s]+?)(?=\n|Edad|,|$)/i);
  if (mNom) d.filiacion.nombre = mNom[1].trim();

  const mEdad = t.match(/(?:Edad)[:\s\t]+(\d+)/i);
  if (mEdad) d.filiacion.edad = parseInt(mEdad[1]);

  if (/femenino|mujer/i.test(t)) d.filiacion.sexo = "femenino";
  else if (/masculino|varón|hombre/i.test(t)) d.filiacion.sexo = "masculino";

  const mEst = t.match(/(?:Estado\s*civil)[:\s\t]+([A-Za-zÁÉÍÓÚñáéíóú]+)/i);
  if (mEst) d.filiacion.estado_civil = mEst[1].trim();

  const mPeso = t.match(/(?:Peso(?:\s+actual)?|Peso)[:\s\t]+([0-9]+(?:\.[0-9]+)?)/i);
  if (mPeso) {
    const p = parseFloat(mPeso[1]);
    d.antropometria.peso_actual = p;
    d.funciones_biologicas.peso = p;
  }

  const mTalla = t.match(/(?:Talla|Estatura)[:\s\t]+([0-9]+(?:\.[0-9]+)?)/i);
  if (mTalla) {
    let tl = parseFloat(mTalla[1]);
    if (tl < 3) tl = tl * 100;
    d.antropometria.talla = tl;
    d.funciones_biologicas.talla = tl;
  }
  return d;
}

// ============================================================================
// ACCESO MÓVIL Y CÓDIGO QR
// ============================================================================

let qrCodeGenerado = null;

async function abrirModalMovil() {
  const modal = document.getElementById("mobileModal");
  const inputUrl = document.getElementById("mobileUrlInput");
  const qrContainer = document.getElementById("qrcodeContainer");

  let urlDestino = window.location.origin;

  // Si estamos en localhost/127.0.0.1, consultar la IP de red local para compartir en Wi-Fi
  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    urlDestino = `http://192.168.18.186:8080`;
    try {
      const res = await fetch("/api/network");
      if (res.ok) {
        const data = await res.json();
        if (data.qr_target) {
          urlDestino = data.qr_target;
        }
      }
    } catch (e) {
      console.warn("Usando IP por defecto para QR:", e);
    }
  }

  inputUrl.value = urlDestino;
  qrContainer.innerHTML = "";

  if (window.QRCode) {
    qrCodeGenerado = new QRCode(qrContainer, {
      text: urlDestino,
      width: 190,
      height: 190,
      colorDark: "#003865",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.M
    });
  } else {
    qrContainer.innerHTML = `<p style="color: var(--gray-600); padding: 1rem;">Carga este enlace en tu navegador móvil:<br><strong>${urlDestino}</strong></p>`;
  }

  modal.classList.add("active");
}

function cerrarModalMovil(event) {
  if (event && event.target !== event.currentTarget && !event.target.classList.contains("modal-close-btn")) {
    return;
  }
  const modal = document.getElementById("mobileModal");
  if (modal) modal.classList.remove("active");
}

function copiarUrlMovil() {
  const input = document.getElementById("mobileUrlInput");
  if (!input) return;
  input.select();
  navigator.clipboard.writeText(input.value).then(() => {
    mostrarToast("¡Enlace copiado al portapapeles! Ábrelo en el navegador de tu celular.", "toast-success");
  }).catch(() => {
    document.execCommand("copy");
    mostrarToast("¡Enlace copiado!", "toast-info");
  });
}

// ============================================================================
// COMPILACIÓN Y GUARDADO DE CASOS EN LA NUBE (TiDB Cloud Serverless)
// ============================================================================

function compilarCasoActual() {
  const nombre = document.getElementById("filiacionNombre")?.value || "Paciente sin nombre";
  const edad = parseInt(document.getElementById("filiacionEdad")?.value) || 0;
  const sexo = document.getElementById("filiacionSexo")?.value || "femenino";

  return {
    id: casoActivoId || `caso_${Date.now()}`,
    filiacion: {
      nombre,
      edad,
      sexo,
      estado_civil: document.getElementById("filiacionEstadoCivil")?.value || "",
      religion: document.getElementById("filiacionReligion")?.value || "",
      lugar_nacimiento: document.getElementById("filiacionNacimiento")?.value || "",
      lugar_procedencia: document.getElementById("filiacionProcedencia")?.value || "",
      ocupacion: document.getElementById("filiacionOcupacion")?.value || ""
    },
    enfermedad_ingreso: {
      temperatura: document.getElementById("ingresoTemp")?.value || "",
      fc: document.getElementById("ingresoFC")?.value || "",
      fr: document.getElementById("ingresoFR")?.value || "",
      pa: document.getElementById("ingresoPA")?.value || "",
      tiempo_enfermedad: document.getElementById("ingresoTiempo")?.value || "",
      forma_inicio: document.getElementById("ingresoForma")?.value || "",
      curso: document.getElementById("ingresoCurso")?.value || "",
      relato: document.getElementById("ingresoRelato")?.value || ""
    },
    funciones_biologicas: {
      apetito: document.getElementById("bioApetito")?.value || "",
      sed: document.getElementById("bioSed")?.value || "",
      orina: document.getElementById("bioOrina")?.value || "",
      deposiciones: document.getElementById("bioDeposiciones")?.value || "",
      animo: document.getElementById("bioAnimo")?.value || ""
    },
    antecedentes: {
      patologicos: document.getElementById("antPatologicos")?.value || "",
      familiares: document.getElementById("antFamiliares")?.value || ""
    },
    diagnostico_medico: document.getElementById("diagMedico")?.value || "",
    tratamiento_farmacologico: document.getElementById("tratamientoFarmacos")?.value || "",
    antropometria: {
      peso_actual: parseFloat(document.getElementById("antropoPesoActual")?.value) || 0,
      talla: parseFloat(document.getElementById("antropoTalla")?.value) || 0,
      circunferencia_brazo: parseFloat(document.getElementById("antropoCB")?.value) || 0,
      pliegue_tricipital: parseFloat(document.getElementById("antropoPCT")?.value) || 0,
      perimetro_pantorrilla: parseFloat(document.getElementById("antropoCP")?.value) || 0,
      perimetro_abdominal: parseFloat(document.getElementById("antropoCAbd")?.value) || 0
    },
    bioquimica: datosBioquimicosActuales || [],
    funcional: {
      dinamometria_max: parseFloat(document.getElementById("dinamoMax")?.textContent) || 0,
      marcha_vel: parseFloat(document.getElementById("marchaVelocidadDisplay")?.textContent) || 0,
      sarc_f: parseInt(document.getElementById("sarcTotalDisplay")?.textContent) || 0,
      ecf: selectedECF || 4
    },
    intervencion: {
      get_kcal: parseFloat(document.getElementById("intervGET")?.textContent) || 0,
      formula: document.getElementById("intervFormulaSelect")?.value || "Vital 1.5",
      prescripcion: document.getElementById("intervPrescripcionText")?.value || ""
    },
    monitoreo: {
      corto: document.getElementById("monitCorto")?.value || "",
      mediano: document.getElementById("monitMediano")?.value || "",
      largo: document.getElementById("monitLargo")?.value || ""
    },
    conclusiones: document.getElementById("informeConclusiones")?.value || ""
  };
}

async function guardarCasoActivoEnNube() {
  const btn = document.getElementById("btnSaveCaseCloud");
  const originalHtml = btn ? btn.innerHTML : "";
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `⏳ Guardando...`;
  }

  try {
    const caso = compilarCasoActual();
    const resp = await fetch("/api/save-case", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(caso)
    });

    if (resp.ok) {
      const res = await resp.json();
      const destino = res.storage === "tidb_cloud" ? "TiDB Cloud Serverless" : "almacenamiento local";
      mostrarToast(`Caso clínico de '${caso.filiacion.nombre}' guardado en ${destino}.`, "toast-success", 4000);
    } else {
      mostrarToast("No se pudo guardar el caso en la nube. Verifica tu conexión.", "toast-error");
    }
  } catch (e) {
    console.error("Error al guardar en TiDB:", e);
    mostrarToast("Error de conexión al sincronizar con TiDB Cloud.", "toast-error");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalHtml;
    }
  }
}


