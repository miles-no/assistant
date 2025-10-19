# Miles Booking Slack Bot - Implementation Guide

This guide provides a complete implementation plan for a Slack bot client for the Miles booking system with full type safety from the OpenAPI specification.

## 🎯 Features

### Slash Commands
- `/miles-book` - Create a new booking with interactive modal
- `/miles-rooms` - Search and browse available rooms
- `/miles-my-bookings` - View your upcoming bookings
- `/miles-cancel` - Cancel a booking
- `/miles-help` - Show help and available commands

### Interactive Features
- **Modal Forms**: Beautiful booking creation UI
- **Block Kit UI**: Rich, interactive messages
- **Notifications**:
  - Before meeting reminders (15 min, 5 min)
  - Daily digest of upcoming bookings
  - Booking confirmations
- **Calendar Integration**: Deep links to calendar feeds

### Bot Features
- **Room Availability**: Real-time availability checking
- **Smart Suggestions**: Recommend rooms based on team preferences
- **Team Bookings**: Book on behalf of team members (managers only)

## 🔒 Type Safety

Like all other clients, maintain complete type safety using OpenAPI:

```
Backend OpenAPI Spec → Generated TypeScript Types → Slack Bot
     (api/openapi.yaml)    (@hey-api/openapi-ts)      (type-safe)
```

## 📦 Project Structure

```
slack-bot/
├── src/
│   ├── index.ts              # Bolt app initialization
│   ├── commands/             # Slash command handlers
│   │   ├── book.ts
│   │   ├── rooms.ts
│   │   ├── bookings.ts
│   │   └── cancel.ts
│   ├── views/                # Modal and Block Kit views
│   │   ├── booking-modal.ts
│   │   ├── rooms-list.ts
│   │   └── bookings-list.ts
│   ├── services/             # Business logic
│   │   ├── api-client.ts     # Miles API client
│   │   ├── notifications.ts  # Notification system
│   │   └── scheduler.ts      # Cron jobs
│   ├── utils/                # Helpers
│   │   └── formatters.ts
│   └── types/                # ⭐ Generated types
│       └── api.d.ts          # Auto-generated from OpenAPI
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

## 🚀 Step-by-Step Implementation

### Step 1: Project Setup

```bash
# Create project
mkdir slack-bot && cd slack-bot
npm init -y

# Install dependencies
npm install @slack/bolt dotenv
npm install -D typescript @types/node tsx

# Install type generation tools
npm install -D @hey-api/openapi-ts

# Setup TypeScript
npx tsc --init
```

### Step 2: Generate Types from OpenAPI

Create `scripts/generate-types.sh`:

```bash
#!/bin/bash
npx @hey-api/openapi-ts \
  --input ../api/openapi.yaml \
  --output ./src/types \
  --client fetch
```

Add to `package.json`:

```json
{
  "scripts": {
    "generate": "bash scripts/generate-types.sh",
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  }
}
```

### Step 3: Create API Client

`src/services/api-client.ts`:

```typescript
import { ApiClient } from '../types/api'; // Generated types
import type { Booking, Room, BookingInput } from '../types/api';

export class MilesApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  async createBooking(
    token: string,
    booking: BookingInput
  ): Promise<Booking> {
    const response = await fetch(`${this.baseURL}/api/bookings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(booking),
    });

    if (!response.ok) {
      throw new Error(`Failed to create booking: ${response.statusText}`);
    }

    return response.json();
  }

  async getUserBookings(token: string): Promise<Booking[]> {
    const response = await fetch(`${this.baseURL}/api/bookings`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    return response.json();
  }

  async getRooms(locationId?: string): Promise<Room[]> {
    const url = new URL(`${this.baseURL}/api/rooms`);
    if (locationId) url.searchParams.append('locationId', locationId);

    const response = await fetch(url.toString());
    return response.json();
  }

  async cancelBooking(token: string, bookingId: string): Promise<void> {
    await fetch(`${this.baseURL}/api/bookings/${bookingId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    });
  }
}
```

### Step 4: Initialize Slack Bolt App

`src/index.ts`:

```typescript
import { App } from '@slack/bolt';
import dotenv from 'dotenv';
import { bookCommand } from './commands/book';
import { roomsCommand } from './commands/rooms';
import { bookingsCommand } from './commands/bookings';
import { MilesApiClient } from './services/api-client';

dotenv.config();

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: process.env.SLACK_SOCKET_MODE === 'true',
  appToken: process.env.SLACK_APP_TOKEN,
});

const apiClient = new MilesApiClient(
  process.env.MILES_API_URL || 'http://localhost:3000'
);

// Register commands
bookCommand(app, apiClient);
roomsCommand(app, apiClient);
bookingsCommand(app, apiClient);

