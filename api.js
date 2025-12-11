/**
 * FIBO DataForge - Bria API Wrapper
 * Handles rate limiting, async polling, and error handling
 */

class BriaFIBOAPI {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseURL = 'https://engine.prod.bria-api.com/v2';
    this.requestQueue = [];
    this.processing = false;
    this.rateLimitDelay = 6000; // 6 seconds between requests (10/min)
    this.pollInterval = 2000; // Poll every 2 seconds
    this.maxPollAttempts = 60; // 2 minutes timeout
  }

  /**
   * Add request to queue with rate limiting
   */
  async queueRequest(endpoint, body) {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ endpoint, body, resolve, reject });
      this.processQueue();
    });
  }

  /**
   * Process request queue with rate limiting
   */
  async processQueue() {
    if (this.processing || this.requestQueue.length === 0) return;

    this.processing = true;
    const { endpoint, body, resolve, reject } = this.requestQueue.shift();

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api_token': this.apiKey
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      resolve(data);

      // Rate limit delay
      setTimeout(() => {
        this.processing = false;
        this.processQueue();
      }, this.rateLimitDelay);

    } catch (error) {
      reject(error);
      this.processing = false;

      // Continue processing queue even after error
      setTimeout(() => this.processQueue(), this.rateLimitDelay);
    }
  }

  /**
   * Poll status URL until completion
   */
  async pollStatus(statusUrl, onProgress = null) {
    let attempts = 0;

    while (attempts < this.maxPollAttempts) {
      try {
        const response = await fetch(statusUrl, {
          headers: { 'api_token': this.apiKey }
        });

        if (!response.ok) {
          throw new Error(`Status check failed: ${response.status}`);
        }

        const data = await response.json();

        if (data.status === 'COMPLETED') {
          return data.result;
        } else if (data.status === 'ERROR') {
          throw new Error(data.error?.message || 'Generation failed');
        } else if (data.status === 'IN_PROGRESS') {
          if (onProgress) {
            onProgress(attempts + 1, this.maxPollAttempts);
          }
        }

        await new Promise(r => setTimeout(r, this.pollInterval));
        attempts++;

      } catch (error) {
        throw new Error(`Polling error: ${error.message}`);
      }
    }

    throw new Error('Generation timeout (120 seconds exceeded)');
  }

  /**
   * Generate structured prompt from text description
   * @param {string} prompt - Text description of object
   * @param {Array} images - Optional reference images (base64)
   * @returns {Object} - { structured_prompt: string, seed: number }
   */
  async generateStructuredPrompt(prompt, images = null, onProgress = null) {
    const body = { prompt, sync: false };
    if (images && images.length > 0) {
      body.images = images;
    }

    const response = await this.queueRequest('/structured_prompt/generate', body);

    if (response.status_url) {
      const result = await this.pollStatus(response.status_url, onProgress);
      return {
        structured_prompt: result.structured_prompt,
        seed: result.seed
      };
    }

    throw new Error('No status URL in response');
  }

  /**
   * Modify structured prompt with new parameters
   * @param {Object} structuredPrompt - Parsed JSON structured prompt
   * @param {Object} modifications - Fields to modify
   * @returns {string} - Modified JSON string
   */
  modifyStructuredPrompt(structuredPrompt, modifications) {
    const modified = JSON.parse(JSON.stringify(structuredPrompt));

    if (modifications.rotation_degrees !== undefined) {
      // Rotation affects the description
      let rotationDesc = '';
      if (modifications.rotation_degrees < -30) {
        rotationDesc = 'viewed from the left side';
      } else if (modifications.rotation_degrees > 30) {
        rotationDesc = 'viewed from the right side';
      } else {
        rotationDesc = 'viewed from the front';
      }

      // Add to short description if it exists
      if (modified.short_description) {
        modified.short_description = modified.short_description.replace(
          /\.$/,
          `, ${rotationDesc}.`
        );
      }

      // Also update camera angle based on rotation + tilt
      if (modifications.tilt_degrees !== undefined) {
        const tilt = modifications.tilt_degrees;
        const rotation = modifications.rotation_degrees;

        let angleDesc = '';
        if (tilt < -30) {
          angleDesc = 'high-angle view looking down';
        } else if (tilt > 30) {
          angleDesc = 'low-angle view looking up';
        } else {
          angleDesc = 'eye-level view';
        }

        if (rotation < -30) {
          angleDesc += ' from the left side';
        } else if (rotation > 30) {
          angleDesc += ' from the right side';
        } else {
          angleDesc += ' from the front';
        }

        modified.photographic_characteristics.camera_angle = angleDesc;
      }
    }

    // Ensure required objects exist
    if (!modified.photographic_characteristics) modified.photographic_characteristics = {};
    if (!modified.lighting) modified.lighting = {};
    if (!modified.aesthetics) modified.aesthetics = {};
    if (!modified.materials_and_texture) modified.materials_and_texture = {};

    // ===== CAMERA MODIFICATIONS =====
    if (modifications.camera_angle) {
      modified.photographic_characteristics.camera_angle = modifications.camera_angle;
    }

    if (modifications.focal_length) {
      const focalLengthMap = {
        'wide-angle': 'wide-angle lens (24mm)',
        'standard': 'standard lens (50mm)',
        'portrait': 'portrait lens (85mm)',
        'telephoto': 'telephoto lens (135mm)'
      };
      modified.photographic_characteristics.lens_focal_length =
        focalLengthMap[modifications.focal_length] || modifications.focal_length;
    }

    if (modifications.aperture) {
      modified.photographic_characteristics.aperture_f = parseFloat(modifications.aperture);
      // Add depth of field description
      const aperture = parseFloat(modifications.aperture);
      if (aperture <= 2.8) {
        modified.photographic_characteristics.depth_of_field = 'very shallow, with sharp subject and heavily blurred background';
      } else if (aperture <= 5.6) {
        modified.photographic_characteristics.depth_of_field = 'shallow, with subject in focus and background softly blurred';
      } else {
        modified.photographic_characteristics.depth_of_field = 'deep, with most elements in sharp focus';
      }
    }

    if (modifications.camera_distance) {
      const distanceMap = {
        'close': 'close-up distance, filling the frame',
        'mid': 'mid-distance, balanced composition',
        'far': 'far distance, environmental context'
      };
      modified.photographic_characteristics.distance_descriptor =
        distanceMap[modifications.camera_distance] || modifications.camera_distance;
    }

    // ===== LIGHTING MODIFICATIONS =====
    if (modifications.lighting_direction) {
      const directionMap = {
        'front-lit': 'soft, even lighting from the front, illuminating the subject directly',
        'side-lit': 'dramatic side lighting from the left or right, creating strong shadows and highlights',
        'back-lit': 'silhouetting backlight from behind, creating rim light and depth',
        'top-lit': 'overhead lighting from above, creating downward shadows'
      };
      modified.lighting.direction = directionMap[modifications.lighting_direction] || modifications.lighting_direction;
    }

    // ENHANCED: Lighting quality with contrast and shadow behavior
    let shadowDescription = 'soft, subtle shadows';
    if (modifications.lighting_contrast) {
      if (modifications.lighting_contrast === 'high') {
        shadowDescription = 'strong, defined shadows with high contrast';
      } else if (modifications.lighting_contrast === 'low') {
        shadowDescription = 'very soft, barely visible shadows with low contrast';
      }
    }

    if (modifications.shadow_behavior) {
      if (modifications.shadow_behavior === 'hard edge') {
        shadowDescription = 'sharp, crisp shadows with hard edges';
      } else if (modifications.shadow_behavior === 'minimal') {
        shadowDescription = 'minimal, nearly absent shadows';
      }
    }

    modified.lighting.shadows = shadowDescription;

    if (modifications.color_temperature) {
      const tempMap = {
        'neutral-warm': 'neutral-warm color temperature (around 4500K)',
        'neutral-cool': 'neutral-cool color temperature (around 5500K)',
        'warm': 'warm, golden color temperature (around 3000K)',
        'cool': 'cool, blue color temperature (around 7000K)'
      };
      modified.lighting.color_temperature = tempMap[modifications.color_temperature] || modifications.color_temperature;
    }

    // ===== BACKGROUND WITH HEX COLORS =====
    if (modifications.background) {
      const backgroundMap = {
        'white-studio': 'clean, seamless white studio backdrop',
        'black-studio': 'dramatic, deep black studio backdrop',
        'wooden-surface': 'natural wooden surface with visible grain and texture',
        'fabric-texture': 'soft, textured fabric background with gentle folds'
      };
      modified.background_setting = backgroundMap[modifications.background] || modifications.background;
    }

    // HEX COLOR FIX: Convert to descriptive color
    if (modifications.background_color_hex) {
      const colorName = hexToColorName(modifications.background_color_hex);
      modified.background_setting = `seamless studio backdrop in ${colorName} color (hex ${modifications.background_color_hex}), with smooth, even tone`;
    }

    // ===== SURFACE & MATERIALS =====
    if (modifications.surface_finish || modifications.surface_tone || modifications.surface_color_hex) {
      let surfaceDesc = '';

      if (modifications.surface_finish) {
        const finishMap = {
          'matte': 'matte, non-reflective',
          'glossy': 'glossy, highly reflective with visible highlights',
          'satin': 'satin, subtle sheen',
          'unglazed': 'unglazed, raw texture'
        };
        surfaceDesc += finishMap[modifications.surface_finish] || modifications.surface_finish;
      }

      if (modifications.surface_tone) {
        surfaceDesc += ` with ${modifications.surface_tone} tones`;
      }

      if (modifications.surface_color_hex) {
        const surfaceColorName = hexToColorName(modifications.surface_color_hex);
        surfaceDesc += ` in ${surfaceColorName} color`;
      }

      modified.materials_and_texture.surface_finish = surfaceDesc;
    }

    // ===== IMPERFECTIONS =====
    if (modifications.add_imperfections && modifications.imperfection_types && modifications.imperfection_types.length > 0) {
      const imperfectionDesc = `realistic imperfections including visible ${modifications.imperfection_types.join(', ')}, adding authentic, handcrafted character`;
      modified.materials_and_texture.texture_notes = imperfectionDesc;

      // Also add to short description for emphasis
      if (modified.short_description) {
        modified.short_description += ` The surface shows ${imperfectionDesc}.`;
      }
    }

    // ===== COMPOSITION =====
    if (modifications.negative_space) {
      modified.aesthetics.negative_space = modifications.negative_space;
      const spaceMap = {
        'minimal': 'minimal negative space, subject fills the frame',
        'medium': 'balanced negative space around the subject',
        'generous': 'generous negative space, subject with breathing room'
      };
      modified.aesthetics.composition = (modified.aesthetics.composition || '') + ', ' + (spaceMap[modifications.negative_space] || '');
    }

    // ===== MOOD =====
    if (modifications.mood && modifications.mood.length > 0) {
      modified.aesthetics.mood_atmosphere = modifications.mood.join(', ');
      // Enhance color scheme based on mood
      if (modifications.mood.includes('luxurious')) {
        modified.aesthetics.color_scheme = 'rich, sophisticated color palette with elegant tones';
      } else if (modifications.mood.includes('calm')) {
        modified.aesthetics.color_scheme = 'soft, muted color palette with serene tones';
      } else if (modifications.mood.includes('dramatic')) {
        modified.aesthetics.color_scheme = 'high-contrast, bold color palette with striking tones';
      }
    }

    return JSON.stringify(modified);
  }

  /**
   * Generate image from structured prompt
   * @param {string} structuredPrompt - JSON structured prompt
   * @param {number} seed - Optional seed for reproducibility
   * @returns {Object} - { image_url: string, seed: number, structured_prompt: string }
   */
  async generateImage(structuredPrompt, seed = null, onProgress = null) {
    const body = {
      structured_prompt: structuredPrompt,
      sync: false
    };

    if (seed !== null) {
      body.seed = seed;
    }

    const response = await this.queueRequest('/image/generate', body);

    if (response.status_url) {
      const result = await this.pollStatus(response.status_url, onProgress);
      return {
        image_url: result.image_url,
        seed: result.seed,
        structured_prompt: result.structured_prompt || structuredPrompt
      };
    }

    throw new Error('No status URL in response');
  }

  /**
   * Generate dataset with parameter sweep
   * @param {string} baseStructuredPrompt - Starting structured prompt
   * @param {Array} variations - Array of modification objects
   * @param {Function} onVariationComplete - Callback per variation
   * @returns {Array} - Array of { image_url, metadata } objects
   */
  async generateDataset(baseStructuredPrompt, variations, onVariationComplete = null) {
    const results = [];
    const baseParsed = JSON.parse(baseStructuredPrompt);

    for (let i = 0; i < variations.length; i++) {
      const variation = variations[i];

      try {
        // Modify structured prompt
        const modifiedPrompt = this.modifyStructuredPrompt(baseParsed, variation.modifications);

        // Generate image
        const result = await this.generateImage(
          modifiedPrompt,
          null,
          (attempt, max) => {
            if (onVariationComplete) {
              onVariationComplete({
                index: i,
                total: variations.length,
                name: variation.name,
                status: 'generating',
                progress: attempt / max
              });
            }
          }
        );

        // Add metadata
        const metadata = {
          variation_name: variation.name,
          image_url: result.image_url,
          seed: result.seed,
          structured_prompt: JSON.parse(result.structured_prompt),
          modifications: variation.modifications,
          timestamp: new Date().toISOString()
        };

        results.push(metadata);

        if (onVariationComplete) {
          onVariationComplete({
            index: i,
            total: variations.length,
            name: variation.name,
            status: 'completed',
            metadata: metadata
          });
        }

      } catch (error) {
        console.error(`Failed to generate variation ${i}:`, error);

        if (onVariationComplete) {
          onVariationComplete({
            index: i,
            total: variations.length,
            name: variation.name,
            status: 'error',
            error: error.message
          });
        }
      }
    }

    return results;
  }

  /**
   * Get remaining queue length
   */
  getQueueLength() {
    return this.requestQueue.length;
  }

  /**
   * Clear queue
   */
  clearQueue() {
    this.requestQueue = [];
  }
}

