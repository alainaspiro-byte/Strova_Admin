# 🏗️ Arquitectura de Despliegue - TuCuadre Admin Panel

## 📋 Opciones de despliegue en el mismo servidor

Tu web principal + Panel Admin pueden coexistir en el mismo servidor de varias formas:

---

## Opción 1: Subdominio separado (Recomendado)

```
Tu web principal:  https://tucuadre.com
Panel Admin:       https://admin.tucuadre.com
API:               https://api.tucuadre.com/api
```

### Ventajas ✅
- Cookies separadas (auth independiente)
- Fácil de gestionar como aplicación separada
- Mejor para seguridad (dominio diferente)
- Escalable: puedes mover admin a otro servidor después

### Desventajas ❌
- Requiere nuevo certificado SSL
- DNS separado

### Cómo implementar

#### Step 1: Crear el subdominio DNS
```
admin.tucuadre.com  →  192.168.1.100  (tu servidor)
```

#### Step 2: SSL con Let's Encrypt
```bash
certbot certonly --standalone -d admin.tucuadre.com
```

#### Step 3: Nginx - Configuración
```nginx
# /etc/nginx/sites-available/admin.tucuadre.com
server {
    listen 443 ssl http2;
    server_name admin.tucuadre.com;

    ssl_certificate /etc/letsencrypt/live/admin.tucuadre.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/admin.tucuadre.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}

# Redirigir HTTP → HTTPS
server {
    listen 80;
    server_name admin.tucuadre.com;
    return 301 https://$server_name$request_uri;
}
```

#### Step 4: Variables de entorno (`.env.local`)
```env
NEXT_PUBLIC_API_URL=https://api.tucuadre.com/api
NEXT_PUBLIC_APP_URL=https://admin.tucuadre.com
```

---

## Opción 2: Subpath en tu web principal

```
Tu web principal:  https://tucuadre.com
Panel Admin:       https://tucuadre.com/admin
API:               https://tucuadre.com/api
```

### Ventajas ✅
- Un único dominio
- Más simple de configurar
- Mismo certificado SSL
- Menos DNS modifications

### Desventajas ❌
- Cookies compartidas (requiere manejo especial de CORS)
- Más complejo de separar después

### Cómo implementar (Nginx + Next.js)

#### Step 1: Configurar Next.js para subpath
Edita `next.config.js`:
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: '/admin',
  assetPrefix: '/admin/',
}

module.exports = nextConfig
```

#### Step 2: Nginx - Ruta al /admin
```nginx
# /etc/nginx/sites-available/tucuadre.com
location /admin/ {
    proxy_pass http://localhost:3000/admin/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

#### Step 3: Variables de entorno
```env
NEXT_PUBLIC_API_URL=https://tucuadre.com/api
NEXT_PUBLIC_APP_URL=https://tucuadre.com/admin
```

#### Step 4: Actualizar links en componentes
Si tu panel está en `/admin`, los links internos ya funcionan automáticamente con `next/link`.

---

## Opción 3: Mismo servidor pero puerto diferente

```
Tu web principal:  http://tucuadre.com (puerto 80/443)
Panel Admin:       http://tucuadre.com:3000
API:               http://tucuadre.com/api (puerto 80/443)
```

### Ventajas ✅
- Muy rápido de testear
- No requiere reverse proxy complejo

### Desventajas ❌
- Puerto visible en URL (no es production-ready)
- Problemas de CORS/cookies
- No es seguro en producción

### Cómo implementar
```bash
npm run build
npm start  # Corre en puerto 3000
```

Accede como: `http://tu-servidor:3000`

**Solo usar para desarrollo/testing.**

---

## Opción 4: Contenedores Docker (Mejor práctica)

### Ventajas ✅
- Reproducible en cualquier servidor
- Fácil de escalar
- Fácil de actualizar
- Mejor isolación

### Docker Compose: App + API + Nginx

```yaml
# docker-compose.yml
version: '3.8'

services:
  admin-panel:
    build:
      context: .
      dockerfile: Dockerfile
    environment:
      NEXT_PUBLIC_API_URL: https://api.tucuadre.com/api
      NEXT_PUBLIC_APP_URL: https://admin.tucuadre.com
    ports:
      - "3000:3000"
    restart: unless-stopped

  nginx:
    image: nginx:latest
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - admin-panel

  # Tu API (si está en el mismo servidor)
  api:
    image: tu-api:latest
    ports:
      - "3001:3000"
    environment:
      DATABASE_URL: ...
```

Dockerfile:
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

Ejecutar:
```bash
docker-compose up -d
```

---

## 🔒 Consideraciones de seguridad

### CORS Setup (Backend)
Tu API debe permitir requests desde el dominio del admin:

```javascript
// Node.js/Express ejemplo
app.use(cors({
  origin: ['https://admin.tucuadre.com', 'https://tucuadre.com'],
  credentials: true,
}))
```

### JWT / Autenticación
- El token JWT se guarda en `localStorage`
- Se envía en header: `Authorization: Bearer <token>`
- Expira automáticamente tras X minutos (configura en tu auth service)

### Refresh Tokens
Para mayor seguridad, implementa refresh tokens:

```typescript
// lib/api.ts - agregar refreshToken logic
async refreshToken() {
  const refreshToken = localStorage.getItem('refreshToken')
  const response = await fetch(`${this.baseUrl}/auth/refresh`, {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  })
  // ...
}
```

---

## 📊 Comparativa de opciones

| Aspecto | Subdominio | Subpath | Puerto | Docker |
|---------|-----------|--------|--------|--------|
| Complejidad | Media | Media | Baja | Alta |
| Seguridad | Alta | Media | Baja | Alta |
| Production-ready | ✅ | ✅ | ❌ | ✅ |
| Escalabilidad | ✅ | ✅ | ❌ | ✅ |
| Tiempo setup | 20min | 10min | 5min | 30min |
| **Recomendado** | ⭐ | ✅ | Desarrollo | ✅ |

---

## 🚀 Checklist de deployment

- [ ] Variables de entorno configuradas (`.env.local`)
- [ ] API URL correcta y accesible
- [ ] CORS configurado en backend
- [ ] SSL/HTTPS activo
- [ ] Nginx / reverse proxy configurado
- [ ] Build de Next.js optimizado (`npm run build`)
- [ ] PM2 o Docker para mantener proceso vivo
- [ ] Logs centralizados (opcional aber útil)
- [ ] Backup de base de datos
- [ ] Monitoreo de uptime

---

## 🔧 Comandos útiles

```bash
# Build
npm run build

# Test producción localmente
npm run build && npm start

# Check puertos en uso
netstat -tlnp | grep :3000

# Restart nginx
sudo systemctl restart nginx

# Ver logs
sudo journalctl -u nginx -f
```

---

**¿Dudas?** Cada opción tiene un documento específico de configuración. Elige tu arquitectura preferida y avanzamos juntos.
