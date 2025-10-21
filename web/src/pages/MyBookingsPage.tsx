import { format } from "date-fns";
import { Calendar, Clock, DoorOpen, MapPin, Trash2 } from "lucide-react";
import { useState } from "react";
import type { Booking, Location, Room, User } from "@/api-generated/types.gen";
import Layout from "@/components/Layout";
import {
	Badge,
	Button,
	Card,
	ConfirmModal,
	LoadingSpinner,
} from "@/components/ui";
import { useBookings, useCancelBooking } from "@/hooks/useBookings";

type BookingWithRelations = Booking & {
	room?: Room & {
		location?: Location;
	};
	user?: User;
};

export default function MyBookingsPage() {
	const { data: bookings, isLoading, error } = useBookings();
	const cancelBooking = useCancelBooking();
	const [cancelModalOpen, setCancelModalOpen] = useState(false);
	const [selectedBooking, setSelectedBooking] =
		useState<BookingWithRelations | null>(null);

	const handleCancelClick = (booking: BookingWithRelations) => {
		setSelectedBooking(booking);
		setCancelModalOpen(true);
	};

	const handleCancelConfirm = async () => {
		if (!selectedBooking || !selectedBooking.id) return;

		await cancelBooking.mutateAsync({ path: { id: selectedBooking.id } });
		setCancelModalOpen(false);
		setSelectedBooking(null);
	};

	const getStatusColor = (status?: string) => {
		switch (status) {
			case "CONFIRMED":
				return "success";
			case "PENDING":
				return "warning";
			case "CANCELLED":
				return "danger";
			default:
				return "default";
		}
	};

	// Group bookings by upcoming and past
	const now = new Date();
	const upcomingBookings = bookings?.filter(
		(b) =>
			b.startTime && new Date(b.startTime) > now && b.status !== "CANCELLED",
	);
	const pastBookings = bookings?.filter(
		(b) =>
			(b.endTime && new Date(b.endTime) <= now) || b.status === "CANCELLED",
	);

	if (isLoading) {
		return (
			<Layout>
				<div className="flex min-h-[400px] items-center justify-center">
					<LoadingSpinner size="lg" />
				</div>
			</Layout>
		);
	}

	if (error) {
		return (
			<Layout>
				<Card className="text-center">
					<p className="text-danger-600">
						Failed to load bookings. Please try again.
					</p>
				</Card>
			</Layout>
		);
	}

	const BookingCard = ({ booking }: { booking: BookingWithRelations }) => {
		if (!booking.startTime || !booking.endTime) return null;
		const startDate = new Date(booking.startTime);
		const endDate = new Date(booking.endTime);
		const isUpcoming = startDate > now && booking.status !== "CANCELLED";
		const canCancel = isUpcoming;

		return (
			<Card className="transition-shadow hover:shadow-md">
				<div className="flex items-start justify-between">
					<div className="flex-1">
						<div className="flex items-start justify-between">
							<div>
								<h3 className="font-semibold text-gray-900">{booking.title}</h3>
								<Badge
									variant={getStatusColor(booking.status)}
									size="sm"
									className="mt-1"
								>
									{booking.status}
								</Badge>
							</div>
							{canCancel && (
								<Button
									variant="ghost"
									size="sm"
									onClick={() => handleCancelClick(booking)}
									leftIcon={<Trash2 className="h-4 w-4" />}
									className="text-danger-600 hover:bg-danger-50"
								>
									Cancel
								</Button>
							)}
						</div>

						{booking.description && (
							<p className="mt-2 text-sm text-gray-600">
								{booking.description}
							</p>
						)}

						<div className="mt-4 space-y-2 text-sm text-gray-600">
							<div className="flex items-center gap-2">
								<Calendar className="h-4 w-4" />
								<span>{format(startDate, "EEEE, MMMM d, yyyy")}</span>
							</div>
							<div className="flex items-center gap-2">
								<Clock className="h-4 w-4" />
								<span>
									{format(startDate, "h:mm a")} - {format(endDate, "h:mm a")}
								</span>
							</div>
							{booking.room && (
								<>
									<div className="flex items-center gap-2">
										<DoorOpen className="h-4 w-4" />
										<span>{booking.room.name}</span>
									</div>
									{booking.room.location && (
										<div className="flex items-center gap-2">
											<MapPin className="h-4 w-4" />
											<span>
												{booking.room.location.name} -{" "}
												{booking.room.location.city}
											</span>
										</div>
									)}
								</>
							)}
						</div>
					</div>
				</div>
			</Card>
		);
	};

	return (
		<Layout>
			<div className="space-y-8">
				{/* Header */}
				<div>
					<h1 className="text-3xl font-bold text-gray-900">My Bookings</h1>
					<p className="mt-2 text-gray-600">
						Manage your meeting room reservations ({bookings?.length || 0}{" "}
						total)
					</p>
				</div>

				{/* Upcoming Bookings */}
				<div>
					<h2 className="mb-4 text-xl font-semibold text-gray-900">
						Upcoming ({upcomingBookings?.length || 0})
					</h2>
					{!upcomingBookings || upcomingBookings.length === 0 ? (
						<Card className="text-center">
							<Calendar className="mx-auto h-12 w-12 text-gray-400" />
							<h3 className="mt-4 text-lg font-semibold text-gray-900">
								No upcoming bookings
							</h3>
							<p className="mt-2 text-gray-600">
								You don&apos;t have any upcoming reservations.
							</p>
							<Button variant="primary" className="mt-4">
								Browse Locations
							</Button>
						</Card>
					) : (
						<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
							{upcomingBookings.map((booking) => (
								<BookingCard key={booking.id} booking={booking} />
							))}
						</div>
					)}
				</div>

				{/* Past Bookings */}
				<div>
					<h2 className="mb-4 text-xl font-semibold text-gray-900">
						Past & Cancelled ({pastBookings?.length || 0})
					</h2>
					{!pastBookings || pastBookings.length === 0 ? (
						<Card className="text-center">
							<p className="text-gray-600">No past or cancelled bookings.</p>
						</Card>
					) : (
						<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
							{pastBookings.map((booking) => (
								<BookingCard key={booking.id} booking={booking} />
							))}
						</div>
					)}
				</div>
			</div>

			{/* Cancel Confirmation Modal */}
			<ConfirmModal
				isOpen={cancelModalOpen}
				onClose={() => {
					setCancelModalOpen(false);
					setSelectedBooking(null);
				}}
				onConfirm={handleCancelConfirm}
				title="Cancel Booking"
				message={`Are you sure you want to cancel "${selectedBooking?.title}"? This action cannot be undone.`}
				confirmText="Cancel Booking"
				variant="danger"
				isLoading={cancelBooking.isPending}
			/>
		</Layout>
	);
}
