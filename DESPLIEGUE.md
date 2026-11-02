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

## 5. La IA (n8n) en el servidor público

El servidor de Render **no puede ver el n8n de tu PC** (`localhost:5678` es la propia máquina de Render). Tener n8n abierto en tu PC no basta: hay que darle una dirección pública.

**Opción A · Túnel desde tu PC (gratis; el PC y n8n deben seguir encendidos)**

1. Una sola vez, en PowerShell: `winget install --id Cloudflare.cloudflared` (cierra y vuelve a abrir PowerShell).
2. Abre n8n (`iniciar-n8n.bat`) y verifica que el workflow esté publicado.
3. En otra ventana de PowerShell: `cloudflared tunnel --url http://localhost:5678`. Copia la dirección `https://…trycloudflare.com` que aparece y **deja esa ventana abierta**.
4. En Render → servicio → Environment, define `IDI_N8N_URL=https://…trycloudflare.com/webhook/idi-clasificar` (el asistente se deduce solo). Cada vez que reinicies el túnel la dirección cambia y hay que actualizarla.

**Opción B · n8n Cloud** (prueba gratis de 14 días; luego de pago): importa `n8n/workflow-idi-ia.json`, crea la credencial de Anthropic, publica y usa la *Production URL* del webhook en `IDI_N8N_URL`.

**Protege el webhook (recomendado en ambas):** en n8n abre los nodos *Webhook clasificar* y *Webhook asistente* → Authentication: **Header Auth** → credencial con Name `x-idi-token` y un valor secreto → Publish. Pon ese mismo valor en la variable `IDI_N8N_TOKEN` de Render y, para la app local, en **Configuración → Token de seguridad**.

La clave de API de Anthropic nunca va en la app: vive en n8n.

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
