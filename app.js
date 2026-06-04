const OUTPUT_SIZE = 1080;
const DEFAULT_PRODUCT_PLACEMENT = {
  scale: 78,
  x: 0,
  y: 70,
  shadow: false,
};

const overlays = [
  {
    id: "none",
    name: "NONE",
    src: "",
  },
  {
    id: "photos-to-be-updated",
    name: "PHOTOS TO BE UPDATED",
    src: "PHOTOS%20TO%20BE%20UPDATED.webp",
  },
];

const presetBackgrounds = [
  {
    id: "eofy-selector-background",
    name: "EOFY Selector Background",
    src: "EOFY%20Selector%20Background.png",
  },
];

const state = {
  mode: "generate",
  generate: {
    backgroundImage: null,
    backgroundFile: "",
    backgroundSource: "preset",
    selectedBackgroundId: presetBackgrounds[0].id,
    uploadedBackgroundImage: null,
    uploadedBackgroundFile: "",
    productImage: null,
    productFile: "",
    selectedOverlayId: overlays[0].id,
    ...DEFAULT_PRODUCT_PLACEMENT,
  },
  overlay: {
    sourceImage: null,
    sourceFile: "",
    selectedOverlayId: overlays[0].id,
    fitMode: "cover",
  },
};

const overlayCache = new Map();
const backgroundCache = new Map();

const els = {
  backgroundDropZone: document.querySelector("#backgroundDropZone"),
  backgroundInput: document.querySelector("#backgroundInput"),
  backgroundMeta: document.querySelector("#backgroundMeta"),
  backgroundPanels: document.querySelectorAll("[data-background-panel]"),
  backgroundSourceButtons: document.querySelectorAll("[data-background-source]"),
  canvas: document.querySelector("#previewCanvas"),
  canvasWrap: document.querySelector("#canvasWrap"),
  downloadBtn: document.querySelector("#downloadBtn"),
  emptyState: document.querySelector("#emptyState"),
  formatSelect: document.querySelector("#formatSelect"),
  generateOverlayList: document.querySelector("#generateOverlayList"),
  modePanels: document.querySelectorAll("[data-mode-panel]"),
  modeTabs: document.querySelectorAll("[data-mode]"),
  overlayDropZone: document.querySelector("#overlayDropZone"),
  overlayInput: document.querySelector("#overlayInput"),
  overlayList: document.querySelector("#overlayList"),
  overlayMeta: document.querySelector("#overlayMeta"),
  previewTitle: document.querySelector("#previewTitle"),
  presetBackgroundList: document.querySelector("#presetBackgroundList"),
  productDropZone: document.querySelector("#productDropZone"),
  productInput: document.querySelector("#productInput"),
  productMeta: document.querySelector("#productMeta"),
  productScale: document.querySelector("#productScale"),
  productScaleValue: document.querySelector("#productScaleValue"),
  productX: document.querySelector("#productX"),
  productXValue: document.querySelector("#productXValue"),
  productY: document.querySelector("#productY"),
  productYValue: document.querySelector("#productYValue"),
  productShadow: document.querySelector("#productShadow"),
  resetBtn: document.querySelector("#resetBtn"),
  resetProductBtn: document.querySelector("#resetProductBtn"),
};

const ctx = els.canvas.getContext("2d", { alpha: true });

document.addEventListener("DOMContentLoaded", init);

