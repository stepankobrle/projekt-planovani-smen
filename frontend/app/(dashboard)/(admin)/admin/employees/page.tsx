"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
	UserPlus,
	Mail,
	Trash2,
	Search,
	CheckCircle2,
	Clock,
	Briefcase,
	X,
	UserCog,
	ShieldAlert,
	Loader2,
	Pencil,
	AlertTriangle,
	ChevronLeft,
	ChevronRight,
} from "lucide-react";

const MONTHS_CS = [
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
import { UserRole } from "@/config/menu";
import { useRouter } from "next/navigation";
import ProtectedRoute, { useAuth } from "@/app/components/ProtectedRoute";
import api from "@/lib/api";

// --- TYPY ---
interface JobPosition {
	id: number;
	name: string;
	isManagerial: boolean;
}

interface Employee {
	id: string;
	fullName: string | null;
	email: string;
	role: UserRole;
	isActivated: boolean;
	targetHoursPerMonth?: number;
	jobPositionId?: number;
	jobPosition?: { id: number; name: string };
}

interface EmployeeStats {
	userId: string;
	workedHours: number;
	scheduledHours: number;
	totalHours: number;
	overtime: number;
	vacationDays: number;
	pendingVacationDays: number;
}

type FilterType = "ALL" | "PROBLEMATIC" | "PENDING_ACTIVATION";

const emptyStats: Omit<EmployeeStats, "userId"> = {
	workedHours: 0,
	scheduledHours: 0,
	totalHours: 0,
	overtime: 0,
	vacationDays: 0,
	pendingVacationDays: 0,
};

function isProblematic(emp: Employee, stats: EmployeeStats): boolean {
	const target = Number(emp.targetHoursPerMonth) || 160;
	return stats.totalHours < target * 0.8 || stats.overtime > 20;
}

// --- KOMPONENTA ---
export default function EmployeesPage() {
	const { role } = useAuth();
	const router = useRouter();

	const [employees, setEmployees] = useState<Employee[]>([]);
	const [jobPositions, setJobPositions] = useState<JobPosition[]>([]);
	const [statsMap, setStatsMap] = useState<Map<string, EmployeeStats>>(
		new Map(),
	);

	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
	const [loadingModal, setLoadingModal] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	const [searchQuery, setSearchQuery] = useState("");
	const [activeFilter, setActiveFilter] = useState<FilterType>("ALL");

	const now = new Date();
	const [selectedYear, setSelectedYear] = useState(now.getFullYear());
	const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);

	const prevMonth = () => {
		if (selectedMonth === 1) {
			setSelectedMonth(12);
			setSelectedYear((y) => y - 1);
		} else setSelectedMonth((m) => m - 1);
	};
	const nextMonth = () => {
		if (selectedMonth === 12) {
			setSelectedMonth(1);
			setSelectedYear((y) => y + 1);
		} else setSelectedMonth((m) => m + 1);
	};

	const [formData, setFormData] = useState({
		email: "",
		fullName: "",
		role: UserRole.EMPLOYEE,
		targetHours: 160,
		jobPositionId: "",
	});

	const isAdmin = role === "ADMIN";

	useEffect(() => {
		if (!isAdmin) {
			const timer = setTimeout(() => router.push("/admin/dashboard"), 3000);
			return () => clearTimeout(timer);
		}
	}, [isAdmin, router]);

	const fetchData = useCallback(async () => {
		if (!isAdmin) return;
		try {
			const [resUsers, resPositions] = await Promise.all([
				api.get("/users"),
				api.get("/job-positions"),
			]);
			setEmployees(resUsers.data);
			setJobPositions(resPositions.data);
		} catch (err: any) {
			console.error("Chyba při načítání zaměstnanců:", err);
		}
		try {
			const resStats = await api.get(
				`/users/stats?year=${selectedYear}&month=${selectedMonth}`,
			);
			const map = new Map<string, EmployeeStats>();
			for (const s of resStats.data as EmployeeStats[]) {
				map.set(s.userId, s);
			}
			setStatsMap(map);
		} catch (err: any) {
			console.error("Chyba při načítání statistik:", err);
		}
	}, [isAdmin, selectedYear, selectedMonth]);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	// --- MODÁLY ---
	const openAddModal = () => {
		setEditingEmployee(null);
		setFormData({
			email: "",
			fullName: "",
			role: UserRole.EMPLOYEE,
			targetHours: 160,
			jobPositionId: "",
		});
		setError("");
		setIsModalOpen(true);
	};

	const openEditModal = async (emp: Employee) => {
		setIsModalOpen(true);
		setLoadingModal(true);
		setError("");
		try {
			const res = await api.get(`/users/${emp.id}`);
			const fresh: Employee = res.data;
			setEditingEmployee(fresh);
			setFormData({
				email: fresh.email,
				fullName: fresh.fullName || "",
				role: fresh.role,
				targetHours: fresh.targetHoursPerMonth || 160,
				jobPositionId:
					fresh.jobPositionId?.toString() ||
					fresh.jobPosition?.id.toString() ||
					"",
			});
		} catch {
			setError("Nepodařilo se načíst data zaměstnance.");
		} finally {
			setLoadingModal(false);
		}
	};

	const handleDelete = async (id: string, e: React.MouseEvent) => {
		e.stopPropagation();
		if (!confirm("Opravdu chcete smazat/zneaktivnit tohoto zaměstnance?"))
			return;
		try {
			await api.delete(`/users/${id}`);
			fetchData();
		} catch {
			alert("Chyba při mazání uživatele.");
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError("");
		const isEditMode = !!editingEmployee;
		const url = isEditMode ? `/users/${editingEmployee!.id}` : "/users/invite";
		const payload = {
			...formData,
			targetHours: Number(formData.targetHours),
			jobPositionId: Number(formData.jobPositionId),
		};
		try {
			isEditMode ? await api.patch(url, payload) : await api.post(url, payload);
			setIsModalOpen(false);
			fetchData();
		} catch (err: any) {
			setError(err.response?.data?.message || "Chyba při ukládání dat.");
		} finally {
			setLoading(false);
		}
	};

	// --- FILTRY ---
	const problematicCount = useMemo(
		() =>
			employees.filter((emp) =>
				isProblematic(
					emp,
					statsMap.get(emp.id) ?? { userId: emp.id, ...emptyStats },
				),
			).length,
		[employees, statsMap],
	);
	const pendingCount = employees.filter((e) => !e.isActivated).length;

	const filteredEmployees = useMemo(() => {
		let result = employees;
		if (searchQuery) {
			const q = searchQuery.toLowerCase();
			result = result.filter(
				(emp) =>
					(emp.fullName?.toLowerCase() || "").includes(q) ||
					emp.email.toLowerCase().includes(q),
			);
		}
		if (activeFilter === "PROBLEMATIC") {
			result = result.filter((emp) =>
				isProblematic(
					emp,
					statsMap.get(emp.id) ?? { userId: emp.id, ...emptyStats },
				),
			);
		} else if (activeFilter === "PENDING_ACTIVATION") {
			result = result.filter((emp) => !emp.isActivated);
		}
		return result;
	}, [employees, searchQuery, activeFilter, statsMap]);

	// --- GUARD ---
	if (!isAdmin)
		return (
			<div className="flex flex-col items-center justify-center h-screen px-4 text-center">
				<div className="bg-red-100 p-6 rounded-full mb-6">
					<ShieldAlert className="text-red-600 w-16 h-16" />
				</div>
				<h1 className="text-3xl font-bold text-slate-900 mb-2">
					Přístup odepřen
				</h1>
				<p className="text-slate-500 max-w-md mb-8">
					Za chvíli vás přesměrujeme zpět.
				</p>
				<Loader2 className="animate-spin text-slate-400" size={24} />
			</div>
		);

	return (
		<ProtectedRoute>
			<div className="space-y-6 animate-in fade-in duration-500">
				{/* HLAVIČKA */}
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
					<div>
						<h1 className="text-2xl font-bold text-slate-900 tracking-tight">
							Zaměstnanci
						</h1>
						<p className="text-slate-500 text-sm mt-1">
							Přehled týmu, hodin a stavu — aktuální měsíc.
						</p>
					</div>
					<button
						onClick={openAddModal}
						className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg transition-all active:scale-95">
						<UserPlus size={18} /> Pozvat zaměstnance
					</button>
				</div>

				{/* VÝBĚR MĚSÍCE */}
				<div className="flex items-center gap-3 self-start">
					<button
						onClick={prevMonth}
						className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-all">
						<ChevronLeft size={16} />
					</button>
					<span className="text-sm font-bold text-slate-800 min-w-[130px] text-center">
						{MONTHS_CS[selectedMonth - 1]} {selectedYear}
					</span>
					<button
						onClick={nextMonth}
						className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-all">
						<ChevronRight size={16} />
					</button>
				</div>

				{/* FILTRY */}
				<div className="flex flex-col sm:flex-row gap-3">
					<div className="relative flex-1 max-w-sm">
						<Search
							className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
							size={18}
						/>
						<input
							type="text"
							placeholder="Hledat podle jména nebo emailu..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
						/>
					</div>
					<div className="flex gap-2 flex-wrap">
						{(
							[
								{
									key: "ALL",
									label: "Všichni",
									count: employees.length,
									danger: false,
								},
								{
									key: "PROBLEMATIC",
									label: "Problematičtí",
									count: problematicCount,
									danger: true,
								},
								{
									key: "PENDING_ACTIVATION",
									label: "Čekající",
									count: pendingCount,
									danger: false,
								},
							] as {
								key: FilterType;
								label: string;
								count: number;
								danger: boolean;
							}[]
						).map((f) => (
							<button
								key={f.key}
								onClick={() => setActiveFilter(f.key)}
								className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
									activeFilter === f.key
										? f.danger
											? "bg-red-600 text-white"
											: "bg-blue-600 text-white"
										: f.danger
											? "bg-white border border-red-200 text-red-600 hover:bg-red-50"
											: "bg-white border border-slate-200 text-slate-600 hover:border-blue-300"
								}`}>
								{f.label}
								{f.count > 0 && (
									<span
										className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
											activeFilter === f.key
												? "bg-white/20"
												: f.danger
													? "bg-red-100 text-red-600"
													: "bg-slate-100 text-slate-600"
										}`}>
										{f.count}
									</span>
								)}
							</button>
						))}
					</div>
				</div>

				{/* TABULKA */}
				<div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
					<table className="w-full text-left border-collapse">
						<thead>
							<tr className="bg-slate-50/50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
								<th className="px-6 py-4 font-semibold">Zaměstnanec</th>
								<th className="px-6 py-4 font-semibold">Odpracováno</th>
								<th className="px-6 py-4 font-semibold">Naplánováno</th>
								<th className="px-6 py-4 font-semibold">Přesčas / Zbývá</th>
								<th className="px-6 py-4 font-semibold">Dovolená</th>
								<th className="px-6 py-4 font-semibold">Stav</th>
								<th className="px-6 py-4 font-semibold text-right">Akce</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-slate-100">
							{filteredEmployees.map((emp) => {
								const stats = statsMap.get(emp.id) ?? {
									userId: emp.id,
									...emptyStats,
								};
								const target = Number(emp.targetHoursPerMonth) || 160;
								const problematic = isProblematic(emp, stats);
								const progress = Math.min(
									100,
									(stats.totalHours / target) * 100,
								);
								const isUnder = stats.totalHours < target * 0.8;
								const isOvertime = stats.overtime > 20;

								return (
									<tr
										key={emp.id}
										className={`transition-colors ${
											problematic
												? "bg-red-50/40 hover:bg-red-50/60"
												: "hover:bg-slate-50/50"
										}`}>
										{/* ZAMĚSTNANEC */}
										<td className="px-6 py-4">
											<div className="flex items-center gap-3">
												<div
													className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
														problematic
															? "bg-red-100 text-red-600"
															: "bg-blue-50 text-blue-600"
													}`}>
													{emp.fullName ? (
														emp.fullName[0].toUpperCase()
													) : (
														<Mail size={14} />
													)}
												</div>
												<div>
													<div className="flex items-center gap-1.5">
														<span className="font-semibold text-slate-900 text-sm">
															{emp.fullName || "Čeká na registraci"}
														</span>
														{problematic && (
															<AlertTriangle
																size={13}
																className="text-red-500"
															/>
														)}
													</div>
													<div className="text-xs text-slate-400">
														{emp.email}
													</div>
													<div className="flex items-center gap-1.5 mt-1 flex-wrap">
														<span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
															{emp.role}
														</span>
														{emp.jobPosition && (
															<span className="text-[10px] text-slate-400 flex items-center gap-0.5">
																<Briefcase size={10} /> {emp.jobPosition.name}
															</span>
														)}
													</div>
												</div>
											</div>
										</td>

										{/* ODPRACOVÁNO */}
										<td className="px-6 py-4">
											<div className="text-sm font-bold text-slate-800">
												{stats.workedHours.toFixed(1)} h
											</div>
											<div className="w-24 h-1.5 bg-slate-100 rounded-full mt-1.5 overflow-hidden">
												<div
													className={`h-full rounded-full transition-all ${
														isUnder ? "bg-amber-400" : "bg-blue-500"
													}`}
													style={{ width: `${progress}%` }}
												/>
											</div>
											<div className="text-[10px] text-slate-400 mt-0.5">
												cíl {target} h
											</div>
										</td>

										{/* NAPLÁNOVÁNO */}
										<td className="px-6 py-4">
											<div className="text-sm font-bold text-slate-800">
												{stats.scheduledHours.toFixed(1)} h
											</div>
											<div className="text-[10px] text-slate-400 mt-0.5">
												celkem {stats.totalHours.toFixed(1)} h
											</div>
										</td>

										{/* PŘESČAS / ZBÝVÁ */}
										<td className="px-6 py-4">
											{stats.overtime > 0 ? (
												<span
													className={`text-sm font-bold ${
														isOvertime ? "text-red-600" : "text-amber-600"
													}`}>
													+{stats.overtime.toFixed(1)} h přesčas
												</span>
											) : isUnder ? (
												<span className="text-sm font-bold text-amber-600">
													−{(target - stats.totalHours).toFixed(1)} h chybí
												</span>
											) : (
												<span className="text-sm text-slate-300">—</span>
											)}
										</td>

										{/* DOVOLENÁ */}
										<td className="px-6 py-4">
											<div className="text-sm font-bold text-slate-800">
												{stats.vacationDays} dní
											</div>
											{stats.pendingVacationDays > 0 && (
												<div className="text-[10px] text-amber-600 font-semibold mt-0.5">
													+{stats.pendingVacationDays} čeká
												</div>
											)}
										</td>

										{/* STAV */}
										<td className="px-6 py-4">
											{emp.isActivated ? (
												<span className="text-emerald-600 text-xs font-bold flex items-center gap-1">
													<CheckCircle2 size={14} /> Aktivní
												</span>
											) : (
												<span className="text-amber-600 text-xs font-bold flex items-center gap-1">
													<Clock size={14} /> Pozvánka
												</span>
											)}
										</td>

										{/* AKCE */}
										<td className="px-6 py-4 text-right">
											<div className="flex items-center justify-end gap-1">
												<button
													onClick={() => openEditModal(emp)}
													className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
													title="Upravit">
													<Pencil size={16} />
												</button>
												<button
													onClick={(e) => handleDelete(emp.id, e)}
													className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
													title="Smazat">
													<Trash2 size={16} />
												</button>
											</div>
										</td>
									</tr>
								);
							})}
							{filteredEmployees.length === 0 && (
								<tr>
									<td
										colSpan={7}
										className="px-6 py-12 text-center text-slate-400 text-sm">
										Žádní zaměstnanci neodpovídají filtru.
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>

				{/* MODÁLNÍ OKNO */}
				{isModalOpen && (
					<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
						<div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 relative">
							<button
								onClick={() => setIsModalOpen(false)}
								className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 p-1">
								<X size={24} />
							</button>
							<div className="flex items-center gap-3 mb-6">
								<div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
									{editingEmployee ? (
										<UserCog size={24} />
									) : (
										<UserPlus size={24} />
									)}
								</div>
								<div>
									<h2 className="text-2xl font-bold text-slate-900">
										{editingEmployee ? "Upravit údaje" : "Pozvat člena"}
									</h2>
									<p className="text-slate-500 text-sm">
										{editingEmployee
											? "Data načtena z databáze."
											: "Zadejte údaje pro novou pozvánku."}
									</p>
								</div>
							</div>

							{loadingModal ? (
								<div className="flex items-center justify-center py-10">
									<Loader2 className="animate-spin text-blue-500" size={28} />
								</div>
							) : (
								<>
									{error && (
										<div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 font-medium">
											⚠️ {error}
										</div>
									)}
									<form onSubmit={handleSubmit} className="space-y-4">
										<div>
											<label className="text-xs font-bold uppercase text-slate-500 mb-1 block">
												Celé jméno
											</label>
											<input
												required
												value={formData.fullName}
												onChange={(e) =>
													setFormData({
														...formData,
														fullName: e.target.value,
													})
												}
												className="w-full p-3 border border-slate-200 rounded-xl font-semibold outline-none focus:border-blue-500 transition-all"
												placeholder="Jan Novák"
											/>
										</div>
										<div>
											<label className="text-xs font-bold uppercase text-slate-500 mb-1 block">
												Email
											</label>
											<div className="relative">
												<Mail
													className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
													size={18}
												/>
												<input
													type="email"
													required
													disabled={!!editingEmployee}
													value={formData.email}
													onChange={(e) =>
														setFormData({
															...formData,
															email: e.target.value,
														})
													}
													className="w-full pl-10 pr-4 p-3 border border-slate-200 rounded-xl font-semibold outline-none focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-500"
													placeholder="jan@firma.cz"
												/>
											</div>
										</div>
										<div className="grid grid-cols-2 gap-4">
											<div>
												<label className="text-xs font-bold uppercase text-slate-500 mb-1 block">
													Role
												</label>
												<select
													value={formData.role}
													onChange={(e) =>
														setFormData({
															...formData,
															role: e.target.value as UserRole,
														})
													}
													className="w-full p-3 border border-slate-200 rounded-xl font-semibold bg-white outline-none focus:border-blue-500">
													<option value={UserRole.EMPLOYEE}>Zaměstnanec</option>
													<option value={UserRole.MANAGER}>Manažer</option>
													<option value={UserRole.ADMIN}>Admin</option>
												</select>
											</div>
											<div>
												<label className="text-xs font-bold uppercase text-slate-500 mb-1 block">
													Úvazek (h/měs)
												</label>
												<input
													type="number"
													value={formData.targetHours}
													onChange={(e) =>
														setFormData({
															...formData,
															targetHours: Number(e.target.value),
														})
													}
													className="w-full p-3 border border-slate-200 rounded-xl font-semibold outline-none focus:border-blue-500"
												/>
											</div>
										</div>
										<div>
											<label className="text-xs font-bold uppercase text-slate-500 mb-1 block">
												Pracovní pozice <span className="text-red-500">*</span>
											</label>
											<div className="relative">
												<Briefcase
													className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
													size={18}
												/>
												<select
													required
													value={formData.jobPositionId}
													onChange={(e) =>
														setFormData({
															...formData,
															jobPositionId: e.target.value,
														})
													}
													className="w-full pl-10 pr-4 p-3 border border-slate-200 rounded-xl font-semibold bg-white outline-none focus:border-blue-500 appearance-none">
													<option value="" disabled>
														-- Vyberte pozici --
													</option>
													{jobPositions.map((pos) => (
														<option key={pos.id} value={pos.id}>
															{pos.name}
														</option>
													))}
												</select>
											</div>
										</div>
										<div className="flex gap-3 pt-4">
											<button
												type="button"
												onClick={() => setIsModalOpen(false)}
												className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-colors">
												Zrušit
											</button>
											<button
												type="submit"
												disabled={loading || !formData.jobPositionId}
												className={`flex-1 py-3 font-bold rounded-xl shadow-lg transition-all ${
													loading || !formData.jobPositionId
														? "bg-slate-300 text-slate-500 cursor-not-allowed"
														: "bg-blue-600 text-white shadow-blue-200 hover:bg-blue-700"
												}`}>
												{loading
													? "Ukládání..."
													: editingEmployee
														? "Uložit změny"
														: "Odeslat pozvánku"}
											</button>
										</div>
									</form>
								</>
							)}
						</div>
					</div>
				)}
			</div>
		</ProtectedRoute>
	);
}
