const OUTPUT_SIZE = 1080;

const overlays = [
  {
    id: "photos-to-be-updated",
    name: "PHOTOS TO BE UPDATED",
    src: "PHOTOS%20TO%20BE%20UPDATED.webp",
  },
];

const state = {
  sourceImage: null,
  sourceFile: "",
  selectedOverlayId: overlays[0].id,
  fitMode: "cover",
};

const overlayCache = new Map();

const els = {
  canvas: document.querySelector("#previewCanvas"),
  canvasWrap: document.querySelector("#canvasWrap"),
  downloadBtn: document.querySelector("#downloadBtn"),
  dropZone: document.querySelector("#dropZone"),
  emptyState: document.querySelector("#emptyState"),
  fileMeta: document.querySelector("#fileMeta"),
  formatSelect: document.querySelector("#formatSelect"),
  imageInput: document.querySelector("#imageInput"),
  overlayList: document.querySelector("#overlayList"),
  previewTitle: document.querySelector("#previewTitle"),
  resetBtn: document.querySelector("#resetBtn"),
};

const ctx = els.canvas.getContext("2d", { alpha: true });

document.addEventListener("DOMContentLoaded", init);

function init() {
  renderOverlayOptions();
  bindEvents();
  ensureOverlayImage(currentOverlay()).then(renderCanvas).catch(showOverlayError);
  renderCanvas();

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function bindEvents() {
  els.imageInput.addEventListener("change", (event) => {
    const [file] = event.target.files;
    if (file) {
      handleFile(file);
    }
  });

  ["dragenter", "dragover"].forEach((eventName) => {
    els.dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      els.dropZone.classList.add("is-dragging");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    els.dropZone.addEventListener(eventName, () => {
      els.dropZone.classList.remove("is-dragging");
    });
  });

  els.dropZone.addEventListener("drop", (event) => {
    event.preventDefault();
    const [file] = event.dataTransfer.files;
    if (file) {
      handleFile(file);
    }
  });

  els.overlayList.addEventListener("click", async (event) => {
    const option = event.target.closest("[data-overlay-id]");
    if (!option) {
      return;
    }

    state.selectedOverlayId = option.dataset.overlayId;
    updateOverlayActiveState();
    els.previewTitle.textContent = currentOverlay().name;

    try {
      await ensureOverlayImage(currentOverlay());
      renderCanvas();
    } catch (error) {
      showOverlayError(error);
    }
  });

  document.querySelectorAll("[data-fit]").forEach((button) => {
    button.addEventListener("click", () => {
      state.fitMode = button.dataset.fit;
      document
        .querySelectorAll("[data-fit]")
        .forEach((item) => item.classList.toggle("is-active", item === button));
      renderCanvas();
    });
  });

  els.downloadBtn.addEventListener("click", downloadImage);
  els.resetBtn.addEventListener("click", clearImage);
}

function renderOverlayOptions() {
  els.overlayList.innerHTML = overlays
    .map(
      (overlay) => `
        <button
          class="overlay-option${overlay.id === state.selectedOverlayId ? " is-active" : ""}"
          type="button"
          data-overlay-id="${overlay.id}"
        >
          <img class="overlay-thumb" src="${overlay.src}" alt="" />
          <span class="overlay-name">${overlay.name}</span>
          <span class="overlay-check" data-lucide="check" aria-hidden="true"></span>
        </button>
      `,
    )
    .join("");

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function updateOverlayActiveState() {
  document.querySelectorAll("[data-overlay-id]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.overlayId === state.selectedOverlayId);
  });
}

async function handleFile(file) {
  if (!isAcceptedImage(file)) {
    els.fileMeta.textContent = "Upload PNG, JPEG, or WebP only.";
    els.fileMeta.classList.add("is-error");
    return;
  }

  try {
    const image = await loadImageFromFile(file);
    state.sourceImage = image;
    state.sourceFile = file.name;
    els.fileMeta.classList.remove("is-error");
    els.fileMeta.textContent = `${file.name} - ${image.naturalWidth} x ${image.naturalHeight}px`;
    els.previewTitle.textContent = currentOverlay().name;
    els.resetBtn.disabled = false;
    await ensureOverlayImage(currentOverlay());
    renderCanvas();
  } catch (error) {
    els.fileMeta.textContent = "Image could not be opened.";
    els.fileMeta.classList.add("is-error");
    console.error(error);
  }
}

function isAcceptedImage(file) {
  const acceptedTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
  const acceptedExtensions = new Set(["png", "jpg", "jpeg", "webp"]);
  const extension = file.name.split(".").pop().toLowerCase();
  return acceptedTypes.has(file.type) || acceptedExtensions.has(extension);
}

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Unable to load ${file.name}`));
    };

    image.decoding = "async";
    image.src = url;
  });
}

function ensureOverlayImage(overlay) {
  const cached = overlayCache.get(overlay.id);

  if (cached) {
    return Promise.resolve(cached);
  }

  const promise = loadImage(overlay.src).then((image) => {
    overlayCache.set(overlay.id, image);
    return image;
  });

  overlayCache.set(overlay.id, promise);
  return promise;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Unable to load overlay ${src}`));
    image.decoding = "async";
    image.src = src;
  });
}

