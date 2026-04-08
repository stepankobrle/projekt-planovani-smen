"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/components/ProtectedRoute";
import { UserRole } from "@/config/menu";

export default function AdminLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const { role, loading } = useAuth();
	const router = useRouter();

	useEffect(() => {
		if (
			!loading &&
			role &&
			role !== UserRole.ADMIN &&
			role !== UserRole.MANAGER
		) {
			router.replace("/schedule");
		}
	}, [role, loading, router]);

	if (loading) return null;
	if (role && role !== UserRole.ADMIN && role !== UserRole.MANAGER) return null;

	return <>{children}</>;
}