// Start the app
(async () => {
  await app.start(process.env.PORT || 3000);
  console.log('⚡️ Miles Slack Bot is running!');
})();
```

### Step 5: Implement `/miles-book` Command

`src/commands/book.ts`:

```typescript
import { App, BlockAction, SlackCommandMiddlewareArgs } from '@slack/bolt';
import { MilesApiClient } from '../services/api-client';
import { bookingModal } from '../views/booking-modal';

export function bookCommand(app: App, apiClient: MilesApiClient) {
  // Handle /miles-book command
  app.command('/miles-book', async ({ command, ack, client }) => {
    await ack();

    try {
      // Fetch available rooms
      const rooms = await apiClient.getRooms();

      // Open modal with booking form
      await client.views.open({
        trigger_id: command.trigger_id,
        view: bookingModal(rooms),
      });
    } catch (error) {
      console.error('Error opening booking modal:', error);
    }
  });

  // Handle modal submission
  app.view('booking_modal', async ({ ack, body, view, client }) => {
    const values = view.state.values;

    // Extract form data
    const roomId = values.room_block.room_select.selected_option?.value;
    const title = values.title_block.title_input.value;
    const startTime = values.start_block.start_time.selected_date_time;
    const endTime = values.end_block.end_time.selected_date_time;
    const description = values.description_block?.description_input?.value;

    // Validate
    if (!roomId || !title || !startTime || !endTime) {
      await ack({
        response_action: 'errors',
        errors: {
          room_block: !roomId ? 'Please select a room' : undefined,
          title_block: !title ? 'Please enter a title' : undefined,
        },
      });
      return;
    }

    await ack();

    try {
      // Get user's Miles auth token (stored in user metadata)
      const userToken = await getUserToken(body.user.id);

      // Create booking using type-safe API
      const booking = await apiClient.createBooking(userToken, {
        roomId,
        title,
        startTime: new Date(startTime * 1000).toISOString(),
        endTime: new Date(endTime * 1000).toISOString(),
        description,
      });

      // Send confirmation message
      await client.chat.postMessage({
        channel: body.user.id,
        text: `✓ Booking created: ${booking.title}`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Booking Confirmed!* ✓\n\n*${booking.title}*\nRoom: ${booking.roomId}\nTime: ${formatTime(booking.startTime)} - ${formatTime(booking.endTime)}`,
            },
          },
        ],
      });
    } catch (error) {
      console.error('Error creating booking:', error);

      await client.chat.postMessage({
        channel: body.user.id,
        text: '❌ Failed to create booking. Please try again.',
      });
    }
  });
}
```

### Step 6: Create Booking Modal View

`src/views/booking-modal.ts`:

```typescript
import type { Room } from '../types/api';

export function bookingModal(rooms: Room[]) {
  return {
    type: 'modal' as const,
    callback_id: 'booking_modal',
    title: {
      type: 'plain_text' as const,
      text: 'Create Booking',
    },
    submit: {
      type: 'plain_text' as const,
      text: 'Book',
    },
    blocks: [
      {
        type: 'input',
        block_id: 'room_block',
        element: {
          type: 'static_select',
          action_id: 'room_select',
          placeholder: {
            type: 'plain_text',
            text: 'Select a room',
          },
          options: rooms.map(room => ({
            text: {
              type: 'plain_text',
              text: `${room.name} (Capacity: ${room.capacity})`,
            },
            value: room.id,
          })),
        },
        label: {
          type: 'plain_text',
          text: 'Room',
        },
      },
      {
        type: 'input',
        block_id: 'title_block',
        element: {
          type: 'plain_text_input',
          action_id: 'title_input',
          placeholder: {
            type: 'plain_text',
            text: 'Team Standup',
          },
        },
        label: {
          type: 'plain_text',
          text: 'Title',
        },
      },
      {
        type: 'input',
        block_id: 'start_block',
        element: {
          type: 'datetimepicker',
          action_id: 'start_time',
        },
        label: {
          type: 'plain_text',
          text: 'Start Time',
        },
      },
      {
        type: 'input',
        block_id: 'end_block',
        element: {
          type: 'datetimepicker',
          action_id: 'end_time',
        },
        label: {
          type: 'plain_text',
          text: 'End Time',
        },
      },
      {
        type: 'input',
        block_id: 'description_block',
        optional: true,
        element: {
          type: 'plain_text_input',
          action_id: 'description_input',
          multiline: true,
        },
        label: {
          type: 'plain_text',
          text: 'Description (optional)',
        },
      },
    ],
  };
}
```

### Step 7: Implement `/miles-rooms` Command

`src/commands/rooms.ts`:

```typescript
export function roomsCommand(app: App, apiClient: MilesApiClient) {
  app.command('/miles-rooms', async ({ command, ack, respond }) => {
    await ack();

    try {
      const rooms = await apiClient.getRooms();

      await respond({
        text: `Found ${rooms.length} rooms`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Available Rooms* (${rooms.length})`,
            },
          },
          ...rooms.map(room => ({
            type: 'section' as const,
            text: {
              type: 'mrkdwn' as const,
              text: `*${room.name}*\nCapacity: ${room.capacity} | Location: ${room.locationId}`,
            },
            accessory: {
              type: 'button' as const,
              text: {
                type: 'plain_text' as const,
                text: 'Book',
              },
              action_id: `book_room_${room.id}`,
              value: room.id,
            },
          })),
        ],
      });
    } catch (error) {
      await respond('❌ Failed to fetch rooms');
    }
  });
}
```

### Step 8: Implement Notifications

`src/services/notifications.ts`:

```typescript
import { App } from '@slack/bolt';
import { MilesApiClient } from './api-client';
import cron from 'node-cron';

