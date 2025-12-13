// LumenSet - Dataset ZIP Exporter
// Creates downloadable ZIP with images + metadata


// Download complete dataset as ZIP
async function downloadDataset() {
    if (datasetResults.length === 0) {
        alert('No dataset to download');
        return;
    }

    const button = event.target;
    button.disabled = true;
    button.textContent = ' Creating ZIP...';

    try {
        await createDatasetZIP(datasetResults);
        button.textContent = ' Downloaded!';
        setTimeout(() => {
            button.disabled = false;
            button.textContent = 'Download Dataset (ZIP)';
        }, 2000);
    } catch (error) {
        alert('Export failed: ' + error.message);
        button.disabled = false;
        button.textContent = 'Download Dataset (ZIP)';
    }
}

// Create ZIP file using JSZip library
async function createDatasetZIP(results) {
    // Load JSZip from CDN
    if (typeof JSZip === 'undefined') {
        await loadJSZip();
    }

    const zip = new JSZip();

    // Create folder structure
    const imagesFolder = zip.folder('dataset/images');
    const metadataFolder = zip.folder('dataset/metadata');

    // Add manifest.json
    const manifest = createManifest(results);
    zip.file('dataset/manifest.json', JSON.stringify(manifest, null, 2));

    // Add README
    const readme = createReadme(results);
    zip.file('dataset/README.md', readme);

    // Download images and add to ZIP
    for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const filename = sanitizeFilename(`${i + 1}_${result.variation_name}`);

        try {
            // Fetch image
            const imageResponse = await fetch(result.image_url);
            const imageBlob = await imageResponse.blob();

            // Add image to ZIP
            imagesFolder.file(`${filename}.png`, imageBlob);

            // Add metadata JSON
            const metadata = {
                image_filename: `${filename}.png`,
                variation_name: result.variation_name,
                seed: result.seed,
                modifications: result.modifications,
                structured_prompt: result.structured_prompt,
                timestamp: result.timestamp,
                source_url: result.image_url
            };
            metadataFolder.file(`${filename}.json`, JSON.stringify(metadata, null, 2));

        } catch (error) {
            console.error(`Failed to add ${filename}:`, error);
        }
    }

    // Generate ZIP and trigger download
    const blob = await zip.generateAsync({ type: 'blob' });
    const timestamp = new Date().toISOString().split('T')[0];
    const zipFilename = `fibo_dataset_${timestamp}.zip`;

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = zipFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

// Load JSZip library from CDN
function loadJSZip() {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
        script.onload = resolve;
        script.onerror = () => reject(new Error('Failed to load JSZip'));
        document.head.appendChild(script);
    });
}

// Create manifest.json
function createManifest(results) {
    const objectDescription = document.getElementById('object-description').value;

    return {
        dataset_info: {
            name: 'LumenSet Dataset',
            generated_at: new Date().toISOString(),
            generator: 'LumenSet v1.0',
            api: 'Bria FIBO API v2'
        },
        object_description: objectDescription,
        total_variations: results.length,
        parameters: {
            camera: {
                rotation_sweep: document.getElementById('enable-rotation-sweep')?.checked || false,
                tilt_sweep: document.getElementById('enable-tilt-sweep')?.checked || false,
                zoom_sweep: document.getElementById('enable-zoom-sweep')?.checked || false,

                rotation_value: parseInt(document.getElementById('rotation-slider')?.value || 0),
                tilt_value: parseInt(document.getElementById('tilt-slider')?.value || 0),
                zoom_value: parseInt(document.getElementById('zoom-slider')?.value || 5)
            },
            lighting_directions: Array.from(
                document.querySelectorAll('.lighting-presets input[type="checkbox"]:checked')
            ).map(cb => cb.value),

            background: document.querySelector('input[name="background"]:checked')?.value,
            focal_length: document.querySelector('input[name="focal-length"]:checked')?.value
        },
        variations: results.map((r, i) => ({
            id: i + 1,
            name: r.variation_name,
            filename: sanitizeFilename(`${i + 1}_${r.variation_name}`) + '.png',
            seed: r.seed,
            modifications: r.modifications
        })),
        reproducibility: {
            note: 'To reproduce any image, use the seed and structured_prompt from the corresponding metadata JSON file.',
            api_endpoint: '/v2/image/generate',
            required_params: ['structured_prompt', 'seed']
        }
    };
}

// Create README.md
function createReadme(results) {
    const objectDescription = document.getElementById('object-description').value;
    const timestamp = new Date().toISOString();

    return `# LumenSet Dataset

## Dataset Information

- **Generated:** ${timestamp}
- **Object:** ${objectDescription}
- **Total Variations:** ${results.length}
- **Generator:** LumenSet
- **API:** Bria FIBO v2

## Folder Structure

\`\`\`
dataset/
├── images/              # Generated images (PNG)
├── metadata/            # Per-image metadata (JSON)
├── manifest.json        # Dataset overview
└── README.md           # This file
\`\`\`

## Parameter Variations

This dataset includes variations across:

### Camera Parameters

- **Rotation Sweep:** ${document.getElementById('enable-rotation-sweep').checked}
- **Tilt Sweep:** ${document.getElementById('enable-tilt-sweep').checked}
- **Zoom Sweep:** ${document.getElementById('enable-zoom-sweep').checked}

- **Rotation Value:** ${document.getElementById('rotation-slider').value}°
- **Tilt Value:** ${document.getElementById('tilt-slider').value}°
- **Zoom Value:** ${document.getElementById('zoom-slider').value}

### Lighting
- ${Array.from(document.querySelectorAll('.lighting-presets input[type="checkbox"]:checked'))
            .map(cb => cb.value).join(', ')}

- **Background:** ${document.querySelector('input[name="background"]:checked')?.value}
- **Focal Length:** ${document.querySelector('input[name="focal-length"]:checked')?.value}

## Reproducibility

Each image can be exactly reproduced using:

1. The \`structured_prompt\` (JSON) from the metadata file
2. The \`seed\` value
3. The Bria FIBO API endpoint: \`/v2/image/generate\`

Example:

\`\`\`javascript
{
  "structured_prompt": "<JSON from metadata file>",
  "seed": 123456789
}
\`\`\`

## Metadata Format

Each \`metadata/*.json\` file contains:

- \`image_filename\`: Corresponding image file
- \`variation_name\`: Human-readable variation name
- \`seed\`: Reproducibility seed
- \`modifications\`: Parameters used for this variation
- \`structured_prompt\`: Complete FIBO JSON prompt
- \`timestamp\`: Generation timestamp

## Use Cases

This dataset is suitable for:

- Computer vision training
- Object detection models
- Style transfer experiments
- Lighting condition studies
- Camera angle analysis
- Synthetic data augmentation

## License & Attribution

Images generated using Bria FIBO API.
Dataset created with LumenSet.

---

*Generated by LumenSet - Structured Synthetic Dataset Generator*
`;
}

// Helper: Get selected checkbox values
function getSelectedValues(selector) {
    return Array.from(document.querySelectorAll(`${selector} input:checked`))
        .map(cb => cb.value);
}