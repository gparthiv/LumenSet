// --------------------------------------------------------------------------
// INLINE LOGIC & UI GLUE CODE
// --------------------------------------------------------------------------

// Global state
let api = null;
let baseStructuredPrompt = null;
let datasetResults = [];
let referenceImageBase64 = null;
let currentInputMode = 'text';
let selectedDatasetSize = 'quick';

// Preview reference image
function previewReferenceImage(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    alert('Please upload an image file');
    return;
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    const base64Data = e.target.result;
    referenceImageBase64 = base64Data.split(',')[1];

    const preview = document.getElementById('image-preview');
    preview.innerHTML = `
            <div class="image-preview-container">
                <img src="${base64Data}" class="preview-image" alt="Reference">
                <div class="preview-info">
                    <p><strong>Image Loaded</strong></p>
                    <p>Size: ${(file.size / 1024).toFixed(2)} KB</p>
                    <p>Type: ${file.type}</p>
                    <small style="color: var(--success);">This image will guide all variations</small>
                </div>
            </div>
        `;
    console.log('Reference image loaded:', referenceImageBase64.substring(0, 50) + '...');
  };
  reader.readAsDataURL(file);
}

// --------------------------------------------------------------------------
// UI UPDATERS
// --------------------------------------------------------------------------
function updateRotationValue(value) {
  const display = document.getElementById('rotation-value');
  if (display) {
    display.textContent = `${value}°`;
  }
  updateCameraPreview();
  updateAngleSweepCount();
}

function updateTiltValue(value) {
  const display = document.getElementById('tilt-value');
  if (display) {
    display.textContent = `${value}°`;
  }
  updateCameraPreview();
  updateAngleSweepCount();
}

function updateZoomValue(value) {
  const display = document.getElementById('zoom-value');
  if (display) {
    const labels = { 0: 'Close', 5: 'Mid', 10: 'Far' };
    display.textContent = labels[value] || value;
  }
  updateCameraPreview();
  updateAngleSweepCount();
}

// --------------------------------------------------------------------------
// DOM READY INITIALIZATION
// --------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {

  const defaultKey = '85ac20704c3149dc902dab0c727c1995';
  const configKey = window.CONFIG?.BRIA_API_KEY;

  if (!configKey || configKey === defaultKey || configKey.includes('YOUR_API_KEY')) {
    // Show API key modal on load
    document.getElementById('api-key-modal').style.display = 'flex';
  } else {
    // Valid key exists, initialize normally
    api = new BriaFIBOAPI(configKey);
    document.getElementById('object-section').style.display = 'block';
    console.log('API initialized with existing key');
  }

  // Init API automatically if config provided
  if (window.CONFIG && window.CONFIG.BRIA_API_KEY && !window.CONFIG.BRIA_API_KEY.includes('YOUR_API_KEY')) {
    api = new BriaFIBOAPI(window.CONFIG.BRIA_API_KEY);
    console.log('API initialized automatically');
    document.getElementById('object-section').style.display = 'block';
  } else {
    console.warn('BRIA_API_KEY not configured or default placeholder detected.');
  }

  // Initial preview and counts
  updateCameraPreview();
  updateAngleSweepCount();
  updateGenerationModeIndicator(); // Ensure indicator is set on load
  updateQueueDisplay(); // Initialize queue display

  // Wire sweep checkboxes
  ['enable-rotation-sweep', 'enable-tilt-sweep', 'enable-zoom-sweep'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', updateAngleSweepCount);
  });

  // Sliders
  ['rotation-slider', 'tilt-slider', 'zoom-slider'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', () => {
      updateCameraPreview();
      updateAngleSweepCount();
    });
  });

  // Lighting checkboxes
  document.querySelectorAll('.lighting-presets input[type="checkbox"], #lighting-directions input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', updateAngleSweepCount);
  });

  // Wire dataset-size buttons
  document.querySelectorAll('.size-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const ds = btn.dataset.size || btn.getAttribute('data-size') || 'quick';
      setDatasetSize(ds, e);
    });
  });

  // Wire preset-select
  const presetSelect = document.getElementById('preset-select');
  if (presetSelect) presetSelect.addEventListener('change', applyPreset);

  // HEX color picker toggle
  const uec = document.getElementById('use-exact-colors');
  if (uec) {
    uec.addEventListener('change', () => {
      const colorInputs = document.getElementById('color-inputs');
      if (colorInputs) {
        colorInputs.style.display = uec.checked ? 'block' : 'none';
      }
    });
  }

  // Sync color picker → hex field
  const hexInput = document.getElementById('bg-color-hex');
  const colorPicker = document.getElementById('bg-color');

  if (colorPicker && hexInput) {
    colorPicker.addEventListener('input', () => {
      hexInput.value = colorPicker.value.toUpperCase();
    });

    hexInput.addEventListener('input', () => {
      if (/^#([0-9A-F]{3}){1,2}$/i.test(hexInput.value)) {
        colorPicker.value = hexInput.value;
      }
    });
  }
});