function init() {
  renderPresetBackgroundOptions();
  renderOverlayOptions();
  bindEvents();
  syncProductControls();
  setBackgroundSource(state.generate.backgroundSource);
  loadSelectedPresetBackground();
  setMode(state.mode);

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function bindEvents() {
  els.modeTabs.forEach((button) => {
    button.addEventListener("click", () => setMode(button.dataset.mode));
  });

  bindImageUpload(els.backgroundInput, els.backgroundDropZone, (file) =>
    handleGenerateFile("background", file),
  );
  bindImageUpload(els.productInput, els.productDropZone, (file) =>
    handleGenerateFile("product", file),
  );
  bindImageUpload(els.overlayInput, els.overlayDropZone, handleOverlayFile);

  els.backgroundSourceButtons.forEach((button) => {
    button.addEventListener("click", () => setBackgroundSource(button.dataset.backgroundSource));
  });

  els.presetBackgroundList.addEventListener("click", async (event) => {
    const option = event.target.closest("[data-background-id]");
    if (!option) {
      return;
    }

    state.generate.selectedBackgroundId = option.dataset.backgroundId;
    setBackgroundSource("preset");
    updatePresetBackgroundActiveState();
    await loadSelectedPresetBackground();
  });

  bindOverlayOptions(els.generateOverlayList, "generate");
  bindOverlayOptions(els.overlayList, "overlay");

  document.querySelectorAll("[data-fit]").forEach((button) => {
    button.addEventListener("click", () => {
      state.overlay.fitMode = button.dataset.fit;
      document
        .querySelectorAll("[data-fit]")
        .forEach((item) => item.classList.toggle("is-active", item === button));
      renderCanvas();
    });
  });

  [els.productScale, els.productX, els.productY].forEach((input) => {
    input.addEventListener("input", () => {
      state.generate.scale = Number(els.productScale.value);
      state.generate.x = Number(els.productX.value);
      state.generate.y = Number(els.productY.value);
      updateProductOutputs();
      renderCanvas();
    });
  });

  els.productShadow.addEventListener("change", () => {
    state.generate.shadow = els.productShadow.checked;
    renderCanvas();
  });

  els.resetProductBtn.addEventListener("click", resetProductPlacement);
  els.downloadBtn.addEventListener("click", downloadImage);
  els.resetBtn.addEventListener("click", clearActiveMode);
}

function bindOverlayOptions(list, scope) {
  list.addEventListener("click", async (event) => {
    const option = event.target.closest("[data-overlay-id]");
    if (!option) {
      return;
    }

    state[scope].selectedOverlayId = option.dataset.overlayId;
    updateOverlayActiveState(scope);
    updateToolbar();

    try {
      await ensureOverlayImage(currentOverlay(scope));
      renderCanvas();
    } catch (error) {
      showOverlayError(error);
    }
  });
}

function bindImageUpload(input, dropZone, handler) {
  input.addEventListener("change", (event) => {
    const [file] = event.target.files;
    if (file) {
      handler(file);
    }
  });

  ["dragenter", "dragover"].forEach((eventName) => {
    dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropZone.classList.add("is-dragging");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    dropZone.addEventListener(eventName, () => {
      dropZone.classList.remove("is-dragging");
    });
  });

  dropZone.addEventListener("drop", (event) => {
    event.preventDefault();
    const [file] = event.dataTransfer.files;
    if (file) {
      handler(file);
    }
  });
}

function renderPresetBackgroundOptions() {
  els.presetBackgroundList.innerHTML = presetBackgrounds
    .map(
      (background) => `
        <button
          class="background-option${background.id === state.generate.selectedBackgroundId ? " is-active" : ""}"
          type="button"
          data-background-id="${background.id}"
        >
          <img class="background-thumb" src="${background.src}" alt="" />
          <span class="background-name">${background.name}</span>
          <span class="overlay-check" data-lucide="check" aria-hidden="true"></span>
        </button>
      `,
    )
    .join("");

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function updatePresetBackgroundActiveState() {
  document.querySelectorAll("[data-background-id]").forEach((button) => {
    button.classList.toggle(
      "is-active",
      button.dataset.backgroundId === state.generate.selectedBackgroundId,
    );
  });
}

function setBackgroundSource(source) {
  state.generate.backgroundSource = source;

  els.backgroundSourceButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.backgroundSource === source);
  });

  els.backgroundPanels.forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.backgroundPanel === source);
  });

  if (source === "preset") {
    loadSelectedPresetBackground();
    return;
  }

  state.generate.backgroundImage = state.generate.uploadedBackgroundImage;
  state.generate.backgroundFile = state.generate.uploadedBackgroundFile;
  els.backgroundMeta.classList.remove("is-error");
  els.backgroundMeta.textContent = state.generate.uploadedBackgroundImage
    ? formatImageMeta(state.generate.uploadedBackgroundFile, state.generate.uploadedBackgroundImage)
    : "No uploaded background selected";
  updateToolbar();
  renderCanvas();
}

