"use client";

import Sidebar from "@/app/components/Sidebar";
import Header from "@/app/components/Header";
import { UserRole } from "@/config/menu";
import ProtectedRoute, { useAuth } from "@/app/components/ProtectedRoute";
import axios from "axios";
import Cookies from "js-cookie";

// Konfigurace Axiosu, aby posílal token v každém požadavku
axios.interceptors.request.use((config) => {
	const token = Cookies.get("token");
	if (token) {
		config.headers.Authorization = `Bearer ${token}`;
	}
	return config;
});

export default function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<ProtectedRoute>
			<DashboardContent>{children}</DashboardContent>
		</ProtectedRoute>
	);
}

// Vnitřní část, která už má přístup k roli z ProtectedRoute
function DashboardContent({ children }: { children: React.ReactNode }) {
	const { role } = useAuth();

	// Převod stringu z cookie na tvůj Enum (UserRole.ADMIN nebo UserRole.EMPLOYEE)
	const userRole = role === "ADMIN" ? UserRole.ADMIN : UserRole.EMPLOYEE;

	return (
		<div className="flex h-screen w-full bg-brand-primary overflow-hidden text-slate-900">
			{/* Sidebar se teď přizpůsobí reálné roli z DB */}
			<Sidebar userRole={userRole} />

			<div className="flex-1 flex flex-col min-w-0 overflow-hidden">
				<Header userRole={userRole} />

				<main className="flex-1 overflow-y-auto p-4 md:p-8 mb-3 mr-3 bg-brand-surface border-6 border-brand-primary rounded-2xl">
					<div className="mx-auto max-w-7xl">{children}</div>
				</main>
			</div>
		</div>
	);
}
