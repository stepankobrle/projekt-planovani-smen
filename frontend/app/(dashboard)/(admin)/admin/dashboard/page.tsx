"use client";

import { useEffect, useState, useCallback } from "react";
import {
	CalendarX2,
	Clock,
	Bell,
	BellOff,
	CheckCircle2,
	XCircle,
	AlertCircle,
	CalendarDays,
	ArrowUpRight,
} from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/app/components/ProtectedRoute";

// --- TYPY ---
interface ShiftUser {
	id: string;
	fullName: string | null;
	email: string;
}

interface Shift {
	id: string;
	startDatetime: string;
	endDatetime: string;
	status: string;
	assignedUserId: string | null;
	assignedUser: ShiftUser | null;
	shiftType: { name: string; colorCode: string } | null;
	jobPosition: { name: string } | null;
}

interface ScheduleGroup {
	id: string;
	status: string;
	shifts: Shift[];
}

interface VacationRequest {
	id: string;
	startDate: string;
	endDate: string;
	status: "PENDING" | "APPROVED" | "REJECTED";
	user: { fullName: string | null; email: string };
}

interface Notification {
	id: string;
	content: string;
	type: string;
	isRead: boolean;
	createdAt: string;
}

// --- HELPERS ---
const fmt = (iso: string) =>
	new Date(iso).toLocaleDateString("cs-CZ", {
		day: "numeric",
		month: "short",
	});

const fmtTime = (iso: string) =>
	new Date(iso).toLocaleTimeString("cs-CZ", {
		hour: "2-digit",
		minute: "2-digit",
	});

const isToday = (iso: string) => {
	const d = new Date(iso);
	const now = new Date();
	return (
		d.getFullYear() === now.getFullYear() &&
		d.getMonth() === now.getMonth() &&
		d.getDate() === now.getDate()
	);
};

const scheduleStatusConfig: Record<string, { label: string; cls: string }> = {
	DRAFT: { label: "Koncept", cls: "bg-slate-100 text-slate-600" },
	PREFERENCES: { label: "Sběr preferencí", cls: "bg-amber-100 text-amber-700" },
	GENERATED: { label: "Vygenerováno", cls: "bg-blue-100 text-blue-700" },
	PUBLISHED: { label: "Publikováno", cls: "bg-emerald-100 text-emerald-700" },
};

