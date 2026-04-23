"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import Sidebar from "@/app/components/Sidebar";
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
				{/* Mobilní hamburger — viditelný jen na malých obrazovkách */}
				<div className="lg:hidden flex items-center px-4 h-12 bg-brand-primary shrink-0">
					<button
						onClick={() => setIsMobileOpen(true)}
						className="p-1.5 text-slate-400 hover:text-white transition-colors">
						<Menu size={20} />
					</button>
				</div>

				<main className="flex-1 overflow-y-auto bg-brand-surface">
					<div className="h-full">{children}</div>
				</main>
			</div>
		</div>
	);
}
