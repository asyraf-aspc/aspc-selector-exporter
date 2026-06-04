# ASPC Selector Exporter

A static web app for uploading product images, applying built-in ASPC selector overlays, previewing the final 1080 x 1080 px output, and exporting as PNG or WebP.

The default overlay option is `NONE`, which exports the uploaded product image without any overlay.

## Files

- `index.html` - app shell
- `styles.css` - responsive UI
- `app.js` - upload, overlay canvas, preview, export
- `PHOTOS TO BE UPDATED.webp` - overlay asset
- `assets/fonts/eurostile.woff2` - Eurostile UI font
- `assets/logos/aspc-logo-white.png` - header logo
- `assets/logos/aspc-logo-black.png` - alternate logo

## Add More Overlays

Place the new overlay file in the project folder, then add a new item to the `overlays` array in `app.js`:

```js
{
  id: "new-overlay",
  name: "NEW OVERLAY",
  src: "NEW%20OVERLAY.webp",
}
```

For best results, use a 1080 x 1080 px overlay with a transparent background.

## GitHub Pages

1. Push all files to the GitHub repository.
2. Go to `Settings` -> `Pages`.
3. Set `Source` to `Deploy from a branch`.
4. Set the branch to `main`.
5. Set the folder to `/ (root)`.
6. Save and open the GitHub Pages URL once deployment is complete.