// --------------------------------------------------------------------------
// CORE FUNCTIONALITY
// --------------------------------------------------------------------------

function switchInputMode(mode) {
  currentInputMode = mode;
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  const tabs = Array.from(document.querySelectorAll('.tab'));
  const activeTab = mode === 'text' ? tabs[0] : tabs[1];
  if (activeTab) activeTab.classList.add('active');

  document.getElementById('text-input-mode').style.display = mode === 'text' ? 'block' : 'none';
  document.getElementById('image-input-mode').style.display = mode === 'image' ? 'block' : 'none';
}

async function generateBasePrompt() {
  if (!api) {
    alert('Please initialize API first');
    return;
  }

  const statusEl = document.getElementById('base-generation-status');
  statusEl.innerHTML = '<div class="loading">Generating structured prompt...</div>';

  try {
    let prompt, images = null;

    if (currentInputMode === 'image') {
      if (!referenceImageBase64) {
        alert('Please upload a reference image first');
        statusEl.innerHTML = '<div class="error"> No reference image uploaded</div>';
        return;
      }

      const context = document.getElementById('image-context').value.trim();
      prompt = context ? `Create variations of this subject maintaining exact visual characteristics. ${context}` :
        'Create variations of this subject, maintaining all visual characteristics, proportions, colors, textures, and identity across different camera angles and lighting conditions.';
      images = [referenceImageBase64];
    } else {
      prompt = document.getElementById('object-description').value.trim();
      if (!prompt) {
        alert('Please enter an object description');
        statusEl.innerHTML = '';
        return;
      }
    }

    const result = await api.generateStructuredPrompt(prompt, images, (attempt, max) => {
      statusEl.innerHTML = `<div class="loading">Processing with ${currentInputMode === 'image' ? 'reference image' : 'text description'}... (${attempt}/${max})</div>`;
    });

    baseStructuredPrompt = result.structured_prompt;
    statusEl.innerHTML = `<div class="success"> Base structure generated from ${currentInputMode === 'image' ? 'reference image' : 'description'}!</div>`;
    console.log('Structured prompt generated:', result);

    setTimeout(() => {
      document.getElementById('parameters-section').style.display = 'block';
      document.getElementById('parameters-section').scrollIntoView({
        behavior: 'smooth'
      });
      updateAngleSweepCount();
    }, 250);

  } catch (error) {
    console.error('Generation error:', error);
    statusEl.innerHTML = `<div class="error"> Error: ${error.message}</div>`;
  }
}

