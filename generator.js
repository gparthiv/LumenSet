/**
 * FIBO DataForge - Dataset Generation Engine
 * Clean, Non-Repeating, Final Version
 */

/* ------------------------------------------------------------
   1) START DATASET GENERATION
------------------------------------------------------------ */
document.getElementById('results-gallery').innerHTML = '';
document.getElementById('results-section').style.display = 'none';
async function startDatasetGeneration() {
  if (!api || !baseStructuredPrompt) {
    alert('Please complete previous steps first');
    return;
  }
  // FIX: Clear old results before new run
  datasetResults = [];
  const gallery = document.getElementById('results-gallery');
  if (gallery) gallery.innerHTML = '';
  document.getElementById('results-section').style.display = 'none';

  document.getElementById('parameters-section').style.display = 'none';
  document.getElementById('progress-section').style.display = 'block';
  document.getElementById('progress-section').scrollIntoView({ behavior: 'smooth' });

  const variations = buildVariations();
  if (!variations || variations.length === 0) {
    alert('No variations generated — please check sweep settings or lighting.');
    return;
  }

  datasetResults = [];

  try {
    const results = await api.generateDataset(
      baseStructuredPrompt,
      variations,
      onGenerationProgress
    );

    datasetResults = results;

    document.getElementById('progress-section').style.display = 'none';
    displayResults(results);

  } catch (error) {
    alert(`Generation failed: ${error.message}`);
    document.getElementById('parameters-section').style.display = 'block';
    document.getElementById('progress-section').style.display = 'none';
  }
}

/* ------------------------------------------------------------
   2) BUILD VARIATIONS (RTZ × LIGHTING)
------------------------------------------------------------ */
function buildVariations() {
  const variations = [];

  const rotationSweep = document.getElementById('enable-rotation-sweep')?.checked || false;
  const tiltSweep = document.getElementById('enable-tilt-sweep')?.checked || false;
  const zoomSweep = document.getElementById('enable-zoom-sweep')?.checked || false;

  const currentRotation = parseInt(document.getElementById('rotation-slider')?.value || 0);
  const currentTilt = parseInt(document.getElementById('tilt-slider')?.value || 0);
  const currentZoom = parseInt(document.getElementById('zoom-slider')?.value || 5);

  const rotationAngles = rotationSweep ? [-90, -45, 0, 45, 90] : [currentRotation];
  const tiltAngles = tiltSweep ? [-45, 0, 45] : [currentTilt];
  const zoomLevels = zoomSweep ? [0, 5, 10] : [currentZoom];

  const lightingDirections = Array.from(
    document.querySelectorAll('.lighting-presets input[type="checkbox"]:checked')
  ).map(cb => cb.value);

  if (lightingDirections.length === 0) lightingDirections.push('front-lit');

  const background = document.querySelector('input[name="background"]:checked')?.value || 'white-studio';
  const focalLength = document.querySelector('input[name="focal-length"]:checked')?.value || 'standard';

  const advancedMods = getAdvancedModifications();

  let counter = 1;

  for (const rotation of rotationAngles) {
    for (const tilt of tiltAngles) {
      for (const zoom of zoomLevels) {
        for (const lighting_direction of lightingDirections) {

          variations.push({
            name: `Variation ${counter}: ${formatRTZ(rotation, tilt, zoom)} | ${lighting_direction}`,
            modifications: {
              rotation_degrees: rotation,
              tilt_degrees: tilt,
              zoom_level: zoom,
              lighting_direction,
              background,
              focal_length: focalLength,   // ✅ FIXED
              ...advancedMods
            }
          });

          counter++;
        }
      }
    }
  }

  return variations;
}
/* ------------------------------------------------------------
   3) CAMERA HELPERS
------------------------------------------------------------ */

// Simple UI display label — NOT used in prompt
function getCameraAngleFromRTZ(rotation, tilt) {
  if (tilt <= -45) return 'overhead';
  if (tilt <= -30) return 'high-angle';
  if (tilt >= 30) return 'low-angle';
  if (rotation === 0 && tilt === 0) return 'eye-level';
  return 'eye-level';
}

function getDistanceFromZoom(zoom) {
  if (zoom === 0) return 'close';
  if (zoom === 5) return 'mid';
  if (zoom === 10) return 'far';
  return 'mid';
}

function formatRTZ(rotation, tilt, zoom) {
  const rotLabel = rotation === 0 ? 'Front' : rotation < 0 ? `Left ${Math.abs(rotation)}°` : `Right ${rotation}°`;
  const tiltLabel = tilt === 0 ? 'Level' : tilt < 0 ? `Up ${Math.abs(tilt)}°` : `Down ${tilt}°`;
  const zoomLabel = zoom === 0 ? 'Close' : zoom === 5 ? 'Mid' : 'Far';
  return `${rotLabel}, ${tiltLabel}, ${zoomLabel}`;
}

/* ------------------------------------------------------------
   4) ADVANCED PARAMETERS
------------------------------------------------------------ */
function getAdvancedModifications() {
  const mods = {};

  if (document.getElementById('use-exact-colors')?.checked) {
    mods.background_color_hex = document.getElementById('bg-color-hex')?.value;
    mods.surface_color_hex = document.getElementById('surface-color-hex')?.value;
  }

  mods.surface_finish = document.getElementById('surface-finish')?.value;
  mods.surface_tone = document.getElementById('surface-tone')?.value;

  mods.lighting_contrast = document.getElementById('lighting-contrast')?.value;
  mods.shadow_behavior = document.getElementById('shadow-behavior')?.value;
  mods.color_temperature = document.getElementById('color-temperature')?.value;

  mods.aperture = document.getElementById('aperture')?.value;
  mods.negative_space = document.getElementById('negative-space')?.value;

  if (document.getElementById('add-imperfections')?.checked) {
    mods.add_imperfections = true;
    mods.imperfection_types = Array.from(
      document.querySelectorAll('#imperfection-types input:checked')
    ).map(cb => cb.value);
  }

  const moods = Array.from(
    document.querySelectorAll('#mood-options input:checked')
  ).map(cb => cb.value);
  if (moods.length > 0) mods.mood = moods;

  return mods;
}