async function loadSelectedPresetBackground() {
  const background = currentPresetBackground();
  const expectedBackgroundId = background.id;

  try {
    const image = await ensurePresetBackgroundImage(background);

    if (
      state.generate.backgroundSource !== "preset" ||
      state.generate.selectedBackgroundId !== expectedBackgroundId
    ) {
      return;
    }

    state.generate.backgroundImage = image;
    state.generate.backgroundFile = background.name;
    els.backgroundMeta.classList.remove("is-error");
    els.backgroundMeta.textContent = `Preset: ${background.name} - ${image.naturalWidth} x ${image.naturalHeight}px`;
    updateToolbar();
    renderCanvas();
  } catch (error) {
    showMetaError(els.backgroundMeta, "Preset background could not be opened.");
    console.error(error);
  }
}

function ensurePresetBackgroundImage(background) {
  const cached = backgroundCache.get(background.id);

  if (cached) {
    return Promise.resolve(cached);
  }

  const promise = loadImage(background.src).then((image) => {
    backgroundCache.set(background.id, image);
    return image;
  });

  backgroundCache.set(background.id, promise);
  return promise;
}

function currentPresetBackground() {
  return (
    presetBackgrounds.find(
      (background) => background.id === state.generate.selectedBackgroundId,
    ) || presetBackgrounds[0]
  );
}

function renderOverlayOptions() {
  els.generateOverlayList.innerHTML = overlayOptionsMarkup("generate");
  els.overlayList.innerHTML = overlayOptionsMarkup("overlay");

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function overlayOptionsMarkup(scope) {
  return overlays
    .map((overlay) => {
      const thumbnail = hasOverlayImage(overlay)
        ? `<img class="overlay-thumb" src="${overlay.src}" alt="" />`
        : `<span class="overlay-thumb overlay-thumb-none" aria-hidden="true">
            <span data-lucide="ban"></span>
          </span>`;

      return `
        <button
          class="overlay-option${overlay.id === state[scope].selectedOverlayId ? " is-active" : ""}"
          type="button"
          data-overlay-id="${overlay.id}"
          data-overlay-scope="${scope}"
        >
          ${thumbnail}
          <span class="overlay-name">${overlay.name}</span>
          <span class="overlay-check" data-lucide="check" aria-hidden="true"></span>
        </button>
      `;
    })
    .join("");
}

function updateOverlayActiveState(scope) {
  document.querySelectorAll(`[data-overlay-scope="${scope}"]`).forEach((button) => {
    button.classList.toggle(
      "is-active",
      button.dataset.overlayId === state[scope].selectedOverlayId,
    );
  });
}

async function handleGenerateFile(kind, file) {
  const meta = kind === "background" ? els.backgroundMeta : els.productMeta;

  if (!isAcceptedImage(file)) {
    showMetaError(meta, "Upload PNG, JPEG, or WebP only.");
    return;
  }

  try {
    const image = await loadImageFromFile(file);

    if (kind === "background") {
      state.generate.uploadedBackgroundImage = image;
      state.generate.uploadedBackgroundFile = file.name;
      state.generate.backgroundImage = image;
      state.generate.backgroundFile = file.name;
      els.backgroundMeta.textContent = formatImageMeta(file.name, image);
      els.backgroundMeta.classList.remove("is-error");
      setBackgroundSource("upload");
    } else {
      state.generate.productImage = image;
      state.generate.productFile = file.name;
      els.productMeta.textContent = formatImageMeta(file.name, image);
      els.productMeta.classList.remove("is-error");
    }

    updateToolbar();
    renderCanvas();
  } catch (error) {
    showMetaError(meta, "Image could not be opened.");
    console.error(error);
  }
}

async function handleOverlayFile(file) {
  if (!isAcceptedImage(file)) {
    showMetaError(els.overlayMeta, "Upload PNG, JPEG, or WebP only.");
    return;
  }

  try {
    const image = await loadImageFromFile(file);
    state.overlay.sourceImage = image;
    state.overlay.sourceFile = file.name;
    els.overlayMeta.textContent = formatImageMeta(file.name, image);
    els.overlayMeta.classList.remove("is-error");
    await ensureOverlayImage(currentOverlay("overlay"));
    updateToolbar();
    renderCanvas();
  } catch (error) {
    showMetaError(els.overlayMeta, "Image could not be opened.");
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
  if (!hasOverlayImage(overlay)) {
    return Promise.resolve(null);
  }

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

function setMode(mode) {
  state.mode = mode;

  els.modeTabs.forEach((button) => {
    const isActive = button.dataset.mode === mode;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });

  els.modePanels.forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.modePanel === mode);
  });

  updateToolbar();
  renderCanvas();
}

