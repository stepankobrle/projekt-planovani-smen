"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function SetPasswordPage() {
	const searchParams = useSearchParams();
	const router = useRouter();
	const token = searchParams.get("token"); // Tady vytáhneme ten token z URL

	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [status, setStatus] = useState({ type: "", msg: "" });

	const handleSetPassword = async (e: React.FormEvent) => {
		e.preventDefault();
		if (password !== confirmPassword) {
			setStatus({ type: "error", msg: "Hesla se neshodují!" });
			return;
		}

		try {
			const res = await fetch("http://localhost:3001/auth/activate", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ token, password }),
			});

			const data = await res.json();

			if (res.ok) {
				setStatus({
					type: "success",
					msg: "Heslo nastaveno! Za chvíli tě přesměruji na login.",
				});
				setTimeout(() => router.push("/login"), 3000);
			} else {
				setStatus({ type: "error", msg: data.message });
			}
		} catch (err) {
			setStatus({ type: "error", msg: "Chyba komunikace se serverem." });
		}
	};

	if (!token)
		return (
			<div className="p-10 text-center">Neplatný odkaz (chybí token).</div>
		);

	return (
		<div className="flex min-h-screen items-center justify-center bg-gray-100">
			<form
				onSubmit={handleSetPassword}
				className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
				<h1 className="text-2xl font-bold mb-4">Nastavit heslo</h1>
				<p className="text-gray-600 mb-6 text-sm">
					Vítej v týmu! Zvol si své přístupové heslo.
				</p>

				{status.msg && (
					<div
						className={`p-3 mb-4 rounded ${status.type === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
						{status.msg}
					</div>
				)}

				<input
					type="password"
					placeholder="Nové heslo"
					className="w-full p-2 mb-4 border rounded"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					required
				/>
				<input
					type="password"
					placeholder="Potvrď heslo"
					className="w-full p-2 mb-6 border rounded"
					value={confirmPassword}
					onChange={(e) => setConfirmPassword(e.target.value)}
					required
				/>
				<button
					type="submit"
					className="w-full bg-green-600 text-white p-2 rounded hover:bg-green-700">
					Aktivovat účet
				</button>
			</form>
		</div>
	);
}