// --- KOMPONENTA ---
export default function AdminDashboard() {
	const { user } = useAuth();
	const locationId = user?.locationId;

	const now = new Date();
	const year = now.getFullYear();
	const month = now.getMonth() + 1;

	const [schedule, setSchedule] = useState<ScheduleGroup | null>(null);
	const [vacations, setVacations] = useState<VacationRequest[]>([]);
	const [employeeCount, setEmployeeCount] = useState(0);
	const [notifications, setNotifications] = useState<Notification[]>([]);
	const [loading, setLoading] = useState(true);
	const [processingId, setProcessingId] = useState<string | null>(null);

	const fetchData = useCallback(async () => {
		if (!locationId) return;
		setLoading(true);
		try {
			const [resSchedule, resVacations, resEmployees, resNotifications] =
				await Promise.allSettled([
					api.get(
						`/schedule-groups/find?locationId=${locationId}&year=${year}&month=${month}`,
					),
					api.get(`/vacations/location/${locationId}`),
					api.get("/users"),
					api.get("/notifications"),
				]);
			if (resSchedule.status === "fulfilled")
				setSchedule(resSchedule.value.data);
			if (resVacations.status === "fulfilled")
				setVacations(resVacations.value.data);
			if (resEmployees.status === "fulfilled")
				setEmployeeCount(resEmployees.value.data.length);
			if (resNotifications.status === "fulfilled")
				setNotifications(resNotifications.value.data);
		} finally {
			setLoading(false);
		}
	}, [locationId, year, month]);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	const markAllRead = async () => {
		await api.patch("/notifications/read-all");
		setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
	};

	// SSE — při nové notifikaci obnoví seznam
	useEffect(() => {
		const token = document.cookie.match(/token=([^;]+)/)?.[1];
		if (!token) return;
		const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
		const es = new EventSource(`${API_URL}/notifications/stream?token=${token}`);
		es.onmessage = () => {
			api.get<Notification[]>("/notifications").then((res) =>
				setNotifications(res.data),
			);
		};
		return () => es.close();
	}, []);

	const handleVacation = async (id: string, action: "approve" | "reject") => {
		setProcessingId(id);
		try {
			await api.patch(`/vacations/${id}/${action}`);
			await fetchData();
		} catch {
			alert("Chyba při zpracování.");
		} finally {
			setProcessingId(null);
		}
	};

	// --- ODVOZENÁ DATA ---
	const allShifts = schedule?.shifts ?? [];
	const todayShifts = allShifts
		.filter((s) => s.assignedUserId !== null && isToday(s.startDatetime))
		.sort(
			(a, b) =>
				new Date(a.startDatetime).getTime() -
				new Date(b.startDatetime).getTime(),
		);
	const unassignedAll = allShifts.filter((s) => s.assignedUserId === null);
	const unassignedFuture = unassignedAll.filter(
		(s) => new Date(s.startDatetime) > now,
	);
	const unassignedUpcoming = unassignedFuture.slice(0, 8);
	const pendingVacations = vacations.filter((v) => v.status === "PENDING");
	const schedStatus = schedule?.status ?? null;

	if (loading) {
		return (
			<div className="flex items-center justify-center h-64 text-slate-400 text-sm">
				Načítám dashboard...
			</div>
		);
	}

	return (
		<div className="lg:h-full lg:flex lg:flex-col lg:gap-5 space-y-5 lg:space-y-0 animate-in fade-in duration-500">
			{/* HLAVIČKA */}
			<div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 shrink-0">
				<div>
					<h1 className="text-3xl font-black text-slate-900 tracking-tight">
						Dashboard
					</h1>
					<p className="text-slate-400 text-sm mt-1">
						{now.toLocaleDateString("cs-CZ", {
							weekday: "long",
							day: "numeric",
							month: "long",
							year: "numeric",
						})}
					</p>
				</div>
				{schedStatus && (
					<span
						className={`px-4 py-2 rounded-xl text-xs font-bold self-start sm:self-auto ${
							scheduleStatusConfig[schedStatus]?.cls ??
							"bg-slate-100 text-slate-600"
						}`}>
						Rozvrh: {scheduleStatusConfig[schedStatus]?.label ?? schedStatus}
					</span>
				)}
			</div>

			{/* QUICK STATS */}
			<div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 shrink-0">
				{/* Karta 1 — primární (brand) */}
				<div className="bg-brand-secondary rounded-2xl p-4 sm:p-5 flex flex-col justify-between h-[120px] shadow-lg shadow-brand-secondary/20">
					<div className="flex items-start justify-between">
						<p className="text-white/70 text-xs font-semibold uppercase tracking-wide">
							Zaměstnanci
						</p>
						<ArrowUpRight size={16} className="text-white/60" />
					</div>
					<div>
						<span className="text-4xl font-black text-white leading-none">
							{employeeCount}
						</span>
						<p className="text-white/50 text-[11px] font-medium mt-0.5">celkem v pobočce</p>
					</div>
				</div>

				{/* Karta 2 */}
				<div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col justify-between h-[120px] shadow-sm">
					<div className="flex items-start justify-between">
						<p className="text-slate-500 text-xs font-semibold uppercase tracking-wide">
							Neobsazené směny
						</p>
						<ArrowUpRight size={16} className="text-slate-300" />
					</div>
					<div>
						<span className="text-4xl font-black text-slate-900 leading-none">
							{unassignedFuture.length}
						</span>
						<p className={`text-[11px] font-medium mt-0.5 ${unassignedFuture.length > 0 ? "text-red-500" : "text-slate-400"}`}>
							{unassignedFuture.length > 0 ? "vyžaduje pozornost" : "vše obsazeno"}
						</p>
					</div>
				</div>

				{/* Karta 3 */}
				<div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col justify-between h-[120px] shadow-sm">
					<div className="flex items-start justify-between">
						<p className="text-slate-500 text-xs font-semibold uppercase tracking-wide">
							Čekající dovolené
						</p>
						<ArrowUpRight size={16} className="text-slate-300" />
					</div>
					<div>
						<span className="text-4xl font-black text-slate-900 leading-none">
							{pendingVacations.length}
						</span>
						<p className={`text-[11px] font-medium mt-0.5 ${pendingVacations.length > 0 ? "text-amber-500" : "text-slate-400"}`}>
							{pendingVacations.length > 0 ? "ke schválení" : "žádné žádosti"}
						</p>
					</div>
				</div>

				{/* Karta 4 */}
				<div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col justify-between h-[120px] shadow-sm">
					<div className="flex items-start justify-between">
						<p className="text-slate-500 text-xs font-semibold uppercase tracking-wide">
							Pracují dnes
						</p>
						<ArrowUpRight size={16} className="text-slate-300" />
					</div>
					<div>
						<span className="text-4xl font-black text-slate-900 leading-none">
							{todayShifts.length}
						</span>
						<p className="text-slate-400 text-[11px] font-medium mt-0.5">aktivních směn</p>
					</div>
				</div>
			</div>

			{/* HLAVNÍ GRID */}
			<div className="grid grid-cols-1 lg:grid-cols-5 gap-5 lg:flex-1 lg:min-h-0">
				{/* LEVÝ SLOUPEC (3/5) */}
				<div className="lg:col-span-3 flex flex-col gap-5 lg:min-h-0">
					{/* KDO PRACUJE DNES */}
					<div className="bg-white border border-slate-100 rounded-2xl shadow-sm flex flex-col lg:flex-1 lg:min-h-0 overflow-hidden">
						<div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
							<div className="flex items-center gap-2">
								<div className="h-7 w-7 rounded-lg bg-brand-secondary/10 flex items-center justify-center">
									<CalendarDays size={14} className="text-brand-secondary" />
								</div>
								<h2 className="font-bold text-slate-900 text-sm">Kdo pracuje dnes</h2>
							</div>
							<span className="text-xs text-slate-400 font-medium">
								{now.toLocaleDateString("cs-CZ", { day: "numeric", month: "long" })}
							</span>
						</div>
						{todayShifts.length === 0 ? (
							<div className="px-5 py-10 text-center text-slate-400 text-sm">
								Dnes nikdo neplánuje.
							</div>
						) : (
							<div className="divide-y divide-slate-50 overflow-y-auto">
								{todayShifts.map((shift) => (
									<div key={shift.id} className="px-5 py-3 flex items-center gap-3">
										<div className="h-8 w-8 rounded-full bg-brand-secondary/10 text-brand-secondary font-black text-sm flex items-center justify-center shrink-0">
											{shift.assignedUser?.fullName?.[0]?.toUpperCase() ?? "?"}
										</div>
										<div className="flex-1 min-w-0">
											<div className="text-sm font-semibold text-slate-900 truncate">
												{shift.assignedUser?.fullName ?? shift.assignedUser?.email ?? "—"}
											</div>
											<div className="text-xs text-slate-400">{shift.jobPosition?.name ?? "—"}</div>
										</div>
										<div className="text-right shrink-0">
											{shift.shiftType && (
												<span
													className="text-[10px] font-bold px-2 py-0.5 rounded-md"
													style={{
														backgroundColor: shift.shiftType.colorCode + "22",
														color: shift.shiftType.colorCode,
													}}>
													{shift.shiftType.name}
												</span>
											)}
											<div className="text-xs text-slate-400 mt-0.5">
												{fmtTime(shift.startDatetime)} – {fmtTime(shift.endDatetime)}
											</div>
										</div>
									</div>
								))}
							</div>
						)}
					</div>

					{/* NEJBLIŽŠÍ NEOBSAZENÉ SMĚNY */}
					<div className="bg-white border border-slate-100 rounded-2xl shadow-sm flex flex-col lg:flex-1 lg:min-h-0 overflow-hidden">
						<div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
							<div className="flex items-center gap-2">
								<div className="h-7 w-7 rounded-lg bg-red-50 flex items-center justify-center">
									<CalendarX2 size={14} className="text-red-400" />
								</div>
								<h2 className="font-bold text-slate-900 text-sm">Neobsazené směny</h2>
							</div>
							{unassignedFuture.length > 0 && (
								<span className="text-[10px] font-black bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
									{unassignedFuture.length}
								</span>
							)}
						</div>
						{unassignedUpcoming.length === 0 ? (
							<div className="px-5 py-10 text-center text-slate-400 text-sm">
								Všechny nadcházející směny jsou obsazeny.
							</div>
						) : (
							<div className="divide-y divide-slate-50 overflow-y-auto">
								{unassignedUpcoming.map((shift) => (
									<div key={shift.id} className="px-5 py-3 flex items-center gap-3">
										<div className="h-8 w-8 rounded-full bg-red-50 text-red-400 flex items-center justify-center shrink-0">
											<AlertCircle size={14} />
										</div>
										<div className="flex-1 min-w-0">
											<div className="text-sm font-semibold text-slate-900">{fmt(shift.startDatetime)}</div>
											<div className="text-xs text-slate-400">{shift.jobPosition?.name ?? "—"}</div>
										</div>
										<div className="text-right shrink-0">
											{shift.shiftType && (
												<span
													className="text-[10px] font-bold px-2 py-0.5 rounded-md"
													style={{
														backgroundColor: shift.shiftType.colorCode + "22",
														color: shift.shiftType.colorCode,
													}}>
													{shift.shiftType.name}
												</span>
											)}
											<div className="text-xs text-slate-400 mt-0.5">
												{fmtTime(shift.startDatetime)} – {fmtTime(shift.endDatetime)}
											</div>
										</div>
									</div>
								))}
								{unassignedFuture.length > 8 && (
									<div className="px-5 py-3 text-center text-xs text-slate-400 shrink-0">
										+ {unassignedFuture.length - 8} dalších neobsazených
									</div>
								)}
							</div>
						)}
					</div>
				</div>

				{/* PRAVÝ SLOUPEC (2/5) */}
				<div className="lg:col-span-2 flex flex-col gap-5 lg:min-h-0">
					{/* ČEKAJÍCÍ DOVOLENÉ */}
					<div className="bg-white border border-slate-100 rounded-2xl shadow-sm flex flex-col lg:flex-1 lg:min-h-0 overflow-hidden">
						<div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
							<div className="flex items-center gap-2">
								<div className="h-7 w-7 rounded-lg bg-amber-50 flex items-center justify-center">
									<Clock size={14} className="text-amber-500" />
								</div>
								<h2 className="font-bold text-slate-900 text-sm">Čekající dovolené</h2>
							</div>
							{pendingVacations.length > 0 && (
								<span className="text-[10px] font-black bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full">
									{pendingVacations.length}
								</span>
							)}
						</div>
						{pendingVacations.length === 0 ? (
							<div className="px-5 py-10 text-center text-slate-400 text-sm">
								Žádné čekající žádosti.
							</div>
						) : (
							<div className="divide-y divide-slate-50 overflow-y-auto">
								{pendingVacations.slice(0, 5).map((req) => (
									<div key={req.id} className="px-5 py-3">
										<div className="flex items-center gap-2 mb-2.5">
											<div className="h-7 w-7 rounded-full bg-amber-50 text-amber-600 font-black text-xs flex items-center justify-center shrink-0">
												{req.user.fullName?.[0]?.toUpperCase() ?? "?"}
											</div>
											<div className="min-w-0">
												<div className="text-sm font-semibold text-slate-900 truncate">
													{req.user.fullName ?? req.user.email}
												</div>
												<div className="text-[11px] text-slate-400">
													{fmt(req.startDate)} – {fmt(req.endDate)}
												</div>
											</div>
										</div>
										<div className="flex gap-2">
											<button
												disabled={processingId === req.id}
												onClick={() => handleVacation(req.id, "approve")}
												className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-green-50 text-green-600 border border-green-200 rounded-lg text-xs font-bold hover:bg-green-100 transition-colors disabled:opacity-50">
												<CheckCircle2 size={12} /> Schválit
											</button>
											<button
												disabled={processingId === req.id}
												onClick={() => handleVacation(req.id, "reject")}
												className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-red-50 text-red-500 border border-red-200 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors disabled:opacity-50">
												<XCircle size={12} /> Zamítnout
											</button>
										</div>
									</div>
								))}
								{pendingVacations.length > 5 && (
									<div className="px-5 py-3 text-center text-xs text-slate-400 shrink-0">
										+ {pendingVacations.length - 5} dalších
									</div>
								)}
							</div>
						)}
					</div>

					{/* UPOZORNĚNÍ */}
					<div className="bg-white border border-slate-100 rounded-2xl shadow-sm flex flex-col lg:flex-1 lg:min-h-0 overflow-hidden">
						<div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
							<div className="flex items-center gap-2">
								<div className="relative h-7 w-7 rounded-lg bg-yellow-50 flex items-center justify-center">
									<Bell size={14} className="text-yellow-600" />
									{notifications.filter((n) => !n.isRead).length > 0 && (
										<span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
											{notifications.filter((n) => !n.isRead).length}
										</span>
									)}
								</div>
								<h2 className="font-bold text-slate-900 text-sm">Upozornění</h2>
							</div>
							{notifications.filter((n) => !n.isRead).length > 0 && (
								<button
									onClick={markAllRead}
									className="text-xs text-slate-400 hover:text-slate-600 font-medium transition-colors">
									Vše přečteno
								</button>
							)}
						</div>
						{notifications.length === 0 ? (
							<div className="px-5 py-10 text-center">
								<BellOff size={22} className="mx-auto mb-2 text-slate-300" />
								<p className="text-sm font-semibold text-slate-400">Žádná upozornění</p>
							</div>
						) : (
							<div className="divide-y divide-slate-50 overflow-y-auto">
								{notifications.slice(0, 8).map((n) => (
									<div
										key={n.id}
										className={`px-5 py-3 text-xs transition-all ${
											n.isRead
												? "text-slate-500"
												: "bg-yellow-50 text-slate-700 border-l-2 border-yellow-400"
										}`}>
										<p className="leading-relaxed">{n.content}</p>
										<p className="text-slate-400 mt-0.5">
											{new Date(n.createdAt).toLocaleDateString("cs-CZ")}
										</p>
									</div>
								))}
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
