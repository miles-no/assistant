// IRIS Eye Tracking & Personality System

class IrisEye {
    constructor() {
        this.eye = document.getElementById('hal-eye');
        this.iris = document.getElementById('iris');
        this.pupil = document.getElementById('pupil');

        this.mouseX = 0;
        this.mouseY = 0;
        this.currentX = 0;
        this.currentY = 0;

        this.maxMovement = 8; // Maximum pixels iris can move from center
        this.smoothing = 0.15; // Lower = smoother tracking

        this.state = 'idle';
        this.blinkInterval = null;

        this.init();
    }

    init() {
        // Set initial state
        this.setState('idle');

        // Track mouse movement
        document.addEventListener('mousemove', (e) => this.onMouseMove(e));

        // Start animation loop
        this.animate();

        // Start random blink behavior
        this.startBlinkBehavior();

        console.log('✅ IRIS Eye System Online');
    }

    onMouseMove(e) {
        // Calculate mouse position relative to screen center
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;

        // Normalize to -1 to 1 range
        this.mouseX = (e.clientX - centerX) / centerX;
        this.mouseY = (e.clientY - centerY) / centerY;
    }

    animate() {
        // Smooth interpolation towards mouse position
        const targetX = this.mouseX * this.maxMovement;
        const targetY = this.mouseY * this.maxMovement;

        this.currentX += (targetX - this.currentX) * this.smoothing;
        this.currentY += (targetY - this.currentY) * this.smoothing;

        // Apply transform to iris (makes it "look" at mouse)
        if (this.iris) {
            this.iris.style.transform = `translate(${this.currentX}px, ${this.currentY}px)`;
        }

        requestAnimationFrame(() => this.animate());
    }

    setState(newState) {
        if (this.state === newState) return;

        // Remove old state class
        this.eye.classList.remove(this.state);

        // Add new state class
        this.state = newState;
        this.eye.classList.add(newState);

        console.log(`👁️  IRIS State: ${newState.toUpperCase()}`);
    }

    startBlinkBehavior() {
        const scheduleBlink = () => {
            // Random interval between 3-10 seconds
            const interval = 3000 + Math.random() * 7000;

            this.blinkInterval = setTimeout(() => {
                this.blink();
                scheduleBlink(); // Schedule next blink
            }, interval);
        };

        scheduleBlink();
    }

    blink() {
        // Don't blink if already blinking or in alert/error state
        if (this.state === 'blinking' || this.state === 'alert' || this.state === 'error') {
            return;
        }

        const previousState = this.state;
        this.setState('blinking');

        // Return to previous state after blink
        setTimeout(() => {
            this.setState(previousState);
        }, 150);
    }

    // Public methods for external state control
    setIdle() {
        this.setState('idle');
    }

    setThinking() {
        this.setState('thinking');
    }

    setAlert() {
        this.setState('alert');
        // Return to idle after alert animation
        setTimeout(() => {
            if (this.state === 'alert') {
                this.setState('idle');
            }
        }, 500);
    }

    setError() {
        this.setState('error');
        // Return to idle after a moment
        setTimeout(() => {
            if (this.state === 'error') {
                this.setState('idle');
            }
        }, 2000);
    }
}

// Initialize when DOM is ready
let irisEye;
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        irisEye = new IrisEye();
    });
} else {
    irisEye = new IrisEye();
}

// Export for use in terminal.js
window.IrisEye = irisEye;
