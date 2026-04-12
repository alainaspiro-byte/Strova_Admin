# TuCuadre Admin — Panel de Suscripciones 🚀

Panel standalone de administración de suscripciones para TuCuadre.

**Completamente integrado con tu API REST** ✅

---

## ⚡ Quick Start

### 1. Requisitos
- Node.js 18+
- npm

### 2. Instalar
```bash
npm install
```

### 3. Configurar variables de entorno
```bash
cp .env.local.example .env.local
```

Edita `.env.local`:
```env
NEXT_PUBLIC_API_URL=https://unequivocally-shrinelike-zara.ngrok-free.dev/api
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Correr en desarrollo
```bash
npm run dev
open http://localhost:3000/login
```

Usa credenciales de admin para iniciar sesión.

---

## 📚 Documentación principal

- **[INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md)** - Guía completa de integración API
- **[DEPLOYMENT_OPTIONS.md](./DEPLOYMENT_OPTIONS.md)** - Opciones de hosting (subdominio, subpath, Docker)
- **[PRE_LAUNCH_CHECKLIST.md](./PRE_LAUNCH_CHECKLIST.md)** - Checklist antes de producción

---

## 🏗️ Estructura del proyecto

```
tucuadre-admin/
├── app/
│   ├── layout.tsx              ← layout raíz con AuthProvider
│   ├── page.tsx                ← dashboard con datos reales
│   ├── login/page.tsx          ← login (NUEVO)
│   ├── subscriptions/page.tsx  ← suscripciones con API
│   ├── clients/page.tsx        ← clientes
│   ├── payments/page.tsx       ← pagos
│   ├── plans/page.tsx          ← planes
│   └── settings/page.tsx       ← configuración
│
├── components/
│   ├── Sidebar.tsx             ← navegación lateral
│   ├── StatsCards.tsx          ← tarjetas de métricas
│   ├── Badges.tsx              ← componentes de estilo
│   ├── RowActions.tsx          ← acciones por fila
│   ├── ProtectedRoute.tsx      ← protección de rutas (NUEVO)
│   ├── SubscriptionsTable.tsx  ← tabla con filtros
│   └── ...
│
├── context/
│   └── AuthContext.tsx         ← autenticación JWT (NUEVO)
│
├── lib/
│   ├── api.ts                  ← cliente API REST (NUEVO)
│   ├── types.ts                ← tipos TypeScript
│   └── data.ts
│
├── .env.local                  ← variables de entorno (crear)
├── .env.local.example          ← template
└── INTEGRATION_GUIDE.md        ← TODO sobre integración
```

---

## 🔐 Autenticación

Este panel usa **login independiente**:

- **Ruta de login**: `/login`
- **Credenciales**: Email y contraseña
- **Token**: Se guarda en `localStorage['token']`
- **Protección**: Rutas automáticamente protegidas
- **Logout**: Limpia token y localStorage

### Backend requerido
Tu API debe exponer:
```
POST /api/auth/login
Body: { email, password }
Response: { token: "JWT_TOKEN", user: { id, email, name, role } }
```

---

## 🌐 Despliegue

### Opción 1: Subdominio (Recomendado ⭐)
```
Admin Panel:   https://admin.tu-dominio.com
Tu API:        https://api.tu-dominio.com/api
```
→ Documentación: Ver [DEPLOYMENT_OPTIONS.md](./DEPLOYMENT_OPTIONS.md#opción-1-subdominio-separado-recomendado)

### Opción 2: Subpath
```
Admin Panel:   https://tu-dominio.com/admin
Tu API:        https://tu-dominio.com/api
```
→ Requiere `basePath: '/admin'` en `next.config.js`

### Opción 3: Docker
```bash
docker-compose up -d
```
→ Ver [DEPLOYMENT_OPTIONS.md](./DEPLOYMENT_OPTIONS.md#opción-4-contenedores-docker-mejor-práctica)

---

## 🚀 En desarrollo

### Agregar nueva página
```bash
mkdir app/nueva-seccion
touch app/nueva-seccion/page.tsx
```

```tsx
'use client'
import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/api'

export default function NuevaPage() {
  const [data, setData] = useState([])
  
  useEffect(() => {
    apiClient.getTusDatos().then(setData)
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

Úsalo en componentes:
```typescript
const datos = await apiClient.getTusDatos()
```

---

## 📦 Build & Deploy

```bash
# Compilar para producción
npm run build

# Ejecutar build de producción (local)
npm start

# Ejecutar con PM2 (recomendado)
pm2 start npm --name "tucuadre-admin" -- start
pm2 save
```

---

## 📋 Scripts disponibles

```bash
npm run dev      # Desarrollo (http://localhost:3000)
npm run build    # Compilación optimizada
npm start        # Última compilación
```

---

## 🔍 Verificación previo a lanzamiento

Antes de ir a producción, completa el [PRE_LAUNCH_CHECKLIST.md](./PRE_LAUNCH_CHECKLIST.md):

✅ Backend endpoints implementados  
✅ CORS configurado  
✅ JWT válido  
✅ Variables de entorno correctas  
✅ Login funciona  
✅ API carga datos reales  
✅ Todas las páginas accesibles  
✅ HTTPS activo  

---

## 🐛 Troubleshooting

### "Credenciales inválidas"
→ Verifica que `/api/auth/login` retorna `{ token, user }`

### "CORS error"
→ Configura CORS en backend. Ver [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md#integración-api)

### "Datos no cargan"
→ Abre DevTools (F12) → Network → Verifica respuesta de API

### "Token expirado"
→ Implementa refresh tokens en `lib/api.ts`

---

## 🏢 Integración con tu web principal

Este es un panel **completamente independiente**:

- ✅ Login separado (no requiere sesión de usuario)
- ✅ Base de datos compartida (misma API)
- ✅ Dominio separado (subdominio o subpath)
- ✅ Puede escalarse a otro servidor

Es muy seguro tener admin en un lugar separado de la web pública.

---

## 📞 Soporte

- **Errores de integración API**: Ver [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md)
- **Preguntas de despliegue**: Ver [DEPLOYMENT_OPTIONS.md](./DEPLOYMENT_OPTIONS.md)
- **Checklist antes de lanzar**: [PRE_LAUNCH_CHECKLIST.md](./PRE_LAUNCH_CHECKLIST.md)

---

Developed with ❤️ for TuCuadre
