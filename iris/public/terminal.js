// IRIS Terminal - Main Logic

const API_BASE = window.location.origin;
const API_URL = 'http://localhost:3000'; // Miles Booking API

let authToken = localStorage.getItem('irisAuthToken') || '';
let currentUser = JSON.parse(localStorage.getItem('irisUser') || 'null');
let commandHistory = [];
let historyIndex = -1;
let userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

// Undo support for bulk operations
let lastBulkOperation = null;

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

async function handleKeyDown(e) {
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
            const data = await response.json();
            const bookings = data.bookings || data; // Handle { bookings: [] } response format
            autocompleteCache.bookings = Array.isArray(bookings) ? bookings.filter(b => b.status !== 'CANCELLED') : [];
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

    // Alert state when command received
    if (window.IrisEye) {
        window.IrisEye.setAlert();
    }

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

    // Use LLM to parse intent from natural language
    try {
        const response = await fetch(`${API_BASE}/api/parse-intent`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`,
            },
            body: JSON.stringify({
                command,
                userId: currentUser.id,
                timezone: userTimezone,
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        stopThinking();

        // Execute the parsed intent directly
        if (data.action === 'getRooms') {
            await handleRoomsCommand([]);
        } else if (data.action === 'getBookings') {
            await handleBookingsCommand([]);
        } else if (data.action === 'cancelBooking' && data.params?.bookingId) {
            await handleCancelCommand(['cancel', data.params.bookingId]);
        } else if (data.action === 'bulkCancel' && data.params?.filter) {
            await handleBulkCancelCommand(data.params);
        } else if (data.action === 'createBooking' && data.params) {
            await handleBookingCommand(data.params);
        } else if (data.action === 'undo') {
            await handleUndoCommand();
        } else if (data.action === 'needsMoreInfo' && data.response) {
            // Display follow-up question
            addMarkdownOutput(data.response, 'system-output');
        } else if (data.response) {
            // Fallback to LLM-generated response (unknown queries)
            addMarkdownOutput(data.response, 'system-output');
        } else {
            addOutput('[ERROR] Unable to process request', 'error');
        }

    } catch (error) {
        stopThinking();

        // Trigger error state in iris
        if (window.IrisEye) {
            window.IrisEye.setError();
        }

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

        const data = await response.json();
        const rooms = data.rooms || data; // Handle { rooms: [] } response format
        stopThinking();

        if (!Array.isArray(rooms) || rooms.length === 0) {
            addOutput('[WARNING] No rooms found in system', 'system-output');
            return;
        }

        // Build markdown table
        let markdown = '[OK] Room data retrieved\n\n';
        markdown += '| ID | NAME | LOCATION | CAPACITY |\n';
        markdown += '|---|---|---|---:|\n';

        rooms.forEach(room => {
            const id = room.id || '';
            const name = room.name || 'Unnamed';
            const location = room.locationId || 'N/A';
            const capacity = room.capacity || 0;

            markdown += `| ${id} | ${name} | ${location} | ${capacity} |\n`;
        });

        markdown += `\n**Total:** ${rooms.length} rooms`;

        addMarkdownOutput(markdown, 'system-output');

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

        const data = await response.json();
        const bookings = data.bookings || data; // Handle { bookings: [] } response format
        stopThinking();

        // Filter out cancelled bookings by default
        const activeBookings = Array.isArray(bookings) ? bookings.filter(b => b.status !== 'CANCELLED') : [];

        if (activeBookings.length === 0) {
            addOutput('[WARNING] No active bookings found', 'system-output');
            return;
        }

        // Build markdown table
        let markdown = '[OK] Booking data retrieved\n\n';
        markdown += '| ID | TITLE | START | END | STATUS |\n';
        markdown += '|---|---|---|---|---|\n';

        activeBookings.forEach(booking => {
            const id = booking.id || '';
            const title = booking.title || 'Untitled';
            const start = formatDate(booking.startTime);
            const end = formatDate(booking.endTime);
            const status = booking.status || 'N/A';

            markdown += `| ${id} | ${title} | ${start} | ${end} | ${status} |\n`;
        });

        markdown += `\n**Total:** ${activeBookings.length} bookings`;

        addMarkdownOutput(markdown, 'system-output');

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
        const markdown = `[OK] Booking cancelled\n\n**Booking ID:** ${bookingId}\n\n**Status:** CANCELLED`;
        addMarkdownOutput(markdown, 'system-output');

    } catch (error) {
        stopThinking();
        addOutput(`[ERROR] ${error.message}`, 'error');
    }
}

async function handleBookingCommand(params) {
    try {
        // First, try to find the room by name if roomName is provided instead of roomId
        let roomId = params.roomId;

        if (!roomId && params.roomName) {
            const roomsResponse = await fetch(`${API_URL}/api/rooms`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });

            if (roomsResponse.ok) {
                const roomsData = await roomsResponse.json();
                const rooms = roomsData.rooms || roomsData;
                const room = rooms.find(r =>
                    r.name.toLowerCase().includes(params.roomName.toLowerCase()) ||
                    r.id.toLowerCase().includes(params.roomName.toLowerCase())
                );

                if (room) {
                    roomId = room.id;
                } else {
                    stopThinking();
                    addOutput(`[ERROR] Room "${params.roomName}" not found`, 'error');
                    return;
                }
            }
        }

        if (!roomId) {
            stopThinking();
            addOutput('[ERROR] Room ID or name required', 'error');
            return;
        }

        // Calculate endTime from startTime and duration
        const startTime = new Date(params.startTime);
        const duration = params.duration || 60; // Default 60 minutes
        const endTime = new Date(startTime.getTime() + duration * 60000);

        // Create booking
        const bookingData = {
            roomId: roomId,
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            title: params.title || 'Booking',
            description: params.description || ''
        };

        const response = await fetch(`${API_URL}/api/bookings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(bookingData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Booking failed');
        }

        const result = await response.json();
        const booking = result.booking;

        stopThinking();

        // Format times in user's local timezone
        const localStart = new Date(booking.startTime).toLocaleString('en-US', {
            timeZone: userTimezone,
            dateStyle: 'short',
            timeStyle: 'short'
        });
        const localEnd = new Date(booking.endTime).toLocaleString('en-US', {
            timeZone: userTimezone,
            timeStyle: 'short'
        });

        const markdown = `[OK] Booking confirmed

**Booking ID:** ${booking.id}
**Room:** ${booking.room?.name || roomId}
**Time:** ${localStart} - ${localEnd}
**Duration:** ${duration} minutes
**Status:** ${booking.status}

Booking operation complete.`;

        addMarkdownOutput(markdown, 'system-output');

    } catch (error) {
        stopThinking();
        addOutput(`[ERROR] ${error.message}`, 'error');
    }
}

async function handleBulkCancelCommand(params) {
    try {
        // Fetch all user bookings
        const response = await fetch(`${API_URL}/api/bookings`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (!response.ok) throw new Error('Failed to fetch bookings');

        const data = await response.json();
        let bookings = data.bookings || data;

        // Filter out already cancelled bookings
        bookings = bookings.filter(b => b.status !== 'CANCELLED');

        // Apply date filter
        const now = new Date();
        const filter = params.filter || 'all';

        if (filter === 'today') {
            const today = now.toDateString();
            bookings = bookings.filter(b => new Date(b.startTime).toDateString() === today);
        } else if (filter === 'tomorrow') {
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const tomorrowStr = tomorrow.toDateString();
            bookings = bookings.filter(b => new Date(b.startTime).toDateString() === tomorrowStr);
        } else if (filter === 'week') {
            const weekEnd = new Date(now);
            weekEnd.setDate(weekEnd.getDate() + 7);
            bookings = bookings.filter(b => {
                const startTime = new Date(b.startTime);
                return startTime >= now && startTime <= weekEnd;
            });
        }

        if (bookings.length === 0) {
            stopThinking();
            addOutput('[WARNING] No bookings found matching filter', 'system-output');
            return;
        }

        // Store booking details for undo BEFORE cancelling
        lastBulkOperation = {
            type: 'cancel',
            timestamp: Date.now(),
            bookings: bookings.map(b => ({
                roomId: b.roomId,
                startTime: b.startTime,
                endTime: b.endTime,
                title: b.title,
                description: b.description || ''
            }))
        };

        // Cancel each booking
        const cancelResults = [];
        for (const booking of bookings) {
            try {
                const cancelResponse = await fetch(`${API_URL}/api/bookings/${booking.id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${authToken}` }
                });

                cancelResults.push({
                    id: booking.id,
                    title: booking.title,
                    success: cancelResponse.ok
                });
            } catch (error) {
                cancelResults.push({
                    id: booking.id,
                    title: booking.title,
                    success: false
                });
            }
        }

        stopThinking();

        const successCount = cancelResults.filter(r => r.success).length;
        const markdown = `[OK] Cancellation sequence initiated

**Terminated:** ${successCount} booking(s)
**Filter:** ${filter}

Type \`undo\` to restore cancelled bookings.`;

        addMarkdownOutput(markdown, 'system-output');

    } catch (error) {
        stopThinking();
        addOutput(`[ERROR] ${error.message}`, 'error');
    }
}

