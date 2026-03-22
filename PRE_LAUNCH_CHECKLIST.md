# 🚀 Checklist de Integración

Completa este checklist antes de desplegar a producción.

## ✅ Backend / API (Strova)

- [ ] **Endpoints implementados** según el mapeo:
  - [ ] `POST /auth/login` - Retorna `{ token, user }`
  - [ ] `GET /api/subscription` - Estadísticas + lista paginada
  - [ ] `GET /api/subscription/{id}` - Detalle individual
  - [ ] `POST /api/subscription/{id}/renew` - Renovación
  - [ ] `PUT /api/subscription/{id}/change-plan` - Cambio de plan
  - [ ] `GET /api/subscription/requests` - Solicitudes pendientes
  - [ ] `POST /api/subscription/requests/{id}/approve` - Aprobar
  - [ ] `POST /api/subscription/requests/{id}/reject` - Rechazar
  - [ ] `GET /api/plan`, `POST`, `PUT`, `DELETE /api/plan*` - CRUD planes
  - [ ] `GET /api/organization*` - Listar/detalles clientes

- [ ] **CORS configurado correctamente**
  ```javascript
  Access-Control-Allow-Origin: tu-dominio.com
  Access-Control-Allow-Credentials: true
  Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
  ```

- [ ] **JWT tokens válidos** (verificables con: `jwt.verify()`)

- [ ] **Rate limiting** en `/auth/login` (prevenir fuerza bruta)

- [ ] **Validación de input** en todos los endpoints

- [ ] **Errores formateados** en JSON:
  ```json
  { "message": "descriptivo", "status": 400 }
  ```

## 🔐 Autenticación (Panel)

- [ ] `/app/login/page.tsx` carga correctamente
- [ ] Form POST a `/api/auth/login` funciona
- [ ] Token se guarda en `localStorage['token']`
- [ ] `useAuth()` hook retorna user data
- [ ] Logout limpia localStorage
- [ ] Rutas protegidas redirigen a login sin token
- [ ] `Authorization: Bearer <token>` header se envía en requests

## 🎨 Frontend (Panel)

- [ ] Variables de entorno en `.env.local`:
  ```env
  NEXT_PUBLIC_API_URL=https://tu-api.com/api
  NEXT_PUBLIC_APP_URL=https://tu-dominio.com/admin
  ```

- [ ] Compilación sin errores: `npm run build`

- [ ] Dashboard `/` carga datos reales de API
- [ ] Tabla de suscripciones `/subscriptions` muestra datos
- [ ] Filtros y búsqueda funcionan
- [ ] Acciones (editar estado, renovar) llaman API

- [ ] Todas las páginas cargan:
  - [ ] `/login` - Login
  - [ ] `/` - Dashboard
  - [ ] `/subscriptions` - Suscripciones
  - [ ] `/clients` - Clientes
  - [ ] `/payments` - Pagos
  - [ ] `/plans` - Planes
  - [ ] `/settings` - Configuración

## 🌐 Despliegue

- [ ] Elige opción de despliegue (subdominio recomendado)

- [ ] **Si es subdominio**:
  - [ ] DNS apunta a tu servidor
  - [ ] SSL/HTTPS certificado
  - [ ] Nginx reverse proxy configurado
  - [ ] PM2 o supervisor mantiene proceso Next.js vivo

- [ ] **Si es subpath**:
  - [ ] `basePath: '/admin'` en `next.config.js`
  - [ ] Nginx ruta `/admin/*` proxy a Next.js
  - [ ] Links internos funcionan

- [ ] **Proceso está corriendo**:
  ```bash
  npm run build
  npm start  # o: pm2 start npm --name "strova-admin" -- start
  ```

- [ ] **Acceso test**:
  - [ ] Puedes ir a `https://admin.tu-dominio.com/login`
  - [ ] Inicia sesión con credenciales test
  - [ ] Dashboard carga datos reales
  - [ ] Puedes navegar todas las secciones

## 🔍 Testing

- [ ] **Login**:
  - [ ] ✅ Credenciales correctas → Acceso
  - [ ] ❌ Credenciales incorrectas → Error (no crash)
  - [ ] Logout funciona y limpia datos

- [ ] **Datos**:
  - [ ] Estadísticas del dashboard coinciden con backend
  - [ ] Tabla paginada carga correctamente
  - [ ] Filtros reducen resultados esperados
  - [ ] Búsqueda funciona

- [ ] **Acciones**:
  - [ ] Cambiar status de suscripción → actualiza DB
  - [ ] Renovar → extiende fecha expiración
  - [ ] Cambiar plan → actualiza plan

- [ ] **Errores**:
  - [ ] API no disponible → error UI legible (no crash)
  - [ ] Token expirado → redirige a login
  - [ ] Datos inválidos → mensaje de error

## 📊 Performance

- [ ] Mayor de 20 suscripciones no ralentiza tabla
- [ ] Filtros responden rápidamente
- [ ] Carga inicial < 3 segundos
- [ ] Bundle size (Next.js):
  ```bash
  npm run build  # Chequea output de tamaño
  ```

## 🔒 Seguridad

- [ ] Tokens no se guardan en cookies accesibles desde JS
- [ ] API valida permisos (no confiar en frontend)
- [ ] Input sanitizado (especialmente notas/descripciones)
- [ ] HTTPS obligatorio en producción
- [ ] Headers de seguridad:
  ```
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  X-XSS-Protection: 1; mode=block
  ```

## 📝 Documentación

- [ ] `.env.local.example` actualizado
- [ ] `INTEGRATION_GUIDE.md` leído y entendido
- [ ] `DEPLOYMENT_OPTIONS.md` documentado para tu caso
- [ ] Equipo sabe dónde están archivos críticos:
  - [ ] API client → `lib/api.ts`
  - [ ] Auth → `context/AuthContext.tsx`
  - [ ] Variables env → `.env.local`

## 🆘 Troubleshooting Pre-Launch

Si algo no funciona:

```bash
# 1. Verificar variables de env
cat .env.local

# 2. Verificar conexión a API
curl https://unequivocally-shrinelike-zara.ngrok-free.dev/api/subscription

# 3. Verificar build
npm run build
npm run start

# 4. Chequear logs (si estás en Linux/Docker)
sudo journalctl -u nginx -f
docker logs admin-panel

# 5. DevTools del navegador:
# - Console → errores JavaScript
# - Network → responses de API
# - Application → localStorage/tokens
```

## ✨ Optimizaciones Post-Launch

Una vez todo funcione:

- [ ] Agregar métrica de uso (Google Analytics, Mixpanel)
- [ ] Configurar alertas de downtime
- [ ] Backup automático de datos
- [ ] Logs centralizados (Sentry, LogRocket)
- [ ] CDN para assets estáticos (Cloudflare)
- [ ] Caché de respuestas API (Redis)

---

**Antes de marcar como ✅ listo:**
- El panel carga datos reales de tu API
- Login funciona con credenciales del backend
- Todas las acciones (editar, renovar, etc) actualizan la BD
- No hay errores en DevTools
- Performance es aceptable
- Está en HTTPS en producción

**¿Todo verde? 🎉 ¡Lanzamiento exitoso!**
