// app/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import Cookies from "js-cookie";

export default function DashboardPage() {
	const router = useRouter();
	const [user, setUser] = useState<{ fullName: string; role: string } | null>(
		null,
	);

	useEffect(() => {
		// Načteme si info o uživateli, které jsme si uložili při loginu
		const storedUser = Cookies.get("user");
		if (storedUser) {
			setUser(JSON.parse(storedUser));
		}
	}, []);

	const handleLogout = () => {
		Cookies.remove("token"); // Smažeme "vstupenku"
		Cookies.remove("user"); // Smažeme info o uživateli
		Cookies.remove("id"); // Smažeme info o uživateli
		Cookies.remove("role"); // Smažeme info o uživateli
		router.push("/login"); // Šup na přihlášení
	};

	return (
		<ProtectedRoute>
			<div className="min-h-screen bg-gray-50 p-8">
				<div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg p-6">
					<div className="flex justify-between items-center border-b pb-4 mb-6">
						<div>
							<h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
							<p className="text-gray-600">
								Vítejte zpět,{" "}
								<span className="font-semibold">
									{user?.fullName || "Uživatel"}
								</span>
								!
							</p>
						</div>

						<button
							onClick={handleLogout}
							className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded transition">
							Odhlásit se
						</button>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						{/* Tady už můžeš začít stavět své menu pro směny atd. */}
						<div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
							<h3 className="font-bold text-blue-800">Tvá role</h3>
							<p className="text-blue-600 font-medium">{user?.role}</p>
						</div>

						{/* Další karty dashboardu... */}
					</div>
				</div>
			</div>
		</ProtectedRoute>
	);
}