function updateCameraPreview() {
  const rotation = parseInt(document.getElementById('rotation-slider').value);
  const tilt = parseInt(document.getElementById('tilt-slider').value);
  const zoom = parseInt(document.getElementById('zoom-slider').value);

  const object = document.getElementById('preview-object');
  if (object) object.style.transform = `rotateY(${rotation}deg) rotateX(${-tilt}deg)`;

  const camera = document.getElementById('camera-indicator');
  if (camera) {
    const radius = 60 + (zoom * 5);
    const angleRad = (rotation * Math.PI) / 180;
    const tiltRad = (tilt * Math.PI) / 180;
    const x = 50 + Math.sin(angleRad) * radius;
    const y = 50 + Math.sin(tiltRad) * 30;
    camera.style.left = x + '%';
    camera.style.top = y + '%';
  }

  const rotationLabel = rotation < -30 ? 'Left' : rotation > 30 ? 'Right' : 'Front';
  const tiltLabel = tilt < -15 ? 'High' : tilt > 15 ? 'Low' : 'Eye-Level';
  const zoomLabel = zoom === 0 ? 'Close' : zoom === 5 ? 'Mid-Distance' : 'Far';
  const previewLabelEl = document.getElementById('preview-position');
  if (previewLabelEl) previewLabelEl.textContent = `${rotationLabel}, ${tiltLabel}, ${zoomLabel}`;
}

function updateAngleSweepCount() {
  const rotationSweep = document.getElementById('enable-rotation-sweep')?.checked;
  const tiltSweep = document.getElementById('enable-tilt-sweep')?.checked;
  const zoomSweep = document.getElementById('enable-zoom-sweep')?.checked;

  let autoSweepCount = 1;
  const detail = [];

  if (rotationSweep) {
    autoSweepCount *= 5;
    detail.push('Rotation: 5');
  } else {
    detail.push('Rotation: 1');
  }
  if (tiltSweep) {
    autoSweepCount *= 3;
    detail.push('Tilt: 3');
  } else {
    detail.push('Tilt: 1');
  }
  if (zoomSweep) {
    autoSweepCount *= 3;
    detail.push('Zoom: 3');
  } else {
    detail.push('Zoom: 1');
  }

  const selectedLighting = document.querySelectorAll('.lighting-presets input[type="checkbox"]:checked').length || 1;
  autoSweepCount *= selectedLighting;
  detail.push(`Lighting: ${selectedLighting}`);

  let finalCount;
  let manualQueueTotal = 0;

  if (manualAngleQueue.length > 0) {
    manualAngleQueue.forEach(item => {
      manualQueueTotal += item.lighting_directions.length;
    });
    finalCount = manualQueueTotal;
  } else {
    finalCount = autoSweepCount;
  }

  const angleCountEl = document.getElementById('angle-sweep-count');
  const angleDetailEl = document.getElementById('angle-sweep-detail');
  const totalVariationsEl = document.getElementById('total-variations');
  const estimatedTimeEl = document.getElementById('estimated-time');

  if (angleCountEl) angleCountEl.textContent = autoSweepCount;

  if (angleDetailEl) {
    if (manualAngleQueue.length > 0) {
      angleDetailEl.textContent = `Manual: ${manualAngleQueue.length} angles × lighting = ${manualQueueTotal} variations`;
    } else {
      angleDetailEl.textContent = detail.join(' × ') + ` = ${autoSweepCount} variations`;
    }
  }

  if (totalVariationsEl) totalVariationsEl.textContent = finalCount;

  if (estimatedTimeEl) {
    const estimatedMinutes = Math.ceil((finalCount * 15) / 60);
    estimatedTimeEl.textContent = estimatedMinutes;
  }

  updateLightingCount();
  if (typeof updateGenerationModeIndicator === 'function') {
    updateGenerationModeIndicator();
  }
}

function updateLightingCount() {
  const checkedLighting = document.querySelectorAll('.lighting-presets input[type="checkbox"]:checked').length;
  const lightingCountEl = document.getElementById('lighting-count');
  if (lightingCountEl) {
    lightingCountEl.textContent = checkedLighting || 0;
  }
}

