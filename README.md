# ASPC Selector Tool

Static web app untuk upload gambar product, apply overlay stored dalam app, preview outcome 1080 x 1080 px, dan export sebagai PNG atau WebP.

## Files

- `index.html` - app shell
- `styles.css` - responsive UI
- `app.js` - upload, overlay canvas, preview, export
- `PHOTOS TO BE UPDATED.webp` - overlay asset
- `assets/fonts/eurostile.woff2` - Eurostile UI font
- `assets/logos/aspc-logo-white.png` - header logo
- `assets/logos/aspc-logo-black.png` - alternate logo

## Add More Overlays

Letak fail overlay baru dalam folder yang sama, kemudian tambah item dalam array `overlays` di `app.js`:

```js
{
  id: "new-overlay",
  name: "NEW OVERLAY",
  src: "NEW%20OVERLAY.webp",
}
```

Overlay terbaik ialah 1080 x 1080 px dengan background transparent.

## GitHub Pages

1. Push semua fail ke GitHub repo.
2. Pergi ke `Settings` -> `Pages`.
3. Set `Source` kepada branch repo, contohnya `main`.
4. Set folder kepada `/root`.
5. Save dan buka URL GitHub Pages yang GitHub bagi.
