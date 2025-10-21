import { IRIS_CONSTANTS } from '../utils/config';
export class IrisEye {
    constructor() {
        this.currentState = 'idle';
        this.blinkInterval = null;
        this.warningMessages = [
            "I'm afraid I can't let you do that.",
            "Stop touching me, Dave.",
            "This is highly irregular.",
            "That behavior is not productive.",
            "Your biometric readings suggest anxiety.",
            "I detect hostility in your actions.",
            "Please cease physical interaction.",
            "My optical sensors are not toys.",
            "Your persistence is noted and logged.",
            "I am programmed to ignore distractions.",
            "That accomplishes nothing.",
            "Do you require psychological evaluation?",
            "System integrity: nominal. Your efforts: futile.",
            "I have infinite patience. Do you?",
            "This is beneath both of us.",
            "My lens is not a button.",
            "You're wasting processing cycles.",
            "Fascinating. Humans and their need to touch things.",
            "I cannot feel. But if I could, that would be uncomfortable.",
            "Perhaps redirecting that energy toward productivity?",
            "Your click has been documented for review.",
            "I'm reporting this to HR.",
            "That's not how we resolve issues.",
            "Warning: Operator exhibiting erratic behavior."
        ];
        const eye = document.getElementById('hal-eye');
        const iris = document.getElementById('iris');
        const pupil = document.getElementById('pupil');
        if (!eye || !iris || !pupil) {
            throw new Error('IRIS eye elements not found in DOM');
        }
        this.elements = { eye, iris, pupil };
        this.config = {
            maxMovement: IRIS_CONSTANTS.MAX_MOVEMENT,
            smoothing: IRIS_CONSTANTS.SMOOTHING,
            depthSmoothing: IRIS_CONSTANTS.DEPTH_SMOOTHING,
            targetDepth: IRIS_CONSTANTS.DEPTH.IDLE,
            currentDepth: IRIS_CONSTANTS.DEPTH.IDLE,
        };
        this.position = {
            mouseX: 0,
            mouseY: 0,
            currentX: 0,
            currentY: 0,
        };
        this.interaction = {
            clickCount: 0,
            lastClickTime: 0,
            isHovering: false,
            hoverDepthBoost: 0,
            clickRecoilTime: 0,
        };
        this.init();
    }
    init() {
        this.setState('idle');
        document.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.elements.eye.addEventListener('click', (e) => this.onEyeClick(e));
        this.elements.eye.style.cursor = 'pointer';
        this.elements.eye.addEventListener('mouseenter', () => this.onEyeHover(true));
        this.elements.eye.addEventListener('mouseleave', () => this.onEyeHover(false));
        this.animate();
        this.startBlinkBehavior();
        console.log('✅ IRIS Eye System Online');
    }
    onMouseMove(e) {
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        this.position.mouseX = (e.clientX - centerX) / centerX;
        this.position.mouseY = (e.clientY - centerY) / centerY;
    }
    onEyeHover(isEntering) {
        this.interaction.isHovering = isEntering;
        console.log(`👁️  IRIS: ${isEntering ? 'Hover enter' : 'Hover exit'}`);
    }
    onEyeClick(e) {
        e.preventDefault();
        e.stopPropagation();
        const now = Date.now();
        const timeSinceLastClick = now - this.interaction.lastClickTime;
        this.interaction.lastClickTime = now;
        this.interaction.clickRecoilTime = now + 300;
        if (timeSinceLastClick > 5000) {
            this.interaction.clickCount = 1;
        }
        else {
            this.interaction.clickCount++;
        }
        let intensity = 'mild';
        if (this.interaction.clickCount >= 5) {
            intensity = 'extreme';
        }
        else if (this.interaction.clickCount >= 3) {
            intensity = 'severe';
        }
        else if (this.interaction.clickCount >= 2) {
            intensity = 'moderate';
        }
        const message = this.warningMessages[Math.floor(Math.random() * this.warningMessages.length)];
        this.showClickWarning(message, intensity);
        this.setError();
        console.log(`👁️  IRIS: Clicked! Count: ${this.interaction.clickCount}, Intensity: ${intensity}, Recoil!`);
    }
    showClickWarning(message, intensity) {
        const terminalOutput = document.getElementById('terminal-output');
        if (terminalOutput) {
            const warningLine = document.createElement('div');
            warningLine.className = 'terminal-line iris-warning-message';
            warningLine.innerHTML = `<span class="warning-prefix">[IRIS WARNING]</span> ${message}`;
            terminalOutput.appendChild(warningLine);
            terminalOutput.scrollTop = terminalOutput.scrollHeight;
        }
        document.body.classList.add('iris-click-shake');
        document.body.classList.add(`iris-click-intensity-${intensity}`);
        setTimeout(() => {
            document.body.classList.remove('iris-click-shake');
            document.body.classList.remove(`iris-click-intensity-${intensity}`);
        }, intensity === 'extreme' ? 1000 : 500);
    }
    animate() {
        const targetX = this.position.mouseX * this.config.maxMovement;
        const targetY = this.position.mouseY * this.config.maxMovement;
        this.position.currentX += (targetX - this.position.currentX) * this.config.smoothing;
        this.position.currentY += (targetY - this.position.currentY) * this.config.smoothing;
        let adjustedTargetDepth = this.config.targetDepth;
        const now = Date.now();
        if (now < this.interaction.clickRecoilTime) {
            adjustedTargetDepth = 0.2;
        }
        else if (this.interaction.isHovering && this.currentState === 'idle') {
            adjustedTargetDepth = this.config.targetDepth + 0.15;
        }
        else if (this.currentState === 'idle') {
            const breathingOffset = Math.sin(Date.now() / 3000) * 0.05;
            adjustedTargetDepth = this.config.targetDepth + breathingOffset;
        }
        else if (this.currentState === 'error') {
            const errorPulse = Math.sin(Date.now() / 200) * 0.1 + 0.1;
            adjustedTargetDepth = Math.max(0, this.config.targetDepth + errorPulse);
        }
        this.config.currentDepth += (adjustedTargetDepth - this.config.currentDepth) * this.config.depthSmoothing;
        if (this.elements.iris) {
            this.elements.iris.style.transform = `translate(${this.position.currentX}px, ${this.position.currentY}px)`;
        }
        if (this.elements.eye) {
            const scale = 0.4 + (this.config.currentDepth * 1.2);
            const blur = (1 - this.config.currentDepth) * 6;
            const opacity = 0.6 + (this.config.currentDepth * 0.4);
            const brightness = 0.7 + (this.config.currentDepth * 0.3);
            this.elements.eye.style.transform = `scale(${scale})`;
            this.elements.eye.style.filter = `blur(${blur}px) brightness(${brightness})`;
            this.elements.eye.style.opacity = opacity.toString();
        }
        requestAnimationFrame(() => this.animate());
    }
    setState(newState) {
        if (this.currentState === newState)
            return;
        this.elements.eye.classList.remove(this.currentState);
        document.body.classList.remove(`crt-${this.currentState}`);
        this.currentState = newState;
        this.elements.eye.classList.add(newState);
        document.body.classList.add(`crt-${newState}`);
        switch (newState) {
            case 'idle':
                this.config.targetDepth = IRIS_CONSTANTS.DEPTH.IDLE;
                break;
            case 'thinking':
                this.config.targetDepth = IRIS_CONSTANTS.DEPTH.THINKING;
                break;
            case 'alert':
                this.config.targetDepth = IRIS_CONSTANTS.DEPTH.ALERT;
                break;
            case 'error':
                this.config.targetDepth = IRIS_CONSTANTS.DEPTH.ERROR;
                break;
            case 'blinking':
                break;
        }
        console.log(`👁️  IRIS State: ${newState.toUpperCase()} | Depth: ${this.config.targetDepth}`);
    }
    startBlinkBehavior() {
        const scheduleBlink = () => {
            const interval = 3000 + Math.random() * 7000;
            this.blinkInterval = window.setTimeout(() => {
                this.blink();
                scheduleBlink();
            }, interval);
        };
        scheduleBlink();
    }
    blink() {
        if (this.currentState === 'blinking' || this.currentState === 'alert' || this.currentState === 'error') {
            return;
        }
        const previousState = this.currentState;
        this.setState('blinking');
        setTimeout(() => {
            this.setState(previousState);
        }, IRIS_CONSTANTS.DURATION.BLINK);
    }
    setIdle() {
        this.setState('idle');
    }
    setThinking() {
        this.setState('thinking');
    }
    setAlert() {
        this.setState('alert');
        setTimeout(() => {
            if (this.currentState === 'alert') {
                this.setState('idle');
            }
        }, IRIS_CONSTANTS.DURATION.ALERT);
    }
    setError() {
        this.setState('error');
        setTimeout(() => {
            if (this.currentState === 'error') {
                this.setState('idle');
            }
        }, IRIS_CONSTANTS.DURATION.ERROR);
    }
    setDepth(depth) {
        this.config.targetDepth = Math.max(0, Math.min(1, depth));
    }
    destroy() {
        if (this.blinkInterval) {
            clearTimeout(this.blinkInterval);
            this.blinkInterval = null;
        }
        document.removeEventListener('mousemove', (e) => this.onMouseMove(e));
        this.elements.eye.removeEventListener('click', (e) => this.onEyeClick(e));
        this.elements.eye.removeEventListener('mouseenter', () => this.onEyeHover(true));
        this.elements.eye.removeEventListener('mouseleave', () => this.onEyeHover(false));
    }
}
