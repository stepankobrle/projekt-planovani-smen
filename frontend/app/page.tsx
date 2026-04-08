import Link from "next/link";
import { ArrowRight, Calendar, Users, Clock, ShieldCheck } from "lucide-react";

export default function LandingPage() {
	return (
		<div className="min-h-screen bg-white text-slate-900">
			{/* NAVIGACE */}
			<nav className="flex items-center justify-between p-6 lg:px-8 max-w-7xl mx-auto">
				<div className="flex items-center gap-2">
					<div className="h-10 w-10 rounded-xl bg-brand-secondary flex items-center justify-center text-brand-text-on-primary font-bold text-xl">
						S
					</div>
					<span className="text-xl font-bold tracking-tight">ShiftMaster</span>
				</div>
				<div className="flex gap-4">
					<Link
						href="/login"
						className="text-sm font-semibold leading-6 py-2 px-4 hover:text-brand-secondary transition-colors">
						Přihlásit se
					</Link>
					<Link
						href="/register"
						className="text-sm font-semibold leading-6 bg-brand-secondary text-brand-text-on-primary py-2 px-4 rounded-lg hover:bg-brand-secondary-hover transition-all shadow-md shadow-brand-secondary/20">
						Registrace
					</Link>
				</div>
			</nav>

			{/* HERO SEKCE */}
			<main>
				<div className="relative isolate px-6 pt-14 lg:px-8">
					<div className="mx-auto max-w-2xl py-24 sm:py-32">
						<div className="text-center">
							<h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-6xl">
								Plánování směn, které dává smysl
							</h1>
							<p className="mt-6 text-lg leading-8 text-slate-600">
								ShiftMaster pomáhá firmám efektivně organizovat pracovní dobu,
								sledovat docházku a komunikovat se zaměstnanci. Vše na jednom
								místě, přehledně a moderně.
							</p>
							<div className="mt-10 flex items-center justify-center gap-x-6">
								<Link
									href="/login"
									className="rounded-xl bg-brand-secondary px-6 py-3.5 text-sm font-semibold text-brand-text-on-primary shadow-sm hover:bg-brand-secondary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-secondary flex items-center gap-2 transition-all">
									Začít používat <ArrowRight size={18} />
								</Link>
								<a
									href="#features"
									className="text-sm font-semibold leading-6 text-slate-900">
									Více informací <span aria-hidden="true">→</span>
								</a>
							</div>
						</div>
					</div>
				</div>

				{/* FEATURES SEKCE */}
				<div id="features" className="py-24 bg-brand-surface">
					<div className="mx-auto max-w-7xl px-6 lg:px-8">
						<div className="mx-auto max-w-2xl text-center">
							<h2 className="text-base font-semibold leading-7 text-brand-secondary">
								Funkce systému
							</h2>
							<p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
								Vše pro správu vašeho týmu
							</p>
						</div>
						<div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
							<dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-4">
								<FeatureCard
									icon={<Calendar className="text-brand-secondary" />}
									title="Chytrý kalendář"
									desc="Intuitivní tvorba směn metodou drag & drop."
								/>
								<FeatureCard
									icon={<Users className="text-brand-secondary" />}
									title="Správa týmu"
									desc="Přehled o rolích, dovednostech a dostupnosti osob."
								/>
								<FeatureCard
									icon={<Clock className="text-brand-secondary" />}
									title="Evidence času"
									desc="Přesné sledování odpracovaných hodin v reálném čase."
								/>
								<FeatureCard
									icon={<ShieldCheck className="text-brand-secondary" />}
									title="Role a práva"
									desc="Zabezpečený přístup na základě firemní hierarchie."
								/>
							</dl>
						</div>
					</div>
				</div>
			</main>

			{/* FOOTER */}
			<footer className="bg-white border-t border-slate-100 py-10">
				<div className="text-center text-sm text-slate-500">
					© {new Date().getFullYear()} ShiftMaster - Bakalářská práce
				</div>
			</footer>
		</div>
	);
}

// Pomocná komponenta pro karty funkcí
function FeatureCard({
	icon,
	title,
	desc,
}: {
	icon: React.ReactNode;
	title: string;
	desc: string;
}) {
	return (
		<div className="flex flex-col items-start bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
			<div className="rounded-lg bg-brand-secondary/10 p-2 mb-4">{icon}</div>
			<dt className="font-semibold text-slate-900">{title}</dt>
			<dd className="mt-2 leading-7 text-slate-600 text-sm">{desc}</dd>
		</div>
	);
}
