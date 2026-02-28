import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const api = axios.create({
	baseURL: API_URL,
	withCredentials: true, // Posílat HttpOnly cookies s každým requestem
});

// --- 401 interceptor: automatický refresh tokenu ---
let isRefreshing = false;
let failedQueue: { resolve: (v: unknown) => void; reject: (e: unknown) => void }[] = [];

const processQueue = (error: unknown) => {
	failedQueue.forEach(({ resolve, reject }) => {
		if (error) reject(error);
		else resolve(undefined);
	});
	failedQueue = [];
};

api.interceptors.response.use(
	(response) => response,
	async (error) => {
		const originalRequest = error.config;

		// Pokud dostaneme 401 a není to refresh endpoint samotný
		if (
			error.response?.status === 401 &&
			!originalRequest._retry &&
			!originalRequest.url?.includes("/auth/refresh") &&
			!originalRequest.url?.includes("/auth/login")
		) {
			if (isRefreshing) {
				// Další requesty čekají, až refresh proběhne
				return new Promise((resolve, reject) => {
					failedQueue.push({ resolve, reject });
				}).then(() => api(originalRequest));
			}

			originalRequest._retry = true;
			isRefreshing = true;

			try {
				await axios.post(`${API_URL}/auth/refresh`, {}, { withCredentials: true });
				processQueue(null);
				return api(originalRequest);
			} catch (refreshError) {
				processQueue(refreshError);
				// Refresh selhal — přesměruj na login
				if (typeof window !== "undefined") {
					window.location.href = "/login";
				}
				return Promise.reject(refreshError);
			} finally {
				isRefreshing = false;
			}
		}

		return Promise.reject(error);
	},
);

export default api;
