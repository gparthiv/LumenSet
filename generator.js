/**
 * FIBO DataForge - Dataset Generation Engine
 * Handles parameter sweeps and dataset creation
 */

// Start dataset generation from UI
async function startDatasetGeneration() {
  if (!api || !baseStructuredPrompt) {
    alert('Please complete previous steps first');
    return;
  }

  // Hide parameters section, show progress
  document.getElementById('parameters-section').style.display = 'none';
  document.getElementById('progress-section').style.display = 'block';
  document.getElementById('progress-section').scrollIntoView({ behavior: 'smooth' });

  // Get selected parameters
  const variations = buildVariations();

  if (variations.length === 0) {
    alert('Please select at least one camera angle and lighting direction');
    return;
  }

  // Reset results
  datasetResults = [];

  // Generate dataset
  try {
    const results = await api.generateDataset(
      baseStructuredPrompt,
      variations,
      onGenerationProgress
    );

    datasetResults = results;

    // Show results
    document.getElementById('progress-section').style.display = 'none';
    displayResults(results);

  } catch (error) {
    alert(`Generation failed: ${error.message}`);
    document.getElementById('parameters-section').style.display = 'block';
    document.getElementById('progress-section').style.display = 'none';
  }
}

// Build variations array from UI selections
function buildVariations() {
  const variations = [];

  // Get sweep settings
  const rotationSweep = document.getElementById('enable-rotation-sweep')?.checked || false;
  const tiltSweep = document.getElementById('enable-tilt-sweep')?.checked || false;
  const zoomSweep = document.getElementById('enable-zoom-sweep')?.checked || false;

  // Get current slider values (for single-angle mode)
  const currentRotation = parseInt(document.getElementById('rotation-slider')?.value || 0);
  const currentTilt = parseInt(document.getElementById('tilt-slider')?.value || 0);
  const currentZoom = parseInt(document.getElementById('zoom-slider')?.value || 5);

  // Define sweep ranges
  const rotationAngles = rotationSweep ? [-90, -45, 0, 45, 90] : [currentRotation];
  const tiltAngles = tiltSweep ? [-45, 0, 45] : [currentTilt];
  const zoomLevels = zoomSweep ? [0, 5, 10] : [currentZoom];

  // Get lighting selection
  const selectedLighting = document.querySelector('.lighting-presets input[type="radio"]:checked')?.value || 'front-lit';

  // Get background
  const background = document.querySelector('input[name="background"]:checked')?.value || 'white-studio';
  const focalLength = document.querySelector('input[name="focal-length"]:checked')?.value || 'standard';

  // Get advanced parameters
  const advancedMods = getAdvancedModifications();

  // Generate all combinations
  let counter = 1;
  for (const rotation of rotationAngles) {
    for (const tilt of tiltAngles) {
      for (const zoom of zoomLevels) {
        // Convert rotation/tilt/zoom to camera angle description
        const cameraAngle = getCameraAngleFromRTZ(rotation, tilt);
        const distance = getDistanceFromZoom(zoom);

        variations.push({
          name: `Variation ${counter}: ${formatRTZ(rotation, tilt, zoom)}`,
          modifications: {
            // Camera position
            camera_angle: cameraAngle,
            camera_distance: distance,
            rotation_degrees: rotation,
            tilt_degrees: tilt,
            zoom_level: zoom,

            // Lighting
            lighting_direction: selectedLighting,

            // Basic parameters
            background: background,
            focal_length: focalLength,

            // Advanced parameters
            ...advancedMods
          }
        });
        counter++;
      }
    }
  }

  return variations;
}

// Helper: Convert rotation/tilt / zoom to camera angle description
function getCameraAngleFromRTZ(rotation, tilt) {
  // Tilt determines vertical angle
  let angle = '';
  if (tilt <= -30) {
    angle = 'high-angle';
  } else if (tilt >= 30) {
    angle = 'low-angle';
  } else if (tilt === 0 && rotation === 0) {
    angle = 'eye-level';
  } else {
    angle = 'eye-level'; // Default for intermediate angles
  }

  // For extreme tilts, use overhead
  if (tilt <= -45) {
    angle = 'overhead';
  }

  return angle;
}