function setDatasetSize(size, event) {
  selectedDatasetSize = size;
  document.querySelectorAll('.size-btn').forEach(btn => btn.classList.remove('active'));

  // Find and activate button
  try {
    if (event && event.target && event.target.closest) {
      const clicked = event.target.closest('.size-btn');
      if (clicked) clicked.classList.add('active');
      else {
        const fallback = document.querySelector(`.size-btn[data-size="${size}"]`);
        if (fallback) fallback.classList.add('active');
      }
    } else {
      const fallback = document.querySelector(`.size-btn[data-size="${size}"]`);
      if (fallback) fallback.classList.add('active');
    }
  } catch (e) {
    const fallback = document.querySelector(`.size-btn[data-size="${size}"]`);
    if (fallback) fallback.classList.add('active');
  }

  const recommendations = {
    'quick': 'Quick Test perfect for validation and demos',
    'standard': 'Standard size good for initial model training',
    'medium': 'Medium dataset suitable for small-scale ML projects',
    'large': 'Large dataset recommended for production ML models (90 images)'
  };
  document.getElementById('size-recommendation').textContent = recommendations[size] || '';

  // Apply logic per size
  if (size === 'quick') {
    document.getElementById('enable-rotation-sweep').checked = true;
    document.getElementById('enable-tilt-sweep').checked = false;
    document.getElementById('enable-zoom-sweep').checked = false;
    document.getElementById('rotation-slider').value = 0;
    document.getElementById('tilt-slider').value = 0;
    document.getElementById('zoom-slider').value = 5;
    document.querySelectorAll('#lighting-directions input[type="checkbox"]').forEach(cb => cb.checked = false);
    const front = document.querySelector('#lighting-directions input[value="front-lit"]');
    if (front) front.checked = true;
  } else if (size === 'standard') {
    document.getElementById('enable-rotation-sweep').checked = true;
    document.getElementById('enable-tilt-sweep').checked = true;
    document.getElementById('enable-zoom-sweep').checked = false;
    document.querySelectorAll('#lighting-directions input[type="checkbox"]').forEach(cb => cb.checked = false);
  } else if (size === 'medium') {
    document.getElementById('enable-rotation-sweep').checked = true;
    document.getElementById('enable-tilt-sweep').checked = true;
    document.getElementById('enable-zoom-sweep').checked = false;
    document.querySelectorAll('#lighting-directions input[type="checkbox"]').forEach(cb => cb.checked = true);
  } else if (size === 'large') {
    document.getElementById('enable-rotation-sweep').checked = true;
    document.getElementById('enable-tilt-sweep').checked = true;
    document.getElementById('enable-zoom-sweep').checked = true;
    document.querySelectorAll('#lighting-directions input[type="checkbox"]').forEach(cb => cb.checked = false);
    const prefer = ['front-lit', 'side-lit'];
    prefer.forEach(v => {
      const el = document.querySelector(`#lighting-directions input[value="${v}"]`);
      if (el) el.checked = true;
    });
    const checkedNow = document.querySelectorAll('#lighting-directions input[type="checkbox"]:checked').length;
    if (checkedNow < 2) {
      const allLights = Array.from(document.querySelectorAll('#lighting-directions input[type="checkbox"]'));
      for (let i = 0; i < allLights.length && i < 2; i++) {
        allLights[i].checked = true;
      }
    }
    document.getElementById('rotation-slider').value = 0;
    document.getElementById('tilt-slider').value = 0;
    document.getElementById('zoom-slider').value = 5;
  }
  updateAngleSweepCount();
}

function applyPreset() {
  const preset = document.getElementById('preset-select').value;
  if (!preset) return;

  document.querySelectorAll('#camera-angles input').forEach(cb => cb.checked = false);
  document.querySelectorAll('#lighting-directions input').forEach(cb => cb.checked = false);

  if (preset === 'product_photography') {
    ['eye-level', 'high-angle', 'overhead'].forEach(v => {
      const el = document.querySelector(`#camera-angles input[value="${v}"]`);
      if (el) el.checked = true;
    });
    const front = document.querySelector('#lighting-directions input[value="front-lit"]');
    if (front) front.checked = true;
  } else if (preset === 'lighting_study') {
    const el = document.querySelector('#camera-angles input[value="eye-level"]');
    if (el) el.checked = true;
    document.querySelectorAll('#lighting-directions input').forEach(cb => cb.checked = true);
  } else if (preset === 'multi_angle') {
    document.querySelectorAll('#camera-angles input').forEach(cb => cb.checked = true);
    const front = document.querySelector('#lighting-directions input[value="front-lit"]');
    if (front) front.checked = true;
  }
  updateAngleSweepCount();
}

