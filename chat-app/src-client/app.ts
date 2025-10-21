// Configuration
const API_BASE = window.location.origin;
const API_URL = "http://localhost:3000"; // API server URL
let authToken = localStorage.getItem("milesAuthToken") || "";
let currentUser: User | null = JSON.parse(
	localStorage.getItem("milesUser") || "null",
);
let conversationId = generateId();

interface User {
	id: string;
	email: string;
	firstName: string;
	lastName: string;
	role: string;
}

interface ChatResponse {
	message: string;
	conversationId: string;
	toolsExecuted: number;
	resourcesRead: number;
}

interface LoginResponse {
	token: string;
	user: User;
}

interface Tool {
	name: string;
	description: string;
}

interface MCPInfoResponse {
	info: unknown;
	tools: Tool[];
	resources: unknown[];
}

interface HealthResponse {
	status: string;
	llm: string;
	mcp: string;
	ollama?: string;
}

// Declare marked.js global
declare const marked: {
	parse: (text: string) => string;
	setOptions: (options: { breaks: boolean; gfm: boolean }) => void;
};

// Initialize
document.addEventListener("DOMContentLoaded", () => {
	initializeApp();
});

function initializeApp(): void {
	// Check authentication state
	updateAuthUI();

	// Check server status
	checkStatus();
	loadMCPInfo();

	// Set up event listeners
	const chatForm = document.getElementById("chat-form") as HTMLFormElement;
	const loginForm = document.getElementById("login-form") as HTMLFormElement;
	const logoutButton = document.getElementById(
		"logout-button",
	) as HTMLButtonElement;

	chatForm.addEventListener("submit", handleSendMessage);
	loginForm.addEventListener("submit", handleLogin);
	logoutButton.addEventListener("click", handleLogout);

	// Suggestion buttons
	document.querySelectorAll(".suggestion-btn").forEach((btn) => {
		btn.addEventListener("click", (e) => {
			const target = e.target as HTMLButtonElement;
			const message = target.dataset.message;
			if (message) {
				const messageInput = document.getElementById(
					"message-input",
				) as HTMLInputElement;
				messageInput.value = message;
				handleSendMessage(new Event("submit") as SubmitEvent);
			}
		});
	});

	// Focus input or email field
	if (currentUser) {
		(document.getElementById("message-input") as HTMLInputElement).focus();
	} else {
		(document.getElementById("email") as HTMLInputElement).focus();
	}
}

function updateAuthUI(): void {
	const loginContainer = document.getElementById(
		"login-form-container",
	) as HTMLElement;
	const profileContainer = document.getElementById(
		"user-profile",
	) as HTMLElement;

	if (currentUser) {
		// Show profile, hide login
		loginContainer.style.display = "none";
		profileContainer.style.display = "block";

		// Update profile info
		(document.getElementById("user-name") as HTMLElement).textContent =
			`${currentUser.firstName} ${currentUser.lastName}`;
		(document.getElementById("user-email") as HTMLElement).textContent =
			currentUser.email;
		(document.getElementById("user-role") as HTMLElement).textContent =
			currentUser.role;
	} else {
		// Show login, hide profile
		loginContainer.style.display = "block";
		profileContainer.style.display = "none";
	}
}

async function handleLogin(e: Event): Promise<void> {
	e.preventDefault();

	const email = (document.getElementById("email") as HTMLInputElement).value;
	const password = (document.getElementById("password") as HTMLInputElement)
		.value;
	const errorDiv = document.getElementById("login-error") as HTMLElement;

	try {
		const response = await fetch(`${API_URL}/api/auth/login`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email, password }),
		});

		if (!response.ok) {
			const error = (await response.json()) as { error?: string };
			throw new Error(error.error || "Login failed");
		}

		const data = (await response.json()) as LoginResponse;

		// Save auth state
		authToken = data.token;
		currentUser = data.user;
		localStorage.setItem("milesAuthToken", authToken);
		localStorage.setItem("milesUser", JSON.stringify(currentUser));

		// Update UI
		updateAuthUI();
		errorDiv.style.display = "none";

		// Clear form
		(document.getElementById("login-form") as HTMLFormElement).reset();

		// Focus on chat input
		(document.getElementById("message-input") as HTMLInputElement).focus();

		showNotification(`Welcome, ${currentUser.firstName}!`, "success");
	} catch (error) {
		console.error("Login error:", error);
		errorDiv.textContent =
			error instanceof Error ? error.message : String(error);
		errorDiv.style.display = "block";
	}
}

function handleLogout(): void {
	// Clear auth state
	authToken = "";
	currentUser = null;
	localStorage.removeItem("milesAuthToken");
	localStorage.removeItem("milesUser");

	// Clear conversation
	conversationId = generateId();

	// Update UI
	updateAuthUI();

	// Clear chat history
	const chatMessages = document.getElementById("chat-messages") as HTMLElement;
	chatMessages.innerHTML = `
        <div class="message bot-message">
            <div class="message-content">
                <strong>Miles Assistant:</strong>
                <p>Hello! Please login to start booking rooms.</p>
            </div>
        </div>
    `;

	showNotification("Logged out successfully", "success");
}

function generateId(): string {
	return `conv_${Math.random().toString(36).substring(2, 15)}`;
}

