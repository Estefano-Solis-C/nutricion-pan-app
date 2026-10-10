/**
 * app.js - Lógica interactiva para el Proceso de Atención Nutricional (PAN) USIL
 */

// Base de datos de percentiles de dinamometría (Schlüssel et al., 2008)
const TABLA_SCHLUSSEL = {
  femenino: [
    { min: 20, max: 29, p10: 18.6, p30: 22.3, p50: 25.8, p70: 28.4, p90: 31.8 },
    { min: 30, max: 39, p10: 20.1, p30: 23.5, p50: 26.4, p70: 29.3, p90: 32.9 },
    { min: 40, max: 49, p10: 18.4, p30: 22.9, p50: 25.7, p70: 28.1, p90: 31.7 },
    { min: 50, max: 59, p10: 15.4, p30: 19.9, p50: 23.0, p70: 25.3, p90: 29.8 },
    { min: 60, max: 69, p10: 15.0, p30: 18.2, p50: 20.5, p70: 22.8, p90: 27.1 },
    { min: 70, max: 120, p10: 9.0,  p30: 13.0, p50: 16.0, p70: 19.2, p90: 22.6 }
  ],
  masculino: [
    { min: 20, max: 29, p10: 34.0, p30: 40.0, p50: 44.5, p70: 49.0, p90: 55.0 },
    { min: 30, max: 39, p10: 35.5, p30: 42.0, p50: 47.0, p70: 51.5, p90: 57.0 },
    { min: 40, max: 49, p10: 34.0, p30: 40.5, p50: 45.0, p70: 50.0, p90: 56.0 },
    { min: 50, max: 59, p10: 30.0, p30: 36.5, p50: 41.0, p70: 46.0, p90: 51.0 },
    { min: 60, max: 69, p10: 26.0, p30: 32.0, p50: 36.5, p70: 41.5, p90: 47.0 },
    { min: 70, max: 120, p10: 20.0, p30: 25.0, p50: 29.0, p70: 34.0, p90: 39.0 }
  ]
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
  inicializarDragAndDropPDF();
});

