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

    // Get selected camera angles
    const selectedCameras = Array.from(
        document.querySelectorAll('#camera-angles input:checked')
    ).map(cb => cb.value);

    // Get selected lighting directions
    const selectedLights = Array.from(
        document.querySelectorAll('#lighting-directions input:checked')
    ).map(cb => cb.value);

    // Get basic parameters
    const background = document.querySelector('input[name="background"]:checked')?.value || 'white-studio';
    const focalLength = document.querySelector('input[name="focal-length"]:checked')?.value || 'standard';

    // Get advanced parameters (if enabled)
    const advancedMods = {};
    
    // Color control
    if (document.getElementById('use-exact-colors')?.checked) {
        advancedMods.background_color_hex = document.getElementById('bg-color-hex')?.value;
        advancedMods.surface_color_hex = document.getElementById('surface-color-hex')?.value;
    }
    
    // Surface & material
    advancedMods.surface_finish = document.getElementById('surface-finish')?.value;
    advancedMods.surface_tone = document.getElementById('surface-tone')?.value;
    
    // Lighting detail
    advancedMods.lighting_contrast = document.getElementById('lighting-contrast')?.value;
    advancedMods.shadow_behavior = document.getElementById('shadow-behavior')?.value;
    advancedMods.color_temperature = document.getElementById('color-temperature')?.value;
    
    // Camera technical
    advancedMods.aperture = document.getElementById('aperture')?.value;
    advancedMods.camera_distance = document.getElementById('camera-distance')?.value;
    
    // Composition
    advancedMods.negative_space = document.getElementById('negative-space')?.value;
    advancedMods.camera_height = document.getElementById('camera-height-detail')?.value;
    
    // Imperfections
    if (document.getElementById('add-imperfections')?.checked) {
        advancedMods.add_imperfections = true;
        advancedMods.imperfection_types = Array.from(
            document.querySelectorAll('#imperfection-types input:checked')
        ).map(cb => cb.value);
    }
    
    // Mood
    const selectedMoods = Array.from(
        document.querySelectorAll('#mood-options input:checked')
    ).map(cb => cb.value);
    if (selectedMoods.length > 0) {
        advancedMods.mood = selectedMoods;
    }

    // Create all combinations
    let counter = 1;
    for (const camera of selectedCameras) {
        for (const lighting of selectedLights) {
            variations.push({
                name: `Variation ${counter}: ${formatName(camera)} + ${formatName(lighting)}`,
                modifications: {
                    camera_angle: camera,
                    lighting_direction: lighting,
                    background: background,
                    focal_length: focalLength,
                    ...advancedMods // Spread advanced parameters
                }
            });
            counter++;
        }
    }

    return variations;
}

// Format parameter name for display
function formatName(value) {
    return value.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// Handle generation progress updates
function onGenerationProgress(update) {
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');
    const currentVariation = document.getElementById('current-variation');

    const percentage = ((update.index + 1) / update.total * 100).toFixed(0);
    progressFill.style.width = `${percentage}%`;

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
    } else if (update.status === 'error') {
        console.error(`Failed: ${update.name}`, update.error);
        currentVariation.innerHTML = `
            <strong>❌ Error:</strong> ${update.name}<br>
            <small style="color: var(--error);">${update.error}</small>
        `;
    }
}

// Display results in gallery
function displayResults(results) {
    document.getElementById('results-section').style.display = 'block';
    document.getElementById('results-section').scrollIntoView({ behavior: 'smooth' });

    const gallery = document.getElementById('results-gallery');
    gallery.innerHTML = '';

    results.forEach((result, index) => {
        const item = document.createElement('div');
        item.className = 'gallery-item';
        item.innerHTML = `
            <img src="${result.image_url}" alt="${result.variation_name}" loading="lazy">
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
                </div>
            </div>
        `;
        gallery.appendChild(item);
    });
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
window.onclick = function(event) {
    const modal = document.getElementById('metadata-modal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
};