function renderCanvas() {
  clearCanvas();

  if (state.mode === "generate") {
    renderGeneratedSelector();
    return;
  }

  renderOverlayImage();
}

function clearCanvas() {
  ctx.clearRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
}

function renderGeneratedSelector() {
  const hasBackground = Boolean(state.generate.backgroundImage);
  const hasProduct = Boolean(state.generate.productImage);

  els.canvasWrap.classList.toggle("has-image", hasBackground || hasProduct);
  els.downloadBtn.disabled = !(hasBackground && hasProduct);

  if (hasBackground) {
    drawImageFit(state.generate.backgroundImage, "cover");
  }

  if (hasProduct) {
    drawProductAsset(state.generate.productImage);
  }

  drawOverlayIfReady("generate");
}

function renderOverlayImage() {
  const hasImage = Boolean(state.overlay.sourceImage);

  els.canvasWrap.classList.toggle("has-image", hasImage);
  els.downloadBtn.disabled = !hasImage;

  if (!hasImage) {
    return;
  }

  drawImageFit(state.overlay.sourceImage, state.overlay.fitMode);
  drawOverlayIfReady("overlay");
}

function drawImageFit(image, fitMode) {
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  const scale =
    fitMode === "cover"
      ? Math.max(OUTPUT_SIZE / width, OUTPUT_SIZE / height)
      : Math.min(OUTPUT_SIZE / width, OUTPUT_SIZE / height);

  const targetWidth = width * scale;
  const targetHeight = height * scale;
  const targetX = (OUTPUT_SIZE - targetWidth) / 2;
  const targetY = (OUTPUT_SIZE - targetHeight) / 2;

  ctx.drawImage(image, targetX, targetY, targetWidth, targetHeight);
}

function drawProductAsset(image) {
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  const maxSide = OUTPUT_SIZE * (state.generate.scale / 100);
  const scale = maxSide / Math.max(width, height);
  const targetWidth = width * scale;
  const targetHeight = height * scale;
  const targetX = (OUTPUT_SIZE - targetWidth) / 2 + state.generate.x;
  const targetY = (OUTPUT_SIZE - targetHeight) / 2 + state.generate.y;

  ctx.save();

  if (state.generate.shadow) {
    ctx.shadowColor = "rgba(0, 0, 0, 0.48)";
    ctx.shadowBlur = 42;
    ctx.shadowOffsetY = 24;
  }

  ctx.drawImage(image, targetX, targetY, targetWidth, targetHeight);
  ctx.restore();
}

