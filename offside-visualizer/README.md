# ⚽ Fuera de Lugar — Simulador VAR

App web interactiva para **entender el fuera de lugar (offside)** con una demostración
gráfica estilo VAR. Pensada para explicarle a cualquiera (incluso a un amigo culé 😉)
cómo funciona la regla.

> 🟢 Funciona en el **celular** (táctil) y en el computador.

## ¿Qué hace?

- 🟦 Mueve **defensas**, 🔴 **atacantes** y ⚫ el **balón** arrastrándolos con el dedo.
- 📏 La **línea de fuera de lugar** se recalcula sola sobre el **penúltimo defensor**.
- 🚦 Cada atacante se pinta según su situación:
  - **Rojo** → en posición de fuera de lugar
  - **Amarillo** → en línea (¡la igualdad habilita!)
  - **Verde** → habilitado
- ▶️ Botón **"Pasar el balón"**: anima el pase y da el **veredicto**.
- 🎬 Escenarios de ejemplo: *Offside*, *Habilitado*, *En línea*.

Toca un atacante para elegirlo como **receptor** del pase.

## La regla, en corto

Un jugador está en **posición de fuera de lugar** si, en el momento del pase de un
compañero, está más cerca del arco rival que **el balón** y que el **penúltimo defensor**.
La **igualdad habilita**, y solo se sanciona si **participa** de la jugada.

## Desarrollo local

Es HTML/CSS/JS puro, sin dependencias. Para verlo en local:

```bash
cd public
python3 -m http.server 8080
# abre http://localhost:8080
```

## Despliegue

### GitHub Pages (automático)
Cada push a `main` despliega solo vía GitHub Actions (`.github/workflows/deploy.yml`).
El link queda en **Settings → Pages** o en el resumen del workflow.

### Firebase Hosting (opcional)
El proyecto ya viene listo (`firebase.json` apunta a `public/`):

```bash
npm install -g firebase-tools
firebase login
firebase init hosting   # elegir un proyecto, public = "public"
firebase deploy
```

---
Hecho con ⚽ y ☕.
