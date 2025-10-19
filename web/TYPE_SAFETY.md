# Type Safety - Backend to Frontend

This project has **end-to-end type safety** from the backend API to the frontend React components using OpenAPI specifications.

## 🔒 How Type Safety Works

```
Backend OpenAPI Spec → TypeScript Types → React Query Hooks → Custom Hooks → Components
     (source of truth)      (generated)       (generated)       (wrapper)    (type-safe)
```

**All API hooks in this project are now fully type-safe**, using auto-generated React Query hooks from the OpenAPI specification.

### 1. **Backend Defines the Contract** (`api/openapi.yaml`)
The backend API is documented in OpenAPI 3.0 format, which serves as the single source of truth for all API types.

### 2. **Types Are Auto-Generated** (`npm run openapi`)
When you run `npm run openapi`, the `@hey-api/openapi-ts` tool reads the OpenAPI spec and generates:

- **TypeScript Types** (`src/api-generated/types.gen.ts`)
- **API Client SDK** (`src/api-generated/sdk.gen.ts`)
- **React Query Hooks** (`src/api-generated/@tanstack/react-query.gen.ts`)

### 3. **Components Use Type-Safe Hooks**
Your React components import and use the generated hooks, getting full IntelliSense and compile-time type checking.

## 📦 Generated Artifacts

After running `npm run openapi`, you get:

```
src/api-generated/
├── @tanstack/
│   └── react-query.gen.ts       # React Query hooks (queries & mutations)
├── client/
│   └── ...                      # HTTP client utilities
├── core/
│   └── ...                      # Core types and utilities
├── client.gen.ts                # Axios client configuration
├── index.ts                     # Main exports
├── schemas.gen.ts               # JSON schemas
├── sdk.gen.ts                   # API SDK functions
└── types.gen.ts                 # TypeScript type definitions
```

## 🎯 Usage Examples

### Query with Full Type Safety

```typescript
import { useQuery } from '@tanstack/react-query';
import { getApiLocationsOptions } from '@/api-generated/@tanstack/react-query.gen';

function LocationsList() {
  // ✅ Request params are typed
  // ✅ Response data is typed
  // ✅ Errors are typed
  const { data, error, isLoading } = useQuery(
    getApiLocationsOptions({
      query: {
        country: 'Norway',  // ✅ TypeScript knows valid query params
        limit: 10,
      }
    })
  );

  // data is automatically typed as Location[]
  return <div>{data?.map(loc => loc.name)}</div>;
}
```

### Mutation with Full Type Safety

```typescript
import { useMutation } from '@tanstack/react-query';
import { postApiBookingsMutation } from '@/api-generated/@tanstack/react-query.gen';

function BookingForm() {
  const mutation = useMutation(postApiBookingsMutation());

  const handleSubmit = () => {
    mutation.mutate({
      body: {
        roomId: '123',
        title: 'Meeting',
        startTime: '2024-01-01T10:00:00Z',
        endTime: '2024-01-01T11:00:00Z',
        // ✅ TypeScript enforces all required fields
        // ✅ TypeScript validates field types
      }
    });
  };

  return <button onClick={handleSubmit}>Book</button>;
}
```

## 🔄 Development Workflow

### When Backend API Changes

1. **Update OpenAPI spec** in `api/openapi.yaml`
2. **Regenerate types**: `npm run openapi`
3. **TypeScript errors show you what needs updating** in your frontend code
4. **Fix the errors** - TypeScript guides you through what changed

### Example: Adding a New Field

**Backend adds a new required field `priority` to bookings:**

```yaml
# api/openapi.yaml
Booking:
  properties:
    priority:          # New field added
      type: string
      enum: [low, medium, high]
```

**Run regeneration:**
```bash
npm run openapi
```

**TypeScript immediately shows errors:**
```typescript
// ❌ TypeScript Error: Property 'priority' is missing
mutation.mutate({
  body: {
    roomId: '123',
    title: 'Meeting',
    // priority: 'high',  // ← TypeScript tells you to add this
  }
});
```

**Fix the code:**
```typescript
// ✅ Now it compiles
mutation.mutate({
  body: {
    roomId: '123',
    title: 'Meeting',
    priority: 'high',  // Added
  }
});
```

## 📋 Available Generated Hooks

