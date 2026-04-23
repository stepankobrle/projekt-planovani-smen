"use client";

import React, { useEffect, useState, useMemo } from "react";
import api from "@/lib/api";
import { useAuth } from "@/app/components/ProtectedRoute";
import { PageContainer, HeroHeader, OverlapPanel } from "@/app/components/AdminLayout";
import "@/app/(dashboard)/(admin)/admin/dashboard/dashboard.css";
import { Calendar, ChevronLeft, ChevronRight, ChevronDown, CheckCircle2, User, Users, RefreshCw } from "lucide-react";

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
	const [showMonthPicker, setShowMonthPicker] = useState(false);
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

		const weekdayLong = dateObj.toLocaleDateString("cs-CZ", { weekday: "long" });
		const dayNum = dateObj.getDate();
		const monthNum = dateObj.getMonth() + 1;

		return (
			<div key={dayGroup.date} className="mb-6">
				<div className="sticky top-0 z-10 flex items-center gap-4 mb-4 bg-[#F0F7F4]/90 backdrop-blur-md py-2 border-y border-[#DDF0E8]/50">
					<div className="flex items-baseline gap-2">
						<span className="text-xl font-extrabold text-[#1C4E5A]">{dayNum}.{monthNum}.</span>
						<span className={`text-[11px] font-bold uppercase tracking-widest ${isToday ? "text-[#C85A30]" : "text-[#9ABABA]"}`}>
							{isToday ? "Dnes" : weekdayLong}
						</span>
					</div>
					<div className="h-px flex-1 bg-gradient-to-r from-[#DDF0E8] to-transparent"></div>
				</div>

				<div className="grid gap-3">
					{dayGroup.shifts.map((shift, i) => {
						const isMine = shift.assignedUserId === user?.id;
						const isOnMarket = shift.isMarketplace;
						const canOffer = canOfferShift(shift);

						let containerClasses = "bg-white border-[#DDF0E8]";
						let shadowClasses = "shadow-sm";

						if (isPast) {
							containerClasses = isMine
								? "bg-[rgba(255,255,255,.6)] border-[#DDF0E8]"
								: "bg-[rgba(255,255,255,.4)] border-transparent";
							shadowClasses = "shadow-none";
						} else if (isOnMarket && !isMine) {
							containerClasses = "bg-[#FDEEDC] border-[#E69D45]";
							shadowClasses = "shadow-md shadow-[#E69D45]/10";
						} else if (isMine) {
							containerClasses = "bg-[#E6F2EE] border-[#68B2A0]";
							shadowClasses = "shadow-md shadow-[#68B2A0]/10";
						}

						return (
							<div
								key={shift.id}
								className={`a-fade p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-300 hover:-translate-y-1 ${containerClasses} ${shadowClasses}`}
								style={{ "--d": `${i * 30}ms` } as React.CSSProperties}>
								
								<div className="flex items-stretch gap-4">
									<div
										className="w-1.5 rounded-full flex-shrink-0"
										style={{ backgroundColor: shift.shiftType?.colorCode || "#C5DED9" }}
									/>
									<div>
										<div className={`text-lg font-extrabold tracking-tight ${isPast ? "text-[#5A8A8A]" : "text-[#0F2E35]"}`}>
											{new Date(shift.startDatetime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
											{" – "}
											{new Date(shift.endDatetime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
										</div>
										<div className="text-[10px] font-black uppercase tracking-widest text-[#9ABABA] mt-0.5">
											{shift.shiftType?.name || "Vlastní směna"} • {shift.jobPosition.name}
										</div>
									</div>
								</div>

								<div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
									<div className="flex items-center gap-2">
										{isMine ? (
											<span className="flex items-center gap-1.5 text-[10px] font-black uppercase bg-[#2C6975] text-white px-2.5 py-1.5 rounded-lg shadow-sm">
												<User size={12} /> Moje směna
											</span>
										) : isOnMarket ? (
											<span className="flex items-center gap-1.5 text-[10px] font-black uppercase bg-white text-[#C85A30] border border-[#E69D45] px-2.5 py-1.5 rounded-lg shadow-sm">
												<RefreshCw size={12} /> Na burze
											</span>
										) : (
											<span className="flex items-center gap-1.5 text-[11px] font-bold text-[#5A8A8A]">
												<Users size={12} className="text-[#9ABABA]" /> {shift.assignedUser?.fullName || "Volno"}
											</span>
										)}
									</div>

									{!isPast && (
										<div className="flex gap-2">
											{isMine && !isOnMarket && canOffer && (
												<button
													onClick={() => handleOfferShift(shift.id)}
													className="px-4 py-2 border text-[10px] font-black uppercase tracking-wider rounded-xl transition-all hover:bg-[#FDEEDC] hover:text-[#C85A30] hover:border-[#E69D45] bg-white text-[#5A8A8A] border-[#DDF0E8]">
													Nabídnout
												</button>
											)}
											{isMine && isOnMarket && (
												<span className="px-4 py-2 bg-white text-[#C85A30] text-[10px] font-black uppercase tracking-wider rounded-xl border border-[#E69D45] shadow-sm">
													⏳ Nabízeno
												</span>
											)}
											{!isMine && isOnMarket && (
												<button
													onClick={() => handleTakeShift(shift.id)}
													className="px-4 py-2 bg-[#C85A30] text-white text-[10px] font-black uppercase tracking-wider rounded-xl shadow-[0_4px_12px_rgba(200,90,48,.25)] hover:brightness-110 active:scale-95 transition-all">
													Vzít si
												</button>
											)}
										</div>
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
		<PageContainer>
			<HeroHeader subtitle="Měsíční přehled" title="Moje směny a burza" />

			<OverlapPanel delay="100ms">
				<div className="flex flex-col md:flex-row items-center justify-between w-full gap-4">
					<div className="flex bg-[#F0F7F4] p-1 rounded-xl">
						<button
							onClick={() => setViewMode("MINE")}
							className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${viewMode === "MINE" ? "bg-white text-[#2C6975] shadow-sm" : "text-[#9ABABA] hover:bg-white/50"}`}>
							Moje směny
						</button>
						<button
							onClick={() => setViewMode("ALL")}
							className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${viewMode === "ALL" ? "bg-white text-[#2C6975] shadow-sm" : "text-[#9ABABA] hover:bg-white/50"}`}>
							Celý tým
						</button>
					</div>

					<div className="flex items-center gap-2">
						<button onClick={() => moveMonth(-1)} className="p-2 rounded-xl text-[#5A8A8A] hover:bg-[#E6F2EE] transition-colors"><ChevronLeft size={18} /></button>
						<div className="relative">
							<button onClick={() => setShowMonthPicker((v) => !v)} className="flex items-center gap-2 px-6 py-2.5 rounded-xl border font-bold uppercase tracking-widest text-[#0F2E35] transition-all hover:bg-[#F0F7F4]" style={{ borderColor: "#DDF0E8" }}>
								<Calendar size={16} className="text-[#68B2A0]" />
								{monthNames[viewDate.month - 1]} {viewDate.year}
								<ChevronDown size={14} className="text-[#9ABABA] ml-1" />
							</button>
							{showMonthPicker && (
								<div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 bg-white rounded-2xl shadow-xl border p-4 w-72 origin-top" style={{ borderColor: "#DDF0E8" }}>
									<div className="flex items-center justify-between mb-3">
										<button onClick={() => setViewDate((prev) => ({ ...prev, year: prev.year - 1 }))} className="p-1.5 rounded-lg text-[#5A8A8A] hover:bg-[#F0F7F4] font-bold text-sm"><ChevronLeft size={16} /></button>
										<span className="font-black text-[#0F2E35] text-sm">{viewDate.year}</span>
										<button onClick={() => setViewDate((prev) => ({ ...prev, year: prev.year + 1 }))} className="p-1.5 rounded-lg text-[#5A8A8A] hover:bg-[#F0F7F4] font-bold text-sm"><ChevronRight size={16} /></button>
									</div>
									<div className="grid grid-cols-3 gap-1.5">
										{monthNames.map((name, idx) => (
											<button
												key={idx}
												onClick={() => {
													setViewDate((prev) => ({ ...prev, month: idx + 1 }));
													setShowMonthPicker(false);
												}}
												className={`py-2 rounded-xl text-xs font-black uppercase tracking-tight transition-all ${
													viewDate.month === idx + 1
														? "bg-[#2C6975] text-white shadow-md shadow-[#2C6975]/30"
														: "text-[#5A8A8A] hover:bg-[#F0F7F4]"
												}`}>
												{name.substring(0, 3)}
											</button>
										))}
									</div>
								</div>
							)}
						</div>
						<button onClick={() => moveMonth(1)} className="p-2 rounded-xl text-[#5A8A8A] hover:bg-[#E6F2EE] transition-colors"><ChevronRight size={18} /></button>
					</div>
					
					<div className="flex items-center bg-[rgba(104,178,160,.1)] border border-[rgba(104,178,160,.2)] px-5 py-2.5 rounded-xl gap-2 text-[#2C6975]">
						<span className="text-[10px] font-black tracking-widest uppercase">Můj fond</span>
						<span className="text-sm font-extrabold">{myTotalHours.toFixed(1)} h</span>
					</div>
				</div>
			</OverlapPanel>

			<div className="flex-1 px-6 md:px-24 md:pb-11 flex flex-col pt-2 min-h-0 relative z-10 w-full max-w-[1200px] mx-auto">
				{loading ? (
					<div className="text-center py-20 font-black tracking-widest uppercase text-[#9ABABA] text-[10px] animate-pulse">
						Načítám směny...
					</div>
				) : (
					<div className="space-y-6">
						{/* NADCHÁZEJÍCÍ SMĚNY */}
						{upcomingDays.length > 0 ? (
							upcomingDays.map((dg) => renderDayGroup(dg, false))
						) : (
							<div className="text-center py-10 font-bold uppercase tracking-widest text-[#9ABABA] text-[10px] a-up">
								Žádné nadcházející směny.
							</div>
						)}

						{/* PROBĚHLÉ SMĚNY */}
						{pastDays.length > 0 && (
							<div className="opacity-70 grayscale-[0.2]">
								<div className="flex items-center gap-3 pt-6 mb-6">
									<div className="h-px flex-1 bg-[#DDF0E8]" />
									<span className="text-[10px] font-black uppercase text-[#9ABABA] tracking-widest whitespace-nowrap">
										Proběhlé směny
									</span>
									<div className="h-px flex-1 bg-[#DDF0E8]" />
								</div>
								{pastDays.map((dg) => renderDayGroup(dg, true))}
							</div>
						)}
					</div>
				)}
			</div>
		</PageContainer>
	);
}
