---
name: sri-offline-sequential-architecture
description: Arquitectura y protocolo de emisión de comprobantes offline del SRI en Ecuador — gestión estricta de secuenciales monótonos por punto de emisión, Transactional Outbox, despacho FIFO, Circuit Breaker ante caídas del SRI, prevención de saltos en ATS y tratamiento de estados DEVUELTA/AUTORIZADO. USE WHEN se trabaje con facturación electrónica SRI, outbox de facturas, cola de despacho de comprobantes, caídas del SRI, reintentos de clave de acceso, secuenciales desordenados, puntos de emisión concurrentes o cumplimiento ATS.
---

# SRI Offline Sequential Architecture & Resilient Queue

Esta guía define las reglas técnicas, arquitectónicas y tributarias para la emisión electrónica de comprobantes de venta bajo el **Esquema Offline del SRI de Ecuador (Ficha Técnica v2.21)** en EcuNexo.

Responde directamente al problema crítico:
> *"¿Qué sucede cuando el SRI está caído o no responde, se firman facturas offline y se acumulan pendientes? Si se emiten varias facturas (#1 a #8), ¿la octava invalida las anteriores por tener un secuencial más avanzado?"*

---

## 1. El Mito de la "Invalidación" vs. Realidad Fiscal

### A. A Nivel del Web Service del SRI (Ficha Técnica Offline)
- El Web Service de recepción del SRI (`validarComprobante`) valida comprobantes de forma **atómica e independiente**.
- Cada comprobante se evalúa por su **Clave de Acceso única de 49 dígitos**, su firma digital **XAdES-BES**, su vigencia de certificado y su esquema XSD.
- **El SRI NO invalida facturas por llegar con secuencial posterior**: si la factura #8 llega al SRI antes que la #1 a la #7, el SRI la recibe y procesa. **No existe una regla en el WS que rechace facturas anteriores por haberse recibido una posterior.**

### B. El Verdadero Riesgo: La Auditoría Tributaria y el ATS
- Según el **Reglamento de Comprobantes de Venta y Retención (Art. 18)**:
  - Los comprobantes deben emitirse en **secuencia continua y cronológica ascendente** por establecimiento y punto de emisión.
  - No pueden existir **huecos (gaps) injustificados** en la numeración.
- En el **Anexo Transaccional Simplificado (ATS)** mensual y en auditorías fiscales:
  - Si la factura #8 se autoriza con fecha `10/05 15:00` y la #1 queda huérfana o se envía días después con una fecha incoherente, se genera una inconsistencia en el libro de ventas.
  - La pérdida o anulación irregular de secuenciales intermedios genera multas por comprobantes no reportados o desorden cronológico.

---

## 2. Arquitectura de Garantía Secuencial EcuNexo

Para asegurar que **nunca ocurran saltos de secuencial, transmisiones desordenadas ni comprobantes huérfanos**, EcuNexo implementa el siguiente patrón:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. Transacción ACID: Reserva atómica de Secuencial (Bloqueo pesimista)      │
│    SELECT NextSeq FROM emission_points WHERE id = @Id FOR UPDATE;          │
└─────────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 2. Generación XML + Firma Digital XAdES-BES Inmediata                       │
│    - Clave de Acceso 49 dígitos generada                                    │
│    - XML firmado y archivado en almacenamiento inmutable                     │
│    - Válido legalmente para entrega física/digital al comprador             │
└─────────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 3. Inserción Transaccional en sri_outbox                                    │
│    Status: 'Pending', Sequential: #00000000X, PtoEmi: '001-001'             │
└─────────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 4. Worker de Despacho FIFO Estricto por (CompanyId, Establecimiento, Punto) │
│    ORDER BY "CreatedAt" ASC, "Sequential" ASC                               │
│    FOR UPDATE SKIP LOCKED                                                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                   │
                   ┌───────────────┴───────────────┐
                   ▼                               ▼
       [SRI Disponible / 200 OK]       [SRI Caído / Timeout / 5xx]
                   │                               │
        Enviar #1 -> Autorizar          Activar CIRCUIT BREAKER (Open)
        Luego Enviar #2 -> ...          Detener despacho de la cola
                                        Mantener orden intacto
