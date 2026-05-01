# Tesorería — Contrato de API

Documento de referencia para el equipo de backend. El frontend (panel TuCuadre Admin) ya está implementado contra este contrato y mientras los endpoints no existan corre con un mock en memoria activado por la variable `NEXT_PUBLIC_TREASURY_MOCK=true`.

Cuando los endpoints reales estén desplegados, basta con poner `NEXT_PUBLIC_TREASURY_MOCK=false` (o eliminar la variable) en Vercel y redeploy. El frontend pasará a consumir el backend automáticamente, sin cambios de código.

---

## Generales

- **Base URL:** `${NEXT_PUBLIC_API_URL}/treasury`
- **Auth:** mismo flujo Bearer JWT que el resto del API. Solo SuperAdmin debe poder acceder. El frontend ya envía el token en `Authorization: Bearer <token>`.
- **Content-Type:** `application/json` en request y response.
- **Charset:** UTF-8.
- **Moneda:** todas las cantidades en **CUP**, **número entero** (sin decimales). Ejemplo: `2500`, `25000`.
- **Fechas civiles** (sin zona horaria): formato `YYYY-MM-DD`.
- **Timestamps**: ISO 8601 con zona, ej. `2026-05-01T18:30:00Z`.

## Códigos de error esperados

- `200 OK` / `201 Created` / `204 No Content` para éxito.
- `400 Bad Request` — payload inválido. Body: `{ "message": "..." }`.
- `401 Unauthorized` — sin token o token expirado.
- `403 Forbidden` — rol insuficiente.
- `404 Not Found` — recurso no existe.
- `500 Internal Server Error` — error del servidor.

El frontend extrae `message` del body de error para mostrarlo al usuario.

---

## Schemas

### TreasuryIncome

Los ingresos de Tesorería son **siempre cobros de suscripciones**, por eso no hay `description` libre y los datos clave son organización + plan + ciclo.

```ts
{
  id: string                         // identificador único
  date: string                       // YYYY-MM-DD (fecha del cobro)
  amount: number                     // CUP, entero (p.ej. 2500)
  organization: string               // texto libre (no FK al catálogo de orgs)
  planId: string | null              // ID del plan en el catálogo (null si el plan ya no existe)
  planName: string                   // snapshot del nombre del plan al momento del cobro
  cycle: 'monthly' | 'annual'        // ciclo de facturación
  paymentReference: string | null    // ID transferencia, etc. (opcional)
  notes: string | null               // notas internas (opcional)
  createdAt: string                  // ISO 8601 con zona
}
```

> Por qué `planId` es nullable y `planName` siempre presente: si un plan se elimina del catálogo, los registros históricos siguen siendo legibles gracias al snapshot del nombre.

### TreasuryExpense

```ts
{
  id: string
  date: string                       // YYYY-MM-DD
  amount: number                     // CUP, entero
  description: string                // texto libre (ej. "Hosting Vercel Pro")
  category: string                   // texto libre (sugeridos: Infraestructura, Marketing, Sueldos, Software, Servicios, Impuestos, Otros)
  notes: string | null
  createdAt: string
}
```

### TreasurySummary

```ts
{
  monthIncome: number    // suma de ingresos del mes consultado (CUP entero)
  monthExpense: number   // suma de egresos del mes consultado (CUP entero)
  monthNet: number       // monthIncome - monthExpense
  totalNet: number       // (sum ingresos hasta fin del mes) - (sum egresos hasta fin del mes)
}
```

### Inputs de creación / actualización

```ts
type CreateIncomeInput  = Omit<TreasuryIncome,  'id' | 'createdAt'>
type CreateExpenseInput = Omit<TreasuryExpense, 'id' | 'createdAt'>
type UpdateIncomeInput  = CreateIncomeInput
type UpdateExpenseInput = CreateExpenseInput
```

---

## Endpoints

### 1. Listar ingresos del periodo

```
GET /treasury/incomes?from=YYYY-MM-DD&to=YYYY-MM-DD
```

- `from` y `to` son inclusivos.
- Respuesta `200`:
  ```json
  {
    "items": [TreasuryIncome, ...],
    "total": 42
  }
  ```
