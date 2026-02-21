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
				<Loader2 className="animate-spin text-blue-600" size={40} />
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
			<div className="max-w-4xl mx-auto p-6 space-y-8">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-3xl font-black text-slate-900 tracking-tight italic">
							Pracovní pozice
						</h1>
						<p className="text-slate-500 font-medium font-bold italic">
							Definujte role v rámci vaší organizace.
						</p>
					</div>
					<button
						onClick={openAddModal}
						className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-blue-200 transition-all active:scale-95">
						<Plus size={20} /> PŘIDAT POZICI
					</button>
				</div>

				{/* SEZNAM POZIC */}
				<div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden font-bold italic">
					<div className="divide-y divide-slate-100">
						{positions.length === 0 && !loading && (
							<div className="p-12 text-center text-slate-400">
								Zatím nebyly vytvořeny žádné pozice.
							</div>
						)}
						{positions.map((pos) => (
							<div
								key={pos.id}
								className="flex items-center justify-between p-6 hover:bg-slate-50 transition-colors">
								<div className="flex items-center gap-4">
									<div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
										<Briefcase size={24} />
									</div>
									<div>
										<div className="text-lg font-bold text-slate-900">
											{pos.name}
										</div>
										<div
											className={`text-xs font-black uppercase ${pos.isManagerial ? "text-purple-600" : "text-slate-400"}`}>
											{pos.isManagerial
												? "Manažerská pozice"
												: "Standardní pozice"}
										</div>
									</div>
								</div>
								<div className="flex items-center gap-2">
									<button
										onClick={() => openEditModal(pos)}
										className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
										<Edit2 size={20} />
									</button>
									<button
										onClick={() => openDeleteModal(pos)}
										className="p-3 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">
										<Trash2 size={20} />
									</button>
								</div>
							</div>
						))}
					</div>
				</div>

				{/* MODÁL PRO PŘIDÁNÍ / EDITACI */}
				{isFormModalOpen && (
					<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
						<div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 relative font-bold italic">
							<button
								onClick={() => setIsFormModalOpen(false)}
								className="absolute top-6 right-6 text-slate-400 hover:text-slate-600">
								<X size={24} />
							</button>
							<h2 className="text-2xl font-black text-slate-900 mb-6">
								{editingPosition ? "Upravit pozici" : "Nová pozice"}
							</h2>

							<form onSubmit={handleSubmit} className="space-y-6">
								<div>
									<label className="text-[10px] font-black uppercase text-slate-400 mb-2 ml-1 block tracking-widest">
										Název pozice
									</label>
									<input
										required
										value={formData.name}
										onChange={(e) =>
											setFormData({ ...formData, name: e.target.value })
										}
										className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-blue-600/5 border border-transparent focus:border-blue-600/20 transition-all"
										placeholder="např. Hlavní kuchař"
									/>
								</div>

								<label className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl cursor-pointer hover:bg-slate-100 transition-colors">
									<div>
										<div className="font-bold text-slate-900 uppercase text-xs">
											Manažerská práva
										</div>
										<div className="text-[10px] text-slate-400 font-bold uppercase italic">
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
										className="w-6 h-6 rounded-lg border-slate-300 text-blue-600 focus:ring-blue-500"
									/>
								</label>

								<button
									type="submit"
									className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl hover:bg-blue-700 transition-all">
									{editingPosition ? "ULOŽIT ZMĚNY" : "VYTVOŘIT POZICI"}
								</button>
							</form>
						</div>
					</div>
				)}

				{/* MODÁL PRO POTVRZENÍ SMAZÁNÍ */}
				{isDeleteModalOpen && (
					<div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in zoom-in duration-200">
						<div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 text-center font-bold italic">
							<div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
								<AlertTriangle className="text-red-600" size={32} />
							</div>
							<h2 className="text-xl font-black text-slate-900 mb-2 italic">
								Opravdu smazat?
							</h2>
							<p className="text-slate-500 text-sm mb-8 italic">
								Pozice{" "}
								<span className="text-slate-900 font-black italic underline">
									{positionToDelete?.name}
								</span>{" "}
								bude trvale odstraněna. Tuto akci nelze vzít zpět.
							</p>
							<div className="flex gap-3 font-bold italic">
								<button
									onClick={() => setIsDeleteModalOpen(false)}
									className="flex-1 py-3 text-slate-500 hover:bg-slate-50 rounded-xl transition-colors font-bold italic">
									Zrušit
								</button>
								<button
									onClick={confirmDelete}
									className="flex-1 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 shadow-lg shadow-red-200 transition-all font-bold italic">
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
