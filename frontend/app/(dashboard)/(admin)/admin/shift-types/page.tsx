"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
	Plus,
	Trash2,
	Clock,
	Palette,
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
			<div className="p-6 space-y-6">
				<div className="flex justify-between items-center">
					<div>
						<h1 className="text-2xl font-bold text-slate-900">Typy směn</h1>
						<p className="text-slate-500 text-sm">
							Definujte šablony směn pro váš tým.
						</p>
					</div>
					<button
						onClick={() => handleOpenModal()}
						className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200">
						<Plus size={18} /> Nový typ směny
					</button>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{types.map((type) => (
						<div
							key={type.id}
							className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all relative group">
							<div className="flex items-start justify-between mb-4">
								<div className="flex items-center gap-3">
									<div
										className="w-4 h-10 rounded-full"
										style={{ backgroundColor: type.colorCode }}
									/>
									<div>
										<h3 className="font-bold text-slate-900">{type.name}</h3>
										<div className="flex items-center gap-1 text-slate-500 text-xs mt-1">
											<Clock size={12} />
											{type.startTime
												? `${type.startTime} - ${type.endTime}`
												: "Flexibilní čas"}
										</div>
									</div>
								</div>
								<div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
									<button
										onClick={() => handleOpenModal(type)}
										className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
										<Edit2 size={16} />
									</button>
									<button
										onClick={() => handleDelete(type.id)}
										className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
										<Trash2 size={16} />
									</button>
								</div>
							</div>
						</div>
					))}
				</div>

				{isModalOpen && (
					<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
						<div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 relative">
							<button
								onClick={() => setIsModalOpen(false)}
								className="absolute top-6 right-6 text-slate-400 hover:text-slate-900">
								<X size={24} />
							</button>

							<h2 className="text-xl font-bold mb-6">
								{editingId ? "Upravit typ směny" : "Nový typ směny"}
							</h2>

							<form onSubmit={handleSubmit} className="space-y-4">
								<div>
									<label className="text-xs font-bold text-slate-500 uppercase block mb-1">
										Název směny
									</label>
									<input
										required
										value={formData.name}
										onChange={(e) =>
											setFormData({ ...formData, name: e.target.value })
										}
										className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-medium"
										placeholder="např. Ranní 8h"
									/>
								</div>

								<div className="grid grid-cols-2 gap-4">
									<div>
										<label className="text-xs font-bold text-slate-500 uppercase block mb-1">
											Začátek
										</label>
										<input
											type="time"
											value={formData.startTime}
											onChange={(e) =>
												setFormData({ ...formData, startTime: e.target.value })
											}
											className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-medium"
										/>
									</div>
									<div>
										<label className="text-xs font-bold text-slate-500 uppercase block mb-1">
											Konec
										</label>
										<input
											type="time"
											value={formData.endTime}
											onChange={(e) =>
												setFormData({ ...formData, endTime: e.target.value })
											}
											className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-medium"
										/>
									</div>
								</div>

								<div className="p-3 bg-blue-50 rounded-xl flex gap-2 text-blue-700 text-xs">
									<Info size={16} />
									<span>
										Ponechte časy prázdné, pokud jde o flexibilní směnu bez
										pevného začátku.
									</span>
								</div>

								<div>
									<label className="text-xs font-bold text-slate-500 uppercase block mb-1 text-center">
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

								<button
									disabled={loading}
									className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg hover:bg-blue-700 disabled:bg-slate-300 transition-all">
									{loading ? "Ukládám..." : "ULOŽIT TYP SMĚNY"}
								</button>
							</form>
						</div>
					</div>
				)}
			</div>
		</ProtectedRoute>
	);
}
