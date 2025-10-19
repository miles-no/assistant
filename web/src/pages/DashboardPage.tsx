import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores';
import { Card } from '@/components/ui';
import Layout from '@/components/Layout';
import { Calendar, MapPin, Users, Settings } from 'lucide-react';

export default function DashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  return (
    <Layout>
      <div className="space-y-8">
        {/* Welcome Section */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {t('common.welcomeBack', { name: user?.firstName })}
          </h1>
          <p className="mt-2 text-gray-600">
            {t('dashboard.subtitle')}
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Card
            className="cursor-pointer transition-all hover:shadow-md"
            onClick={() => navigate('/locations')}
          >
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-primary-100 p-3">
                <MapPin className="h-6 w-6 text-primary-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{t('nav.locations')}</h3>
                <p className="text-sm text-gray-600">{t('dashboard.locationsDesc')}</p>
              </div>
            </div>
          </Card>

          <Card
            className="cursor-pointer transition-all hover:shadow-md"
            onClick={() => navigate('/bookings')}
          >
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-secondary-100 p-3">
                <Calendar className="h-6 w-6 text-secondary-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{t('nav.myBookings')}</h3>
                <p className="text-sm text-gray-600">{t('dashboard.bookingsDesc')}</p>
              </div>
            </div>
          </Card>

          {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
            <Card
              className="cursor-pointer transition-all hover:shadow-md"
              onClick={() => navigate('/management')}
            >
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-warning-100 p-3">
                  <Users className="h-6 w-6 text-warning-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{t('nav.management')}</h3>
                  <p className="text-sm text-gray-600">{t('dashboard.managementDesc')}</p>
                </div>
              </div>
            </Card>
          )}

          <Card
            className="cursor-pointer transition-all hover:shadow-md"
            onClick={() => navigate('/settings')}
          >
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-gray-100 p-3">
                <Settings className="h-6 w-6 text-gray-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Settings</h3>
                <p className="text-sm text-gray-600">Your profile</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-6 sm:grid-cols-3">
          <Card>
            <h4 className="text-sm font-medium text-gray-600">{t('dashboard.upcomingBookings')}</h4>
            <p className="mt-2 text-3xl font-bold text-gray-900">0</p>
            <p className="mt-1 text-sm text-gray-500">{t('dashboard.next7Days')}</p>
          </Card>

          <Card>
            <h4 className="text-sm font-medium text-gray-600">{t('dashboard.totalBookings')}</h4>
            <p className="mt-2 text-3xl font-bold text-gray-900">0</p>
            <p className="mt-1 text-sm text-gray-500">{t('dashboard.allTime')}</p>
          </Card>

          <Card>
            <h4 className="text-sm font-medium text-gray-600">{t('dashboard.favoriteRooms')}</h4>
            <p className="mt-2 text-3xl font-bold text-gray-900">0</p>
            <p className="mt-1 text-sm text-gray-500">{t('dashboard.mostBooked')}</p>
          </Card>
        </div>

        {/* Info Card */}
        <Card className="bg-gradient-to-br from-primary-50 to-secondary-50">
          <h3 className="text-lg font-semibold text-gray-900">
            🎉 {t('dashboard.welcomeTitle')}
          </h3>
          <p className="mt-2 text-gray-700">
            {t('dashboard.welcomeMessage')}
          </p>
          <div className="mt-4 flex gap-3">
            <button
              onClick={() => navigate('/locations')}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
            >
              {t('dashboard.exploreLocations')}
            </button>
            <button
              onClick={() => navigate('/bookings')}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              {t('dashboard.viewBookings')}
            </button>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
