# Miles Booking Web Frontend

A modern, full-featured React booking management system with TypeScript, multilingual support, and comprehensive testing.

## 🚀 Features

### Core Features
- **Authentication System** - Login, registration with JWT token management
- **Dashboard** - Quick stats, upcoming bookings, quick actions
- **Locations Browser** - Search and filter office locations
- **Location Details** - View location info, meeting rooms, and managers
- **Rooms Browser** - Search meeting rooms with capacity filters
- **My Bookings** - View and manage booking reservations with cancel functionality
- **Settings/Profile** - Update profile info and change password
- **Management Dashboard** - Admin/Manager panel with system stats and recent activity

### Technical Features
- **🔒 Full Type Safety** - OpenAPI spec → Generated TypeScript types → React Query hooks → Components
- **Multi-Language Support** - English, Norwegian Bokmål, Norwegian Nynorsk, Lithuanian
- **Type-Safe API Client** - Auto-generated from OpenAPI with TanStack Query integration
- **End-to-End Testing** - 50 Playwright tests (49 passing)
- **Responsive Design** - Mobile-first with Tailwind CSS
- **Role-Based Access Control** - Admin, Manager, User roles
- **Real-time Toast Notifications** - Success, error, warning, info messages
- **State Management** - Zustand for global state, TanStack Query for server state
- **Form Validation** - Client-side validation with error messages

## 🛠️ Tech Stack

- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite 7
- **Styling**: Tailwind CSS v4
- **Routing**: React Router v7
- **State Management**: Zustand + TanStack Query v5
- **HTTP Client**: Axios with JWT interceptors
- **i18n**: react-i18next with 4 languages
- **Testing**: Playwright (E2E)
- **Icons**: Lucide React
- **Date Handling**: date-fns
- **Type Safety**: OpenAPI TypeScript code generation

## 📦 Installation

\`\`\`bash
# Install dependencies
npm install

# Generate type-safe API client and React Query hooks from OpenAPI spec
npm run openapi

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm test
\`\`\`

## 🔒 Type Safety

This project has **complete type safety from backend to frontend**:

1. Backend API is documented in `../api/openapi.yaml`
2. Running `npm run openapi` generates:
   - TypeScript types for all API models
   - Type-safe SDK functions for API calls
   - **TanStack Query hooks** with full type inference
3. Components use generated hooks for compile-time safety

**See [TYPE_SAFETY.md](./TYPE_SAFETY.md) for detailed documentation.**

### Quick Example

\`\`\`typescript
import { useQuery } from '@tanstack/react-query';
import { getApiLocationsOptions } from '@/api-generated/@tanstack/react-query.gen';

function LocationsList() {
  // ✅ Request params typed from OpenAPI
  // ✅ Response data typed from OpenAPI
  // ✅ Full IntelliSense support
  const { data } = useQuery(getApiLocationsOptions());

  return <div>{data?.map(loc => loc.name)}</div>;
}
\`\`\`

**When the backend API changes:**
1. Update `openapi.yaml`
2. Run `npm run openapi`
3. TypeScript shows you exactly what needs updating in your frontend code

## 🌐 Available Scripts

- \`npm run dev\` - Start development server on port 3001
- \`npm run build\` - Build for production
- \`npm run lint\` - Run ESLint
- \`npm run preview\` - Preview production build
- \`npm run openapi\` - Generate API client from OpenAPI spec
- \`npm test\` - Run Playwright tests (49/50 passing)

## 🧪 Testing

**Test Results**: 49/50 passing (98% pass rate)

The project includes comprehensive end-to-end tests covering authentication, navigation, locations, bookings, and management features.

## 🌍 Internationalization

Supports 4 languages: English, Norwegian Bokmål, Norwegian Nynorsk, Lithuanian. Language switcher available in the sidebar.

## 📱 Pages

- **/login** - Authentication
- **/register** - User registration  
- **/dashboard** - Main dashboard with stats
- **/locations** - Browse locations
- **/locations/:id** - Location details
- **/rooms** - Browse meeting rooms
- **/bookings** - My bookings
- **/settings** - Profile settings
- **/management** - Admin/Manager dashboard

## 🔐 Test Accounts

- **Admin**: admin@miles.com / password123
- **Manager**: manager.stavanger@miles.com / password123
- **User**: john.doe@miles.com / password123

## 🏗️ Build Output

- **JS Bundle**: 451 KB (138 KB gzipped)
- **CSS**: 25 KB (5 KB gzipped)
