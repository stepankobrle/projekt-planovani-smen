"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
	Lock,
	Eye,
	EyeOff,
	CheckCircle2,
	AlertCircle,
	Loader2,
	ArrowRight,
} from "lucide-react";

// Oddělená komponenta formuláře (potřebuje useSearchParams)
function SetPasswordForm() {
	const searchParams = useSearchParams();
	const router = useRouter();
	const token = searchParams.get("token");

	const [formData, setFormData] = useState({
		password: "",
		confirmPassword: "",
	});
	const [showPassword, setShowPassword] = useState(false);
	const [status, setStatus] = useState<{
		type: "success" | "error" | "";
		msg: string;
	}>({ type: "", msg: "" });
	const [loading, setLoading] = useState(false);

	const handleSetPassword = async (e: React.FormEvent) => {
		e.preventDefault();
		setStatus({ type: "", msg: "" });

		if (formData.password !== formData.confirmPassword) {
			setStatus({ type: "error", msg: "Hesla se neshodují!" });
			return;
		}

		if (formData.password.length < 6) {
			setStatus({ type: "error", msg: "Heslo musí mít alespoň 6 znaků." });
			return;
		}

		setLoading(true);

		try {
			const res = await fetch("http://localhost:3001/auth/activate", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ token, password: formData.password }),
			});

			const data = await res.json();

			if (res.ok) {
				setStatus({
					type: "success",
					msg: "Heslo úspěšně nastaveno!",
				});
				// Počkáme chvilku, ať si uživatel přečte success message
				setTimeout(() => router.push("/login"), 2000);
			} else {
				setStatus({ type: "error", msg: data.message || "Nastala chyba." });
				setLoading(false);
			}
		} catch (err) {
			setStatus({ type: "error", msg: "Nepodařilo se spojit se serverem." });
			setLoading(false);
		}
	};

	// Pokud chybí token, zobrazíme chybový stav
	if (!token) {
		return (
			<div className="text-center space-y-4">
				<div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
					<AlertCircle className="w-8 h-8 text-red-600" />
				</div>
				<h2 className="text-xl font-bold text-slate-800">Neplatný odkaz</h2>
				<p className="text-slate-500 text-sm">
					V URL chybí identifikační token. Zkuste kliknout na odkaz v e-mailu
					znovu.
				</p>
			</div>
		);
	}

	// Pokud se povedlo, zobrazíme jen úspěch (čistší design)
	if (status.type === "success") {
		return (
			<div className="text-center space-y-6 animate-in fade-in zoom-in duration-300">
				<div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
					<CheckCircle2 className="w-10 h-10 text-green-600" />
				</div>
				<div>
					<h2 className="text-2xl font-bold text-slate-800">Hotovo!</h2>
					<p className="text-slate-500 mt-2">
						Váš účet byl aktivován a heslo nastaveno.
					</p>
				</div>
				<div className="flex justify-center text-sm text-indigo-600 font-medium items-center gap-2">
					<Loader2 className="animate-spin w-4 h-4" />
					Přesměrování na přihlášení...
				</div>
			</div>
		);
	}

	return (
		<form onSubmit={handleSetPassword} className="space-y-5">
			<div className="text-center mb-8">
				<h1 className="text-2xl font-black text-slate-800 tracking-tight">
					Vítejte v týmu! 👋
				</h1>
				<p className="text-slate-500 text-sm mt-2">
					Pro dokončení aktivace si prosím nastavte své heslo.
				</p>
			</div>

			{status.type === "error" && (
				<div className="p-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl flex items-center gap-3">
					<AlertCircle size={18} />
					{status.msg}
				</div>
			)}

			{/* HESLO INPUT */}
			<div className="space-y-1.5">
				<label className="text-xs font-bold uppercase text-slate-500 ml-1">
					Nové heslo
				</label>
				<div className="relative">
					<Lock
						className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
						size={18}
					/>
					<input
						type={showPassword ? "text" : "password"}
						placeholder="••••••••"
						className="w-full pl-10 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-800"
						value={formData.password}
						onChange={(e) =>
							setFormData({ ...formData, password: e.target.value })
						}
						required
					/>
					<button
						type="button"
						onClick={() => setShowPassword(!showPassword)}
						className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
						{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
					</button>
				</div>
			</div>

			{/* POTVRZENÍ HESLA INPUT */}
			<div className="space-y-1.5">
				<label className="text-xs font-bold uppercase text-slate-500 ml-1">
					Potvrzení hesla
				</label>
				<div className="relative">
					<Lock
						className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
						size={18}
					/>
					<input
						type={showPassword ? "text" : "password"}
						placeholder="••••••••"
						className="w-full pl-10 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-800"
						value={formData.confirmPassword}
						onChange={(e) =>
							setFormData({ ...formData, confirmPassword: e.target.value })
						}
						required
					/>
				</div>
			</div>

			<button
				type="submit"
				disabled={loading}
				className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-2">
				{loading ? (
					<>
						<Loader2 className="animate-spin" size={20} />
						Aktivuji účet...
					</>
				) : (
					<>
						Aktivovat a přihlásit
						<ArrowRight size={18} />
					</>
				)}
			</button>
		</form>
	);
}

// Hlavní stránka (Musí obalit komponentu s useSearchParams do Suspense)
export default function SetPasswordPage() {
	return (
		<div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50 flex items-center justify-center p-4">
			<div className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl p-8 md:p-10 border border-white/50">
				<Suspense
					fallback={
						<div className="flex flex-col items-center justify-center py-10 space-y-4">
							<Loader2 className="animate-spin text-indigo-600" size={40} />
							<p className="text-slate-400 text-sm font-medium">
								Ověřuji bezpečnostní token...
							</p>
						</div>
					}>
					<SetPasswordForm />
				</Suspense>
			</div>
		</div>
	);
}