function drawOverlayIfReady(scope) {
  const overlay = currentOverlay(scope);

  if (!hasOverlayImage(overlay)) {
    return;
  }

  const cached = overlayCache.get(overlay.id);

  if (!cached || typeof cached.then === "function") {
    return;
  }

  ctx.drawImage(cached, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
}

function currentOverlay(scope = state.mode) {
  return (
    overlays.find((overlay) => overlay.id === state[scope].selectedOverlayId) || overlays[0]
  );
}

function hasOverlayImage(overlay) {
  return Boolean(overlay?.src);
}

function updateToolbar() {
  if (state.mode === "generate") {
    els.previewTitle.textContent = "Generate Selector";
    setEmptyState("Upload assets");
    els.resetBtn.disabled = !(
      state.generate.backgroundImage || state.generate.productImage
    );
    return;
  }

  els.previewTitle.textContent = state.overlay.sourceImage
    ? currentOverlay("overlay").name
    : "Overlay Existing";
  setEmptyState("Upload image");
  els.resetBtn.disabled = !state.overlay.sourceImage;
}

function setEmptyState(label) {
  const textNode = els.emptyState.querySelector("span:last-child");
  textNode.textContent = label;
}

function syncProductControls() {
  els.productScale.value = String(state.generate.scale);
  els.productX.value = String(state.generate.x);
  els.productY.value = String(state.generate.y);
  els.productShadow.checked = state.generate.shadow;
  updateProductOutputs();
}

function updateProductOutputs() {
  els.productScaleValue.textContent = `${state.generate.scale}%`;
  els.productXValue.textContent = `${state.generate.x}px`;
  els.productYValue.textContent = `${state.generate.y}px`;
}

function resetProductPlacement() {
  state.generate.scale = DEFAULT_PRODUCT_PLACEMENT.scale;
  state.generate.x = DEFAULT_PRODUCT_PLACEMENT.x;
  state.generate.y = DEFAULT_PRODUCT_PLACEMENT.y;
  state.generate.shadow = DEFAULT_PRODUCT_PLACEMENT.shadow;
  syncProductControls();
  renderCanvas();
}

function clearActiveMode() {
  if (state.mode === "generate") {
    state.generate.backgroundImage = null;
    state.generate.backgroundFile = "";
    state.generate.backgroundSource = "preset";
    state.generate.selectedBackgroundId = presetBackgrounds[0].id;
    state.generate.uploadedBackgroundImage = null;
    state.generate.uploadedBackgroundFile = "";
    state.generate.productImage = null;
    state.generate.productFile = "";
    els.backgroundInput.value = "";
    els.productInput.value = "";
    els.productMeta.textContent = "No product selected";
    els.backgroundMeta.classList.remove("is-error");
    els.productMeta.classList.remove("is-error");
    updatePresetBackgroundActiveState();
    setBackgroundSource("preset");
    resetProductPlacement();
  } else {
    state.overlay.sourceImage = null;
    state.overlay.sourceFile = "";
    els.overlayInput.value = "";
    els.overlayMeta.textContent = "No image selected";
    els.overlayMeta.classList.remove("is-error");
  }

  updateToolbar();
  renderCanvas();
}

async function downloadImage() {
  if (!isExportReady()) {
    return;
  }

  els.downloadBtn.disabled = true;

  try {
    await ensureOverlayImage(currentOverlay(state.mode));
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
        showActiveError("Export failed. Try PNG.");
        els.downloadBtn.disabled = false;
        return;
      }

      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${exportBaseName()}.${extension}`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 0);
      els.downloadBtn.disabled = false;
    },
    mimeType,
    quality,
  );
}

function isExportReady() {
  if (state.mode === "generate") {
    return Boolean(state.generate.backgroundImage && state.generate.productImage);
  }

  return Boolean(state.overlay.sourceImage);
}

function exportBaseName() {
  if (state.mode === "generate") {
    return `${safeBaseName(state.generate.productFile || state.generate.backgroundFile)}-selector-${currentOverlay("generate").id}`;
  }

  return `${safeBaseName(state.overlay.sourceFile)}-${currentOverlay("overlay").id}`;
}

function showOverlayError(error) {
  showActiveError("Overlay could not be opened.");
  els.downloadBtn.disabled = true;
  console.error(error);
}

function showActiveError(message) {
  if (state.mode === "generate") {
    showMetaError(els.productMeta, message);
  } else {
    showMetaError(els.overlayMeta, message);
  }
}

function showMetaError(meta, message) {
  meta.textContent = message;
  meta.classList.add("is-error");
}

function formatImageMeta(fileName, image) {
  return `${fileName} - ${image.naturalWidth} x ${image.naturalHeight}px`;
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
