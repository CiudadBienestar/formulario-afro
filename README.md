# Ficha de Caracterización Afrodescendiente

Formulario web estático preparado para publicarse en GitHub Pages y guardar respuestas en Google Sheets por medio de Google Apps Script.

## Desarrollo local

1. Copia `.env.example` a `.env`.
2. Reemplaza `VITE_GOOGLE_SCRIPT_URL` por la URL publicada de tu Web App de Apps Script.
3. Ejecuta:

```bash
npm install
npm run dev
```

## Google Sheets

La app envía los campos como `application/x-www-form-urlencoded` hacia `VITE_GOOGLE_SCRIPT_URL`. En Apps Script publica el proyecto como Web App con acceso para cualquier persona con el enlace y agrega `GOOGLE_SCRIPT_URL` como secret del repositorio en GitHub.

Ejemplo base de Apps Script:

```js
const SHEET_NAME = 'Respuestas';

function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const data = e.parameter;
  const headers = Object.keys(data);

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
  }

  sheet.appendRow(headers.map((key) => data[key]));

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

## GitHub Pages

El workflow `.github/workflows/deploy.yml` compila `dist` y lo publica en Pages cuando haces push a `main`.

Configura estos valores antes de publicar:

- Secret del repositorio: `GOOGLE_SCRIPT_URL`
- `VITE_BASE_PATH` en el workflow: cambia `/formulario-afro/` si tu repositorio tiene otro nombre.