async function handleUndoCommand() {
    if (!lastBulkOperation) {
        stopThinking();
        addOutput('[ERROR] No operation to undo', 'error');
        return;
    }

    if (lastBulkOperation.type !== 'cancel') {
        stopThinking();
        addOutput('[ERROR] Undo not supported for this operation type', 'error');
        return;
    }

    try {
        const bookingsToRestore = lastBulkOperation.bookings;
        const restoreResults = [];

        for (const booking of bookingsToRestore) {
            try {
                const response = await fetch(`${API_URL}/api/bookings`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`
                    },
                    body: JSON.stringify(booking)
                });

                restoreResults.push({
                    title: booking.title,
                    success: response.ok
                });
            } catch (error) {
                restoreResults.push({
                    title: booking.title,
                    success: false
                });
            }
        }

        stopThinking();

        const successCount = restoreResults.filter(r => r.success).length;
        const markdown = `[OK] Undo operation complete

**Restored:** ${successCount} booking(s)

Operation history cleared.`;

        addMarkdownOutput(markdown, 'system-output');

        // Clear undo history after use
        lastBulkOperation = null;

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
    const markdown = `
# COMMAND REFERENCE

## DATA QUERIES

▸ **rooms** - Display all rooms
▸ **bookings** - Display active bookings
▸ **cancel** \`<id>\` - Cancel booking by ID

## BULK OPERATIONS

▸ **cancel all bookings** - Terminate all bookings
▸ **cancel all today** - Terminate today's bookings
▸ **cancel all tomorrow** - Terminate tomorrow's bookings
▸ **cancel all this week** - Terminate next 7 days
▸ **undo** - Restore last bulk operation

## SYSTEM

▸ **help** - Display this reference
▸ **clear, cls** - Clear terminal buffer
▸ **status** - System diagnostic
▸ **about** - System information

## NATURAL LANGUAGE

For complex operations, use natural language queries.

**Example:** "Book conference room A tomorrow at 14:00"
`;

    addMarkdownOutput(markdown, 'system-output');
}

function showStatus() {
    const markdown = `
## SYSTEM STATUS

**System:** IRIS v1.0
**User:** ${currentUser.firstName} ${currentUser.lastName}
**Role:** ${currentUser.role}
**Connected:** ${new Date().toLocaleString()}
**Backend:** ${API_BASE}
`;

    addMarkdownOutput(markdown, 'system-output');
}

function showAbout() {
    const markdown = `
# IRIS
**Intelligent Room Interface System**

Version 1.0.0

---

**Architecture:** HAL-9000 derived neural framework
**Purpose:** Workspace resource allocation and management
**Status:** Fully operational

---

This system is designed to process booking operations with maximum efficiency and minimum human oversight.
`;

    addMarkdownOutput(markdown, 'system-output');
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

function addMarkdownOutput(markdown, className = 'system-output') {
    const output = document.getElementById('terminal-output');
    const container = document.createElement('div');
    container.className = `terminal-line markdown-content ${className}`;

    // Configure marked for terminal-like output
    marked.setOptions({
        breaks: true,
        gfm: true
    });

    // Render markdown
    container.innerHTML = marked.parse(markdown);
    output.appendChild(container);

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
    // Trigger IRIS eye thinking state
    if (window.IrisEye) {
        window.IrisEye.setThinking();
    }

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
    // Return IRIS eye to idle state
    if (window.IrisEye) {
        window.IrisEye.setIdle();
    }

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
