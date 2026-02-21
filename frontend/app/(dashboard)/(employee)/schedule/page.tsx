"use client";

import React, { useEffect, useState, useMemo } from "react";
import api from "@/lib/api";
import { useAuth } from "@/app/components/ProtectedRoute";

// --- UPDATED INTERFACE ---
interface AssignedShift {
	id: string;
	startDatetime: string;
	endDatetime: string;
	// Ošetření null hodnot pomocí ? (Optional)
	shiftType?: { name: string; colorCode: string } | null;
	jobPosition: { name: string };
	location: { name: string };
	assignedUserId: string | null;
	assignedUser?: { fullName: string };

	// --- NOVÁ POLE PRO BURZU ---
	isMarketplace: boolean;
	offeredById?: string | null;
	requestedById?: string | null;
}

export default function EmployeeSchedulePage() {
	const { user } = useAuth();

	// 1. STAV PRO PŘEPÍNÁNÍ POHLEDU
	const [viewMode, setViewMode] = useState<"MINE" | "ALL">("MINE");

	const [viewDate, setViewDate] = useState({
		year: new Date().getFullYear(),
		month: new Date().getMonth() + 1,
	});

	const [allShifts, setAllShifts] = useState<AssignedShift[]>([]);
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

	// --- NAČTENÍ VŠECH SMĚN ---
	const fetchShifts = async () => {
		if (!user) return;
		try {
			setLoading(true);
			const res = await api.get("/shifts", {
				params: {
					year: viewDate.year,
					month: viewDate.month,
					locationId: user.locationId,
				},
			});
			setAllShifts(res.data);
		} catch (err) {
			console.error("Chyba při načítání rozvrhu:", err);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchShifts();
	}, [user, viewDate]);

	// --- AKCE: NABÍDNOUT SMĚNU ---
	const handleOfferShift = async (shiftId: string) => {
		if (!confirm("Opravdu chcete nabídnout tuto směnu na burze?")) return;

		try {
			await api.patch(`/shifts/${shiftId}/offer`, {});
			alert("Směna byla nabídnuta kolegům.");
			fetchShifts(); // Refresh dat
		} catch (err: any) {
			alert(err.response?.data?.message || "Chyba při nabízení směny.");
		}
	};

	// --- AKCE: VZÍT SI SMĚNU (Pokud to chceš povolit) ---
	const handleTakeShift = async (shiftId: string) => {
		if (!confirm("Opravdu si chcete vzít tuto směnu?")) return;

		try {
			await api.patch(`/shifts/${shiftId}/take`, {});
			alert("Směna je vaše!");
			fetchShifts(); // Refresh dat
		} catch (err: any) {
			alert(err.response?.data?.message || "Chyba: Směnu nelze převzít.");
		}
	};

	// --- FILTROVÁNÍ NA FRONTENDU ---
	const displayedShifts = useMemo(() => {
		if (viewMode === "ALL") {
			return allShifts;
		}
		return allShifts.filter((s) => s.assignedUserId === user?.id);
	}, [allShifts, viewMode, user]);

	// --- VÝPOČTY HODIN ---
	const myTotalHours = useMemo(() => {
		const myShifts = allShifts.filter((s) => s.assignedUserId === user?.id);
		return myShifts.reduce((acc, shift) => {
			const start = new Date(shift.startDatetime).getTime();
			const end = new Date(shift.endDatetime).getTime();
			return acc + (end - start) / 36e5;
		}, 0);
	}, [allShifts, user]);

	// Seskupení podle dnů
	const shiftsByDay = useMemo(() => {
		const grouped: Record<string, AssignedShift[]> = {};
		displayedShifts.forEach((shift) => {
			const dateKey = shift.startDatetime.split("T")[0];
			if (!grouped[dateKey]) grouped[dateKey] = [];
			grouped[dateKey].push(shift);
		});
		return Object.keys(grouped)
			.sort()
			.map((date) => ({
				date,
				shifts: grouped[date].sort(
					(a, b) =>
						new Date(a.startDatetime).getTime() -
						new Date(b.startDatetime).getTime(),
				),
			}));
	}, [displayedShifts]);

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

	return (
		<div className="p-4 md:p-8 max-w-3xl mx-auto min-h-screen">
			{/* HLAVIČKA */}
			<div className="flex flex-col items-center justify-center gap-4 mb-6">
				{/* PŘEPÍNAČ POHLEDŮ */}
				<div className="bg-slate-100 p-1 rounded-xl flex shadow-inner">
					<button
						onClick={() => setViewMode("MINE")}
						className={`px-6 py-2 rounded-lg text-sm font-black uppercase transition-all ${viewMode === "MINE" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}>
						Moje směny
					</button>
					<button
						onClick={() => setViewMode("ALL")}
						className={`px-6 py-2 rounded-lg text-sm font-black uppercase transition-all ${viewMode === "ALL" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}>
						Celý tým
					</button>
				</div>

				{/* NAVIGACE MĚSÍCŮ */}
				<div className="flex items-center gap-6 bg-white p-2 rounded-full shadow-sm border border-slate-100">
					<button onClick={() => moveMonth(-1)} className="p-2">
						←
					</button>
					<span className="font-bold">{monthNames[viewDate.month - 1]}</span>
					<button onClick={() => moveMonth(1)} className="p-2">
						→
					</button>
				</div>

				{/* STATISTIKA */}
				{!loading && (
					<div className="bg-indigo-50 text-indigo-700 px-6 py-2 rounded-xl text-sm font-bold border border-indigo-100">
						Můj fond:{" "}
						<span className="text-lg font-black">
							{myTotalHours.toFixed(1)}
						</span>{" "}
						hod
					</div>
				)}
			</div>

			{/* SEZNAM SMĚN */}
			<div className="space-y-6">
				{shiftsByDay.map((dayGroup) => {
					const dateObj = new Date(dayGroup.date);
					const isToday =
						new Date().toISOString().split("T")[0] === dayGroup.date;

					return (
						<div key={dayGroup.date}>
							<div className="sticky top-4 z-10 flex items-center gap-3 mb-3">
								<span
									className={`px-3 py-1 rounded-lg text-xs font-bold uppercase ${isToday ? "bg-indigo-600 text-white" : "bg-white border"}`}>
									{dateObj.toLocaleDateString("cs-CZ", {
										weekday: "short",
										day: "numeric",
									})}
								</span>
								<div className="h-[1px] flex-1 bg-slate-200"></div>
							</div>

							<div className="grid gap-3">
								{dayGroup.shifts.map((shift) => {
									const isMine = shift.assignedUserId === user?.id;
									const isOnMarket = shift.isMarketplace;

									// Barva okraje podle stavu
									let containerClasses =
										"bg-slate-50 border-slate-100 opacity-80";
									if (isMine)
										containerClasses =
											"bg-white border-indigo-200 ring-1 ring-indigo-50";
									if (isOnMarket && !isMine)
										containerClasses =
											"bg-white border-green-300 ring-2 ring-green-100"; // Zvýraznit cizí nabídky

									return (
										<div
											key={shift.id}
											className={`p-4 rounded-2xl border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${containerClasses}`}>
											{/* LEVÁ ČÁST: INFO O SMĚNĚ */}
											<div className="flex items-center gap-3">
												<div
													className="w-1 h-10 rounded-full"
													style={{
														backgroundColor:
															shift.shiftType?.colorCode || "#ccc",
													}}></div>
												<div>
													<div className="text-md font-black text-slate-800">
														{new Date(shift.startDatetime).toLocaleTimeString(
															[],
															{ hour: "2-digit", minute: "2-digit" },
														)}
														-
														{new Date(shift.endDatetime).toLocaleTimeString(
															[],
															{ hour: "2-digit", minute: "2-digit" },
														)}
													</div>
													<div className="text-xs font-bold text-slate-500 uppercase">
														{shift.shiftType?.name || "Vlastní směna"} •{" "}
														{shift.jobPosition.name}
													</div>
												</div>
											</div>

											{/* PRAVÁ ČÁST: AKCE A UŽIVATEL */}
											<div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
												{/* JMÉNO UŽIVATELE */}
												<div>
													{isMine ? (
														<span className="text-[10px] font-black uppercase bg-indigo-100 text-indigo-600 px-2 py-1 rounded-md">
															Já
														</span>
													) : (
														<span className="text-xs font-bold text-slate-600">
															{shift.assignedUser?.fullName || "Volno"}
														</span>
													)}
												</div>

												{/* TLAČÍTKA PRO BURZU */}
												{/* 1. MOJE SMĚNA -> NABÍDNOUT */}
												{isMine && !isOnMarket && (
													<button
														onClick={() => handleOfferShift(shift.id)}
														className="px-3 py-1.5 bg-amber-100 text-amber-700 text-[10px] font-black uppercase rounded-lg border border-amber-200 hover:bg-amber-200 transition-colors">
														♻️ Nabídnout
													</button>
												)}

												{/* 2. MOJE SMĚNA NA BURZE -> INFO */}
												{isMine && isOnMarket && (
													<span className="px-3 py-1.5 bg-slate-100 text-slate-500 text-[10px] font-black uppercase rounded-lg border border-slate-200">
														⏳ Nabízeno
													</span>
												)}

												{/* 3. CIZÍ SMĚNA NA BURZE -> VZÍT SI */}
												{!isMine && isOnMarket && (
													<button
														onClick={() => handleTakeShift(shift.id)}
														className="px-3 py-1.5 bg-green-500 text-white text-[10px] font-black uppercase rounded-lg shadow-green-200 hover:bg-green-600 transition-colors animate-pulse">
														✋ Vzít si
													</button>
												)}
											</div>
										</div>
									);
								})}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}