// Export for use in other modules
window.BriaFIBOAPI = BriaFIBOAPI;

// ===== HELPER FUNCTIONS =====

/**
 * Convert hex color to descriptive name
 */
function hexToColorName(hex) {
  // Remove # if present
  hex = hex.replace('#', '');

  // Convert to RGB
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Simple color name mapping
  const hue = rgbToHue(r, g, b);
  const saturation = rgbToSaturation(r, g, b);
  const lightness = rgbToLightness(r, g, b);

  let colorName = '';

  // Determine hue name
  if (saturation < 10) {
    // Grayscale
    if (lightness > 90) colorName = 'pure white';
    else if (lightness > 70) colorName = 'light gray';
    else if (lightness > 40) colorName = 'medium gray';
    else if (lightness > 10) colorName = 'dark gray';
    else colorName = 'black';
  } else {
    // Colored
    let hueName = '';
    if (hue < 15 || hue >= 345) hueName = 'red';
    else if (hue < 45) hueName = 'orange';
    else if (hue < 75) hueName = 'yellow';
    else if (hue < 165) hueName = 'green';
    else if (hue < 255) hueName = 'blue';
    else if (hue < 285) hueName = 'purple';
    else hueName = 'pink';

    // Add lightness descriptor
    if (lightness > 70) colorName = `light ${hueName}`;
    else if (lightness < 30) colorName = `dark ${hueName}`;
    else colorName = hueName;

    // Add saturation descriptor
    if (saturation < 30) colorName = `muted ${colorName}`;
    else if (saturation > 70) colorName = `vibrant ${colorName}`;
  }

  return colorName;
}

function rgbToHue(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;

  if (max !== min) {
    const d = max - min;
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }

  return Math.round(h * 360);
}

function rgbToSaturation(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) return 0;

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  return Math.round(s * 100);
}

function rgbToLightness(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return Math.round(((max + min) / 2) * 100);
}

// ADD THESE TO WINDOW SO THEY'RE AVAILABLE GLOBALLY
window.hexToColorName = hexToColorName;
window.rgbToHue = rgbToHue;
window.rgbToSaturation = rgbToSaturation;
window.rgbToLightness = rgbToLightness;