### Locations
- `getApiLocationsOptions()` - List all locations
- `getApiLocationsByIdOptions({ path: { id } })` - Get location by ID
- `postApiLocationsMutation()` - Create location
- `patchApiLocationsByIdMutation()` - Update location
- `deleteApiLocationsByIdMutation()` - Delete location

### Rooms
- `getApiRoomsOptions()` - List all rooms
- `getApiRoomsByIdOptions({ path: { id } })` - Get room by ID
- `getApiRoomsByIdAvailabilityOptions()` - Check room availability
- `postApiRoomsMutation()` - Create room
- `patchApiRoomsByIdMutation()` - Update room
- `deleteApiRoomsByIdMutation()` - Delete room

### Bookings
- `getApiBookingsOptions({ query })` - List bookings with filters
- `getApiBookingsByIdOptions({ path: { id } })` - Get booking by ID
- `postApiBookingsMutation()` - Create booking
- `patchApiBookingsByIdMutation()` - Update booking
- `deleteApiBookingsByIdMutation()` - Delete/cancel booking

### Authentication
- `postApiAuthRegisterMutation()` - Register new user
- `postApiAuthLoginMutation()` - Login
- `getApiAuthMeOptions()` - Get current user

## 🎨 Custom Wrapper Hooks

While you can use the generated hooks directly, we provide wrapper hooks in `src/hooks/` that add:
- Toast notifications
- Cache invalidation
- Error handling
- Loading states

**Example:**
```typescript
// src/hooks/useLocations.generated.ts
export const useLocationsGenerated = () => {
  return useQuery(getApiLocationsOptions());
};

export const useCreateLocationGenerated = () => {
  const queryClient = useQueryClient();
  const { success, error } = useToastStore();

  return useMutation({
    ...postApiLocationsMutation(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [{ _id: 'getApiLocations' }] });
      success('Location created successfully');
    },
    onError: () => {
      error('Failed to create location');
    },
  });
};
```

## 🔄 API Response Structure

The generated API hooks return data wrapped in response objects:

```typescript
// Locations API returns: { locations?: Location[] }
const { data, isLoading } = useQuery(getApiLocationsOptions());
// data.locations contains the array

// Single location returns: { location?: Location }
const { data } = useQuery(getApiLocationsByIdOptions({ path: { id: '123' } }));
// data.location contains the object
```

**Our custom hooks unwrap this for convenience:**

```typescript
// src/hooks/useLocations.ts
export function useLocations() {
  const query = useQuery(getApiLocationsOptions());
  return {
    ...query,
    data: query.data?.locations,  // Unwrapped!
  };
}
```

This means components can use the hooks directly without worrying about the wrapper:

```typescript
const { data: locations } = useLocations();  // locations is Location[], not { locations?: Location[] }
```

## ⚙️ Configuration

### `openapi-ts.config.ts`

```typescript
import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
  client: '@hey-api/client-axios',
  input: '../api/openapi.yaml',  // Path to OpenAPI spec
  output: {
    format: 'prettier',
    path: './src/api-generated',  // Where to generate files
  },
  types: {
    enums: 'javascript',
  },
  plugins: [
    '@hey-api/schemas',           // JSON schemas
    '@hey-api/sdk',               // API SDK functions
    {
      name: '@tanstack/react-query',  // React Query hooks
      queryOptions: true,
      mutationOptions: true,
    },
  ],
});
```

## ✅ Benefits

1. **Catch Errors at Compile Time** - Not at runtime
2. **IntelliSense Everywhere** - Auto-complete for API fields
3. **Refactoring is Safe** - Rename a field in the backend, TypeScript shows you all places to update
4. **Self-Documenting** - Types show you exactly what the API expects
5. **No Manual Syncing** - Backend changes automatically flow to frontend
6. **Prevents Typos** - `roomId` not `roomID`
7. **Enforces Required Fields** - Can't forget mandatory parameters

## 🔧 Commands

```bash
# Regenerate types after backend changes
npm run openapi

# Check types (runs during build)
npm run build

# Watch for type errors
npm run dev
```

## 📚 Resources

- [OpenAPI Specification](https://swagger.io/specification/)
- [@hey-api/openapi-ts](https://heyapi.vercel.app/)
- [TanStack Query](https://tanstack.com/query/latest)