export class NotificationService {
  constructor(
    private app: App,
    private apiClient: MilesApiClient
  ) {}

  start() {
    // Check for upcoming meetings every 5 minutes
    cron.schedule('*/5 * * * *', () => this.sendUpcomingReminders());

    // Daily digest at 9 AM
    cron.schedule('0 9 * * *', () => this.sendDailyDigest());
  }

  private async sendUpcomingReminders() {
    // Implementation: Query all bookings starting in next 15 minutes
    // Send reminder to each user
  }

  private async sendDailyDigest() {
    // Implementation: Send daily summary of bookings to each user
  }
}
```

### Step 9: Environment Configuration

`.env.example`:

```bash
# Slack Configuration
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_SIGNING_SECRET=your-signing-secret
SLACK_APP_TOKEN=xapp-your-app-token  # For Socket Mode
SLACK_SOCKET_MODE=true  # Use Socket Mode for development

# Miles API
MILES_API_URL=http://localhost:3000

# Server
PORT=3001
NODE_ENV=development
```

### Step 10: Slack App Configuration

In [Slack API Dashboard](https://api.slack.com/apps):

1. **Create App** → From scratch
2. **OAuth & Permissions**:
   - Add scopes:
     - `chat:write`
     - `commands`
     - `im:write`
     - `users:read`
3. **Slash Commands** → Create:
   - `/miles-book`
   - `/miles-rooms`
   - `/miles-my-bookings`
   - `/miles-cancel`
4. **Interactivity**:
   - Enable Interactivity
   - Request URL: `https://your-server.com/slack/events`
5. **Install to Workspace**

## 🎨 Advanced Features

### Smart Room Suggestions

```typescript
async function suggestRooms(
  teamId: string,
  capacity: number
): Promise<Room[]> {
  const history = await getTeamBookingHistory(teamId);
  const preferredRooms = analyzePreferences(history);
  const available = await apiClient.getRooms();

  return available
    .filter(r => r.capacity >= capacity)
    .sort((a, b) => {
      const aScore = preferredRooms[a.id] || 0;
      const bScore = preferredRooms[b.id] || 0;
      return bScore - aScore;
    });
}
```

### Calendar Integration

```typescript
function generateCalendarLink(booking: Booking): string {
  return `${API_URL}/api/calendar/room/${booking.roomId}.ics`;
}

// Add to booking confirmation
{
  type: 'actions',
  elements: [
    {
      type: 'button',
      text: { type: 'plain_text', text: 'Add to Calendar' },
      url: generateCalendarLink(booking),
    },
  ],
}
```

## 📊 Deployment

### Option 1: Railway/Heroku

```bash
# Install CLI
npm install -g railway

# Login and deploy
railway login
railway init
railway up
```

### Option 2: Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN npm run build
CMD ["npm", "start"]
```

```bash
docker build -t miles-slack-bot .
docker run -p 3001:3001 --env-file .env miles-slack-bot
```

## 🧪 Testing

```typescript
import { createFakeSlackEvent } from '@slack/bolt';

describe('Book Command', () => {
  it('should open booking modal', async () => {
    const event = createFakeSlackEvent('command', {
      command: '/miles-book',
    });

    await app.processEvent(event);

    expect(mockClient.views.open).toHaveBeenCalled();
  });
});
```

## 📝 Documentation

See the full README template in `slack-bot/README.md` (to be created during implementation).

## 🔗 Resources

- [Slack Bolt Documentation](https://slack.dev/bolt-js/)
- [Block Kit Builder](https://api.slack.com/block-kit/building)
- [@hey-api/openapi-ts](https://github.com/hey-api/openapi-ts)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## ⏱️ Estimated Implementation Time

- **Basic Setup** (Steps 1-4): 2 hours
- **Core Commands** (Steps 5-7): 3 hours
- **Notifications** (Step 8): 2 hours
- **Testing & Polish**: 2 hours
- **Deployment**: 1 hour

**Total**: ~10 hours for full implementation

---

This guide provides everything needed to build a production-ready Slack bot with complete type safety from the Miles booking system OpenAPI specification.
