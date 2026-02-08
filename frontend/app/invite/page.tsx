"use client";

import { useState } from "react";
import ProtectedRoute from "../components/ProtectedRoute"; // Tvůj strážce

export default function InviteUserPage() {
	const [formData, setFormData] = useState({
		email: "",
		fullName: "",
		role: "EMPLOYEE",
		targetHours: 40,
	});
	const [status, setStatus] = useState({ type: "", msg: "" });
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setStatus({ type: "", msg: "" });

		try {
			const token = localStorage.getItem("token"); // Načteme adminův token

			const res = await fetch("http://localhost:3001/auth/invite", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`, // Nutné pro RolesGuard
				},
				body: JSON.stringify(formData),
			});

			const data = await res.json();

			if (res.ok) {
				setStatus({ type: "success", msg: "Pozvánka byla úspěšně vytvořena!" });
				setFormData({
					email: "",
					fullName: "",
					role: "EMPLOYEE",
					targetHours: 40,
				});
			} else {
				setStatus({ type: "error", msg: data.message || "Něco se nepovedlo." });
			}
		} catch (err) {
			setStatus({ type: "error", msg: "Chyba připojení k serveru." });
		} finally {
			setLoading(false);
		}
	};

	return (
		<ProtectedRoute>
			<div className="max-w-2xl mx-auto mt-10 p-6 bg-white shadow-lg rounded-xl">
				<h1 className="text-2xl font-bold mb-6 text-gray-800">
					Pozvat nového zaměstnance
				</h1>

				{status.msg && (
					<div
						className={`p-3 mb-4 rounded ${status.type === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
						{status.msg}
					</div>
				)}

				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<label className="block text-sm font-medium text-gray-700">
							Celé jméno
						</label>
						<input
							type="text"
							required
							className="mt-1 w-full p-2 border rounded outline-none focus:ring-2 focus:ring-blue-500"
							value={formData.fullName}
							onChange={(e) =>
								setFormData({ ...formData, fullName: e.target.value })
							}
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700">
							E-mail
						</label>
						<input
							type="email"
							required
							className="mt-1 w-full p-2 border rounded outline-none focus:ring-2 focus:ring-blue-500"
							value={formData.email}
							onChange={(e) =>
								setFormData({ ...formData, email: e.target.value })
							}
						/>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div>
							<label className="block text-sm font-medium text-gray-700">
								Role
							</label>
							<select
								className="mt-1 w-full p-2 border rounded"
								value={formData.role}
								onChange={(e) =>
									setFormData({ ...formData, role: e.target.value })
								}>
								<option value="EMPLOYEE">Zaměstnanec</option>
								<option value="MANAGER">Manažer</option>
								<option value="ADMIN">Administrátor</option>
							</select>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700">
								Úvazek (h/týden)
							</label>
							<input
								type="number"
								className="mt-1 w-full p-2 border rounded"
								value={formData.targetHours}
								onChange={(e) =>
									setFormData({
										...formData,
										targetHours: parseInt(e.target.value),
									})
								}
							/>
						</div>
					</div>

					<button
						type="submit"
						disabled={loading}
						className={`w-full p-3 text-white rounded font-bold transition ${loading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"}`}>
						{loading ? "Odesílání..." : "Vytvořit a pozvat"}
					</button>
				</form>
			</div>
		</ProtectedRoute>
	);
}
