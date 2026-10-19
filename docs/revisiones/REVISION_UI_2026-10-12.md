# Revisión de interfaz y experiencia — 12/10/2026

Method: dual-agent (A: /root/ux_design_review · B: /root/ux_evidence_review).

Estado: revisión y propuesta; no implementación. Skills: Impeccable y UI UX Pro Max. Objetivo principal: `src/app/produccion`; revisión complementaria de Muestras, Ventas, importación y navegación.

## Evidencia y límites

Se revisaron instrucciones, README, plan, especificaciones, esquema Prisma, componentes y casos de uso actuales. A realizó una evaluación independiente de fuentes y capturas; B ejecutó detector y navegador sin consultar A. Los resultados se combinaron después de completar A.

La captura `tmp/qa-production-3d-v2.png` es del 12/10 a las 00:58. Las capturas de Ventas del 2/10 son referencia histórica, no validación de la interfaz actual. Chrome DevTools encontró su perfil ocupado. Playwright aislado pudo navegar, pero Producción y Muestras redirigieron a login por falta de sesión. No se probaron interactivamente pantallas privadas ni se modificaron datos.

Login se inspeccionó a 1440×1000 y 390×844: sin desborde horizontal y con campos/botones de 44 px de alto. No se certifican accesibilidad, contraste, rendimiento, lector de pantalla ni comportamiento táctil de Producción. Los controles pequeños se comparan con el objetivo del proyecto de 44 px; esto no equivale por sí solo a demostrar incumplimiento WCAG.

## Diagnóstico

El modelo de acero y bandejas aporta identidad y representa bien el negocio. La paleta existente es coherente. Conviene conservarlos. El problema principal es la organización del trabajo: metadatos, visor con otra cabecera, panel, controles de agrupación, tabla completa y guardado forman una pantalla larga con acciones separadas.

Funcionan bien la identificación del pesaje conjunto, la distinción cero/pendiente, la alternativa HTML y el patrón móvil ya presente en Ventas. El recorrido empieza con una máquina reconocible, pierde claridad al cargar y agrupar resultados y termina con un guardado demasiado distante.

## Hallazgos priorizados

| Prioridad | Evidencia | Efecto y propuesta |
| --- | --- | --- |
| P1 | `cycle-editor.tsx`: metadatos antes del visor y guardado al pie; `machine-canvas.tsx`: panel debajo hasta xl | Acercar máquina, selección y edición; contexto compacto y barra de guardado persistente. Tabla y 3D como vistas alternativas del mismo estado. |
| P1 | `changeProduct`, `groupSelected`, `separateSelected` eliminan pesos locales asociados, incluso en grupos parcialmente seleccionados | Mostrar resultados y bandejas afectados antes de confirmar; cancelar conserva todo, ofrecer deshacer local. No distribuir kilos. No es evidencia de corrupción persistida. |
| P1 | Alta limpia muestra «Datos guardados» con `dirty=false`; errores al final | Diferenciar nuevo, guardado, modificado, guardando y error. Asociar errores, enfocar el campo y conservar valores. |
| P2 | Cabeceras repetidas, herramientas simultáneas, tokens propios del visor y botones de 36–40 px | Una cabecera, controles principales claros, herramientas secundarias agrupadas y tokens compartidos. |
| P2 | Tablas de Producción/Muestras con ancho mínimo de 650 px; contactos debajo del registro | Tarjetas móviles, comparación estrecha, separar tareas de Muestras y ofrecer alta desde un contacto identificado. |

Otros hallazgos comprobados en fuente: cambiar Venta → Muestra desde `sale-dialog.tsx` no pasa por la protección de cierre con cambios; Muestras necesita protección de salida. La ausencia total de contactos puede mostrar «Todos los contactos tienen al menos una entrega vinculada». Comparar dos ciclos iguales devuelve resultado vacío sin explicación. El selector de ciclos por máquina carga todas las opciones. El texto de importación sigue hablando solo de ventas aunque incluya muestras.

Ventas ya cuenta con prioridad de fecha/importe, errores asociados, protección de cierre y tarjetas móviles; esas mejoras no se presentan como pendientes. Su búsqueda de últimas 50 operaciones tiene alcance explícito: un historial completo requeriría un corte adicional de consultas, no solo estilos.

## Heurísticas provisionales

Escala 0–4; evaluación de fuente y captura, no medición con usuarios.

| Heurística | Puntuación | Motivo |
| --- | ---: | --- |
| Estado visible | 2 | Estado de alta incorrecto |
| Correspondencia con el trabajo | 3 | Máquina, bandejas y kg reconocibles |
| Control y libertad | 2 | Transformaciones sin deshacer |
| Consistencia | 2 | Visor y patrones móviles divergentes |
| Prevención de errores | 2 | Consecuencias de agrupar poco explícitas |
| Reconocimiento | 3 | Selección numerada y etiquetas |
| Eficiencia | 2 | Edición repetida y guardado distante |
| Minimalismo | 2 | Capas y herramientas simultáneas |
| Recuperación | 2 | Errores lejos de la acción |
| Ayuda contextual | 2 | Falta anticipar efectos sobre pesos |
| **Total** | **22/40** | Base funcional con mejoras operativas importantes |

Usuario frecuente: reducir carga repetitiva y saltos al guardado. Usuario de teclado/lector: completar patrón de tabs, foco y mensajes asociados. Usuario móvil: priorizar selección y peso sin atravesar un lienzo alto y una tabla horizontal. Son escenarios de evaluación, no personas investigadas.

## Detector e interpretación

CLI: `detect --json src/app/produccion src/app/muestras src/components`, salida `[]`, código 0. Hay 39 archivos fuente candidatos; la herramienta no informa cuántos procesó. Cero hallazgos no valida los flujos ni el diseño; no incluyó `globals.css`.

Detector inyectado en login mediante navegador headless: encabezado de 5 anti-patterns y 6 entradas de reglas (2 `undersized-ui-text`, 1 `kicker-above-heading`, 2 `tiny-text`, 1 `cream-palette`). Se conserva la discrepancia. `login/page.tsx:19–20` contiene texto auxiliar señalado; otras entradas no precisan elemento. Revisar legibilidad de textos de 10–11 px. No contar señales solapadas como defectos únicos. La paleta crema y la etiqueta contextual no justifican cambiar la identidad. No extrapolar login a Producción.

UI UX Pro Max aportó criterios de recuperación, foco, errores y controles táctiles. Se descartó su propuesta genérica de Hero/CTA, tipografía y paleta azul por no corresponder al trabajo operativo ni a la identidad existente.

## Decisión y siguiente entrega

Usuario confirmó **Máquina primero**. La propuesta detallada y sus criterios están en [Interfaz v2](../specs/frontend/002-interfaz-v2.md). Orden: seguridad de edición → espacio de trabajo Máquina → consulta de producción → Muestras → consistencia general e importación. Sin stock, costos, telemetría ni cambio de autenticación.

La frecuencia real de pesaje agrupado, dimensiones físicas y conveniencia de identificación automática siguen abiertas; no bloquean el rediseño. Se propone mantener identificación manual y geometría configurable existente hasta confirmarlas.