// Navegación por pestañas
function mostrarPestana(tabId, btn) {
  document.querySelectorAll(".tab-pane").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
  
  const pane = document.getElementById(tabId);
  if (pane) pane.classList.add("active");
  if (btn) btn.classList.add("active");
  
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// Banner superior dinámico
function actualizarBanner() {
  const nombre = document.getElementById("filiacionNombre").value || "Paciente sin nombre";
  const edad = document.getElementById("filiacionEdad").value || "--";
  const sexo = document.getElementById("filiacionSexo").value;
  const sexoStr = sexo === "femenino" ? "Femenino" : "Masculino";
  const peso = document.getElementById("antropoPesoActual").value || "--";
  const talla = document.getElementById("antropoTalla").value || "--";
  const via = document.getElementById("intervVia").value || "Soporte Nutricional";

  document.getElementById("bannerNombre").textContent = nombre;
  document.getElementById("bannerEdadSexo").textContent = `${edad} años • ${sexoStr}`;
  document.getElementById("bannerPesoTalla").textContent = `${peso} kg • ${talla} cm`;
  document.getElementById("bannerVia").textContent = via;
}

// ============================================================================
// EVALUACIÓN FUNCIONAL
// ============================================================================

// 1. Velocidad de la marcha
function calcularMarcha() {
  const dist = parseFloat(document.getElementById("marchaDistancia").value) || 6.0;
  const tiempo = parseFloat(document.getElementById("marchaTiempo").value);
  
  const dispVel = document.getElementById("marchaVelocidadDisplay");
  const dispBadge = document.getElementById("marchaBadgeDisplay");
  const dispInterp = document.getElementById("marchaInterpretacion");
  
  if (!tiempo || tiempo <= 0) {
    dispVel.innerHTML = `-- <span style="font-size: 1rem;">m/s</span>`;
    dispBadge.innerHTML = `<span class="badge badge-amarillo">Ingrese segundos</span>`;
    return;
  }
  
  const vel = dist / tiempo;
  dispVel.innerHTML = `${vel.toFixed(2)} <span style="font-size: 1rem;">m/s</span>`;
  
  let esLenta = vel < 0.8;
  if (esLenta) {
    dispBadge.innerHTML = `<span class="badge badge-rojo">Marcha Lenta (&lt; 0.8 m/s)</span>`;
    dispInterp.value = `La paciente presentó una velocidad de marcha de ${vel.toFixed(2)} m/s, calculada a partir de una distancia de ${dist} metros recorrida en ${tiempo} segundos. Al encontrarse por debajo de los parámetros de normalidad (habitualmente < 0.8 m/s), se clasifica como marcha lenta, evidenciando un bajo rendimiento físico y un compromiso severo de la capacidad funcional.`;
  } else {
    dispBadge.innerHTML = `<span class="badge badge-verde">Marcha Normal / Conservada (≥ 0.8 m/s)</span>`;
    dispInterp.value = `La paciente presentó una velocidad de marcha de ${vel.toFixed(2)} m/s (${dist} metros en ${tiempo} segundos), situándose dentro de los límites de normalidad (≥ 0.8 m/s), reflejando una capacidad funcional de desplazamiento adecuada.`;
  }
}

// 2. Dinamometría de mano (Schlüssel et al., 2008)
function calcularDinamometria() {
  const i1 = parseFloat(document.getElementById("dinamoIntento1").value) || 0;
  const i2 = parseFloat(document.getElementById("dinamoIntento2").value) || 0;
  const i3 = parseFloat(document.getElementById("dinamoIntento3").value) || 0;
  const brazo = document.getElementById("dinamoBrazo").value;
  const edad = parseInt(document.getElementById("filiacionEdad").value) || 45;
  const sexo = document.getElementById("filiacionSexo").value || "femenino";

  const maxVal = Math.max(i1, i2, i3);
  const dispMax = document.getElementById("dinamoMaximoDisplay");
  const dispPerc = document.getElementById("dinamoPercentilDisplay");
  const dispSem = document.getElementById("dinamoSemaforoDisplay");
  const dispInterp = document.getElementById("dinamoInterpretacion");

  dispMax.innerHTML = `${maxVal.toFixed(1)} <span style="font-size: 1rem;">kgf</span>`;

  // Buscar fila normativa en tabla Schlüssel
  const lista = TABLA_SCHLUSSEL[sexo] || TABLA_SCHLUSSEL["femenino"];
  const fila = lista.find(f => edad >= f.min && edad <= f.max) || lista[lista.length - 1];

  let percentil = "";
  let semaforoClase = "";
  let clasificacion = "";
  let detalle = "";

  if (maxVal < fila.p10) {
    percentil = "< P10";
    semaforoClase = "badge-rojo";
    clasificacion = "Dinapenia / Depleción Severa (Riesgo Crítico)";
    detalle = `situada por debajo del percentil 10 (< P10 = ${fila.p10} kgf para su grupo etario de ${fila.min}-${fila.max} años). Evidencia un cuadro de dinapenia severa y criterio diagnóstico mayor de sarcopenia / fragilidad clínica.`;
  } else if (maxVal <= fila.p30) {
    percentil = "P10 - P30";
    semaforoClase = "badge-amarillo";
    clasificacion = "Fuerza Baja / Alerta (Riesgo Moderado)";
    detalle = `situada entre el percentil 10 (${fila.p10} kgf) y el percentil 30 (${fila.p30} kgf) para su edad y sexo (Schlüssel et al., 2008). Evidencia un cuadro de fuerza baja / alerta asociado a riesgo moderado y reserva funcional comprometida.`;
  } else if (maxVal <= fila.p70) {
    percentil = "P30 - P70";
    semaforoClase = "badge-verde";
    clasificacion = "Fuerza Normal / Promedio (Estatus Óptimo)";
    detalle = `situada entre el percentil 30 y 70 (${fila.p30}-${fila.p70} kgf), indicando capacidad funcional preservada y adecuada masa muscular metabólicamente activa.`;
  } else {
    percentil = "> P70";
    semaforoClase = "badge-azul";
    clasificacion = "Fuerza Elevada (Excelente Reserva)";
    detalle = `situada por encima del percentil 70 (> ${fila.p70} kgf), reflejando excelente funcionalidad y reserva muscular protectora ante estrés catabólico.`;
  }

  dispPerc.textContent = percentil;
  dispSem.innerHTML = `<span class="badge ${semaforoClase}" style="font-size: 0.95rem; padding: 0.5rem 0.8rem;">${clasificacion}</span>`;
  
  dispInterp.value = `Dada la evaluación funcional realizada en tres intentos en el brazo ${brazo} (${i1} kg, ${i2} kg y un valor máximo de ${maxVal.toFixed(1)} kg obtenido), se selecciona este último por ser el registro máximo de la prueba. Este valor se sitúa en el percentil ${percentil}, ${detalle}`;
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

// 4. Escala Clínica de Fragilidad (ECF)
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

function seleccionarECF(nivel) {
  selectedECF = nivel;
  document.querySelectorAll(".ecf-card").forEach((c, idx) => {
    if (idx + 1 === nivel) {
      c.classList.add("selected");
    } else {
      c.classList.remove("selected");
    }
  });

  const dispInterp = document.getElementById("ecfInterpretacion");
  const nombre = ECF_NOMBRES[nivel];
  
  if (nivel === 4) {
    dispInterp.value = `La paciente presenta una puntuación de 4 puntos en la Escala Clínica de Fragilidad (ECF), clasificándola como Vulnerable. Aunque mantiene independencia para sus actividades diarias básicas, la fatiga y el cansancio temprano son manifestación del síndrome de Desgaste Proteico-Energético (DPE), anemia crónica y el catabolismo severo inducido por la hemodiálisis y la gastroparesia.`;
  } else if (nivel === 5) {
    dispInterp.value = `La paciente presenta una puntuación de 5 puntos en la Escala Clínica de Fragilidad (ECF), clasificándola como Levemente frágil. Presenta lentitud evidente y necesidad de apoyo en actividades cotidianas de mayor demanda física, con alto riesgo de deterioro funcional si no se interviene nutricionalmente.`;
  } else {
    dispInterp.value = `La paciente presenta una puntuación de ${nivel} puntos en la Escala Clínica de Fragilidad (ECF), correspondiente a ${nombre}. Requiere plan de atención nutricional y rehabilitación funcional acorde a su grado de fragilidad.`;
  }
}

// 5. Escala de Heces de Bristol
const BRISTOL_NOMBRES = {
  1: "Tipo 1: Trozos duros separados, como nueces",
  2: "Tipo 2: Salchicha grumosa compuesta de fragmentos",
  3: "Tipo 3: En forma de salchicha con grietas en superficie",
  4: "Tipo 4: Como salchicha o serpiente, lisa y blanda",
  5: "Tipo 5: Trozos pastosos con bordes definidos",
  6: "Tipo 6: Fragmentos blandos y esponjosos con bordes irregulares",
  7: "Tipo 7: Acuosa, sin pedazos sólidos (líquida)"
};

function seleccionarBristol(tipo) {
  selectedBristol = tipo;
  document.querySelectorAll(".bristol-card").forEach((c, idx) => {
    if (idx + 1 === tipo) {
      c.classList.add("selected");
    } else {
      c.classList.remove("selected");
    }
  });

  const dispInterp = document.getElementById("bristolInterpretacion");
  const desc = BRISTOL_NOMBRES[tipo];

  if (tipo === 1 || tipo === 2) {
    dispInterp.value = `La paciente presenta heces ${desc} según la Escala de Bristol, compatibles con estreñimiento y tránsito intestinal lento. Este hallazgo está estrechamente relacionado a su estado de NPO (o nula ingesta previa de agua y fibra) y la inmovilidad en cama.`;
  } else if (tipo === 3 || tipo === 4) {
    dispInterp.value = `La paciente presenta heces ${desc} según la Escala de Bristol, indicativas de tránsito intestinal normal e hidratación fecal adecuada.`;
  } else {
    dispInterp.value = `La paciente presenta heces ${desc} según la Escala de Bristol, indicativas de tránsito intestinal acelerado o mala absorción líquida, requiriendo vigilancia hidroelectrolítica.`;
  }
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
  const sexo = document.getElementById("filiacionSexo").value;

  // 1. IMC
  let imc = 0;
  let imcClase = "Normal";
  let imcBadgeClase = "badge-verde";
  if (talla > 0 && pesoAct > 0) {
    const tallaM = talla / 100;
    imc = pesoAct / (tallaM * tallaM);
    
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

  document.getElementById("resIMC").textContent = imc.toFixed(1);
  document.getElementById("resIMCBadge").innerHTML = `<span class="badge ${imcBadgeClase}">${imcClase}</span>`;
  document.getElementById("bannerIMC").textContent = `${imc.toFixed(1)} kg/m² (${imcClase})`;

  // 2. % Pérdida de Peso
  let perdidaPct = 0;
  if (pesoHab > 0 && pesoAct > 0) {
    perdidaPct = ((pesoHab - pesoAct) / pesoHab) * 100;
  }
  document.getElementById("resPerdidaPeso").textContent = `${perdidaPct.toFixed(1)}%`;
  document.getElementById("resPerdidaBadge").innerHTML = perdidaPct > 5 ? 
    `<span class="badge badge-amarillo">Pérdida Significativa</span>` : 
    `<span class="badge badge-verde">Estable</span>`;

  // 3. CMB: CB - (pi * PCT / 10)
  let cmb = 0;
  if (cb > 0 && pct > 0) {
    cmb = cb - (Math.PI * pct / 10);
  }
  document.getElementById("resCMB").textContent = cmb > 0 ? cmb.toFixed(2) : "--";
  document.getElementById("resCMBBadge").innerHTML = cmb < 23.2 ? 
    `<span class="badge badge-rojo">Masa muscular braquial disminuida</span>` : 
    `<span class="badge badge-verde">Masa muscular conservada</span>`;

  // 4. Perímetro Abdominal
  document.getElementById("resAbdVal").textContent = `${abd} cm`;
  const limiteAbd = sexo === "femenino" ? 80 : 90;
  const riesgoAbd = abd >= limiteAbd;
  document.getElementById("resAbdBadge").innerHTML = riesgoAbd ? 
    `<span class="badge badge-amarillo">Riesgo aumentado (≥${limiteAbd})</span>` : 
    `<span class="badge badge-verde">Riesgo normal</span>`;

  // Interpretación global
  document.getElementById("antropoInterpretacion").value = 
    `IMC de ${imc.toFixed(1)} kg/m² (${imcClase}). Pérdida ponderal de ${perdidaPct.toFixed(1)}% respecto a su peso habitual (${pesoHab} kg). Perímetro abdominal de ${abd} cm (${riesgoAbd ? "riesgo metabólico aumentado" : "sin riesgo metabólico elevado"}). Pliegue Tricipital (PCT = ${pct} mm) que refleja reserva grasa subcutánea. Circunferencia muscular del brazo calculada (CMB = ${cmb.toFixed(2)} cm) que evidencia masa muscular braquial disminuida. Perímetro de pantorrilla (CP = ${cp} cm) indicando reserva muscular periférica.`;
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

function renderizarTablaBioquimica() {
  const tbody = document.getElementById("bioquimicaTableBody");
  tbody.innerHTML = "";

  datosBioquimicosActuales.forEach((item, index) => {
    const tr = document.createElement("tr");

    let badgeClass = "badge-normal";
    let badgeText = "Normal";
    if (item.estado === "elevado" || item.estado === "muy_elevado") {
      badgeClass = "badge-elevado";
      badgeText = item.estado === "muy_elevado" ? "Muy Elevado" : "Elevado";
    } else if (item.estado === "disminuido" || item.estado === "muy_disminuido") {
      badgeClass = "badge-disminuido";
      badgeText = item.estado === "muy_disminuido" ? "Muy Disminuido" : "Disminuido";
    }

    tr.innerHTML = `
      <td><strong>${item.nombre}</strong></td>
      <td>
        <input type="number" step="0.01" class="form-control" style="width: 100px; display: inline-block;" value="${item.resultado}" onchange="actualizarAnalitoManual(${index}, this.value)">
        <span style="font-size: 0.8rem; color: var(--gray-600);">${item.unidad}</span>
      </td>
      <td style="color: var(--gray-600); font-size: 0.85rem;">${item.valor_normal}</td>
      <td><span class="badge ${badgeClass}">${badgeText}</span></td>
      <td>
        <textarea class="form-control" rows="2" style="font-size: 0.85rem;" oninput="actualizarInterpManual(${index}, this.value)">${item.interpretacion}</textarea>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function actualizarAnalitoManual(index, nuevoValor) {
  if (datosBioquimicosActuales[index]) {
    datosBioquimicosActuales[index].resultado = parseFloat(nuevoValor);
  }
}

function actualizarInterpManual(index, nuevoTexto) {
  if (datosBioquimicosActuales[index]) {
    datosBioquimicosActuales[index].interpretacion = nuevoTexto;
  }
}

function extraerBioquimicaCliente(texto) {
  // Regex básica local para cuando se corre sin backend
  const analitosMock = [
    { clave: "trigliceridos", nombre: "Triglicéridos", unidad: "mg/dL", normal: "< 150 mg/dL", max: 150, pat: /triglic[eé]ridos?[:=\s]+([0-9.,]+)/i },
    { clave: "colesterol", nombre: "Colesterol Total", unidad: "mg/dL", normal: "< 200 mg/dL", max: 200, pat: /colesterol[:=\s]+([0-9.,]+)/i },
    { clave: "hdl", nombre: "HDL", unidad: "mg/dL", normal: "≥ 50 mg/dL", min: 50, pat: /hdl[:=\s]+([0-9.,]+)/i },
    { clave: "ldl", nombre: "LDL", unidad: "mg/dL", normal: "< 100 mg/dL", max: 100, pat: /ldl[:=\s]+([0-9.,]+)/i },
    { clave: "glucosa", nombre: "Glucosa basal", unidad: "mg/dL", normal: "70 - 100 mg/dL", min: 70, max: 100, pat: /glucosa(?:\s*basal)?[:=\s]+([0-9.,]+)/i },
    { clave: "hba1c", nombre: "HbA1c", unidad: "%", normal: "< 5.7 % (Meta: < 7.0%)", max: 5.7, pat: /hb1?c[:=\s]+([0-9.,]+)/i },
    { clave: "albumina", nombre: "Albúmina", unidad: "g/dL", normal: "3.5 - 5.0 g/dL", min: 3.5, max: 5.0, pat: /alb[uú]mina[:=\s]+([0-9.,]+)/i },
    { clave: "prealbumina", nombre: "Prealbúmina", unidad: "mg/dL", normal: "15 - 36 mg/dL", min: 15.0, pat: /prealb[uú]mina[:=\s]+([0-9.,]+)/i },
    { clave: "hemoglobina", nombre: "Hemoglobina", unidad: "g/dL", normal: "12 - 16 g/dL", min: 12.0, pat: /hemoglobina[:=\s]+([0-9.,]+)/i },
    { clave: "urea", nombre: "Urea sérica", unidad: "mg/dL", normal: "15 - 40 mg/dL", max: 40.0, pat: /urea[:=\s]+([0-9.,]+)/i },
    { clave: "creatinina", nombre: "Creatinina sérica", unidad: "mg/dL", normal: "0.6 - 1.3 mg/dL", max: 1.3, pat: /creatinina[:=\s]+([0-9.,]+)/i },
    { clave: "sodio", nombre: "Sodio", unidad: "mEq/L", normal: "135 - 145 mEq/L", min: 135.0, pat: /sodio[:=\s]+([0-9.,]+)/i },
    { clave: "calcio", nombre: "Calcio", unidad: "mg/dL", normal: "8.5 - 10.2 mg/dL", min: 8.5, pat: /calcio[:=\s]+([0-9.,]+)/i },
    { clave: "fosforo", nombre: "Fósforo", unidad: "mg/dL", normal: "2.5 - 4.5 mg/dL", max: 4.5, pat: /f[oó]sforo[:=\s]+([0-9.,]+)/i },
    { clave: "potasio", nombre: "Potasio", unidad: "mEq/L", normal: "3.5 - 5.0 mEq/L", max: 5.0, pat: /potasio[:=\s]+([0-9.,]+)/i },
    { clave: "magnesio", nombre: "Magnesio", unidad: "mg/dL", normal: "1.7 - 2.2 mg/dL", min: 1.7, pat: /magnesio[:=\s]+([0-9.,]+)/i }
  ];

  const encontrados = [];
  analitosMock.forEach(a => {
    const m = texto.match(a.pat);
    if (m) {
      const val = parseFloat(m[1].replace(",", "."));
      let estado = "normal";
      let interp = "Dentro del rango de normalidad.";
      if (a.max && val > a.max) {
        estado = "elevado";
        interp = `Elevado: valor superior al rango máximo normal (${a.normal}), requiere monitoreo en soporte nutricional.`;
      } else if (a.min && val < a.min) {
        estado = "disminuido";
        interp = `Disminuido: valor inferior al rango de referencia (${a.normal}), indica déficit o pérdida orgánica.`;
      }
      encontrados.push({
        nombre: a.nombre,
        resultado: val,
        unidad: a.unidad,
        valor_normal: a.normal,
        estado: estado,
        interpretacion: interp
      });
    }
  });

  if (encontrados.length > 0) {
    datosBioquimicosActuales = encontrados;
    renderizarTablaBioquimica();
    alert(`Se extrajeron ${encontrados.length} analitos con el motor local.`);
  } else {
    alert("No se detectaron analitos en el texto ingresado. Comprueba el formato de los datos.");
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
  // Construir texto de laboratorio y analizar
  let lineas = [];
  for (const [k, v] of Object.entries(bioqDict)) {
    lineas.push(`${k}: ${v}`);
  }
  document.getElementById("rawClinicalText").value = lineas.join("\n");
  analizarTextoBioquimica();
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
    alert("¡Enlace copiado al portapapeles! Ábrelo en el navegador de tu celular.");
  }).catch(() => {
    document.execCommand("copy");
    alert("¡Enlace copiado!");
  });
}