async function checkStatus(): Promise<void> {
	try {
		const response = await fetch(`${API_BASE}/health`);
		const data = (await response.json()) as HealthResponse;

		// Update status indicators
		const ollamaStatus = document.getElementById(
			"ollama-status",
		) as HTMLElement;
		const mcpStatus = document.getElementById("mcp-status") as HTMLElement;

		ollamaStatus.classList.add("online");
		mcpStatus.classList.add("online");

		ollamaStatus.title = `Connected to ${data.ollama || data.llm}`;
		mcpStatus.title = `Connected to ${data.mcp}`;
	} catch (error) {
		console.error("Status check failed:", error);
		(document.getElementById("ollama-status") as HTMLElement).classList.add(
			"offline",
		);
		(document.getElementById("mcp-status") as HTMLElement).classList.add(
			"offline",
		);
	}
}

async function loadMCPInfo(): Promise<void> {
	try {
		const response = await fetch(`${API_BASE}/api/mcp/info`);
		const data = (await response.json()) as MCPInfoResponse;

		// Display tools
		const toolsList = document.getElementById("tools-list") as HTMLElement;
		if (data.tools && data.tools.length > 0) {
			toolsList.innerHTML = data.tools
				.map(
					(tool) => `
                    <div class="tool-item">
                        <strong>${tool.name}</strong>
                        <p style="font-size: 0.8rem; margin-top: 0.2rem;">${tool.description.substring(0, 60)}...</p>
                    </div>
                `,
				)
				.join("");
		} else {
			toolsList.innerHTML = "<p>No tools available</p>";
		}
	} catch (error) {
		console.error("Failed to load MCP info:", error);
		(document.getElementById("tools-list") as HTMLElement).innerHTML =
			"<p>Failed to load tools</p>";
	}
}

async function handleSendMessage(e: Event): Promise<void> {
	e.preventDefault();

	const input = document.getElementById("message-input") as HTMLInputElement;
	const message = input.value.trim();

	if (!message) {
		return;
	}

	// Check if user is logged in
	if (!currentUser) {
		showNotification("Please login first to use the chat assistant", "error");
		return;
	}

	// Clear input
	input.value = "";

	// Add user message to chat
	addMessage(message, "user");

	// Show typing indicator
	showTypingIndicator();

	// Disable input while processing
	input.disabled = true;
	(document.getElementById("send-button") as HTMLButtonElement).disabled = true;

	try {
		const response = await fetch(`${API_BASE}/api/chat`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${authToken}`,
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

		const data = (await response.json()) as ChatResponse;

		// Hide typing indicator
		hideTypingIndicator();

		// Add bot response to chat
		addMessage(data.message, "bot");

		// Show notification if tools were executed
		if (data.toolsExecuted > 0) {
			showNotification(`Executed ${data.toolsExecuted} tool(s)`, "info");
		}
	} catch (error) {
		console.error("Chat error:", error);
		hideTypingIndicator();
		addMessage(
			`Sorry, I encountered an error: ${error instanceof Error ? error.message : String(error)}. Please make sure the booking API and Ollama are running.`,
			"bot",
		);
		showNotification("Error sending message", "error");
	} finally {
		// Re-enable input
		input.disabled = false;
		(document.getElementById("send-button") as HTMLButtonElement).disabled =
			false;
		input.focus();
	}
}

function addMessage(content: string, sender: "user" | "bot"): void {
	const messagesContainer = document.getElementById(
		"chat-messages",
	) as HTMLElement;
	const messageDiv = document.createElement("div");
	messageDiv.className = `message ${sender}-message`;

	const contentDiv = document.createElement("div");
	contentDiv.className = "message-content";

	if (sender === "bot") {
		contentDiv.innerHTML = `<strong>Miles Assistant:</strong>${formatMessage(content)}`;
	} else {
		contentDiv.innerHTML = `<strong>You:</strong><p>${escapeHtml(content)}</p>`;
	}

	messageDiv.appendChild(contentDiv);
	messagesContainer.appendChild(messageDiv);

	// Scroll to bottom
	messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function formatMessage(text: string): string {
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

function escapeHtml(text: string): string {
	const div = document.createElement("div");
	div.textContent = text;
	return div.innerHTML;
}

function showTypingIndicator(): void {
	(document.getElementById("typing-indicator") as HTMLElement).style.display =
		"flex";
	const messagesContainer = document.getElementById(
		"chat-messages",
	) as HTMLElement;
	messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function hideTypingIndicator(): void {
	(document.getElementById("typing-indicator") as HTMLElement).style.display =
		"none";
}

function showNotification(
	message: string,
	type: "info" | "success" | "error" = "info",
): void {
	// Simple notification (could be enhanced with a toast library)
	console.log(`[${type.toUpperCase()}] ${message}`);

	// You could add a toast notification here
	const notification = document.createElement("div");
	notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        background: ${type === "success" ? "#10b981" : type === "error" ? "#ef4444" : "#6366f1"};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 1000;
        animation: slideInRight 0.3s ease-out;
    `;
	notification.textContent = message;
	document.body.appendChild(notification);

	setTimeout(() => {
		notification.style.animation = "slideOutRight 0.3s ease-in";
		setTimeout(() => notification.remove(), 300);
	}, 3000);
}

// Add CSS animations for notifications
const style = document.createElement("style");
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
