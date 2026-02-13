"use client";

import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import Link from "next/link";
import Cookies from "js-cookie";
import { useAuth } from "@/app/components/ProtectedRoute";

// --- TYPY ---
interface ScheduleGroup {
	id: string;
	name: string;
	status: "DRAFT" | "OPEN" | "PUBLISHED";
	dateFrom: string;
	dateTo: string;
}

export default function UnifiedSchedulePage() {
	const { role } = useAuth(); // Získáme roli z tvého ProtectedRoute contextu
	const [groups, setGroups] = useState<ScheduleGroup[]>([]);
	const [loading, setLoading] = useState(true);

	// Stavy pro admin modál
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [newName, setNewName] = useState("");
	const [newDateFrom, setNewDateFrom] = useState("");
	const [newDateTo, setNewDateTo] = useState("");

	// --- NAČÍTÁNÍ DAT ---
	const fetchGroups = useCallback(async () => {
		try {
			const res = await axios.get("http://localhost:3001/schedule-groups", {
				withCredentials: true,
			});
			setGroups(res.data);
			setLoading(false);
		} catch (err) {
			console.error("Chyba při načítání:", err);
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchGroups();
	}, [fetchGroups]);

	const handleCreate = async (e: React.FormEvent) => {
		e.preventDefault();

		// 1. Klientská kontrola duplicity (pokud už máš seznam groups stažený)
		const isDuplicate = groups.some(
			(g) =>
				g.dateFrom.startsWith(newDateFrom) || g.dateTo.startsWith(newDateTo),
		);
		if (isDuplicate) {
			alert("Rozvrh pro toto období již existuje!");
			return;
		}
		try {
			await axios.post(
				"http://localhost:3001/schedule-groups",
				{
					name: newName,
					dateFrom: new Date(newDateFrom).toISOString(),
					dateTo: new Date(newDateTo).toISOString(),
				},
				{ withCredentials: true },
			);
		} catch (err: any) {
			// 2. Backendová kontrola (pokud backend vrátí 400 Bad Request)
			alert(err.response?.data?.message || "Chyba při vytváření");
		}
	};

	if (loading)
		return <div className="p-10 text-center font-bold">Načítání...</div>;

	return (
		<div className="min-h-screen bg-gray-50 p-4 md:p-8 text-slate-900">
			<div className="max-w-5xl mx-auto">
				{/* DYNAMICKÝ HEADER PODLE ROLE */}
				<div className="flex justify-between items-center mb-8">
					<div>
						<h1 className="text-3xl font-black text-gray-900 uppercase">
							{role === "ADMIN" ? "Správa rozvrhů" : "Moje směny"}
						</h1>
						<p className="text-gray-500 text-sm">
							{role === "ADMIN"
								? "Vytvářejte a spravujte měsíční plány"
								: "Přehled vypsaných rozvrhů a směn"}
						</p>
					</div>

					{/* Tlačítko vidí jen admin */}
					{role === "ADMIN" && (
						<button
							onClick={() => setIsModalOpen(true)}
							className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-indigo-700 transition shadow-lg text-sm">
							+ NOVÝ MĚSÍC
						</button>
					)}
				</div>

				{/* TABULKA (Společná pro oba, ale s jinými akcemi) */}
				<div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden text-slate-900">
					<table className="w-full text-left">
						<thead className="bg-gray-50 border-b border-gray-100">
							<tr>
								<th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
									Název
								</th>
								<th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
									Období
								</th>
								<th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
									Status
								</th>
								<th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">
									Akce
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-50 font-medium">
							{groups
								// FILTR: Pokud nejsem ADMIN, vidím jen OPEN a PUBLISHED
								.filter((group) => {
									if (role === "ADMIN") return true; // Admin vidí vše
									return (
										group.status === "OPEN" || group.status === "PUBLISHED"
									);
								})
								.map((group) => (
									<tr
										key={group.id}
										className="hover:bg-gray-50 transition-colors">
										<td className="p-4 font-bold text-slate-800">
											{group.name}
										</td>
										<td className="p-4 text-sm text-gray-500">
											{new Date(group.dateFrom).toLocaleDateString("cs-CZ")} -{" "}
											{new Date(group.dateTo).toLocaleDateString("cs-CZ")}
										</td>
										<td className="p-4">
											<span
												className={`text-[10px] font-black px-2 py-1 rounded-md uppercase ${
													group.status === "PUBLISHED"
														? "bg-green-100 text-green-600"
														: group.status === "OPEN"
															? "bg-blue-100 text-blue-600" // Přidáme barvu pro OPEN
															: "bg-orange-100 text-orange-600" // DRAFT
												}`}>
												{group.status}
											</span>
										</td>
										<td className="p-4 text-right">
											<Link
												href={`/schedule/${group.id}`}
												className="inline-block bg-slate-100 hover:bg-indigo-600 hover:text-white text-slate-600 px-4 py-1.5 rounded-lg text-xs font-black transition-all uppercase tracking-tighter">
												{role === "ADMIN" ? "Spravovat" : "Zobrazit"}
											</Link>
										</td>
									</tr>
								))}
						</tbody>
					</table>
					{groups.length === 0 && (
						<div className="p-10 text-center text-gray-400 italic text-sm">
							Zatím nebyly vytvořeny žádné rozvrhy.
						</div>
					)}
				</div>
			</div>

			{/* ADMIN MODÁL (Vykreslí se jen pokud je admin a je open) */}
			{role === "ADMIN" && isModalOpen && (
				<div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
					<div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl border border-slate-100">
						<h2 className="text-2xl font-black mb-6 uppercase tracking-tight text-slate-800">
							Nový rozvrh
						</h2>
						<form onSubmit={handleCreate} className="space-y-4">
							<div>
								<label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">
									Název měsíce
								</label>
								<input
									type="text"
									required
									value={newName}
									onChange={(e) => setNewName(e.target.value)}
									placeholder="Např. Březen 2026"
									className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
								/>
							</div>
							<div className="grid grid-cols-2 gap-4">
								<div>
									<label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">
										Datum od
									</label>
									<input
										type="date"
										required
										value={newDateFrom}
										onChange={(e) => setNewDateFrom(e.target.value)}
										className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-medium"
									/>
								</div>
								<div>
									<label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">
										Datum do
									</label>
									<input
										type="date"
										required
										value={newDateTo}
										onChange={(e) => setNewDateTo(e.target.value)}
										className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-medium"
									/>
								</div>
							</div>
							<div className="flex gap-3 mt-8">
								<button
									type="button"
									onClick={() => setIsModalOpen(false)}
									className="flex-1 py-3 font-bold text-slate-400 hover:text-slate-600 transition uppercase text-xs tracking-widest">
									Zrušit
								</button>
								<button
									type="submit"
									className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition shadow-lg uppercase text-xs tracking-widest">
									Vytvořit
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	);
}
