# Spec: Ocean Market

## Objective
Evolucionar el catálogo moderado actual hacia un mercado transaccional con pedidos, historial, seguimiento, protección operativa y valoraciones vinculadas a compras verificadas. El catálogo actual y los flujos PayPal de la tienda existente son sistemas distintos y no deben confundirse.

## Stack y estructura
- Backend: Worker `oceanhud`, Ocean Suite y el proveedor de pago existente.
- Identidad comercial: roles OceanHub Seller y registros actuales de vendedor.
- Catálogo existente: `/ocean/market` y administración correspondiente.
- Nuevas APIs de pedidos, si se necesitan, serán complementarias y versionadas.

## Requisitos funcionales
1. Estados de publicación: borrador, pendiente de revisión, aprobada, rechazada, pausada y retirada.
2. Órdenes con identificador estable, comprador/vendedor autorizados, snapshot de producto/precio y registro de eventos.
3. Estados de orden explícitos: creada, pendiente de pago, pagada, en proceso, completada, cancelada, reembolsada o en revisión; cada transición tiene reglas y actor.
4. Historial de compra y seguimiento para comprador, vendedor y Staff con datos visibles según rol.
5. El flujo de pago debe reutilizar la integración existente solo después de revisar firma de webhook, idempotencia, conciliación, reintentos, cancelaciones y reembolsos.
6. Valoraciones permitidas únicamente al comprador de una orden completada y verificada, una vez y asociadas a esa orden.
7. Centro de soporte y registro de disputa/consulta sin prometer escrow, cobertura de reembolso o garantías que no existan legalmente o en el proveedor.

## Boundaries
- No habilitar checkout ni aceptar dinero desde el catálogo hasta que todas las condiciones de pago y conciliación estén verificadas en Sandbox.
- Nunca confiar en precio, rol, seller ID o estado de orden enviado por el cliente; recalcular y validar en servidor.
- Webhooks idempotentes, firma verificada y transiciones atómicas/serializadas con los mecanismos actuales.
- No exponer datos personales, emails, dirección ni historial de compras a usuarios no autorizados.
- No modificar el checkout de la tienda existente como efecto secundario.
- No calificar vendedores con reseñas no asociadas a órdenes completadas.

## Testing strategy
- Tests de transición válida/inválida, propiedad de orden y separación comprador/vendedor/Staff.
- Webhook duplicado, orden duplicada, reintentos, fallo parcial y conciliación.
- Sandbox E2E con eventos reales de prueba antes de habilitar compras.
- Pruebas de regresión para tienda, PayPal, suscripciones, vendedores y catálogo actual.

## Success criteria
- Todas las órdenes tienen estados e historial auditables.
- Un usuario no puede comprar, valorar o gestionar órdenes ajenas.
- Ninguna transacción pasa a pagada solo por una confirmación del cliente.
- Checkout sigue deshabilitado hasta aprobar pruebas del proveedor y revisión de seguridad.

## Out of scope
- Custodia de fondos/escrow o garantía financiera propia.
- Sustituir PayPal o alterar precios/planes del sistema actual.
- Prometer reembolsos automáticos sin comprobar soporte real del proveedor y reglas de negocio.

## Open questions
- Definir si el primer tipo de producto será digital, servicio o ambos; cada tipo necesita una política de entrega y cancelación diferenciada.
