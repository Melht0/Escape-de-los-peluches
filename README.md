# El Escape de los Peluches

Videojuego 3D web con HTML, CSS, JavaScript y Three.js. Usa los modelos GLB originales suministrados.

## Ejecutar localmente
No abras index.html con doble clic: usa un servidor local.

**Python:** desde esta carpeta ejecuta `python -m http.server 8000` y abre http://localhost:8000.

**VS Code:** abre la carpeta y ejecuta Live Server sobre `index.html`.

Se necesita conexión a internet para importar Three.js desde jsDelivr.

## Publicar en GitHub Pages
Sube el contenido completo de esta carpeta a la raíz del repositorio y activa Settings → Pages → Deploy from a branch → main → /(root).

## Controles
- Flechas: mover la vaca.
- E: interactuar.
- ESC: pausar.

## Recursos
- `models/`: vaca, conejo, oso y tres escenarios originales.
- `textures/logo.png`: logotipo proporcionado.
- `sounds/`: reservado para archivos de audio propios. En esta versión los efectos básicos se sintetizan con Web Audio API.

## Nota sobre colisiones y posiciones
Las colisiones se generan automáticamente a partir de cajas envolventes de las mallas GLB con volumen suficiente. Algunos modelos exportados pueden contener una sola malla combinada o pivotes no centrados; en esos casos será necesario ajustar colliders y puntos de interacción en `script.js` tras probar cada escenario. Las posiciones fallback de las llaves son orientativas si los nombres internos de los objetos no permiten localizar cama, refrigerador o taza.


### Modelos GLB actualizados

La carpeta `models/` utiliza los modelos más recientes proporcionados para el conejo (`Conejo_Complice2(1).glb`) y el oso (`Oso2(1).glb`), conservando los nombres de archivo esperados por `script.js` (`Conejo_Complice.glb` y `Oso.glb`). Los modelos de vaca y escenarios se mantienen sin cambios.
