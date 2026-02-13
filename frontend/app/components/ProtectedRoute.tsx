"use client";

import { useEffect, useState, createContext, useContext } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";

// Vytvoříme kontext, aby Sidebar v layoutu věděl, jakou roli zobrazit
const AuthContext = createContext<{ role: string | null }>({ role: null });

export default function ProtectedRoute({
	children,
}: {
	children: React.ReactNode;
}) {
	const router = useRouter();
	const [isAuthorized, setIsAuthorized] = useState(false);
	const [role, setRole] = useState<string | null>(null);

	useEffect(() => {
		const token = Cookies.get("token");
		const userRole = Cookies.get("role");

		if (!token) {
			router.push("/login");
		} else {
			setRole(userRole || "EMPLOYEE");
			setIsAuthorized(true);
		}
	}, [router]);

	if (!isAuthorized) {
		return (
			<div className="flex h-screen items-center justify-center bg-slate-50 font-bold text-slate-400 uppercase tracking-widest text-xs">
				Ověřování přístupu...
			</div>
		);
	}

	return (
		<AuthContext.Provider value={{ role }}>{children}</AuthContext.Provider>
	);
}

// Hook pro snadné použití role v jiných komponentách
export const useAuth = () => useContext(AuthContext);
