"use client";

import { useState } from "react";
import Sidebar from "@/app/components/Sidebar";
import Header from "@/app/components/Header";
import { UserRole } from "@/config/menu";
import ProtectedRoute, { useAuth } from "@/app/components/ProtectedRoute";

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
	const [isMobileOpen, setIsMobileOpen] = useState(false);

	const userRole = role === "ADMIN" ? UserRole.ADMIN : UserRole.EMPLOYEE;

	return (
		<div className="flex h-screen w-full bg-brand-primary overflow-hidden text-slate-900">
			<Sidebar
				userRole={userRole}
				isMobileOpen={isMobileOpen}
				onClose={() => setIsMobileOpen(false)}
			/>

			<div className="flex-1 flex flex-col min-w-0 overflow-hidden">
				<Header
					userRole={userRole}
					onMobileToggle={() => setIsMobileOpen((prev) => !prev)}
				/>

				<main className="flex-1 overflow-y-auto p-4 md:p-6 mb-3 mr-3 bg-brand-surface border-6 border-brand-primary rounded-2xl">
					<div className="mx-auto max-w-7xl h-full">{children}</div>
				</main>
			</div>
		</div>
	);
}