function renderCanvas() {
  ctx.clearRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

  const hasImage = Boolean(state.sourceImage);
  els.canvasWrap.classList.toggle("has-image", hasImage);
  els.downloadBtn.disabled = !hasImage;

  if (!hasImage) {
    return;
  }

  drawSourceImage(state.sourceImage);
  drawOverlayIfReady();
}

function drawSourceImage(image) {
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  const scale =
    state.fitMode === "cover"
      ? Math.max(OUTPUT_SIZE / width, OUTPUT_SIZE / height)
      : Math.min(OUTPUT_SIZE / width, OUTPUT_SIZE / height);

  const targetWidth = width * scale;
  const targetHeight = height * scale;
  const targetX = (OUTPUT_SIZE - targetWidth) / 2;
  const targetY = (OUTPUT_SIZE - targetHeight) / 2;

  ctx.drawImage(image, targetX, targetY, targetWidth, targetHeight);
}

function drawOverlayIfReady() {
  const cached = overlayCache.get(currentOverlay().id);

  if (!cached || typeof cached.then === "function") {
    return;
  }

  ctx.drawImage(cached, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
}

function currentOverlay() {
  return overlays.find((overlay) => overlay.id === state.selectedOverlayId) || overlays[0];
}

function showOverlayError(error) {
  els.fileMeta.textContent = "Overlay could not be opened.";
  els.fileMeta.classList.add("is-error");
  els.downloadBtn.disabled = true;
  console.error(error);
}

function clearImage() {
  state.sourceImage = null;
  state.sourceFile = "";
  els.imageInput.value = "";
  els.fileMeta.textContent = "No image selected";
  els.fileMeta.classList.remove("is-error");
  els.previewTitle.textContent = "Ready";
  els.resetBtn.disabled = true;
  renderCanvas();
}

async function downloadImage() {
  if (!state.sourceImage) {
    return;
  }

  els.downloadBtn.disabled = true;

  try {
    await ensureOverlayImage(currentOverlay());
  } catch (error) {
    showOverlayError(error);
    els.downloadBtn.disabled = false;
    return;
  }

  renderCanvas();
  els.downloadBtn.disabled = true;

  const mimeType = els.formatSelect.value;
  const extension = mimeType === "image/webp" ? "webp" : "png";
  const quality = mimeType === "image/webp" ? 0.92 : undefined;

  els.canvas.toBlob(
    (blob) => {
      if (!blob) {
        els.fileMeta.textContent = "Export failed. Try PNG.";
        els.fileMeta.classList.add("is-error");
        els.downloadBtn.disabled = false;
        return;
      }

      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${safeBaseName(state.sourceFile)}-${currentOverlay().id}.${extension}`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 0);
      els.downloadBtn.disabled = false;
    },
    mimeType,
    quality,
  );
}

function safeBaseName(fileName) {
  const fallback = "aspc-selector";
  const base = fileName.replace(/\.[^.]+$/, "");
  const slug = base
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || fallback;
}
