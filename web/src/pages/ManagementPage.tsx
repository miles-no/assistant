import Layout from '@/components/Layout';
import { useAuthStore } from '@/stores';
import { Card, Badge } from '@/components/ui';
import { Users, MapPin, DoorOpen, Calendar, TrendingUp } from 'lucide-react';

// Mock data
const mockStats = {
  totalUsers: 45,
  totalLocations: 2,
  totalRooms: 8,
  totalBookings: 127,
  activeBookings: 12,
};

const mockRecentBookings = [
  {
    id: '1',
    title: 'Team Meeting',
    user: { firstName: 'John', lastName: 'Doe' },
    room: { name: 'Conference Room A' },
    startTime: new Date(Date.now() + 86400000).toISOString(),
    status: 'CONFIRMED',
  },
  {
    id: '2',
    title: 'Client Presentation',
    user: { firstName: 'Jane', lastName: 'Smith' },
    room: { name: 'Huddle Room 1' },
    startTime: new Date(Date.now() + 172800000).toISOString(),
    status: 'PENDING',
  },
];

export default function ManagementPage() {
  const { user } = useAuthStore();

  if (user?.role !== 'ADMIN' && user?.role !== 'MANAGER') {
    return (
      <Layout>
        <Card className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">Access Denied</h2>
          <p className="mt-2 text-gray-600">
            You don't have permission to access this page.
          </p>
        </Card>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Management Dashboard</h1>
          <p className="mt-2 text-gray-600">
            Overview of bookings, rooms, and users across all locations
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-primary-100 p-3">
                <Users className="h-6 w-6 text-primary-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{mockStats.totalUsers}</p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-secondary-100 p-3">
                <MapPin className="h-6 w-6 text-secondary-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Locations</p>
                <p className="text-2xl font-bold text-gray-900">{mockStats.totalLocations}</p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-warning-100 p-3">
                <DoorOpen className="h-6 w-6 text-warning-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Meeting Rooms</p>
                <p className="text-2xl font-bold text-gray-900">{mockStats.totalRooms}</p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-success-100 p-3">
                <Calendar className="h-6 w-6 text-success-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Active Bookings</p>
                <p className="text-2xl font-bold text-gray-900">{mockStats.activeBookings}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Recent Bookings */}
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Recent Bookings</h2>
          <div className="space-y-4">
            {mockRecentBookings.map((booking) => (
              <div
                key={booking.id}
                className="flex items-center justify-between border-b border-gray-200 pb-4 last:border-0 last:pb-0"
              >
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{booking.title}</h3>
                  <p className="mt-1 text-sm text-gray-600">
                    {booking.user.firstName} {booking.user.lastName} • {booking.room.name}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {new Date(booking.startTime).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <Badge
                  variant={booking.status === 'CONFIRMED' ? 'success' : 'warning'}
                  size="sm"
                >
                  {booking.status}
                </Badge>
              </div>
            ))}
          </div>
        </Card>

        {/* Quick Stats */}
        <div className="grid gap-6 sm:grid-cols-2">
          <Card>
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-success-600" />
              <div>
                <p className="text-sm text-gray-600">Total Bookings</p>
                <p className="text-2xl font-bold text-gray-900">{mockStats.totalBookings}</p>
                <p className="text-xs text-success-600">+12% from last month</p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-3">
              <Calendar className="h-8 w-8 text-primary-600" />
              <div>
                <p className="text-sm text-gray-600">Room Utilization</p>
                <p className="text-2xl font-bold text-gray-900">68%</p>
                <p className="text-xs text-gray-600">Average across all rooms</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Admin Actions */}
        {user?.role === 'ADMIN' && (
          <Card className="bg-gradient-to-br from-primary-50 to-secondary-50">
            <h3 className="mb-3 text-lg font-semibold text-gray-900">Admin Actions</h3>
            <p className="text-sm text-gray-700">
              As an administrator, you have full access to manage users, locations, rooms, and
              bookings across the entire system.
            </p>
            <div className="mt-4 flex gap-3">
              <button className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">
                Manage Users
              </button>
              <button className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                Manage Locations
              </button>
            </div>
          </Card>
        )}
      </div>
    </Layout>
  );
}
