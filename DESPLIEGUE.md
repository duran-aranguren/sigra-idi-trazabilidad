# Publicar SIGRA I+D+i en Internet (con usuarios y contraseña)

La app tiene dos formas de uso:

| Modo | Cómo se activa | Acceso |
|---|---|---|
| Local (por defecto) | `iniciar.bat` | Solo tu PC |
| Red local | `iniciar-red.bat` | Celular en el mismo Wi-Fi, con PIN |
| **Público (hosting)** | `IDI_PUBLICO=1` o el `Dockerfile` | **Usuario y contraseña**, roles admin / editor / lector |

## 1. Probarlo en tu PC antes de publicar

Windows (PowerShell), dentro de la carpeta de la app:

```powershell
$env:IDI_PUBLICO="1"; $env:IDI_ADMIN_PASS="MiClaveLarga2026"; node server.js
```

Abre http://localhost:3000, entra con `admin` y esa contraseña. En **Configuración → Usuarios y roles** creas más usuarios.

## 2. Subir el código a GitHub

1. Crea un repositorio (privado o público) y sube **toda la carpeta**, excepto `data/` y `uploads/`.
2. No subas contraseñas ni claves: se definen como variables de entorno en el hosting.

## 3. Render (recomendado, tiene plan gratis)

Opción manual (la más clara):

1. En https://render.com crea tu cuenta con GitHub → **New → Web Service** → elige tu repositorio.
2. **Language:** Node · **Branch:** main · **Build Command:** `npm install` · **Start Command:** `npm start` · **Instance Type:** Free.
3. En **Environment Variables** agrega: `NODE_VERSION=24`, `IDI_PUBLICO=1`, `IDI_HTTPS=1`, `IDI_ADMIN_USER=admin`, `IDI_ADMIN_PASS=<tu clave de 10+ caracteres>`, `IDI_SECRET=<32+ caracteres al azar>` y, opcional, `IDI_USUARIOS=docente:lector:ClaveDocente2026;ana:editor:ClaveAna2026`.
4. **Advanced → Health Check Path:** `/healthz`. Pulsa **Deploy Web Service**.
5. Cuando el log diga «Modo PÚBLICO…» y el estado sea *Live*, la URL `https://<nombre>.onrender.com` es tu URL pública.

Opción Blueprint: **New → Blueprint** con este repositorio (usa `render.yaml`, que trae todo lo anterior).

## 4. Railway / Fly.io (alternativas)

Ambos detectan el `Dockerfile`. Define las variables `IDI_ADMIN_PASS` e `IDI_SECRET`, monta un volumen en `/data` y listo. Railway asigna el puerto con `PORT`; la app ya lo respeta.

## 5. La IA en el servidor público

n8n que corre en tu PC **no es visible desde Internet**. Tienes tres opciones:

1. **Dejar el análisis local de respaldo** (por defecto: la app clasifica con reglas por palabras clave). Sirve para la demo y no cuesta nada.
2. **n8n Cloud** (prueba gratuita): importa los dos workflows de `n8n/`, crea la credencial Header Auth con tu clave de Anthropic, publica y pega las URLs de producción en `IDI_N8N_URL` e `IDI_N8N_ASISTENTE_URL` (o en Configuración).
3. **n8n en tu PC expuesto con un túnel** (por ejemplo Cloudflare Tunnel) solo durante la presentación. No lo dejes abierto permanentemente.

La clave de API nunca va en la app: vive en n8n.

## 6. Seguridad incluida

- Contraseñas con scrypt y sal individual; sesiones firmadas (HMAC) de 7 días con cookie `HttpOnly`, `Secure` y `SameSite`.
- Bloqueo de 5 minutos tras 5 intentos fallidos por IP.
- Roles: lector (solo consulta), editor (crea y edita), admin (usuarios, configuración, datos).
- Cabeceras CSP, anti-iframe, HSTS y cabecera anti-CSRF `x-idi` en toda modificación.
- `/healthz` es el único endpoint sin sesión (no expone datos).

## 7. Lista de verificación antes de entregar

- [ ] La URL abre en celular y en PC.
- [ ] Probaste login correcto, incorrecto y cierre de sesión.
- [ ] El usuario lector no puede modificar nada.
- [ ] No hay claves en el repositorio (`git grep -i "sk-ant"` sin resultados).
- [ ] Pusiste la URL en el README, la presentación y la ficha.
