"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import api from "@/lib/api";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { CalendarPdfDocument } from "@/app/components/pdf/CalendarPdfDocument";
import * as ics from "ics";
import { StatusPanel } from "./_components/StatusPanel";
import { DayCard } from "./_components/DayCard";
import { ShiftModal } from "./_components/ShiftModal";
import type { Shift, ScheduleGroup, ScheduleStatus, ModalState, PositionColor } from "./_components/types";

// --- KONSTANTY NA ÚROVNI MODULU ---

const PDFDownloadLink = dynamic(
	() => import("@react-pdf/renderer").then((mod) => mod.PDFDownloadLink),
	{ ssr: false, loading: () => <button>Načítám PDF...</button> },
);

const MONTH_NAMES = [
	"Leden", "Únor", "Březen", "Duben", "Květen", "Červen",
	"Červenec", "Srpen", "Září", "Říjen", "Listopad", "Prosinec",
];

const POSITION_COLOR_PALETTE: PositionColor[] = [
	{ row: "#e4f2f0", badge: "#b8d8d4", text: "#1a403c", border: "#7ab0aa" }, // zelená
	{ row: "#edf1f6", badge: "#c8d6e4", text: "#3d5570", border: "#9ab0c8" }, // světlá slate
];

const DEFAULT_MODAL: ModalState = {
	isOpen: false,
	editId: null,
	date: "",
	shiftTypeId: "",
	jobPositionId: 1,
	assignedUserId: "",
	startDatetime: "08:00",
	endDatetime: "16:00",
	showCustomTimes: false,
};

// ---