// Helper: Convert zoom to distance
function getDistanceFromZoom(zoom) {
  if (zoom === 0) return 'close';
  if (zoom === 5) return 'mid';
  if (zoom === 10) return 'far';
  return 'mid'; // Default
}

// Helper: Format rotation/tilt/zoom for display
function formatRTZ(rotation, tilt, zoom) {
  const rotLabel = rotation === 0 ? 'Front' :
    rotation < 0 ? `Left ${Math.abs(rotation)}°` :
      `Right ${rotation}°`;

  const tiltLabel = tilt === 0 ? 'Level' :
    tilt < 0 ? `Up ${Math.abs(tilt)}°` :
      `Down ${tilt}°`;

  const zoomLabel = zoom === 0 ? 'Close' :
    zoom === 5 ? 'Mid' :
      'Far';

  return `${rotLabel}, ${tiltLabel}, ${zoomLabel}`;
}

// Helper: Get advanced modifications
function getAdvancedModifications() {
  const mods = {};/**
 * FIBO DataForge - Dataset Generation Engine
 * Handles parameter sweeps and dataset creation
 */

// Start dataset generation from UI
async function startDatasetGeneration() {
  if (!api || !baseStructuredPrompt) {
    alert('Please complete previous steps first');
    return;
  }

  // Hide parameters section, show progress
  document.getElementById('parameters-section').style.display = 'none';
  document.getElementById('progress-section').style.display = 'block';
  document.getElementById('progress-section').scrollIntoView({ behavior: 'smooth' });

  // Get selected parameters
  const variations = buildVariations();

  if (variations.length === 0) {
    alert('Please select at least one camera angle and lighting direction');
    return;
  }

  // Reset results
  datasetResults = [];

  // Generate dataset
  try {
    const results = await api.generateDataset(
      baseStructuredPrompt,
      variations,
      onGenerationProgress
    );

    datasetResults = results;

    // Show results
    document.getElementById('progress-section').style.display = 'none';
    displayResults(results);

  } catch (error) {
    alert(`Generation failed: ${error.message}`);
    document.getElementById('parameters-section').style.display = 'block';
    document.getElementById('progress-section').style.display = 'none';
  }
}

// Build variations array from UI selections
function buildVariations() {
  const variations = [];

  // Get sweep settings
  const rotationSweep = document.getElementById('enable-rotation-sweep')?.checked || false;
  const tiltSweep = document.getElementById('enable-tilt-sweep')?.checked || false;
  const zoomSweep = document.getElementById('enable-zoom-sweep')?.checked || false;

  // Get current slider values (for single-angle mode)
  const currentRotation = parseInt(document.getElementById('rotation-slider')?.value || 0);
  const currentTilt = parseInt(document.getElementById('tilt-slider')?.value || 0);
  const currentZoom = parseInt(document.getElementById('zoom-slider')?.value || 5);

  // Define sweep ranges
  const rotationAngles = rotationSweep ? [-90, -45, 0, 45, 90] : [currentRotation];
  const tiltAngles = tiltSweep ? [-45, 0, 45] : [currentTilt];
  const zoomLevels = zoomSweep ? [0, 5, 10] : [currentZoom];

  // Get lighting selection
  const selectedLighting = document.querySelector('.lighting-presets input[type="radio"]:checked')?.value || 'front-lit';

  // Get background
  const background = document.querySelector('input[name="background"]:checked')?.value || 'white-studio';
  const focalLength = document.querySelector('input[name="focal-length"]:checked')?.value || 'standard';

  // Get advanced parameters
  const advancedMods = getAdvancedModifications();

  // Generate all combinations
  let counter = 1;
  for (const rotation of rotationAngles) {
    for (const tilt of tiltAngles) {
      for (const zoom of zoomLevels) {
        // Convert rotation/tilt/zoom to camera angle description
        const cameraAngle = getCameraAngleFromRTZ(rotation, tilt);
        const distance = getDistanceFromZoom(zoom);

        variations.push({
          name: `Variation ${counter}: ${formatRTZ(rotation, tilt, zoom)}`,
          modifications: {
            // Camera position
            camera_angle: cameraAngle,
            camera_distance: distance,
            rotation_degrees: rotation,
            tilt_degrees: tilt,
            zoom_level: zoom,

            // Lighting
            lighting_direction: selectedLighting,

            // Basic parameters
            background: background,
            focal_length: focalLength,

            // Advanced parameters
            ...advancedMods
          }
        });
        counter++;
      }
    }
  }

  return variations;
}

// Helper: Convert rotation/tilt / zoom to camera angle description
function getCameraAngleFromRTZ(rotation, tilt) {
  // Tilt determines vertical angle
  let angle = '';
  if (tilt <= -30) {
    angle = 'high-angle';
  } else if (tilt >= 30) {
    angle = 'low-angle';
  } else if (tilt === 0 && rotation === 0) {
    angle = 'eye-level';
  } else {
    angle = 'eye-level'; // Default for intermediate angles
  }

  // For extreme tilts, use overhead
  if (tilt <= -45) {
    angle = 'overhead';
  }

  return angle;
}

// Helper: Convert zoom to distance
function getDistanceFromZoom(zoom) {
  if (zoom === 0) return 'close';
  if (zoom === 5) return 'mid';
  if (zoom === 10) return 'far';
  return 'mid'; // Default
}

// Helper: Format rotation/tilt/zoom for display
function formatRTZ(rotation, tilt, zoom) {
  const rotLabel = rotation === 0 ? 'Front' :
    rotation < 0 ? `Left ${Math.abs(rotation)}°` :
      `Right ${rotation}°`;

  const tiltLabel = tilt === 0 ? 'Level' :
    tilt < 0 ? `Up ${Math.abs(tilt)}°` :
      `Down ${tilt}°`;

  const zoomLabel = zoom === 0 ? 'Close' :
    zoom === 5 ? 'Mid' :
      'Far';

  return `${rotLabel}, ${tiltLabel}, ${zoomLabel}`;
}

// Helper: Get advanced modifications
function getAdvancedModifications() {
  const mods = {};

  // Color control
  if (document.getElementById('use-exact-colors')?.checked) {
    mods.background_color_hex = document.getElementById('bg-color-hex')?.value;
    mods.surface_color_hex = document.getElementById('surface-color-hex')?.value;
  }

  // Surface & material
  mods.surface_finish = document.getElementById('surface-finish')?.value;
  mods.surface_tone = document.getElementById('surface-tone')?.value;

  // Lighting detail
  mods.lighting_contrast = document.getElementById('lighting-contrast')?.value;
  mods.shadow_behavior = document.getElementById('shadow-behavior')?.value;
  mods.color_temperature = document.getElementById('color-temperature')?.value;

  // Camera technical
  mods.aperture = document.getElementById('aperture')?.value;

  // Composition
  mods.negative_space = document.getElementById('negative-space')?.value;

  // Imperfections
  if (document.getElementById('add-imperfections')?.checked) {
    mods.add_imperfections = true;
    mods.imperfection_types = Array.from(
      document.querySelectorAll('#imperfection-types input:checked')
    ).map(cb => cb.value);
  }

  // Mood
  const selectedMoods = Array.from(
    document.querySelectorAll('#mood-options input:checked')
  ).map(cb => cb.value);
  if (selectedMoods.length > 0) {
    mods.mood = selectedMoods;
  }

  return mods;
}

// Format parameter name for display
function formatName(value) {
  return value.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// Handle generation progress updates - ENHANCED WITH PROGRESSIVE DISPLAY
function onGenerationProgress(update) {
  const progressFill = document.getElementById('progress-fill');
  const progressText = document.getElementById('progress-text');
  const currentVariation = document.getElementById('current-variation');

  const percentage = ((update.index + 1) / update.total * 100).toFixed(0);
  progressFill.style.width = `${percentage}%`;
  progressFill.textContent = `${percentage}%`;

  if (update.status === 'generating') {
    progressText.textContent = `Generating ${update.name}... (${update.index + 1}/${update.total})`;
    currentVariation.innerHTML = `
            <strong>Current:</strong> ${update.name}<br>
            <small>Progress: ${(update.progress * 100).toFixed(0)}%</small>
        `;
  } else if (update.status === 'completed') {
    progressText.textContent = `Completed ${update.name} (${update.index + 1}/${update.total})`;
    currentVariation.innerHTML = `
            <strong>✅ Completed:</strong> ${update.name}<br>
            <small>Seed: ${update.metadata.seed}</small>
        `;

    // ===== PROGRESSIVE DISPLAY: Show image immediately =====
    displaySingleResult(update.metadata, update.index);

    // Auto-scroll to show new image
    const gallery = document.getElementById('results-gallery');
    if (gallery && gallery.lastChild) {
      gallery.lastChild.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

  } else if (update.status === 'error') {
    console.error(`Failed: ${update.name}`, update.error);
    currentVariation.innerHTML = `
            <strong>❌ Error:</strong> ${update.name}<br>
            <small style="color: var(--error);">${update.error}</small>
        `;
  }
}

// NEW FUNCTION: Display single result immediately
function displaySingleResult(result, index) {
  // Ensure results section is visible
  const resultsSection = document.getElementById('results-section');
  if (resultsSection.style.display === 'none') {
    resultsSection.style.display = 'block';
    // Don't scroll here - let it stay in view while generating
  }

  const gallery = document.getElementById('results-gallery');

  // Create gallery item
  const item = document.createElement('div');
  item.className = 'gallery-item';
  item.style.opacity = '0';
  item.style.transform = 'translateY(20px)';
  item.innerHTML = `
        <div class="image-loading-placeholder">
            <div class="spinner"></div>
            <small>Loading image...</small>
        </div>
        <img src="${result.image_url}" 
             alt="${result.variation_name}" 
             loading="eager"
             style="display: none;"
             onload="this.style.display='block'; this.previousElementSibling.remove(); this.parentElement.style.opacity='1'; this.parentElement.style.transform='translateY(0)';">
        <div class="gallery-item-info">
            <h4>${result.variation_name}</h4>
            <p><strong>Seed:</strong> ${result.seed}</p>
            <p><strong>Camera:</strong> ${formatName(result.modifications.camera_angle)}</p>
            <p><strong>Lighting:</strong> ${formatName(result.modifications.lighting_direction)}</p>
            <div class="gallery-item-actions">
                <button class="btn btn-small btn-primary" onclick="viewImageMetadata(${index})">
                    View JSON
                </button>
                <button class="btn btn-small btn-secondary" onclick="downloadSingleImage(${index})">
                    Download
                </button>
                <button class="btn btn-small btn-secondary" onclick="viewFullImage('${result.image_url}')">
                    🔍 View Full
                </button>
            </div>
        </div>
    `;

  gallery.appendChild(item);

  // Animate entrance
  setTimeout(() => {
    item.style.transition = 'all 0.5s ease';
  }, 10);
}

// NEW FUNCTION: View full-size image in modal
function viewFullImage(imageUrl) {
  const modal = document.createElement('div');
  modal.className = 'image-modal';
  modal.innerHTML = `
        <div class="image-modal-backdrop" onclick="this.parentElement.remove()">
            <div class="image-modal-content" onclick="event.stopPropagation()">
                <span class="close" onclick="this.closest('.image-modal').remove()">&times;</span>
                <img src="${imageUrl}" alt="Full size image">
                <div class="image-modal-controls">
                    <a href="${imageUrl}" download class="btn btn-primary">Download</a>
                    <button class="btn btn-secondary" onclick="this.closest('.image-modal').remove()">Close</button>
                </div>
            </div>
        </div>
    `;
  document.body.appendChild(modal);
}

// Display results in gallery
// UPDATED: Display results - now just shows actions, gallery already populated
function displayResults(results) {
  const resultsSection = document.getElementById('results-section');
  resultsSection.style.display = 'block';
  resultsSection.scrollIntoView({ behavior: 'smooth' });

  // Gallery already populated progressively
  // Just ensure results section is visible
}

// View single image metadata
function viewImageMetadata(index) {
  const result = datasetResults[index];
  const modal = document.getElementById('metadata-modal');
  const viewer = document.getElementById('metadata-viewer');

  viewer.textContent = JSON.stringify({
    variation_name: result.variation_name,
    seed: result.seed,
    modifications: result.modifications,
    structured_prompt: result.structured_prompt,
    timestamp: result.timestamp
  }, null, 2);

  modal.style.display = 'flex';
}

// View all metadata
function viewMetadata() {
  const modal = document.getElementById('metadata-modal');
  const viewer = document.getElementById('metadata-viewer');

  const manifestData = {
    generated_at: new Date().toISOString(),
    total_variations: datasetResults.length,
    base_description: document.getElementById('object-description').value,
    variations: datasetResults.map(r => ({
      name: r.variation_name,
      seed: r.seed,
      modifications: r.modifications,
      image_url: r.image_url
    }))
  };

  viewer.textContent = JSON.stringify(manifestData, null, 2);
  modal.style.display = 'flex';
}

// Close metadata modal
function closeMetadataModal() {
  document.getElementById('metadata-modal').style.display = 'none';
}

// Download single image
async function downloadSingleImage(index) {
  const result = datasetResults[index];

  try {
    const response = await fetch(result.image_url);
    const blob = await response.blob();

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sanitizeFilename(result.variation_name)}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    alert('Download failed: ' + error.message);
  }
}

// Sanitize filename
function sanitizeFilename(name) {
  return name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
}

// Close modal on outside click
window.onclick = function (event) {
  const modal = document.getElementById('metadata-modal');
  if (event.target === modal) {
    modal.style.display = 'none';
  }
};

// ADD TO style.css for loading animation
const loadingStyles = `
.image-loading-placeholder {
    width: 100%;
    height: 250px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: var(--bg-dark);
}

.spinner {
    width: 40px;
    height: 40px;
    border: 4px solid var(--border);
    border-top-color: var(--primary);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 10px;
}

.gallery-item {
    transition: opacity 0.5s ease, transform 0.5s ease;
}

/* Full image modal */
.image-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 2000;
    display: flex;
    align-items: center;
    justify-content: center;
}

.image-modal-backdrop {
    position: absolute;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.95);
    cursor: pointer;
}

.image-modal-content {
    position: relative;
    max-width: 90vw;
    max-height: 90vh;
    background: var(--bg-card);
    padding: 20px;
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    gap: 15px;
}

.image-modal-content img {
    max-width: 100%;
    max-height: 70vh;
    object-fit: contain;
    border-radius: 8px;
}

.image-modal-content .close {
    position: absolute;
    right: 10px;
    top: 10px;
    font-size: 2rem;
    color: var(--text-primary);
    cursor: pointer;
    background: var(--bg-dark);
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
}

.image-modal-controls {
    display: flex;
    gap: 10px;
    justify-content: center;
}
`;

// Inject styles if not already present
if (!document.getElementById('progressive-loading-styles')) {
  const styleEl = document.createElement('style');
  styleEl.id = 'progressive-loading-styles';
  styleEl.textContent = loadingStyles;
  document.head.appendChild(styleEl);
}

  // Color control
  if (document.getElementById('use-exact-colors')?.checked) {
    mods.background_color_hex = document.getElementById('bg-color-hex')?.value;
    mods.surface_color_hex = document.getElementById('surface-color-hex')?.value;
  }

  // Surface & material
  mods.surface_finish = document.getElementById('surface-finish')?.value;
  mods.surface_tone = document.getElementById('surface-tone')?.value;

  // Lighting detail
  mods.lighting_contrast = document.getElementById('lighting-contrast')?.value;
  mods.shadow_behavior = document.getElementById('shadow-behavior')?.value;
  mods.color_temperature = document.getElementById('color-temperature')?.value;

  // Camera technical
  mods.aperture = document.getElementById('aperture')?.value;

  // Composition
  mods.negative_space = document.getElementById('negative-space')?.value;

  // Imperfections
  if (document.getElementById('add-imperfections')?.checked) {
    mods.add_imperfections = true;
    mods.imperfection_types = Array.from(
      document.querySelectorAll('#imperfection-types input:checked')
    ).map(cb => cb.value);
  }

  // Mood
  const selectedMoods = Array.from(
    document.querySelectorAll('#mood-options input:checked')
  ).map(cb => cb.value);
  if (selectedMoods.length > 0) {
    mods.mood = selectedMoods;
  }

  return mods;
}

// Format parameter name for display
function formatName(value) {
  return value.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// Handle generation progress updates - ENHANCED WITH PROGRESSIVE DISPLAY
function onGenerationProgress(update) {
  const progressFill = document.getElementById('progress-fill');
  const progressText = document.getElementById('progress-text');
  const currentVariation = document.getElementById('current-variation');

  const percentage = ((update.index + 1) / update.total * 100).toFixed(0);
  progressFill.style.width = `${percentage}%`;
  progressFill.textContent = `${percentage}%`;

  if (update.status === 'generating') {
    progressText.textContent = `Generating ${update.name}... (${update.index + 1}/${update.total})`;
    currentVariation.innerHTML = `
            <strong>Current:</strong> ${update.name}<br>
            <small>Progress: ${(update.progress * 100).toFixed(0)}%</small>
        `;
  } else if (update.status === 'completed') {
    progressText.textContent = `Completed ${update.name} (${update.index + 1}/${update.total})`;
    currentVariation.innerHTML = `
            <strong>✅ Completed:</strong> ${update.name}<br>
            <small>Seed: ${update.metadata.seed}</small>
        `;

    // ===== PROGRESSIVE DISPLAY: Show image immediately =====
    displaySingleResult(update.metadata, update.index);

    // Auto-scroll to show new image
    const gallery = document.getElementById('results-gallery');
    if (gallery && gallery.lastChild) {
      gallery.lastChild.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

  } else if (update.status === 'error') {
    console.error(`Failed: ${update.name}`, update.error);
    currentVariation.innerHTML = `
            <strong>❌ Error:</strong> ${update.name}<br>
            <small style="color: var(--error);">${update.error}</small>
        `;
  }
}

// NEW FUNCTION: Display single result immediately
function displaySingleResult(result, index) {
  // Ensure results section is visible
  const resultsSection = document.getElementById('results-section');
  if (resultsSection.style.display === 'none') {
    resultsSection.style.display = 'block';
    // Don't scroll here - let it stay in view while generating
  }

  const gallery = document.getElementById('results-gallery');

  // Create gallery item
  const item = document.createElement('div');
  item.className = 'gallery-item';
  item.style.opacity = '0';
  item.style.transform = 'translateY(20px)';
  item.innerHTML = `
        <div class="image-loading-placeholder">
            <div class="spinner"></div>
            <small>Loading image...</small>
        </div>
        <img src="${result.image_url}" 
             alt="${result.variation_name}" 
             loading="eager"
             style="display: none;"
             onload="this.style.display='block'; this.previousElementSibling.remove(); this.parentElement.style.opacity='1'; this.parentElement.style.transform='translateY(0)';">
        <div class="gallery-item-info">
            <h4>${result.variation_name}</h4>
            <p><strong>Seed:</strong> ${result.seed}</p>
            <p><strong>Camera:</strong> ${formatName(result.modifications.camera_angle)}</p>
            <p><strong>Lighting:</strong> ${formatName(result.modifications.lighting_direction)}</p>
            <div class="gallery-item-actions">
                <button class="btn btn-small btn-primary" onclick="viewImageMetadata(${index})">
                    View JSON
                </button>
                <button class="btn btn-small btn-secondary" onclick="downloadSingleImage(${index})">
                    Download
                </button>
                <button class="btn btn-small btn-secondary" onclick="viewFullImage('${result.image_url}')">
                    🔍 View Full
                </button>
            </div>
        </div>
    `;

  gallery.appendChild(item);

  // Animate entrance
  setTimeout(() => {
    item.style.transition = 'all 0.5s ease';
  }, 10);
}

// NEW FUNCTION: View full-size image in modal
function viewFullImage(imageUrl) {
  const modal = document.createElement('div');
  modal.className = 'image-modal';
  modal.innerHTML = `
        <div class="image-modal-backdrop" onclick="this.parentElement.remove()">
            <div class="image-modal-content" onclick="event.stopPropagation()">
                <span class="close" onclick="this.closest('.image-modal').remove()">&times;</span>
                <img src="${imageUrl}" alt="Full size image">
                <div class="image-modal-controls">
                    <a href="${imageUrl}" download class="btn btn-primary">Download</a>
                    <button class="btn btn-secondary" onclick="this.closest('.image-modal').remove()">Close</button>
                </div>
            </div>
        </div>
    `;
  document.body.appendChild(modal);
}

// Display results in gallery
// UPDATED: Display results - now just shows actions, gallery already populated
function displayResults(results) {
  const resultsSection = document.getElementById('results-section');
  resultsSection.style.display = 'block';
  resultsSection.scrollIntoView({ behavior: 'smooth' });

  // Gallery already populated progressively
  // Just ensure results section is visible
}

// View single image metadata
function viewImageMetadata(index) {
  const result = datasetResults[index];
  const modal = document.getElementById('metadata-modal');
  const viewer = document.getElementById('metadata-viewer');

  viewer.textContent = JSON.stringify({
    variation_name: result.variation_name,
    seed: result.seed,
    modifications: result.modifications,
    structured_prompt: result.structured_prompt,
    timestamp: result.timestamp
  }, null, 2);

  modal.style.display = 'flex';
}

// View all metadata
function viewMetadata() {
  const modal = document.getElementById('metadata-modal');
  const viewer = document.getElementById('metadata-viewer');

  const manifestData = {
    generated_at: new Date().toISOString(),
    total_variations: datasetResults.length,
    base_description: document.getElementById('object-description').value,
    variations: datasetResults.map(r => ({
      name: r.variation_name,
      seed: r.seed,
      modifications: r.modifications,
      image_url: r.image_url
    }))
  };

  viewer.textContent = JSON.stringify(manifestData, null, 2);
  modal.style.display = 'flex';
}

// Close metadata modal
function closeMetadataModal() {
  document.getElementById('metadata-modal').style.display = 'none';
}

// Download single image
async function downloadSingleImage(index) {
  const result = datasetResults[index];

  try {
    const response = await fetch(result.image_url);
    const blob = await response.blob();

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sanitizeFilename(result.variation_name)}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    alert('Download failed: ' + error.message);
  }
}

// Sanitize filename
function sanitizeFilename(name) {
  return name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
}

// Close modal on outside click
window.onclick = function (event) {
  const modal = document.getElementById('metadata-modal');
  if (event.target === modal) {
    modal.style.display = 'none';
  }
};

// ADD TO style.css for loading animation
const loadingStyles = `
.image-loading-placeholder {
    width: 100%;
    height: 250px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: var(--bg-dark);
}

.spinner {
    width: 40px;
    height: 40px;
    border: 4px solid var(--border);
    border-top-color: var(--primary);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 10px;
}

.gallery-item {
    transition: opacity 0.5s ease, transform 0.5s ease;
}

/* Full image modal */
.image-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 2000;
    display: flex;
    align-items: center;
    justify-content: center;
}

.image-modal-backdrop {
    position: absolute;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.95);
    cursor: pointer;
}

.image-modal-content {
    position: relative;
    max-width: 90vw;
    max-height: 90vh;
    background: var(--bg-card);
    padding: 20px;
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    gap: 15px;
}

.image-modal-content img {
    max-width: 100%;
    max-height: 70vh;
    object-fit: contain;
    border-radius: 8px;
}

.image-modal-content .close {
    position: absolute;
    right: 10px;
    top: 10px;
    font-size: 2rem;
    color: var(--text-primary);
    cursor: pointer;
    background: var(--bg-dark);
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
}

.image-modal-controls {
    display: flex;
    gap: 10px;
    justify-content: center;
}
`;

// Inject styles if not already present
if (!document.getElementById('progressive-loading-styles')) {
  const styleEl = document.createElement('style');
  styleEl.id = 'progressive-loading-styles';
  styleEl.textContent = loadingStyles;
  document.head.appendChild(styleEl);
}