/* FIBO DataForge - Dataset Generation Engine
 * Clean, Non-Repeating, Final Version */

//  1) START DATASET GENERATION
document.getElementById('results-gallery').innerHTML = '';
document.getElementById('results-section').style.display = 'none';

async function startDatasetGeneration() {
  if (!api || !baseStructuredPrompt) {
    alert('Please complete previous steps first');
    return;
  }

  datasetResults = [];
  const gallery = document.getElementById('results-gallery');
  if (gallery) gallery.innerHTML = '';

  document.getElementById('results-section').style.display = 'none';
  document.getElementById('parameters-section').style.display = 'none';
  document.getElementById('progress-section').style.display = 'block';
  document.getElementById('progress-section').scrollIntoView({ behavior: 'smooth' });

  const variations = buildVariations();

  if (!variations || variations.length === 0) {
    alert('No variations generated. Please check sweep settings or lighting.');
    return;
  }

  try {
    // ==========================================
    // STEP 1: GENERATE BASE IMAGE (0°, 0°, mid)
    // ==========================================
    updateProgressUI('Generating base reference image...', 0, variations.length + 1);

    const baseModifications = {
      rotation_degrees: 0,
      tilt_degrees: 0,
      zoom_level: 5,
      lighting_direction: variations[0].modifications.lighting_direction,
      background: variations[0].modifications.background,
      focal_length: variations[0].modifications.focal_length,
      ...getAdvancedModifications()
    };

    const baseModifiedPrompt = api.modifyStructuredPrompt(
      JSON.parse(baseStructuredPrompt),
      baseModifications
    );

    // Generate base image WITHOUT seed (get random seed)
    const baseResult = await api.generateImage(baseModifiedPrompt, null);

    const MASTER_SEED = baseResult.seed; // LOCK THIS SEED FOR ALL VARIATIONS

    console.log('MASTER SEED LOCKED:', MASTER_SEED);

    // Store base result
    datasetResults.push({
      variation_name: 'Base Reference (0°, 0°)',
      image_url: baseResult.image_url,
      seed: MASTER_SEED,
      structured_prompt: JSON.parse(baseResult.structured_prompt),
      modifications: baseModifications,
      timestamp: new Date().toISOString()
    });

    // Display base image immediately
    displaySingleResult(datasetResults[0], 0);

    // ==========================================
    // STEP 2: GENERATE VARIATIONS WITH LOCKED SEED
    // ==========================================
    for (let i = 0; i < variations.length; i++) {
      const variation = variations[i];

      try {
        updateProgressUI(
          `Generating ${variation.name}...`,
          i + 1,
          variations.length + 1
        );

        // Modify structured prompt
        const modifiedPrompt = api.modifyStructuredPrompt(
          JSON.parse(baseStructuredPrompt),
          variation.modifications
        );

        //USE THE SAME SEED FOR ALL VARIATIONS
        const result = await api.generateImage(modifiedPrompt, MASTER_SEED);

        // Add metadata
        const metadata = {
          variation_name: variation.name,
          image_url: result.image_url,
          seed: MASTER_SEED, // Same seed for all
          structured_prompt: JSON.parse(result.structured_prompt),
          modifications: variation.modifications,
          timestamp: new Date().toISOString()
        };

        datasetResults.push(metadata);
        displaySingleResult(metadata, datasetResults.length - 1);

      } catch (error) {
        console.error(`Failed to generate variation ${i}:`, error);
        // Continue with next variation
      }
    }

    // ==========================================
    // STEP 3: SHOW RESULTS
    // ==========================================
    document.getElementById('progress-section').style.display = 'none';
    displayResults();

  } catch (error) {
    alert(`Generation failed: ${error.message}`);
    document.getElementById('parameters-section').style.display = 'block';
    document.getElementById('progress-section').style.display = 'none';
  }
}

// HELPER: Update progress UI
function updateProgressUI(message, current, total) {
  const fill = document.getElementById('progress-fill');
  const text = document.getElementById('progress-text');
  const currentVar = document.getElementById('current-variation');

  const pct = ((current / total) * 100).toFixed(0);
  fill.style.width = `${pct}%`;
  fill.textContent = `${pct}%`;
  text.textContent = message;

  if (currentVar) {
    currentVar.innerHTML = `<strong>Progress:</strong> ${current}/${total}<br><small>${message}</small>`;
  }
}

