# 🏗️ Miles Assistant - System Architecture

> **Technical deep-dive into the Miles Assistant platform architecture**

This document explains how Miles Assistant's six interfaces, AI capabilities, and backend systems work together to create a unified workplace platform.

---

## Table of Contents

- [System Overview](#system-overview)
- [Architecture Layers](#architecture-layers)
- [Data Flow](#data-flow)
- [Technology Stack](#technology-stack)
- [Model Context Protocol (MCP)](#model-context-protocol-mcp)
- [Authentication & Security](#authentication--security)
- [Database Schema](#database-schema)
- [API Design](#api-design)
- [LLM Integration](#llm-integration)
- [Deployment Architecture](#deployment-architecture)

---

## System Overview

Miles Assistant is built as a **layered architecture** with clear separation of concerns:

```mermaid
graph TB
    subgraph "Presentation Layer"
        IRIS[🔴 IRIS Terminal]
        CHAT[💬 Chat Interface]
        WEB[🌐 Web App]
        TUI[🎨 Terminal UI]
        CLI[⌨️ CLI]
        MOBILE[📱 Mobile/Integration]
    end

    subgraph "AI Layer"
        MCP[Model Context Protocol Server]
        LLM_ABSTRACTION[LLM Provider Abstraction]
        OLLAMA[Ollama Local]
        OPENAI[OpenAI API]
        ANTHROPIC[Anthropic Claude]
    end

    subgraph "Application Layer"
        API[REST API Express + TypeScript]
        AUTH[JWT Authentication]
        VALIDATION[Request Validation]
    end

    subgraph "Business Logic Layer"
        BOOKING_SERVICE[Booking Service]
        USER_SERVICE[User Service]
        ROOM_SERVICE[Room Service]
        FEEDBACK_SERVICE[Feedback Service]
        CALENDAR_SERVICE[Calendar Service]
    end

    subgraph "Data Access Layer"
        PRISMA[Prisma ORM]
        MIGRATIONS[Database Migrations]
    end

    subgraph "Data Layer"
        DB[(PostgreSQL Database)]
    end

    %% Connections
    IRIS --> MCP
    CHAT --> MCP
    WEB --> API
    TUI --> API
    CLI --> API
    MOBILE --> API

    MCP --> LLM_ABSTRACTION
    LLM_ABSTRACTION --> OLLAMA
    LLM_ABSTRACTION --> OPENAI
    LLM_ABSTRACTION --> ANTHROPIC
    MCP --> API

    API --> AUTH
    API --> VALIDATION
    AUTH --> BOOKING_SERVICE
    AUTH --> USER_SERVICE
    VALIDATION --> BOOKING_SERVICE

    BOOKING_SERVICE --> PRISMA
    USER_SERVICE --> PRISMA
    ROOM_SERVICE --> PRISMA
    FEEDBACK_SERVICE --> PRISMA
    CALENDAR_SERVICE --> PRISMA

    PRISMA --> DB
    MIGRATIONS --> DB

    style "Presentation Layer" fill:#e3f2fd
    style "AI Layer" fill:#fff3e0
    style "Application Layer" fill:#f3e5f5
    style "Business Logic Layer" fill:#e8f5e9
    style "Data Access Layer" fill:#fce4ec
    style "Data Layer" fill:#e0f2f1
```

---

## Architecture Layers

### 1. Presentation Layer
Six different client interfaces, each optimized for specific use cases:

| Interface | Architecture | Rendering | State Management |
|-----------|-------------|-----------|------------------|
| **IRIS** | Server-side LLM processing | Server-sent HTML | Stateless (session-based) |
| **Chat** | Server-side LLM processing | Client-side markdown | Conversation history |
| **Web** | React SPA | Client-side React | React Context + Hooks |
| **TUI** | Go native binary | Terminal (Bubble Tea) | Local state model |
| **CLI** | Go native binary | Terminal output | Stateless commands |
| **Mobile** | Integration guides | N/A | External systems |

### 2. AI Layer
Provides natural language capabilities through standardized interfaces:

- **MCP Server**: Exposes booking tools and resources to LLMs
- **LLM Abstraction**: Unified interface for multiple LLM providers
- **Tool Calling**: Structured function calls from natural language

### 3. Application Layer
Express.js REST API with:

- **OpenAPI 3.0 Specification**: Single source of truth for API contract
- **JWT Authentication**: Stateless token-based auth
- **Request Validation**: Input sanitization and type checking
- **Error Handling**: Standardized error responses

### 4. Business Logic Layer
Service-oriented architecture:

- **Booking Service**: Room reservations, conflict detection, availability
- **User Service**: User management, roles, permissions
- **Room Service**: Room metadata, capacities, amenities
- **Feedback Service**: Room feedback with resolution workflows
- **Calendar Service**: iCal generation, time zone handling

### 5. Data Access Layer
- **Prisma ORM**: Type-safe database access
- **Migrations**: Versioned schema changes
- **Seeding**: Test data and initial setup

### 6. Data Layer
- **PostgreSQL**: Relational database with ACID guarantees
- **Indexes**: Optimized query performance
- **Constraints**: Data integrity at database level

---

## Data Flow

### Traditional REST Flow (Web, TUI, CLI)

```mermaid
sequenceDiagram
    participant Client as Client<br/>(Web/TUI/CLI)
    participant API as REST API
    participant Auth as JWT Auth
    participant Service as Business Service
    participant DB as PostgreSQL

    Client->>API: HTTP Request + JWT
    API->>Auth: Validate Token
    Auth-->>API: User Info
    API->>Service: Call Business Logic
    Service->>DB: Query via Prisma
    DB-->>Service: Data
    Service-->>API: Processed Result
    API-->>Client: JSON Response
```

### AI-Powered Flow (IRIS, Chat)

```mermaid
sequenceDiagram
    participant User as User
    participant Client as IRIS/Chat Client
    participant Server as IRIS/Chat Server
    participant LLM as LLM Provider
    participant MCP as MCP Server
    participant API as REST API
    participant DB as PostgreSQL

    User->>Client: Natural Language Input
    Client->>Server: Command/Message
    Server->>MCP: Fetch Available Tools
    MCP-->>Server: Tool Definitions
    Server->>LLM: Prompt + Tools + User Input
    LLM-->>Server: Response + Tool Calls

    alt Tool Call Required
        Server->>MCP: Execute Tool
        MCP->>API: REST API Call
        API->>DB: Query Data
        DB-->>API: Results
        API-->>MCP: Tool Result
        MCP-->>Server: Formatted Result
        Server->>LLM: Tool Results
        LLM-->>Server: Final Response
    end

    Server-->>Client: Formatted Response
    Client-->>User: Display Result
```

---

## Technology Stack

### Backend Services

#### API Server
```yaml
Language: TypeScript
Runtime: Node.js 20.x
Framework: Express.js
ORM: Prisma
Database: PostgreSQL
Authentication: JWT (jsonwebtoken)
Validation: Zod schemas
Documentation: Swagger/OpenAPI 3.0
Port: 3000
```

#### IRIS Server
```yaml
Language: JavaScript (ES Modules)
Runtime: Node.js 20.x
Framework: Express.js
AI: Multi-LLM (Ollama/OpenAI/Anthropic)
Protocol: MCP Client
Frontend: Vanilla JS + HAL-9000 CSS
Port: 3002
```

#### Chat Server
```yaml
Language: JavaScript (ES Modules)
Runtime: Node.js 20.x
Framework: Express.js
AI: Multi-LLM (Ollama/OpenAI/Anthropic)
Protocol: MCP Client
Markdown: marked.js
Port: 3001
```

### Frontend Clients

#### Web App
```yaml
Language: TypeScript
Framework: React 18
Build Tool: Vite
UI Library: shadcn/ui (Radix + Tailwind)
State: React Context + Hooks
Router: React Router
API Client: OpenAPI-generated (@hey-api/openapi-ts)
Port: 5173 (dev)
```

#### Terminal UI (TUI)
```yaml
Language: Go 1.24.3
Framework: Bubble Tea
Styling: Lipgloss
API Client: oapi-codegen generated
Config: YAML
Binary: miles-booking
```

#### CLI
```yaml
Language: Go 1.24.3
Framework: Cobra
API Client: oapi-codegen generated
Output: Table, JSON, CSV
Config: YAML
Binary: miles
```

### AI & Integration

#### LLM Providers
```yaml
Ollama:
  - Local deployment
  - Privacy-first
  - Models: qwen2.5:7b, llama3.2, etc.

OpenAI:
  - Cloud API
  - Models: gpt-4o-mini, gpt-4, gpt-4-turbo

Anthropic:
  - Cloud API
  - Models: claude-3-5-sonnet, claude-3-opus
```

#### Model Context Protocol
```yaml
Version: 1.0
Transport: HTTP
Tools: 10 booking operations
Resources: 4 data resources
Server: Integrated in API
Clients: IRIS, Chat
```

---

## Model Context Protocol (MCP)

MCP is the key technology that enables AI interfaces. It provides a **standardized way for LLMs to interact with external tools and data**.

### MCP Architecture

```mermaid
graph LR
    subgraph "AI Client (IRIS/Chat)"
        LLM[Large Language Model]
        MCP_CLIENT[MCP Client]
    end

    subgraph "API Server"
        MCP_SERVER[MCP Server]
        TOOLS[Tool Implementations]
        RESOURCES[Resource Providers]
    end

    subgraph "Database"
        DB[(PostgreSQL)]
    end

    LLM <-->|Tool Discovery| MCP_CLIENT
    MCP_CLIENT <-->|HTTP/JSON| MCP_SERVER
    MCP_SERVER --> TOOLS
    MCP_SERVER --> RESOURCES
    TOOLS --> DB
    RESOURCES --> DB

    style LLM fill:#fff3e0
    style MCP_CLIENT fill:#e1f5fe
    style MCP_SERVER fill:#f3e5f5
    style TOOLS fill:#e8f5e9
    style RESOURCES fill:#fce4ec
```

### Available MCP Tools

| Tool | Purpose | Parameters | Returns |
|------|---------|------------|---------|
| `getRooms` | List all rooms | `locationId?` | Array of rooms |
| `getRoomAvailability` | Check availability | `roomId`, `startTime`, `endTime` | Available slots |
| `createBooking` | Book a room | `roomId`, `userId`, `startTime`, `duration`, `title` | Booking details |
| `getUserBookings` | List user's bookings | `userId`, `status?` | Array of bookings |
| `getAllBookings` | List all bookings (admin) | `status?`, `startDate?`, `endDate?` | Array of bookings |
| `cancelBooking` | Cancel a booking | `bookingId`, `userId` | Success status |
| `getUserRole` | Get user permissions | `userId` | Role info |
| `getRoomFeedback` | List room feedback | `roomId?`, `status?` | Array of feedback |
| `submitRoomFeedback` | Submit feedback | `roomId`, `userId`, `message` | Feedback details |
| `updateFeedbackStatus` | Resolve feedback | `feedbackId`, `userId`, `status`, `comment` | Updated feedback |

### MCP Resources

Resources provide read-only access to collections:

| Resource URI | Description | Fields |
|--------------|-------------|--------|
| `rooms://` | All rooms | id, name, capacity, amenities, location |
| `bookings://` | All bookings | id, room, user, time, status |
| `users://` | All users | id, name, email, role |
| `feedback://` | All feedback | id, room, user, message, status |

---

## Authentication & Security

### JWT Token Flow

```mermaid
sequenceDiagram
    participant Client
    participant API as API Server
    participant DB as Database

    Client->>API: POST /api/auth/login<br/>{email, password}
    API->>DB: Verify Credentials
    DB-->>API: User Data
    API->>API: Generate JWT Token
    API-->>Client: {token, user}

    Note over Client: Store token in<br/>localStorage/config

    Client->>API: GET /api/bookings<br/>Authorization: Bearer {token}
    API->>API: Verify JWT Signature
    API->>API: Extract User ID
    API->>DB: Fetch Bookings
    DB-->>API: Booking Data
    API-->>Client: JSON Response
```

### Token Structure

```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "userId": "cuid123...",
    "email": "user@miles.com",
    "role": "USER",
    "iat": 1697800000,
    "exp": 1698404800
  }
}
```

### Role-Based Access Control

| Role | Permissions |
|------|-------------|
| **USER** | View rooms, create own bookings, view own bookings, cancel own bookings, submit feedback |
| **MANAGER** | All USER permissions + view all bookings for their location, view all feedback |
| **ADMIN** | All MANAGER permissions + view all bookings globally, manage users, manage rooms, manage locations |

---

## Database Schema

### Entity Relationship Diagram

```mermaid
erDiagram
    User ||--o{ Booking : creates
    User ||--o{ RoomFeedback : submits
    User ||--o{ RoomFeedback : resolves
    User }o--|| Location : "works at"
    Room }o--|| Location : "located at"
    Room ||--o{ Booking : "booked for"
    Room ||--o{ RoomFeedback : "receives"

    User {
        string id PK
        string email UK
        string password
        string firstName
        string lastName
        enum role
        string locationId FK
        datetime createdAt
        datetime updatedAt
    }

    Location {
        string id PK
        string name
        string address
        string country
        string city
        datetime createdAt
        datetime updatedAt
    }

    Room {
        string id PK
        string name
        int capacity
        jsonb amenities
        string locationId FK
        datetime createdAt
        datetime updatedAt
    }

    Booking {
        string id PK
        string roomId FK
        string userId FK
        datetime startTime
        datetime endTime
        string title
        enum status
        datetime createdAt
        datetime updatedAt
    }

    RoomFeedback {
        string id PK
        string roomId FK
        string userId FK
        string message
        enum status
        string resolvedBy FK
        string resolutionComment
        datetime createdAt
        datetime updatedAt
    }
```

### Key Indexes

```sql
-- Performance indexes
CREATE INDEX idx_bookings_room_time ON Booking(roomId, startTime, endTime);
CREATE INDEX idx_bookings_user ON Booking(userId);
CREATE INDEX idx_bookings_status ON Booking(status);
CREATE INDEX idx_feedback_room ON RoomFeedback(roomId);
CREATE INDEX idx_feedback_status ON RoomFeedback(status);
CREATE INDEX idx_users_location ON User(locationId);
CREATE INDEX idx_users_email ON User(email);
```

---

## API Design

### OpenAPI-First Approach

```mermaid
graph LR
    SPEC[openapi.yaml<br/>Single Source of Truth]

    TS_GEN[TypeScript Generator<br/>@hey-api/openapi-ts]
    GO_GEN[Go Generator<br/>oapi-codegen]
    DOCS[Swagger UI<br/>API Documentation]

    WEB[Web App<br/>Type-safe client]
    TUI_CLI[TUI & CLI<br/>Type-safe client]
    DEV[Developer Portal<br/>Interactive docs]

    SPEC --> TS_GEN
    SPEC --> GO_GEN
    SPEC --> DOCS

    TS_GEN --> WEB
    GO_GEN --> TUI_CLI
    DOCS --> DEV

    style SPEC fill:#fff3e0,stroke:#ff6f00,stroke-width:3px
    style WEB fill:#e1f5fe
    style TUI_CLI fill:#e8f5e9
    style DEV fill:#f3e5f5
```

### API Endpoints

```
Authentication:
  POST   /api/auth/login             # Login and get JWT
  POST   /api/auth/register          # Register new user
  GET    /api/auth/me                # Get current user

Users:
  GET    /api/users                  # List all users (admin)
  GET    /api/users/:id              # Get user details
  PUT    /api/users/:id              # Update user
  DELETE /api/users/:id              # Delete user (admin)

Locations:
  GET    /api/locations              # List all locations
  GET    /api/locations/:id          # Get location details
  GET    /api/locations/:id/rooms    # Get rooms in location

Rooms:
  GET    /api/rooms                  # List all rooms
  GET    /api/rooms/:id              # Get room details
  GET    /api/rooms/:id/availability # Check availability

Bookings:
  GET    /api/bookings               # List bookings (filtered by role)
  POST   /api/bookings               # Create booking
  GET    /api/bookings/:id           # Get booking details
  PUT    /api/bookings/:id           # Update booking
  DELETE /api/bookings/:id           # Cancel booking
  GET    /api/bookings/:id/ical      # Export to iCal

Feedback:
  GET    /api/feedback               # List feedback
  POST   /api/feedback               # Submit feedback
  PUT    /api/feedback/:id           # Update feedback status

MCP Endpoints:
  GET    /api/mcp/tools              # List available tools
  POST   /api/mcp/tools/:toolName    # Execute a tool
  GET    /api/mcp/resources          # List available resources
  GET    /api/mcp/resources/:uri     # Get resource contents
```

---

## LLM Integration

### Provider Abstraction Layer

The LLM provider abstraction allows switching between different AI models without changing client code:

```javascript
// llm-providers.js
class LLMProvider {
  async chat(messages) {
    // Returns: { content: string }
  }

  getName() {
    // Returns: "Ollama (qwen2.5:7b)"
  }
}

class OllamaProvider extends LLMProvider { ... }
class OpenAIProvider extends LLMProvider { ... }
class AnthropicProvider extends LLMProvider { ... }

export function getProvider() {
  const provider = process.env.LLM_PROVIDER || 'ollama';
  switch (provider) {
    case 'openai': return new OpenAIProvider();
    case 'anthropic': return new AnthropicProvider();
    default: return new OllamaProvider();
  }
}
```

### Message Format Normalization

Different LLM providers have different message formats. The abstraction layer normalizes them:

**Ollama:**
```json
{
  "model": "qwen2.5:7b",
  "messages": [
    {"role": "system", "content": "..."},
    {"role": "user", "content": "..."}
  ]
}
```

**OpenAI:**
```json
{
  "model": "gpt-4o-mini",
  "messages": [
    {"role": "system", "content": "..."},
    {"role": "user", "content": "..."}
  ]
}
```

**Anthropic (Claude):**
```json
{
  "model": "claude-3-5-sonnet",
  "system": "...",
  "messages": [
    {"role": "user", "content": "..."}
  ]
}
```

---

## Deployment Architecture

### Development Environment

```mermaid
graph TB
    subgraph "Developer Machine"
        DOCKER[Docker Desktop]
        OLLAMA[Ollama]

        subgraph "Docker Containers"
            DB[PostgreSQL:5433]
        end

        subgraph "Local Processes"
            API_DEV[API :3000<br/>npm run dev]
            CHAT_DEV[Chat :3001<br/>npm start]
            IRIS_DEV[IRIS :3002<br/>npm start]
            WEB_DEV[Web :5173<br/>npm run dev]
        end

        subgraph "Native Binaries"
            TUI_BIN[TUI<br/>miles-booking]
            CLI_BIN[CLI<br/>miles]
        end
    end

    API_DEV --> DB
    CHAT_DEV --> API_DEV
    CHAT_DEV --> OLLAMA
    IRIS_DEV --> API_DEV
    IRIS_DEV --> OLLAMA
    WEB_DEV --> API_DEV
    TUI_BIN --> API_DEV
    CLI_BIN --> API_DEV

    style DOCKER fill:#2496ed,color:#fff
    style OLLAMA fill:#000,color:#fff
    style DB fill:#336791,color:#fff
```

### Production Environment (Example)

```mermaid
graph TB
    INTERNET[Internet]

    subgraph "Load Balancer / Reverse Proxy"
        NGINX[Nginx]
    end

    subgraph "Application Servers"
        API1[API Instance 1]
        API2[API Instance 2]
        CHAT1[Chat Instance 1]
        IRIS1[IRIS Instance 1]
        WEB[Static Files<br/>CDN/S3]
    end

    subgraph "AI Services"
        LLM_SERVICE[LLM Provider<br/>Ollama/OpenAI/Anthropic]
    end

    subgraph "Database"
        DB_PRIMARY[(PostgreSQL Primary)]
        DB_REPLICA[(PostgreSQL Replica)]
    end

    INTERNET --> NGINX
    NGINX --> API1
    NGINX --> API2
    NGINX --> CHAT1
    NGINX --> IRIS1
    NGINX --> WEB

    API1 --> DB_PRIMARY
    API2 --> DB_PRIMARY
    CHAT1 --> LLM_SERVICE
    CHAT1 --> API1
    IRIS1 --> LLM_SERVICE
    IRIS1 --> API2

    DB_PRIMARY -->|Replication| DB_REPLICA

    style NGINX fill:#009639,color:#fff
    style LLM_SERVICE fill:#fff3e0
    style DB_PRIMARY fill:#336791,color:#fff
    style DB_REPLICA fill:#5394c0,color:#fff
```

### Container Architecture

```yaml
services:
  database:
    image: postgres:16-alpine
    ports:
      - "5433:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_USER=miles
      - POSTGRES_PASSWORD=***
      - POSTGRES_DB=miles_booking

  api:
    build: ./api
    ports:
      - "3000:3000"
    depends_on:
      - database
    environment:
      - DATABASE_URL=postgresql://miles:***@database:5432/miles_booking
      - JWT_SECRET=***
      - PORT=3000

  chat-app:
    build: ./chat-app
    ports:
      - "3001:3001"
    depends_on:
      - api
    environment:
      - MCP_API_URL=http://api:3000/api/mcp
      - LLM_PROVIDER=ollama
      - OLLAMA_URL=http://host.docker.internal:11434

  iris:
    build: ./iris
    ports:
      - "3002:3002"
    depends_on:
      - api
    environment:
      - MCP_API_URL=http://api:3000/api/mcp
      - LLM_PROVIDER=ollama
      - OLLAMA_URL=http://host.docker.internal:11434
```

---

## Performance Considerations

### Database Optimization
- Indexes on frequently queried columns
- Connection pooling (Prisma)
- Query optimization with Prisma's query engine

### API Optimization
- JWT for stateless authentication (no session store)
- Response caching where appropriate
- Pagination for large result sets

### LLM Optimization
- Local Ollama for reduced latency
- Streaming responses (future enhancement)
- Tool call batching

---

## Monitoring & Observability

### Logging
- Structured JSON logging
- Request/response logging
- Error tracking with stack traces
- LLM conversation logging (privacy-aware)

### Metrics
- API response times
- Database query performance
- LLM response times
- Tool execution times
- Error rates

### Health Checks
```
GET /health
Response:
{
  "status": "healthy",
  "timestamp": "2025-10-20T15:32:09.821Z",
  "database": "connected",
  "llm": "operational"
}
```

---

## Scalability Considerations

### Horizontal Scaling
- **API**: Stateless design allows multiple instances behind load balancer
- **Database**: Read replicas for query distribution
- **LLM**: Separate Ollama instances or API-based providers

### Vertical Scaling
- **Database**: Increase PostgreSQL resources for complex queries
- **Ollama**: GPU acceleration for faster inference
- **API**: Node.js clustering for CPU utilization

---

## Security Architecture

### Defense in Depth

1. **Network Layer**: Reverse proxy, rate limiting
2. **Application Layer**: JWT validation, input sanitization
3. **Business Logic**: Role-based access control
4. **Data Layer**: Encrypted at rest, parameterized queries

### Sensitive Data Handling
- Passwords: bcrypt hashing
- JWT Secret: Environment variable, never committed
- API Keys: Environment variables, rotate regularly
- Database: SSL connections in production

---

## Future Architecture Enhancements

### Planned Improvements
- **WebSocket Support**: Real-time booking updates
- **Event Bus**: Event-driven architecture for decoupling
- **Caching Layer**: Redis for frequently accessed data
- **Search Engine**: Elasticsearch for advanced room search
- **Analytics**: Data warehouse for usage insights
- **Mobile Apps**: Native iOS/Android clients

---

<div align="center">

**[← Back to Main README](./README.md)** | **[Getting Started Guide →](./GETTING_STARTED.md)**

Built with ❤️ for Miles

</div>
