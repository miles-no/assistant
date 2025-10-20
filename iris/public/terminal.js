// IRIS Terminal - Main Logic

const API_BASE = window.location.origin;
const API_URL = 'http://localhost:3000'; // Miles Booking API

let authToken = localStorage.getItem('irisAuthToken') || '';
let currentUser = JSON.parse(localStorage.getItem('irisUser') || 'null');
let commandHistory = [];
let historyIndex = -1;

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    initializeTerminal();
});

function initializeTerminal() {
    // Check if already logged in
    if (currentUser && authToken) {
        showTerminal();
    } else {
        showLogin();
    }

    // Setup event listeners
    document.getElementById('login-form')?.addEventListener('submit', handleLogin);
    document.getElementById('logout-btn')?.addEventListener('click', handleLogout);
    document.getElementById('terminal-input')?.addEventListener('keydown', handleKeyDown);
    document.getElementById('terminal-input')?.addEventListener('keyup', handleKeyUp);
}

function showLogin() {
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('terminal').style.display = 'none';
    document.getElementById('email')?.focus();
}

function showTerminal() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('terminal').style.display = 'flex';

    // Update user info
    if (currentUser) {
        document.getElementById('user-info').textContent =
            `${currentUser.firstName} ${currentUser.lastName} | ${currentUser.role}`;
    }

    // Show welcome message
    if (document.getElementById('terminal-output').children.length === 0) {
        typeWelcomeMessage();
    }

    // Focus input
    document.getElementById('terminal-input').focus();
}

async function handleLogin(e) {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('login-error');

    // Start HAL thinking animation
    startThinking();

    try {
        const response = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Login failed');
        }

        const data = await response.json();

        // Save auth state
        authToken = data.token;
        currentUser = data.user;
        localStorage.setItem('irisAuthToken', authToken);
        localStorage.setItem('irisUser', JSON.stringify(currentUser));

        // Hide error
        errorDiv.classList.remove('show');
        errorDiv.textContent = '';

        // Show terminal
        stopThinking();
        showTerminal();

    } catch (error) {
        stopThinking();
        console.error('Login error:', error);
        errorDiv.textContent = `ERROR: ${error.message}`;
        errorDiv.classList.add('show');
    }
}

function handleLogout() {
    // Clear auth state
    authToken = '';
    currentUser = null;
    localStorage.removeItem('irisAuthToken');
    localStorage.removeItem('irisUser');

    // Clear terminal
    document.getElementById('terminal-output').innerHTML = '';
    commandHistory = [];
    historyIndex = -1;

    // Show login
    showLogin();
}

function typeWelcomeMessage() {
    const welcome = [
        '═══════════════════════════════════════════════════════════',
        '  ██╗██████╗ ██╗███████╗',
        '  ██║██╔══██╗██║██╔════╝',
        '  ██║██████╔╝██║███████╗',
        '  ██║██╔══██╗██║╚════██║',
        '  ██║██║  ██║██║███████║',
        '  ╚═╝╚═╝  ╚═╝╚═╝╚══════╝',
        '',
        '  MILES AI ASSISTANT - VERSION 1.0',
        '  "Filtering out the questions you could figure out yourself"',
        '',
        '═══════════════════════════════════════════════════════════',
        '',
        `Hello, ${currentUser.firstName}.`,
        '',
        'I am IRIS, your AI assistant for the Miles booking system.',
        'Type \'help\' for available commands.',
        '',
    ];

    welcome.forEach((line, index) => {
        setTimeout(() => {
            addOutput(line, 'system-output');
        }, index * 50);
    });
}

function handleKeyDown(e) {
    const input = e.target;

    // Handle Enter
    if (e.key === 'Enter') {
        e.preventDefault();
        const command = input.value.trim();
        if (command) {
            processCommand(command);
            input.value = '';
            historyIndex = -1;
        }
    }

    // Handle Up Arrow (command history)
    else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (commandHistory.length > 0) {
            if (historyIndex === -1) {
                historyIndex = commandHistory.length - 1;
            } else if (historyIndex > 0) {
                historyIndex--;
            }
            input.value = commandHistory[historyIndex];
        }
    }

    // Handle Down Arrow (command history)
    else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (historyIndex !== -1) {
            if (historyIndex < commandHistory.length - 1) {
                historyIndex++;
                input.value = commandHistory[historyIndex];
            } else {
                historyIndex = -1;
                input.value = '';
            }
        }
    }

    // Handle Tab (autocomplete - future feature)
    else if (e.key === 'Tab') {
        e.preventDefault();
        // TODO: Implement autocomplete
    }
}

function handleKeyUp(e) {
    // Could add live suggestions here
}

