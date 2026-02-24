# Regla de Redirección 301 (Cloudflare / Hosting)

## Cloudflare Page Rule o Redirect Rule

**Si usas Cloudflare:**

1. Ve a **Rules** > **Redirect Rules**.
2. Crear nueva regla: "Redirección Celulares".
3. **Incoming requests matches**:
   - Field: `Hostname`
   - Operator: `equals`
   - Value: `celulares.arecofix.com.ar`
4. **URL Redirect**:
   - Type: `Static`
   - URL: `https://www.arecofix.com.ar/celular`
   - Status Code: `301`

**Si usas Firebase Hosting multisite:**
En `firebase.json`:

```json
{
  "hosting": [
    {
      "target": "celulares",
      "redirects": [
        { "source": "**", "destination": "https://www.arecofix.com.ar/celular", "type": 301 }
      ]
    }
  ]
}
```

_Nota: Requiere configurar el target en `.firebaserc`._
