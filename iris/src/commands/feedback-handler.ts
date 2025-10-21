import { BaseCommandHandler } from "./base-handler";

/**
 * Handler for viewing room feedback
 */
export class FeedbackCommandHandler extends BaseCommandHandler {
	async execute(params?: { roomId?: string; status?: string }): Promise<void> {
		try {
			this.startThinking();

			const data = await this.apiClient.getFeedback({
				roomId: params?.roomId,
				status: params?.status as "OPEN" | "RESOLVED" | "DISMISSED" | undefined,
			});

			this.stopThinking();

			const feedback = data.feedback;

			if (!Array.isArray(feedback) || feedback.length === 0) {
				this.addOutput(
					"[INFO] No feedback found" +
						(params?.roomId ? " for this room" : "") +
						(params?.status ? ` with status: ${params.status}` : ""),
					"system-output",
				);
				return;
			}

			// Build markdown table
			let markdown = "[OK] Feedback retrieved\n\n";
			markdown += "| STATUS | ROOM | MESSAGE | SUBMITTED BY | DATE |\n";
			markdown += "|---|---|---|---|---|\n";

			for (const item of feedback) {
				const status = this.getStatusBadge(item.status);
				const room = item.room.name || item.roomId;
				const message = this.truncate(item.message, 50);
				const submitter = `${item.user.firstName} ${item.user.lastName}`;
				const date = this.formatDateShort(item.createdAt);

				markdown += `| ${status} | ${room} | ${message} | ${submitter} | ${date} |\n`;
			}

			markdown += `\n**Total:** ${feedback.length} feedback item${feedback.length !== 1 ? "s" : ""}`;

			// Add resolution info if any
			const resolved = feedback.filter(
				(f) => f.status === "RESOLVED" || f.status === "DISMISSED",
			);
			if (resolved.length > 0) {
				markdown += `\n**Resolved/Dismissed:** ${resolved.length}`;
			}

			this.addMarkdownOutput(markdown, "system-output");

			// Show details for first 3 items if there are any
			if (feedback.length > 0 && feedback.length <= 3) {
				markdown = "\n### Feedback Details\n\n";
				for (const item of feedback) {
					markdown += `**[${item.status}] ${item.room.name}**\n`;
					markdown += `${item.message}\n`;
					markdown += `*Submitted by ${item.user.firstName} ${item.user.lastName} on ${this.formatDate(item.createdAt)}*\n`;

					if (item.resolutionComment && item.resolver) {
						markdown += `**Resolution:** ${item.resolutionComment}\n`;
						markdown += `*By ${item.resolver.firstName} ${item.resolver.lastName} on ${this.formatDate(item.updatedAt)}*\n`;
					}

					markdown += "\n---\n\n";
				}
				this.addMarkdownOutput(markdown, "system-output");
			}
		} catch (error) {
			this.stopThinking();
			this.handleError(error, "Feedback retrieval");
		}
	}

	private getStatusBadge(status: string): string {
		switch (status) {
			case "OPEN":
				return "[OPEN]";
			case "RESOLVED":
				return "[RESOLVED]";
			case "DISMISSED":
				return "[DISMISSED]";
			default:
				return `[${status}]`;
		}
	}

	private truncate(text: string, maxLength: number): string {
		if (text.length <= maxLength) return text;
		return `${text.substring(0, maxLength - 3)}...`;
	}

	private formatDateShort(dateStr: string): string {
		const date = new Date(dateStr);
		return date.toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
		});
	}
}