/* ------------------------------------------------------------
   5) PROGRESS BAR & LIVE IMAGE DISPLAY
------------------------------------------------------------ */
function onGenerationProgress(update) {
  const fill = document.getElementById('progress-fill');
  const text = document.getElementById('progress-text');
  const current = document.getElementById('current-variation');

  const pct = ((update.index + 1) / update.total * 100).toFixed(0);
  fill.style.width = `${pct}%`;
  fill.textContent = `${pct}%`;

  if (update.status === 'generating') {
    text.textContent = `Generating ${update.name}... (${update.index + 1}/${update.total})`;
    current.innerHTML = `<strong>Current:</strong> ${update.name}<br><small>Progress: ${(update.progress * 100).toFixed(0)}%</small>`;
  }

  if (update.status === 'completed') {
    text.textContent = `Completed ${update.name} (${update.index + 1}/${update.total})`;
    current.innerHTML = `<strong>✅ Completed:</strong> ${update.name}<br><small>Seed: ${update.metadata.seed}</small>`;
    displaySingleResult(update.metadata, update.index);
  }

  if (update.status === 'error') {
    current.innerHTML = `<strong>❌ Error:</strong> ${update.name}<br><small style="color:red;">${update.error}</small>`;
  }
}

function displaySingleResult(result, index) {
  const section = document.getElementById('results-section');
  section.style.display = 'block';

  const gallery = document.getElementById('results-gallery');
  const item = document.createElement('div');
  item.className = 'gallery-item';
  item.style.opacity = '0';
  item.style.transform = 'translateY(20px)';

  item.innerHTML = `
    <div class="image-loading-placeholder">
        <div class="spinner"></div>
        <small>Loading image...</small>
    </div>
    <img src="${result.image_url}" alt="${result.variation_name}"
         loading="eager" style="display:none;"
         onload="this.style.display='block'; this.previousElementSibling.remove(); this.parentElement.style.opacity='1'; this.parentElement.style.transform='translateY(0)';">
    <div class="gallery-item-info">
        <h4>${result.variation_name}</h4>
        <p><strong>Seed:</strong> ${result.seed}</p>
        <p><strong>Lighting:</strong> ${result.modifications.lighting_direction}</p>
        <div class="gallery-item-actions">
            <button class="btn btn-small btn-primary" onclick="viewImageMetadata(${index})">View JSON</button>
            <button class="btn btn-small btn-secondary" onclick="downloadSingleImage(${index})">Download</button>
            <button class="btn btn-small btn-secondary" onclick="viewFullImage('${result.image_url}')">🔍 View Full</button>
        </div>
    </div>
  `;

  gallery.appendChild(item);
}

/* ------------------------------------------------------------
   6) OTHER UI HELPERS
------------------------------------------------------------ */

function displayResults() {
  const section = document.getElementById('results-section');
  section.style.display = 'block';
  section.scrollIntoView({ behavior: 'smooth' });
}

function viewFullImage(url) {
  // remove old modal if still present
  const old = document.querySelector('.image-modal');
  if (old) old.remove();

  const modal = document.createElement('div');
  modal.className = 'image-modal';
  modal.innerHTML = `
    <div class="image-modal-content">
        <span class="close" onclick="this.closest('.image-modal').remove()">&times;</span>
        <img src="${url}">
        <div class="image-modal-controls">
            <a href="${url}" download class="btn btn-primary">Download</a>
            <button class="btn btn-secondary" onclick="this.closest('.image-modal').remove()">Close</button>
        </div>
    </div>
  `;

  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });

  document.body.appendChild(modal);
}

function viewImageMetadata(index) {
  const r = datasetResults[index];
  const modal = document.getElementById('metadata-modal');
  const viewer = document.getElementById('metadata-viewer');

  viewer.textContent = JSON.stringify({
    variation_name: r.variation_name,
    seed: r.seed,
    modifications: r.modifications,
    structured_prompt: r.structured_prompt,
    timestamp: r.timestamp
  }, null, 2);

  modal.style.display = 'flex';
}

function closeMetadataModal() {
  document.getElementById('metadata-modal').style.display = 'none';
}

async function downloadSingleImage(index) {
  const result = datasetResults[index];
  const blob = await fetch(result.image_url).then(r => r.blob());

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${result.variation_name.replace(/[^a-z0-9]/gi, '_')}.png`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ------------------------------------------------------------
   7) STYLE INJECTION (SPINNER ETC.)
------------------------------------------------------------ */

if (!document.getElementById('progressive-loading-styles')) {
  const styleEl = document.createElement('style');
  styleEl.id = 'progressive-loading-styles';
  styleEl.textContent = `
    .image-loading-placeholder {
      width: 100%; height: 250px; display:flex; flex-direction:column;
      align-items:center; justify-content:center; background: var(--bg-dark);
    }
    .spinner {
      width:40px; height:40px; border:4px solid var(--border);
      border-top-color: var(--primary); border-radius:50%;
      animation: spin 1s linear infinite;
    }
  `;
  document.head.appendChild(styleEl);
}
