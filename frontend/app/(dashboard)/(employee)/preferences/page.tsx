"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/app/components/ProtectedRoute";
import { Lock, Clock } from "lucide-react";

interface GroupedShift {
	displayStart: string;
	displayEnd: string;
	count: number;
	shiftIds: string[];
	userStatus: "AVAILABLE" | "UNAVAILABLE" | "PREFERRED" | null;
	shiftType: { name: string; colorCode: string };
	jobPosition: { name: string };
	isLocked: boolean;
	scheduleGroupStatus?: string;
}

type GroupStatus = "DRAFT" | "PREFERENCES" | "GENERATED" | "PUBLISHED" | null;

export default function EmployeePreferencesPage() {
	const { user } = useAuth();

	const [viewDate, setViewDate] = useState({
		year: new Date().getFullYear(),
		month: new Date().getMonth() + 1,
	});

	const [shifts, setShifts] = useState<GroupedShift[]>([]);
	const [groupStatus, setGroupStatus] = useState<GroupStatus>(null);
	const [loading, setLoading] = useState(true);

	const monthNames = [
		"Leden", "Únor", "Březen", "Duben", "Květen", "Červen",
		"Červenec", "Srpen", "Září", "Říjen", "Listopad", "Prosinec",
	];

	const moveMonth = (step: number) => {
		setViewDate((prev) => {
			let newMonth = prev.month + step;
			let newYear = prev.year;
			if (newMonth > 12) { newMonth = 1; newYear++; }
			if (newMonth < 1) { newMonth = 12; newYear--; }
			return { year: newYear, month: newMonth };
		});
	};

	const fetchData = async () => {
		if (!user) return;
		setLoading(true);
		const locationId = user.locationId || 1;

		const [groupRes, shiftsRes] = await Promise.allSettled([
			api.get("/schedule-groups/find", {
				params: { locationId, year: viewDate.year, month: viewDate.month },
			}),
			api.get("/shifts/open-preferences", {
				params: { locationId, userId: user.id, year: viewDate.year, month: viewDate.month },
			}),
		]);

		setGroupStatus(
			groupRes.status === "fulfilled" ? groupRes.value.data?.status ?? null : null,
		);
		setShifts(
			shiftsRes.status === "fulfilled" ? shiftsRes.value.data : [],
		);
		setLoading(false);
	};

	useEffect(() => {
		fetchData();
	}, [user, viewDate]);

	const handleVote = async (
		shiftIds: string[],
		type: "AVAILABLE" | "UNAVAILABLE" | "PREFERRED",
	) => {
		const previousShifts = [...shifts];
		setShifts((current) =>
			current.map((group) =>
				group.shiftIds[0] === shiftIds[0] ? { ...group, userStatus: type } : group,
			),
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

	// Primární zdroj statusu: scheduleGroupStatus ze směn (vrací backend přímo)
	// Fallback: groupStatus z /schedule-groups/find (jen pro adminy, pro zaměstnance selže)
	const effectiveStatus = shifts.length > 0
		? shifts[0].scheduleGroupStatus
		: groupStatus;

	const isLocked = effectiveStatus === "GENERATED" || effectiveStatus === "PUBLISHED";

	return (
		<div className="p-4 md:p-8 max-w-5xl mx-auto">
			{/* NAVIGACE MĚSÍCŮ */}
			<div className="flex items-center justify-center gap-6 mb-8 text-slate-800">
				<button
					onClick={() => moveMonth(-1)}
					className="p-3 bg-white rounded-full shadow-sm hover:bg-slate-50 transition-colors">
					←
				</button>
				<div className="bg-white px-12 py-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center min-w-[250px]">
					<span className="text-2xl font-black uppercase tracking-tighter">
						{monthNames[viewDate.month - 1]} {viewDate.year}
					</span>
				</div>
				<button
					onClick={() => moveMonth(1)}
					className="p-3 bg-white rounded-full shadow-sm hover:bg-slate-50 transition-colors">
					→
				</button>
			</div>

			{loading ? (
				<div className="text-center py-10 text-slate-400">Načítám směny...</div>
			) : effectiveStatus === "DRAFT" ? (
				/* Rozvrh existuje, ale ještě nebyl otevřen pro preference */
				<div className="flex flex-col items-center gap-4 bg-white p-10 rounded-4xl border border-slate-100 shadow-sm text-center">
					<div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
						<Clock className="text-slate-400" size={32} />
					</div>
					<h2 className="text-lg font-black text-slate-700 uppercase tracking-tight">
						Zatím uzavřeno
					</h2>
					<p className="text-slate-400 text-sm max-w-sm">
						Pro tento měsíc zatím nebyly otevřeny preference.
						Vyčkejte, až administrátor otevře rozvrh.
					</p>
				</div>
			) : shifts.length === 0 ? (
				<div className="bg-white p-8 rounded-4xl text-center border-2 border-dashed border-slate-200 text-slate-400">
					Pro tento měsíc nejsou vypsané žádné směny.
				</div>
			) : (
				<>
					{/* Banner uzavřeného měsíce */}
					{isLocked && (
						<div className="flex items-center gap-3 bg-amber-50 text-amber-700 p-4 rounded-xl mb-6 border border-amber-200">
							<Lock size={16} className="shrink-0" />
							<span className="font-bold text-sm">
								Tento měsíc je uzavřen. Preference již nelze měnit.
							</span>
						</div>
					)}

					<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
						{shifts.map((group, index) => {
							const start = new Date(group.displayStart);
							const end = new Date(group.displayEnd);
							const locked = isLocked || group.isLocked;

							let cardStyle = "border-slate-100 bg-white";
							if (group.userStatus === "AVAILABLE")
								cardStyle = "border-green-500 bg-green-50 ring-2 ring-green-200";
							else if (group.userStatus === "PREFERRED")
								cardStyle = "border-amber-400 bg-amber-50 ring-2 ring-amber-200";
							else if (group.userStatus === "UNAVAILABLE")
								cardStyle = "opacity-60 bg-slate-50 grayscale";

							if (locked) cardStyle += " opacity-80 cursor-not-allowed";

							return (
								<div
									key={index}
									className={`relative p-5 rounded-3xl border shadow-sm transition-all duration-300 ${cardStyle}`}>
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

									<div className="grid grid-cols-4 gap-2 mt-4">
										<button
											disabled={locked}
											onClick={() => handleVote(group.shiftIds, "UNAVAILABLE")}
											className={`col-span-1 py-3 rounded-xl font-black uppercase text-xs transition-all flex items-center justify-center
												${group.userStatus === "UNAVAILABLE" ? "bg-slate-400 text-white" : "bg-white border border-slate-200 text-slate-300 hover:border-red-400 hover:text-red-400"}
												${locked ? "pointer-events-none opacity-50" : ""}`}>
											✕
										</button>
										<button
											disabled={locked}
											onClick={() => handleVote(group.shiftIds, "AVAILABLE")}
											className={`col-span-2 py-3 rounded-xl font-black uppercase text-[10px] transition-all
												${group.userStatus === "AVAILABLE" ? "bg-green-600 text-white shadow-green-200" : "bg-white border border-slate-200 text-slate-400 hover:border-green-500 hover:text-green-500"}
												${locked ? "pointer-events-none opacity-50" : ""}`}>
											{group.userStatus === "AVAILABLE" ? "Vybráno" : "Můžu"}
										</button>
										<button
											disabled={locked}
											onClick={() => handleVote(group.shiftIds, "PREFERRED")}
											className={`col-span-1 py-3 rounded-xl font-black uppercase text-xs transition-all flex items-center justify-center
												${group.userStatus === "PREFERRED" ? "bg-amber-400 text-white" : "bg-white border border-slate-200 text-amber-300 hover:border-amber-400 hover:text-amber-500"}
												${locked ? "pointer-events-none opacity-50" : ""}`}>
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
