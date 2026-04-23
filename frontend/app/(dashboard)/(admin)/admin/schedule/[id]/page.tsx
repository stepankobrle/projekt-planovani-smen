"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import api from "@/lib/api";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { Manrope } from "next/font/google";
import { CalendarPdfDocument } from "@/app/components/pdf/CalendarPdfDocument";
import * as ics from "ics";
import { StatusPanel } from "./_components/StatusPanel";
import { DayCard } from "./_components/DayCard";
import { ShiftModal } from "./_components/ShiftModal";
import type {
	Shift,
	ScheduleGroup,
	ScheduleStatus,
	ModalState,
	PositionColor,
} from "./_components/types";
import "./schedule.css";

// --- KONSTANTY NA ÚROVNI MODULU ---

const PDFDownloadLink = dynamic(
	() => import("@react-pdf/renderer").then((mod) => mod.PDFDownloadLink),
	{ ssr: false, loading: () => <span /> },
);

const manropeFont = Manrope({
	subsets: ["latin"],
	weight: ["400", "500", "600", "700", "800"],
	variable: "--font-mr",
});

const MONTH_NAMES = [
	"Leden", "Únor", "Březen", "Duben", "Květen", "Červen",
	"Červenec", "Srpen", "Září", "Říjen", "Listopad", "Prosinec",
];

const PHASE_DOT: Record<ScheduleStatus, string> = {
	DRAFT: "#9ABABA",
	PREFERENCES: "#F5A623",
	GENERATED: "#68B2A0",
	PUBLISHED: "#3EBD8A",
};

const STATUS_LABELS: Record<ScheduleStatus, string> = {
	DRAFT: "Koncept",
	PREFERENCES: "Sběr preferencí",
	GENERATED: "Vygenerováno",
	PUBLISHED: "Publikováno",
};

