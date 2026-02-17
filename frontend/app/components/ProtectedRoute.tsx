"use client";

import { useEffect, useState, createContext, useContext } from "react";
import { useRouter, usePathname } from "next/navigation";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";

// 1. Definujeme, co všechno je v tokenu (musí tam být ID)
interface UserPayload {
	id: string;
	email: string;
	role: string;
	fullName?: string;
	iat?: number;
	exp?: number;
	locationId: number;
}

// 2. Definujeme, co všechno kontext zpřístupní komponentám
interface AuthContextType {
	isAuthenticated: boolean;
	role: string | null;
	user: UserPayload | null; // <--- TOTO JE KLÍČOVÉ (přidali jsme user)
	loading: boolean;
}

// Výchozí hodnoty
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
	const pathname = usePathname(); // Pro kontrolu, na jaké jsme stránce

	const [isAuthenticated, setIsAuthenticated] = useState(false);
	const [role, setRole] = useState<string | null>(null);
	const [user, setUser] = useState<UserPayload | null>(null); // <--- State pro usera
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const token = Cookies.get("token");

		if (!token) {
			// Pokud nemáme token a nejsme na login/register stránce, přesměrujeme
			if (pathname !== "/login" && pathname !== "/register") {
				router.push("/login");
			}
			setLoading(false);
			return;
		}

		try {
			// 3. Dekódujeme token a získáme ID a další data
			const decoded = jwtDecode<UserPayload>(token);

			setUser(decoded); // Uložíme celého usera (včetně ID)
			setRole(decoded.role);
			setIsAuthenticated(true);
		} catch (error) {
			console.error("Neplatný token", error);
			Cookies.remove("token");
			router.push("/login");
		} finally {
			setLoading(false);
		}
	}, [router, pathname]);

	if (loading) {
		return (
			<div className="flex h-screen items-center justify-center bg-slate-50 font-bold text-slate-400 uppercase tracking-widest text-xs">
				Ověřování přístupu...
			</div>
		);
	}

	// Pokud vyžaduješ přísnější ochranu, můžeš zde vrátit null, pokud !isAuthenticated
	if (!isAuthenticated && pathname !== "/login" && pathname !== "/register") {
		return null;
	}

	// 4. Posíláme 'user' dál do aplikace
	return (
		<AuthContext.Provider value={{ isAuthenticated, role, user, loading }}>
			{children}
		</AuthContext.Provider>
	);
}

// Hook pro snadné použití
export const useAuth = () => useContext(AuthContext);
