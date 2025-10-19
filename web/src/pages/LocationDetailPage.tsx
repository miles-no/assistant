import { useParams, useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Card, LoadingSpinner, Badge, Button } from '@/components/ui';
import { useLocation } from '@/hooks/useLocations';
import { MapPin, Building, Globe, ArrowLeft, DoorOpen, Users2 } from 'lucide-react';

export default function LocationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: location, isLoading, error } = useLocation(id!);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex min-h-[400px] items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      </Layout>
    );
  }

  if (error || !location) {
    return (
      <Layout>
        <Card className="text-center">
          <p className="text-danger-600">Failed to load location details.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/locations')}>
            Back to Locations
          </Button>
        </Card>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/locations')}
            leftIcon={<ArrowLeft className="h-4 w-4" />}
          >
            Back
          </Button>
        </div>

        {/* Location Info Card */}
        <Card>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-primary-100 p-3">
                <Building className="h-8 w-8 text-primary-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{location.name}</h1>
                <div className="mt-2 flex items-center gap-2">
                  <Badge variant="info">{location.city}</Badge>
                  <Badge variant="default">{location.country}</Badge>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-2 text-gray-600">
              <MapPin className="h-5 w-5" />
              <span>{location.address}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Globe className="h-5 w-5" />
              <span>Timezone: {location.timezone}</span>
            </div>
          </div>

          {location.description && (
            <div className="mt-6 border-t border-gray-200 pt-6">
              <h3 className="text-sm font-medium text-gray-700">About</h3>
              <p className="mt-2 text-gray-600">{location.description}</p>
            </div>
          )}
        </Card>

        {/* Managers */}
        {location.managers && location.managers.length > 0 && (
          <Card>
            <div className="flex items-center gap-2">
              <Users2 className="h-5 w-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">Location Managers</h2>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              {location.managers.map((managerObj) => {
                const manager = managerObj.user;
                if (!manager) return null;
                return (
                  <div
                    key={manager.id}
                    className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-sm font-medium text-primary-700">
                      {manager.firstName?.[0]}
                      {manager.lastName?.[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {manager.firstName} {manager.lastName}
                      </p>
                      <p className="text-xs text-gray-500">{manager.email}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Meeting Rooms */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              Meeting Rooms ({location.rooms?.length || 0})
            </h2>
          </div>

          {!location.rooms || location.rooms.length === 0 ? (
            <Card className="text-center">
              <DoorOpen className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-semibold text-gray-900">No rooms available</h3>
              <p className="mt-2 text-gray-600">
                This location doesn&apos;t have any meeting rooms yet.
              </p>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {location.rooms.map((room) => (
                <Card
                  key={room.id}
                  className="cursor-pointer transition-all hover:shadow-md"
                  onClick={() => navigate(`/rooms/${room.id}`)}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">{room.name}</h3>
                      <p className="mt-1 text-sm text-gray-600">
                        Capacity: {room.capacity} people
                      </p>
                    </div>
                    <Badge variant={room.isActive ? 'success' : 'default'}>
                      {room.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>

                  {room.description && (
                    <p className="mt-3 line-clamp-2 text-sm text-gray-600">{room.description}</p>
                  )}

                  {room.amenities && room.amenities.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {room.amenities.slice(0, 3).map((amenity, index) => (
                        <Badge key={index} variant="secondary" size="sm">
                          {amenity}
                        </Badge>
                      ))}
                      {room.amenities.length > 3 && (
                        <Badge variant="default" size="sm">
                          +{room.amenities.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}

                  <div className="mt-4 border-t border-gray-100 pt-3">
                    <span className="text-sm font-medium text-primary-600 hover:underline">
                      View Details →
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
