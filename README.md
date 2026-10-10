# Plataforma de Proceso de Atención Nutricional (PAN) - Nutrición Clínica USIL

Sistema clínico y hospitalario interactivo para la evaluación y soporte nutricional especializado (Prácticas 6 y 7 de Nutrición Clínica - USIL).

## Características Principales
- **Extracción Inteligente de Historias Clínicas en PDF:** Carga de documentos con auto-completado de filiación, antecedentes, diagnóstico, y 18 analitos bioquímicos.
- **Evaluación Subjetiva (NRS-2002):** Screening inicial y final con tablas oficiales e interpretación clínica automática.
- **Evaluación Objetiva:**
  - Antropometría: IMC, perímetro abdominal, pliegue tricipital, CMB ($CB - 0.314 \times PCT$) y pantorrilla.
  - Bioquímica: 18 analitos con valores normales e interpretación clínica fisiopatológica.
  - Examen Clínico: 9 órganos y sistemas.
  - Dietético: Recordatorio de 24 horas.
  - Ecológica: Escala de Heces de Bristol con infografía interactiva.
  - Funcional: Dinamometría de mano (Schlüssel et al., 2008) con semáforo, velocidad de marcha, SARC-F y Escala Clínica de Fragilidad.
- **Intervención y Soporte Enteral:**
  - Regla del pulgar de Vidal para cálculo de GET.
  - Distribución de macronutrientes y micronutrientes.
  - Selección de fórmulas comerciales (Vital 1.5, Glucerna 1.0) y cálculo de nutriente limitante.
  - Adición de módulos (proteico, CHO, fibra), adecuación y agua libre faltante con prescripción formal.
- **Base de Datos en la Nube:** Conexión nativa con **TiDB Cloud Serverless** para persistencia multi-dispositivo.
- **Despliegue Continuo:** Contenedor Docker listo para producción en **Render**.
