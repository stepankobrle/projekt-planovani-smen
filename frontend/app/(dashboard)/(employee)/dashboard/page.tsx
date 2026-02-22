"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
	CalendarDays,
	Clock,
	Bell,
	BellOff,
	ArrowRight,
	Star,
	Plane,
	RefreshCw,
	Users,
	CheckCircle2,
} from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/app/components/ProtectedRoute";

// --- TYPY ---
interface Shift {
	id: string;
	startDatetime: string;
	endDatetime: string;
	isMarketplace: boolean;
	assignedUserId: string | null;
	assignedUser?: { fullName: string | null; email: string } | null;
	shiftType?: { name: string; colorCode: string } | null;
	jobPosition?: { name: string } | null;
}

interface Notification {
	id: string;
	message: string;
	type: string;
	isRead: boolean;
	createdAt: string;
}

// --- POMOCNÉ FUNKCE ---
const calcHours = (start: string, end: string): number => {
	const dur = (new Date(end).getTime() - new Date(start).getTime()) / 36e5;
	return dur >= 6 ? dur - 0.5 : dur;
};

const formatDate = (iso: string) =>
	new Date(iso).toLocaleDateString("cs-CZ", {
		weekday: "short",
		day: "numeric",
		month: "short",
	});

const formatTime = (iso: string) =>
	new Date(iso).toLocaleTimeString("cs-CZ", {
		hour: "2-digit",
		minute: "2-digit",
	});

