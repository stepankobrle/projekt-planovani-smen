"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);
	const router = useRouter();

	const handleLogin = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		setLoading(true);

		try {
			const response = await fetch("http://localhost:3001/auth/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email, password }),
			});

			const data = await response.json();

			if (response.ok) {
				localStorage.setItem("token", data.access_token);
				if (data.user) {
					localStorage.setItem("user", JSON.stringify(data.user));
				}
				router.push("/dashboard");
			} else {
				setError(data.message || "Neplatné přihlašovací údaje");
			}
		} catch (err: any) {
			setError(
				"Nepodařilo se připojit k serveru. Zkontroluj, zda běží backend.",
			);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
			<form
				onSubmit={handleLogin}
				className="w-full max-w-md bg-white p-8 rounded-lg shadow-md">
				<h1 className="text-2xl font-bold mb-6 text-center text-gray-800">
					Přihlášení do systému
				</h1>

				{error && (
					<div className="mb-4 p-3 bg-red-100 text-red-600 text-sm rounded border border-red-200 text-center">
						{error}
					</div>
				)}

				<div className="mb-4">
					<label className="block text-sm font-medium text-gray-700">
						E-mail
					</label>
					<input
						type="email"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						className="mt-1 w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
						placeholder="admin@test.cz"
						required
						disabled={loading}
					/>
				</div>

				<div className="mb-6">
					<label className="block text-sm font-medium text-gray-700">
						Heslo
					</label>
					<input
						type="password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						className="mt-1 w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
						placeholder="••••••••"
						required
						disabled={loading}
					/>
				</div>

				<button
					type="submit"
					disabled={loading}
					className={`w-full p-2 rounded text-white font-semibold transition ${
						loading
							? "bg-blue-400 cursor-not-allowed"
							: "bg-blue-600 hover:bg-blue-700 shadow-sm"
					}`}>
					{loading ? "Přihlašování..." : "Přihlásit se"}
				</button>
			</form>
		</div>
	);
}
