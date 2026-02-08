"use client";

import React, { useState, useEffect } from "react";
import {
	UserPlus,
	Mail,
	Trash2,
	ShieldCheck,
	MoreVertical,
	Search,
	CheckCircle2,
	Clock,
} from "lucide-react";
import { UserRole } from "@/config/menu";
import { cn } from "@/lib/utils";

// Typ pro uživatele (odpovídá tvé Prismě)
interface Employee {
	id: string;
	name: string | null;
	email: string;
	role: UserRole;
	status: "ACTIVE" | "INVITED"; // Přidáme status pro rozlišení pozvaných
}

export default function EmployeesPage() {
	const [employees, setEmployees] = useState<Employee[]>([]);
	const [showAddModal, setShowAddModal] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");

	// Data pro formulář
	const [newEmail, setNewEmail] = useState("");
	const [newRole, setNewRole] = useState<UserRole>(UserRole.EMPLOYEE);

	// Funkce pro odeslání pozvánky (propojení na tvůj NestJS)
	const handleInvite = async (e: React.FormEvent) => {
		e.preventDefault();

		// ZDE BUDE FETCH NA TVŮJ BACKEND:
		// const res = await fetch('/api/employees/invite', { method: 'POST', ... })

		console.log("Pozvánka odeslána na:", newEmail, "s rolí:", newRole);

		// Prozatímní přidání do seznamu pro vizuální testování
		const invitedUser: Employee = {
			id: Math.random().toString(),
			name: null,
			email: newEmail,
			role: newRole,
			status: "INVITED",
		};

		setEmployees([invitedUser, ...employees]);
		setNewEmail("");
		setShowAddModal(false);
	};

	return (
		<div className="space-y-6">
			{/* HLAVIČKA A AKCE */}
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
				<div>
					<h1 className="text-2xl font-bold text-slate-900 tracking-tight">
						Zaměstnanci
					</h1>
					<p className="text-slate-500 text-sm mt-1">
						Správa členů týmu a jejich přístupových práv.
					</p>
				</div>
				<button
					onClick={() => setShowAddModal(true)}
					className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl transition-all shadow-md shadow-blue-200 font-medium">
					<UserPlus size={18} />
					Pozvat zaměstnance
				</button>
			</div>

			{/* FILTROVÁNÍ */}
			<div className="relative max-w-md">
				<Search
					className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
					size={18}
				/>
				<input
					type="text"
					placeholder="Hledat podle jména nebo e-mailu..."
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm"
				/>
			</div>

			{/* TABULKA SEZNAMU */}
			<div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
				<div className="overflow-x-auto">
					<table className="w-full text-left">
						<thead>
							<tr className="bg-slate-50/50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
								<th className="px-6 py-4 font-semibold text-slate-500 uppercase tracking-wider">
									Zaměstnanec
								</th>
								<th className="px-6 py-4 font-semibold text-slate-500 uppercase tracking-wider">
									Role
								</th>
								<th className="px-6 py-4 font-semibold text-slate-500 uppercase tracking-wider">
									Status
								</th>
								<th className="px-6 py-4 font-semibold text-slate-500 uppercase tracking-wider text-right">
									Akce
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-slate-100">
							{employees.length === 0 ? (
								<tr>
									<td
										colSpan={4}
										className="px-6 py-12 text-center text-slate-400">
										Zatím zde nejsou žádní zaměstnanci. Pozvěte prvního!
									</td>
								</tr>
							) : (
								employees.map((emp) => (
									<tr
										key={emp.id}
										className="group hover:bg-slate-50 transition-colors">
										<td className="px-6 py-4">
											<div className="flex items-center gap-3">
												<div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold border border-blue-100">
													{emp.name ? emp.name[0] : <Mail size={16} />}
												</div>
												<div>
													<div className="font-semibold text-slate-900">
														{emp.name || "Čeká na registraci"}
													</div>
													<div className="text-sm text-slate-500">
														{emp.email}
													</div>
												</div>
											</div>
										</td>
										<td className="px-6 py-4 text-sm">
											<span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-lg font-medium bg-slate-100 text-slate-700 border border-slate-200">
												<ShieldCheck size={14} />
												{emp.role}
											</span>
										</td>
										<td className="px-6 py-4">
											{emp.status === "ACTIVE" ? (
												<span className="inline-flex items-center gap-1.5 text-emerald-600 text-sm font-medium">
													<CheckCircle2 size={16} /> Aktivní
												</span>
											) : (
												<span className="inline-flex items-center gap-1.5 text-amber-600 text-sm font-medium">
													<Clock size={16} /> Pozvánka odeslána
												</span>
											)}
										</td>
										<td className="px-6 py-4 text-right">
											<button className="p-2 text-slate-400 hover:text-red-600 transition-colors">
												<Trash2 size={18} />
											</button>
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			</div>

			{/* MODÁL PRO POZVÁNKU */}
			{showAddModal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
					<div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 animate-in fade-in zoom-in duration-200">
						<h2 className="text-2xl font-bold text-slate-900 mb-2">
							Pozvat člena týmu
						</h2>
						<p className="text-slate-500 text-sm mb-6">
							Zadejte e-mail a zvolte roli. Dotyčnému přijde odkaz k registraci.
						</p>

						<form onSubmit={handleInvite} className="space-y-4">
							<div>
								<label className="block text-sm font-semibold text-slate-700 mb-1.5">
									E-mailová adresa
								</label>
								<div className="relative">
									<Mail
										className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
										size={18}
									/>
									<input
										type="email"
										required
										value={newEmail}
										onChange={(e) => setNewEmail(e.target.value)}
										className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
										placeholder="např. novak@firma.cz"
									/>
								</div>
							</div>

							<div>
								<label className="block text-sm font-semibold text-slate-700 mb-1.5">
									Role v systému
								</label>
								<select
									value={newRole}
									onChange={(e) => setNewRole(e.target.value as UserRole)}
									className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all">
									<option value={UserRole.EMPLOYEE}>Zaměstnanec</option>
									<option value={UserRole.MANAGER}>Manažer</option>
									<option value={UserRole.ADMIN}>Administrátor</option>
								</select>
							</div>

							<div className="flex gap-3 pt-4">
								<button
									type="button"
									onClick={() => setShowAddModal(false)}
									className="flex-1 py-2.5 px-4 text-slate-600 font-semibold hover:bg-slate-50 rounded-xl transition-colors">
									Zrušit
								</button>
								<button
									type="submit"
									className="flex-1 py-2.5 px-4 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all">
									Odeslat pozvánku
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	);
}
