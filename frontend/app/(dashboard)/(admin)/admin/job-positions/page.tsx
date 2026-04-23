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
import {
	PageContainer,
	HeroHeader,
	OverlapPanel,
	TableCard,
} from "@/app/components/AdminLayout";

interface JobPosition {
	id: number;
	name: string;
	isManagerial: boolean;
}

export default function JobPositionsPage() {
	const { role, loading: authLoading } = useAuth();
	const router = useRouter();

	const [positions, setPositions] = useState<JobPosition[]>([]);
	const [loading, setLoading] = useState(false);

	const [isFormModalOpen, setIsFormModalOpen] = useState(false);
	const [editingPosition, setEditingPosition] = useState<JobPosition | null>(null);
	const [formData, setFormData] = useState({ name: "", isManagerial: false });

	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
	const [positionToDelete, setPositionToDelete] = useState<JobPosition | null>(null);

	const isAdmin = role === "ADMIN";

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
			setTimeout(() => router.push("/admin/dashboard"), 3000);
		}
		fetchPositions();
	}, [authLoading, isAdmin, fetchPositions, router]);

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

	if (authLoading) return (
		<div className="flex min-h-screen items-center justify-center bg-[#F0F7F4]">
			<Loader2 className="animate-spin text-[#68B2A0]" size={40} />
		</div>
	);

	if (!isAdmin) return (
		<div className="flex flex-col items-center justify-center min-h-full px-4 text-center bg-[#F0F7F4]">
			<div className="bg-red-100 p-6 rounded-full mb-6">
				<ShieldAlert className="text-red-600 w-16 h-16" />
			</div>
			<h1 className="text-3xl font-bold text-slate-900 mb-2">Přístup odepřen</h1>
		</div>
	);

	return (
		<ProtectedRoute>
			<PageContainer>
				<HeroHeader
					subtitle="Role a nastavení"
					title="Pracovní pozice"
					action={
						<button
							onClick={openAddModal}
							className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-black/10 active:scale-95"
							style={{ background: "#F59E0B", color: "#fff" }}>
							<Plus size={18} /> Přidat pozici
						</button>
					}
				/>

				<TableCard>
					<thead style={{ position: "sticky", top: 0, zIndex: 5, background: "rgba(255,255,255,0.95)", backdropFilter: "blur(10px)" }}>
						<tr style={{ borderBottom: "2px solid #DDF0E8" }}>
							<th className="px-4 py-3 text-[10px] font-bold tracking-[0.1em] uppercase" style={{ color: "#9ABABA" }}>Pozice</th>
							<th className="px-4 py-3 text-[10px] font-bold tracking-[0.1em] uppercase" style={{ color: "#9ABABA" }}>Typ</th>
							<th className="px-4 py-3 text-[10px] font-bold tracking-[0.1em] uppercase text-right" style={{ color: "#9ABABA" }}>Akce</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-[#DDF0E8]">
						{positions.map((pos, index) => (
							<tr key={pos.id} className="a-fade transition-colors hover:bg-[#E6F2EE]" style={{ "--d": `${index * 30}ms` } as React.CSSProperties}>
								<td className="px-4 py-4">
									<div className="flex items-center gap-3">
										<div className="h-9 w-9 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(104,178,160,.15)", color: "#2C6975" }}>
											<Briefcase size={16} />
										</div>
										<span className="font-bold text-[13px]" style={{ color: "#0F2E35" }}>{pos.name}</span>
									</div>
								</td>
								<td className="px-4 py-4">
									<span className="text-[10px] font-bold px-2 py-1 rounded" style={pos.isManagerial ? { background: "rgba(200,90,48,.1)", color: "#C85A30", border: "1px solid rgba(200,90,48,.2)" } : { background: "#F0F7F4", color: "#5A8A8A", border: "1px solid #DDF0E8" }}>
										{pos.isManagerial ? "Manažerská" : "Standardní"}
									</span>
								</td>
								<td className="px-4 py-4 text-right">
									<div className="flex justify-end gap-2">
										<button onClick={() => openEditModal(pos)} className="btn-no text-[#68B2A0] p-1.5"><Edit2 size={16} /></button>
										<button onClick={() => openDeleteModal(pos)} className="btn-no text-[#C85A30] p-1.5"><Trash2 size={16} /></button>
									</div>
								</td>
							</tr>
						))}
						{positions.length === 0 && !loading && (
							<tr><td colSpan={3} className="px-4 py-16 text-center text-sm text-[#9ABABA]">Zatím nebyly vytvořeny žádné pozice.</td></tr>
						)}
					</tbody>
				</TableCard>

				{/* MODÁL PRO PŘIDÁNÍ / EDITACI */}
				{isFormModalOpen && (
					<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F2E35]/40 backdrop-blur-sm animate-in fade-in duration-200">
						<div className="bg-white rounded-[24px] shadow-2xl w-full max-w-md p-8 relative border border-[#DDF0E8]">
							<button onClick={() => setIsFormModalOpen(false)} className="absolute top-6 right-6 text-[#9ABABA] hover:text-[#0F2E35] transition-colors"><X size={24} /></button>
							<div className="flex items-center gap-4 mb-8">
								<div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-[#E6F2EE] text-[#2C6975]"><Briefcase size={22} /></div>
								<div>
									<h2 className="text-xl font-bold text-[#0F2E35]">{editingPosition ? "Upravit pozici" : "Nová pozice"}</h2>
									<p className="text-xs mt-1 text-[#5A8A8A]">{editingPosition ? "Upravte údaje pracovní pozice." : "Zadejte název pro novou pozici."}</p>
								</div>
							</div>
							<form onSubmit={handleSubmit} className="space-y-5">
								<div>
									<label className="text-[10px] font-bold uppercase tracking-[0.1em] block mb-1.5 text-[#9ABABA]">Název pozice</label>
									<input required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full p-3 rounded-xl text-sm font-semibold border outline-none transition-all outline-none" style={{ borderColor: "#DDF0E8", color: "#0F2E35" }} placeholder="např. Hlavní kuchař" />
								</div>
								<label className="flex items-center justify-between p-4 rounded-xl cursor-pointer transition-colors border" style={{ borderColor: "#DDF0E8", background: "#F0F7F4" }}>
									<div>
										<div className="font-bold text-[13px] text-[#0F2E35]">Manažerská práva</div>
										<div className="text-[11px] mt-0.5 text-[#5A8A8A]">Může tato pozice schvalovat směny?</div>
									</div>
									<input type="checkbox" checked={formData.isManagerial} onChange={(e) => setFormData({ ...formData, isManagerial: e.target.checked })} className="w-5 h-5 rounded border-slate-300 text-[#68B2A0] focus:ring-[#68B2A0]" />
								</label>
								<div className="flex gap-3 pt-6 mt-2">
									<button type="button" onClick={() => setIsFormModalOpen(false)} className="flex-1 py-3.5 rounded-xl font-bold text-sm bg-[#F0F7F4] text-[#5A8A8A] hover:bg-[#E6F2EE] transition-colors">Zrušit</button>
									<button type="submit" className="flex-1 py-3.5 rounded-xl font-bold text-sm text-white shadow-lg transition-all active:scale-95" style={{ background: "linear-gradient(90deg, #2C6975, #68B2A0)" }}>{editingPosition ? "Uložit změny" : "Vytvořit pozici"}</button>
								</div>
							</form>
						</div>
					</div>
				)}

				{/* MODÁL PRO POTVRZENÍ SMAZÁNÍ */}
				{isDeleteModalOpen && (
					<div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#0F2E35]/60 backdrop-blur-md animate-in zoom-in duration-200">
						<div className="bg-white rounded-[24px] shadow-2xl w-full max-w-sm p-8 text-center border border-[#DDF0E8]">
							<div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-5" style={{ background: "rgba(200,90,48,.1)" }}><AlertTriangle color="#C85A30" size={32} /></div>
							<h2 className="text-xl font-bold mb-2 text-[#0F2E35]">Opravdu smazat?</h2>
							<p className="text-xs mb-8 text-[#5A8A8A]">Pozice <span className="font-bold">{positionToDelete?.name}</span> bude trvale odstraněna. Nelze vzít zpět.</p>
							<div className="flex gap-3">
								<button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 py-3.5 bg-[#F0F7F4] text-[#5A8A8A] hover:bg-[#E6F2EE] font-bold text-sm rounded-xl transition-colors">Zrušit</button>
								<button onClick={confirmDelete} className="flex-1 py-3.5 text-white bg-[#C85A30] hover:bg-[#A84A20] font-bold text-sm rounded-xl shadow-lg transition-all active:scale-95">Smazat</button>
							</div>
						</div>
					</div>
				)}
			</PageContainer>
		</ProtectedRoute>
	);
}
