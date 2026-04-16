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
	Loader2
} from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/app/components/ProtectedRoute";
import { PageContainer, HeroHeader } from "@/app/components/AdminLayout";
import "@/app/(dashboard)/(admin)/admin/dashboard/dashboard.css";

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
	content: string;
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
			<PageContainer>
				<HeroHeader subtitle="Načítám..." title="Přehled zpráv" />
				<div className="flex justify-center items-center h-40">
					<div className="flex flex-col items-center gap-3 text-sm font-bold uppercase tracking-widest text-[#9ABABA]">
						<Loader2 size={24} className="animate-spin" color="#68B2A0" /> Načítám dashboard...
					</div>
				</div>
			</PageContainer>
		);
	}

	return (
		<PageContainer>
			{/* Místo původního nadpisu použijeme HeroHeader s proměnnou dobou a jménem */}
			<HeroHeader 
				subtitle={now.toLocaleDateString("cs-CZ", {
					weekday: "long",
					day: "numeric",
					month: "long",
					year: "numeric"
				})}
				title={`Dobrý den, ${user?.fullName?.split(" ")[0] ?? "uživateli"}`} 
			/>

			<div className="flex-1 px-6 md:px-24 md:pb-11 flex flex-col pt-6 md:-mt-8 min-h-0 z-10 relative">
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
					{/* ===== LEVÝ SLOUPEC (2/3) ===== */}
					<div className="lg:col-span-2 flex flex-col gap-5">

						{/* BURZA SMĚN */}
						<div className="card shadow-md p-5">
							<div className="flex items-center justify-between mb-4">
								<div className="flex items-center gap-3">
									<div className="h-10 w-10 rounded-xl flex items-center justify-center bg-[rgba(200,90,48,.1)]">
										<RefreshCw size={20} className="text-[#C85A30]" />
									</div>
									<div>
										<h2 className="text-sm font-bold text-[#0F2E35]">Burza směn</h2>
										<p className="text-xs text-[#9ABABA] font-semibold">Směny nabídnuté kolegy k převzetí</p>
									</div>
								</div>
								<Link
									href="/schedule"
									className="text-xs font-black uppercase tracking-wider text-[#68B2A0] hover:brightness-110 flex items-center gap-1">
									Zobrazit vše <ArrowRight size={14} />
								</Link>
							</div>

							{marketplaceShifts.length === 0 ? (
								<div className="text-center py-8 text-[#9ABABA]">
									<RefreshCw size={28} className="mx-auto mb-2 opacity-30" />
									<p className="text-[10px] font-black uppercase tracking-widest">Žádné směny na burze</p>
								</div>
							) : (
								<div className="space-y-2">
									{marketplaceShifts.map((s, idx) => (
										<div
											key={s.id}
											className="a-fade flex items-center justify-between p-3.5 rounded-xl border border-[rgba(200,90,48,.2)] bg-[rgba(200,90,48,.03)] hover:bg-[rgba(200,90,48,.06)] transition-all"
											style={{ "--d": `${idx * 40}ms` } as React.CSSProperties}>
											<div className="flex items-center gap-3">
												<div
													className="h-3 w-3 rounded-full flex-shrink-0 shadow-sm"
													style={{ backgroundColor: s.shiftType?.colorCode ?? "#C85A30" }}
												/>
												<div>
													<p className="text-[13px] font-black text-[#C85A30]">
														{formatDate(s.startDatetime)}
													</p>
													<p className="text-xs font-semibold text-[#9ABABA] mt-0.5">
														{formatTime(s.startDatetime)} – {formatTime(s.endDatetime)}
														{s.jobPosition ? ` · ${s.jobPosition.name}` : ""}
													</p>
												</div>
											</div>
											<span className="text-[10px] font-black uppercase text-white px-2.5 py-1.5 rounded-lg shadow-sm bg-[#C85A30]">
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
							<div className="card shadow-md p-5 flex flex-col justify-center">
								<p className="text-[10px] font-black text-[#9ABABA] uppercase tracking-widest mb-4">
									Tento měsíc
								</p>
								<div className="space-y-6">
									<div className="a-up">
										<p className="text-4xl font-extrabold text-[#0F2E35] leading-none mb-1">
											{plannedHours.toFixed(1)}
											<span className="text-sm font-bold text-[#9ABABA] ml-1.5">h</span>
										</p>
										<p className="text-[11px] font-bold uppercase tracking-wider text-[#9ABABA]">Naplánováno</p>
									</div>
									<div className="border-t pt-5 a-up" style={{ borderColor: "#DDF0E8", "--d": "50ms" } as React.CSSProperties}>
										<p className="text-2xl font-extrabold text-[#68B2A0] leading-none mb-1">
											{workedHours.toFixed(1)}
											<span className="text-xs font-bold text-[#9ABABA] ml-1.5">h</span>
										</p>
										<p className="text-[11px] font-bold uppercase tracking-wider text-[#9ABABA]">Odpracováno</p>
									</div>
								</div>
							</div>

							{/* Nadcházející směny */}
							<div className="card shadow-md p-5">
								<div className="flex items-center justify-between mb-4">
									<p className="text-[10px] font-black text-[#9ABABA] uppercase tracking-widest">
										Nadcházející
									</p>
									<Link
										href="/schedule"
										className="text-[10px] font-black uppercase text-[#68B2A0] hover:brightness-110 transition-colors flex items-center gap-1">
										Vše <ArrowRight size={12} />
									</Link>
								</div>
								{upcomingShifts.length === 0 ? (
									<p className="text-[10px] font-bold uppercase text-[#9ABABA] text-center py-4 tracking-widest">
										Žádné nadcházející směny
									</p>
								) : (
									<div className="space-y-2">
										{upcomingShifts.map((s, idx) => (
											<div key={s.id} className="a-fade flex items-center gap-3 p-3 rounded-xl bg-[#F0F7F4]" style={{ "--d": `${idx * 40}ms` } as React.CSSProperties}>
												<div
													className="h-2 w-2 rounded-full flex-shrink-0"
													style={{ backgroundColor: s.shiftType?.colorCode ?? "#2C6975" }}
												/>
												<div className="min-w-0">
													<p className="text-[12px] font-extrabold text-[#0F2E35] truncate leading-tight mb-0.5">
														{formatDate(s.startDatetime)}
													</p>
													<p className="text-[10px] font-bold text-[#5A8A8A]">
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
						<div className="card shadow-md p-5">
							<p className="text-[10px] font-black text-[#9ABABA] uppercase tracking-widest mb-4">
								Rychlé akce
							</p>
							<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
								{[
									{ label: "Moje směny", href: "/schedule", icon: CalendarDays, color: "bg-[#E6F2EE] text-[#2C6975]" },
									{ label: "Preference", href: "/preferences", icon: Star, color: "bg-[#FDEEDC] text-[#C85A30]" },
									{ label: "Dovolená", href: "/vacations", icon: Plane, color: "bg-[rgba(104,178,160,.15)] text-[#68B2A0]" },
									{ label: "Burza směn", href: "/schedule", icon: RefreshCw, color: "bg-[rgba(200,90,48,.1)] text-[#C85A30]" },
								].map((action, idx) => {
									const Icon = action.icon;
									return (
										<Link
											key={action.label}
											href={action.href}
											className="a-up flex flex-col items-center gap-3 p-4 rounded-xl border hover:border-[#68B2A0] hover:shadow-lg hover:scale-[1.02] active:scale-95 transition-all group"
											style={{ borderColor: "#DDF0E8", "--d": `${idx * 40}ms` } as React.CSSProperties}>
											<div className={`h-10 w-10 rounded-xl flex items-center justify-center ${action.color}`}>
												<Icon size={20} />
											</div>
											<span className="text-[10px] font-black text-[#5A8A8A] uppercase tracking-wider group-hover:text-[#2C6975] text-center">
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
						<div className="card shadow-md p-5 flex-shrink-0 max-h-[300px] flex flex-col">
							<div className="flex items-center justify-between mb-4 flex-shrink-0">
								<div className="flex items-center gap-3">
									<div className="h-9 w-9 rounded-xl bg-[#FDEEDC] flex items-center justify-center relative">
										<Bell size={18} className="text-[#C85A30]" />
										{unreadCount > 0 && (
											<span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-[#C85A30] text-white text-[9px] font-extrabold flex items-center justify-center shadow-sm">
												{unreadCount}
											</span>
										)}
									</div>
									<h2 className="text-sm font-extrabold text-[#0F2E35]">Upozornění</h2>
								</div>
								{unreadCount > 0 && (
									<button
										onClick={markAllRead}
										className="text-[10px] uppercase font-black tracking-widest text-[#9ABABA] hover:text-[#0F2E35] transition-colors">
										Přečteno
									</button>
								)}
							</div>

							<div className="overflow-y-auto pr-1 space-y-2.5 flex-1 min-h-[100px]">
							{notifications.length === 0 ? (
								<div className="text-center py-6 text-[#9ABABA]">
									<BellOff size={24} className="mx-auto mb-2 opacity-30" />
									<p className="text-[10px] uppercase font-bold tracking-widest">Žádná upozornění</p>
								</div>
							) : (
									notifications.slice(0, 6).map((n) => (
										<div
											key={n.id}
											className={`p-3 rounded-xl border text-xs transition-all ${
												n.isRead
													? "bg-white border-[#DDF0E8] text-[#5A8A8A]"
													: "bg-[#F0F7F4] border-[#68B2A0] text-[#0F2E35] font-semibold"
											}`}>
											<p className="leading-snug">{n.content}</p>
											<p className="text-[10px] text-[#9ABABA] font-bold uppercase tracking-wider mt-1.5">
												{new Date(n.createdAt).toLocaleDateString("cs-CZ")}
											</p>
										</div>
									))
							)}
							</div>
						</div>

						{/* KDO DNES PRACUJE */}
						<div className="card shadow-md p-5 flex-shrink-0">
							<div className="flex items-center gap-3 mb-4">
								<div className="h-9 w-9 rounded-xl bg-[#E6F2EE] flex items-center justify-center">
									<Users size={18} className="text-[#2C6975]" />
								</div>
								<div>
									<h2 className="text-sm font-extrabold text-[#0F2E35]">Dnes v práci</h2>
									<p className="text-[10px] font-bold text-[#5A8A8A] uppercase tracking-wider">{todayShifts.length} směn</p>
								</div>
							</div>

							{todayShifts.length === 0 ? (
								<p className="text-[10px] uppercase font-bold tracking-widest text-[#9ABABA] text-center py-4">Dnes nikdo nepracuje</p>
							) : (
								<div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
									{todayShifts.map((s) => (
										<div key={s.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-white border" style={{ borderColor: "#DDF0E8" }}>
											<div className="h-8 w-8 rounded-xl bg-[rgba(104,178,160,.1)] flex items-center justify-center text-[#68B2A0] font-black text-xs flex-shrink-0">
												{s.assignedUser?.fullName?.[0] ?? "?"}
											</div>
											<div className="min-w-0">
												<p className="text-[12px] font-extrabold text-[#0F2E35] truncate leading-tight mb-0.5">
													{s.assignedUser?.fullName ?? "Nepřiřazeno"}
												</p>
												<p className="text-[10px] font-bold text-[#5A8A8A]">
													{formatTime(s.startDatetime)} – {formatTime(s.endDatetime)}
												</p>
											</div>
										</div>
									))}
								</div>
							)}
						</div>

						{/* NEDÁVNÉ SMĚNY */}
						<div className="card shadow-md p-5 flex-1 flex flex-col">
							<div className="flex items-center gap-3 mb-4 flex-shrink-0">
								<div className="h-9 w-9 rounded-xl border flex items-center justify-center bg-white" style={{ borderColor: "#DDF0E8" }}>
									<Clock size={18} className="text-[#9ABABA]" />
								</div>
								<h2 className="text-sm font-extrabold text-[#0F2E35]">Nedávné směny</h2>
							</div>

							<div className="overflow-y-auto pr-1 space-y-2 flex-1">
							{pastShifts.length === 0 ? (
								<p className="text-[10px] uppercase font-bold tracking-widest text-[#9ABABA] text-center py-4">
									Zatím žádné odpracované
								</p>
							) : (
									pastShifts.map((s) => (
										<div key={s.id} className="flex items-center gap-3 p-2.5 border-b last:border-0" style={{ borderColor: "#F0F7F4" }}>
											<CheckCircle2 size={16} className="text-[#68B2A0] flex-shrink-0" />
											<div className="min-w-0">
												<p className="text-[12px] font-extrabold text-[#0F2E35]">
													{formatDate(s.startDatetime)}
												</p>
												<p className="text-[10px] font-bold text-[#9ABABA]">
													{formatTime(s.startDatetime)} – {formatTime(s.endDatetime)} ·{" "}
													{calcHours(s.startDatetime, s.endDatetime).toFixed(1)} h
												</p>
											</div>
										</div>
									))
							)}
							</div>
						</div>
					</div>
				</div>
			</div>
		</PageContainer>
	);
}
