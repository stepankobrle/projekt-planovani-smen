// app/(dashboard)/layout.tsx
import Sidebar from "@/app/components/Sidebar";
import Header from "@/app/components/Header";
import { UserRole } from "@/config/menu";

export default function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	// Pro vývoj stále mockujeme roli
	const userRole = UserRole.ADMIN;

	return (
		<div className="flex h-screen w-full bg-slate-50 overflow-hidden">
			{/* SIDEBAR - fixní šířka (nebo skládací) */}
			<Sidebar userRole={userRole} />

			{/* HLAVNÍ ČÁST - Header + Obsah */}
			<div className="flex-1 flex flex-col min-w-0 overflow-hidden">
				{/* HORNÍ MENU */}
				<Header userRole={userRole} />

				{/* SAMOTNÝ OBSAH STRÁNKY */}
				<main className="flex-1 overflow-y-auto p-4 md:p-8">
					<div className="mx-auto max-w-7xl">{children}</div>
				</main>
			</div>
		</div>
	);
}
