# Importación de producción v1

Actor: administrador. Resultado: cargar XLSX, revisar ciclos y confirmar registros de producción con su fecha real de finalización.

Reglas ya fijadas: el servidor valida máquina, catálogo, bandejas y pesajes con las reglas del ciclo manual; el peso conjunto se suma una vez; el archivo no modifica ciclos sin revisión. El origen conserva lote, hoja y filas; reintentos no duplican. `production:write` e `imports:write` protegen la confirmación. Los conflictos se presentan antes de escribir. La vista previa separa válidos, errores y duplicados.

Decisión del 18/10/2026: la plantilla propuesta se prueba con dos hojas. `Ciclos` contiene una fila por ciclo con `codigo`, `fecha`, `maquina`, `total_kg` y `observaciones`; `Pesajes` contiene una fila por resultado con `codigo`, `producto`, `variante`, `bandejas` y `kg`. `bandejas` enumera posiciones separadas por coma, de modo que un pesaje agrupado mantiene un solo peso. La suma de `Pesajes.kg` debe coincidir exactamente con `Ciclos.total_kg`. La plantilla muestra fechas `dd/mm/yyyy`.

Un código de ciclo existente se marca como conflicto para revisión; no se actualiza ni se omite en silencio. Un archivo idéntico ya confirmado se reconoce por procedencia y no duplica ciclos. El usuario aceptó probar esta estructura propuesta; el mapeo contra su planilla habitual se podrá adaptar después sin cambiar las reglas de los ciclos.

Estados: carga, revisión, conflicto, confirmación y resultado. La plantilla define las columnas; no hay mapeo libre en esta versión. Aceptación: un ciclo con grupo conserva su peso, fechas válidas se guardan, una vista previa con errores o conflictos no se confirma, repetir la carga no duplica y un conflicto nunca reemplaza datos en silencio. La confirmación es idempotente por archivo y código; cada ciclo se guarda de forma atómica. Si un lote con varios ciclos se interrumpe, el reintento completa los restantes sin duplicar los ya guardados.
