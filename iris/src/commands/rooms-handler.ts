import type { Room } from "../services/api-client";
import { BaseCommandHandler } from "./base-handler";

/**
 * Handler for room-related commands
 */
export class RoomsCommandHandler extends BaseCommandHandler {
	async execute(): Promise<void> {
		try {
			const data = await this.apiClient.getRooms();
			const rooms = data.rooms;

			if (!Array.isArray(rooms) || rooms.length === 0) {
				this.addOutput("[WARNING] No rooms found in system", "system-output");
				return;
			}

			// Build markdown table
			let markdown = "[OK] Room data retrieved\n\n";
			markdown += "| ID | NAME | LOCATION | CAPACITY |\n";
			markdown += "|---|---|---|---:|\n";

			rooms.forEach((room: Room) => {
				const id = room.id || "";
				const name = room.name || "Unnamed";
				const location = room.locationId || "N/A";
				const capacity = room.capacity || 0;

				markdown += `| ${id} | ${name} | ${location} | ${capacity} |\n`;
			});

			markdown += `\n**Total:** ${rooms.length} rooms`;

			this.addMarkdownOutput(markdown, "system-output");
		} catch (error) {
			this.handleError(error, "Room retrieval");
		}
	}
}
