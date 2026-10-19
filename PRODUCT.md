<!-- impeccable:product-schema 1 -->
# BlackFruit

## Platform
web

## Usuarios y propÃ³sito
AplicaciÃ³n privada para el equipo autorizado que administra ventas, producciÃ³n de frutas deshidratadas y muestras. Se usa desde escritorio y celular.

## Contexto de uso
La producciÃ³n se registra despuÃ©s de terminar fÃ­sicamente una pasada del deshidratador. Un borrador representa informaciÃ³n incompleta. El visor representa datos registrados, sin conexiÃ³n ni control sobre una mÃ¡quina real.

## Capacidades y restricciones
- MÃ¡quinas configurables, con nombre y cantidad de bandejas. Inicio previsto: dos mÃ¡quinas de 16 bandejas, con posibilidad de agregar mÃ¡s. Conservar configuraciÃ³n histÃ³rica en ciclos existentes.
- Un producto y variante por bandeja; una variante puede ocupar varias bandejas. CatÃ¡logo reutilizable y ampliable.
- Pesajes individuales o conjuntos del mismo producto y variante. Un resultado se suma una sola vez; nunca repartir un peso conjunto inventando resultados individuales.
- Kg exactos con hasta tres decimales. Pendiente y cero confirmado son distintos. Un registro finalizado requiere todos sus resultados completos.
- ResÃºmenes por fecha de finalizaciÃ³n; borradores separados. Rendimiento, costos y stock quedan fuera de esta etapa.
- Muestras independientes de ventas: no generan ingresos ni aumentan sus indicadores. Conservar procedencia de importaciones y revisar datos desconocidos. Un nombre no identifica por sÃ­ solo a un contacto.
- AutorizaciÃ³n en servidor y acceso privado; nunca publicar datos reales del diseÃ±o de referencia.

## Compromisos de identidad
Conservar la identidad existente: carbÃ³n, crema, superficies blancas, naranja tostado y oliva; marca serif. El deshidratador se basa en la referencia local `docs/designs/BlackFruit_3D_v2.html`.

## Principios
Máquinas y Dashboard tienen accesos directos bajo Producción; Máquinas permite registrar ciclos y Dashboard consultar resultados. Operaciones de datos disponibles también sin 3D. Contexto de selección y consecuencias de cambios visibles; confirmación clara del guardado.

## Evidencia
Decisiones expresadas por el usuario en la conversaciÃ³n y confirmaciÃ³n del 12/10/2026: Â«MÃ¡quina primeroÂ». Reglas detalladas en `docs/specs/backend/006-produccion-v1.md`, `docs/specs/backend/007-muestras-v1.md` e `docs/specs/backend/005-importacion-v1.md`. Propuesta de reorganizaciÃ³n pendiente en `docs/specs/frontend/002-interfaz-v2.md`.
