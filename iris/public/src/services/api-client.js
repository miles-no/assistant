import createClient from 'openapi-fetch';
export class MilesApiClient {
    constructor(baseUrl, authToken) {
        this.baseUrl = baseUrl;
        this.client = createClient({
            baseUrl,
            headers: authToken ? {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json',
            } : {
                'Content-Type': 'application/json',
            },
        });
    }
    setAuthToken(token) {
        this.client = createClient({
            baseUrl: this.baseUrl,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });
    }
    async health() {
        const { data, error } = await this.client.GET('/health');
        if (error)
            throw new Error('Health check failed');
        return {
            status: data?.status || 'unknown',
            timestamp: data?.timestamp || new Date().toISOString(),
        };
    }
    async login(credentials) {
        const { data, error } = await this.client.POST('/api/auth/login', {
            body: credentials,
        });
        if (error) {
            throw new Error(error.error || 'Login failed');
        }
        return {
            message: data?.message,
            user: data?.user,
            token: data?.token,
        };
    }
    async register(userData) {
        const { data, error } = await this.client.POST('/api/auth/register', {
            body: userData,
        });
        if (error) {
            throw new Error(error.error || 'Registration failed');
        }
        return {
            message: data?.message,
            user: data?.user,
            token: data?.token,
        };
    }
    async getRooms(params) {
        const query = params ? Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined)) : undefined;
        const { data, error } = await this.client.GET('/api/rooms', {
            params: { query },
        });
        if (error) {
            throw new Error(error.error || 'Failed to fetch rooms');
        }
        return {
            rooms: data?.rooms || [],
        };
    }
    async getRoomAvailability(params) {
        const { data, error } = await this.client.GET('/api/rooms/{id}/availability', {
            params: {
                path: { id: params.roomId },
                query: {
                    startDate: params.startDate,
                    endDate: params.endDate,
                },
            },
        });
        if (error) {
            throw new Error(error.error || 'Failed to check availability');
        }
        return {
            bookings: data?.bookings || [],
        };
    }
    async getBookings(params) {
        const query = params ? Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined)) : undefined;
        const { data, error } = await this.client.GET('/api/bookings', {
            params: { query },
        });
        if (error) {
            throw new Error(error.error || 'Failed to fetch bookings');
        }
        return {
            bookings: data?.bookings || [],
        };
    }
    async createBooking(booking) {
        const { data, error } = await this.client.POST('/api/bookings', {
            body: booking,
        });
        if (error) {
            throw new Error(error.error || 'Failed to create booking');
        }
        return {
            message: data?.message,
            booking: data?.booking,
        };
    }
    async getBooking(bookingId) {
        const { data, error } = await this.client.GET('/api/bookings/{id}', {
            params: { path: { id: bookingId } },
        });
        if (error) {
            throw new Error(error.error || 'Failed to fetch booking');
        }
        if (!data?.booking) {
            throw new Error('Booking not found');
        }
        return {
            booking: data.booking,
        };
    }
    async updateBooking(bookingId, updates) {
        const { data, error } = await this.client.PATCH('/api/bookings/{id}', {
            params: { path: { id: bookingId } },
            body: updates,
        });
        if (error) {
            throw new Error(error.error || 'Failed to update booking');
        }
        return {
            message: data?.message,
            booking: data?.booking,
        };
    }
    async cancelBooking(bookingId) {
        const { data, error } = await this.client.DELETE('/api/bookings/{id}', {
            params: { path: { id: bookingId } },
        });
        if (error) {
            throw new Error(error.error || 'Failed to cancel booking');
        }
        return {
            message: data?.message || 'Booking cancelled successfully',
        };
    }
    async getLocations() {
        const { data, error } = await this.client.GET('/api/locations');
        if (error) {
            throw new Error(error.error || 'Failed to fetch locations');
        }
        return {
            locations: data?.locations || [],
        };
    }
    async getLocation(locationId) {
        const { data, error } = await this.client.GET('/api/locations/{id}', {
            params: { path: { id: locationId } },
        });
        if (error) {
            throw new Error(error.error || 'Failed to fetch location');
        }
        if (!data?.location) {
            throw new Error('Location not found');
        }
        return {
            location: data.location,
        };
    }
}