```

---

## 3. Principios y Reglas No Negociables

### Regla 1: Aislamiento por Punto de Emisión (`ptoEmi`)
- Los secuenciales son estrictamente independientes por cada tupla:
  `(EmpresaId, CodigoEstablecimiento, PuntoEmision, TipoComprobante)`
- Ejemplo:
  - Caja 1 (`001-001`): Factura `000000101`
  - Caja 2 (`001-002`): Factura `000000045`
- Si la Caja 1 tiene retrasos o contingencias, **jamás bloquea ni afecta la numeración de la Caja 2**.

### Regla 2: Reserva Atómica de Secuencial (Cero Huecos)
- La reserva del número (`000000001` a `999999999`) ocurre dentro de la transacción de base de datos de creación de la factura mediante bloqueo pesimista (`FOR UPDATE`).
- Si la transacción de base de datos falla antes de confirmar la factura, la transacción hace `ROLLBACK` y el secuencial no se consume.
- Una vez confirmada y guardada la factura, el secuencial queda **adjudicado de forma perpetua**.

### Regla 3: Validez Legal Inmediata (Entrega Offline de 72 Horas)
- Conforme a la normativa ecuatoriana para comprobantes offline:
  - El emisor tiene hasta **72 horas** para transmitir el comprobante firmado al SRI.
  - La factura firmada localmente con XAdES-BES es válida legalmente para el cliente en el punto de venta.
  - El cliente recibe el RIDE con la clave de acceso para su consulta posterior.

### Regla 4: Despacho Estricto FIFO en el Outbox Worker
- La cola `sri_outbox` no procesa comprobantes de forma desordenada ni aleatoria.
- La consulta de reclamo de tareas siempre incluye:
  ```sql
  WHERE "Status" = 'Pending'
    AND "CompanyId" = @CompanyId
    AND "Establishment" = @Establecimiento
    AND "EmissionPoint" = @PuntoEmision
  ORDER BY "Sequential" ASC, "CreatedAt" ASC
  LIMIT 1
  ```
- Si la factura #1 está pendiente por reintento, el worker **no despacha la #2 ni la #8**. Espera a resolver la #1 o agotar la política de contingencia.

### Regla 5: Circuit Breaker ante Caídas del SRI
- Cuando el SRI devuelve errores de infraestructura (Timeouts de conexión, HTTP 500, 502, 503, 504, `EndpointNotFound`):
  1. El worker marca el incidente en el **Circuit Breaker**.
  2. Al alcanzar el umbral de fallos consecutivos (ej. 3 fallos), el circuito pasa a estado **OPEN**.
  3. El worker suspende temporalmente las peticiones al SRI para esa cola durante un intervalo de enfriamiento (ej. 60 a 120 segundos).
  4. Toda la cadena de facturas (#1, #2, #3, ..., #8) permanece encolada de forma ordenada y segura.
  5. Al restaurarse el SRI (estado **HALF-OPEN**), el worker envía primero la #1, luego la #2, y así sucesivamente hasta la #8, respetando la cronología perfecta.

---

## 4. Matriz de Tratamiento de Respuestas del SRI

| Código / Situación | Respuesta del SRI | Diagnóstico | Acción en Outbox y Secuencial |
| :--- | :--- | :--- | :--- |
| **AUTORIZADO** | Estado `AUTORIZADO` con fecha y número de autorización. | Éxito total. | Marcar outbox como `Completed`. Notificar cliente por correo. Proceder con el siguiente secuencial. |
| **TIMEOUT / RED** | Sin respuesta HTTP o error 5xx del WS del SRI. | SRI saturado o sin conexión. | Disparar Circuit Breaker. Reintentar con backoff exponencial. **NO saltar secuencial**. |
| **CÓDIGO 43** | `CLAVE ACCESO EN PROCESO` | El SRI ya recibió el XML y lo está validando internamente. | **PROHIBIDO reenviar a recepción**. Cambiar operación a `ConsultaAutorizacion` hasta obtener el estado final. |
| **CÓDIGO 70** | `CLAVE DE ACCESO REGISTRADA` | El comprobante ya fue recibido en una petición anterior que sufrió timeout de lectura. | Consultar inmediatamente el WS de autorización con la misma clave de acceso. |
| **DEVUELTA** | Error de esquema o datos (ej. RUC no existe en padrón SRI, error XSD). | Error irrecuperable de validación fiscal. | Marcar comprobante como `Devuelta`. El secuencial **NO se borra ni se reutiliza**. Se genera nota de corrección/anulación interna para reporte ATS. |

---

## 5. Prevención de Errores Comunes

1. **NUNCA reasignar un secuencial fallido a una nueva factura**:
   - Si la factura `001-001-000000005` fue devuelta por el SRI por un error en el RUC del comprador, **no uses el número 5 para otra venta distinta**. Ese número ya fue firmado y puede existir traza en logs fiscales.
   - El número 5 queda registrado como devuelto/anulado en el sistema para reporte en el ATS como comprobante anulado sin emisión válida.
2. **NUNCA ejecutar workers concurrentes sobre el mismo punto de emisión sin lock**:
   - En despliegues multi-nodo (Docker Swarm, Kubernetes), utiliza siempre `FOR UPDATE SKIP LOCKED` o locks distribuidos (Redis/Postgres Advisory Locks) para que un solo hilo procese la secuencia de un `ptoEmi` a la vez.
3. **Control de Zona Horaria en la Clave de Acceso**:
   - La clave de acceso del SRI exige los primeros 8 dígitos en formato `DDMMAAAA` correspondiente a la fecha de emisión en hora local de Ecuador (`America/Guayaquil` / UTC-5).
   - Generar la clave con fecha UTC puede provocar discrepancias con la fecha del comprobante cuando la venta se realiza después de las 19:00 ECT.
