"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
	Briefcase,
	Plus,
	Trash2,
	Edit2,
	X,
	AlertTriangle,
	Loader2,
	ShieldAlert,
} from "lucide-react";
import ProtectedRoute, { useAuth } from "@/app/components/ProtectedRoute";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

interface JobPosition {
	id: number;
	name: string;
	isManagerial: boolean;
}

export default function JobPositionsPage() {
	const { role, loading: authLoading } = useAuth();
	const router = useRouter();

	// Datové stavy
	const [positions, setPositions] = useState<JobPosition[]>([]);
	const [loading, setLoading] = useState(false);

	// Modál pro Add/Edit
	const [isFormModalOpen, setIsFormModalOpen] = useState(false);
	const [editingPosition, setEditingPosition] = useState<JobPosition | null>(
		null,
	);
	const [formData, setFormData] = useState({ name: "", isManagerial: false });

	// Modál pro Mazání
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
	const [positionToDelete, setPositionToDelete] = useState<JobPosition | null>(
		null,
	);

	const isAdmin = role === "ADMIN";

	// --- NAČÍTÁNÍ DAT ---
	const fetchPositions = useCallback(async () => {
		if (!isAdmin) return;
		setLoading(true);
		try {
			const res = await api.get("/job-positions");
			setPositions(res.data);
		} catch (err) {
			console.error("Chyba při načítání pozic");
		} finally {
			setLoading(false);
		}
	}, [isAdmin]);

	useEffect(() => {
		if (!authLoading && !isAdmin) {
			setTimeout(() => router.push("/dashboard"), 3000);
		}
		fetchPositions();
	}, [authLoading, isAdmin, fetchPositions, router]);

	// --- HANDLERY PRO FORMULÁŘ ---
	const openAddModal = () => {
		setEditingPosition(null);
		setFormData({ name: "", isManagerial: false });
		setIsFormModalOpen(true);
	};

	const openEditModal = (pos: JobPosition) => {
		setEditingPosition(pos);
		setFormData({ name: pos.name, isManagerial: pos.isManagerial });
		setIsFormModalOpen(true);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			if (editingPosition) {
				await api.patch(`/job-positions/${editingPosition.id}`, formData);
			} else {
				await api.post("/job-positions", formData);
			}
			setIsFormModalOpen(false);
			fetchPositions();
		} catch (err) {
			alert("Chyba při ukládání pozice.");
		}
	};

	// --- HANDLERY PRO MAZÁNÍ ---
	const openDeleteModal = (pos: JobPosition) => {
		setPositionToDelete(pos);
		setIsDeleteModalOpen(true);
	};

	const confirmDelete = async () => {
		if (!positionToDelete) return;
		try {
			await api.delete(`/job-positions/${positionToDelete.id}`);
			setIsDeleteModalOpen(false);
			fetchPositions();
		} catch (err) {
			alert("Nelze smazat. Pozice je pravděpodobně přiřazena zaměstnancům.");
		}
	};

	// --- RENDER LOGIKA ---
	if (authLoading)
		return (
			<div className="flex h-screen items-center justify-center">
				<Loader2 className="animate-spin text-brand-secondary" size={40} />
			</div>
		);

	if (!isAdmin)
		return (
			<div className="flex flex-col items-center justify-center h-[70vh] text-center">
				<ShieldAlert className="text-red-500 w-16 h-16 mb-4" />
				<h1 className="text-2xl font-bold italic text-slate-800">
					Pouze pro administrátory
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
							Pracovní pozice
						</h1>
						<p className="text-slate-500 text-sm mt-1">
							Definujte role v rámci vaší organizace.
						</p>
					</div>
					<button
						onClick={openAddModal}
						className="flex items-center justify-center gap-2 bg-brand-secondary hover:bg-brand-secondary-hover text-brand-text-on-primary px-5 py-2.5 rounded-xl font-medium shadow-lg transition-all active:scale-95">
						<Plus size={18} /> Přidat pozici
					</button>
				</div>

				{/* TABULKA */}
				<div className="bg-white border border-slate-200 rounded-2xl overflow-x-auto shadow-sm">
					<table className="w-full min-w-[480px] text-left border-collapse">
						<thead>
							<tr className="bg-slate-50/50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
								<th className="px-6 py-4 font-semibold">Pozice</th>
								<th className="px-6 py-4 font-semibold">Typ</th>
								<th className="px-6 py-4 font-semibold text-right">Akce</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-slate-100">
							{positions.map((pos) => (
								<tr
									key={pos.id}
									className="hover:bg-slate-50/50 transition-colors">
									<td className="px-6 py-4">
										<div className="flex items-center gap-3">
											<div className="h-10 w-10 rounded-full bg-brand-secondary/10 text-brand-secondary flex items-center justify-center shrink-0">
												<Briefcase size={18} />
											</div>
											<span className="font-semibold text-slate-900 text-sm">
												{pos.name}
											</span>
										</div>
									</td>
									<td className="px-6 py-4">
										<span
											className={`text-xs font-bold px-2.5 py-1 rounded-full ${
												pos.isManagerial
													? "bg-purple-100 text-purple-700"
													: "bg-slate-100 text-slate-600"
											}`}>
											{pos.isManagerial ? "Manažerská" : "Standardní"}
										</span>
									</td>
									<td className="px-6 py-4 text-right">
										<div className="flex items-center justify-end gap-1">
											<button
												onClick={() => openEditModal(pos)}
												className="p-2 text-slate-400 hover:text-brand-secondary hover:bg-brand-secondary/10 rounded-lg transition-all"
												title="Upravit">
												<Edit2 size={16} />
											</button>
											<button
												onClick={() => openDeleteModal(pos)}
												className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
												title="Smazat">
												<Trash2 size={16} />
											</button>
										</div>
									</td>
								</tr>
							))}
							{positions.length === 0 && !loading && (
								<tr>
									<td
										colSpan={3}
										className="px-6 py-12 text-center text-slate-400 text-sm">
										Zatím nebyly vytvořeny žádné pozice.
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>

				{/* MODÁL PRO PŘIDÁNÍ / EDITACI */}
				{isFormModalOpen && (
					<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
						<div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 relative">
							<button
								onClick={() => setIsFormModalOpen(false)}
								className="absolute top-6 right-6 text-slate-400 hover:text-slate-600">
								<X size={24} />
							</button>
							<div className="flex items-center gap-3 mb-6">
								<div className="p-3 bg-brand-secondary/10 text-brand-secondary rounded-2xl">
									<Briefcase size={24} />
								</div>
								<div>
									<h2 className="text-2xl font-bold text-slate-900">
										{editingPosition ? "Upravit pozici" : "Nová pozice"}
									</h2>
									<p className="text-slate-500 text-sm">
										{editingPosition
											? "Upravte údaje pracovní pozice."
											: "Zadejte název nové pracovní pozice."}
									</p>
								</div>
							</div>

							<form onSubmit={handleSubmit} className="space-y-4">
								<div>
									<label className="text-xs font-bold uppercase text-slate-500 mb-1 block">
										Název pozice
									</label>
									<input
										required
										value={formData.name}
										onChange={(e) =>
											setFormData({ ...formData, name: e.target.value })
										}
										className="w-full p-3 border border-slate-200 rounded-xl font-semibold outline-none focus:border-brand-secondary transition-all"
										placeholder="např. Hlavní kuchař"
									/>
								</div>

								<label className="flex items-center justify-between p-4 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
									<div>
										<div className="font-semibold text-slate-900 text-sm">
											Manažerská práva
										</div>
										<div className="text-xs text-slate-400 mt-0.5">
											Může tato pozice schvalovat směny?
										</div>
									</div>
									<input
										type="checkbox"
										checked={formData.isManagerial}
										onChange={(e) =>
											setFormData({
												...formData,
												isManagerial: e.target.checked,
											})
										}
										className="w-5 h-5 rounded border-slate-300 text-brand-secondary focus:ring-brand-secondary"
									/>
								</label>

								<div className="flex gap-3 pt-2">
									<button
										type="button"
										onClick={() => setIsFormModalOpen(false)}
										className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-colors">
										Zrušit
									</button>
									<button
										type="submit"
										className="flex-1 py-3 bg-brand-secondary text-brand-text-on-primary font-bold rounded-xl shadow-lg hover:bg-brand-secondary-hover transition-all">
										{editingPosition ? "Uložit změny" : "Vytvořit pozici"}
									</button>
								</div>
							</form>
						</div>
					</div>
				)}

				{/* MODÁL PRO POTVRZENÍ SMAZÁNÍ */}
				{isDeleteModalOpen && (
					<div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in zoom-in duration-200">
						<div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 text-center">
							<div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
								<AlertTriangle className="text-red-600" size={32} />
							</div>
							<h2 className="text-xl font-bold text-slate-900 mb-2">
								Opravdu smazat?
							</h2>
							<p className="text-slate-500 text-sm mb-8">
								Pozice{" "}
								<span className="text-slate-900 font-bold">
									{positionToDelete?.name}
								</span>{" "}
								bude trvale odstraněna. Tuto akci nelze vzít zpět.
							</p>
							<div className="flex gap-3">
								<button
									onClick={() => setIsDeleteModalOpen(false)}
									className="flex-1 py-3 text-slate-500 hover:bg-slate-50 rounded-xl transition-colors font-bold">
									Zrušit
								</button>
								<button
									onClick={confirmDelete}
									className="flex-1 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 shadow-lg shadow-red-200 transition-all font-bold">
									Smazat
								</button>
							</div>
						</div>
					</div>
				)}
			</div>
		</ProtectedRoute>
	);
}
