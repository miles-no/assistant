import { Terminal } from './services/terminal';
import { IrisEye } from './services/iris-eye';

// Initialize IRIS when DOM is ready
let irisEye: IrisEye;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeIRIS);
} else {
  initializeIRIS();
}

function initializeIRIS(): void {
  try {
    // Initialize terminal and eye systems
    new Terminal();
    irisEye = new IrisEye();

    // Make IRIS eye available globally for backward compatibility
    (window as any).IrisEye = irisEye;

    console.log('✅ IRIS TypeScript systems initialized');
  } catch (error) {
    console.error('❌ Failed to initialize IRIS:', error);
  }
}

// Export for potential use by other modules
export { Terminal, IrisEye };