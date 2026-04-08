"use client";

import { useEffect, useState, createContext, useContext } from "react";
import { useRouter, usePathname } from "next/navigation";
import Cookies from "js-cookie";
import api from "@/lib/api";

interface UserPayload {
	id: string;
	email: string;
	role: string;
	fullName?: string;
	locationId: number;
}

interface AuthContextType {
	isAuthenticated: boolean;
	role: string | null;
	user: UserPayload | null;
	loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
	isAuthenticated: false,
	role: null,
	user: null,
	loading: true,
});

export default function ProtectedRoute({
	children,
}: {
	children: React.ReactNode;
}) {
	const router = useRouter();
	const pathname = usePathname();

	const [isAuthenticated, setIsAuthenticated] = useState(false);
	const [role, setRole] = useState<string | null>(null);
	const [user, setUser] = useState<UserPayload | null>(null);
	const [loading, setLoading] = useState(true);

	// Ověření session proběhne jen jednou při prvním načtení layoutu.
	// Next.js App Router layout se neodmontovává při navigaci, takže opakované
	// volání /auth/profile při každé změně pathname není potřeba.
	useEffect(() => {
		const cachedRole = Cookies.get("role");
		const cachedId = Cookies.get("id");

		if (!cachedRole || !cachedId) {
			router.push("/login");
			setLoading(false);
			return;
		}

		api
			.get<UserPayload>("/auth/profile")
			.then((res) => {
				setUser(res.data);
				setRole(res.data.role);
				setIsAuthenticated(true);
			})
			.catch(() => {
				Cookies.remove("role");
				Cookies.remove("id");
				router.push("/login");
			})
			.finally(() => {
				setLoading(false);
			});
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	// Separátní efekt pro role-based routing při změně stránky (bez API volání)
	useEffect(() => {
		if (loading || !isAuthenticated) return;
		// Sem lze přidat přesměrování podle role pokud je potřeba
	}, [pathname, loading, isAuthenticated, role]);

	if (loading) {
		return (
			<div className="flex h-screen items-center justify-center bg-slate-50 font-bold text-slate-400 uppercase tracking-widest text-xs">
				Ověřování přístupu...
			</div>
		);
	}

	if (!isAuthenticated && pathname !== "/login" && pathname !== "/register") {
		return null;
	}

	return (
		<AuthContext.Provider value={{ isAuthenticated, role, user, loading }}>
			{children}
		</AuthContext.Provider>
	);
}

export const useAuth = () => useContext(AuthContext);
