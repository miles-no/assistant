import { Building2, Lock, Mail } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button, Card, Input } from "@/components/ui";
import { useAuthStore, useToastStore } from "@/stores";

export default function LoginPage() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [errors, setErrors] = useState<{ email?: string; password?: string }>(
		{},
	);

	const { login } = useAuthStore();
	const { error: showError, success } = useToastStore();
	const navigate = useNavigate();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setErrors({});

		// Basic validation
		const newErrors: { email?: string; password?: string } = {};
		if (!email) newErrors.email = "Email is required";
		if (!password) newErrors.password = "Password is required";

		if (Object.keys(newErrors).length > 0) {
			setErrors(newErrors);
			return;
		}

		setIsLoading(true);

		try {
			await login(email, password);
			success("Welcome back!");
			navigate("/dashboard");
		} catch (err: unknown) {
			const error = err as { message?: string };
			showError(error.message || "Invalid email or password");
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50 px-4">
			<div className="w-full max-w-md">
				{/* Logo/Brand */}
				<div className="mb-8 text-center">
					<div className="mb-4 inline-flex items-center justify-center rounded-full bg-primary-600 p-4">
						<Building2 className="h-8 w-8 text-white" />
					</div>
					<h1 className="text-3xl font-bold text-gray-900">Miles Booking</h1>
					<p className="mt-2 text-gray-600">Sign in to manage your bookings</p>
				</div>

				{/* Login Form */}
				<Card>
					<form onSubmit={handleSubmit} className="space-y-6">
						<Input
							type="email"
							label="Email"
							placeholder="Enter your email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							error={errors.email}
							leftIcon={<Mail className="h-5 w-5" />}
							autoComplete="email"
							disabled={isLoading}
						/>

						<Input
							type="password"
							label="Password"
							placeholder="Enter your password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							error={errors.password}
							leftIcon={<Lock className="h-5 w-5" />}
							autoComplete="current-password"
							disabled={isLoading}
						/>

						<Button
							type="submit"
							variant="primary"
							className="w-full"
							isLoading={isLoading}
						>
							Sign In
						</Button>
					</form>

					<div className="mt-6 text-center">
						<p className="text-sm text-gray-600">
							Don&apos;t have an account?{" "}
							<Link
								to="/register"
								className="font-medium text-primary-600 hover:text-primary-700"
							>
								Sign up
							</Link>
						</p>
					</div>
				</Card>

				{/* Test Credentials */}
				<div className="mt-6 rounded-lg bg-white p-4 shadow-sm">
					<p className="mb-2 text-xs font-semibold text-gray-700">
						Test Credentials:
					</p>
					<ul className="space-y-1 text-xs text-gray-600">
						<li>
							<strong>Admin:</strong> admin@miles.com / password123
						</li>
						<li>
							<strong>Manager:</strong> manager.stavanger@miles.com /
							password123
						</li>
						<li>
							<strong>User:</strong> john.doe@miles.com / password123
						</li>
					</ul>
				</div>
			</div>
		</div>
	);
}
