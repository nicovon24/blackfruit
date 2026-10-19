# Fechas y períodos v1

Actor: administrador. Resultado: introducir y leer fechas completas como `dd/mm/yyyy`; consultar ventas en Inicio por mes, rango o histórico y ver cambios sin botón de aplicación.

Reglas: las fechas de negocio se guardan como DATE y se transportan internamente como `yyyy-mm-dd`; el campo visible usa siempre `dd/mm/yyyy`. Una fecha incompleta, imposible o un rango invertido muestra error sin guardar. La fecha de producción es la fecha real de finalización ya existente. «Histórico» de Inicio incluye todo el registro; los borradores de producción no suman kilos en su dashboard. Para un mes, el gráfico de ventas agrupa por día; para rangos, por mes. Un comprador se cuenta una sola vez en todo el rango.

Estados: mes, rango, histórico, actualización pendiente, vacío y error. Permisos: los actuales de dashboard/producción se verifican antes de consultar. Datos privados no se almacenan en el navegador. Los filtros persisten en URL.

Aceptación: escribir `05/09/2026` guarda el 5 de septiembre y se ve igual al recargar; `31/02/2026` se rechaza; cambio de mes actualiza sin «Ver»; septiembre–octubre incluye ambos meses; histórico incluye fechas anteriores; volver desde detalle conserva filtros.
