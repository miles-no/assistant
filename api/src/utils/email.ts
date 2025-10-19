import nodemailer from "nodemailer";
import type { RoomFeedback, Room, Location } from "@prisma/client";

interface FeedbackWithRelations extends RoomFeedback {
  room: Room & {
    location: Location;
  };
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

interface ManagerInfo {
  email: string;
  firstName: string;
  lastName: string;
}

// Create transporter with SMTP configuration
const createTransporter = () => {
  const smtpConfig = {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_PORT === "465", // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  };

  // Check if SMTP is configured
  if (!smtpConfig.host || !smtpConfig.auth.user || !smtpConfig.auth.pass) {
    console.warn(
      "⚠️  SMTP not configured. Emails will be logged but not sent."
    );
    return null;
  }

  return nodemailer.createTransport(smtpConfig);
};

/**
 * Send email notification to location managers about new room feedback
 */
export async function sendFeedbackNotification(
  feedback: FeedbackWithRelations,
  managers: ManagerInfo[]
): Promise<void> {
  const transporter = createTransporter();

  // If SMTP not configured, just log and continue
  if (!transporter) {
    console.log("📧 [EMAIL SIMULATION] Would send to:", managers.length, "managers");
    console.log(
      `   Room: ${feedback.room.name} at ${feedback.room.location.name}`
    );
    console.log(`   Message: ${feedback.message}`);
    console.log(
      `   Reported by: ${feedback.user.firstName} ${feedback.user.lastName}`
    );
    return;
  }

  const subject = `🛠️ New Room Feedback: ${feedback.room.name}`;
  const fromAddress =
    process.env.SMTP_FROM || `Miles Booking <${process.env.SMTP_USER}>`;

  // Create email HTML
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #6366f1; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
    .feedback-box { background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #6366f1; }
    .footer { color: #6b7280; font-size: 12px; margin-top: 20px; text-align: center; }
    .button { background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none;
              border-radius: 6px; display: inline-block; margin-top: 15px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2 style="margin: 0;">New Room Feedback Received</h2>
    </div>
    <div class="content">
      <p><strong>Room:</strong> ${feedback.room.name}</p>
      <p><strong>Location:</strong> ${feedback.room.location.name}</p>
      <p><strong>Reported by:</strong> ${feedback.user.firstName} ${feedback.user.lastName} (${feedback.user.email})</p>
      <p><strong>Date:</strong> ${new Date(feedback.createdAt).toLocaleString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })}</p>

      <div class="feedback-box">
        <p style="margin: 0;"><strong>Feedback Message:</strong></p>
        <p style="margin: 10px 0 0 0; white-space: pre-wrap;">${feedback.message}</p>
      </div>

      <p style="margin-top: 20px;">
        <strong>Status:</strong> <span style="color: #ea580c;">OPEN</span>
      </p>

      <p style="color: #6b7280; font-size: 14px;">
        You can manage this feedback through the Miles Booking chat assistant or API.
      </p>
    </div>

    <div class="footer">
      <p>Miles Booking System - Room Management</p>
      <p>This email was sent to location managers of ${feedback.room.location.name}</p>
    </div>
  </div>
</body>
</html>
  `;

  const textContent = `
New Room Feedback Received

Room: ${feedback.room.name}
Location: ${feedback.room.location.name}
Reported by: ${feedback.user.firstName} ${feedback.user.lastName} (${feedback.user.email})
Date: ${new Date(feedback.createdAt).toLocaleString()}

Feedback Message:
${feedback.message}

Status: OPEN

You can manage this feedback through the Miles Booking chat assistant or API.

---
Miles Booking System - Room Management
  `;

  // Send email to each manager
  try {
    for (const manager of managers) {
      await transporter.sendMail({
        from: fromAddress,
        to: manager.email,
        subject,
        text: textContent,
        html: htmlContent,
      });

      console.log(
        `✅ Feedback notification sent to ${manager.firstName} ${manager.lastName} (${manager.email})`
      );
    }
  } catch (error) {
    console.error("❌ Failed to send feedback notification emails:", error);
    // Don't throw - we don't want email failures to block feedback creation
  }
}

/**
 * Send email notification when feedback status is updated
 */
export async function sendFeedbackStatusUpdate(
  feedback: FeedbackWithRelations,
  originalReporter: { email: string; firstName: string; lastName: string },
  updatedBy: { firstName: string; lastName: string },
  oldStatus: string,
  newStatus: string
): Promise<void> {
  const transporter = createTransporter();

  if (!transporter) {
    console.log("📧 [EMAIL SIMULATION] Feedback status updated");
    console.log(`   ${oldStatus} → ${newStatus}`);
    return;
  }

  const subject = `Room Feedback Updated: ${feedback.room.name}`;
  const fromAddress =
    process.env.SMTP_FROM || `Miles Booking <${process.env.SMTP_USER}>`;

  const statusEmoji: Record<string, string> = {
    OPEN: "🔓",
    RESOLVED: "✅",
    DISMISSED: "❌",
  };

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #10b981; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
    .status-change { background-color: white; padding: 15px; margin: 15px 0; border-radius: 6px; }
    .footer { color: #6b7280; font-size: 12px; margin-top: 20px; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2 style="margin: 0;">Feedback Status Updated</h2>
    </div>
    <div class="content">
      <p>Your feedback for <strong>${feedback.room.name}</strong> has been updated.</p>

      <div class="status-change">
        <p><strong>Status changed:</strong></p>
        <p style="font-size: 18px; margin: 10px 0;">
          ${statusEmoji[oldStatus] || ""} ${oldStatus} → ${statusEmoji[newStatus] || ""} <strong>${newStatus}</strong>
        </p>
        <p style="color: #6b7280; font-size: 14px;">
          Updated by: ${updatedBy.firstName} ${updatedBy.lastName}
        </p>
      </div>

      <p><strong>Your original feedback:</strong></p>
      <p style="background-color: white; padding: 10px; border-left: 3px solid #6366f1; white-space: pre-wrap;">
        ${feedback.message}
      </p>
    </div>

    <div class="footer">
      <p>Miles Booking System</p>
    </div>
  </div>
</body>
</html>
  `;

  try {
    await transporter.sendMail({
      from: fromAddress,
      to: originalReporter.email,
      subject,
      html: htmlContent,
    });

    console.log(
      `✅ Status update notification sent to ${originalReporter.email}`
    );
  } catch (error) {
    console.error("❌ Failed to send status update email:", error);
  }
}
