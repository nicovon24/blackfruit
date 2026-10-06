# Revisión de UI · 3 de octubre de 2026

Método: dos evaluaciones independientes de Impeccable, A `/root/design_review` y B `/root/evidence_review`; consultas locales de UI UX Pro Max y revisión de accesibilidad con ECC. Objetivo: mejorar la operación cotidiana conservando la identidad visual existente.

## Diagnóstico inicial

La marca, la paleta y el tono son coherentes con BlackFruit. Las mayores oportunidades están en el orden de los formularios, la protección del trabajo escrito y la extensión del flujo de importación. La revisión inicial combina código, capturas privadas del 2/10 y login actual en Chrome. Las capturas históricas no acreditan por sí solas el funcionamiento actual de rutas autenticadas.

| Heurística | Puntaje inicial /4 |
| --- | ---: |
| Estado visible | 3 |
| Lenguaje del negocio | 3 |
| Control y libertad | 2 |
| Consistencia | 3 |
| Prevención de errores | 3 |
| Reconocimiento | 3 |
| Eficiencia | 2 |
| Minimalismo | 2 |
| Recuperación | 3 |
| Ayuda | 2 |
| Total | 26/40 |

Puntajes heurísticos provisionales, anteriores a los refinamientos; no son una medición con usuarios ni certificación de accesibilidad. Primera revisión: sin tendencia comparable.

## Prioridades

1. **P1 · Importación extensa.** Configuración de columnas y hasta 40 operaciones con controles se acumulan en la página. Propuesta: resumir columnas detectadas, filtros para errores/muestras/exclusiones, resumen de importes visible y pasos claros. Preservar confirmación explícita y conciliación. Pendiente, requiere corte propio.
2. **P1 · Descarte de cambios.** El cierre de venta desmontaba el formulario sin aviso. Se incorpora confirmación de descarte y bloqueo durante guardado; no se implementa almacenamiento de borradores.
3. **P2 · Jerarquía móvil.** El análisis y el estado vacío desplazaban ventas recientes. Se sube recientes en celular, compacta vacío de productos y aumenta legibilidad de ayudas.
4. **P2 · Alta comienza por cliente opcional.** Fecha e importe pasan al comienzo. Errores vinculados y foco al campo inválido facilitan corregir sin perder datos.
5. **P2 · Alcance de búsqueda poco visible.** El límite de 50 ventas pasa junto al buscador, se añade limpiar filtros, búsqueda con tildes normalizadas e importes ARS. Consulta paginada de todo el historial pendiente.

## Fortalezas y personas

Conservar navegación etiquetada, estados confirmados con texto, separación ventas/muestras, nombres de origen sin identificación automática y alternativa textual del gráfico. Uso frecuente: minimizar scroll y aclarar búsqueda. Teclado/visión reducida: errores asociados, foco y controles amplios. Celular/interrupciones: proteger cambios y priorizar actividad reciente.

La importación tiene carga cognitiva alta: exige comparar configuración, filas y totales alejados. El acceso es cálido y el cierre de importación confirma el resultado con claridad; la revisión intermedia concentra la fricción.

## Evidencia y límites

El detector CLI inicial sobre `src` devolvió cero hallazgos. El detector DOM del login anunció 8 pero enumeró 10 entradas, incluyendo texto pequeño, tracking negativo, etiquetas sobre títulos y paleta crema. No se suman como diez defectos confirmados: crema es identidad intencional; texto de 10–11 px sí merece revisión. Overlay sólo en navegador headless de QA, sin overlay visible para el usuario. Servidor auxiliar detenido, app conservada.

UI UX Pro Max aportó coincidencias pertinentes para errores inline, asociación con campos y foco. Su búsqueda de progressive disclosure devolvió tipografía, por lo que se descartó; la recomendación de simplificar importación proviene de la revisión del producto.

Refinamientos y criterios de aceptación registrados en `docs/specs/interfaz-v1.md`. Capturas y scripts de QA viven en `tmp/`, fuera de Git. No se agregan dependencias ni migraciones.

## Verificación del refinamiento

Typecheck, lint y build completos. El build requirió ejecución fuera del sandbox por `spawn EPERM` al iniciar TypeScript; pasó al reintentar. Detector final sobre componentes modificados: cero hallazgos CLI.

Chrome autenticado con cuenta temporal de desarrollo: dashboard, ventas e importación a 1440 y 375 px; sin desbordamiento horizontal. Limpiar filtros vacía la búsqueda. Rechazar la confirmación conserva el importe escrito y aceptar cierra la venta. Sin errores de ejecución capturados. Cuenta QA eliminada al terminar; sin crear ventas para esta comprobación. Capturas finales en `tmp/critique-b/`, resultados en `auth-qa.json`.

Usar `http://localhost:3000`, origen configurado en APP_URL: el primer intento de autenticación desde 127.0.0.1 no redirigió; su cuenta temporal también fue eliminada. La asociación de errores y la búsqueda de importes se revisaron en código; esta ronda de navegador no cubrió todos los errores del servidor ni una búsqueda sobre ventas pobladas.