const POSITION_COLOR_PALETTE: PositionColor[] = [
	{ row: "#e4f2f0", badge: "#b8d8d4", text: "#1a403c", border: "#7ab0aa" },
	{ row: "#edf1f6", badge: "#c8d6e4", text: "#3d5570", border: "#9ab0c8" },
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

function MetricItem({
	label,
	value,
	delay,
	alert,
	alertSub,
	last,
}: {
	label: string;
	value: number;
	delay?: number;
	alert?: boolean;
	alertSub?: string;
	last?: boolean;
}) {
	return (
		<div
			className="a-up"
			style={
				{
					"--d": `${delay ?? 0}ms`,
					padding: "22px 28px",
					borderRight: last ? "none" : "1px solid #DDF0E8",
					display: "flex",
					flexDirection: "column",
					gap: 4,
				} as React.CSSProperties
			}>
			<span
				style={{
					fontSize: 10,
					fontWeight: 600,
					color: "#9ABABA",
					letterSpacing: "0.1em",
					textTransform: "uppercase",
				}}>
				{label}
			</span>
			<span
				className={alert ? "num-warn" : "num-grad"}
				style={{ fontSize: 32, fontWeight: 800, lineHeight: 1 }}>
				{value}
			</span>
			{alert && alertSub && (
				<span style={{ fontSize: 10, color: "#C85A30", fontWeight: 600 }}>
					{alertSub}
				</span>
			)}
		</div>
	);
}

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
	const pickerBtnRef = useRef<HTMLButtonElement>(null);
	const pickerDropdownRef = useRef<HTMLDivElement>(null);
	const [pickerPos, setPickerPos] = useState({ top: 0, right: 0 });
	const [shiftTypes, setShiftTypes] = useState<any[]>([]);
	const [positions, setPositions] = useState<any[]>([]);
	const [users, setUsers] = useState<any[]>([]);
	const [modal, setModal] = useState<ModalState>(DEFAULT_MODAL);

	const fetchSchedule = useCallback(async () => {
		try {
			const res = await api.get("/schedule-groups/find", {
				params: {
					locationId: params.id,
					year: viewDate.year,
					month: viewDate.month,
				},
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

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as Node;
			const insideBtn = monthPickerRef.current?.contains(target);
			const insideDropdown = pickerDropdownRef.current?.contains(target);
			if (!insideBtn && !insideDropdown) {
				setShowMonthPicker(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

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
			setViewDate({ year: res.data.year, month: res.data.month });
		} catch {
			alert("Chyba při inicializaci.");
			setLoading(false);
		}
	};

	const handleAutoGenerate = async () => {
		if (!data?.id) return;
		if (
			!window.confirm(
				"Opravdu chcete spustit automatické generování? \n\nTato akce přiřadí zaměstnance na volné směny podle jejich preferencí a zákonných limitů.",
			)
		)
			return;
		try {
			setGenerating(true);
			const response = await api.post(
				`/schedule-groups/${data.id}/auto-assign`,
				{},
			);
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

	// --- Výpočty ---
	const allShifts = data?.shifts ?? [];
	const assignedShifts = allShifts.filter((s) => s.assignedUser != null);
	const unassignedShifts = allShifts.filter((s) => s.assignedUser == null);
	const totalDays = data?.calendarDays?.length ?? 0;
	const dot = data?.status ? PHASE_DOT[data.status] : null;
	const statusLabel = data?.status ? STATUS_LABELS[data.status] : null;

	const root = `${manropeFont.variable}`;

	// --- Glassmorphism tlačítko pro hero ---
	const glassBtn: React.CSSProperties = {
		height: 40,
		borderRadius: 99,
		background: "rgba(255,255,255,.1)",
		border: "1px solid rgba(255,255,255,.15)",
		color: "rgba(255,255,255,.8)",
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		cursor: "pointer",
		backdropFilter: "blur(8px)",
		transition: "all .15s",
		fontFamily: "var(--font-mr), sans-serif",
		fontWeight: 700,
	};

	return (
		<div
			className={`${root} min-h-full flex flex-col`}
			style={{
				background: "#F0F7F4",
				color: "#0F2E35",
				fontFamily: "var(--font-mr), sans-serif",
			}}>

			{/* ══ HERO ═══════════════════════════════════════════════════════════ */}
			<div
				className="a-up px-6 py-12 md:pt-24 md:pb-16 md:px-24 bg-hero-gradient"
				style={
					{
						"--d": "0ms",
						position: "relative",
						flexShrink: 0,
					} as React.CSSProperties
				}>
				{/* Dekorativní kruhy */}
				<div style={{ position: "absolute", right: -80, top: "50%", transform: "translateY(-50%)", width: 320, height: 320, borderRadius: "50%", border: "1px solid rgba(104,178,160,.18)", pointerEvents: "none" }} />
				<div style={{ position: "absolute", right: -20, top: "50%", transform: "translateY(-50%)", width: 200, height: 200, borderRadius: "50%", border: "1px solid rgba(104,178,160,.12)", pointerEvents: "none" }} />
				<div style={{ position: "absolute", right: 40, top: "50%", transform: "translateY(-50%)", width: 100, height: 100, borderRadius: "50%", background: "radial-gradient(circle, rgba(104,178,160,.15) 0%, transparent 70%)", pointerEvents: "none" }} />
				<div style={{ position: "absolute", inset: 0, backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")", opacity: 0.03, pointerEvents: "none", mixBlendMode: "overlay" }} />

				<div className="relative flex flex-col md:flex-row md:items-start justify-between gap-6 md:gap-0">
					{/* Levá část – název */}
					<div>
						<p style={{ color: "rgba(205,224,201,.5)", fontSize: 11, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 10 }}>
							Shiftplanner · Admin
						</p>
						<h1 style={{ color: "#fff", lineHeight: 1.05 }}>
							<span style={{ display: "block", fontSize: 13, fontWeight: 400, color: "rgba(255,255,255,.45)", marginBottom: 4 }}>
								Rozvrh směn
							</span>
							<span className="block text-[32px] md:text-[38px] font-extrabold">
								{MONTH_NAMES[viewDate.month - 1]} {viewDate.year}
							</span>
						</h1>
					</div>

					{/* Pravá část – status, navigace, export */}
					<div className="flex flex-wrap items-center gap-2 shrink-0 pt-1">
						{/* Status badge */}
						{dot && statusLabel && (
							<div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.15)", borderRadius: 99, padding: "8px 16px", backdropFilter: "blur(8px)" }}>
								<span className="a-pulse" style={{ width: 7, height: 7, borderRadius: "50%", background: dot, boxShadow: `0 0 6px ${dot}`, flexShrink: 0 }} />
								<span style={{ color: "rgba(255,255,255,.8)", fontSize: 12, fontWeight: 600 }}>
									{statusLabel}
								</span>
							</div>
						)}

						{/* Navigace měsíce */}
						<button onClick={() => moveMonth(-1)} style={{ ...glassBtn, width: 40 }}>
							←
						</button>

						<div ref={monthPickerRef}>
							<button
								ref={pickerBtnRef}
								onClick={() => {
									if (pickerBtnRef.current) {
										const r = pickerBtnRef.current.getBoundingClientRect();
										setPickerPos({ top: r.bottom + 8, right: window.innerWidth - r.right });
									}
									setShowMonthPicker((v) => !v);
								}}
								style={{ ...glassBtn, padding: "0 18px", gap: 8, fontSize: 13 }}>
								<span style={{ fontWeight: 800 }}>{MONTH_NAMES[viewDate.month - 1].substring(0, 3)}</span>
								<span style={{ color: "rgba(255,255,255,.4)", fontSize: 10 }}>▼</span>
							</button>
						</div>

						<button onClick={() => moveMonth(1)} style={{ ...glassBtn, width: 40 }}>
							→
						</button>

						{/* Export PDF */}
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
							{({ loading: pdfLoading }) => (
								<button
									disabled={pdfLoading}
									style={{ ...glassBtn, width: 40, fontSize: 16, opacity: pdfLoading ? 0.5 : 1 }}
									title="Exportovat PDF">
									📄
								</button>
							)}
						</PDFDownloadLink>

						{/* Export ICS */}
						<button
							onClick={handleExportIcs}
							style={{ ...glassBtn, width: 40, fontSize: 16 }}
							title="Exportovat ICS">
							📅
						</button>
					</div>
				</div>
			</div>

			{/* ══ METRIKY ════════════════════════════════════════════════════════ */}
			{!loading && data && (
				<div
					className="grid grid-cols-2 lg:grid-cols-4 mx-6 md:mx-24 -mt-8 md:-mt-14 relative z-10 bg-white rounded-[18px] shrink-0 overflow-hidden"
					style={{
						border: "1px solid #DDF0E8",
						boxShadow: "0 8px 40px rgba(28,78,90,.12), 0 2px 8px rgba(28,78,90,.06)",
					}}>
					<MetricItem label="Dní v měsíci" value={totalDays} delay={70} />
					<MetricItem label="Směn celkem" value={allShifts.length} delay={140} />
					<MetricItem label="Obsazeno" value={assignedShifts.length} delay={210} />
					<MetricItem
						label="Volné sloty"
						value={unassignedShifts.length}
						delay={280}
						alert={unassignedShifts.length > 0}
						alertSub="neobsazených"
						last
					/>
				</div>
			)}

			{/* ══ OBSAH ══════════════════════════════════════════════════════════ */}
			<div className="flex-1 px-6 py-6 md:px-24 md:pt-6 md:pb-11" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
				{loading ? (
					<div
						style={{
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							flex: 1,
							color: "#2C6975",
							fontSize: 14,
							fontWeight: 600,
							letterSpacing: "0.06em",
						}}>
						Načítám rozvrh…
					</div>
				) : !data ? (
					<div
						className="card a-up"
						style={
							{
								"--d": "80ms",
								padding: "48px 24px",
								textAlign: "center",
								display: "flex",
								flexDirection: "column",
								alignItems: "center",
								gap: 16,
								marginTop: 32,
							} as React.CSSProperties
						}>
						<p style={{ fontSize: 13, color: "#9ABABA", fontWeight: 600 }}>
							Pro tento měsíc zatím neexistuje rozvrh.
						</p>
						<button
							onClick={handleInitMonth}
							style={{
								background: "linear-gradient(135deg, #1C4E5A 0%, #2C6975 100%)",
								color: "#fff",
								border: "none",
								borderRadius: 12,
								padding: "14px 32px",
								fontSize: 12,
								fontWeight: 800,
								textTransform: "uppercase",
								letterSpacing: "0.08em",
								cursor: "pointer",
								boxShadow: "0 4px 20px rgba(28,78,90,.3)",
								transition: "all .15s",
							}}>
							+ Inicializovat {MONTH_NAMES[viewDate.month - 1]}
						</button>
					</div>
				) : (
					<>
						<div className="a-up" style={{ "--d": "80ms" } as React.CSSProperties}>
							<StatusPanel
								status={data.status}
								generating={generating}
								onChangeStatus={handleChangeStatus}
								onAutoGenerate={handleAutoGenerate}
							/>
						</div>
						{data.calendarDays.map((day, i) => (
							<DayCard
								key={day}
								day={day}
								index={i}
								shifts={data.shifts}
								positions={positions}
								colorPalette={POSITION_COLOR_PALETTE}
								onEditShift={handleEditShift}
								onAddShift={handleAddShift}
							/>
						))}
					</>
				)}
			</div>

			{/* Month picker dropdown – mimo hero, aby transform animace neovlivňoval fixed pozici */}
			{showMonthPicker && (
				<div
					ref={pickerDropdownRef}
					style={{
						position: "fixed",
						top: pickerPos.top,
						right: pickerPos.right,
						zIndex: 9999,
						background: "#fff",
						borderRadius: 16,
						boxShadow: "0 8px 40px rgba(28,78,90,.18)",
						border: "1px solid #DDF0E8",
						padding: 16,
						width: 256,
					}}>
					<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
						<button onClick={() => setViewDate((p) => ({ ...p, year: p.year - 1 }))} style={{ padding: "6px 10px", borderRadius: 8, background: "#F0F7F4", border: "none", cursor: "pointer", fontWeight: 700, color: "#2C6975" }}>←</button>
						<span style={{ fontWeight: 800, color: "#0F2E35", fontSize: 14 }}>{viewDate.year}</span>
						<button onClick={() => setViewDate((p) => ({ ...p, year: p.year + 1 }))} style={{ padding: "6px 10px", borderRadius: 8, background: "#F0F7F4", border: "none", cursor: "pointer", fontWeight: 700, color: "#2C6975" }}>→</button>
					</div>
					<div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
						{MONTH_NAMES.map((name, idx) => (
							<button
								key={idx}
								onClick={() => { setViewDate((p) => ({ ...p, month: idx + 1 })); setShowMonthPicker(false); }}
								style={{
									padding: "8px 0",
									borderRadius: 10,
									border: "none",
									cursor: "pointer",
									fontSize: 11,
									fontWeight: 800,
									textTransform: "uppercase",
									letterSpacing: "0.04em",
									transition: "all .12s",
									background: viewDate.month === idx + 1 ? "#1C4E5A" : "#F0F7F4",
									color: viewDate.month === idx + 1 ? "#fff" : "#2C6975",
								}}>
								{name.substring(0, 3)}
							</button>
						))}
					</div>
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