async function processCommand(command) {
    // Add to history
    commandHistory.push(command);

    // Display user input
    addOutput(`> ${command}`, 'user-input');

    // Start HAL thinking
    startThinking();

    // Handle built-in commands
    const cmd = command.toLowerCase().trim();

    if (cmd === 'help') {
        stopThinking();
        showHelp();
        return;
    }

    if (cmd === 'clear' || cmd === 'cls') {
        stopThinking();
        document.getElementById('terminal-output').innerHTML = '';
        return;
    }

    if (cmd.startsWith('echo ')) {
        stopThinking();
        addOutput(command.substring(5), 'system-output');
        return;
    }

    if (cmd === 'status') {
        stopThinking();
        showStatus();
        return;
    }

    if (cmd === 'about' || cmd === 'info') {
        stopThinking();
        showAbout();
        return;
    }

    // Send to IRIS AI backend
    try {
        const response = await fetch(`${API_BASE}/api/command`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`,
            },
            body: JSON.stringify({
                command,
                userId: currentUser.id,
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        stopThinking();

        // Type out response character by character
        typeOutput(data.response, 'system-output');

    } catch (error) {
        stopThinking();
        console.error('Command error:', error);
        addOutput(`ERROR: ${error.message}`, 'error');
        addOutput('Make sure the IRIS server is running.', 'error');
    }
}

function showHelp() {
    const help = [
        '',
        '═══════════════════════════════════════════════════════════',
        '  AVAILABLE COMMANDS',
        '═══════════════════════════════════════════════════════════',
        '',
        '  BOOKING COMMANDS:',
        '    book <room> <time>       Book a room',
        '    rooms                    List available rooms',
        '    bookings                 Show your bookings',
        '    cancel <id>              Cancel a booking',
        '',
        '  SYSTEM COMMANDS:',
        '    help                     Show this help',
        '    clear, cls               Clear terminal',
        '    status                   Show system status',
        '    about, info              About IRIS',
        '',
        '  NATURAL LANGUAGE:',
        '    You can also just chat naturally with IRIS!',
        '    Example: "Find me a room tomorrow at 2pm"',
        '',
        '═══════════════════════════════════════════════════════════',
        '',
    ];

    help.forEach(line => addOutput(line, 'system-output'));
}

function showStatus() {
    const status = [
        '',
        `System:     IRIS v1.0`,
        `User:       ${currentUser.firstName} ${currentUser.lastName}`,
        `Role:       ${currentUser.role}`,
        `Connected:  ${new Date().toLocaleString()}`,
        `Backend:    ${API_BASE}`,
        '',
    ];

    status.forEach(line => addOutput(line, 'system-output'));
}

function showAbout() {
    const about = [
        '',
        'IRIS - Miles AI Assistant',
        '',
        'Siri har mye på agendaen, så vi introduserer IRIS –',
        'Miles sin egen AI-assistent som kan filtrere bort',
        'alle de spørsmålene du kunne funnet ut av selv.',
        '',
        'Built with HAL-9000 inspired aesthetics.',
        'Version 1.0 - Retro-Futuristic Terminal Interface',
        '',
    ];

    about.forEach(line => addOutput(line, 'system-output'));
}

function addOutput(text, className = 'system-output') {
    const output = document.getElementById('terminal-output');
    const line = document.createElement('div');
    line.className = `terminal-line ${className}`;
    line.textContent = text;
    output.appendChild(line);

    // Scroll to bottom
    output.scrollTop = output.scrollHeight;
}

function typeOutput(text, className = 'system-output', speed = 20) {
    // Split by lines to preserve ASCII tables and formatting
    const lines = text.split('\n');

    lines.forEach((lineText, lineIndex) => {
        // Add each line with a small delay
        setTimeout(() => {
            addOutput(lineText, className);
        }, lineIndex * 50); // 50ms delay between lines for typing effect
    });
}

function startThinking() {
    document.getElementById('hal-eye')?.classList.add('thinking');
    document.getElementById('hal-status').textContent = 'PROCESSING...';

    // Add typing indicator
    const output = document.getElementById('terminal-output');
    const indicator = document.createElement('div');
    indicator.className = 'terminal-line typing-indicator';
    indicator.id = 'typing-indicator';
    indicator.innerHTML = `
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
    `;
    output.appendChild(indicator);
    output.scrollTop = output.scrollHeight;
}

function stopThinking() {
    document.getElementById('hal-eye')?.classList.remove('thinking');
    document.getElementById('hal-status').textContent = 'IRIS v1.0 - ONLINE';

    // Remove typing indicator
    document.getElementById('typing-indicator')?.remove();
}

// Health check
async function checkHealth() {
    try {
        const response = await fetch(`${API_BASE}/health`);
        const data = await response.json();
        console.log('IRIS Health:', data);
    } catch (error) {
        console.error('Health check failed:', error);
    }
}

// Check health on load
checkHealth();
