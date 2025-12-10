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
    const modified = JSON.parse(JSON.stringify(structuredPrompt)); // Deep clone
    
    // Ensure required nested objects exist
    if (!modified.photographic_characteristics) modified.photographic_characteristics = {};
    if (!modified.lighting) modified.lighting = {};
    if (!modified.aesthetics) modified.aesthetics = {};
    if (!modified.scene) modified.scene = { background: {}, surface: {} };
    if (!modified.materials_and_texture) modified.materials_and_texture = {};
    if (!modified.imperfections) modified.imperfections = {};
    
    // Camera modifications
    if (modifications.camera_angle) {
      modified.photographic_characteristics.camera_angle = modifications.camera_angle;
    }
    
    if (modifications.focal_length) {
      modified.photographic_characteristics.lens_focal_length = modifications.focal_length;
    }
    
    if (modifications.aperture) {
      modified.photographic_characteristics.aperture_f = parseFloat(modifications.aperture);
    }
    
    if (modifications.camera_distance) {
      modified.photographic_characteristics.distance_descriptor = modifications.camera_distance;
    }
    
    if (modifications.depth_of_field) {
      modified.photographic_characteristics.depth_of_field = modifications.depth_of_field;
    }
    
    if (modifications.camera_height) {
      modified.photographic_characteristics.camera_height = modifications.camera_height;
    }
    
    // Lighting modifications
    if (modifications.lighting_direction) {
      const directionMap = {
        'front-lit': 'soft, diffused lighting from the front',
        'side-lit': 'directional lighting from the side',
        'back-lit': 'dramatic backlighting from behind',
        'top-lit': 'overhead lighting from above'
      };
      modified.lighting.direction = directionMap[modifications.lighting_direction] || modifications.lighting_direction;
    }
    
    if (modifications.lighting_quality) {
      modified.lighting.shadows = modifications.lighting_quality === 'soft' 
        ? 'soft, subtle shadows' 
        : 'sharp, defined shadows';
    }
    
    if (modifications.lighting_contrast) {
      modified.lighting.contrast = modifications.lighting_contrast;
    }
    
    if (modifications.shadow_behavior) {
      modified.lighting.shadow_behavior = modifications.shadow_behavior;
    }
    
    if (modifications.color_temperature) {
      modified.lighting.color_temperature = modifications.color_temperature;
    }
    
    // Background modifications with hex colors
    if (modifications.background) {
      const backgroundMap = {
        'white-studio': 'clean, seamless white studio backdrop',
        'black-studio': 'dramatic black studio backdrop',
        'wooden-surface': 'natural wooden surface with visible grain',
        'fabric-texture': 'soft, textured fabric background'
      };
      modified.background_setting = backgroundMap[modifications.background] || modifications.background;
    }
    
    if (modifications.background_color_hex) {
      if (!modified.scene) modified.scene = {};
      if (!modified.scene.background) modified.scene.background = {};
      modified.scene.background.color_hex = modifications.background_color_hex;
      modified.background_setting += ` with color ${modifications.background_color_hex}`;
    }
    
    // Surface modifications
    if (modifications.surface_finish) {
      modified.materials_and_texture.surface_finish = modifications.surface_finish;
    }
    
    if (modifications.surface_tone) {
      if (!modified.scene.surface) modified.scene.surface = {};
      modified.scene.surface.tone = modifications.surface_tone;
    }
    
    if (modifications.surface_color_hex) {
      if (!modified.scene.surface) modified.scene.surface = {};
      modified.scene.surface.color_hex = modifications.surface_color_hex;
    }
    
    // Composition
    if (modifications.negative_space) {
      modified.aesthetics.negative_space = modifications.negative_space;
    }
    
    // Color scheme
    if (modifications.color_scheme) {
      modified.aesthetics.color_scheme = modifications.color_scheme;
    }
    
    // Mood
    if (modifications.mood && modifications.mood.length > 0) {
      modified.mood = modifications.mood;
      modified.aesthetics.mood_atmosphere = modifications.mood.join(', ');
    }
    
    // Imperfections
    if (modifications.add_imperfections !== undefined) {
      modified.imperfections.include = modifications.add_imperfections;
      if (modifications.imperfection_types && modifications.imperfection_types.length > 0) {
        modified.imperfections.types = modifications.imperfection_types;
        modified.materials_and_texture.texture_notes = 
          `visible ${modifications.imperfection_types.join(', ')}`;
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