// --- KOMPONENTA ---
export default function EmployeeDashboardPage() {
	const { user } = useAuth();

	const [myShifts, setMyShifts] = useState<Shift[]>([]);
	const [locationShifts, setLocationShifts] = useState<Shift[]>([]);
	const [notifications, setNotifications] = useState<Notification[]>([]);
	const [loading, setLoading] = useState(true);

	const fetchData = useCallback(async () => {
		if (!user) return;

		const now = new Date();
		const year = now.getFullYear();
		const month = now.getMonth() + 1;

		const [resMyShifts, resLocationShifts, resNotifications] =
			await Promise.allSettled([
				api.get("/shifts", {
					params: {
						assignedUserId: user.id,
						year,
						month,
						locationId: user.locationId,
					},
				}),
				api.get("/shifts", {
					params: { locationId: user.locationId, year, month },
				}),
				api.get("/notifications"),
			]);

		if (resMyShifts.status === "fulfilled") setMyShifts(resMyShifts.value.data);
		if (resLocationShifts.status === "fulfilled")
			setLocationShifts(resLocationShifts.value.data);
		if (resNotifications.status === "fulfilled")
			setNotifications(resNotifications.value.data);

		setLoading(false);
	}, [user]);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	const markAllRead = async () => {
		await api.patch("/notifications/read-all");
		setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
	};

	// --- ODVOZENÁ DATA ---
	const now = new Date();
	const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const todayEnd = new Date(todayStart);
	todayEnd.setDate(todayEnd.getDate() + 1);

	const upcomingShifts = myShifts
		.filter((s) => new Date(s.startDatetime) > now)
		.slice(0, 5);

	const plannedHours = myShifts
		.filter((s) => new Date(s.startDatetime) > now)
		.reduce((acc, s) => acc + calcHours(s.startDatetime, s.endDatetime), 0);

	const workedHours = myShifts
		.filter((s) => new Date(s.endDatetime) <= now)
		.reduce((acc, s) => acc + calcHours(s.startDatetime, s.endDatetime), 0);

	const marketplaceShifts = locationShifts
		.filter((s) => s.isMarketplace && s.assignedUserId !== user?.id)
		.slice(0, 4);

	const todayShifts = locationShifts.filter((s) => {
		const d = new Date(s.startDatetime);
		return d >= todayStart && d < todayEnd;
	});

	const unreadCount = notifications.filter((n) => !n.isRead).length;

	const pastShifts = myShifts
		.filter((s) => new Date(s.endDatetime) <= now)
		.slice(-5)
		.reverse();

	if (loading) {
		return (
			<div className="flex h-full items-center justify-center text-slate-400 text-xs font-bold uppercase tracking-widest">
				Načítám dashboard...
			</div>
		);
	}

	return (
		<div className="p-6 bg-slate-50 min-h-full">
			{/* HEADER */}
			<div className="mb-6">
				<h1 className="text-2xl font-black text-slate-800 tracking-tight">
					Dobrý den, {user?.fullName?.split(" ")[0] ?? "uživateli"}
				</h1>
				<p className="text-slate-500 text-sm mt-1">
					{now.toLocaleDateString("cs-CZ", {
						weekday: "long",
						day: "numeric",
						month: "long",
						year: "numeric",
					})}
				</p>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
				{/* ===== LEVÝ SLOUPEC (2/3) ===== */}
				<div className="lg:col-span-2 flex flex-col gap-5">

					{/* BURZA SMĚN */}
					<div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5">
						<div className="flex items-center justify-between mb-4">
							<div className="flex items-center gap-2">
								<div className="h-8 w-8 rounded-xl bg-orange-100 flex items-center justify-center">
									<RefreshCw size={16} className="text-orange-600" />
								</div>
								<div>
									<h2 className="text-sm font-bold text-slate-800">Burza směn</h2>
									<p className="text-xs text-slate-400">Směny nabídnuté kolegy k převzetí</p>
								</div>
							</div>
							<Link
								href="/schedule"
								className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1">
								Zobrazit vše <ArrowRight size={12} />
							</Link>
						</div>

						{marketplaceShifts.length === 0 ? (
							<div className="text-center py-8 text-slate-400">
								<RefreshCw size={28} className="mx-auto mb-2 opacity-30" />
								<p className="text-sm">Žádné směny na burze</p>
							</div>
						) : (
							<div className="space-y-2">
								{marketplaceShifts.map((s) => (
									<div
										key={s.id}
										className="flex items-center justify-between p-3 rounded-xl bg-orange-50 border border-orange-100">
										<div className="flex items-center gap-3">
											<div
												className="h-2.5 w-2.5 rounded-full flex-shrink-0"
												style={{ backgroundColor: s.shiftType?.colorCode ?? "#f97316" }}
											/>
											<div>
												<p className="text-sm font-semibold text-slate-700">
													{formatDate(s.startDatetime)}
												</p>
												<p className="text-xs text-slate-400">
													{formatTime(s.startDatetime)} – {formatTime(s.endDatetime)}
													{s.jobPosition ? ` · ${s.jobPosition.name}` : ""}
												</p>
											</div>
										</div>
										<span className="text-xs font-bold text-orange-600 bg-orange-100 px-2 py-1 rounded-lg">
											{calcHours(s.startDatetime, s.endDatetime).toFixed(1)} h
										</span>
									</div>
								))}
							</div>
						)}
					</div>

					{/* STAT + NADCHÁZEJÍCÍ SMĚNY */}
					<div className="grid grid-cols-2 gap-5">
						{/* Naplánováno hodin */}
						<div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5">
							<p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
								Tento měsíc
							</p>
							<div className="space-y-4">
								<div>
									<p className="text-3xl font-black text-slate-800">
										{plannedHours.toFixed(1)}
										<span className="text-sm font-semibold text-slate-400 ml-1">h</span>
									</p>
									<p className="text-xs text-slate-500 mt-0.5">naplánováno</p>
								</div>
								<div className="border-t border-slate-100 pt-4">
									<p className="text-xl font-bold text-green-600">
										{workedHours.toFixed(1)}
										<span className="text-sm font-semibold text-slate-400 ml-1">h</span>
									</p>
									<p className="text-xs text-slate-500 mt-0.5">odpracováno</p>
								</div>
							</div>
						</div>

						{/* Nadcházející směny */}
						<div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5">
							<div className="flex items-center justify-between mb-3">
								<p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
									Nadcházející
								</p>
								<Link
									href="/schedule"
									className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1">
									Vše <ArrowRight size={11} />
								</Link>
							</div>
							{upcomingShifts.length === 0 ? (
								<p className="text-sm text-slate-400 text-center py-4">
									Žádné nadcházející směny
								</p>
							) : (
								<div className="space-y-2">
									{upcomingShifts.map((s) => (
										<div key={s.id} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50">
											<div
												className="h-2 w-2 rounded-full flex-shrink-0"
												style={{ backgroundColor: s.shiftType?.colorCode ?? "#3b82f6" }}
											/>
											<div className="min-w-0">
												<p className="text-xs font-semibold text-slate-700 truncate">
													{formatDate(s.startDatetime)}
												</p>
												<p className="text-xs text-slate-400">
													{formatTime(s.startDatetime)} – {formatTime(s.endDatetime)}
												</p>
											</div>
										</div>
									))}
								</div>
							)}
						</div>
					</div>

					{/* RYCHLÉ AKCE */}
					<div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5">
						<p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
							Rychlé akce
						</p>
						<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
							{[
								{ label: "Moje směny", href: "/schedule", icon: CalendarDays, color: "bg-blue-100 text-blue-600" },
								{ label: "Preference", href: "/preferences", icon: Star, color: "bg-violet-100 text-violet-600" },
								{ label: "Dovolená", href: "/vacations", icon: Plane, color: "bg-green-100 text-green-600" },
								{ label: "Burza směn", href: "/schedule", icon: RefreshCw, color: "bg-orange-100 text-orange-600" },
							].map((action) => {
								const Icon = action.icon;
								return (
									<Link
										key={action.label}
										href={action.href}
										className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 transition-all group">
										<div className={`h-10 w-10 rounded-xl flex items-center justify-center ${action.color}`}>
											<Icon size={20} />
										</div>
										<span className="text-xs font-semibold text-slate-600 group-hover:text-blue-700 text-center">
											{action.label}
										</span>
									</Link>
								);
							})}
						</div>
					</div>
				</div>

				{/* ===== PRAVÝ SLOUPEC (1/3) ===== */}
				<div className="flex flex-col gap-5">
					{/* UPOZORNĚNÍ */}
					<div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5">
						<div className="flex items-center justify-between mb-4">
							<div className="flex items-center gap-2">
								<div className="h-8 w-8 rounded-xl bg-yellow-100 flex items-center justify-center relative">
									<Bell size={16} className="text-yellow-600" />
									{unreadCount > 0 && (
										<span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
											{unreadCount}
										</span>
									)}
								</div>
								<h2 className="text-sm font-bold text-slate-800">Upozornění</h2>
							</div>
							{unreadCount > 0 && (
								<button
									onClick={markAllRead}
									className="text-xs text-slate-400 hover:text-slate-600 font-medium transition-colors">
									Vše přečteno
								</button>
							)}
						</div>

						{notifications.length === 0 ? (
							<div className="text-center py-6 text-slate-400">
								<BellOff size={24} className="mx-auto mb-2 opacity-30" />
								<p className="text-xs">Žádná upozornění</p>
							</div>
						) : (
							<div className="space-y-2 max-h-52 overflow-y-auto">
								{notifications.slice(0, 6).map((n) => (
									<div
										key={n.id}
										className={`p-3 rounded-xl text-xs transition-all ${
											n.isRead
												? "bg-slate-50 text-slate-500"
												: "bg-blue-50 text-slate-700 border border-blue-100"
										}`}>
										<p className="leading-relaxed">{n.message}</p>
										<p className="text-slate-400 mt-1">
											{new Date(n.createdAt).toLocaleDateString("cs-CZ")}
										</p>
									</div>
								))}
							</div>
						)}
					</div>

					{/* KDO DNES PRACUJE */}
					<div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5">
						<div className="flex items-center gap-2 mb-4">
							<div className="h-8 w-8 rounded-xl bg-green-100 flex items-center justify-center">
								<Users size={16} className="text-green-600" />
							</div>
							<div>
								<h2 className="text-sm font-bold text-slate-800">Dnes v práci</h2>
								<p className="text-xs text-slate-400">{todayShifts.length} směn</p>
							</div>
						</div>

						{todayShifts.length === 0 ? (
							<p className="text-xs text-slate-400 text-center py-4">Dnes nikdo nepracuje</p>
						) : (
							<div className="space-y-2 max-h-52 overflow-y-auto">
								{todayShifts.map((s) => (
									<div key={s.id} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50">
										<div className="h-7 w-7 rounded-lg bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
											{s.assignedUser?.fullName?.[0] ?? "?"}
										</div>
										<div className="min-w-0">
											<p className="text-xs font-semibold text-slate-700 truncate">
												{s.assignedUser?.fullName ?? "Nepřiřazeno"}
											</p>
											<p className="text-[11px] text-slate-400">
												{formatTime(s.startDatetime)} – {formatTime(s.endDatetime)}
											</p>
										</div>
									</div>
								))}
							</div>
						)}
					</div>

					{/* NEDÁVNÉ SMĚNY */}
					<div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5 flex-1">
						<div className="flex items-center gap-2 mb-4">
							<div className="h-8 w-8 rounded-xl bg-slate-100 flex items-center justify-center">
								<Clock size={16} className="text-slate-500" />
							</div>
							<h2 className="text-sm font-bold text-slate-800">Nedávné směny</h2>
						</div>

						{pastShifts.length === 0 ? (
							<p className="text-xs text-slate-400 text-center py-4">
								Žádné odpracované směny tento měsíc
							</p>
						) : (
							<div className="space-y-2">
								{pastShifts.map((s) => (
									<div key={s.id} className="flex items-center gap-3 p-2 rounded-lg">
										<CheckCircle2 size={14} className="text-green-500 flex-shrink-0" />
										<div className="min-w-0">
											<p className="text-xs font-medium text-slate-700">
												{formatDate(s.startDatetime)}
											</p>
											<p className="text-[11px] text-slate-400">
												{formatTime(s.startDatetime)} – {formatTime(s.endDatetime)} ·{" "}
												{calcHours(s.startDatetime, s.endDatetime).toFixed(1)} h
											</p>
										</div>
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
