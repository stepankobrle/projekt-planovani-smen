"use client";

import { useEffect, useState, useCallback } from "react";
import {
	Users,
	CalendarX2,
	Clock,
	Bell,
	CheckCircle2,
	XCircle,
	AlertCircle,
	CalendarDays,
	UserCheck,
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
	const [loading, setLoading] = useState(true);
	const [processingId, setProcessingId] = useState<string | null>(null);

	const fetchData = useCallback(async () => {
		if (!locationId) return;
		setLoading(true);
		try {
			const [resSchedule, resVacations, resEmployees] =
				await Promise.allSettled([
					api.get(
						`/schedule-groups/find?locationId=${locationId}&year=${year}&month=${month}`,
					),
					api.get(`/vacations/location/${locationId}`),
					api.get("/users"),
				]);
			if (resSchedule.status === "fulfilled")
				setSchedule(resSchedule.value.data);
			if (resVacations.status === "fulfilled")
				setVacations(resVacations.value.data);
			if (resEmployees.status === "fulfilled")
				setEmployeeCount(resEmployees.value.data.length);
		} finally {
			setLoading(false);
		}
	}, [locationId, year, month]);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

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
		<div className="space-y-6 animate-in fade-in duration-500">
			{/* HLAVIČKA */}
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
				<div>
					<h1 className="text-2xl font-bold text-slate-900 tracking-tight">
						Dashboard
					</h1>
					<p className="text-slate-500 text-sm mt-0.5">
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
						className={`px-3 py-1.5 rounded-xl text-xs font-bold self-start ${
							scheduleStatusConfig[schedStatus]?.cls ??
							"bg-slate-100 text-slate-600"
						}`}>
						Rozvrh:{" "}
						{scheduleStatusConfig[schedStatus]?.label ?? schedStatus}
					</span>
				)}
			</div>

			{/* QUICK STATS */}
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
				{(
					[
						{
							label: "Zaměstnanci",
							value: employeeCount,
							icon: Users,
							color: "blue",
						},
						{
							label: "Neobsazené směny",
							value: unassignedFuture.length,
							icon: CalendarX2,
							color: unassignedFuture.length > 0 ? "red" : "green",
						},
						{
							label: "Čekající dovolené",
							value: pendingVacations.length,
							icon: Clock,
							color: pendingVacations.length > 0 ? "amber" : "green",
						},
						{
							label: "Pracují dnes",
							value: todayShifts.length,
							icon: UserCheck,
							color: "blue",
						},
					] as const
				).map((stat) => {
					const Icon = stat.icon;
					const colorMap = {
						blue: "bg-brand-secondary/10 text-brand-secondary",
						red: "bg-red-50 text-red-600",
						amber: "bg-amber-50 text-amber-600",
						green: "bg-emerald-50 text-emerald-600",
					} as const;
					return (
						<div
							key={stat.label}
							className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center gap-4">
							<div className={`p-3 rounded-xl ${colorMap[stat.color]}`}>
								<Icon size={20} />
							</div>
							<div>
								<div className="text-2xl font-bold text-slate-900">
									{stat.value}
								</div>
								<div className="text-xs text-slate-500 font-medium mt-0.5">
									{stat.label}
								</div>
							</div>
						</div>
					);
				})}
			</div>

			{/* HLAVNÍ GRID */}
			<div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
				{/* LEVÝ SLOUPEC (3/5) */}
				<div className="lg:col-span-3 space-y-6">
					{/* KDO PRACUJE DNES */}
					<div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
						<div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
							<CalendarDays size={16} className="text-brand-secondary" />
							<h2 className="font-bold text-slate-900 text-sm">
								Kdo pracuje dnes
							</h2>
							<span className="ml-auto text-xs text-slate-400">
								{now.toLocaleDateString("cs-CZ", {
									day: "numeric",
									month: "long",
								})}
							</span>
						</div>
						{todayShifts.length === 0 ? (
							<div className="px-6 py-10 text-center text-slate-400 text-sm">
								Dnes nikdo neplánuje.
							</div>
						) : (
							<div className="divide-y divide-slate-50">
								{todayShifts.map((shift) => (
									<div
										key={shift.id}
										className="px-6 py-3 flex items-center gap-3">
										<div className="h-8 w-8 rounded-full bg-brand-secondary/10 text-brand-secondary font-bold text-sm flex items-center justify-center flex-shrink-0">
											{shift.assignedUser?.fullName?.[0]?.toUpperCase() ??
												"?"}
										</div>
										<div className="flex-1 min-w-0">
											<div className="text-sm font-semibold text-slate-900 truncate">
												{shift.assignedUser?.fullName ??
													shift.assignedUser?.email ??
													"—"}
											</div>
											<div className="text-xs text-slate-400">
												{shift.jobPosition?.name ?? "—"}
											</div>
										</div>
										<div className="text-right flex-shrink-0">
											{shift.shiftType && (
												<span
													className="text-[10px] font-bold px-2 py-0.5 rounded-md"
													style={{
														backgroundColor:
															shift.shiftType.colorCode + "22",
														color: shift.shiftType.colorCode,
													}}>
													{shift.shiftType.name}
												</span>
											)}
											<div className="text-xs text-slate-500 mt-0.5">
												{fmtTime(shift.startDatetime)} –{" "}
												{fmtTime(shift.endDatetime)}
											</div>
										</div>
									</div>
								))}
							</div>
						)}
					</div>

					{/* NEJBLIŽŠÍ NEOBSAZENÉ SMĚNY */}
					<div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
						<div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
							<CalendarX2 size={16} className="text-red-400" />
							<h2 className="font-bold text-slate-900 text-sm">
								Neobsazené směny
							</h2>
							{unassignedFuture.length > 0 && (
								<span className="ml-1 text-[10px] font-black bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">
									{unassignedFuture.length}
								</span>
							)}
						</div>
						{unassignedUpcoming.length === 0 ? (
							<div className="px-6 py-10 text-center text-slate-400 text-sm">
								Všechny nadcházející směny jsou obsazeny.
							</div>
						) : (
							<div className="divide-y divide-slate-50">
								{unassignedUpcoming.map((shift) => (
									<div
										key={shift.id}
										className="px-6 py-3 flex items-center gap-3">
										<div className="h-8 w-8 rounded-full bg-red-50 text-red-400 flex items-center justify-center flex-shrink-0">
											<AlertCircle size={14} />
										</div>
										<div className="flex-1 min-w-0">
											<div className="text-sm font-semibold text-slate-900">
												{fmt(shift.startDatetime)}
											</div>
											<div className="text-xs text-slate-400">
												{shift.jobPosition?.name ?? "—"}
											</div>
										</div>
										<div className="text-right flex-shrink-0">
											{shift.shiftType && (
												<span
													className="text-[10px] font-bold px-2 py-0.5 rounded-md"
													style={{
														backgroundColor:
															shift.shiftType.colorCode + "22",
														color: shift.shiftType.colorCode,
													}}>
													{shift.shiftType.name}
												</span>
											)}
											<div className="text-xs text-slate-500 mt-0.5">
												{fmtTime(shift.startDatetime)} –{" "}
												{fmtTime(shift.endDatetime)}
											</div>
										</div>
									</div>
								))}
								{unassignedFuture.length > 8 && (
									<div className="px-6 py-3 text-center text-xs text-slate-400">
										+ {unassignedFuture.length - 8} dalších neobsazených
									</div>
								)}
							</div>
						)}
					</div>
				</div>

				{/* PRAVÝ SLOUPEC (2/5) */}
				<div className="lg:col-span-2 space-y-6">
					{/* ČEKAJÍCÍ DOVOLENÉ */}
					<div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
						<div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
							<Clock size={16} className="text-amber-500" />
							<h2 className="font-bold text-slate-900 text-sm">
								Čekající dovolené
							</h2>
							{pendingVacations.length > 0 && (
								<span className="ml-1 text-[10px] font-black bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full">
									{pendingVacations.length}
								</span>
							)}
						</div>
						{pendingVacations.length === 0 ? (
							<div className="px-6 py-10 text-center text-slate-400 text-sm">
								Žádné čekající žádosti.
							</div>
						) : (
							<div className="divide-y divide-slate-50">
								{pendingVacations.slice(0, 5).map((req) => (
									<div key={req.id} className="px-4 py-3">
										<div className="flex items-start gap-2 mb-2">
											<div className="h-7 w-7 rounded-full bg-amber-50 text-amber-600 font-bold text-xs flex items-center justify-center flex-shrink-0">
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
									<div className="px-6 py-3 text-center text-xs text-slate-400">
										+ {pendingVacations.length - 5} dalších
									</div>
								)}
							</div>
						)}
					</div>

					{/* UPOZORNĚNÍ — PLACEHOLDER */}
					<div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
						<div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
							<Bell size={16} className="text-slate-400" />
							<h2 className="font-bold text-slate-900 text-sm">
								Upozornění
							</h2>
						</div>
						<div className="px-6 py-8 text-center">
							<div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
								<Bell size={20} className="text-slate-300" />
							</div>
							<p className="text-sm font-semibold text-slate-400">
								Zatím žádná upozornění
							</p>
							<p className="text-xs text-slate-300 mt-1">
								Systém upozornění bude brzy k dispozici.
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
