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
import { PageContainer, HeroHeader, OverlapPanel, TableCard } from "@/app/components/AdminLayout";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import "../dashboard/dashboard.css";

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
		colorCode: "#2C6975",
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
			setTimeout(() => router.push("/admin/dashboard"), 3000);
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
				colorCode: "#2C6975",
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
					subtitle="Šablony a časy"
					title="Typy směn"
					action={
						<button onClick={() => handleOpenModal()} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-black/10 active:scale-95" style={{ background: "#F59E0B", color: "#fff" }}>
							<Plus size={18} /> Nový typ směny
						</button>
					}
				/>

				<TableCard delay="100ms">
					<thead style={{ position: "sticky", top: 0, zIndex: 5, background: "rgba(255,255,255,0.95)", backdropFilter: "blur(10px)" }}>
						<tr style={{ borderBottom: "2px solid #DDF0E8" }}>
							<th className="px-4 py-3 text-[10px] font-bold tracking-[0.1em] uppercase" style={{ color: "#9ABABA" }}>Název směny</th>
							<th className="px-4 py-3 text-[10px] font-bold tracking-[0.1em] uppercase" style={{ color: "#9ABABA" }}>Trvání</th>
							<th className="px-4 py-3 text-[10px] font-bold tracking-[0.1em] uppercase" style={{ color: "#9ABABA" }}>Barevný kód</th>
							<th className="px-4 py-3 text-[10px] font-bold tracking-[0.1em] uppercase text-right" style={{ color: "#9ABABA" }}>Akce</th>
						</tr>
					</thead>
					<tbody>
									{types.map((type, index) => (
										<tr key={type.id} className="a-fade border-b border-[#DDF0E8] last:border-0 transition-colors hover:bg-[#E6F2EE]" style={{ "--d": `${index * 30}ms` } as React.CSSProperties}>
											<td className="px-4 py-4">
												<span className="font-bold text-[13px]" style={{ color: "#0F2E35" }}>
													{type.name}
												</span>
											</td>
											<td className="px-4 py-4">
												<div className="flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: "#5A8A8A" }}>
													<Clock size={12} className="text-[#68B2A0]" />
													{type.startTime ? `${type.startTime} – ${type.endTime}` : (
														<span className="text-[10px] font-bold px-2 py-0.5 rounded border" style={{ background: "#F0F7F4", color: "#2C6975", borderColor: "#DDF0E8", textTransform: "uppercase" }}>
															Flexibilní
														</span>
													)}
												</div>
											</td>
											<td className="px-4 py-4">
												<div className="flex items-center gap-2">
													<div className="w-4 h-4 rounded-full border border-black/10 shadow-sm" style={{ backgroundColor: type.colorCode }} />
													<span className="font-mono text-[11px] uppercase font-bold" style={{ color: "#9ABABA" }}>
														{type.colorCode}
													</span>
												</div>
											</td>
											<td className="px-4 py-4 text-right">
												<div className="flex justify-end gap-2">
													<button onClick={() => handleOpenModal(type)} className="btn-no" style={{ padding: "6px", borderRadius: "8px", borderColor: "transparent", color: "#68B2A0" }}>
														<Edit2 size={16} />
													</button>
													<button onClick={() => handleDelete(type.id)} className="btn-no" style={{ padding: "6px", borderRadius: "8px", borderColor: "transparent", color: "#C85A30" }}>
														<Trash2 size={16} />
													</button>
												</div>
											</td>
										</tr>
									))}
									{types.length === 0 && (
										<tr>
											<td colSpan={4} className="px-4 py-16 text-center text-sm" style={{ color: "#9ABABA" }}>Zatím nebyly vytvořeny žádné typy směn.</td>
										</tr>
									)}
								</tbody>
					</TableCard>

				{/* MODÁL PRO PŘIDÁNÍ / EDITACI */}
				{isModalOpen && (
					<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F2E35]/40 backdrop-blur-sm animate-in fade-in duration-200">
						<div className="bg-white rounded-[24px] shadow-2xl w-full max-w-md p-8 relative border border-[#DDF0E8]">
							<button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 text-[#9ABABA] hover:text-[#0F2E35] transition-colors"><X size={24} /></button>
							<div className="flex items-center gap-4 mb-8">
								<div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "#E6F2EE", color: "#2C6975" }}>
									<Clock size={22} />
								</div>
								<div>
									<h2 className="text-xl font-bold" style={{ color: "#0F2E35" }}>{editingId ? "Upravit směnu" : "Nový typ směny"}</h2>
									<p className="text-xs mt-1" style={{ color: "#5A8A8A" }}>{editingId ? "Upravte parametry směny." : "Zadejte parametry pro novou směnu."}</p>
								</div>
							</div>

							{error && <div className="p-3 rounded-xl text-xs font-bold mb-4" style={{ background: "rgba(200,90,48,.1)", color: "#C85A30" }}>⚠️ {error}</div>}

							<form onSubmit={handleSubmit} className="space-y-4">
								<div>
									<label className="text-[10px] font-bold uppercase tracking-[0.1em] block mb-1.5" style={{ color: "#9ABABA" }}>Název směny</label>
									<input required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full p-3 rounded-xl text-sm font-semibold border outline-none transition-all outline-none" style={{ borderColor: "#DDF0E8", color: "#0F2E35" }} placeholder="např. Ranní 8h" />
								</div>

								<div className="grid grid-cols-2 gap-4">
									<div>
										<label className="text-[10px] font-bold uppercase tracking-[0.1em] block mb-1.5" style={{ color: "#9ABABA" }}>Začátek</label>
										<input type="time" value={formData.startTime} onChange={(e) => setFormData({ ...formData, startTime: e.target.value })} className="w-full p-3 rounded-xl text-sm font-semibold border outline-none transition-all outline-none" style={{ borderColor: "#DDF0E8", color: "#0F2E35" }} />
									</div>
									<div>
										<label className="text-[10px] font-bold uppercase tracking-[0.1em] block mb-1.5" style={{ color: "#9ABABA" }}>Konec</label>
										<input type="time" value={formData.endTime} onChange={(e) => setFormData({ ...formData, endTime: e.target.value })} className="w-full p-3 rounded-xl text-sm font-semibold border outline-none transition-all outline-none" style={{ borderColor: "#DDF0E8", color: "#0F2E35" }} />
									</div>
								</div>

								<div className="p-3 rounded-xl flex items-start gap-2 text-xs font-semibold" style={{ background: "#F0F7F4", color: "#2C6975" }}>
									<Info size={16} className="shrink-0 mt-0.5" />
									<span>Ponechte časy prázdné, pokud se jedná o flexibilní směnu bez pevného začátku.</span>
								</div>

								<div>
									<label className="text-[10px] font-bold uppercase tracking-[0.1em] block mb-2 text-center" style={{ color: "#9ABABA" }}>Barva směny</label>
									<div className="flex justify-center items-center gap-4">
										<input type="color" value={formData.colorCode} onChange={(e) => setFormData({ ...formData, colorCode: e.target.value })} className="w-16 h-16 p-1 bg-white border rounded-full cursor-pointer overflow-hidden shadow-sm outline-none" style={{ borderColor: "#DDF0E8" }} />
										<div className="font-mono text-sm uppercase font-bold" style={{ color: "#5A8A8A" }}>{formData.colorCode}</div>
									</div>
								</div>

								<div className="flex gap-3 pt-6 mt-2">
									<button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3.5 rounded-xl font-bold text-sm bg-[#F0F7F4] text-[#5A8A8A] hover:bg-[#E6F2EE] transition-colors">
										Zrušit
									</button>
									<button type="submit" disabled={loading} className="flex-1 py-3.5 rounded-xl font-bold text-sm text-white shadow-lg shadow-black/10 transition-all hover:brightness-110 active:scale-95 disabled:opacity-50" style={{ background: "linear-gradient(90deg, #2C6975, #68B2A0)" }}>
										{loading ? "Ukládám..." : "Uložit směnu"}
									</button>
								</div>
							</form>
						</div>
					</div>
				)}
			</PageContainer>
		</ProtectedRoute>
	);
}
