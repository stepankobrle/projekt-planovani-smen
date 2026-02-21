"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/app/components/ProtectedRoute";

interface GroupedShift {
	displayStart: string;
	displayEnd: string;
	count: number;
	shiftIds: string[];
	userStatus: "AVAILABLE" | "UNAVAILABLE" | "PREFERRED" | null;
	shiftType: { name: string; colorCode: string };
	jobPosition: { name: string };
	isLocked: boolean; // <--- NOVÉ POLE Z BACKENDU
}

export default function EmployeePreferencesPage() {
	const { user } = useAuth();

	// STAV PRO DATUM (stejně jako u Admina)
	const [viewDate, setViewDate] = useState({
		year: new Date().getFullYear(),
		month: new Date().getMonth() + 1,
	});

	const [shifts, setShifts] = useState<GroupedShift[]>([]);
	const [loading, setLoading] = useState(true);

	const monthNames = [
		"Leden",
		"Únor",
		"Březen",
		"Duben",
		"Květen",
		"Červen",
		"Červenec",
		"Srpen",
		"Září",
		"Říjen",
		"Listopad",
		"Prosinec",
	];

	// Funkce pro změnu měsíce
	const moveMonth = (step: number) => {
		setViewDate((prev) => {
			let newMonth = prev.month + step;
			let newYear = prev.year;
			if (newMonth > 12) {
				newMonth = 1;
				newYear++;
			}
			if (newMonth < 1) {
				newMonth = 12;
				newYear--;
			}
			return { year: newYear, month: newMonth };
		});
	};

	const fetchShifts = async () => {
		if (!user) return;
		try {
			if (shifts.length === 0) {
				setLoading(true);
			}
			const locationId = user.locationId || 1;
			const res = await api.get("/shifts/open-preferences", {
				params: {
					locationId,
					userId: user.id,
					year: viewDate.year,
					month: viewDate.month,
				},
			});
			setShifts(res.data);
		} catch (err) {
			console.error("Chyba při načítání směn", err);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchShifts();
	}, [user, viewDate]); // Přenačíst když se změní user nebo datum

	const handleVote = async (
		shiftIds: string[],
		type: "AVAILABLE" | "UNAVAILABLE" | "PREFERRED",
	) => {
		const previousShifts = [...shifts];
		setShifts((currentShifts) =>
			currentShifts.map((group) => {
				if (group.shiftIds[0] === shiftIds[0]) {
					return { ...group, userStatus: type };
				}
				return group;
			}),
		);

		try {
			await Promise.all(
				shiftIds.map((shiftId) =>
					api.post("/availability", { shiftId, userId: user?.id, type }),
				),
			);
		} catch (err: any) {
			setShifts(previousShifts);

			if (err.response?.status === 403) {
				alert("Chyba: Tento měsíc již není otevřen pro úpravy.");
			} else {
				alert("Chyba při ukládání, změna vrácena zpět.");
			}
		}
	};

	return (
		<div className="p-4 md:p-8 max-w-5xl mx-auto">
			{/* --- NAVIGACE MĚSÍCŮ --- */}
			<div className="flex items-center justify-center gap-6 mb-8 text-slate-800">
				<button
					onClick={() => moveMonth(-1)}
					className="p-3 bg-white rounded-full shadow-sm hover:bg-slate-50 transition-colors">
					{" "}
					←{" "}
				</button>
				<div className="bg-white px-12 py-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center min-w-[250px]">
					<span className="text-2xl font-black uppercase tracking-tighter">
						{monthNames[viewDate.month - 1]} {viewDate.year}
					</span>
				</div>
				<button
					onClick={() => moveMonth(1)}
					className="p-3 bg-white rounded-full shadow-sm hover:bg-slate-50 transition-colors">
					{" "}
					→{" "}
				</button>
			</div>

			{loading ? (
				<div className="text-center py-10 text-slate-400">Načítám směny...</div>
			) : shifts.length === 0 ? (
				<div className="bg-white p-8 rounded-[2rem] text-center border-2 border-dashed border-slate-200 text-slate-400">
					Pro tento měsíc nejsou vypsané žádné směny.
				</div>
			) : (
				<>
					{/* Informační hláška pokud je zamčeno */}
					{shifts[0].isLocked && (
						<div className="bg-amber-50 text-amber-600 p-4 rounded-xl mb-6 text-center font-bold text-sm border border-amber-200">
							🔒 Tento měsíc je uzavřen. Nemůžete měnit své preference.
						</div>
					)}

					<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
						{shifts.map((group, index) => {
							const start = new Date(group.displayStart);
							const end = new Date(group.displayEnd);
							const isLocked = group.isLocked; // Je tento konkrétní měsíc zamčený?

							// Styl karty
							let cardStyle = "border-slate-100 bg-white";
							if (group.userStatus === "AVAILABLE")
								cardStyle =
									"border-green-500 bg-green-50 ring-2 ring-green-200";
							else if (group.userStatus === "PREFERRED")
								cardStyle =
									"border-amber-400 bg-amber-50 ring-2 ring-amber-200";
							else if (group.userStatus === "UNAVAILABLE")
								cardStyle = "opacity-60 bg-slate-50 grayscale";

							// Pokud je zamčeno, karta bude vypadat trochu "neaktivně"
							if (isLocked) cardStyle += " opacity-80 cursor-not-allowed";

							return (
								<div
									key={index}
									className={`relative p-5 rounded-[1.5rem] border shadow-sm transition-all duration-300 ${cardStyle}`}>
									{/* ... Zobrazení času a datumu (stejné jako předtím) ... */}
									<div className="flex justify-between items-start mb-4">
										<div>
											<div className="text-xs font-black uppercase text-slate-400 mb-1">
												{start.toLocaleDateString("cs-CZ", {
													weekday: "short",
													day: "numeric",
													month: "numeric",
												})}
											</div>
											<div className="text-lg font-black text-slate-800">
												{start.toLocaleTimeString([], {
													hour: "2-digit",
													minute: "2-digit",
												})}{" "}
												-{" "}
												{end.toLocaleTimeString([], {
													hour: "2-digit",
													minute: "2-digit",
												})}
											</div>
										</div>
										<span
											className="px-2 py-1 rounded-lg text-[10px] font-bold uppercase shadow-sm"
											style={{
												backgroundColor: group.shiftType?.colorCode || "#eee",
												color: "#333",
											}}>
											{group.shiftType?.name}
										</span>
									</div>

									{/* Tlačítka - disabled pokud isLocked */}
									<div className="grid grid-cols-4 gap-2 mt-4">
										<button
											disabled={isLocked}
											onClick={() => handleVote(group.shiftIds, "UNAVAILABLE")}
											className={`col-span-1 py-3 rounded-xl font-black uppercase text-xs transition-all flex items-center justify-center 
                                                ${group.userStatus === "UNAVAILABLE" ? "bg-slate-400 text-white" : "bg-white border border-slate-200 text-slate-300 hover:border-red-400 hover:text-red-400"}
                                                ${isLocked ? "pointer-events-none opacity-50" : ""}
                                            `}>
											✕
										</button>

										<button
											disabled={isLocked}
											onClick={() => handleVote(group.shiftIds, "AVAILABLE")}
											className={`col-span-2 py-3 rounded-xl font-black uppercase text-[10px] transition-all 
                                                ${group.userStatus === "AVAILABLE" ? "bg-green-600 text-white shadow-green-200" : "bg-white border border-slate-200 text-slate-400 hover:border-green-500 hover:text-green-500"}
                                                ${isLocked ? "pointer-events-none opacity-50" : ""}
                                            `}>
											{group.userStatus === "AVAILABLE" ? "Vybráno" : "Můžu"}
										</button>

										<button
											disabled={isLocked}
											onClick={() => handleVote(group.shiftIds, "PREFERRED")}
											className={`col-span-1 py-3 rounded-xl font-black uppercase text-xs transition-all flex items-center justify-center 
                                                ${group.userStatus === "PREFERRED" ? "bg-amber-400 text-white" : "bg-white border border-slate-200 text-amber-300 hover:border-amber-400 hover:text-amber-500"}
                                                ${isLocked ? "pointer-events-none opacity-50" : ""}
                                            `}>
											★
										</button>
									</div>
								</div>
							);
						})}
					</div>
				</>
			)}
		</div>
	);
}
