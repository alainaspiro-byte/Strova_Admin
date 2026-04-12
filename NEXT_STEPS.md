# 🚀 Próximos Pasos - TuCuadre Admin Panel

Tu panel ya está **completamente integrado con la API**. Aquí está lo que debes hacer ahora:

---

## 1️⃣ Test rápido en local (5 min)

```bash
cd c:\Users\Alain\Desktop\tucuadre-admin

# Instalar dependencias (si no lo hiciste)
npm install

# Correr en desarrollo
npm run dev

# Abre en el navegador
# http://localhost:3000/login
```

**Verifica:**
- ✅ Página de login carga
- ✅ Puedes ingresar credenciales de admin
- ✅ Dashboard carga (muestra estadísticas o error claro)
- ✅ Tabla de suscripciones intenta cargar datos

---

## 2️⃣ Validar endpoints API (10 min)

Si el login o datos no funcionan, verifica tu backend:

```bash
# Test 1: ¿El login funciona?
curl -X POST "https://unequivocally-shrinelike-zara.ngrok-free.dev/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"test123"}'

# Debe retornar: { "token": "JWT...", "user": { "id": "...", "email": "...", ... } }

# Test 2: ¿Puedo listar suscripciones?
curl -X GET "https://unequivocally-shrinelike-zara.ngrok-free.dev/api/subscription" \
  -H "Authorization: Bearer <tu_token>"

# Debe retornar datos o error explicativo, NO error 500
```

### Si hay errores:
- **401/403**: Revisar autenticación
- **404**: Endpoint no existe (revisar URL)
- **500**: Error en backend (revisar logs del servidor)
- **CORS error**: Backend no permite requests desde tu dominio

---

## 3️⃣ Elegir estrategia de despliegue (15 min)

Lee `DEPLOYMENT_OPTIONS.md` y elige UNA:

### Opción A: Subdominio (⭐ Recomendado)
```
admin.tu-dominio.com  ← El panel (este proyecto)
api.tu-dominio.com    ← Tu API actual
```
**Ventajas**: Seguro, escalable, fácil de mantener

**Ver sección**: [Opción 1 en DEPLOYMENT_OPTIONS.md](./DEPLOYMENT_OPTIONS.md#opción-1-subdominio-separado-recomendado)

### Opción B: Subpath
```
tu-dominio.com/admin  ← El panel
tu-dominio.com/api    ← Tu API
```
**Ventajas**: Un dominio, simple

**Ver sección**: [Opción 2 en DEPLOYMENT_OPTIONS.md](./DEPLOYMENT_OPTIONS.md#opción-2-subpath-en-tu-web-principal)

### Opción C: Docker
Si tu servidor soporta Docker.

**Ver sección**: [Opción 4 en DEPLOYMENT_OPTIONS.md](./DEPLOYMENT_OPTIONS.md#opción-4-contenedores-docker-mejor-práctica)

---

## 4️⃣ Configurar para tu ambiente (20 min)

### Paso 1: Actualizar `.env.local` para tu dominio

```bash
# Edita c:\Users\Alain\Desktop\tucuadre-admin\.env.local
NEXT_PUBLIC_API_URL=https://api.tu-dominio.com/api
NEXT_PUBLIC_APP_URL=https://admin.tu-dominio.com
```

(Usa HTTPS en producción, HTTP:3000 solo para testing)

### Paso 2: Verificar CORS en tu API backend

Tu backend DEBE permitir requests desde el panel:

```javascript
// Ejemplo Node.js/Express
app.use(cors({
  origin: 'https://admin.tu-dominio.com',
  credentials: true,
}))
```

### Paso 3: Compilar para producción

```bash
npm run build
npm start  # Corre el build optimizado
```

---

## 5️⃣ Completar checklist pre-lanzamiento (30 min)

**Abre y completa**: [PRE_LAUNCH_CHECKLIST.md](./PRE_LAUNCH_CHECKLIST.md)

Incluye:
- ✅ Todos los endpoints funcionan
- ✅ Autenticación funciona
- ✅ Datos cargan correctamente
- ✅ HTTPS activo
- ✅ CORS configurado
- ✅ No hay errores en console

---

## 6️⃣ Desplegar a producción

Una vez que el checklist esté completo:

### Si elegiste subdominio (Opción A):

1. **DNS**: Apunta `admin.tu-dominio.com` a tu servidor
2. **SSL**: Genera certificado Let's Encrypt
3. **Nginx**: Configura reverse proxy (ver DEPLOYMENT_OPTIONS.md)
4. **Deploy**:
   ```bash
   npm run build
   pm2 start npm --name "tucuadre-admin" -- start
   ```
5. **Verifica**: Accede a https://admin.tu-dominio.com/login

### Si elegiste subpath (Opción B):

1. **Actualiza** `next.config.js`:
   ```javascript
   const nextConfig = {
     basePath: '/admin',
     assetPrefix: '/admin/',
   }
   ```
2. **Nginx**: Ruta `/admin/*` proxy a Next.js (ver DEPLOYMENT_OPTIONS.md)
3. **Deploy**: Igual que arriba
4. **Verifica**: https://tu-dominio.com/admin/login

---

## ❓ Troubleshooting

### "CORS error"
→ Configura CORS en backend. Ver [INTEGRATION_GUIDE.md - Integración API](./INTEGRATION_GUIDE.md#integración-con-tu-web-principal)

### "Credenciales inválidas"
→ Verifica que `/api/auth/login` retorna estructura correcta

### "Datos no cargan"
1. Abre DevTools (F12)
2. Ve a Network tab
3. Busca requests a `/api/subscription`
4. Revisa qué retorna

### "Rutas redirigen a login"
→ Normal si no hay token. Verifica que puedas hacer login primero.

---

## 📞 Resumen de archivos clave

```
lib/api.ts           ← Cliente HTTP con todos los endpoints
context/AuthContext  ← Autenticación y gestión de token
app/login/page.tsx   ← Página de login
.env.local           ← Variables de entorno (URI de API)

INTEGRATION_GUIDE.md    ← TODO sobre cómo funciona
DEPLOYMENT_OPTIONS.md   ← Cómo deployar
PRE_LAUNCH_CHECKLIST    ← Antes de lanzar
```

---

## 🎯 Objetivo final

```
✅ Panel admin en tu DOMINIO
✅ Conectado a tu API
✅ Login independiente
✅ Datos reales funcionando
✅ HTTPS seguro
✅ Usuarios pueden gestionar suscripciones
```

---

## 🚀 SI ALGO FALLA

1. Revisa DevTools (F12) → Console → Errores
2. Revisa logs del backend
3. Verifica que endpoints retornan JSON válido
4. Verifica CORS en backend
5. Revisa que token JWT es válido

**El 80% de problemas son CORS o endpoint que no retorna el formato esperado.**

---

¡Listo! Estás a minutos de tener tu admin panel en producción. 🎉

Cualquier pregunta, revisa la documentación en INTEGRATION_GUIDE.md o DEPLOYMENT_OPTIONS.md.
