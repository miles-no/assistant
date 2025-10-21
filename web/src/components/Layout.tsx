import {
	Building2,
	Calendar,
	ChevronRight,
	DoorOpen,
	LayoutDashboard,
	LogOut,
	MapPin,
	Menu,
	Settings,
	Users,
	X,
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import LanguageSelector from "@/components/LanguageSelector";
import { Badge, Button } from "@/components/ui";
import { useAuthStore, useUIStore } from "@/stores";

interface LayoutProps {
	children: React.ReactNode;
}

interface NavItem {
	label: string;
	path: string;
	icon: React.ReactNode;
	roles?: string[];
}

const navItems: NavItem[] = [
	{
		label: "Dashboard",
		path: "/dashboard",
		icon: <LayoutDashboard className="h-5 w-5" />,
	},
	{
		label: "Locations",
		path: "/locations",
		icon: <MapPin className="h-5 w-5" />,
	},
	{
		label: "Rooms",
		path: "/rooms",
		icon: <DoorOpen className="h-5 w-5" />,
	},
	{
		label: "My Bookings",
		path: "/bookings",
		icon: <Calendar className="h-5 w-5" />,
	},
	{
		label: "Management",
		path: "/management",
		icon: <Users className="h-5 w-5" />,
		roles: ["ADMIN", "MANAGER"],
	},
	{
		label: "Settings",
		path: "/settings",
		icon: <Settings className="h-5 w-5" />,
	},
];

export default function Layout({ children }: LayoutProps) {
	const { user, logout } = useAuthStore();
	const { sidebarOpen, toggleSidebar } = useUIStore();
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
	const location = useLocation();
	const navigate = useNavigate();

	const handleLogout = () => {
		logout();
		navigate("/login");
	};

	const filteredNavItems = navItems.filter(
		(item) => !item.roles || (user?.role && item.roles.includes(user.role)),
	);

	return (
		<div className="flex h-screen overflow-hidden bg-gray-50">
			{/* Sidebar - Desktop */}
			<aside
				className={`hidden border-r border-gray-200 bg-white transition-all duration-300 lg:flex lg:flex-col ${
					sidebarOpen ? "lg:w-64" : "lg:w-20"
				}`}
			>
				{/* Logo */}
				<div className="flex h-16 items-center justify-between border-b border-gray-200 px-4">
					<Link to="/dashboard" className="flex items-center gap-3">
						<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-600">
							<Building2 className="h-6 w-6 text-white" />
						</div>
						{sidebarOpen && (
							<span className="text-lg font-semibold text-gray-900">
								Miles Booking
							</span>
						)}
					</Link>
					<button
						onClick={toggleSidebar}
						className="hidden rounded-lg p-1.5 hover:bg-gray-100 lg:block"
					>
						<ChevronRight
							className={`h-5 w-5 text-gray-500 transition-transform ${
								sidebarOpen ? "rotate-180" : ""
							}`}
						/>
					</button>
				</div>

				{/* Navigation */}
				<nav className="flex-1 space-y-1 p-4">
					{filteredNavItems.map((item) => {
						const isActive = location.pathname === item.path;
						return (
							<Link
								key={item.path}
								to={item.path}
								className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
									isActive
										? "bg-primary-50 text-primary-700"
										: "text-gray-700 hover:bg-gray-100"
								} ${!sidebarOpen && "justify-center"}`}
							>
								{item.icon}
								{sidebarOpen && <span>{item.label}</span>}
							</Link>
						);
					})}
				</nav>

				{/* Language Selector */}
				{sidebarOpen && (
					<div className="px-4 py-3">
						<LanguageSelector />
					</div>
				)}

				{/* User Section */}
				<div className="border-t border-gray-200 p-4">
					{sidebarOpen ? (
						<div className="space-y-3">
							<div className="flex items-center gap-3">
								<div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary-700">
									{user?.firstName?.[0]}
									{user?.lastName?.[0]}
								</div>
								<div className="flex-1 overflow-hidden">
									<p className="truncate text-sm font-medium text-gray-900">
										{user?.firstName} {user?.lastName}
									</p>
									<Badge variant="info" size="sm">
										{user?.role}
									</Badge>
								</div>
							</div>
							<Button
								variant="outline"
								size="sm"
								className="w-full"
								onClick={handleLogout}
								leftIcon={<LogOut className="h-4 w-4" />}
							>
								Logout
							</Button>
						</div>
					) : (
						<button
							onClick={handleLogout}
							className="flex w-full items-center justify-center rounded-lg p-2 text-gray-700 hover:bg-gray-100"
						>
							<LogOut className="h-5 w-5" />
						</button>
					)}
				</div>
			</aside>

			{/* Mobile Menu Overlay */}
			{mobileMenuOpen && (
				<div
					className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
					onClick={() => setMobileMenuOpen(false)}
				/>
			)}

			{/* Mobile Sidebar */}
			<aside
				className={`fixed inset-y-0 left-0 z-50 w-64 transform border-r border-gray-200 bg-white transition-transform lg:hidden ${
					mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
				}`}
			>
				{/* Logo */}
				<div className="flex h-16 items-center justify-between border-b border-gray-200 px-4">
					<Link to="/dashboard" className="flex items-center gap-3">
						<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-600">
							<Building2 className="h-6 w-6 text-white" />
						</div>
						<span className="text-lg font-semibold text-gray-900">
							Miles Booking
						</span>
					</Link>
					<button
						onClick={() => setMobileMenuOpen(false)}
						className="rounded-lg p-1.5 hover:bg-gray-100"
					>
						<X className="h-5 w-5 text-gray-500" />
					</button>
				</div>

				{/* Navigation */}
				<nav className="flex-1 space-y-1 p-4">
					{filteredNavItems.map((item) => {
						const isActive = location.pathname === item.path;
						return (
							<Link
								key={item.path}
								to={item.path}
								onClick={() => setMobileMenuOpen(false)}
								className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
									isActive
										? "bg-primary-50 text-primary-700"
										: "text-gray-700 hover:bg-gray-100"
								}`}
							>
								{item.icon}
								<span>{item.label}</span>
							</Link>
						);
					})}
				</nav>

				{/* User Section */}
				<div className="border-t border-gray-200 p-4">
					<div className="space-y-3">
						<div className="flex items-center gap-3">
							<div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary-700">
								{user?.firstName?.[0]}
								{user?.lastName?.[0]}
							</div>
							<div className="flex-1 overflow-hidden">
								<p className="truncate text-sm font-medium text-gray-900">
									{user?.firstName} {user?.lastName}
								</p>
								<Badge variant="info" size="sm">
									{user?.role}
								</Badge>
							</div>
						</div>
						<Button
							variant="outline"
							size="sm"
							className="w-full"
							onClick={handleLogout}
							leftIcon={<LogOut className="h-4 w-4" />}
						>
							Logout
						</Button>
					</div>
				</div>
			</aside>

			{/* Main Content */}
			<div className="flex flex-1 flex-col overflow-hidden">
				{/* Header */}
				<header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 lg:px-6">
					<button
						onClick={() => setMobileMenuOpen(true)}
						className="rounded-lg p-2 hover:bg-gray-100 lg:hidden"
					>
						<Menu className="h-6 w-6 text-gray-700" />
					</button>

					{/* Breadcrumb or page title could go here */}
					<div className="flex-1" />

					{/* Desktop User Info */}
					<div className="hidden items-center gap-4 lg:flex">
						<span className="text-sm text-gray-600">
							{user?.firstName} {user?.lastName}
						</span>
						<Badge variant="info">{user?.role}</Badge>
					</div>
				</header>

				{/* Page Content */}
				<main className="flex-1 overflow-y-auto">
					<div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
						{children}
					</div>
				</main>
			</div>
		</div>
	);
}
