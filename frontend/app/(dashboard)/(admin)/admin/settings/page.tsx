"use client";

import React, { useState, useEffect } from "react";
import {
	Save,
	Settings,
	Calendar,
	Clock,
	Info,
	ShieldAlert,
	Loader2,
} from "lucide-react";
import ProtectedRoute, { useAuth } from "@/app/components/ProtectedRoute";
import api from "@/lib/api";

export default function SettingsPage() {
	const { role } = useAuth();
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [settings, setSettings] = useState({
		workOnWeekends: false,
		workOnHolidays: false,
		minRestBetweenShifts: 11,
	});

	const isAdmin = role === "ADMIN";

	useEffect(() => {
		const fetchSettings = async () => {
			if (!isAdmin) return;
			setLoading(true);
			try {
				const res = await api.get("/organization-settings");
				setSettings(res.data);
			} catch (err) {
				console.error("Chyba při načítání nastavení");
			} finally {
				setLoading(false);
			}
		};
		fetchSettings();
	}, [isAdmin]);

	const handleSave = async () => {
		setSaving(true);
		try {
			await api.patch("/organization-settings", settings);
			alert("Nastavení bylo uloženo.");
		} catch (err) {
			alert("Chyba při ukládání nastavení.");
		} finally {
			setSaving(false);
		}
	};

	if (loading)
		return (
			<div className="flex h-screen items-center justify-center">
				<Loader2 className="animate-spin text-brand-secondary" size={40} />
			</div>
		);

	if (!isAdmin)
		return (
			<div className="flex flex-col items-center justify-center h-[60vh] text-center">
				<ShieldAlert className="text-red-500 w-16 h-16 mb-4" />
				<h1 className="text-2xl font-bold">Přístup pouze pro administrátory</h1>
			</div>
		);

	return (
		<ProtectedRoute>
			<div className="max-w-3xl mx-auto p-6 space-y-8">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-3xl font-black text-slate-900 tracking-tight">
							Nastavení systému
						</h1>
						<p className="text-slate-500 font-medium">
							Globální pravidla pro plánování směn a legislativu.
						</p>
					</div>
					<button
						onClick={handleSave}
						disabled={saving}
						className="flex items-center gap-2 bg-brand-secondary hover:bg-brand-secondary-hover text-brand-text-on-primary px-6 py-3 rounded-2xl font-bold shadow-lg shadow-brand-secondary/20 transition-all active:scale-95 disabled:bg-slate-300">
						{saving ? (
							<Loader2 className="animate-spin" size={20} />
						) : (
							<Save size={20} />
						)}
						{saving ? "Ukládám..." : "ULOŽIT ZMĚNY"}
					</button>
				</div>

				<div className="grid gap-6">
					{/* Sekce: Provozní dny */}
					<div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100">
						<div className="flex items-center gap-3 mb-6">
							<div className="p-3 bg-brand-secondary/10 text-brand-secondary rounded-xl">
								<Calendar size={24} />
							</div>
							<h2 className="text-xl font-bold text-slate-800">Provozní dny</h2>
						</div>

						<div className="space-y-6">
							<label className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl cursor-pointer hover:bg-slate-100 transition-colors">
								<div>
									<div className="font-bold text-slate-900">
										Práce o víkendech
									</div>
									<div className="text-sm text-slate-500 font-medium">
										Povolit plánování směn na sobotu a neděli.
									</div>
								</div>
								<input
									type="checkbox"
									checked={settings.workOnWeekends}
									onChange={(e) =>
										setSettings({
											...settings,
											workOnWeekends: e.target.checked,
										})
									}
									className="w-6 h-6 rounded-lg border-slate-300 text-brand-secondary focus:ring-brand-secondary"
								/>
							</label>

							<label className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl cursor-pointer hover:bg-slate-100 transition-colors">
								<div>
									<div className="font-bold text-slate-900">
										Práce o svátcích
									</div>
									<div className="text-sm text-slate-500 font-medium">
										Povolit plánování směn na dny státních svátků.
									</div>
								</div>
								<input
									type="checkbox"
									checked={settings.workOnHolidays}
									onChange={(e) =>
										setSettings({
											...settings,
											workOnHolidays: e.target.checked,
										})
									}
									className="w-6 h-6 rounded-lg border-slate-300 text-brand-secondary focus:ring-brand-secondary"
								/>
							</label>
						</div>
					</div>

					{/* Sekce: Legislativa */}
					<div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100">
						<div className="flex items-center gap-3 mb-6">
							<div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
								<Clock size={24} />
							</div>
							<h2 className="text-xl font-bold text-slate-800">
								Pracovní legislativa
							</h2>
						</div>

						<div className="space-y-4">
							<div>
								<label className="text-[10px] font-black uppercase text-slate-400 mb-2 ml-1 block tracking-widest">
									Minimální odpočinek mezi směnami (hodiny)
								</label>
								<div className="flex items-center gap-4">
									<input
										type="number"
										min="0"
										max="24"
										value={settings.minRestBetweenShifts}
										onChange={(e) =>
											setSettings({
												...settings,
												minRestBetweenShifts: Number(e.target.value),
											})
										}
										className="w-32 p-4 bg-slate-50 rounded-2xl font-bold text-xl text-brand-secondary outline-none focus:ring-4 focus:ring-brand-secondary/5 transition-all"
									/>
									<div className="text-slate-400 font-medium italic text-sm">
										V ČR je standardem 11 hodin.
									</div>
								</div>
							</div>

							<div className="flex gap-3 p-4 bg-brand-secondary/10 rounded-2xl text-brand-secondary text-sm">
								<Info size={20} className="shrink-0" />
								<p className="font-medium">
									Toto nastavení ovlivní validaci při ručním i automatickém
									plánování. Systém vás upozorní, pokud pravidlo porušíte.
								</p>
							</div>
						</div>
					</div>
				</div>
			</div>
		</ProtectedRoute>
	);
}
