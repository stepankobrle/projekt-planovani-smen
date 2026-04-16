"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/app/components/ProtectedRoute";
import { Lock, Clock, Calendar, ChevronLeft, ChevronRight, ChevronDown, Check, X, Star } from "lucide-react";
import { PageContainer, HeroHeader, OverlapPanel } from "@/app/components/AdminLayout";
import "@/app/(dashboard)/(admin)/admin/dashboard/dashboard.css";

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
	const [showMonthPicker, setShowMonthPicker] = useState(false);

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
		<PageContainer>
			<HeroHeader subtitle="Měsíční plánovaní" title="Moje preference" />

			<OverlapPanel delay="100ms">
				<div className="flex flex-col sm:flex-row items-center justify-center w-full gap-4">
					{/* NAVIGACE MĚSÍCE JAKO V ADMINU */}
					<div className="flex items-center gap-2">
						<button onClick={() => moveMonth(-1)} className="p-2 rounded-xl text-[#5A8A8A] hover:bg-[#E6F2EE] transition-colors"><ChevronLeft size={18} /></button>
						<div className="relative">
							<button onClick={() => setShowMonthPicker((v) => !v)} className="flex items-center gap-2 px-8 py-3 rounded-xl border font-bold uppercase tracking-widest text-[#0F2E35] transition-all hover:bg-[#F0F7F4]" style={{ borderColor: "#DDF0E8" }}>
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
				</div>
			</OverlapPanel>

			<div className="flex-1 px-6 md:px-24 md:pb-11 flex flex-col pt-2 min-h-0 relative z-10">
				{loading ? (
					<div className="text-center py-20 font-black tracking-widest uppercase text-[#9ABABA] text-[10px] animate-pulse">
						Načítám směny...
					</div>
				) : effectiveStatus === "DRAFT" ? (
					/* Rozvrh existuje, ale ještě nebyl otevřen pro preference */
					<div className="card max-w-lg mx-auto w-full p-12 text-center flex flex-col items-center gap-4 a-up">
						<div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-[#F0F7F4]">
							<Clock className="text-[#9ABABA]" size={28} />
						</div>
						<h2 className="text-sm font-extrabold text-[#0F2E35] uppercase tracking-wider">
							Zatím uzavřeno
						</h2>
						<p className="text-[11px] font-bold text-[#5A8A8A] leading-relaxed">
							Pro tento měsíc zatím nebyly otevřeny preference. Vyčkejte prosím, až obdržíte upozornění od administrátora.
						</p>
					</div>
				) : shifts.length === 0 ? (
					<div className="card max-w-lg mx-auto w-full p-12 text-center a-up border-dashed" style={{ borderColor: "#DDF0E8" }}>
						<p className="text-[10px] font-black uppercase tracking-widest text-[#9ABABA]">
							Žádné směny poptávané v aktuálním měsíci.
						</p>
					</div>
				) : (
					<div className="w-full">
						{/* Banner uzavřeného měsíce */}
						{isLocked && (
							<div className="a-fade flex gap-3 p-4 rounded-xl border bg-[rgba(200,90,48,.03)] text-[#C85A30] mb-6 max-w-sm" style={{ borderColor: 'rgba(200,90,48,.2)' }}>
								<Lock size={18} className="shrink-0" />
								<span className="font-bold text-[11px] uppercase tracking-wider mt-0.5">
									Měsíc je uzavřen. Volby jsou zablokovány.
								</span>
							</div>
						)}

						<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
							{shifts.map((group, index) => {
								const start = new Date(group.displayStart);
								const end = new Date(group.displayEnd);
								const locked = isLocked || group.isLocked;

								let containerBg = "#fff";
								let shadow = "0 8px 40px rgba(28,78,90,.04)";
								let ringStyle = "";

								if (group.userStatus === "AVAILABLE") {
									containerBg = "#E6F2EE";
									ringStyle = "inset 0 0 0 2px #68B2A0";
								} else if (group.userStatus === "PREFERRED") {
									containerBg = "#FDEEDC";
									ringStyle = "inset 0 0 0 2px #E69D45";
								} else if (group.userStatus === "UNAVAILABLE") {
									containerBg = "#F0F7F4";
								}

								return (
									<div
										key={index}
										className={`a-up relative p-6 rounded-3xl border transition-all duration-300 ${locked ? "opacity-75 grayscale-[0.3]" : "hover:-translate-y-1"}`}
										style={{ 
											background: containerBg, 
											borderColor: "#DDF0E8", 
											boxShadow: ringStyle || shadow,
											"--d": `${index * 30}ms` 
										} as React.CSSProperties}>
										
										<div className="flex justify-between items-start mb-6">
											<div>
												<div className="text-[10px] font-black uppercase text-[#9ABABA] tracking-widest mb-1.5 flex items-center gap-1.5">
													<Calendar size={12} />
													{start.toLocaleDateString("cs-CZ", {
														weekday: "short",
														day: "numeric",
														month: "numeric",
													})}
												</div>
												<div className="text-xl font-extrabold text-[#0F2E35] tracking-tight">
													{start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
													{" - "}
													{end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
												</div>
											</div>
											<span
												className="px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider shadow-sm"
												style={{ backgroundColor: group.shiftType?.colorCode || "#E6F2EE", color: "#0F2E35" }}>
												{group.shiftType?.name}
											</span>
										</div>

										<div className="grid grid-cols-4 gap-2">
											<button
												disabled={locked}
												onClick={() => handleVote(group.shiftIds, "UNAVAILABLE")}
												className={`col-span-1 h-11 rounded-xl transition-all flex items-center justify-center active:scale-95 disabled:active:scale-100 disabled:cursor-not-allowed border
													${group.userStatus === "UNAVAILABLE" ? "bg-[#C85A30] border-transparent text-white shadow-md shadow-[#C85A30]/30" : "bg-white border-[#DDF0E8] text-[#9ABABA] hover:border-[#C85A30] hover:text-[#C85A30]"}`}>
												<X size={18} strokeWidth={3} />
											</button>
											
											<button
												disabled={locked}
												onClick={() => handleVote(group.shiftIds, "AVAILABLE")}
												className={`col-span-2 h-11 rounded-xl font-black uppercase text-[10px] tracking-wider transition-all flex justify-center items-center gap-1.5 border active:scale-95 disabled:active:scale-100 disabled:cursor-not-allowed
													${group.userStatus === "AVAILABLE" ? "bg-[#68B2A0] border-transparent text-white shadow-md shadow-[#68B2A0]/30" : "bg-white border-[#DDF0E8] text-[#5A8A8A] hover:border-[#68B2A0] hover:text-[#68B2A0]"}`}>
												{group.userStatus === "AVAILABLE" ? <><Check size={14} strokeWidth={3} /> Vybráno</> : "Můžu"}
											</button>
											
											<button
												disabled={locked}
												onClick={() => handleVote(group.shiftIds, "PREFERRED")}
												className={`col-span-1 h-11 rounded-xl transition-all flex items-center justify-center active:scale-95 disabled:active:scale-100 disabled:cursor-not-allowed border
													${group.userStatus === "PREFERRED" ? "bg-[#E69D45] border-transparent text-white shadow-md shadow-[#E69D45]/30" : "bg-white border-[#DDF0E8] text-[#E69D45] opacity-50 hover:opacity-100 hover:border-[#E69D45]"}`}>
												<Star size={18} strokeWidth={locked ? 2.5 : 3} fill={group.userStatus === "PREFERRED" ? "currentColor" : "none"} />
											</button>
										</div>
									</div>
								);
							})}
						</div>
					</div>
				)}
			</div>
		</PageContainer>
	);
}
