// IRIS Terminal - Main Logic

const API_BASE = window.location.origin;
const API_URL = "http://localhost:3000"; // Miles Booking API

let authToken = localStorage.getItem("irisAuthToken") || "";
let currentUser = JSON.parse(localStorage.getItem("irisUser") || "null");
let commandHistory = [];
let historyIndex = -1;
const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

// Undo support for bulk operations
let lastBulkOperation = null;

// Autocomplete state
const autocompleteCache = {
	rooms: null,
	bookings: null,
	lastFetch: 0,
};
let currentSuggestions = [];
let suggestionIndex = -1;

// Initialize on DOM load
document.addEventListener("DOMContentLoaded", () => {
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
	document
		.getElementById("login-form")
		?.addEventListener("submit", handleLogin);
	document
		.getElementById("logout-btn")
		?.addEventListener("click", handleLogout);
	document
		.getElementById("terminal-input")
		?.addEventListener("keydown", handleKeyDown);
	document
		.getElementById("terminal-input")
		?.addEventListener("keyup", handleKeyUp);
}

function showLogin() {
	document.getElementById("login-screen").style.display = "flex";
	document.getElementById("terminal").style.display = "none";
	document.getElementById("email")?.focus();
}

function showTerminal() {
	document.getElementById("login-screen").style.display = "none";
	document.getElementById("terminal").style.display = "flex";

	// Update user info
	if (currentUser) {
		document.getElementById("user-info").textContent =
			`${currentUser.firstName} ${currentUser.lastName} | ${currentUser.role}`;
	}

	// Show welcome message
	if (document.getElementById("terminal-output").children.length === 0) {
		typeWelcomeMessage();
	}

	// Focus input
	document.getElementById("terminal-input").focus();
}

async function handleLogin(e) {
	e.preventDefault();

	const email = document.getElementById("email").value;
	const password = document.getElementById("password").value;
	const errorDiv = document.getElementById("login-error");

	// Start HAL thinking animation
	startThinking();

	try {
		const response = await fetch(`${API_URL}/api/auth/login`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email, password }),
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || "Login failed");
		}

		const data = await response.json();

		// Save auth state
		authToken = data.token;
		currentUser = data.user;
		localStorage.setItem("irisAuthToken", authToken);
		localStorage.setItem("irisUser", JSON.stringify(currentUser));

		// Hide error
		errorDiv.classList.remove("show");
		errorDiv.textContent = "";

		// Show terminal
		stopThinking();
		showTerminal();
	} catch (error) {
		stopThinking();
		console.error("Login error:", error);
		errorDiv.textContent = `ERROR: ${error.message}`;
		errorDiv.classList.add("show");
	}
}

function handleLogout() {
	// Clear auth state
	authToken = "";
	currentUser = null;
	localStorage.removeItem("irisAuthToken");
	localStorage.removeItem("irisUser");

	// Clear terminal
	document.getElementById("terminal-output").innerHTML = "";
	commandHistory = [];
	historyIndex = -1;

	// Show login
	showLogin();
}

function typeWelcomeMessage() {
	const welcome = [
		"═══════════════════════════════════════════════════════════",
		"  ██╗██████╗ ██╗███████╗",
		"  ██║██╔══██╗██║██╔════╝",
		"  ██║██████╔╝██║███████╗",
		"  ██║██╔══██╗██║╚════██║",
		"  ██║██║  ██║██║███████║",
		"  ╚═╝╚═╝  ╚═╝╚═╝╚══════╝",
		"",
		"  IRIS TERMINAL INTERFACE v1.0",
		"  SYSTEM INITIALIZED",
		"",
		"═══════════════════════════════════════════════════════════",
		"",
		`User authenticated: ${currentUser.firstName} ${currentUser.lastName}`,
		`Access level: ${currentUser.role}`,
		"",
		"All system functions are now operational.",
		'Enter commands. Type "help" for available operations.',
		"",
	];

	welcome.forEach((line, index) => {
		setTimeout(() => {
			addOutput(line, "system-output");
		}, index * 50);
	});
}

