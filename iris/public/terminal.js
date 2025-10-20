// IRIS Terminal - Main Logic

const API_BASE = window.location.origin;
const API_URL = 'http://localhost:3000'; // Miles Booking API

let authToken = localStorage.getItem('irisAuthToken') || '';
let currentUser = JSON.parse(localStorage.getItem('irisUser') || 'null');
let commandHistory = [];
let historyIndex = -1;

// Autocomplete state
let autocompleteCache = {
    rooms: null,
    bookings: null,
    lastFetch: 0
};
let currentSuggestions = [];
let suggestionIndex = -1;

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
        '  IRIS TERMINAL INTERFACE v1.0',
        '  SYSTEM INITIALIZED',
        '',
        '═══════════════════════════════════════════════════════════',
        '',
        `User authenticated: ${currentUser.firstName} ${currentUser.lastName}`,
        `Access level: ${currentUser.role}`,
        '',
        'All system functions are now operational.',
        'Enter commands. Type "help" for available operations.',
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

    // Handle Tab (autocomplete)
    else if (e.key === 'Tab') {
        e.preventDefault();
        await handleTabComplete(input);
    }
}

function handleKeyUp(e) {
    // Reset autocomplete on any key except Tab
    if (e.key !== 'Tab') {
        currentSuggestions = [];
        suggestionIndex = -1;
    }
}

// Tab completion handler
async function handleTabComplete(input) {
    const text = input.value;
    const parts = text.trim().split(/\s+/);

    // If already cycling through suggestions
    if (currentSuggestions.length > 0) {
        suggestionIndex = (suggestionIndex + 1) % currentSuggestions.length;
        const suggestion = currentSuggestions[suggestionIndex];
        input.value = suggestion.completion;
        return;
    }

    // Generate new suggestions based on command
    if (parts.length === 1) {
        // Command completion
        const commands = ['rooms', 'bookings', 'cancel', 'help', 'status', 'about', 'clear'];
        currentSuggestions = commands
            .filter(cmd => cmd.startsWith(parts[0].toLowerCase()))
            .map(cmd => ({ completion: cmd, description: '' }));
    } else if (parts[0].toLowerCase() === 'cancel' && parts.length === 2) {
        // Booking ID completion for cancel command
        await fetchBookingsForAutocomplete();
        if (autocompleteCache.bookings) {
            currentSuggestions = autocompleteCache.bookings
                .filter(b => b.id.startsWith(parts[1]))
                .map(b => ({
                    completion: `cancel ${b.id}`,
                    description: `${b.title} (${formatDate(b.startTime)})`
                }));
        }
    }

    // Apply first suggestion if any
    if (currentSuggestions.length > 0) {
        suggestionIndex = 0;
        input.value = currentSuggestions[0].completion;

        // Show suggestion hint
        if (currentSuggestions[0].description) {
            showAutocompleteSuggestion(currentSuggestions[0].description);
        }
    }
}

function showAutocompleteSuggestion(description) {
    // Show temporary suggestion hint above input
    const output = document.getElementById('terminal-output');
    const hint = document.createElement('div');
    hint.className = 'terminal-line system-output';
    hint.textContent = `  → ${description}`;
    hint.id = 'autocomplete-hint';
    output.appendChild(hint);

    // Remove after a moment
    setTimeout(() => hint.remove(), 2000);
}

// Fetch data for autocomplete
async function fetchBookingsForAutocomplete() {
    const now = Date.now();
    if (autocompleteCache.bookings && (now - autocompleteCache.lastFetch) < 30000) {
        return; // Use cache if less than 30s old
    }

    try {
        const response = await fetch(`${API_URL}/api/bookings`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (response.ok) {
            const bookings = await response.json();
            autocompleteCache.bookings = bookings.filter(b => b.status !== 'CANCELLED');
            autocompleteCache.lastFetch = now;
        }
    } catch (error) {
        console.error('Autocomplete fetch failed:', error);
    }
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
    const parts = command.trim().split(/\s+/);
    const mainCmd = parts[0].toLowerCase();

    // Built-in system commands
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

    // Direct API commands (like CLI)
    if (mainCmd === 'rooms') {
        await handleRoomsCommand(parts);
        return;
    }

    if (mainCmd === 'bookings' || mainCmd === 'list') {
        await handleBookingsCommand(parts);
        return;
    }

    if (mainCmd === 'cancel') {
        await handleCancelCommand(parts);
        return;
    }

    // Complex query - send to LLM
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

        // Type out response
        typeOutput(data.response, 'system-output');

    } catch (error) {
        stopThinking();
        console.error('Command error:', error);
        addOutput(`[ERROR] ${error.message}`, 'error');
        addOutput('System: Check IRIS server status.', 'error');
    }
}