// 2) BUILD VARIATIONS (RTZ × LIGHTING)
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
              focal_length: focalLength,
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
// 3) CAMERA HELPERS
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

// 4) ADVANCED PARAMETERS
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

// 5) PROGRESS BAR & LIVE IMAGE DISPLAY
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
    current.innerHTML = `<strong> Completed:</strong> ${update.name}<br><small>Seed: ${update.metadata.seed}</small>`;
    displaySingleResult(update.metadata, update.index);
  }

  if (update.status === 'error') {
    current.innerHTML = `<strong> Error:</strong> ${update.name}<br><small style="color:red;">${update.error}</small>`;
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
        <div class="reproducibility-badge" style="margin-top: 12px; padding: 12px; background: rgba(97, 47, 201, 0.1); border: 1px solid var(--primary); border-radius: 8px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
            <strong style="color: var(--primary); font-size: 0.85rem;">100% Reproducible</strong>
          </div>
          <p style="font-size: 0.75rem; color: var(--text-secondary); margin: 0;">
            Use seed <code style="
              background: rgba(0,0,0,0.3);
              padding: 2px 6px;
              border-radius: 4px;
              color: var(--accent);
              font-family: monospace;
            ">${result.seed}</code> + JSON prompt to recreate this exact image
          </p>
          <button 
            class="btn btn-small btn-secondary" 
            onclick="copyReproductionCommand(${index})"
            style="margin-top: 8px; width: 100%; font-size: 0.75rem;">
            Copy Reproduction Code
          </button>
        </div>

        <div class="gallery-item-actions">
            <button class="btn btn-small btn-primary" onclick="viewImageMetadata(${index})">View JSON</button>
            <button class="btn btn-small btn-secondary" onclick="downloadSingleImage(${index})">Download</button>
            <button class="btn btn-small btn-secondary" onclick="viewFullImage('${result.image_url}')">View Full</button>
        </div>
    </div>
  `;

  gallery.appendChild(item);
}

window.forceDownload = async function (url) {
  try {
    const response = await fetch(url);
    const blob = await response.blob();

    const fileURL = URL.createObjectURL(blob);
    const a = document.createElement('a');

    // use a safe default filename
    a.download = 'image.png';
    a.href = fileURL;
    a.style.display = 'none';

    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(fileURL);
  } catch (err) {
    console.error('Download failed:', err);
    alert('Image download failed — please try again.');
  }
};


// 6) OTHER UI HELPERS
function displayResults() {
  const section = document.getElementById('results-section');
  section.style.display = 'block';
  section.scrollIntoView({ behavior: 'smooth' });
  displayDisentanglementProof();
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
            <button class="btn btn-primary" onclick="forceDownload('${url}')">Download</button>
            <button class="btn btn-secondary" onclick="this.closest('.image-modal').remove()">Close</button>
        </div>
    </div>
  `;

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

// 7) STYLE INJECTION (SPINNER ETC.)
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

function displayDisentanglementProof() {
  const proofSection = document.getElementById('proof-section');
  const proofGrid = document.getElementById('proof-grid');

  if (!datasetResults || datasetResults.length === 0) return;

  // Group results by rotation angle
  const angleGroups = {};
  datasetResults.forEach(result => {
    const rotation = result.modifications.rotation_degrees || 0;
    if (!angleGroups[rotation]) {
      angleGroups[rotation] = [];
    }
    angleGroups[rotation].push(result);
  });

  // Get unique rotation angles
  const angles = Object.keys(angleGroups).map(Number).sort((a, b) => a - b);

  // Only show proof if we have multiple angles
  if (angles.length < 2) return;

  proofGrid.innerHTML = '';

  // Take first result from each angle (same lighting/background)
  angles.forEach(angle => {
    const result = angleGroups[angle][0];

    const item = document.createElement('div');
    item.className = 'proof-item';

    const angleLabel = angle === 0 ? 'Front' :
      angle < 0 ? `Left ${Math.abs(angle)}°` :
        `Right ${angle}°`;

    item.innerHTML = `
      <div class="proof-badge">${angleLabel}</div>
      <img src="${result.image_url}" alt="${angleLabel}" loading="eager">
      <div class="proof-label">
        Azimuth: ${angle}°<br>
        Seed: ${result.seed}
      </div>
    `;

    proofGrid.appendChild(item);
  });

  proofSection.style.display = 'block';

  // Scroll to proof after a delay
  setTimeout(() => {
    proofSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 500);
}

function copyReproductionCommand(index) {
  const result = datasetResults[index];

  if (!result) {
    console.error('Result not found at index:', index);
    alert('Error: Result data not found');
    return;
  }

  const reproCode = `// ========================================
// REPRODUCE THIS EXACT IMAGE
// ========================================
// Variation: ${result.variation_name}
// Seed: ${result.seed}
// Timestamp: ${result.timestamp}

const reproductionParams = {
  structured_prompt: ${JSON.stringify(result.structured_prompt, null, 2)},
  seed: ${result.seed},
  sync: false
};

// ========================================
// HOW TO USE:
// ========================================
// 1. Call FIBO API:
//    POST https://engine.prod.bria-api.com/v2/image/generate
//
// 2. Headers:
//    {
//      "api_token": "YOUR_API_KEY",
//      "Content-Type": "application/json"
//    }
//
// 3. Body:
//    JSON.stringify(reproductionParams)
//
// 4. Result: Identical image guaranteed!

// Example with fetch:
const response = await fetch("https://engine.prod.bria-api.com/v2/image/generate", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "api_token": "YOUR_API_KEY_HERE"
  },
  body: JSON.stringify(reproductionParams)
});

const data = await response.json();
console.log("Status URL:", data.status_url);
// Poll status_url until completion to get image_url`;

  // Use Clipboard API with fallback
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(reproCode)
      .then(() => {
        showCopySuccessToast();
      })
      .catch(err => {
        console.error('Clipboard API failed:', err);
        fallbackCopyToClipboard(reproCode);
      });
  } else {
    // Fallback for older browsers
    fallbackCopyToClipboard(reproCode);
  }
}

// FALLBACK METHOD for browsers without Clipboard API
function fallbackCopyToClipboard(text) {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.top = '0';
  textArea.style.left = '0';
  textArea.style.width = '2em';
  textArea.style.height = '2em';
  textArea.style.padding = '0';
  textArea.style.border = 'none';
  textArea.style.outline = 'none';
  textArea.style.boxShadow = 'none';
  textArea.style.background = 'transparent';

  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    const successful = document.execCommand('copy');
    if (successful) {
      showCopySuccessToast();
    } else {
      showCopyErrorToast();
    }
  } catch (err) {
    console.error('Fallback copy failed:', err);
    showCopyErrorToast();
  }

  document.body.removeChild(textArea);
}

