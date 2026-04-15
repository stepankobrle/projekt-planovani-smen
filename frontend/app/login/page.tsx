"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";

export default function LoginPage() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);
	const router = useRouter();

	const handleLogin = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		setLoading(true);

		try {
			const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"}/auth/login`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify({ email, password }),
			});

			const data = await response.json();

			if (response.ok) {
				if (data.user && data.user.role && data.user.id) {
					Cookies.set("id", data.user.id, { expires: 1 });
					Cookies.set("role", data.user.role, { expires: 1 });
				}

				const role = data.user?.role;
				if (role === "ADMIN" || role === "MANAGER") {
					router.push("/admin/dashboard");
				} else {
					router.push("/dashboard");
				}
				router.refresh();
			} else {
				setError(data.message || "Neplatné přihlašovací údaje");
			}
		} catch {
			setError("Nepodařilo se připojit k serveru. Zkontroluj, zda běží backend.");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div
			className="flex min-h-screen"
			style={{ background: "var(--brand-primary)" }}
		>
			{/* ── Levý panel (desktop) ── */}
			<div className="login-panel-animate hidden lg:flex lg:w-[52%] relative overflow-hidden flex-col justify-between p-16"
				style={{
					background: "linear-gradient(140deg, #00010d 0%, #0b1f1e 55%, #1a403c 100%)",
					borderRight: "1px solid rgba(191,184,163,0.06)",
				}}
			>
				{/* Dekorativní kruhy */}
				<div className="absolute -top-28 -right-28 w-[420px] h-[420px] rounded-full"
					style={{ border: "1px solid rgba(26,64,60,0.5)" }} />
				<div className="absolute top-12 -right-12 w-[300px] h-[300px] rounded-full"
					style={{ border: "1px solid rgba(191,184,163,0.08)" }} />
				<div className="absolute top-[30%] -right-8 w-[180px] h-[180px] rounded-full"
					style={{ border: "1px solid rgba(245,158,11,0.1)" }} />
				<div className="absolute -bottom-24 -left-24 w-[380px] h-[380px] rounded-full"
					style={{ border: "1px solid rgba(26,64,60,0.4)" }} />
				<div className="absolute bottom-24 left-8 w-[220px] h-[220px] rounded-full"
					style={{ border: "1px solid rgba(191,184,163,0.06)" }} />

				{/* Jemná mřížka */}
				<div className="absolute inset-0 pointer-events-none" style={{
					backgroundImage:
						"repeating-linear-gradient(0deg,rgba(191,184,163,0.03) 0px,rgba(191,184,163,0.03) 1px,transparent 1px,transparent 72px)," +
						"repeating-linear-gradient(90deg,rgba(191,184,163,0.03) 0px,rgba(191,184,163,0.03) 1px,transparent 1px,transparent 72px)",
				}} />

				{/* Logo / Brand */}
				<div className="relative z-10 flex items-center gap-3">
					<div className="w-9 h-9 rounded-lg flex items-center justify-center"
						style={{ background: "var(--brand-secondary)", border: "1px solid rgba(191,184,163,0.15)" }}>
						<svg width="18" height="18" viewBox="0 0 18 18" fill="none">
							<rect x="2" y="2" width="6" height="6" rx="1" fill="#d9d3b8" fillOpacity="0.7" />
							<rect x="10" y="2" width="6" height="6" rx="1" fill="#f59e0b" fillOpacity="0.8" />
							<rect x="2" y="10" width="6" height="6" rx="1" fill="#d9d3b8" fillOpacity="0.4" />
							<rect x="10" y="10" width="6" height="6" rx="1" fill="#d9d3b8" fillOpacity="0.25" />
						</svg>
					</div>
					<span className="text-xs font-bold tracking-[0.22em] uppercase"
						style={{ color: "var(--brand-text-on-primary)", opacity: 0.5 }}>
						ShiftPlan
					</span>
				</div>

				{/* Hlavní text */}
				<div className="relative z-10">
					<h2 className="text-[3.25rem] font-extrabold leading-[1.05] mb-7"
						style={{ color: "var(--brand-text-on-primary)" }}>
						Plánování<br />směn<br />
						<span style={{ color: "var(--brand-warning)" }}>bez chaosu.</span>
					</h2>
					<p className="text-sm leading-relaxed max-w-[260px]"
						style={{ color: "var(--brand-text-on-primary)", opacity: 0.38 }}>
						Automatické generování optimálních rozvrhů pro vaši organizaci.
					</p>

					<div className="mt-10 space-y-4">
						{[
							"Automatické generování rozvrhů",
							"Správa dostupnosti zaměstnanců",
							"Export do PDF a kalendáře",
						].map((feature) => (
							<div key={feature} className="flex items-center gap-3">
								<div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
									style={{ background: "var(--brand-warning)" }} />
								<span className="text-xs tracking-wide"
									style={{ color: "var(--brand-text-on-primary)", opacity: 0.38 }}>
									{feature}
								</span>
							</div>
						))}
					</div>
				</div>

				{/* Footer levého panelu */}
				<p className="relative z-10 text-[10px] tracking-[0.18em] uppercase"
					style={{ color: "var(--brand-text-on-primary)", opacity: 0.18 }}>
					© 2026 ShiftPlan
				</p>
			</div>

			{/* ── Pravý panel — formulář ── */}
			<div className="flex-1 flex items-center justify-center p-8 lg:p-16">
				<div className="w-full max-w-[360px]">

					{/* Hlavička formuláře */}
					<div className="mb-10 login-animate" style={{ "--delay": "60ms" } as React.CSSProperties}>
						<p className="text-[10px] font-bold tracking-[0.28em] uppercase mb-3"
							style={{ color: "var(--brand-warning)" }}>
							Systém správy směn
						</p>
						<h1 className="text-[2.4rem] font-extrabold leading-tight"
							style={{ color: "var(--brand-text-on-primary)" }}>
							Přihlášení
						</h1>
					</div>

					{/* Chybová hláška */}
					{error && (
						<div className="mb-6 px-5 py-4 rounded-xl text-xs font-bold tracking-wider uppercase login-animate"
							style={{
								"--delay": "0ms",
								background: "rgba(220,38,38,0.08)",
								border: "1px solid rgba(220,38,38,0.25)",
								color: "#f87171",
							} as React.CSSProperties}>
							{error}
						</div>
					)}

					{/* Formulář */}
					<form onSubmit={handleLogin} className="space-y-5">

						{/* E-mail */}
						<div className="login-animate" style={{ "--delay": "140ms" } as React.CSSProperties}>
							<label className="block text-[10px] font-bold tracking-[0.22em] uppercase mb-2"
								style={{ color: "var(--brand-text-on-primary)", opacity: 0.35 }}>
								E-mailová adresa
							</label>
							<input
								type="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								className="login-input w-full px-5 py-4 rounded-xl text-sm font-medium outline-none transition-all"
								style={{
									background: "rgba(255,255,255,0.04)",
									border: "1px solid rgba(191,184,163,0.14)",
									color: "var(--brand-text-on-primary)",
								}}
								placeholder="vas@email.cz"
								required
								disabled={loading}
							/>
						</div>

						{/* Heslo */}
						<div className="login-animate" style={{ "--delay": "210ms" } as React.CSSProperties}>
							<label className="block text-[10px] font-bold tracking-[0.22em] uppercase mb-2"
								style={{ color: "var(--brand-text-on-primary)", opacity: 0.35 }}>
								Heslo
							</label>
							<input
								type="password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								className="login-input w-full px-5 py-4 rounded-xl text-sm font-medium outline-none transition-all"
								style={{
									background: "rgba(255,255,255,0.04)",
									border: "1px solid rgba(191,184,163,0.14)",
									color: "var(--brand-text-on-primary)",
								}}
								placeholder="••••••••"
								required
								disabled={loading}
							/>
						</div>

						{/* Tlačítko */}
						<div className="pt-2 login-animate" style={{ "--delay": "290ms" } as React.CSSProperties}>
							<button
								type="submit"
								disabled={loading}
								className="login-btn w-full py-4 rounded-xl text-sm font-bold tracking-[0.18em] uppercase transition-all"
								style={{
									background: loading ? "rgba(26,64,60,0.35)" : "var(--brand-secondary)",
									color: loading
										? "rgba(217,211,184,0.35)"
										: "var(--brand-text-on-primary)",
									cursor: loading ? "not-allowed" : "pointer",
									border: "1px solid rgba(191,184,163,0.1)",
								}}
							>
								{loading ? "Ověřování..." : "Přihlásit se →"}
							</button>
						</div>
					</form>

					{/* Patička */}
					<p className="mt-14 text-center text-[10px] tracking-wider login-animate"
						style={{
							"--delay": "380ms",
							color: "var(--brand-text-on-primary)",
							opacity: 0.18,
						} as React.CSSProperties}>
						Správa pracovních směn pro vaši organizaci
					</p>
				</div>
			</div>
		</div>
	);
}
