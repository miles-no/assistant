import { DoorOpen, MapPin, Search, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Badge, Button, Card, Input, LoadingSpinner } from "@/components/ui";
import { useRooms } from "@/hooks/useRooms";

export default function RoomsPage() {
	const [search, setSearch] = useState("");
	const [minCapacity, setMinCapacity] = useState("");
	const navigate = useNavigate();
	const { data: rooms, isLoading, error } = useRooms();

	const filteredRooms = useMemo(() => {
		if (!rooms) return [];

		return rooms.filter((room) => {
			const matchesSearch =
				room.name?.toLowerCase().includes(search.toLowerCase()) ||
				room.location?.name?.toLowerCase().includes(search.toLowerCase());
			const matchesCapacity =
				!minCapacity ||
				(room.capacity && room.capacity >= parseInt(minCapacity, 10));
			return matchesSearch && matchesCapacity;
		});
	}, [rooms, search, minCapacity]);

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
						Failed to load rooms. Please try again.
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
					<h1 className="text-3xl font-bold text-gray-900">Meeting Rooms</h1>
					<p className="mt-2 text-gray-600">
						Find and book meeting spaces across all locations
					</p>
				</div>

				{/* Filters */}
				<Card>
					<div className="flex flex-col gap-4 sm:flex-row">
						<div className="flex-1">
							<Input
								placeholder="Search rooms or locations..."
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								leftIcon={<Search className="h-5 w-5" />}
							/>
						</div>
						<div className="w-full sm:w-48">
							<Input
								type="number"
								placeholder="Min capacity"
								value={minCapacity}
								onChange={(e) => setMinCapacity(e.target.value)}
								leftIcon={<Users className="h-5 w-5" />}
							/>
						</div>
					</div>
				</Card>

				{/* Results */}
				<div className="text-sm text-gray-600">
					Showing {filteredRooms.length} of {rooms?.length || 0} rooms
				</div>

				{/* Rooms Grid */}
				{filteredRooms.length === 0 ? (
					<Card className="text-center">
						<DoorOpen className="mx-auto h-12 w-12 text-gray-400" />
						<h3 className="mt-4 text-lg font-semibold text-gray-900">
							No rooms found
						</h3>
						<p className="mt-2 text-gray-600">
							Try adjusting your search or filters
						</p>
					</Card>
				) : (
					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{filteredRooms.map((room) => (
							<Card key={room.id} className="transition-shadow hover:shadow-md">
								<div className="space-y-3">
									<div className="flex items-start justify-between">
										<div>
											<h3 className="font-semibold text-gray-900">
												{room.name}
											</h3>
											<Badge
												variant={room.isActive ? "success" : "default"}
												size="sm"
												className="mt-1"
											>
												{room.isActive ? "Available" : "Unavailable"}
											</Badge>
										</div>
									</div>

									{room.description && (
										<p className="text-sm text-gray-600">{room.description}</p>
									)}

									<div className="space-y-2 text-sm text-gray-600">
										{room.location && (
											<div className="flex items-center gap-2">
												<MapPin className="h-4 w-4" />
												<span>
													{room.location.name} - {room.location.city}
												</span>
											</div>
										)}
										{room.capacity && (
											<div className="flex items-center gap-2">
												<Users className="h-4 w-4" />
												<span>Capacity: {room.capacity} people</span>
											</div>
										)}
									</div>

									{room.amenities && room.amenities.length > 0 && (
										<div className="flex flex-wrap gap-1">
											{room.amenities.map((amenity) => (
												<Badge key={amenity} variant="default" size="sm">
													{amenity}
												</Badge>
											))}
										</div>
									)}

									<Button
										variant="primary"
										size="sm"
										className="w-full"
										onClick={() => navigate(`/rooms/${room.id}/book`)}
									>
										Book Room
									</Button>
								</div>
							</Card>
						))}
					</div>
				)}
			</div>
		</Layout>
	);
}
