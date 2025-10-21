import apiClient, { authTokenManager, userDataManager } from "@/lib/api-client";
import type {
	AuthResponse,
	LoginRequest,
	RegisterRequest,
	User,
} from "@/types/api";

export const authService = {
	/**
	 * Login user
	 */
	async login(credentials: LoginRequest): Promise<AuthResponse> {
		const response = await apiClient.post<AuthResponse>(
			"/auth/login",
			credentials,
		);
		// Store token and user data
		authTokenManager.set(response.data.token);
		userDataManager.set(response.data.user);
		return response.data;
	},

	/**
	 * Register new user
	 */
	async register(data: RegisterRequest): Promise<AuthResponse> {
		const response = await apiClient.post<AuthResponse>("/auth/register", data);
		// Store token and user data
		authTokenManager.set(response.data.token);
		userDataManager.set(response.data.user);
		return response.data;
	},

	/**
	 * Get current user
	 */
	async me(): Promise<User> {
		const response = await apiClient.get<User>("/auth/me");
		// Update user data in storage
		userDataManager.set(response.data);
		return response.data;
	},

	/**
	 * Logout user
	 */
	logout(): void {
		authTokenManager.remove();
		userDataManager.remove();
	},

	/**
	 * Check if user is authenticated
	 */
	isAuthenticated(): boolean {
		return !!authTokenManager.get();
	},

	/**
	 * Get stored user data
	 */
	getUser(): User | null {
		return userDataManager.get();
	},
};
