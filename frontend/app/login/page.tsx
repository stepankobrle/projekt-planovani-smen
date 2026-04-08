"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie"; // Nezapomeň: npm install js-cookie

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
			const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"}/auth/login`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "include", // Přijmout HttpOnly cookies od backendu
				body: JSON.stringify({ email, password }),
			});

			const data = await response.json();

			if (response.ok) {
				// access_token je nyní v HttpOnly cookie (nastavil backend)
				// Ukládáme jen uživatelská data pro UI routing (bez citlivého tokenu)
				if (data.user && data.user.role && data.user.id) {
					Cookies.set("id", data.user.id, { expires: 1 });
					Cookies.set("role", data.user.role, { expires: 1 });
				}

				const role = data.user?.role;
				if (role === "ADMIN" || role === "MANAGER") {
					router.push("/admin/dashboard");
				} else {
					router.push("/dashboard");
				}
				router.refresh();
			} else {
				setError(data.message || "Neplatné přihlašovací údaje");
			}
		} catch {
			setError("Nepodařilo se připojit k serveru. Zkontroluj, zda běží backend.");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 font-sans">
			<form
				onSubmit={handleLogin}
				className="w-full max-w-md bg-white p-10 rounded-2xl shadow-xl border border-slate-100">
				<div className="mb-8 text-center">
					<h1 className="text-3xl font-black text-slate-800 uppercase tracking-tight">
						Vítejte zpět
					</h1>
					<p className="text-slate-400 text-sm font-medium mt-2">
						Přihlaste se do systému správy směn
					</p>
				</div>

				{error && (
					<div className="mb-6 p-4 bg-red-50 text-red-600 text-xs font-bold rounded-xl border border-red-100 text-center uppercase tracking-wide">
						{error}
					</div>
				)}

				<div className="mb-4">
					<label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">
						E-mailová adresa
					</label>
					<input
						type="email"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-secondary outline-none text-slate-700 transition-all font-medium"
						placeholder="vas@email.cz"
						required
						disabled={loading}
					/>
				</div>

				<div className="mb-8">
					<label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">
						Heslo
					</label>
					<input
						type="password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-secondary outline-none text-slate-700 transition-all font-medium"
						placeholder="••••••••"
						required
						disabled={loading}
					/>
				</div>

				<button
					type="submit"
					disabled={loading}
					className={`w-full p-4 rounded-xl text-white font-bold text-sm uppercase tracking-widest transition-all shadow-lg ${
						loading
							? "bg-brand-secondary/40 cursor-not-allowed"
							: "bg-brand-secondary hover:bg-brand-secondary-hover hover:shadow-brand-secondary/20 active:scale-[0.98]"
					}`}>
					{loading ? "Ověřování..." : "Přihlásit se"}
				</button>
			</form>
		</div>
	);
}
