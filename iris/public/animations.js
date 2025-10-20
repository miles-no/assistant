// IRIS Terminal - Additional Animations and Effects

// Random CRT flicker effect
function crtFlicker() {
    const scanlines = document.querySelector('.scanlines');
    if (scanlines && Math.random() < 0.05) {
        scanlines.style.opacity = Math.random() * 0.3 + 0.1;
        setTimeout(() => {
            scanlines.style.opacity = '';
        }, 50);
    }
}

// HAL eye random intensity variation
function halIntensityVariation() {
    const eye = document.querySelector('.hal-eye-inner');
    if (eye && Math.random() < 0.1) {
        const brightness = Math.random() * 0.3 + 0.85;
        eye.style.filter = `brightness(${brightness})`;
        setTimeout(() => {
            eye.style.filter = '';
        }, 100);
    }
}

// Boot sequence effect (unused but available)
function bootSequence() {
    const messages = [
        'INITIALIZING IRIS SYSTEMS...',
        'LOADING NEURAL NETWORKS...',
        'CONNECTING TO MCP SERVER...',
        'ESTABLISHING SECURE CONNECTION...',
        'IRIS v1.0 READY',
    ];

    messages.forEach((msg, index) => {
        setTimeout(() => {
            console.log(msg);
        }, index * 500);
    });
}

// Glitch effect on error
function triggerGlitch(element) {
    if (element) {
        element.classList.add('glitch');
        setTimeout(() => {
            element.classList.remove('glitch');
        }, 300);
    }
}

// Terminal screen shake (for dramatic errors)
function screenShake() {
    const terminal = document.querySelector('.terminal-container');
    if (terminal) {
        terminal.style.animation = 'shake 0.5s';
        setTimeout(() => {
            terminal.style.animation = '';
        }, 500);
    }
}

// Add shake animation to CSS dynamically
const shakeAnimation = `
@keyframes shake {
    0%, 100% { transform: translateX(-50%) translateY(0); }
    10%, 30%, 50%, 70%, 90% { transform: translateX(-50%) translateY(-2px); }
    20%, 40%, 60%, 80% { transform: translateX(-50%) translateY(2px); }
}
`;

const style = document.createElement('style');
style.textContent = shakeAnimation;
document.head.appendChild(style);

// Start ambient effects
setInterval(crtFlicker, 2000);
setInterval(halIntensityVariation, 3000);

// Export functions for use in terminal.js
window.irisAnimations = {
    triggerGlitch,
    screenShake,
    bootSequence,
};
