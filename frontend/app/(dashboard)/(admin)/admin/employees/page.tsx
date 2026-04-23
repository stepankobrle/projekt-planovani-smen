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

import { UserRole } from "@/config/menu";
import { useRouter } from "next/navigation";
import ProtectedRoute, { useAuth } from "@/app/components/ProtectedRoute";
import api from "@/lib/api";
import { PageContainer, HeroHeader, OverlapPanel, TableCard } from "@/app/components/AdminLayout";

import "../dashboard/dashboard.css";

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

// --- TYPY ---
interface JobPosition {
	id: number;
	name: string;
	isManagerial: boolean;
}

interface EmploymentContract {
	id: number;
	type: string;
	label: string;
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
	employmentContractId?: number;
	employmentContract?: EmploymentContract;
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

export default function EmployeesPage() {
	const { role } = useAuth();
	const router = useRouter();

	const [employees, setEmployees] = useState<Employee[]>([]);
	const [jobPositions, setJobPositions] = useState<JobPosition[]>([]);
	const [employmentContracts, setEmploymentContracts] = useState<EmploymentContract[]>([]);
	const [statsMap, setStatsMap] = useState<Map<string, EmployeeStats>>(new Map());

	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
	const [loadingModal, setLoadingModal] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	const [searchQuery, setSearchQuery] = useState("");
	const [activeFilter, setActiveFilter] = useState<FilterType>("ALL");
	const [currentPage, setCurrentPage] = useState(1);

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
		employmentContractId: "",
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
			const [resUsers, resPositions, resContracts] = await Promise.all([
				api.get("/users"),
				api.get("/job-positions"),
				api.get("/employment-contracts"),
			]);
			setEmployees(resUsers.data);
			setJobPositions(resPositions.data);
			setEmploymentContracts(resContracts.data);
		} catch (err: any) {
			console.error("Chyba při načítání zaměstnanců:", err);
		}
		try {
			const resStats = await api.get(`/users/stats?year=${selectedYear}&month=${selectedMonth}`);
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
			employmentContractId: "",
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
				jobPositionId: fresh.jobPositionId?.toString() || fresh.jobPosition?.id.toString() || "",
				employmentContractId: fresh.employmentContractId?.toString() || fresh.employmentContract?.id.toString() || "",
			});
		} catch {
			setError("Nepodařilo se načíst data zaměstnance.");
		} finally {
			setLoadingModal(false);
		}
	};

	const handleDelete = async (id: string, e: React.MouseEvent) => {
		e.stopPropagation();
		if (!confirm("Opravdu chcete smazat/zneaktivnit tohoto zaměstnance?")) return;
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
		const { jobPositionId: _pos, employmentContractId: _ec, ...rest } = formData;
		const payload = {
			...rest,
			targetHours: Number(formData.targetHours),
			positionId: Number(formData.jobPositionId),
			employmentContractId: formData.employmentContractId ? Number(formData.employmentContractId) : undefined,
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
		() => employees.filter((emp) => isProblematic(emp, statsMap.get(emp.id) ?? { userId: emp.id, ...emptyStats })).length,
		[employees, statsMap],
	);
	const pendingCount = employees.filter((e) => !e.isActivated).length;

	const filteredEmployees = useMemo(() => {
		let result = employees;
		if (searchQuery) {
			const q = searchQuery.toLowerCase();
			result = result.filter(
				(emp) => (emp.fullName?.toLowerCase() || "").includes(q) || emp.email.toLowerCase().includes(q),
			);
		}
		if (activeFilter === "PROBLEMATIC") {
			result = result.filter((emp) => isProblematic(emp, statsMap.get(emp.id) ?? { userId: emp.id, ...emptyStats }));
		} else if (activeFilter === "PENDING_ACTIVATION") {
			result = result.filter((emp) => !emp.isActivated);
		}
		return result;
	}, [employees, searchQuery, activeFilter, statsMap]);

	useEffect(() => {
		setCurrentPage(1);
	}, [searchQuery, activeFilter]);

	const ITEMS_PER_PAGE = 10;
	const totalPages = Math.ceil(filteredEmployees.length / ITEMS_PER_PAGE);
	const paginatedEmployees = filteredEmployees.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

	// --- GUARD ---
	if (!isAdmin) {
		return (
			<PageContainer>
				<div className="flex flex-col items-center justify-center min-h-full px-4 text-center">
					<div className="bg-red-100 p-6 rounded-full mb-6">
						<ShieldAlert className="text-red-600 w-16 h-16" />
					</div>
					<h1 className="text-3xl font-bold text-slate-900 mb-2">Přístup odepřen</h1>
					<Loader2 className="animate-spin text-slate-400 mt-4" size={24} />
				</div>
			</PageContainer>
		);
	}

	return (
		<ProtectedRoute>
			<PageContainer>
				
				<HeroHeader
					subtitle="Správa uživatelů"
					title="Zaměstnanci"
					action={
						<button onClick={openAddModal} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-black/10 active:scale-95" style={{ background: "#F59E0B", color: "#fff" }}>
							<UserPlus size={18} /> Pozvat zaměstnance
						</button>
					}
				/>

				<OverlapPanel delay="100ms">
					
					{/* Výběr měsíce */}
					<div className="flex items-center gap-3">
						<button onClick={prevMonth} className="btn-no" style={{ padding: 6, borderRadius: 10, color: "#9ABABA", borderColor: "#DDF0E8" }}>
							<ChevronLeft size={16} />
						</button>
						<span style={{ fontSize: 13, fontWeight: 700, color: "#2C6975", minWidth: 120, textAlign: "center" }}>
							{MONTHS_CS[selectedMonth - 1]} {selectedYear}
						</span>
						<button onClick={nextMonth} className="btn-no" style={{ padding: 6, borderRadius: 10, color: "#9ABABA", borderColor: "#DDF0E8" }}>
							<ChevronRight size={16} />
						</button>
					</div>

					{/* Filtry & Hledání */}
					<div className="flex flex-col sm:flex-row gap-3 flex-1 lg:justify-end">
						<div className="relative w-full max-w-[280px]">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
							<input
								type="text"
								placeholder="Hledat podle jména..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="w-full pl-9 pr-4 py-2 bg-white border border-[#DDF0E8] rounded-xl focus:outline-none focus:border-[#68B2A0] transition-all text-sm font-medium"
								style={{ color: "#0F2E35" }}
							/>
						</div>
						<div className="flex gap-2">
							{(
								[
									{ key: "ALL", label: "Všichni", count: employees.length, alert: false },
									{ key: "PROBLEMATIC", label: "Varování", count: problematicCount, alert: true },
									{ key: "PENDING_ACTIVATION", label: "Čekající", count: pendingCount, alert: false },
								] as { key: FilterType; label: string; count: number; alert: boolean }[]
							).map((f) => {
								const active = activeFilter === f.key;
								return (
									<button
										key={f.key}
										onClick={() => setActiveFilter(f.key)}
										className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all border"
										style={{
											background: active ? (f.alert ? "#C85A30" : "#2C6975") : "white",
											color: active ? "#ffffff" : (f.alert ? "#C85A30" : "#5A8A8A"),
											borderColor: active ? "transparent" : (f.alert ? "rgba(200,90,48,.2)" : "#DDF0E8"),
										}}>
										{f.label}
										{f.count > 0 && (
											<span style={{
												background: active ? "rgba(255,255,255,.2)" : (f.alert ? "rgba(200,90,48,.1)" : "#E6F2EE"),
												padding: "2px 6px", borderRadius: 99, fontSize: 10,
											}}>
												{f.count}
											</span>
										)}
									</button>
								);
							})}
						</div>
					</div>
			</OverlapPanel>

			<TableCard delay="180ms" footer={
				totalPages > 1 && (
					<>
						<span className="text-xs" style={{ color: "#5A8A8A" }}>
							Zobrazeno {(currentPage - 1) * ITEMS_PER_PAGE + 1} – {Math.min(currentPage * ITEMS_PER_PAGE, filteredEmployees.length)} z {filteredEmployees.length} záznamů
						</span>
						<div className="flex gap-2">
							<button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="p-1 rounded-md transition-colors disabled:opacity-30" style={{ background: "#F0F7F4", color: "#2C6975" }}>
								<ChevronLeft size={18} />
							</button>
							<span className="text-xs font-bold flex items-center px-1" style={{ color: "#0F2E35" }}>
								{currentPage} / {totalPages}
							</span>
							<button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="p-1 rounded-md transition-colors disabled:opacity-30" style={{ background: "#F0F7F4", color: "#2C6975" }}>
								<ChevronRight size={18} />
							</button>
						</div>
					</>
				)
			}>
				<thead style={{ position: "sticky", top: 0, zIndex: 5, background: "rgba(255,255,255,0.95)", backdropFilter: "blur(10px)" }}>
					<tr style={{ borderBottom: "2px solid #DDF0E8" }}>
						{["Zaměstnanec", "Odpracováno", "Naplánováno", "Přesčas / Zbývá", "Dovolená", "Stav", "Akce"].map((h, i) => (
							<th key={h} className={`px-4 py-3 text-[10px] font-bold tracking-[0.1em] uppercase ${i === 6 ? "text-right" : ""}`} style={{ color: "#9ABABA" }}>
								{h}
							</th>
						))}
					</tr>
				</thead>
				<tbody>
									{paginatedEmployees.map((emp, index) => {
										const stats = statsMap.get(emp.id) ?? { userId: emp.id, ...emptyStats };
										const target = Number(emp.targetHoursPerMonth) || 160;
										const problematic = isProblematic(emp, stats);
										const progress = Math.min(100, (stats.totalHours / target) * 100);
										const isUnder = stats.totalHours < target * 0.8;
										const isOvertime = stats.overtime > 20;

										return (
											<tr key={emp.id} className="a-fade border-b border-[#DDF0E8] last:border-0 transition-colors hover:bg-[#E6F2EE]" style={{ "--d": `${index * 30}ms` } as React.CSSProperties}>
												
												{/* Zaměstnanec */}
												<td className="px-4 py-4">
													<div className="flex items-center gap-3">
														<div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm" style={{ background: problematic ? "#C85A30" : "linear-gradient(135deg, #2C6975, #68B2A0)" }}>
															{emp.fullName ? emp.fullName[0].toUpperCase() : <Mail size={14} />}
														</div>
														<div>
															<div className="flex items-center gap-1.5">
																<span className="font-semibold text-[13px]" style={{ color: "#0F2E35" }}>{emp.fullName || "Čeká na registraci"}</span>
																{problematic && <AlertTriangle size={12} color="#C85A30" />}
															</div>
															<div className="text-[11px] mt-[1px]" style={{ color: "#9ABABA" }}>{emp.email}</div>
															<div className="flex gap-1.5 mt-1.5">
																<span className="text-[9px] font-bold px-1.5 py-0.5 rounded border" style={{ background: "#F0F7F4", color: "#5A8A8A", borderColor: "#DDF0E8" }}>{emp.role}</span>
																{emp.employmentContract && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border" style={{ background: "rgba(104,178,160,.1)", color: "#2C6975", borderColor: "rgba(104,178,160,.2)" }}>{emp.employmentContract.label}</span>}
																{emp.jobPosition && <span className="text-[9px] px-1.5 py-0.5" style={{ color: "#9ABABA" }}><Briefcase size={9} className="inline mr-1" />{emp.jobPosition.name}</span>}
															</div>
														</div>
													</div>
												</td>

												{/* Odpracováno */}
												<td className="px-4 py-4">
													<div className="text-[13px] font-bold" style={{ color: "#2C6975" }}>{stats.workedHours.toFixed(1)} h</div>
													<div className="w-20 h-[5px] bg-[#E6F2EE] rounded-full mt-1.5 overflow-hidden">
														<div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: isUnder ? "#D4980C" : "linear-gradient(90deg, #2C6975, #68B2A0)" }} />
													</div>
													<div className="text-[10px] mt-1" style={{ color: "#9ABABA" }}>cíl {target} h</div>
												</td>

												{/* Naplánováno */}
												<td className="px-4 py-4">
													<div className="text-[13px] font-bold" style={{ color: "#0F2E35" }}>{stats.totalHours.toFixed(1)} h</div>
													<div className="text-[10px] mt-0.5" style={{ color: "#9ABABA" }}>{stats.scheduledHours.toFixed(1)} h letos</div>
												</td>

												{/* Přesčas/Zbývá */}
												<td className="px-4 py-4">
													{stats.overtime > 0 ? (
														<span className="text-[13px] font-bold" style={{ color: isOvertime ? "#C85A30" : "#D4980C" }}>+{stats.overtime.toFixed(1)} h přesčas</span>
													) : isUnder ? (
														<span className="text-[13px] font-bold" style={{ color: "#D4980C" }}>−{(target - stats.totalHours).toFixed(1)} h chybí</span>
													) : (
														<span className="text-[13px]" style={{ color: "#CDE0C9" }}>—</span>
													)}
												</td>

												{/* Dovolená */}
												<td className="px-4 py-4">
													<div className="text-[13px] font-bold" style={{ color: "#0F2E35" }}>{stats.vacationDays} dní</div>
													{stats.pendingVacationDays > 0 && <div className="text-[10px] font-semibold mt-0.5" style={{ color: "#D4980C" }}>+{stats.pendingVacationDays} čeká</div>}
												</td>

												{/* Stav */}
												<td className="px-4 py-4">
													{emp.isActivated ? (
														<span className="text-xs font-bold flex items-center gap-1.5" style={{ color: "#68B2A0" }}><div className="w-1.5 h-1.5 rounded-full bg-[#68B2A0]" /> Aktivní</span>
													) : (
														<span className="text-xs font-bold flex items-center gap-1.5" style={{ color: "#D4980C" }}><div className="w-1.5 h-1.5 rounded-full bg-[#D4980C]" /> Pozvánka</span>
													)}
												</td>

												{/* Akce */}
												<td className="px-4 py-4 text-right">
													<div className="flex justify-end gap-2">
														<button onClick={() => openEditModal(emp)} className="btn-no" style={{ padding: "6px", borderRadius: "8px", borderColor: "transparent", color: "#68B2A0" }}>
															<Pencil size={14} />
														</button>
														<button onClick={(e) => handleDelete(emp.id, e)} className="btn-no" style={{ padding: "6px", borderRadius: "8px", borderColor: "transparent", color: "#C85A30" }}>
															<Trash2 size={14} />
														</button>
													</div>
												</td>
											</tr>
										);
									})}
									{filteredEmployees.length === 0 && (
										<tr>
											<td colSpan={7} className="px-4 py-16 text-center text-sm" style={{ color: "#9ABABA" }}>Žádní zaměstnanci neodpovídají filtru.</td>
										</tr>
									)}
								</tbody>
			</TableCard>

			{/* MODÁL - Přidat/Upravit */}
				{isModalOpen && (
					<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F2E35]/40 backdrop-blur-sm animate-in fade-in duration-200">
						<div className="bg-white rounded-[24px] shadow-2xl w-full max-w-md p-8 relative border border-[#DDF0E8]">
							<button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 text-[#9ABABA] hover:text-[#0F2E35] transition-colors"><X size={24} /></button>
							<div className="flex items-center gap-4 mb-8">
								<div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "#E6F2EE", color: "#2C6975" }}>
									{editingEmployee ? <UserCog size={22} /> : <UserPlus size={22} />}
								</div>
								<div>
									<h2 className="text-xl font-bold" style={{ color: "#0F2E35" }}>{editingEmployee ? "Upravit údaje" : "Pozvat člena"}</h2>
									<p className="text-xs mt-1" style={{ color: "#5A8A8A" }}>{editingEmployee ? "Data načtena z databáze." : "Zadejte údaje pro novou pozvánku."}</p>
								</div>
							</div>

							{loadingModal ? (
								<div className="flex justify-center py-10"><Loader2 className="animate-spin" color="#68B2A0" size={28} /></div>
							) : (
								<form onSubmit={handleSubmit} className="space-y-4">
									{error && <div className="p-3 rounded-xl text-xs font-bold mb-4" style={{ background: "rgba(200,90,48,.1)", color: "#C85A30" }}>⚠️ {error}</div>}
									
									<div>
										<label className="text-[10px] font-bold uppercase tracking-[0.1em] block mb-1.5" style={{ color: "#9ABABA" }}>Celé jméno</label>
										<input required value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} className="w-full p-3 rounded-xl text-sm font-semibold border outline-none transition-all outline-none" style={{ borderColor: "#DDF0E8", color: "#0F2E35" }} placeholder="Jan Novák" />
									</div>

									<div>
										<label className="text-[10px] font-bold uppercase tracking-[0.1em] block mb-1.5" style={{ color: "#9ABABA" }}>E-mailová adresa</label>
										<div className="relative">
											<Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ABABA]" size={16} />
											<input type="email" required disabled={!!editingEmployee} value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full pl-9 pr-4 py-3 rounded-xl text-sm font-semibold border outline-none disabled:bg-[#F0F7F4] disabled:text-[#9ABABA] transition-all outline-none" style={{ borderColor: "#DDF0E8", color: "#0F2E35" }} placeholder="jan@firma.cz" />
										</div>
									</div>

									<div className="grid grid-cols-2 gap-4">
										<div>
											<label className="text-[10px] font-bold uppercase tracking-[0.1em] block mb-1.5" style={{ color: "#9ABABA" }}>Role</label>
											<select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })} className="w-full p-3 rounded-xl text-sm font-semibold border bg-white outline-none transition-all outline-none" style={{ borderColor: "#DDF0E8", color: "#0F2E35" }}>
												<option value={UserRole.EMPLOYEE}>Zaměstnanec</option>
												<option value={UserRole.MANAGER}>Manažer</option>
												<option value={UserRole.ADMIN}>Admin</option>
											</select>
										</div>
										<div>
											<label className="text-[10px] font-bold uppercase tracking-[0.1em] block mb-1.5" style={{ color: "#9ABABA" }}>Úvazek (h/měs)</label>
											<input type="number" value={formData.targetHours} onChange={(e) => setFormData({ ...formData, targetHours: Number(e.target.value) })} className="w-full p-3 rounded-xl text-sm font-semibold border outline-none transition-all outline-none" style={{ borderColor: "#DDF0E8", color: "#0F2E35" }} />
										</div>
									</div>

									<div>
										<label className="text-[10px] font-bold uppercase tracking-[0.1em] block mb-1.5" style={{ color: "#9ABABA" }}>Pracovní pozice *</label>
										<div className="relative">
											<Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ABABA]" size={16} />
											<select required value={formData.jobPositionId} onChange={(e) => setFormData({ ...formData, jobPositionId: e.target.value })} className="w-full pl-9 pr-4 py-3 rounded-xl text-sm font-semibold border bg-white appearance-none outline-none transition-all outline-none" style={{ borderColor: "#DDF0E8", color: "#0F2E35" }}>
												<option value="" disabled>-- Vyberte pozici --</option>
												{jobPositions.map((pos) => <option key={pos.id} value={pos.id}>{pos.name}</option>)}
											</select>
										</div>
									</div>

									<div>
										<label className="text-[10px] font-bold uppercase tracking-[0.1em] block mb-1.5" style={{ color: "#9ABABA" }}>Typ úvazku</label>
										<select value={formData.employmentContractId} onChange={(e) => setFormData({ ...formData, employmentContractId: e.target.value })} className="w-full p-3 rounded-xl text-sm font-semibold border bg-white outline-none transition-all outline-none" style={{ borderColor: "#DDF0E8", color: "#0F2E35" }}>
											<option value="">-- Nevybráno --</option>
											{employmentContracts.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
										</select>
									</div>

									<div className="flex gap-3 pt-6 mt-2">
										<button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3.5 rounded-xl font-bold text-sm bg-[#F0F7F4] text-[#5A8A8A] hover:bg-[#E6F2EE] transition-colors">
											Zrušit
										</button>
										<button type="submit" disabled={loading} className="flex-1 py-3.5 rounded-xl font-bold text-sm text-white shadow-lg shadow-black/10 transition-all hover:brightness-110 active:scale-95 disabled:opacity-50" style={{ background: "linear-gradient(90deg, #2C6975, #68B2A0)" }}>
											{loading ? "Ukládám..." : (editingEmployee ? "Uložit změny" : "Odeslat pozvánku")}
										</button>
									</div>
								</form>
							)}
						</div>
					</div>
				)}
			</PageContainer>
		</ProtectedRoute>
	);
}
