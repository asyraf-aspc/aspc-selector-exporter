# ASPC Selector Exporter

A static web app for generating ASPC selector thumbnails, applying built-in selector overlays, previewing the final 1080 x 1080 px output, and exporting as PNG or WebP.

## Modes

- `Generate Selector` - combine a 1080 x 1080 px background image with a clean product asset, adjust product scale and position, optionally apply an overlay, then export.
- `Overlay Existing` - upload a completed product image, apply an optional overlay, then export.

The default overlay option is `NONE`, which exports the generated or uploaded image without an overlay.

## Files

- `index.html` - app shell
- `styles.css` - responsive UI
- `app.js` - upload, canvas composition, preview, export
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
