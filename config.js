/**
 * FIBO DataForge Configuration
 * IMPORTANT: Keep this file private. Do not commit with real API key.
 */

const CONFIG = {
    // Bria API Configuration
    // Replace with your actual API key before deployment
    BRIA_API_KEY: '46601ee902014b92887c48ea0c40ff52', // Directly in code
    APP_MODE: 'production',

    // Application Settings
    APP_MODE: 'production',
    MAX_VARIATIONS: 100,
    DEFAULT_DATASET_SIZE: 'standard',

    // Camera Control Ranges
    ROTATION_RANGE: { min: -90, max: 90, step: 45 },
    TILT_RANGE: { min: -45, max: 45, step: 45 },
    ZOOM_RANGE: { min: 0, max: 10, step: 5 },

    // Rate Limiting
    REQUEST_DELAY: 6000, // 6 seconds between requests
    POLL_INTERVAL: 2000, // 2 seconds per status check
    MAX_POLL_ATTEMPTS: 60 // 2 minute timeout
};

// Export for use in other files
window.CONFIG = CONFIG;

// Validation on load
if (CONFIG.BRIA_API_KEY === '46601ee902014b92887c48ea0c40ff52') {
    console.warn('BRIA_API_KEY not configured in config.js');
}