"use client";

import { useEffect, useState, useCallback } from "react";
import { CheckCircle2, CalendarDays, BellOff, RefreshCw } from "lucide-react";
import { Manrope } from "next/font/google";
import api from "@/lib/api";
import { useAuth } from "@/app/components/ProtectedRoute";

import {
	ScheduleGroup,
	VacationRequest,
	Notification,
	Shift,
} from "./_components/types";
import { isToday } from "./_components/helpers";
import { Empty, SectionTitle } from "./_components/SharedUI";
import {
	TodayRow,
	UnassignedRow,
	VacationRow,
	NotifRow,
} from "./_components/Rows";
import { MetricBlock, SchedulePanel, PHASE } from "./_components/Panels";
import "./dashboard.css";

const manropeFont = Manrope({
	subsets: ["latin"],
	weight: ["400", "500", "600", "700", "800"],
	variable: "--font-mr",
});

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
	const [refreshing, setRefreshing] = useState(false);

	const fetchData = useCallback(async () => {
		if (!locationId) return;
		setLoading(true);
		try {
			const [resSched, resVac, resEmp, resNotif] = await Promise.allSettled([
				api.get(
					`/schedule-groups/find?locationId=${locationId}&year=${year}&month=${month}`,
				),
				api.get(`/vacations/location/${locationId}`),
				api.get("/users"),
				api.get("/notifications"),
			]);
			if (resSched.status === "fulfilled") setSchedule(resSched.value.data);
			if (resVac.status === "fulfilled") setVacations(resVac.value.data);
			if (resEmp.status === "fulfilled")
				setEmployeeCount(resEmp.value.data.length);
			if (resNotif.status === "fulfilled")
				setNotifications(resNotif.value.data);
		} finally {
			setLoading(false);
		}
	}, [locationId, year, month]);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	useEffect(() => {
		const token = document.cookie.match(/token=([^;]+)/)?.[1];
		if (!token) return;
		const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
		const es = new EventSource(
			`${API_URL}/notifications/stream?token=${token}`,
		);
		es.onmessage = () =>
			api
				.get<Notification[]>("/notifications")
				.then((r) => setNotifications(r.data));
		return () => es.close();
	}, []);

	const handleRefresh = async () => {
		setRefreshing(true);
		await fetchData();
		setRefreshing(false);
	};
	const markAllRead = async () => {
		await api.patch("/notifications/read-all");
		setNotifications((p) => p.map((n) => ({ ...n, isRead: true })));
	};
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

	const allShifts = schedule?.shifts ?? [];
	const todayShifts = allShifts
		.filter((s) => s.assignedUserId !== null && isToday(s.startDatetime))
		.sort((a, b) => +new Date(a.startDatetime) - +new Date(b.startDatetime));
	const unassignedFuture = allShifts.filter(
		(s) => s.assignedUserId === null && new Date(s.startDatetime) > now,
	);
	const pendingVacations = vacations.filter((v) => v.status === "PENDING");
	const unreadCount = notifications.filter((n) => !n.isRead).length;
	const phase = schedule?.status ? PHASE[schedule.status] : null;

	const root = `${manropeFont.variable} ${manropeFont.variable}`;

	if (loading) {
		return (
			<div
				className={`${root} min-h-full flex items-center justify-center`}
				style={{
					background: "#F0F7F4",
					fontFamily: "var(--font-mr), sans-serif",
				}}>
				<div
					style={{
						color: "#2C6975",
						fontSize: 14,
						fontWeight: 600,
						letterSpacing: "0.06em",
					}}>
					Načítám dashboard…
				</div>
			</div>
		);
	}

	return (
		<div
			className={`${root} min-h-full flex flex-col`}
			style={{
				background: "#F0F7F4",
				color: "#0F2E35",
				overflow: "hidden",
				fontFamily: "var(--font-mr), sans-serif",
			}}>
			{/* ══ HERO ═════════════════════════════════════════════════════════ */}
			<div
				className="a-up px-6 py-12 md:pt-24 md:pb-16 md:px-24 bg-hero-gradient"
				style={
					{
						"--d": "0ms",
						position: "relative",
						overflow: "hidden",
						flexShrink: 0,
					} as React.CSSProperties
				}>
				{/* Dekorativní kruhy a noise */}
				<div
					style={{
						position: "absolute",
						right: -80,
						top: "50%",
						transform: "translateY(-50%)",
						width: 320,
						height: 320,
						borderRadius: "50%",
						border: "1px solid rgba(104,178,160,.18)",
						pointerEvents: "none",
					}}
				/>
				<div
					style={{
						position: "absolute",
						right: -20,
						top: "50%",
						transform: "translateY(-50%)",
						width: 200,
						height: 200,
						borderRadius: "50%",
						border: "1px solid rgba(104,178,160,.12)",
						pointerEvents: "none",
					}}
				/>
				<div
					style={{
						position: "absolute",
						right: 40,
						top: "50%",
						transform: "translateY(-50%)",
						width: 100,
						height: 100,
						borderRadius: "50%",
						background:
							"radial-gradient(circle, rgba(104,178,160,.15) 0%, transparent 70%)",
						pointerEvents: "none",
					}}
				/>
				<div
					style={{
						position: "absolute",
						inset: 0,
						backgroundImage:
							"url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
						opacity: 0.03,
						pointerEvents: "none",
						mixBlendMode: "overlay",
					}}
				/>

				<div className="relative flex flex-col md:flex-row md:items-start justify-between gap-6 md:gap-0">
					<div>
						<p
							style={{
								color: "rgba(205,224,201,.5)",
								fontSize: 11,
								fontWeight: 600,
								letterSpacing: "0.14em",
								textTransform: "uppercase",
								marginBottom: 10,
							}}>
							Shiftplanner · Admin
						</p>
						<h1 style={{ color: "#fff", lineHeight: 1.05 }}>
							<span
								style={{
									display: "block",
									fontSize: 13,
									fontWeight: 400,
									color: "rgba(255,255,255,.45)",
									marginBottom: 4,
								}}>
								{now.toLocaleDateString("cs-CZ", { weekday: "long" })}
							</span>
							<span className="block text-[32px] md:text-[38px] font-extrabold">
								{now.toLocaleDateString("cs-CZ", {
									day: "numeric",
									month: "long",
									year: "numeric",
								})}
							</span>
						</h1>
					</div>

					<div className="flex items-center gap-2 md:gap-[10px] shrink-0 pt-1">
						{phase && (
							<div
								style={{
									display: "flex",
									alignItems: "center",
									gap: 8,
									background: "rgba(255,255,255,.1)",
									border: "1px solid rgba(255,255,255,.15)",
									borderRadius: 99,
									padding: "8px 16px",
									backdropFilter: "blur(8px)",
								}}>
								<span
									className="a-pulse"
									style={{
										width: 7,
										height: 7,
										borderRadius: "50%",
										background: phase.dot,
										boxShadow: `0 0 6px ${phase.dot}`,
										flexShrink: 0,
									}}
								/>
								<span
									style={{
										color: "rgba(255,255,255,.8)",
										fontSize: 12,
										fontWeight: 600,
									}}>
									{phase.label}
								</span>
							</div>
						)}
						<button
							onClick={handleRefresh}
							style={{
								width: 40,
								height: 40,
								borderRadius: "50%",
								background: "rgba(255,255,255,.1)",
								border: "1px solid rgba(255,255,255,.15)",
								color: "rgba(255,255,255,.7)",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								cursor: "pointer",
								backdropFilter: "blur(8px)",
								transition: "all .15s",
							}}>
							<RefreshCw
								size={14}
								style={{
									transition: "transform .6s",
									transform: refreshing ? "rotate(360deg)" : "none",
								}}
							/>
						</button>
					</div>
				</div>
			</div>

			{/* ══ METRIKY ══════════════════════════════════════════════════════ */}
			<div
				className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mx-6 md:mx-24 -mt-8 md:-mt-14 relative z-10 bg-white rounded-[18px] shrink-0 overflow-hidden"
				style={{
					border: "1px solid #DDF0E8",
					boxShadow:
						"0 8px 40px rgba(28,78,90,.12), 0 2px 8px rgba(28,78,90,.06)",
				}}>
				<MetricBlock label="Zaměstnanci" value={employeeCount} delay={70} />
				<MetricBlock
					label="Neobsazené"
					value={unassignedFuture.length}
					delay={140}
					alert={unassignedFuture.length > 0}
					alertSub="bez obsazení"
				/>
				<MetricBlock
					label="Ke schválení"
					value={pendingVacations.length}
					delay={210}
					alert={pendingVacations.length > 0}
					alertSub="dovolených"
				/>
				<MetricBlock
					label="Pracují dnes"
					value={todayShifts.length}
					delay={280}
					last
				/>
			</div>

			{/* ══ OBSAH ════════════════════════════════════════════════════════ */}
			<div className="flex-1 flex flex-col xl:grid xl:grid-cols-[1.35fr_1fr] gap-5 px-6 py-6 md:px-24 md:pb-11 md:pt-6 min-h-0">
				{/* ── LEVÝ SLOUPEC ── */}
				<div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
					{/* Dnešní směny */}
					<div
						className="card a-up"
						style={
							{
								"--d": "110ms",
								padding: "28px 28px 20px",
								flex: 1,
							} as React.CSSProperties
						}>
						<SectionTitle title="Kdo pracuje dnes" badge={todayShifts.length} />
						{todayShifts.length === 0 ? (
							<Empty icon={CalendarDays} text="Dnes nikdo neplánuje." />
						) : (
							<>
								<div
									style={{
										display: "grid",
										gridTemplateColumns: "1fr 120px 100px",
										padding: "0 6px 8px",
										borderBottom: "2px solid #DDF0E8",
									}}>
									{["Zaměstnanec", "Časy", "Typ"].map((h, i) => (
										<span
											key={h}
											style={{
												fontSize: 10,
												fontWeight: 600,
												color: "#9ABABA",
												letterSpacing: "0.1em",
												textTransform: "uppercase",
												textAlign: i === 2 ? "right" : "left",
											}}>
											{h}
										</span>
									))}
								</div>
								<div
									className="scr"
									style={{
										overflowY: "auto",
										maxHeight: 280,
										paddingRight: 2,
									}}>
									{todayShifts.map((s, i) => (
										<TodayRow key={s.id} shift={s} index={i} />
									))}
								</div>
							</>
						)}
					</div>

					{/* Neobsazené směny */}
					<div
						className="card a-up"
						style={
							{
								"--d": "190ms",
								padding: "28px 28px 20px",
							} as React.CSSProperties
						}>
						<SectionTitle
							title="Neobsazené směny"
							badge={unassignedFuture.length}
							warn
						/>
						{unassignedFuture.length === 0 ? (
							<Empty
								icon={CheckCircle2}
								text="Všechny nadcházející směny jsou obsazeny."
								positive
							/>
						) : (
							<>
								<div
									style={{
										display: "grid",
										gridTemplateColumns: "80px 1fr 100px",
										padding: "0 6px 8px",
										borderBottom: "2px solid #DDF0E8",
									}}>
									{["Datum", "Pozice", "Časy"].map((h, i) => (
										<span
											key={h}
											style={{
												fontSize: 10,
												fontWeight: 600,
												color: "#9ABABA",
												letterSpacing: "0.1em",
												textTransform: "uppercase",
												textAlign: i === 2 ? "right" : "left",
											}}>
											{h}
										</span>
									))}
								</div>
								<div
									className="scr"
									style={{ overflowY: "auto", maxHeight: 200 }}>
									{unassignedFuture.slice(0, 8).map((s, i) => (
										<UnassignedRow key={s.id} shift={s} index={i} />
									))}
									{unassignedFuture.length > 8 && (
										<p
											style={{
												textAlign: "center",
												padding: "10px 0",
												fontSize: 12,
												color: "#9ABABA",
											}}>
											+ {unassignedFuture.length - 8} dalších
										</p>
									)}
								</div>
							</>
						)}
					</div>
				</div>

				{/* ── PRAVÝ SLOUPEC ── */}
				<div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
					{/* Žádosti o dovolenou */}
					<div
						className="card-inv a-up"
						style={
							{
								"--d": "150ms",
								padding: "28px",
								flex: 1,
								position: "relative",
								overflow: "hidden",
							} as React.CSSProperties
						}>
						<div
							style={{
								position: "absolute",
								bottom: -40,
								right: -40,
								width: 160,
								height: 160,
								borderRadius: "50%",
								border: "1px solid rgba(205,224,201,.1)",
								pointerEvents: "none",
							}}
						/>
						<div
							style={{
								position: "absolute",
								bottom: 10,
								right: 10,
								width: 80,
								height: 80,
								borderRadius: "50%",
								border: "1px solid rgba(205,224,201,.08)",
								pointerEvents: "none",
							}}
						/>

						<div
							style={{
								display: "flex",
								alignItems: "center",
								justifyContent: "space-between",
								marginBottom: 20,
							}}>
							<div>
								<p
									style={{
										color: "rgba(205,224,201,.5)",
										fontSize: 10,
										fontWeight: 600,
										letterSpacing: "0.12em",
										textTransform: "uppercase",
										marginBottom: 4,
									}}>
									Schválení
								</p>
								<h2 style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}>
									Žádosti o dovolenou
								</h2>
							</div>
							{pendingVacations.length > 0 && (
								<span
									style={{
										background: "rgba(255,255,255,.15)",
										border: "1px solid rgba(255,255,255,.2)",
										color: "#fff",
										fontSize: 13,
										fontWeight: 700,
										width: 32,
										height: 32,
										borderRadius: "50%",
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
									}}>
									{pendingVacations.length}
								</span>
							)}
						</div>

						{pendingVacations.length === 0 ? (
							<div
								style={{
									display: "flex",
									flexDirection: "column",
									alignItems: "center",
									gap: 10,
									padding: "24px 0",
								}}>
								<CheckCircle2 size={22} color="rgba(205,224,201,.4)" />
								<p style={{ color: "rgba(255,255,255,.35)", fontSize: 13 }}>
									Žádné čekající žádosti.
								</p>
							</div>
						) : (
							<div
								className="scr"
								style={{
									overflowY: "auto",
									maxHeight: 300,
									display: "flex",
									flexDirection: "column",
									gap: 10,
								}}>
								{pendingVacations.slice(0, 5).map((req, i) => (
									<VacationRow
										key={req.id}
										req={req}
										index={i}
										processing={processingId === req.id}
										onAction={handleVacation}
									/>
								))}
								{pendingVacations.length > 5 && (
									<p
										style={{
											textAlign: "center",
											fontSize: 12,
											color: "rgba(255,255,255,.3)",
										}}>
										+ {pendingVacations.length - 5} dalších
									</p>
								)}
							</div>
						)}
					</div>

					<div className="flex flex-col md:grid md:grid-cols-2 gap-5">
						{/* Stav rozvrhu */}
						<div
							className="card a-up"
							style={
								{ "--d": "230ms", padding: "24px" } as React.CSSProperties
							}>
							<SectionTitle title="Stav rozvrhu" small />
							<SchedulePanel schedule={schedule} allShifts={allShifts} />
						</div>

						{/* Upozornění */}
						<div
							className="card a-up"
							style={
								{ "--d": "290ms", padding: "24px" } as React.CSSProperties
							}>
							<div
								style={{
									display: "flex",
									alignItems: "center",
									justifyContent: "space-between",
									marginBottom: 16,
								}}>
								<SectionTitle title="Log" small noMargin />
								{unreadCount > 0 && (
									<button
										onClick={markAllRead}
										style={{
											fontSize: 10,
											fontWeight: 600,
											color: "#68B2A0",
											background: "none",
											border: "none",
											cursor: "pointer",
											letterSpacing: "0.06em",
										}}>
										Přečíst vše
									</button>
								)}
							</div>
							{notifications.length === 0 ? (
								<Empty icon={BellOff} text="Prázdný log." small />
							) : (
								<div
									className="scr"
									style={{
										overflowY: "auto",
										maxHeight: 180,
										display: "flex",
										flexDirection: "column",
										gap: 2,
									}}>
									{notifications.slice(0, 8).map((n, i) => (
										<NotifRow key={n.id} notif={n} index={i} />
									))}
								</div>
							)}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
