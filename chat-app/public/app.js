// Configuration
const API_BASE = window.location.origin;
const API_URL = 'http://localhost:3000'; // API server URL
let authToken = localStorage.getItem('milesAuthToken') || '';
let currentUser = JSON.parse(localStorage.getItem('milesUser') || 'null');
let conversationId = generateId();

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    // Check authentication state
    updateAuthUI();

    // Check server status
    checkStatus();
    loadMCPInfo();

    // Set up event listeners
    document.getElementById('chat-form').addEventListener('submit', handleSendMessage);
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('logout-button').addEventListener('click', handleLogout);

    // Suggestion buttons
    document.querySelectorAll('.suggestion-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const message = e.target.dataset.message;
            document.getElementById('message-input').value = message;
            handleSendMessage(new Event('submit'));
        });
    });

    // Focus input or email field
    if (currentUser) {
        document.getElementById('message-input').focus();
    } else {
        document.getElementById('email').focus();
    }
}

function updateAuthUI() {
    const loginContainer = document.getElementById('login-form-container');
    const profileContainer = document.getElementById('user-profile');

    if (currentUser) {
        // Show profile, hide login
        loginContainer.style.display = 'none';
        profileContainer.style.display = 'block';

        // Update profile info
        document.getElementById('user-name').textContent = `${currentUser.firstName} ${currentUser.lastName}`;
        document.getElementById('user-email').textContent = currentUser.email;
        document.getElementById('user-role').textContent = currentUser.role;
    } else {
        // Show login, hide profile
        loginContainer.style.display = 'block';
        profileContainer.style.display = 'none';
    }
}

async function handleLogin(e) {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('login-error');

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
        localStorage.setItem('milesAuthToken', authToken);
        localStorage.setItem('milesUser', JSON.stringify(currentUser));

        // Update UI
        updateAuthUI();
        errorDiv.style.display = 'none';

        // Clear form
        document.getElementById('login-form').reset();

        // Focus on chat input
        document.getElementById('message-input').focus();

        showNotification(`Welcome, ${currentUser.firstName}!`, 'success');
    } catch (error) {
        console.error('Login error:', error);
        errorDiv.textContent = error.message;
        errorDiv.style.display = 'block';
    }
}

function handleLogout() {
    // Clear auth state
    authToken = '';
    currentUser = null;
    localStorage.removeItem('milesAuthToken');
    localStorage.removeItem('milesUser');

    // Clear conversation
    conversationId = generateId();

    // Update UI
    updateAuthUI();

    // Clear chat history
    const chatMessages = document.getElementById('chat-messages');
    chatMessages.innerHTML = `
        <div class="message bot-message">
            <div class="message-content">
                <strong>Miles Assistant:</strong>
                <p>Hello! Please login to start booking rooms.</p>
            </div>
        </div>
    `;

    showNotification('Logged out successfully', 'success');
}

function generateId() {
    return 'conv_' + Math.random().toString(36).substring(2, 15);
}

// Removed saveConfig - no longer needed with authentication

async function checkStatus() {
    try {
        const response = await fetch(`${API_BASE}/health`);
        const data = await response.json();

        // Update status indicators
        const ollamaStatus = document.getElementById('ollama-status');
        const mcpStatus = document.getElementById('mcp-status');

        ollamaStatus.classList.add('online');
        mcpStatus.classList.add('online');

        ollamaStatus.title = `Connected to ${data.ollama}`;
        mcpStatus.title = `Connected to ${data.mcp}`;
    } catch (error) {
        console.error('Status check failed:', error);
        document.getElementById('ollama-status').classList.add('offline');
        document.getElementById('mcp-status').classList.add('offline');
    }
}

async function loadMCPInfo() {
    try {
        const response = await fetch(`${API_BASE}/api/mcp/info`);
        const data = await response.json();

        // Display tools
        const toolsList = document.getElementById('tools-list');
        if (data.tools && data.tools.length > 0) {
            toolsList.innerHTML = data.tools
                .map(tool => `
                    <div class="tool-item">
                        <strong>${tool.name}</strong>
                        <p style="font-size: 0.8rem; margin-top: 0.2rem;">${tool.description.substring(0, 60)}...</p>
                    </div>
                `)
                .join('');
        } else {
            toolsList.innerHTML = '<p>No tools available</p>';
        }
    } catch (error) {
        console.error('Failed to load MCP info:', error);
        document.getElementById('tools-list').innerHTML = '<p>Failed to load tools</p>';
    }
}

async function handleSendMessage(e) {
    e.preventDefault();

    const input = document.getElementById('message-input');
    const message = input.value.trim();

    if (!message) return;

    // Check if user is logged in
    if (!currentUser) {
        showNotification('Please login first to use the chat assistant', 'error');
        return;
    }

    // Clear input
    input.value = '';

    // Add user message to chat
    addMessage(message, 'user');

    // Show typing indicator
    showTypingIndicator();

    // Disable input while processing
    input.disabled = true;
    document.getElementById('send-button').disabled = true;

    try {
        const response = await fetch(`${API_BASE}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`,
            },
            body: JSON.stringify({
                message,
                conversationId,
                userId: currentUser.id,
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // Hide typing indicator
        hideTypingIndicator();

        // Add bot response to chat
        addMessage(data.message, 'bot');

        // Show notification if tools were executed
        if (data.toolsExecuted > 0) {
            showNotification(`Executed ${data.toolsExecuted} tool(s)`, 'info');
        }
    } catch (error) {
        console.error('Chat error:', error);
        hideTypingIndicator();
        addMessage(
            `Sorry, I encountered an error: ${error.message}. Please make sure the booking API and Ollama are running.`,
            'bot'
        );
        showNotification('Error sending message', 'error');
    } finally {
        // Re-enable input
        input.disabled = false;
        document.getElementById('send-button').disabled = false;
        input.focus();
    }
}

function addMessage(content, sender) {
    const messagesContainer = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    if (sender === 'bot') {
        contentDiv.innerHTML = `<strong>Miles Assistant:</strong>${formatMessage(content)}`;
    } else {
        contentDiv.innerHTML = `<strong>You:</strong><p>${escapeHtml(content)}</p>`;
    }

    messageDiv.appendChild(contentDiv);
    messagesContainer.appendChild(messageDiv);

    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function formatMessage(text) {
    // Use marked.js to render markdown to HTML
    // Configure marked for better rendering
    marked.setOptions({
        breaks: true, // Convert \n to <br>
        gfm: true, // GitHub Flavored Markdown (supports tables)
    });

    // Parse markdown to HTML
    const html = marked.parse(text);

    return `<div class="markdown-content">${html}</div>`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showTypingIndicator() {
    document.getElementById('typing-indicator').style.display = 'flex';
    const messagesContainer = document.getElementById('chat-messages');
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function hideTypingIndicator() {
    document.getElementById('typing-indicator').style.display = 'none';
}

function showNotification(message, type = 'info') {
    // Simple notification (could be enhanced with a toast library)
    console.log(`[${type.toUpperCase()}] ${message}`);

    // You could add a toast notification here
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#6366f1'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 1000;
        animation: slideInRight 0.3s ease-out;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-in';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add CSS animations for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
