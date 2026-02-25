"use client";

import React, { useEffect, useState, useMemo } from "react";
import api from "@/lib/api";
import { useAuth } from "@/app/components/ProtectedRoute";

interface AssignedShift {
	id: string;
	startDatetime: string;
	endDatetime: string;
	shiftType?: { name: string; colorCode: string } | null;
	jobPosition: { name: string };
	location: { name: string };
	assignedUserId: string | null;
	assignedUser?: { fullName: string };
	isMarketplace: boolean;
	offeredById?: string | null;
	requestedById?: string | null;
}

export default function EmployeeSchedulePage() {
	const { user } = useAuth();

	const [viewMode, setViewMode] = useState<"MINE" | "ALL">("MINE");
	const [viewDate, setViewDate] = useState({
		year: new Date().getFullYear(),
		month: new Date().getMonth() + 1,
	});
	const [allShifts, setAllShifts] = useState<AssignedShift[]>([]);
	const [loading, setLoading] = useState(true);

	const monthNames = [
		"Leden", "Únor", "Březen", "Duben", "Květen", "Červen",
		"Červenec", "Srpen", "Září", "Říjen", "Listopad", "Prosinec",
	];

	const todayStr = useMemo(() => {
		const d = new Date();
		d.setHours(0, 0, 0, 0);
		return d.toISOString().split("T")[0];
	}, []);

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

	const handleOfferShift = async (shiftId: string) => {
		if (!confirm("Opravdu chcete nabídnout tuto směnu na burze?")) return;
		try {
			await api.patch(`/shifts/${shiftId}/offer`, {});
			alert("Směna byla nabídnuta kolegům.");
			fetchShifts();
		} catch (err: any) {
			alert(err.response?.data?.message || "Chyba při nabízení směny.");
		}
	};

	const handleTakeShift = async (shiftId: string) => {
		if (!confirm("Opravdu si chcete vzít tuto směnu?")) return;
		try {
			await api.patch(`/shifts/${shiftId}/take`, {});
			alert("Směna je vaše!");
			fetchShifts();
		} catch (err: any) {
			alert(err.response?.data?.message || "Chyba: Směnu nelze převzít.");
		}
	};

	// Nabídnout lze jen pokud datum směny je přísně po dnešku (nejpozději den předem)
	const canOfferShift = (shift: AssignedShift): boolean =>
		shift.startDatetime.split("T")[0] > todayStr;

	const displayedShifts = useMemo(() => {
		if (viewMode === "ALL") return allShifts;
		return allShifts.filter((s) => s.assignedUserId === user?.id);
	}, [allShifts, viewMode, user]);

	const myTotalHours = useMemo(() => {
		const myShifts = allShifts.filter((s) => s.assignedUserId === user?.id);
		return myShifts.reduce((acc, shift) => {
			const start = new Date(shift.startDatetime).getTime();
			const end = new Date(shift.endDatetime).getTime();
			return acc + (end - start) / 36e5;
		}, 0);
	}, [allShifts, user]);

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

	const upcomingDays = useMemo(
		() => shiftsByDay.filter((d) => d.date >= todayStr),
		[shiftsByDay, todayStr],
	);
	const pastDays = useMemo(
		() => shiftsByDay.filter((d) => d.date < todayStr).reverse(),
		[shiftsByDay, todayStr],
	);

	const moveMonth = (step: number) => {
		setViewDate((prev) => {
			let newMonth = prev.month + step;
			let newYear = prev.year;
			if (newMonth > 12) { newMonth = 1; newYear++; }
			if (newMonth < 1) { newMonth = 12; newYear--; }
			return { year: newYear, month: newMonth };
		});
	};

	const renderDayGroup = (dayGroup: { date: string; shifts: AssignedShift[] }, isPast: boolean) => {
		const dateObj = new Date(dayGroup.date);
		const isToday = dayGroup.date === todayStr;

		return (
			<div key={dayGroup.date}>
				<div className="sticky top-4 z-10 flex items-center gap-3 mb-3">
					<span
						className={`px-3 py-1 rounded-lg text-xs font-bold uppercase ${
							isToday
								? "bg-brand-secondary text-brand-text-on-primary"
								: isPast
									? "bg-slate-100 border border-slate-200 text-slate-400"
									: "bg-white border"
						}`}>
						{dateObj.toLocaleDateString("cs-CZ", {
							weekday: "short",
							day: "numeric",
						})}
					</span>
					<div className="h-px flex-1 bg-slate-200"></div>
				</div>

				<div className="grid gap-3">
					{dayGroup.shifts.map((shift) => {
						const isMine = shift.assignedUserId === user?.id;
						const isOnMarket = shift.isMarketplace;
						const canOffer = canOfferShift(shift);

						let containerClasses = "bg-slate-50 border-slate-100 opacity-80";
						if (isPast) {
							containerClasses = isMine
								? "bg-slate-50 border-slate-200 opacity-60"
								: "bg-slate-50 border-slate-100 opacity-50";
						} else if (isMine) {
							containerClasses = "bg-white border-brand-secondary/30 ring-1 ring-brand-secondary/10";
						} else if (isOnMarket && !isMine) {
							containerClasses = "bg-white border-green-300 ring-2 ring-green-100";
						}

						return (
							<div
								key={shift.id}
								className={`p-4 rounded-2xl border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${containerClasses}`}>
								<div className="flex items-center gap-3">
									<div
										className="w-1 h-10 rounded-full"
										style={{
											backgroundColor: shift.shiftType?.colorCode || "#ccc",
										}}
									/>
									<div>
										<div className="text-md font-black text-slate-800">
											{new Date(shift.startDatetime).toLocaleTimeString([], {
												hour: "2-digit",
												minute: "2-digit",
											})}
											-
											{new Date(shift.endDatetime).toLocaleTimeString([], {
												hour: "2-digit",
												minute: "2-digit",
											})}
										</div>
										<div className="text-xs font-bold text-slate-500 uppercase">
											{shift.shiftType?.name || "Vlastní směna"} •{" "}
											{shift.jobPosition.name}
										</div>
									</div>
								</div>

								<div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
									<div>
										{isMine ? (
											<span className="text-[10px] font-black uppercase bg-brand-secondary/15 text-brand-secondary px-2 py-1 rounded-md">
												Já
											</span>
										) : (
											<span className="text-xs font-bold text-slate-600">
												{shift.assignedUser?.fullName || "Volno"}
											</span>
										)}
									</div>

									{/* Tlačítka burzy — pouze pro budoucí směny */}
									{!isPast && (
										<>
											{isMine && !isOnMarket && canOffer && (
												<button
													onClick={() => handleOfferShift(shift.id)}
													className="px-3 py-1.5 bg-amber-100 text-amber-700 text-[10px] font-black uppercase rounded-lg border border-amber-200 hover:bg-amber-200 transition-colors">
													♻️ Nabídnout
												</button>
											)}
											{isMine && isOnMarket && (
												<span className="px-3 py-1.5 bg-slate-100 text-slate-500 text-[10px] font-black uppercase rounded-lg border border-slate-200">
													⏳ Nabízeno
												</span>
											)}
											{!isMine && isOnMarket && (
												<button
													onClick={() => handleTakeShift(shift.id)}
													className="px-3 py-1.5 bg-green-500 text-white text-[10px] font-black uppercase rounded-lg shadow-green-200 hover:bg-green-600 transition-colors animate-pulse">
													✋ Vzít si
												</button>
											)}
										</>
									)}
								</div>
							</div>
						);
					})}
				</div>
			</div>
		);
	};

	return (
		<div className="p-4 md:p-8 max-w-3xl mx-auto min-h-screen">
			{/* HLAVIČKA */}
			<div className="flex flex-col items-center justify-center gap-4 mb-6">
				<div className="bg-slate-100 p-1 rounded-xl flex shadow-inner">
					<button
						onClick={() => setViewMode("MINE")}
						className={`px-6 py-2 rounded-lg text-sm font-black uppercase transition-all ${viewMode === "MINE" ? "bg-white text-brand-secondary shadow-sm" : "text-slate-400 hover:text-slate-600"}`}>
						Moje směny
					</button>
					<button
						onClick={() => setViewMode("ALL")}
						className={`px-6 py-2 rounded-lg text-sm font-black uppercase transition-all ${viewMode === "ALL" ? "bg-white text-brand-secondary shadow-sm" : "text-slate-400 hover:text-slate-600"}`}>
						Celý tým
					</button>
				</div>

				<div className="flex items-center gap-6 bg-white p-2 rounded-full shadow-sm border border-slate-100">
					<button onClick={() => moveMonth(-1)} className="p-2">←</button>
					<span className="font-bold">{monthNames[viewDate.month - 1]}</span>
					<button onClick={() => moveMonth(1)} className="p-2">→</button>
				</div>

				{!loading && (
					<div className="bg-brand-secondary/10 text-brand-secondary px-6 py-2 rounded-xl text-sm font-bold border border-brand-secondary/20">
						Můj fond:{" "}
						<span className="text-lg font-black">{myTotalHours.toFixed(1)}</span>{" "}
						hod
					</div>
				)}
			</div>

			{loading ? (
				<div className="text-center py-16 text-slate-400 text-sm">Načítám směny...</div>
			) : (
				<div className="space-y-6">
					{/* NADCHÁZEJÍCÍ SMĚNY */}
					{upcomingDays.length > 0 ? (
						upcomingDays.map((dg) => renderDayGroup(dg, false))
					) : (
						<div className="text-center py-10 text-slate-400 text-sm">
							Žádné nadcházející směny.
						</div>
					)}

					{/* PROBĚHLÉ SMĚNY */}
					{pastDays.length > 0 && (
						<>
							<div className="flex items-center gap-3 pt-4">
								<div className="h-px flex-1 bg-slate-200" />
								<span className="text-[10px] font-black uppercase text-slate-400 tracking-widest whitespace-nowrap">
									Proběhlé směny
								</span>
								<div className="h-px flex-1 bg-slate-200" />
							</div>
							{pastDays.map((dg) => renderDayGroup(dg, true))}
						</>
					)}
				</div>
			)}
		</div>
	);
}
