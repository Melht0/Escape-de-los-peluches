# El Escape de los Peluches — edición 3D

Videojuego web en Three.js con cámara de perspectiva oblicua (no cenital), exploración por habitaciones, personajes GLB, llaves, interacción con el conejo, persecución del oso y pantallas de menú/pausa/derrota/victoria.

## Estructura

- `index.html`
- `script.js`
- `styles.css`
- `models/` — los seis modelos GLB originales
- `textures/logo.png`
- `sounds/` — carpeta reservada para archivos de audio. Si se agregan pistas propias, deben conectarse en `script.js`. Actualmente hay ambiente y efectos sintetizados por Web Audio para que el juego no dependa de archivos externos.

## Ejecutar localmente

No abras `index.html` con doble clic porque el navegador puede bloquear la carga de modelos. Abre la carpeta con VS Code y usa **Live Server**, o ejecuta desde la carpeta del proyecto:

```bash
python -m http.server 8000
```

Después visita `http://localhost:8000`.

## Publicar en GitHub Pages

1. Sube el contenido completo de esta carpeta a la raíz del repositorio (incluyendo `models/`, `textures/` y `sounds/`).
2. En GitHub abre **Settings → Pages**.
3. En **Build and deployment**, selecciona **Deploy from a branch**, branch `main`, folder `/ (root)` y guarda.
4. Espera el despliegue y abre la URL que muestra GitHub Pages.

Las rutas de recursos son relativas, por lo que funcionan en un repositorio de GitHub Pages.

## Controles

- Flechas: caminar
- E: interactuar
- ESC: pausa

## Nota de desarrollo

Los escenarios conservan los GLB originales como parte de la escena y añaden una estructura arquitectónica 3D de habitación para que el recorrido, las paredes, el mobiliario y las interacciones sean legibles desde la cámara oblicua. La colisión es por volúmenes rectangulares aproximados, no física de precisión. El sonido ambiental y los efectos se sintetizan en el navegador para evitar dependencias de audio ausentes.