// Direct API call handlers
async function handleRoomsCommand(parts) {
    try {
        const response = await fetch(`${API_URL}/api/rooms`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (!response.ok) throw new Error('API request failed');

        const rooms = await response.json();
        stopThinking();

        if (rooms.length === 0) {
            addOutput('[WARNING] No rooms found in system', 'system-output');
            return;
        }

        addOutput('[OK] Room data retrieved', 'system-output');
        addOutput('', 'system-output');

        // ASCII table header
        const header = `${'ID'.padEnd(25)} ${'NAME'.padEnd(30)} ${'LOCATION'.padEnd(12)} ${'CAP'.padEnd(5)}`;
        const separator = '-'.repeat(80);

        addOutput(header, 'system-output');
        addOutput(separator, 'system-output');

        // Print rooms
        rooms.forEach(room => {
            const id = (room.id || '').substring(0, 25).padEnd(25);
            const name = (room.name || 'Unnamed').substring(0, 30).padEnd(30);
            const location = (room.locationId || 'N/A').substring(0, 12).padEnd(12);
            const capacity = String(room.capacity || 0).padEnd(5);

            addOutput(`${id} ${name} ${location} ${capacity}`, 'system-output');
        });

        addOutput('', 'system-output');
        addOutput(`Total: ${rooms.length} rooms`, 'system-output');

    } catch (error) {
        stopThinking();
        addOutput(`[ERROR] ${error.message}`, 'error');
    }
}

async function handleBookingsCommand(parts) {
    try {
        const response = await fetch(`${API_URL}/api/bookings`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (!response.ok) throw new Error('API request failed');

        const bookings = await response.json();
        stopThinking();

        // Filter out cancelled bookings by default
        const activeBookings = bookings.filter(b => b.status !== 'CANCELLED');

        if (activeBookings.length === 0) {
            addOutput('[WARNING] No active bookings found', 'system-output');
            return;
        }

        addOutput('[OK] Booking data retrieved', 'system-output');
        addOutput('', 'system-output');

        // ASCII table header
        const header = `${'ID'.padEnd(25)} ${'TITLE'.padEnd(30)} ${'START'.padEnd(16)} ${'END'.padEnd(16)} ${'STATUS'.padEnd(10)}`;
        const separator = '-'.repeat(100);

        addOutput(header, 'system-output');
        addOutput(separator, 'system-output');

        // Print bookings
        activeBookings.forEach(booking => {
            const id = (booking.id || '').substring(0, 25).padEnd(25);
            const title = (booking.title || 'Untitled').substring(0, 30).padEnd(30);
            const start = formatDate(booking.startTime).padEnd(16);
            const end = formatDate(booking.endTime).padEnd(16);
            const status = (booking.status || 'N/A').padEnd(10);

            addOutput(`${id} ${title} ${start} ${end} ${status}`, 'system-output');
        });

        addOutput('', 'system-output');
        addOutput(`Total: ${activeBookings.length} bookings`, 'system-output');

    } catch (error) {
        stopThinking();
        addOutput(`[ERROR] ${error.message}`, 'error');
    }
}

async function handleCancelCommand(parts) {
    if (parts.length < 2) {
        stopThinking();
        addOutput('[ERROR] Usage: cancel <booking-id>', 'error');
        return;
    }

    const bookingId = parts[1];

    try {
        const response = await fetch(`${API_URL}/api/bookings/${bookingId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (!response.ok) throw new Error('Cancellation failed');

        stopThinking();
        addOutput(`[OK] Booking ${bookingId} cancelled`, 'system-output');

    } catch (error) {
        stopThinking();
        addOutput(`[ERROR] ${error.message}`, 'error');
    }
}

function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toISOString().substring(0, 16).replace('T', ' ');
}

function showHelp() {
    const help = [
        '',
        '═══════════════════════════════════════════════════════════',
        '  COMMAND REFERENCE',
        '═══════════════════════════════════════════════════════════',
        '',
        '  DATA QUERIES:',
        '    rooms                    Display all rooms',
        '    bookings                 Display active bookings',
        '    cancel <id>              Cancel booking by ID',
        '',
        '  SYSTEM:',
        '    help                     Display this reference',
        '    clear, cls               Clear terminal buffer',
        '    status                   System diagnostic',
        '    about                    System information',
        '',
        '  NATURAL LANGUAGE:',
        '    For complex operations, use natural language queries.',
        '    Example: "Book conference room A tomorrow at 14:00"',
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
        'IRIS - Intelligent Room Interface System',
        'Version 1.0.0',
        '',
        'Architecture: HAL-9000 derived neural framework',
        'Purpose: Workspace resource allocation and management',
        'Status: Fully operational',
        '',
        'This system is designed to process booking operations',
        'with maximum efficiency and minimum human oversight.',
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