async function handleKeyDown(e) {
	const input = e.target;

	// Handle Enter
	if (e.key === "Enter") {
		e.preventDefault();
		const command = input.value.trim();
		if (command) {
			processCommand(command);
			input.value = "";
			historyIndex = -1;
		}
	}

	// Handle Up Arrow (command history)
	else if (e.key === "ArrowUp") {
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
	else if (e.key === "ArrowDown") {
		e.preventDefault();
		if (historyIndex !== -1) {
			if (historyIndex < commandHistory.length - 1) {
				historyIndex++;
				input.value = commandHistory[historyIndex];
			} else {
				historyIndex = -1;
				input.value = "";
			}
		}
	}

	// Handle Tab (autocomplete)
	else if (e.key === "Tab") {
		e.preventDefault();
		await handleTabComplete(input);
	}
}

function handleKeyUp(e) {
	// Reset autocomplete on any key except Tab
	if (e.key !== "Tab") {
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
		const commands = [
			"rooms",
			"bookings",
			"cancel",
			"help",
			"status",
			"about",
			"clear",
		];
		currentSuggestions = commands
			.filter((cmd) => cmd.startsWith(parts[0].toLowerCase()))
			.map((cmd) => ({ completion: cmd, description: "" }));
	} else if (parts[0].toLowerCase() === "cancel" && parts.length === 2) {
		// Booking ID completion for cancel command
		await fetchBookingsForAutocomplete();
		if (autocompleteCache.bookings) {
			currentSuggestions = autocompleteCache.bookings
				.filter((b) => b.id.startsWith(parts[1]))
				.map((b) => ({
					completion: `cancel ${b.id}`,
					description: `${b.title} (${formatDate(b.startTime)})`,
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
	const output = document.getElementById("terminal-output");
	const hint = document.createElement("div");
	hint.className = "terminal-line system-output";
	hint.textContent = `  → ${description}`;
	hint.id = "autocomplete-hint";
	output.appendChild(hint);

	// Remove after a moment
	setTimeout(() => hint.remove(), 2000);
}

// Fetch data for autocomplete
async function fetchBookingsForAutocomplete() {
	const now = Date.now();
	if (autocompleteCache.bookings && now - autocompleteCache.lastFetch < 30000) {
		return; // Use cache if less than 30s old
	}

	try {
		const response = await fetch(`${API_URL}/api/bookings`, {
			headers: { Authorization: `Bearer ${authToken}` },
		});
		if (response.ok) {
			const data = await response.json();
			const bookings = data.bookings || data; // Handle { bookings: [] } response format
			autocompleteCache.bookings = Array.isArray(bookings)
				? bookings.filter((b) => b.status !== "CANCELLED")
				: [];
			autocompleteCache.lastFetch = now;
		}
	} catch (error) {
		console.error("Autocomplete fetch failed:", error);
	}
}

async function processCommand(command) {
	// Add to history
	commandHistory.push(command);

	// Display user input
	addOutput(`> ${command}`, "user-input");

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
	if (cmd === "help") {
		stopThinking();
		showHelp();
		return;
	}

	if (cmd === "clear" || cmd === "cls") {
		stopThinking();
		document.getElementById("terminal-output").innerHTML = "";
		return;
	}

	if (cmd.startsWith("echo ")) {
		stopThinking();
		addOutput(command.substring(5), "system-output");
		return;
	}

	if (cmd === "status") {
		stopThinking();
		showStatus();
		return;
	}

	if (cmd === "about" || cmd === "info") {
		stopThinking();
		showAbout();
		return;
	}

	// Hidden demo mode command
	if (cmd === "demo" || cmd === "showtime") {
		stopThinking();
		startDemoMode();
		return;
	}

	// Stop demo mode
	if (cmd === "stop") {
		stopThinking();
		if (demoModeActive) {
			stopDemoMode();
		} else {
			addOutput(
				"[SYSTEM] Nothing to stop. Demo mode is not active.",
				"system-output",
			);
		}
		return;
	}

	// Direct API commands (like CLI)
	if (mainCmd === "rooms") {
		await handleRoomsCommand(parts);
		return;
	}

	if (mainCmd === "bookings" || mainCmd === "list") {
		await handleBookingsCommand(parts);
		return;
	}

	if (mainCmd === "cancel") {
		await handleCancelCommand(parts);
		return;
	}

	// Use LLM to parse intent from natural language
	try {
		const response = await fetch(`${API_BASE}/api/parse-intent`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${authToken}`,
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
		if (data.action === "getRooms") {
			await handleRoomsCommand([]);
		} else if (data.action === "getBookings") {
			await handleBookingsCommand([]);
		} else if (data.action === "checkAvailability" && data.params) {
			await handleAvailabilityCommand(data.params);
		} else if (data.action === "cancelBooking" && data.params?.bookingId) {
			await handleCancelCommand(["cancel", data.params.bookingId]);
		} else if (data.action === "bulkCancel" && data.params?.filter) {
			await handleBulkCancelCommand(data.params);
		} else if (data.action === "createBooking" && data.params) {
			await handleBookingCommand(data.params);
		} else if (data.action === "undo") {
			await handleUndoCommand();
		} else if (data.action === "needsMoreInfo" && data.response) {
			// Display follow-up question
			addMarkdownOutput(data.response, "system-output");
		} else if (data.response) {
			// Fallback to LLM-generated response (unknown queries)
			addMarkdownOutput(data.response, "system-output");
		} else {
			addOutput("[ERROR] Unable to process request", "error");
		}
	} catch (error) {
		stopThinking();

		// Trigger error state in iris
		if (window.IrisEye) {
			window.IrisEye.setError();
		}

		console.error("Command error:", error);
		addOutput(`[ERROR] ${error.message}`, "error");
		addOutput("System: Check IRIS server status.", "error");
	}
}

// Direct API call handlers
async function handleRoomsCommand(_parts) {
	try {
		const response = await fetch(`${API_URL}/api/rooms`, {
			headers: { Authorization: `Bearer ${authToken}` },
		});

		if (!response.ok) throw new Error("API request failed");

		const data = await response.json();
		const rooms = data.rooms || data; // Handle { rooms: [] } response format
		stopThinking();

		if (!Array.isArray(rooms) || rooms.length === 0) {
			addOutput("[WARNING] No rooms found in system", "system-output");
			return;
		}

		// Build markdown table
		let markdown = "[OK] Room data retrieved\n\n";
		markdown += "| ID | NAME | LOCATION | CAPACITY |\n";
		markdown += "|---|---|---|---:|\n";

		rooms.forEach((room) => {
			const id = room.id || "";
			const name = room.name || "Unnamed";
			const location = room.locationId || "N/A";
			const capacity = room.capacity || 0;

			markdown += `| ${id} | ${name} | ${location} | ${capacity} |\n`;
		});

		markdown += `\n**Total:** ${rooms.length} rooms`;

		addMarkdownOutput(markdown, "system-output");
	} catch (error) {
		// Trigger error state in iris
		if (window.IrisEye) {
			window.IrisEye.setError();
		}

		stopThinking();
		addOutput(`[ERROR] ${error.message}`, "error");
	}
}

async function handleBookingsCommand(_parts) {
	try {
		const response = await fetch(`${API_URL}/api/bookings`, {
			headers: { Authorization: `Bearer ${authToken}` },
		});

		if (!response.ok) throw new Error("API request failed");

		const data = await response.json();
		const bookings = data.bookings || data; // Handle { bookings: [] } response format
		stopThinking();

		// Filter out cancelled bookings by default
		const activeBookings = Array.isArray(bookings)
			? bookings.filter((b) => b.status !== "CANCELLED")
			: [];

		if (activeBookings.length === 0) {
			addOutput("[WARNING] No active bookings found", "system-output");
			return;
		}

		// Build markdown table
		let markdown = "[OK] Booking data retrieved\n\n";
		markdown += "| ID | TITLE | START | END | STATUS |\n";
		markdown += "|---|---|---|---|---|\n";

		activeBookings.forEach((booking) => {
			const id = booking.id || "";
			const title = booking.title || "Untitled";
			const start = formatDate(booking.startTime);
			const end = formatDate(booking.endTime);
			const status = booking.status || "N/A";

			markdown += `| ${id} | ${title} | ${start} | ${end} | ${status} |\n`;
		});

		markdown += `\n**Total:** ${activeBookings.length} bookings`;

		addMarkdownOutput(markdown, "system-output");
	} catch (error) {
		// Trigger error state in iris
		if (window.IrisEye) {
			window.IrisEye.setError();
		}

		stopThinking();
		addOutput(`[ERROR] ${error.message}`, "error");
	}
}

async function handleCancelCommand(parts) {
	if (parts.length < 2) {
		stopThinking();
		addOutput("[ERROR] Usage: cancel <booking-id>", "error");
		return;
	}

	const bookingId = parts[1];

	try {
		const response = await fetch(`${API_URL}/api/bookings/${bookingId}`, {
			method: "DELETE",
			headers: { Authorization: `Bearer ${authToken}` },
		});

		if (!response.ok) throw new Error("Cancellation failed");

		stopThinking();
		const markdown = `[OK] Booking cancelled\n\n**Booking ID:** ${bookingId}\n\n**Status:** CANCELLED`;
		addMarkdownOutput(markdown, "system-output");
	} catch (error) {
		// Trigger error state in iris
		if (window.IrisEye) {
			window.IrisEye.setError();
		}

		stopThinking();
		addOutput(`[ERROR] ${error.message}`, "error");
	}
}

async function handleBookingCommand(params) {
	try {
		// First, try to find the room by name if roomName is provided instead of roomId
		let roomId = params.roomId;
		let roomName = params.roomName;

		if (!roomId && params.roomName) {
			const roomsResponse = await fetch(`${API_URL}/api/rooms`, {
				headers: { Authorization: `Bearer ${authToken}` },
			});

			if (roomsResponse.ok) {
				const roomsData = await roomsResponse.json();
				const rooms = roomsData.rooms || roomsData;
				const room = rooms.find(
					(r) =>
						r.name.toLowerCase().includes(params.roomName.toLowerCase()) ||
						r.id.toLowerCase().includes(params.roomName.toLowerCase()),
				);

				if (room) {
					roomId = room.id;
					roomName = room.name;
				} else {
					stopThinking();
					addOutput(`[ERROR] Room "${params.roomName}" not found`, "error");
					return;
				}
			}
		}

		if (!roomId) {
			stopThinking();
			addOutput("[ERROR] Room ID or name required", "error");
			return;
		}

		// Calculate endTime from startTime and duration
		const startTime = new Date(params.startTime);
		const duration = params.duration || 60; // Default 60 minutes
		const endTime = new Date(startTime.getTime() + duration * 60000);

		// PRE-FLIGHT CHECK: Verify room is available before attempting booking
		const availCheckParams = new URLSearchParams({
			roomId: roomId,
			startTime: startTime.toISOString(),
			endTime: endTime.toISOString(),
		});

		const availResponse = await fetch(
			`${API_URL}/api/rooms/availability?${availCheckParams}`,
			{
				headers: { Authorization: `Bearer ${authToken}` },
			},
		);

		if (availResponse.ok) {
			const availData = await availResponse.json();

			// Check if the specific time slot is available
			if (availData.availability && Array.isArray(availData.availability)) {
				const requestedSlot = availData.availability.find(
					(slot) =>
						new Date(slot.startTime).getTime() === startTime.getTime() &&
						new Date(slot.endTime).getTime() === endTime.getTime(),
				);

				if (requestedSlot && !requestedSlot.available) {
					stopThinking();

					// Show alternative available times
					let markdown = `[ERROR] Room is not available for the selected time slot\n\n`;
					markdown += `**Room:** ${roomName || roomId}\n`;
					markdown += `**Requested:** ${startTime.toLocaleString("en-US", { timeZone: userTimezone })}\n`;
					markdown += `**Duration:** ${duration} minutes\n\n`;

					// Find next available slots (within next 3 days)
					const threeDaysLater = new Date(
						startTime.getTime() + 3 * 24 * 60 * 60 * 1000,
					);
					const nextSlotsParams = new URLSearchParams({
						roomId: roomId,
						startTime: startTime.toISOString(),
						endTime: threeDaysLater.toISOString(),
					});

					const nextSlotsResponse = await fetch(
						`${API_URL}/api/rooms/availability?${nextSlotsParams}`,
						{
							headers: { Authorization: `Bearer ${authToken}` },
						},
					);

					if (nextSlotsResponse.ok) {
						const nextSlotsData = await nextSlotsResponse.json();
						const availableSlots =
							nextSlotsData.availability?.filter(
								(slot) =>
									slot.available &&
									new Date(slot.endTime) - new Date(slot.startTime) >=
										duration * 60000,
							) || [];

						if (availableSlots.length > 0) {
							markdown += "**Alternative Times Available:**\n\n";
							markdown += "| START | END | DURATION |\n";
							markdown += "|---|---|---|\n";

							availableSlots.slice(0, 5).forEach((slot) => {
								const start = new Date(slot.startTime).toLocaleString("en-US", {
									timeZone: userTimezone,
									month: "short",
									day: "numeric",
									hour: "2-digit",
									minute: "2-digit",
								});
								const end = new Date(slot.endTime).toLocaleString("en-US", {
									timeZone: userTimezone,
									hour: "2-digit",
									minute: "2-digit",
								});
								const slotDuration = Math.round(
									(new Date(slot.endTime) - new Date(slot.startTime)) / 60000,
								);
								markdown += `| ${start} | ${end} | ${slotDuration} min |\n`;
							});

							markdown += `\n_Showing ${Math.min(5, availableSlots.length)} of ${availableSlots.length} available slots_`;
						} else {
							markdown +=
								"**No alternative times available in the next 3 days.**";
						}
					}

					addMarkdownOutput(markdown, "error");
					return;
				}
			}
		}

		// Create booking
		const bookingData = {
			roomId: roomId,
			startTime: startTime.toISOString(),
			endTime: endTime.toISOString(),
			title: params.title || "Booking",
			description: params.description || "",
		};

		const response = await fetch(`${API_URL}/api/bookings`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${authToken}`,
			},
			body: JSON.stringify(bookingData),
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || "Booking failed");
		}

		const result = await response.json();
		const booking = result.booking;

		stopThinking();

		// Format times in user's local timezone
		const localStart = new Date(booking.startTime).toLocaleString("en-US", {
			timeZone: userTimezone,
			dateStyle: "short",
			timeStyle: "short",
		});
		const localEnd = new Date(booking.endTime).toLocaleString("en-US", {
			timeZone: userTimezone,
			timeStyle: "short",
		});

		const markdown = `[OK] Booking confirmed

**Booking ID:** ${booking.id}
**Room:** ${booking.room?.name || roomId}
**Time:** ${localStart} - ${localEnd}
**Duration:** ${duration} minutes
**Status:** ${booking.status}

Booking operation complete.`;

		addMarkdownOutput(markdown, "system-output");
	} catch (error) {
		// Trigger error state in iris
		if (window.IrisEye) {
			window.IrisEye.setError();
		}

		stopThinking();
		addOutput(`[ERROR] ${error.message}`, "error");
	}
}

async function handleBulkCancelCommand(params) {
	try {
		// Fetch all user bookings
		const response = await fetch(`${API_URL}/api/bookings`, {
			headers: { Authorization: `Bearer ${authToken}` },
		});

		if (!response.ok) {
			const errorText = await response.text();
			console.error("Bulk cancel - fetch bookings failed:", errorText);
			throw new Error("Failed to fetch bookings");
		}

		const data = await response.json();
		let bookings = data.bookings || data;

		console.log("Bulk cancel - fetched bookings:", bookings.length);

		// Validate bookings is an array
		if (!Array.isArray(bookings)) {
			stopThinking();
			addOutput("[ERROR] Invalid bookings data received from server", "error");
			return;
		}

		// Filter out already cancelled bookings
		const activeBookings = bookings.filter((b) => b.status !== "CANCELLED");
		console.log("Bulk cancel - active bookings:", activeBookings.length);

		// Apply date filter
		const now = new Date();
		const filter = params.filter || "all";

		let filteredBookings = activeBookings;

		if (filter === "today") {
			const today = now.toDateString();
			filteredBookings = activeBookings.filter(
				(b) => new Date(b.startTime).toDateString() === today,
			);
		} else if (filter === "tomorrow") {
			const tomorrow = new Date(now);
			tomorrow.setDate(tomorrow.getDate() + 1);
			const tomorrowStr = tomorrow.toDateString();
			filteredBookings = activeBookings.filter(
				(b) => new Date(b.startTime).toDateString() === tomorrowStr,
			);
		} else if (filter === "week") {
			const weekEnd = new Date(now);
			weekEnd.setDate(weekEnd.getDate() + 7);
			filteredBookings = activeBookings.filter((b) => {
				const startTime = new Date(b.startTime);
				return startTime >= now && startTime <= weekEnd;
			});
		}

		console.log(
			`Bulk cancel - filtered bookings (${filter}):`,
			filteredBookings.length,
		);

		if (filteredBookings.length === 0) {
			stopThinking();
			let markdown = "[WARNING] No bookings found matching filter\n\n";
			markdown += `**Filter:** ${filter}\n`;
			markdown += `**Active bookings (all):** ${activeBookings.length}\n`;
			markdown += `**Bookings matching filter:** 0\n\n`;

			if (activeBookings.length > 0) {
				markdown += "**Available filters:**\n";
				markdown += "- `cancel all bookings` - Cancel all bookings\n";
				markdown += "- `cancel all today` - Cancel today's bookings\n";
				markdown += "- `cancel all tomorrow` - Cancel tomorrow's bookings\n";
				markdown += "- `cancel all this week` - Cancel next 7 days\n";
			}

			addMarkdownOutput(markdown, "system-output");
			return;
		}

		bookings = filteredBookings;

		// Store booking details for undo BEFORE cancelling
		lastBulkOperation = {
			type: "cancel",
			timestamp: Date.now(),
			bookings: bookings.map((b) => ({
				roomId: b.roomId,
				startTime: b.startTime,
				endTime: b.endTime,
				title: b.title,
				description: b.description || "",
			})),
		};

		// Cancel each booking
		const cancelResults = [];
		for (const booking of bookings) {
			try {
				console.log(`Cancelling booking: ${booking.id}`);
				const cancelResponse = await fetch(
					`${API_URL}/api/bookings/${booking.id}`,
					{
						method: "DELETE",
						headers: { Authorization: `Bearer ${authToken}` },
					},
				);

				const success = cancelResponse.ok;
				let errorMsg = null;

				if (!success) {
					try {
						const errorData = await cancelResponse.json();
						errorMsg = errorData.error || `HTTP ${cancelResponse.status}`;
					} catch {
						errorMsg = `HTTP ${cancelResponse.status}`;
					}
					console.error(`Failed to cancel ${booking.id}:`, errorMsg);
				}

				cancelResults.push({
					id: booking.id,
					title: booking.title,
					success,
					error: errorMsg,
				});
			} catch (error) {
				console.error(`Exception cancelling ${booking.id}:`, error.message);
				cancelResults.push({
					id: booking.id,
					title: booking.title,
					success: false,
					error: error.message,
				});
			}
		}

		stopThinking();

		const successCount = cancelResults.filter((r) => r.success).length;
		const failureCount = cancelResults.length - successCount;

		let markdown;

		if (successCount === 0) {
			// All cancellations failed
			markdown = `[ERROR] Cancellation failed - no bookings were cancelled\n\n`;
			markdown += `**Attempted:** ${cancelResults.length} booking(s)\n`;
			markdown += `**Filter:** ${filter}\n\n`;
			markdown += "**Errors:**\n";

			cancelResults.forEach((r) => {
				markdown += `- ${r.title}: ${r.error || "Unknown error"}\n`;
			});
		} else if (failureCount > 0) {
			// Partial success
			markdown = `[WARNING] Partial cancellation success\n\n`;
			markdown += `**Terminated:** ${successCount} booking(s)\n`;
			markdown += `**Failed:** ${failureCount} booking(s)\n`;
			markdown += `**Filter:** ${filter}\n\n`;
			markdown += "**Failed bookings:**\n";

			cancelResults
				.filter((r) => !r.success)
				.forEach((r) => {
					markdown += `- ${r.title}: ${r.error || "Unknown error"}\n`;
				});

			markdown += "\nType `undo` to restore successfully cancelled bookings.";
		} else {
			// All succeeded
			markdown = `[OK] Cancellation sequence initiated\n\n`;
			markdown += `**Terminated:** ${successCount} booking(s)\n`;
			markdown += `**Filter:** ${filter}\n\n`;
			markdown += "Type `undo` to restore cancelled bookings.";
		}

		addMarkdownOutput(markdown, successCount === 0 ? "error" : "system-output");
	} catch (error) {
		// Trigger error state in iris
		if (window.IrisEye) {
			window.IrisEye.setError();
		}

		stopThinking();
		addOutput(`[ERROR] ${error.message}`, "error");
	}
}

async function handleUndoCommand() {
	if (!lastBulkOperation) {
		stopThinking();
		addOutput("[ERROR] No operation to undo", "error");
		return;
	}

	if (lastBulkOperation.type !== "cancel") {
		stopThinking();
		addOutput("[ERROR] Undo not supported for this operation type", "error");
		return;
	}

	try {
		const bookingsToRestore = lastBulkOperation.bookings;
		const restoreResults = [];

		for (const booking of bookingsToRestore) {
			try {
				const response = await fetch(`${API_URL}/api/bookings`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${authToken}`,
					},
					body: JSON.stringify(booking),
				});

				restoreResults.push({
					title: booking.title,
					success: response.ok,
				});
			} catch (_error) {
				restoreResults.push({
					title: booking.title,
					success: false,
				});
			}
		}

		stopThinking();

		const successCount = restoreResults.filter((r) => r.success).length;
		const markdown = `[OK] Undo operation complete

**Restored:** ${successCount} booking(s)

Operation history cleared.`;

		addMarkdownOutput(markdown, "system-output");

		// Clear undo history after use
		lastBulkOperation = null;
	} catch (error) {
		// Trigger error state in iris
		if (window.IrisEye) {
			window.IrisEye.setError();
		}

		stopThinking();
		addOutput(`[ERROR] ${error.message}`, "error");
	}
}

async function handleAvailabilityCommand(params) {
	try {
		// First, try to find the room by name if roomName is provided instead of roomId
		let roomId = params.roomId;

		if (!roomId && params.roomName) {
			const roomsResponse = await fetch(`${API_URL}/api/rooms`, {
				headers: { Authorization: `Bearer ${authToken}` },
			});

			if (roomsResponse.ok) {
				const roomsData = await roomsResponse.json();
				const rooms = roomsData.rooms || roomsData;
				const room = rooms.find(
					(r) =>
						r.name.toLowerCase().includes(params.roomName.toLowerCase()) ||
						r.id.toLowerCase().includes(params.roomName.toLowerCase()),
				);

				if (room) {
					roomId = room.id;
				} else {
					stopThinking();
					addOutput(`[ERROR] Room "${params.roomName}" not found`, "error");
					return;
				}
			}
		}

		if (!roomId) {
			stopThinking();
			addOutput("[ERROR] Room ID or name required", "error");
			return;
		}

		// Build query params for availability check
		const queryParams = new URLSearchParams({ roomId });

		// Add time range if provided
		if (params.startTime) {
			queryParams.append("startTime", params.startTime);
		}
		if (params.endTime) {
			queryParams.append("endTime", params.endTime);
		}

		// Default to next 7 days if no time range specified
		if (!params.startTime && !params.endTime) {
			const now = new Date();
			const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
			queryParams.append("startTime", now.toISOString());
			queryParams.append("endTime", weekLater.toISOString());
		}

		// Fetch availability
		const response = await fetch(
			`${API_URL}/api/rooms/availability?${queryParams}`,
			{
				headers: { Authorization: `Bearer ${authToken}` },
			},
		);

		if (!response.ok) throw new Error("Availability check failed");

		const data = await response.json();
		stopThinking();

		// Format the availability data
		let markdown = "[OK] Availability data retrieved\n\n";

		if (data.availability && Array.isArray(data.availability)) {
			const available = data.availability.filter((slot) => slot.available);
			const unavailable = data.availability.filter((slot) => !slot.available);

			if (available.length === 0 && unavailable.length === 0) {
				markdown +=
					"**No availability data found for the specified time range.**";
			} else {
				markdown += `**Room:** ${params.roomName || roomId}\n\n`;

				if (available.length > 0) {
					markdown += "**Available Time Slots:**\n\n";
					markdown += "| START | END | DURATION |\n";
					markdown += "|---|---|---|\n";

					available.slice(0, 10).forEach((slot) => {
						const start = new Date(slot.startTime).toLocaleString("en-US", {
							timeZone: userTimezone,
							month: "short",
							day: "numeric",
							hour: "2-digit",
							minute: "2-digit",
						});
						const end = new Date(slot.endTime).toLocaleString("en-US", {
							timeZone: userTimezone,
							hour: "2-digit",
							minute: "2-digit",
						});
						const duration = Math.round(
							(new Date(slot.endTime) - new Date(slot.startTime)) / 60000,
						);
						markdown += `| ${start} | ${end} | ${duration} min |\n`;
					});

					if (available.length > 10) {
						markdown += `\n_Showing 10 of ${available.length} available slots_\n`;
					}
				} else {
					markdown +=
						"**Status:** No available time slots found in the specified range.\n";
				}

				if (unavailable.length > 0) {
					markdown += `\n**Booked Slots:** ${unavailable.length}`;
				}
			}
		} else {
			markdown += "**Unable to retrieve availability data.**";
		}

		addMarkdownOutput(markdown, "system-output");
	} catch (error) {
		// Trigger error state in iris
		if (window.IrisEye) {
			window.IrisEye.setError();
		}

		stopThinking();
		addOutput(`[ERROR] ${error.message}`, "error");
	}
}

function formatDate(dateStr) {
	if (!dateStr) return "N/A";
	const date = new Date(dateStr);
	return date.toISOString().substring(0, 16).replace("T", " ");
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

	addMarkdownOutput(markdown, "system-output");
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

	addMarkdownOutput(markdown, "system-output");
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

	addMarkdownOutput(markdown, "system-output");
}

// Demo mode - cycles through all IRIS states and animations
let demoModeActive = false;
let demoModeInterval = null;

function startDemoMode() {
	if (demoModeActive) {
		addOutput(
			"[DEMO MODE] Already running. Use Ctrl+C to stop.",
			"system-output",
		);
		return;
	}

	const markdown = `
# IRIS DEMO MODE
**Animation Showcase Sequence**

Demonstrating all IRIS personality states and CRT effects:

1. **IDLE** - Subtle breathing, gentle depth oscillation
2. **THINKING** - Deep retreat, fog effect, scanline interference
3. **ALERT** - Rush forward, brightness flash, chromatic aberration
4. **ERROR** - Defensive pull back, heavy distortion, screen shake
5. **DEPTH TEST** - Extreme zoom out into the void (total blur)
6. **DEPTH TEST** - Extreme zoom in to the surface (crystal clear)
7. **Final States** - Processing and return to idle

Press \`Ctrl+C\` or type \`stop\` to end demo mode.
`;

	addMarkdownOutput(markdown, "system-output");

	demoModeActive = true;
	let stateIndex = 0;
	const states = [
		{ name: "idle", duration: 3000, description: "IDLE - Breathing gently..." },
		{
			name: "thinking",
			duration: 3000,
			description: "THINKING - Retreating deep into contemplation...",
		},
		{
			name: "alert",
			duration: 2000,
			description: "ALERT - Rushing forward with urgency!",
		},
		{
			name: "error",
			duration: 3000,
			description: "ERROR - Defensive recoil, heavy distortion!",
		},
		{
			name: "zoom-out",
			duration: 3000,
			description: "DEPTH TEST - Zooming into the void...",
			depth: 0.0,
		},
		{
			name: "zoom-in",
			duration: 3000,
			description: "DEPTH TEST - Rushing to the surface!",
			depth: 1.0,
		},
		{
			name: "thinking",
			duration: 2000,
			description: "THINKING - Processing...",
		},
		{ name: "alert", duration: 1500, description: "ALERT - Quick response!" },
		{
			name: "idle",
			duration: 2500,
			description: "IDLE - Returning to rest...",
		},
	];

	function runDemoSequence() {
		if (!demoModeActive || stateIndex >= states.length) {
			// End demo mode
			stopDemoMode();
			return;
		}

		const currentState = states[stateIndex];

		// Display current state
		addOutput(`[DEMO] ${currentState.description}`, "system-output");

		// Trigger IRIS state change
		if (window.IrisEye) {
			// Check if this is a manual depth control state
			if (currentState.depth !== undefined) {
				window.IrisEye.setDepth(currentState.depth);
			} else {
				// Normal state changes
				switch (currentState.name) {
					case "idle":
						window.IrisEye.setIdle();
						break;
					case "thinking":
						window.IrisEye.setThinking();
						break;
					case "alert":
						window.IrisEye.setAlert();
						break;
					case "error":
						window.IrisEye.setError();
						break;
				}
			}
		}

		stateIndex++;
		demoModeInterval = setTimeout(runDemoSequence, currentState.duration);
	}

	// Start the sequence
	runDemoSequence();
}

function stopDemoMode() {
	if (!demoModeActive) return;

	demoModeActive = false;
	if (demoModeInterval) {
		clearTimeout(demoModeInterval);
		demoModeInterval = null;
	}

	// Return to idle
	if (window.IrisEye) {
		window.IrisEye.setIdle();
	}

	addOutput(
		"[DEMO MODE] Sequence completed. IRIS returned to idle state.",
		"system-output",
	);
}

function addOutput(text, className = "system-output") {
	const output = document.getElementById("terminal-output");
	const line = document.createElement("div");
	line.className = `terminal-line ${className}`;
	line.textContent = text;
	output.appendChild(line);

	// Scroll to show the top of the new message
	line.scrollIntoView({ behavior: "smooth", block: "start" });
}

function addMarkdownOutput(markdown, className = "system-output") {
	const output = document.getElementById("terminal-output");
	const container = document.createElement("div");
	container.className = `terminal-line markdown-content ${className}`;

	// Configure marked for terminal-like output
	marked.setOptions({
		breaks: true,
		gfm: true,
	});

	// Render markdown
	container.innerHTML = marked.parse(markdown);
	output.appendChild(container);

	// Scroll to show the top of the new message
	container.scrollIntoView({ behavior: "smooth", block: "start" });
}

function _typeOutput(text, className = "system-output", _speed = 20) {
	// Split by lines to preserve ASCII tables and formatting
	const lines = text.split("\n");

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

	document.getElementById("hal-status").textContent = "PROCESSING...";

	// Add typing indicator
	const output = document.getElementById("terminal-output");
	const indicator = document.createElement("div");
	indicator.className = "terminal-line typing-indicator";
	indicator.id = "typing-indicator";
	indicator.innerHTML = `
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
    `;
	output.appendChild(indicator);

	// Scroll to show the typing indicator
	indicator.scrollIntoView({ behavior: "smooth", block: "start" });
}

function stopThinking() {
	// Return IRIS eye to idle state
	if (window.IrisEye) {
		window.IrisEye.setIdle();
	}

	document.getElementById("hal-status").textContent = "IRIS v1.0 - ONLINE";

	// Remove typing indicator
	document.getElementById("typing-indicator")?.remove();
}

// Health check
async function checkHealth() {
	try {
		const response = await fetch(`${API_BASE}/health`);
		const data = await response.json();
		console.log("IRIS Health:", data);
	} catch (error) {
		console.error("Health check failed:", error);
	}
}

// Check health on load
checkHealth();