// SUCCESS TOAST
function showCopySuccessToast() {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    bottom: 30px;
    right: 30px;
    background: linear-gradient(135deg, #10b981, #059669);
    color: white;
    padding: 16px 24px;
    border-radius: 12px;
    box-shadow: 0 10px 30px rgba(16, 185, 129, 0.4);
    z-index: 10000;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 12px;
    animation: slideInUp 0.3s ease-out;
  `;
  toast.innerHTML = `
    <span>Reproduction code copied to clipboard!</span>
  `;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideOutDown 0.3s ease-in';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ERROR TOAST
function showCopyErrorToast() {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    bottom: 30px;
    right: 30px;
    background: linear-gradient(135deg, #ef4444, #dc2626);
    color: white;
    padding: 16px 24px;
    border-radius: 12px;
    box-shadow: 0 10px 30px rgba(239, 68, 68, 0.4);
    z-index: 10000;
    font-weight: 600;
  `;
  toast.textContent = 'Failed to copy. Please try again.';

  document.body.appendChild(toast);

  setTimeout(() => toast.remove(), 3000);
}

// ADD ANIMATIONS TO style.css
const style = document.createElement('style');
style.textContent = `
  @keyframes slideInUp {
    from {
      transform: translateY(100px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOutDown {
    from {
      transform: translateY(0);
      opacity: 1;
    }
    to {
      transform: translateY(100px);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);