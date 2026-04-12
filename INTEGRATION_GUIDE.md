# 🎯 TuCuadre Suscripciones - Panel Admin

Panel standalone de administración de suscripciones para TuCuadre.

## 📦 Características

- ✅ Dashboard con estadísticas en tiempo real
- ✅ Gestión completa de suscripciones (crear, editar, renovar, cancelar)
- ✅ Administración de solicitudes pendientes
- ✅ Gestión de planes de precios
- ✅ Autenticación independiente con JWT
- ✅ UI moderna y responsiva (Tailwind CSS)
- ✅ TypeScript para máxima seguridad

## 🚀 Comenzar

### Requisitos
- Node.js 18+
- npm o yarn

### Instalación

1. **Clonar y dependencias**
```bash
npm install
```

2. **Configurar variables de entorno**
```bash
cp .env.local.example .env.local
```

Edita `.env.local`:
```env
NEXT_PUBLIC_API_URL=https://tu-api.com/api
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

3. **Ejecutar en desarrollo**
```bash
npm run dev
```

Abre [http://localhost:3000/login](http://localhost:3000/login)

## 📡 Integración API

### Autenticación
- **POST** `/api/auth/login` - Login independiente
  - Body: `{ email, password }`
  - Response: `{ token, user }`
  - Token se guarda en localStorage

### Endpoints utilizados
```
GET    /api/subscription                    → Estadísticas y lista
GET    /api/subscription/{id}               → Detalle
POST   /api/subscription/{id}/renew         → Renovar
PUT    /api/subscription/{id}/change-plan   → Cambiar plan

GET    /api/subscription/requests           → Solicitudes pendientes
POST   /api/subscription/requests/{id}/approve  → Aprobar
POST   /api/subscription/requests/{id}/reject   → Rechazar

GET    /api/plan                            → Listar planes
POST   /api/plan                            → Crear
PUT    /api/plan/{id}                       → Editar
DELETE /api/plan/{id}                       → Eliminar

GET    /api/organization                    → Listar clientes
GET    /api/organization/{id}               → Detalle cliente
```

## 🏗️ Estructura del código

```
app/
├── page.tsx                    # Dashboard
├── login/page.tsx             # Login
├── subscriptions/page.tsx     # Gestión suscripciones
├── payments/page.tsx          # Pagos
├── plans/page.tsx             # Planes
├── clients/page.tsx           # Clientes
├── settings/page.tsx          # Configuración
└── layout.tsx                 # Layout con AuthProvider

components/
├── SubscriptionsTable.tsx     # Tabla de suscripciones
├── StatsCards.tsx             # Tarjetas de estadísticas
├── RowActions.tsx             # Acciones por fila
├── ProtectedRoute.tsx         # Protección de rutas
└── ...

lib/
├── api.ts                     # Cliente API (±200 líneas)
├── types.ts                   # Types TypeScript
└── data.ts                    # Constantes (a eliminar pronto)

context/
└── AuthContext.tsx            # Autenticación + localStorage
```

## 🔐 Autenticación

- **Sistema independiente**: No requiere sesión de usuario conectado en la web principal
- **JWT**: Se almacena en `localStorage` como `token`
- **Protección**: Las rutas redirigen automáticamente a `/login` si no hay token
- **Logout**: Limpia token y localStorage

## 🎨 Customización

### Colores
Edita `tailwind.config.ts` para cambiar tema. El panel usa:
- Fondo: `#0a0f1c` (azul oscuro)
- Fondo secundario: `#111827`
- Acentos: Azul, Esmeralda, Ámbar, Rojo

### API URL
Cambia en `.env.local`:
```env
NEXT_PUBLIC_API_URL=https://tu-dominio.com/api
```

Para **producción en subdominio**:
```env
NEXT_PUBLIC_API_URL=https://api.tu-dominio.com/api
```

## 🛠️ Desarrollo

### Crear nueva página
```bash
mkdir app/nueva-seccion
touch app/nueva-seccion/page.tsx
```

```tsx
'use client'
import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/api'

export default function NuevaSeccionPage() {
  const [datos, setDatos] = useState([])
  
  useEffect(() => {
    apiClient.getTusDatos().then(setDatos)
  }, [])
  
  return <div>{/* Tu contenido */}</div>
}
```

### Agregar nuevo endpoint API
En `lib/api.ts`:
```typescript
async getTusDatos() {
  return this.request('/tu-endpoint')
}
```

## 📊 Build & Deploy

### Build para producción
```bash
npm run build
```

### Opciones de despliegue

#### Opción 1: Subdominio en mismo servidor Next.js
```bash
npm run build && npm start
```

#### Opción 2: Reverse proxy (nginx/Apache)
```nginx
# nginx.conf
location /admin/ {
  proxy_pass http://localhost:3000/;
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
}
```

Luego configura en `.env.local`:
```env
NEXT_PUBLIC_API_URL=https://tu-dominio.com/api
NEXT_PUBLIC_APP_URL=https://tu-dominio.com/admin
```

#### Opción 3: Desplegar en Vercel
```bash
npm run build
# Deploy a Vercel
vercel
```

## 🐛 Troubleshooting

### "Token inválido"
- Revisa que `/api/auth/login` retorne un `token` válido
- Verifica que el token sea compatible con JWT

### "CORS error"
- Configura CORS en tu backend:
```
Access-Control-Allow-Origin: https://tu-dominio.com
Access-Control-Allow-Credentials: true
```

### "Datos no se cargan"
- Abre DevTools (F12) → Network → Ve qué responde la API
- Verifica que `NEXT_PUBLIC_API_URL` sea correcta
- Revisa que el token esté siendo enviado en headers

## 📝 Próximas funcionalidades

- [ ] Soporte para 2FA
- [ ] Exportar datos a Excel/PDF
- [ ] Notificaciones push
- [ ] Auditoría de cambios
- [ ] Paginación avanzada
- [ ] Búsqueda con Elasticsearch

## 📄 Licencia

Privado - TuCuadre

---

**Necesitas ayuda?** Revisa los endpoints exactos en tu API o contacta al equipo backend.
