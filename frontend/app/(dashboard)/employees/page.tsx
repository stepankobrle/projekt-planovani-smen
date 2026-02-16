"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
	UserPlus,
	Mail,
	Trash2,
	ShieldCheck,
	Search,
	CheckCircle2,
	Clock,
	Briefcase,
	X,
	UserCog,
	ShieldAlert,
	Loader2,
} from "lucide-react";
import { UserRole } from "@/config/menu";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";
import ProtectedRoute, { useAuth } from "@/app/components/ProtectedRoute";
import axios from "axios";

// --- KONFIGURACE AXIOS ---
// Vytvoříme instanci s nastavenou základní URL a interceptorem pro token
const api = axios.create({
	baseURL: "http://localhost:3001",
});

api.interceptors.request.use((config) => {
	const token = Cookies.get("token");
	if (token) {
		config.headers.Authorization = `Bearer ${token}`;
	}
	return config;
});

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
	positionId?: number;
	position?: { id: number; name: string };
}

export default function EmployeesPage() {
	const { role } = useAuth();
	const router = useRouter();

	// --- STAVY ---
	const [employees, setEmployees] = useState<Employee[]>([]);
	const [jobPositions, setJobPositions] = useState<JobPosition[]>([]);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
	const [searchQuery, setSearchQuery] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	const [formData, setFormData] = useState({
		email: "",
		fullName: "",
		role: UserRole.EMPLOYEE,
		targetHours: 160,
		positionId: "",
	});

	// --- BEZPEČNOSTNÍ KONTROLA ROLE ---
	const isAdmin = role === "ADMIN";

	useEffect(() => {
		if (!isAdmin) {
			const timer = setTimeout(() => {
				router.push("/dashboard");
			}, 3000);
			return () => clearTimeout(timer);
		}
	}, [isAdmin, router]);

	// --- NAČÍTÁNÍ DAT ---
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
			console.error("Chyba při načítání dat:", err);
			setError("Nepodařilo se načíst data ze serveru.");
		}
	}, [isAdmin]);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	// --- HANDLERY ---
	const openAddModal = () => {
		setEditingEmployee(null);
		setFormData({
			email: "",
			fullName: "",
			role: UserRole.EMPLOYEE,
			targetHours: 160,
			positionId: "",
		});
		setError("");
		setIsModalOpen(true);
	};

	const openEditModal = (emp: Employee) => {
		setEditingEmployee(emp);
		setFormData({
			email: emp.email,
			fullName: emp.fullName || "",
			role: emp.role,
			targetHours: emp.targetHoursPerMonth || 160,
			positionId:
				emp.positionId?.toString() || emp.position?.id.toString() || "",
		});
		setError("");
		setIsModalOpen(true);
	};

	const handleDelete = async (id: string, e: React.MouseEvent) => {
		e.stopPropagation();
		if (!confirm("Opravdu chcete smazat/zneaktivnit tohoto zaměstnance?"))
			return;
		try {
			await api.delete(`/users/${id}`);
			fetchData();
		} catch (err) {
			alert("Chyba při mazání uživatele.");
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError("");

		const isEditMode = !!editingEmployee;
		const url = isEditMode ? `/users/${editingEmployee.id}` : "/users/invite";
		const payload = {
			...formData,
			targetHours: Number(formData.targetHours),
			positionId: Number(formData.positionId),
		};

		try {
			if (isEditMode) {
				await api.patch(url, payload);
			} else {
				await api.post(url, payload);
			}
			setIsModalOpen(false);
			fetchData();
		} catch (err: any) {
			setError(err.response?.data?.message || "Chyba při ukládání dat.");
		} finally {
			setLoading(false);
		}
	};

	const filteredEmployees = employees.filter(
		(emp) =>
			(emp.fullName?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
			emp.email.toLowerCase().includes(searchQuery.toLowerCase()),
	);

	// --- RENDER LOGIKA ---

	if (!isAdmin)
		return (
			<div className="flex flex-col items-center justify-center h-screen bg-slate-50 px-4 text-center">
				<div className="bg-red-100 p-6 rounded-full mb-6">
					<ShieldAlert className="text-red-600 w-16 h-16" />
				</div>
				<h1 className="text-3xl font-bold text-slate-900 mb-2">
					Přístup odepřen
				</h1>
				<p className="text-slate-500 max-w-md mb-8">
					Tato stránka je přístupná pouze administrátorům. Za chvíli vás
					přesměrujeme zpět na dashboard.
				</p>
				<Loader2 className="animate-spin text-slate-400" size={24} />
			</div>
		);

	return (
		<ProtectedRoute>
			<div className="space-y-6 p-6 animate-in fade-in duration-500">
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
					<div>
						<h1 className="text-2xl font-bold text-slate-900 tracking-tight">
							Zaměstnanci
						</h1>
						<p className="text-slate-500 text-sm mt-1">
							Správa týmu a přístupových práv.
						</p>
					</div>
					<button
						onClick={openAddModal}
						className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg transition-all active:scale-95">
						<UserPlus size={18} /> Pozvat zaměstnance
					</button>
				</div>

				<div className="relative max-w-md">
					<Search
						className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
						size={18}
					/>
					<input
						type="text"
						placeholder="Hledat podle jména..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm"
					/>
				</div>

				<div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
					<table className="w-full text-left border-collapse">
						<thead>
							<tr className="bg-slate-50/50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
								<th className="px-6 py-4 font-semibold">Jméno</th>
								<th className="px-6 py-4 font-semibold">Role</th>
								<th className="px-6 py-4 font-semibold">Pozice</th>
								<th className="px-6 py-4 font-semibold">Status</th>
								<th className="px-6 py-4 font-semibold text-right">Akce</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-slate-100">
							{filteredEmployees.map((emp) => (
								<tr
									key={emp.id}
									onClick={() => openEditModal(emp)}
									className="hover:bg-blue-50/50 transition-colors cursor-pointer group">
									<td className="px-6 py-4">
										<div className="flex items-center gap-3">
											<div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold group-hover:bg-blue-100 transition-colors">
												{emp.fullName ? emp.fullName[0] : <Mail size={16} />}
											</div>
											<div>
												<div className="font-semibold text-slate-900">
													{emp.fullName || "Čeká na registraci"}
												</div>
												<div className="text-xs text-slate-500">
													{emp.email}
												</div>
											</div>
										</div>
									</td>
									<td className="px-6 py-4 text-sm">
										<span className="bg-slate-100 text-slate-700 px-2 py-1 rounded-md font-medium text-xs border border-slate-200">
											{emp.role}
										</span>
									</td>
									<td className="px-6 py-4 text-sm font-medium text-slate-600">
										{emp.jobPosition?.name || "-"}
									</td>
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
									<td className="px-6 py-4 text-right">
										<button
											onClick={(e) => handleDelete(emp.id, e)}
											className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
											<Trash2 size={18} />
										</button>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>

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
											? "Editace informací o zaměstnanci."
											: "Zadejte údaje pro novou pozvánku."}
									</p>
								</div>
							</div>

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
											setFormData({ ...formData, fullName: e.target.value })
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
												setFormData({ ...formData, email: e.target.value })
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
										Pracovní Pozice <span className="text-red-500">*</span>
									</label>
									<div className="relative">
										<Briefcase
											className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
											size={18}
										/>
										<select
											required
											value={formData.positionId}
											onChange={(e) =>
												setFormData({ ...formData, positionId: e.target.value })
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
										disabled={loading || !formData.positionId}
										className={`flex-1 py-3 font-bold rounded-xl shadow-lg transition-all ${loading || !formData.positionId ? "bg-slate-300 text-slate-500 cursor-not-allowed" : "bg-blue-600 text-white shadow-blue-200 hover:bg-blue-700"}`}>
										{loading
											? "Ukládání..."
											: editingEmployee
												? "Uložit změny"
												: "Odeslat pozvánku"}
									</button>
								</div>
							</form>
						</div>
					</div>
				)}
			</div>
		</ProtectedRoute>
	);
}
