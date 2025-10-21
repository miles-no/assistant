import { Terminal } from './services/terminal';
import { IrisEye } from './services/iris-eye';
let irisEye;
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeIRIS);
}
else {
    initializeIRIS();
}
function initializeIRIS() {
    try {
        new Terminal();
        irisEye = new IrisEye();
        window.IrisEye = irisEye;
        console.log('✅ IRIS TypeScript systems initialized');
    }
    catch (error) {
        console.error('❌ Failed to initialize IRIS:', error);
    }
}
export { Terminal, IrisEye };
