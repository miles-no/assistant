# Agent Guidelines for Miles Booking System

## Build/Lint/Test Commands

### Root Level

- Format: `biome format --write .`
- Lint: `biome lint --write .`
- Check: `biome check --write .`

### Web App (React/TypeScript)

- Build: `cd web && npm run build` (tsc + vite)
- Lint: `cd web && npm run lint` (eslint)
- Test all: `cd web && npm run test` (playwright)
- Test single: `cd web && npx playwright test <test-file>`
- Dev server: `cd web && npm run dev`

### API (Node.js/TypeScript)

- Build: `cd api && npm run build` (tsc)
- Test all: `cd api && npm run test` (jest)
- Test single: `cd api && npx jest <test-file>`
- Dev server: `cd api && npm run dev` (tsx watch)
- DB: `cd api && npm run prisma:migrate` (dev), `npm run prisma:studio`

### IRIS Terminal (Node.js/TypeScript)

- Build: `cd iris && npm run build` (vite)
- Type check: `cd iris && npm run type-check` (tsc)
- Test all: `cd iris && npm run test` (playwright)
- Test single: `cd iris && npx playwright test <test-file>`
- Dev server: `cd iris && npm run dev`

### CLI (Go)

- Build: `cd cli && make build` (go build)
- Test all: `cd cli && make test` (go test -v ./...)
- Test single: `cd cli && go test -v <package>`

### TUI (Go)

- Build: `cd tui && make build` (go build)
- Test all: `cd tui && make test` (go test -v ./...)
- Test single: `cd tui && go test -v <package>`

## Code Style Guidelines

### TypeScript/JavaScript

- **Formatting**: Use biome (tabs, double quotes) for root level; prettier (spaces, single quotes) for web
- **Imports**: Auto-organized by biome, group by: stdlib → third-party → local
- **Types**: Strict typing required, use interfaces for objects, unions for variants
- **Validation**: Use Zod schemas for API input validation
- **Error Handling**: Async/await with proper try/catch, return meaningful error messages
- **Naming**: camelCase for variables/functions, PascalCase for components/classes/types

### React Components

- **Structure**: Functional components with hooks, forwardRef for custom components
- **Props**: Use interfaces extending HTML attributes, optional props with defaults
- **Styling**: Tailwind CSS with clsx for conditional classes
- **State**: Zustand for global state, React Query for server state

### Go Code

- **Formatting**: Standard gofmt conventions
- **Error Handling**: Explicit error checking, early returns
- **Naming**: Standard Go conventions (camelCase, PascalCase for exported)
- **Structure**: cobra for CLI commands, standard project layout

### Database

- **ORM**: Prisma with TypeScript client
- **Schema**: Follow existing patterns, use enums for status fields
- **Migrations**: Generate and run migrations for schema changes

### Testing

- **Framework**: Jest for API, Playwright for E2E, Vitest for IRIS, Go testing for CLI/TUI
- **Coverage**: Aim for meaningful test coverage, focus on business logic
- **Naming**: describe/it blocks for behavior, mock external dependencies

### General

- **Security**: Never log/commit secrets, validate all inputs
- **Performance**: Optimize database queries, use proper indexing
- **Documentation**: JSDoc/TSDoc for public APIs, inline comments for complex logic
