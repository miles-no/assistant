export const config = {
    API_URL: process.env.API_URL || 'http://localhost:3000',
    PORT: parseInt(process.env.PORT || '3002'),
    isDevelopment: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production',
};
export const IRIS_CONSTANTS = {
    MAX_MOVEMENT: 8,
    SMOOTHING: 0.15,
    DEPTH_SMOOTHING: 0.05,
    DEPTH: {
        IDLE: 0.55,
        THINKING: 0.1,
        ALERT: 1.0,
        ERROR: 0.0,
    },
    DURATION: {
        ERROR: 4000,
        BLINK: 150,
        ALERT: 500,
    },
    TIMEOUT: {
        DEFAULT: 10000,
        BOOKING: 15000,
    },
    ANIMATION: {
        CRT_FLICKER_INTERVAL: 2000,
        INTENSITY_VARIATION_INTERVAL: 3000,
    },
};
