"use client";

import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/app/components/ProtectedRoute";

// --- INTERFACES ---
interface Shift {
	id: string;
	startDatetime: string;
	endDatetime: string;
	assignedUser?: { id: string; email: string; fullName: string } | null;
	shiftType: { id: number; name: string; colorCode: string };
	jobPositionId: number;
	isMarketplace: boolean;
}

interface ScheduleGroup {
	id: string;
	year: number;
	month: number;
	status: "DRAFT" | "PREFERENCES" | "GENERATED" | "PUBLISHED";
	calendarDays: string[];
	shifts: Shift[];
}

export default function AdminMonthlySchedulePage() {
	const params = useParams();
	const router = useRouter();
	const { role } = useAuth();

	// STAVY
	const [viewDate, setViewDate] = useState({
		year: new Date().getFullYear(),
		month: new Date().getMonth() + 1,
	});
	const [data, setData] = useState<ScheduleGroup | null>(null);
	const [loading, setLoading] = useState(true);
	const [generating, setGenerating] = useState(false); // Stav pro loader generování
	const [shiftTypes, setShiftTypes] = useState<any[]>([]);
	const [positions, setPositions] = useState<any[]>([]);
	const [users, setUsers] = useState<any[]>([]);

	// KOMBINOVANÝ STAV PRO MODÁL (ADD/EDIT)
	const [modal, setModal] = useState({
		isOpen: false,
		editId: null as string | null, // null = ADD, string = EDIT
		date: "",
		shiftTypeId: "" as string | number,
		jobPositionId: 1,
		assignedUserId: "",
		startDatetime: "08:00",
		endDatetime: "16:00",
		showCustomTimes: false,
	});

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

	// Načítání rozvrhu
	const fetchSchedule = useCallback(async () => {
		try {
			// setLoading(true); // Zde zakomentováno, aby to neproblikávalo při každém refreshi
			const res = await axios.get(
				`http://localhost:3001/schedule-groups/find`,
				{
					params: {
						locationId: params.id,
						year: viewDate.year,
						month: viewDate.month,
					},
					withCredentials: true,
				},
			);
			setData(res.data);
		} catch (err) {
			console.error("Chyba při načítání rozvrhu:", err);
			setData(null);
		} finally {
			setLoading(false);
		}
	}, [params.id, viewDate]);

	useEffect(() => {
		setLoading(true); // Loading jen při změně data
		fetchSchedule();
		const fetchHelpers = async () => {
			try {
				const [resTypes, resPos, resUsers] = await Promise.all([
					axios.get(`http://localhost:3001/shift-types`, {
						withCredentials: true,
					}),
					axios.get(`http://localhost:3001/job-positions`, {
						withCredentials: true,
					}),
					axios.get(
						`http://localhost:3001/shifts/available-employees/${params.id}`,
						{ withCredentials: true },
					),
				]);
				setShiftTypes(resTypes.data);
				setPositions(resPos.data);
				setUsers(resUsers.data);
			} catch (e) {
				console.error("Chyba pomocných dat", e);
			}
		};
		fetchHelpers();
	}, [viewDate, params.id, fetchSchedule]);

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

	const handleInitMonth = async () => {
		try {
			setLoading(true);
			const res = await axios.post(
				`http://localhost:3001/schedule-groups/init-next`,
				{ locationId: Number(params.id) },
				{ withCredentials: true },
			);
			setViewDate({ year: res.data.year, month: res.data.month });
			setTimeout(() => fetchSchedule(), 100);
		} catch (err) {
			alert("Chyba při inicializaci.");
		} finally {
			setLoading(false);
		}
	};

	// --- NOVÁ FUNKCE PRO AUTOMATICKÉ GENEROVÁNÍ ---
	const handleAutoGenerate = async () => {
		if (!data?.id) return;
		const confirm = window.confirm(
			"Opravdu chcete spustit automatické generování? \n\nTato akce přiřadí zaměstnance na volné směny podle jejich preferencí a zákonných limitů.",
		);
		if (!confirm) return;

		try {
			setGenerating(true);
			const response = await axios.post(
				`http://localhost:3001/schedule-groups/${data.id}/auto-assign`,
				{},
				{ withCredentials: true },
			);
			alert(response.data.message);
			fetchSchedule(); // Obnovit kalendář
		} catch (err) {
			console.error("Chyba generování:", err);
			alert("Nepodařilo se vygenerovat rozvrh.");
		} finally {
			setGenerating(false);
		}
	};

	const handleChangeStatus = async (
		newStatus: "DRAFT" | "PREFERENCES" | "GENERATED" | "PUBLISHED",
	) => {
		if (!data?.id) return;
		if (!confirm(`Opravdu chcete změnit stav rozvrhu na ${newStatus}?`)) return;

		try {
			await axios.patch(
				`http://localhost:3001/schedule-groups/${data.id}/status`,
				{ status: newStatus },
				{ withCredentials: true },
			);
			fetchSchedule();
		} catch (err) {
			alert("Nepodařilo se změnit stav rozvrhu.");
		}
	};

	// OTEVŘENÍ MODÁLU PRO EDITACI
	const handleEditShift = (shift: Shift) => {
		const start = new Date(shift.startDatetime);
		const end = new Date(shift.endDatetime);

		setModal({
			isOpen: true,
			editId: shift.id,
			date: shift.startDatetime.split("T")[0],
			shiftTypeId: shift.shiftType?.id || "vlastni",
			jobPositionId: shift.jobPositionId,
			assignedUserId: shift.assignedUser?.id || "",
			startDatetime: start.toLocaleTimeString("cs-CZ", {
				hour: "2-digit",
				minute: "2-digit",
			}),
			endDatetime: end.toLocaleTimeString("cs-CZ", {
				hour: "2-digit",
				minute: "2-digit",
			}),
			showCustomTimes: !shift.shiftType,
		});
	};

	// MAZÁNÍ SMĚNY
	const handleDeleteShift = async () => {
		if (!modal.editId) return;
		if (!confirm("Opravdu chcete tuto směnu smazat?")) return;

		try {
			await axios.delete(`http://localhost:3001/shifts/${modal.editId}`, {
				withCredentials: true,
			});
			setModal({ ...modal, isOpen: false });
			fetchSchedule();
		} catch (err) {
			alert("Chyba při mazání směny");
		}
	};

	// SPOLEČNÉ ODESLÁNÍ (POST / PATCH)
	const handleShiftSubmit = async () => {
		try {
			const payload = {
				scheduleGroupId: data?.id,
				locationId: Number(params.id),
				date: modal.date,
				shiftTypeId:
					modal.shiftTypeId === "vlastni" ? null : Number(modal.shiftTypeId),
				jobPositionId: Number(modal.jobPositionId),
				assignedUserId: modal.assignedUserId || null,
				startTime: modal.showCustomTimes ? modal.startDatetime : undefined,
				endTime: modal.showCustomTimes ? modal.endDatetime : undefined,
				count: 1,
			};

			if (modal.editId) {
				await axios.patch(
					`http://localhost:3001/shifts/${modal.editId}`,
					payload,
					{ withCredentials: true },
				);
			} else {
				await axios.post(`http://localhost:3001/shifts`, payload, {
					withCredentials: true,
				});
			}

			setModal({ ...modal, isOpen: false });
			fetchSchedule();
		} catch (err) {
			alert("Chyba při ukládání směny");
		}
	};

	const renderShiftsByPosition = (day: string) => {
		const dayShifts =
			data?.shifts.filter((s) => s.startDatetime.startsWith(day)) || [];
		const grouped = dayShifts.reduce((acc: any, shift) => {
			const posId = shift.jobPositionId;
			if (!acc[posId]) acc[posId] = [];
			acc[posId].push(shift);
			return acc;
		}, {});

		const activePositionIds = Object.keys(grouped);
		if (activePositionIds.length === 0) {
			return (
				<div className="py-4 text-center text-[10px] font-black uppercase text-slate-300 tracking-widest opacity-50">
					Žádné směny
				</div>
			);
		}

		return activePositionIds.map((posId) => {
			const posName =
				positions.find((p) => p.id === Number(posId))?.name || "Neznámá pozice";
			const shiftsInPos = grouped[posId];

			return (
				<div
					key={posId}
					className="flex items-center gap-4 border-b border-slate-100 py-4 last:border-0">
					<div className="w-32 shrink-0 bg-slate-200 p-4 rounded-xl text-center font-black uppercase text-[10px] text-slate-700">
						{posName}
					</div>
					<div className="flex flex-wrap gap-2">
						{shiftsInPos.map((s: any) => (
							<div
								key={s.id}
								onClick={() => handleEditShift(s)}
								className={`p-3 rounded-xl min-w-[140px] text-center shadow-sm cursor-pointer hover:scale-105 transition-all 
                                    ${s.assignedUser ? "bg-white border-2 border-indigo-100" : "bg-slate-100 border-2 border-transparent"}`}>
								<div className="text-[9px] font-black uppercase opacity-60">
									{new Date(s.startDatetime).toLocaleTimeString("cs-CZ", {
										hour: "2-digit",
										minute: "2-digit",
									})}{" "}
									-{" "}
									{new Date(s.endDatetime).toLocaleTimeString("cs-CZ", {
										hour: "2-digit",
										minute: "2-digit",
									})}
								</div>
								<div
									className={`text-[11px] font-bold truncate ${s.assignedUser ? "text-indigo-600" : "text-slate-400"}`}>
									{s.assignedUser?.fullName || "VOLNÝ SLOT"}
								</div>
							</div>
						))}
					</div>
				</div>
			);
		});
	};

	return (
		<div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8">
			<button
				onClick={() => router.push("/schedule")}
				className="text-[10px] font-black uppercase text-indigo-400 mb-4 block hover:text-indigo-600 transition-colors">
				← Zpět
			</button>

			<div className="max-w-[1200px] mx-auto mb-8 flex items-center justify-center gap-6 text-slate-800">
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

			<div className="max-w-[1200px] mx-auto">
				{loading ? (
					<div className="text-center py-20 font-black text-slate-300 animate-pulse uppercase tracking-widest">
						Načítám...
					</div>
				) : !data ? (
					<div className="bg-white rounded-[2rem] p-12 text-center border-2 border-dashed border-slate-200">
						<button
							onClick={handleInitMonth}
							className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
							+ Inicializovat {monthNames[viewDate.month - 1]}
						</button>
					</div>
				) : (
					<div className="space-y-8">
						{/* --- OVLÁDACÍ PANEL STATUSU --- */}
						<div className="flex flex-col items-center gap-4 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
							<div className="flex items-center gap-2">
								<span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
									Stav rozvrhu:
								</span>
								<span
									className={`px-3 py-1 rounded-full text-[10px] font-black uppercase 
                                    ${
																			data.status === "DRAFT"
																				? "bg-slate-100 text-slate-500"
																				: data.status === "PREFERENCES"
																					? "bg-indigo-100 text-indigo-600"
																					: "bg-green-100 text-green-600"
																		}`}>
									{data.status}
								</span>
							</div>

							{/* Tlačítka se mění podle stavu */}
							{data.status === "DRAFT" && (
								<button
									onClick={() => handleChangeStatus("PREFERENCES")}
									className="px-8 py-3 bg-indigo-600 text-white rounded-xl text-[11px] font-black uppercase shadow-lg hover:bg-indigo-700 transition-all transform hover:scale-105">
									🔓 Otevřít pro preference
								</button>
							)}

							{data.status === "PREFERENCES" && (
								<div className="flex gap-2">
									<button
										onClick={() => handleChangeStatus("DRAFT")}
										className="px-6 py-3 border border-slate-200 text-slate-400 rounded-xl text-[10px] font-black uppercase hover:bg-slate-50 transition-all">
										← Zpět na úpravy
									</button>

									{/* --- TLAČÍTKO PRO AUTOMATICKÉ GENEROVÁNÍ --- */}
									<button
										onClick={handleAutoGenerate}
										disabled={generating}
										className={`px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-[10px] font-black uppercase shadow-lg hover:shadow-xl transition-all flex items-center gap-2 ${generating ? "opacity-70 cursor-not-allowed" : "hover:scale-105"}`}>
										{generating ? (
											<>
												<svg
													className="animate-spin h-3 w-3 text-white"
													xmlns="http://www.w3.org/2000/svg"
													fill="none"
													viewBox="0 0 24 24">
													<circle
														className="opacity-25"
														cx="12"
														cy="12"
														r="10"
														stroke="currentColor"
														strokeWidth="4"></circle>
													<path
														className="opacity-75"
														fill="currentColor"
														d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
												</svg>
												Generuji...
											</>
										) : (
											<>🤖 Automaticky obsadit</>
										)}
									</button>

									<button
										onClick={() => handleChangeStatus("GENERATED")}
										className="px-6 py-3 bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase hover:bg-slate-700 transition-all shadow-lg">
										🔒 Uzavřít a Publikovat
									</button>
								</div>
							)}

							{/* Zobrazit tlačítko i pro GENERATED, kdyby chtěl admin přegenerovat znova */}
							{data.status === "GENERATED" && (
								<div className="flex gap-2">
									<button
										onClick={handleAutoGenerate}
										disabled={generating}
										className="px-6 py-3 border border-blue-200 text-blue-600 rounded-xl text-[10px] font-black uppercase hover:bg-blue-50 transition-all">
										{generating ? "Generuji..." : "🤖 Znovu přegenerovat"}
									</button>
									<button
										onClick={() => handleChangeStatus("PUBLISHED")}
										className="px-6 py-3 bg-green-600 text-white rounded-xl text-[10px] font-black uppercase hover:bg-green-700 transition-all shadow-lg">
										✓ Publikovat zaměstnancům
									</button>
								</div>
							)}
						</div>

						{/* --- KALENDÁŘ --- */}
						{data.calendarDays.map((day) => (
							<div
								key={day}
								className="bg-white rounded-[1.5rem] shadow-sm border border-slate-100 overflow-hidden">
								<div className="bg-slate-100 px-6 py-3 flex justify-between items-center border-b border-slate-200">
									<div className="font-black text-slate-600 uppercase text-xs tracking-wider">
										{new Date(day).toLocaleDateString("cs-CZ", {
											weekday: "short",
										})}{" "}
										{new Date(day).getDate()}.{new Date(day).getMonth() + 1}
									</div>
									<button
										onClick={() =>
											setModal({
												...modal,
												isOpen: true,
												editId: null,
												date: day,
												shiftTypeId: "",
												jobPositionId: 1,
												assignedUserId: "",
												startDatetime: "08:00",
												endDatetime: "16:00",
												showCustomTimes: false,
											})
										}
										className="text-[10px] font-black uppercase text-slate-400 hover:text-indigo-600 transition-colors">
										pridat směnu
									</button>
								</div>
								<div className="p-4 space-y-2">
									{renderShiftsByPosition(day)}
								</div>
							</div>
						))}
					</div>
				)}
			</div>

			{/* SPOLEČNÝ MODÁL (ADD / EDIT) - Beze změny */}
			{modal.isOpen && (
				<div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
					<div className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl">
						<div className="flex justify-between items-center mb-6">
							<h2 className="text-xl font-black uppercase text-slate-800 tracking-tight">
								{modal.editId ? "Upravit směnu" : "Přidat směnu"}
							</h2>
							{modal.editId && (
								<button
									onClick={handleDeleteShift}
									className="text-[10px] font-black uppercase text-red-500 hover:text-red-700 transition-colors underline decoration-2 underline-offset-4">
									Smazat směnu
								</button>
							)}
						</div>

						<div className="space-y-4">
							<div>
								<label className="text-[10px] font-black uppercase text-slate-400">
									Pozice
								</label>
								<select
									className="w-full mt-1 p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
									value={modal.jobPositionId}
									onChange={(e) =>
										setModal({
											...modal,
											jobPositionId: Number(e.target.value),
										})
									}>
									{positions.map((p) => (
										<option key={p.id} value={p.id}>
											{p.name}
										</option>
									))}
								</select>
							</div>
							<div>
								<label className="text-[10px] font-black uppercase text-slate-400">
									Typ směny
								</label>
								<select
									className="w-full mt-1 p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
									value={modal.shiftTypeId}
									onChange={(e) =>
										setModal({
											...modal,
											shiftTypeId: e.target.value,
											showCustomTimes: e.target.value === "vlastni",
										})
									}>
									<option value="">-- Vyberte --</option>
									{shiftTypes.map((t) => (
										<option key={t.id} value={t.id}>
											{t.name}
										</option>
									))}
									<option value="vlastni">VLASTNÍ ČAS</option>
								</select>
							</div>

							{modal.showCustomTimes && (
								<div className="grid grid-cols-2 gap-4 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
									<input
										type="time"
										value={modal.startDatetime}
										onChange={(e) =>
											setModal({ ...modal, startDatetime: e.target.value })
										}
										className="p-2 rounded-lg border border-slate-200 font-bold text-center outline-none focus:ring-2 focus:ring-indigo-500"
									/>
									<input
										type="time"
										value={modal.endDatetime}
										onChange={(e) =>
											setModal({ ...modal, endDatetime: e.target.value })
										}
										className="p-2 rounded-lg border border-slate-200 font-bold text-center outline-none focus:ring-2 focus:ring-indigo-500"
									/>
								</div>
							)}

							<div>
								<label className="text-[10px] font-black uppercase text-slate-400">
									Zaměstnanec (nepovinné)
								</label>
								<select
									className="w-full mt-1 p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
									value={modal.assignedUserId}
									onChange={(e) =>
										setModal({ ...modal, assignedUserId: e.target.value })
									}>
									<option value="">-- Nechat volné --</option>
									{users.map((u) => (
										<option key={u.id} value={u.id}>
											{u.fullName}
										</option>
									))}
								</select>
							</div>

							<div className="flex gap-2 pt-4">
								<button
									onClick={() => setModal({ ...modal, isOpen: false })}
									className="flex-1 py-3 font-black uppercase text-slate-400 text-xs hover:text-slate-600 transition-colors">
									Zavřít
								</button>
								<button
									onClick={handleShiftSubmit}
									className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-black uppercase text-xs shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">
									{modal.editId ? "Uložit změny" : "Vytvořit směnu"}
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
