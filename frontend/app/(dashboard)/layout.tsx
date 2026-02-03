// app/(dashboard)/layout.tsx
import Sidebar from "@/app/components/Sidebar";
import { UserRole } from "@/config/menu";

export default function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	// Pro teď roli definujeme natvrdo, později ji vytáhneme ze session
	const mockUserRole = UserRole.ADMIN;

	return (
		<div className="flex h-screen w-full bg-slate-50 overflow-hidden">
			<Sidebar userRole={mockUserRole} />
			<main className="flex-1 overflow-y-auto pt-16 lg:pt-0">
				{/* pt-16 je tam kvůli místu pro hamburger na mobilu */}
				{children}
			</main>
		</div>
	);
}
