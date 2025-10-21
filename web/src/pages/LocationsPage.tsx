import { Building, Globe, MapPin, Search, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Badge, Card, Input, LoadingSpinner } from "@/components/ui";
import { useLocations } from "@/hooks/useLocations";

export default function LocationsPage() {
	const navigate = useNavigate();
	const { data: locations, isLoading, error } = useLocations();
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedCountry, setSelectedCountry] = useState<string>("all");

	// Get unique countries for filter
	const countries = useMemo(() => {
		if (!locations) return [];
		const uniqueCountries = [...new Set(locations.map((loc) => loc.country))];
		return uniqueCountries.sort();
	}, [locations]);

	// Filter locations based on search and country
	const filteredLocations = useMemo(() => {
		if (!locations) return [];

		return locations.filter((location) => {
			const matchesSearch =
				searchQuery === "" ||
				location.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
				location.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
				location.address?.toLowerCase().includes(searchQuery.toLowerCase());

			const matchesCountry =
				selectedCountry === "all" || location.country === selectedCountry;

			return matchesSearch && matchesCountry;
		});
	}, [locations, searchQuery, selectedCountry]);

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
						Failed to load locations. Please try again.
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
					<h1 className="text-3xl font-bold text-gray-900">Office Locations</h1>
					<p className="mt-2 text-gray-600">
						Browse our {locations?.length || 0} office locations worldwide
					</p>
				</div>

				{/* Filters */}
				<div className="flex flex-col gap-4 sm:flex-row">
					<div className="flex-1">
						<Input
							type="text"
							placeholder="Search locations, cities..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							leftIcon={<Search className="h-5 w-5" />}
						/>
					</div>
					<div className="w-full sm:w-48">
						<select
							value={selectedCountry}
							onChange={(e) => setSelectedCountry(e.target.value)}
							className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-20"
						>
							<option value="all">All Countries</option>
							{countries.map((country) => (
								<option key={country} value={country}>
									{country}
								</option>
							))}
						</select>
					</div>
				</div>

				{/* Results count */}
				<div className="text-sm text-gray-600">
					Showing {filteredLocations.length} of {locations?.length || 0}{" "}
					locations
				</div>

				{/* Locations Grid */}
				{filteredLocations.length === 0 ? (
					<Card className="text-center">
						<MapPin className="mx-auto h-12 w-12 text-gray-400" />
						<h3 className="mt-4 text-lg font-semibold text-gray-900">
							No locations found
						</h3>
						<p className="mt-2 text-gray-600">
							Try adjusting your search or filter criteria
						</p>
					</Card>
				) : (
					<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
						{filteredLocations.map((location) => (
							<Card
								key={location.id}
								className="group cursor-pointer transition-all hover:shadow-lg"
								onClick={() => navigate(`/locations/${location.id}`)}
							>
								{/* Location Header */}
								<div className="mb-4 flex items-start justify-between">
									<div className="flex items-center gap-3">
										<div className="rounded-lg bg-primary-100 p-2">
											<Building className="h-6 w-6 text-primary-600" />
										</div>
										<div>
											<h3 className="font-semibold text-gray-900 group-hover:text-primary-600">
												{location.name}
											</h3>
											<Badge variant="info" size="sm">
												{location.city}
											</Badge>
										</div>
									</div>
								</div>

								{/* Location Details */}
								<div className="space-y-2 text-sm text-gray-600">
									<div className="flex items-center gap-2">
										<MapPin className="h-4 w-4" />
										<span>{location.address}</span>
									</div>
									<div className="flex items-center gap-2">
										<Globe className="h-4 w-4" />
										<span>{location.country}</span>
									</div>
									{location._count?.rooms && location._count.rooms > 0 && (
										<div className="flex items-center gap-2">
											<Users className="h-4 w-4" />
											<span>{location._count.rooms} meeting rooms</span>
										</div>
									)}
								</div>

								{/* Description */}
								{location.description && (
									<div className="mt-4 border-t border-gray-100 pt-4">
										<p className="line-clamp-2 text-sm text-gray-600">
											{location.description}
										</p>
									</div>
								)}

								{/* Timezone */}
								<div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
									<span className="text-xs text-gray-500">
										Timezone: {location.timezone}
									</span>
									<span className="text-sm font-medium text-primary-600 group-hover:underline">
										View Details →
									</span>
								</div>
							</Card>
						))}
					</div>
				)}
			</div>
		</Layout>
	);
}
