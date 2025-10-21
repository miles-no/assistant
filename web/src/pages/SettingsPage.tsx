import { Lock, Mail, Save, User } from "lucide-react";
import { useState } from "react";
import Layout from "@/components/Layout";
import { Badge, Button, Card, Input } from "@/components/ui";
import { useAuthStore, useToastStore } from "@/stores";

export default function SettingsPage() {
	const { user } = useAuthStore();
	const { success, error } = useToastStore();
	const [isLoading, setIsLoading] = useState(false);

	const [formData, setFormData] = useState({
		firstName: user?.firstName || "",
		lastName: user?.lastName || "",
		email: user?.email || "",
	});

	const [passwordData, setPasswordData] = useState({
		currentPassword: "",
		newPassword: "",
		confirmPassword: "",
	});

	const handleProfileUpdate = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsLoading(true);

		try {
			// Simulate API call
			await new Promise((resolve) => setTimeout(resolve, 1000));
			success("Profile updated successfully");
		} catch (_err) {
			error("Failed to update profile");
		} finally {
			setIsLoading(false);
		}
	};

	const handlePasswordChange = async (e: React.FormEvent) => {
		e.preventDefault();

		if (passwordData.newPassword !== passwordData.confirmPassword) {
			error("Passwords do not match");
			return;
		}

		if (passwordData.newPassword.length < 8) {
			error("Password must be at least 8 characters");
			return;
		}

		setIsLoading(true);

		try {
			// Simulate API call
			await new Promise((resolve) => setTimeout(resolve, 1000));
			success("Password changed successfully");
			setPasswordData({
				currentPassword: "",
				newPassword: "",
				confirmPassword: "",
			});
		} catch (_err) {
			error("Failed to change password");
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<Layout>
			<div className="space-y-6">
				{/* Header */}
				<div>
					<h1 className="text-3xl font-bold text-gray-900">Settings</h1>
					<p className="mt-2 text-gray-600">
						Manage your account settings and preferences
					</p>
				</div>

				{/* Account Info */}
				<Card>
					<div className="mb-6 flex items-center gap-4">
						<div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 text-2xl font-bold text-primary-700">
							{user?.firstName?.[0]}
							{user?.lastName?.[0]}
						</div>
						<div>
							<h2 className="text-xl font-semibold text-gray-900">
								{user?.firstName} {user?.lastName}
							</h2>
							<div className="mt-1 flex items-center gap-2">
								<Badge variant="info">{user?.role}</Badge>
								<span className="text-sm text-gray-600">{user?.email}</span>
							</div>
						</div>
					</div>
				</Card>

				{/* Profile Form */}
				<Card>
					<h3 className="mb-4 text-lg font-semibold text-gray-900">
						Profile Information
					</h3>
					<form onSubmit={handleProfileUpdate} className="space-y-4">
						<div className="grid gap-4 sm:grid-cols-2">
							<Input
								label="First Name"
								value={formData.firstName}
								onChange={(e) =>
									setFormData({ ...formData, firstName: e.target.value })
								}
								leftIcon={<User className="h-5 w-5" />}
								disabled={isLoading}
							/>
							<Input
								label="Last Name"
								value={formData.lastName}
								onChange={(e) =>
									setFormData({ ...formData, lastName: e.target.value })
								}
								leftIcon={<User className="h-5 w-5" />}
								disabled={isLoading}
							/>
						</div>
						<Input
							label="Email"
							type="email"
							value={formData.email}
							onChange={(e) =>
								setFormData({ ...formData, email: e.target.value })
							}
							leftIcon={<Mail className="h-5 w-5" />}
							disabled={isLoading}
						/>
						<Button
							type="submit"
							variant="primary"
							isLoading={isLoading}
							leftIcon={<Save className="h-4 w-4" />}
						>
							Save Changes
						</Button>
					</form>
				</Card>

				{/* Password Form */}
				<Card>
					<h3 className="mb-4 text-lg font-semibold text-gray-900">
						Change Password
					</h3>
					<form onSubmit={handlePasswordChange} className="space-y-4">
						<Input
							label="Current Password"
							type="password"
							value={passwordData.currentPassword}
							onChange={(e) =>
								setPasswordData({
									...passwordData,
									currentPassword: e.target.value,
								})
							}
							leftIcon={<Lock className="h-5 w-5" />}
							disabled={isLoading}
						/>
						<Input
							label="New Password"
							type="password"
							value={passwordData.newPassword}
							onChange={(e) =>
								setPasswordData({
									...passwordData,
									newPassword: e.target.value,
								})
							}
							leftIcon={<Lock className="h-5 w-5" />}
							helperText="Must be at least 8 characters"
							disabled={isLoading}
						/>
						<Input
							label="Confirm New Password"
							type="password"
							value={passwordData.confirmPassword}
							onChange={(e) =>
								setPasswordData({
									...passwordData,
									confirmPassword: e.target.value,
								})
							}
							leftIcon={<Lock className="h-5 w-5" />}
							disabled={isLoading}
						/>
						<Button type="submit" variant="primary" isLoading={isLoading}>
							Change Password
						</Button>
					</form>
				</Card>
			</div>
		</Layout>
	);
}