function startOver() {
  location.reload();
}

function sanitizeFilename(name) {
  return name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
}

function viewMetadata() {
  const modal = document.getElementById('metadata-modal');
  const viewer = document.getElementById('metadata-viewer');
  const manifestData = {
    generated_at: new Date().toISOString(),
    total_variations: datasetResults.length,
    base_description: document.getElementById('object-description')?.value || '',
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

function closeMetadataModal() {
  document.getElementById('metadata-modal').style.display = 'none';
}

// --------------------------------------------------------------------------
// HELPER EXPORTS
// --------------------------------------------------------------------------
window.getCameraAngleFromRTZ = function (rotation, tilt) {
  if (tilt <= -45) return 'overhead';
  if (tilt <= -30) return 'high-angle';
  if (tilt >= 30) return 'low-angle';
  if (rotation === 0 && tilt === 0) return 'eye-level';
  return 'eye-level';
};

window.getDistanceFromZoom = function (zoom) {
  if (zoom === 0) return 'close';
  if (zoom === 5) return 'mid';
  if (zoom === 10) return 'far';
  return 'mid';
};

window.toggleAdvancedParams = function () {
  const content = document.getElementById('advanced-params-content');
  const button = document.querySelector('.accordion-toggle');
  if (!content || !button) return;
  const isOpen = content.style.display === 'grid';
  if (isOpen) {
    content.style.display = 'none';
    button.classList.remove('active');
  } else {
    content.style.display = 'grid';
    button.classList.add('active');
  }
};

// --------------------------------------------------------------------------
// API KEY HANDLING
// --------------------------------------------------------------------------
function setCustomAPIKey() {
  const userKey = document.getElementById('user-api-key').value.trim();
  if (!userKey) {
    alert('Please enter a valid API key');
    return;
  }
  if (userKey.length < 20) {
    alert('Invalid API key format. Please check and try again.');
    return;
  }
  window.CONFIG.BRIA_API_KEY = userKey;
  api = new BriaFIBOAPI(userKey);
  showToast('Custom API key configured successfully!', 'success');
  document.getElementById('api-key-modal').style.display = 'none';
  document.getElementById('object-section').style.display = 'block';
  console.log('API initialized with custom key');
}

function useDemoAPIKey() {
  const demoKey = '85ac20704c3149dc902dab0c727c1995';
  window.CONFIG.BRIA_API_KEY = demoKey;
  api = new BriaFIBOAPI(demoKey);
  showToast('Using demo key');
  document.getElementById('api-key-modal').style.display = 'none';
  document.getElementById('object-section').style.display = 'block';
  console.log('API initialized with demo key');
}

// --------------------------------------------------------------------------
// MANUAL QUEUE LOGIC
// --------------------------------------------------------------------------
let manualAngleQueue = [];

function addCurrentAngleToQueue() {
  const rotation = parseInt(document.getElementById('rotation-slider').value);
  const tilt = parseInt(document.getElementById('tilt-slider').value);
  const zoom = parseInt(document.getElementById('zoom-slider').value);
  const lightingCheckboxes = document.querySelectorAll('.lighting-presets input[type="checkbox"]:checked');
  const lightingDirections = Array.from(lightingCheckboxes).map(cb => cb.value);

  if (lightingDirections.length === 0) {
    alert('Please select at least one lighting direction before adding to queue');
    return;
  }

  const advancedMods = getAdvancedModifications();
  const queueItem = {
    id: Date.now(),
    rotation_degrees: rotation,
    tilt_degrees: tilt,
    zoom_level: zoom,
    lighting_directions: lightingDirections,
    background: document.querySelector('input[name="background"]:checked')?.value || 'white-studio',
    focal_length: document.querySelector('input[name="focal-length"]:checked')?.value || 'standard',
    advanced: advancedMods,
    label: formatRTZ(rotation, tilt, zoom)
  };

  manualAngleQueue.push(queueItem);
  updateAngleSweepCount();
  updateQueueDisplay();
  showToast(`Added: ${queueItem.label}`, 'success');
}

function removeFromQueue(itemId) {
  manualAngleQueue = manualAngleQueue.filter(item => item.id !== itemId);
  updateQueueDisplay();
  showToast('Removed from queue', 'info');
}

function clearAngleQueue() {
  if (manualAngleQueue.length === 0) return;
  if (confirm(`Clear all ${manualAngleQueue.length} queued angles?`)) {
    manualAngleQueue = [];
    updateQueueDisplay();
    showToast('Queue cleared', 'info');
  }
}

function updateQueueDisplay() {
  const emptyState = document.getElementById('queue-empty-state');
  const queueItems = document.getElementById('queue-items');
  const queueCount = document.getElementById('queue-count');
  const queueTotal = document.getElementById('queue-total-images');
  const lightingMultiplier = document.getElementById('queue-lighting-multiplier');

  if (manualAngleQueue.length === 0) {
    emptyState.style.display = 'block';
    queueItems.style.display = 'none';
    queueCount.textContent = '0';
    queueTotal.textContent = '0';
    return;
  }

  emptyState.style.display = 'none';
  queueItems.style.display = 'block';

  let totalImages = 0;
  manualAngleQueue.forEach(item => {
    totalImages += item.lighting_directions.length;
  });

  queueCount.textContent = manualAngleQueue.length;
  queueTotal.textContent = totalImages;

  const avgLighting = (totalImages / manualAngleQueue.length).toFixed(1);
  lightingMultiplier.textContent = avgLighting;

  queueItems.innerHTML = manualAngleQueue.map((item, index) => `
            <div class="queue-item">
              <div class="queue-item-params">
                <span class="queue-item-badge">#${index + 1}</span>
                <strong>${item.label}</strong>
                <span style="color: var(--text-tertiary); margin-left: 12px;">${item.lighting_directions.join(', ')}</span>
                <span style="color: var(--text-tertiary); margin-left: 12px;">(${item.lighting_directions.length} variants)</span>
              </div>
              <button class="queue-item-remove" onclick="removeFromQueue(${item.id})" title="Remove this angle">✕</button>
            </div>
        `).join('');

  updateGenerationModeIndicator();
  updateAngleSweepCount();
}

function showToast(message, type = 'success') {
  const colors = {
    success: 'linear-gradient(135deg, #10b981, #059669)',
    info: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    warning: 'linear-gradient(135deg, #f59e0b, #d97706)',
    error: 'linear-gradient(135deg, #ef4444, #dc2626)'
  };
  const toast = document.createElement('div');
  toast.style.cssText = `
            position: fixed;
            bottom: 30px;
            right: 30px;
            background: ${colors[type] || colors.success};
            color: white;
            padding: 12px 20px;
            border-radius: 10px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            z-index: 10000;
            font-weight: 600;
            font-size: 0.9rem;
            animation: slideInUp 0.3s ease-out;
        `;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'slideOutDown 0.3s ease-in';
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

function updateGenerationModeIndicator() {
  const modeTitle = document.getElementById('mode-title');
  const modeDescription = document.getElementById('mode-description');
  const modeTip = document.getElementById('mode-tip');

  if (!modeTitle) return; // Guard clause

  if (manualAngleQueue.length > 0) {
    modeTitle.textContent = 'Manual Queue Mode';
    modeTitle.style.color = 'var(--primary)';
    modeDescription.textContent = `${manualAngleQueue.length} custom angles queued for generation`;
    modeTip.textContent = 'Your custom angles will be generated with locked seed for consistency';
  } else {
    modeTitle.textContent = 'Auto Sweep Mode';
    modeTitle.style.color = 'var(--accent)';
    modeDescription.textContent = 'Using parameter sweeps from toggles above';
    modeTip.textContent = 'Add custom angles to queue for manual control, or use sweeps for batch generation';
  }
}