- Orden recomendado: `date` desc, luego `createdAt` desc (más recientes arriba).

### 2. Crear ingreso

```
POST /treasury/incomes
Content-Type: application/json

{ ...CreateIncomeInput }
```

- Respuesta `201`: el `TreasuryIncome` creado (con `id` y `createdAt` generados por backend).
- Validaciones requeridas:
  - `date`: formato `YYYY-MM-DD`.
  - `amount`: entero > 0 (en CUP).
  - `organization`, `planName`: strings no vacíos (después de trim).
  - `planId`: opcional pero recomendado (string, ID del plan).
  - `cycle`: enum estricto `'monthly' | 'annual'`.

### 3. Editar ingreso

> **Nota para backend:** el frontend está preparado para usar `PUT /treasury/incomes/{id}` con el body completo. Si prefieres `PATCH` con campos parciales, indícalo y se adapta el frontend.

```
PUT /treasury/incomes/{id}
Content-Type: application/json

{ ...UpdateIncomeInput }
```

- Respuesta `200`: el `TreasuryIncome` actualizado.
- `404` si no existe.

### 4. Eliminar ingreso

```
DELETE /treasury/incomes/{id}
```

- Respuesta `204` sin body.
- `404` si el id no existe.

### 5. Listar egresos del periodo

```
GET /treasury/expenses?from=YYYY-MM-DD&to=YYYY-MM-DD
```

Respuesta `200`:
```json
{
  "items": [TreasuryExpense, ...],
  "total": 17
}
```

### 6. Crear egreso

```
POST /treasury/expenses
Content-Type: application/json

{ ...CreateExpenseInput }
```

- Respuesta `201`: `TreasuryExpense` creado.
- Validaciones: `date`, `amount` entero > 0, `description` y `category` no vacíos.

### 7. Editar egreso

```
PUT /treasury/expenses/{id}
Content-Type: application/json

{ ...UpdateExpenseInput }
```

Respuesta `200`: `TreasuryExpense` actualizado.

### 8. Eliminar egreso

```
DELETE /treasury/expenses/{id}
```

Respuesta `204`.

### 9. Resumen del periodo

```
GET /treasury/summary?year=YYYY&month=MM
```

- `month` con 2 dígitos (`01`..`12`).
- Respuesta `200`: `TreasurySummary`.
- `totalNet` debe acumular **todos los registros desde siempre hasta el último día del mes consultado** (no del mes solo).

---

## Notas de implementación recomendadas

1. **Tabla de auditoría opcional** (no la consume el frontend hoy, pero conviene): registrar quién creó/editó/eliminó cada movimiento (`createdBy`, `updatedAt`, `deletedAt`, `deletedBy`).
2. **Soft delete vs hard delete:** el frontend asume hard delete (no muestra registros eliminados). Si optan por soft delete, simplemente filtrar en los `GET`.
3. **Concurrencia/idempotencia:** los `POST` no necesitan idempotency keys por ahora (volumen bajo).
4. **Paginación:** no se solicita en esta versión. Si en el futuro un mes supera ~500 registros, se puede agregar `?page=&perPage=`.
5. **Permisos:** mismo gating que el resto del panel (rol SuperAdmin). El middleware del frontend ya bloquea la ruta `/treasury` para no-SuperAdmin, pero el backend debe re-validar.
6. **Verbo de update flexible:** si prefieres `PATCH` con body parcial en vez de `PUT` con body completo, dilo y se cambia. El frontend hoy envía el objeto completo en cada edición, así que ambos verbos funcionan sin tocar el cliente.

---

## Cómo probar contra el frontend

1. Levantar el backend con los endpoints implementados.
2. En el archivo `.env.local` del frontend, poner `NEXT_PUBLIC_TREASURY_MOCK=false`.
3. Reiniciar `npm run dev`.
4. Ir a `/treasury` y probar: cargar resumen, listar, crear, editar, eliminar, exportar CSV.

Si algo no coincide con este contrato, el frontend mostrará el `message` del error. Reportar al equipo de frontend cualquier desviación deseada.