export default function AdminMonthlySchedulePage() {
	const params = useParams();

	const [viewDate, setViewDate] = useState({
		year: new Date().getFullYear(),
		month: new Date().getMonth() + 1,
	});
	const [data, setData] = useState<ScheduleGroup | null>(null);
	const [loading, setLoading] = useState(true);
	const [generating, setGenerating] = useState(false);
	const [showPastConfirm, setShowPastConfirm] = useState(false);
	const [showMonthPicker, setShowMonthPicker] = useState(false);
	const monthPickerRef = useRef<HTMLDivElement>(null);
	const [shiftTypes, setShiftTypes] = useState<any[]>([]);
	const [positions, setPositions] = useState<any[]>([]);
	const [users, setUsers] = useState<any[]>([]);
	const [modal, setModal] = useState<ModalState>(DEFAULT_MODAL);

	// Načítání rozvrhu – spouští se při změně viewDate (přes fetchSchedule useCallback)
	const fetchSchedule = useCallback(async () => {
		try {
			const res = await api.get("/schedule-groups/find", {
				params: { locationId: params.id, year: viewDate.year, month: viewDate.month },
			});
			setData(res.data);
		} catch {
			setData(null);
		} finally {
			setLoading(false);
		}
	}, [params.id, viewDate]);

	useEffect(() => {
		setLoading(true);
		fetchSchedule();
	}, [fetchSchedule]);

	// Statická pomocná data – načteme jen jednou při mount
	useEffect(() => {
		const fetchHelpers = async () => {
			try {
				const [resTypes, resPos] = await Promise.all([
					api.get("/shift-types"),
					api.get("/job-positions"),
				]);
				setShiftTypes(resTypes.data);
				setPositions(resPos.data);
			} catch (e) {
				console.error("Chyba pomocných dat", e);
			}
		};
		fetchHelpers();
	}, []);

	// Zavírání month pickeru při kliknutí mimo
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (monthPickerRef.current && !monthPickerRef.current.contains(event.target as Node)) {
				setShowMonthPicker(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	// Načtení dostupných zaměstnanců při otevření modálu
	useEffect(() => {
		if (!modal.isOpen) return;
		api
			.get(`/shifts/available-employees/${params.id}`)
			.then((res) => setUsers(res.data))
			.catch((e) => console.error("Chyba načítání zaměstnanců:", e));
	}, [modal.isOpen, params.id]);

	const moveMonth = (step: number) => {
		setViewDate((prev) => {
			let newMonth = prev.month + step;
			let newYear = prev.year;
			if (newMonth > 12) { newMonth = 1; newYear++; }
			if (newMonth < 1) { newMonth = 12; newYear--; }
			return { year: newYear, month: newMonth };
		});
	};

	const handleInitMonth = async () => {
		try {
			setLoading(true);
			const res = await api.post("/schedule-groups/init-next", {
				locationId: Number(params.id),
			});
			// setViewDate změní viewDate → useEffect zavolá fetchSchedule automaticky
			setViewDate({ year: res.data.year, month: res.data.month });
		} catch {
			alert("Chyba při inicializaci.");
			setLoading(false);
		}
	};

	const handleAutoGenerate = async () => {
		if (!data?.id) return;
		if (!window.confirm("Opravdu chcete spustit automatické generování? \n\nTato akce přiřadí zaměstnance na volné směny podle jejich preferencí a zákonných limitů.")) return;

		try {
			setGenerating(true);
			const response = await api.post(`/schedule-groups/${data.id}/auto-assign`, {});
			alert(response.data.message);
			fetchSchedule();
		} catch {
			alert("Nepodařilo se vygenerovat rozvrh.");
		} finally {
			setGenerating(false);
		}
	};

	const handleChangeStatus = async (newStatus: ScheduleStatus) => {
		if (!data?.id) return;
		if (!confirm(`Opravdu chcete změnit stav rozvrhu na ${newStatus}?`)) return;

		try {
			await api.patch(`/schedule-groups/${data.id}/status`, { status: newStatus });
			fetchSchedule();
		} catch {
			alert("Nepodařilo se změnit stav rozvrhu.");
		}
	};

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
			startDatetime: start.toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" }),
			endDatetime: end.toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" }),
			showCustomTimes: !shift.shiftType,
		});
	};

	const handleAddShift = (day: string) => {
		setModal({ ...DEFAULT_MODAL, isOpen: true, date: day });
	};

	const handleModalClose = () => {
		setModal(DEFAULT_MODAL);
		setShowPastConfirm(false);
	};

	const handleDeleteShift = async () => {
		if (!modal.editId) return;
		if (!confirm("Opravdu chcete tuto směnu smazat?")) return;

		try {
			await api.delete(`/shifts/${modal.editId}`);
			setModal(DEFAULT_MODAL);
			fetchSchedule();
		} catch {
			alert("Chyba při mazání směny");
		}
	};

	const handleShiftSubmit = async () => {
		try {
			const payload = {
				scheduleGroupId: data?.id,
				locationId: Number(params.id),
				date: modal.date,
				shiftTypeId: modal.shiftTypeId === "vlastni" ? null : Number(modal.shiftTypeId),
				jobPositionId: Number(modal.jobPositionId),
				assignedUserId: modal.assignedUserId || null,
				startTime: modal.showCustomTimes ? modal.startDatetime : undefined,
				endTime: modal.showCustomTimes ? modal.endDatetime : undefined,
				count: 1,
			};

			if (modal.editId) {
				await api.patch(`/shifts/${modal.editId}`, payload);
			} else {
				await api.post("/shifts", payload);
			}

			setModal(DEFAULT_MODAL);
			fetchSchedule();
		} catch {
			alert("Chyba při ukládání směny");
		}
	};

	const handleSaveClick = () => {
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		if (new Date(modal.date) < today && !showPastConfirm) {
			setShowPastConfirm(true);
			return;
		}
		handleShiftSubmit();
	};

	const handleExportIcs = () => {
		if (!data?.shifts) return;

		const events: ics.EventAttributes[] = data.shifts.map((shift) => {
			const start = new Date(shift.startDatetime);
			const end = new Date(shift.endDatetime);
			return {
				start: [start.getFullYear(), start.getMonth() + 1, start.getDate(), start.getHours(), start.getMinutes()],
				end: [end.getFullYear(), end.getMonth() + 1, end.getDate(), end.getHours(), end.getMinutes()],
				title: `${shift.jobPosition?.name || "Pozice"}: ${shift.assignedUser?.fullName || "VOLNO"}`,
				description: `Typ: ${shift.shiftType?.name || "Směna"}`,
				location: shift.location?.name || "Neznámá lokace",
				status: "CONFIRMED",
				busyStatus: "BUSY",
			};
		});

		ics.createEvents(events, (_error, value) => {
			if (value) {
				const blob = new Blob([value], { type: "text/calendar;charset=utf-8" });
				const url = window.URL.createObjectURL(blob);
				const link = document.createElement("a");
				link.href = url;
				link.setAttribute("download", "export.ics");
				document.body.appendChild(link);
				link.click();
				document.body.removeChild(link);
			}
		});
	};

	return (
		<div className="max-w-[1200px] mx-auto space-y-6 py-2">
			{/* HEADER – export tlačítka */}
			<div className="flex justify-end items-center gap-2">
				<PDFDownloadLink
					document={
						<CalendarPdfDocument
							shifts={data?.shifts || []}
							month={MONTH_NAMES[viewDate.month - 1]}
							year={viewDate.year}
							monthIndex={viewDate.month}
						/>
					}
					fileName={`Rozpis_${viewDate.year}_${viewDate.month}.pdf`}>
					{/* @ts-ignore */}
					{({ loading: pdfLoading }) =>
						pdfLoading ? (
							<button disabled className="px-4 py-2 bg-slate-100 text-slate-400 rounded-xl text-xs font-black uppercase tracking-tight cursor-not-allowed">
								Generuji PDF...
							</button>
						) : (
							<button className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-tight hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-all shadow-sm flex items-center gap-1.5">
								📄 PDF
							</button>
						)
					}
				</PDFDownloadLink>
				<button
					onClick={handleExportIcs}
					className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-tight hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-all shadow-sm flex items-center gap-1.5 active:scale-95">
					📅 ICS
				</button>
			</div>

			{/* NAVIGACE MĚSÍCE */}
			<div className="flex items-center justify-center gap-3 sm:gap-6 text-slate-800">
				<button
					onClick={() => moveMonth(-1)}
					className="p-2 sm:p-3 bg-white rounded-full shadow-sm hover:bg-slate-50 transition-colors shrink-0">
					←
				</button>
				<div className="relative" ref={monthPickerRef}>
					<button
						onClick={() => setShowMonthPicker((v) => !v)}
						className="bg-white px-5 sm:px-12 py-3 sm:py-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center min-w-[150px] sm:min-w-[250px] hover:bg-slate-50 transition-colors">
						<span className="text-2xl font-black uppercase tracking-tighter">
							{MONTH_NAMES[viewDate.month - 1]} {viewDate.year}
						</span>
						<span className="text-[9px] font-bold uppercase text-slate-400 tracking-widest mt-0.5">
							▼ vybrat měsíc
						</span>
					</button>
					{showMonthPicker && (
						<div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 bg-white rounded-2xl shadow-xl border border-slate-100 p-4 w-72">
							<div className="flex items-center justify-between mb-3">
								<button
									onClick={() => setViewDate((prev) => ({ ...prev, year: prev.year - 1 }))}
									className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors font-bold text-slate-600 text-sm">
									←
								</button>
								<span className="font-black text-slate-800 text-sm">{viewDate.year}</span>
								<button
									onClick={() => setViewDate((prev) => ({ ...prev, year: prev.year + 1 }))}
									className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors font-bold text-slate-600 text-sm">
									→
								</button>
							</div>
							<div className="grid grid-cols-3 gap-1.5">
								{MONTH_NAMES.map((name, idx) => (
									<button
										key={idx}
										onClick={() => {
											setViewDate((prev) => ({ ...prev, month: idx + 1 }));
											setShowMonthPicker(false);
										}}
										className={`py-2 rounded-xl text-xs font-black uppercase tracking-tight transition-all hover:bg-indigo-50 hover:text-indigo-600 ${
											viewDate.month === idx + 1
												? "bg-indigo-600 text-white hover:bg-indigo-700 hover:text-white"
												: "text-slate-600"
										}`}>
										{name.substring(0, 3)}
									</button>
								))}
							</div>
						</div>
					)}
				</div>
				<button
					onClick={() => moveMonth(1)}
					className="p-3 bg-white rounded-full shadow-sm hover:bg-slate-50 transition-colors">
					→
				</button>
			</div>

			{/* HLAVNÍ OBSAH */}
			{loading ? (
				<div className="text-center py-20 font-black text-slate-300 animate-pulse uppercase tracking-widest">
					Načítám...
				</div>
			) : !data ? (
				<div className="bg-white rounded-[2rem] p-12 text-center border-2 border-dashed border-slate-200">
					<button
						onClick={handleInitMonth}
						className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
						+ Inicializovat {MONTH_NAMES[viewDate.month - 1]}
					</button>
				</div>
			) : (
				<div className="space-y-8">
					<StatusPanel
						status={data.status}
						generating={generating}
						onChangeStatus={handleChangeStatus}
						onAutoGenerate={handleAutoGenerate}
					/>
					{data.calendarDays.map((day) => (
						<DayCard
							key={day}
							day={day}
							shifts={data.shifts}
							positions={positions}
							colorPalette={POSITION_COLOR_PALETTE}
							onEditShift={handleEditShift}
							onAddShift={handleAddShift}
						/>
					))}
				</div>
			)}

			<ShiftModal
				modal={modal}
				setModal={setModal}
				showPastConfirm={showPastConfirm}
				setShowPastConfirm={setShowPastConfirm}
				positions={positions}
				shiftTypes={shiftTypes}
				users={users}
				onSaveClick={handleSaveClick}
				onDeleteShift={handleDeleteShift}
				onShiftSubmit={handleShiftSubmit}
				onClose={handleModalClose}
			/>
		</div>
	);
}
