"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
	Plus,
	Trash2,
	Clock,
	X,
	Edit2,
	ShieldAlert,
	Loader2,
	Info,
} from "lucide-react";
import ProtectedRoute, { useAuth } from "@/app/components/ProtectedRoute";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

interface ShiftType {
	id: number;
	name: string;
	startTime: string | null;
	endTime: string | null;
	colorCode: string;
}

export default function ShiftTypesPage() {
	const { role } = useAuth();
	const router = useRouter();

	const [types, setTypes] = useState<ShiftType[]>([]);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editingId, setEditingId] = useState<number | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	const [formData, setFormData] = useState({
		name: "",
		startTime: "",
		endTime: "",
		colorCode: "#3b82f6",
	});

	const isAdmin = role === "ADMIN";

	const fetchTypes = useCallback(async () => {
		if (!isAdmin) return;
		try {
			const res = await api.get("/shift-types");
			setTypes(res.data);
		} catch (err) {
			console.error("Chyba při načítání typů směn");
		}
	}, [isAdmin]);

	useEffect(() => {
		if (!isAdmin) {
			setTimeout(() => router.push("/dashboard"), 3000);
		}
		fetchTypes();
	}, [isAdmin, fetchTypes, router]);

	const handleOpenModal = (type?: ShiftType) => {
		if (type) {
			setEditingId(type.id);
			setFormData({
				name: type.name,
				startTime: type.startTime || "",
				endTime: type.endTime || "",
				colorCode: type.colorCode,
			});
		} else {
			setEditingId(null);
			setFormData({
				name: "",
				startTime: "",
				endTime: "",
				colorCode: "#3b82f6",
			});
		}
		setIsModalOpen(true);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError("");

		const payload = {
			...formData,
			startTime: formData.startTime || null,
			endTime: formData.endTime || null,
		};

		try {
			if (editingId) {
				await api.patch(`/shift-types/${editingId}`, payload);
			} else {
				await api.post("/shift-types", payload);
			}
			setIsModalOpen(false);
			fetchTypes();
		} catch (err: any) {
			setError(err.response?.data?.message || "Chyba při ukládání");
		} finally {
			setLoading(false);
		}
	};

	const handleDelete = async (id: number) => {
		if (!confirm("Opravdu smazat tento typ směny?")) return;
		try {
			await api.delete(`/shift-types/${id}`);
			fetchTypes();
		} catch (err) {
			alert("Nelze smazat - typ směny je pravděpodobně již použit v rozvrhu.");
		}
	};

	if (!isAdmin)
		return (
			<div className="flex flex-col items-center justify-center h-screen text-center">
				<ShieldAlert className="text-red-500 w-16 h-16 mb-4" />
				<h1 className="text-2xl font-bold">
					Přístup povolen pouze pro administrátory
				</h1>
			</div>
		);

	return (
		<ProtectedRoute>
			<div className="space-y-6 animate-in fade-in duration-500">
				{/* HLAVIČKA */}
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
					<div>
						<h1 className="text-2xl font-bold text-slate-900 tracking-tight">
							Typy směn
						</h1>
						<p className="text-slate-500 text-sm mt-1">
							Definujte šablony směn pro váš tým.
						</p>
					</div>
					<button
						onClick={() => handleOpenModal()}
						className="flex items-center justify-center gap-2 bg-brand-secondary hover:bg-brand-secondary-hover text-brand-text-on-primary px-5 py-2.5 rounded-xl font-medium shadow-lg transition-all active:scale-95">
						<Plus size={18} /> Nový typ směny
					</button>
				</div>

				{/* TABULKA */}
				<div className="bg-white border border-slate-200 rounded-2xl overflow-x-auto shadow-sm">
					<table className="w-full min-w-[560px] text-left border-collapse">
						<thead>
							<tr className="bg-slate-50/50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
								<th className="px-6 py-4 font-semibold">Název</th>
								<th className="px-6 py-4 font-semibold">Čas</th>
								<th className="px-6 py-4 font-semibold">Barva</th>
								<th className="px-6 py-4 font-semibold text-right">Akce</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-slate-100">
							{types.map((type) => (
								<tr key={type.id} className="hover:bg-slate-50/50 transition-colors">
									<td className="px-6 py-4">
										<span className="font-semibold text-slate-900 text-sm">
											{type.name}
										</span>
									</td>
									<td className="px-6 py-4">
										<div className="flex items-center gap-1.5 text-sm text-slate-600">
											<Clock size={14} className="text-slate-400" />
											{type.startTime
												? `${type.startTime} – ${type.endTime}`
												: <span className="text-slate-400 italic">Flexibilní</span>}
										</div>
									</td>
									<td className="px-6 py-4">
										<div className="flex items-center gap-2">
											<div
												className="w-5 h-5 rounded-full border border-slate-200"
												style={{ backgroundColor: type.colorCode }}
											/>
											<span className="font-mono text-xs text-slate-400 uppercase">
												{type.colorCode}
											</span>
										</div>
									</td>
									<td className="px-6 py-4 text-right">
										<div className="flex items-center justify-end gap-1">
											<button
												onClick={() => handleOpenModal(type)}
												className="p-2 text-slate-400 hover:text-brand-secondary hover:bg-brand-secondary/10 rounded-lg transition-all"
												title="Upravit">
												<Edit2 size={16} />
											</button>
											<button
												onClick={() => handleDelete(type.id)}
												className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
												title="Smazat">
												<Trash2 size={16} />
											</button>
										</div>
									</td>
								</tr>
							))}
							{types.length === 0 && (
								<tr>
									<td
										colSpan={4}
										className="px-6 py-12 text-center text-slate-400 text-sm">
										Zatím nebyly vytvořeny žádné typy směn.
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>

				{/* MODÁL */}
				{isModalOpen && (
					<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
						<div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 relative">
							<button
								onClick={() => setIsModalOpen(false)}
								className="absolute top-6 right-6 text-slate-400 hover:text-slate-600">
								<X size={24} />
							</button>

							<div className="flex items-center gap-3 mb-6">
								<div className="p-3 bg-brand-secondary/10 text-brand-secondary rounded-2xl">
									<Clock size={24} />
								</div>
								<div>
									<h2 className="text-2xl font-bold text-slate-900">
										{editingId ? "Upravit typ směny" : "Nový typ směny"}
									</h2>
									<p className="text-slate-500 text-sm">
										{editingId
											? "Upravte parametry směny."
											: "Zadejte parametry nové směny."}
									</p>
								</div>
							</div>

							{error && (
								<div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 font-medium">
									⚠️ {error}
								</div>
							)}

							<form onSubmit={handleSubmit} className="space-y-4">
								<div>
									<label className="text-xs font-bold uppercase text-slate-500 mb-1 block">
										Název směny
									</label>
									<input
										required
										value={formData.name}
										onChange={(e) =>
											setFormData({ ...formData, name: e.target.value })
										}
										className="w-full p-3 border border-slate-200 rounded-xl font-semibold outline-none focus:border-brand-secondary transition-all"
										placeholder="např. Ranní 8h"
									/>
								</div>

								<div className="grid grid-cols-2 gap-4">
									<div>
										<label className="text-xs font-bold uppercase text-slate-500 mb-1 block">
											Začátek
										</label>
										<input
											type="time"
											value={formData.startTime}
											onChange={(e) =>
												setFormData({ ...formData, startTime: e.target.value })
											}
											className="w-full p-3 border border-slate-200 rounded-xl font-semibold outline-none focus:border-brand-secondary transition-all"
										/>
									</div>
									<div>
										<label className="text-xs font-bold uppercase text-slate-500 mb-1 block">
											Konec
										</label>
										<input
											type="time"
											value={formData.endTime}
											onChange={(e) =>
												setFormData({ ...formData, endTime: e.target.value })
											}
											className="w-full p-3 border border-slate-200 rounded-xl font-semibold outline-none focus:border-brand-secondary transition-all"
										/>
									</div>
								</div>

								<div className="p-3 bg-brand-secondary/10 rounded-xl flex gap-2 text-brand-secondary text-xs">
									<Info size={16} className="shrink-0 mt-0.5" />
									<span>
										Ponechte časy prázdné, pokud jde o flexibilní směnu bez
										pevného začátku.
									</span>
								</div>

								<div>
									<label className="text-xs font-bold uppercase text-slate-500 mb-1 block text-center">
										Barva směny
									</label>
									<div className="flex justify-center items-center gap-4">
										<input
											type="color"
											value={formData.colorCode}
											onChange={(e) =>
												setFormData({ ...formData, colorCode: e.target.value })
											}
											className="w-20 h-20 p-1 bg-white border border-slate-200 rounded-full cursor-pointer overflow-hidden shadow-sm"
										/>
										<div className="font-mono text-sm text-slate-500 uppercase">
											{formData.colorCode}
										</div>
									</div>
								</div>

								<div className="flex gap-3 pt-2">
									<button
										type="button"
										onClick={() => setIsModalOpen(false)}
										className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-colors">
										Zrušit
									</button>
									<button
										type="submit"
										disabled={loading}
										className="flex-1 py-3 bg-brand-secondary text-brand-text-on-primary font-bold rounded-xl shadow-lg hover:bg-brand-secondary-hover disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed transition-all">
										{loading ? "Ukládám..." : "Uložit typ směny"}
									</button>
								</div>
							</form>
						</div>
					</div>
				)}
			</div>
		</ProtectedRoute>
	);
}
