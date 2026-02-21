"use client";

import React, { useEffect, useState, useCallback } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/app/components/ProtectedRoute";

type Status = "PENDING" | "APPROVED" | "REJECTED";
type FilterTab = "ALL" | Status;

interface VacationRequest {
	id: string;
	startDate: string;
	endDate: string;
	note: string | null;
	status: Status;
	createdAt: string;
	user: { fullName: string | null; email: string };
}

const statusConfig: Record<Status, { label: string; className: string }> = {
	PENDING: {
		label: "Čeká",
		className: "bg-amber-50 text-amber-600 border-amber-200",
	},
	APPROVED: {
		label: "Schváleno",
		className: "bg-green-50 text-green-600 border-green-200",
	},
	REJECTED: {
		label: "Zamítnuto",
		className: "bg-red-50 text-red-600 border-red-200",
	},
};

const tabs: { key: FilterTab; label: string }[] = [
	{ key: "PENDING", label: "Čekající" },
	{ key: "ALL", label: "Vše" },
	{ key: "APPROVED", label: "Schválené" },
	{ key: "REJECTED", label: "Zamítnuté" },
];

export default function AdminVacationsPage() {
	const { user } = useAuth();
	const [requests, setRequests] = useState<VacationRequest[]>([]);
	const [loading, setLoading] = useState(true);
	const [filter, setFilter] = useState<FilterTab>("PENDING");
	const [processingId, setProcessingId] = useState<string | null>(null);

	const fetchRequests = useCallback(async () => {
		if (!user?.locationId) return;
		try {
			const res = await api.get(`/vacations/location/${user.locationId}`);
			setRequests(res.data);
		} catch (err) {
			console.error("Chyba při načítání žádostí:", err);
		} finally {
			setLoading(false);
		}
	}, [user?.locationId]);

	useEffect(() => {
		fetchRequests();
	}, [fetchRequests]);

	const handleAction = async (id: string, action: "approve" | "reject") => {
		setProcessingId(id);
		try {
			await api.patch(`/vacations/${id}/${action}`);
			await fetchRequests();
		} catch (err: any) {
			alert(err.response?.data?.message || "Chyba při zpracování žádosti.");
		} finally {
			setProcessingId(null);
		}
	};

	const filtered =
		filter === "ALL" ? requests : requests.filter((r) => r.status === filter);
	const pendingCount = requests.filter((r) => r.status === "PENDING").length;

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold text-slate-900 tracking-tight">
					Žádosti o dovolenou
				</h1>
				<p className="text-slate-500 text-sm mt-1">
					Schvalování a zamítání žádostí zaměstnanců.
				</p>
			</div>

			{/* FILTRY */}
			<div className="flex gap-2 flex-wrap">
				{tabs.map((tab) => (
					<button
						key={tab.key}
						onClick={() => setFilter(tab.key)}
						className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
							filter === tab.key
								? "bg-blue-600 text-white shadow-sm"
								: "bg-white border border-slate-200 text-slate-500 hover:border-blue-300 hover:text-blue-600"
						}`}>
						{tab.label}
						{tab.key === "PENDING" && pendingCount > 0 && (
							<span
								className={`ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-black ${
									filter === "PENDING"
										? "bg-white/20 text-white"
										: "bg-amber-100 text-amber-600"
								}`}>
								{pendingCount}
							</span>
						)}
					</button>
				))}
			</div>

			{/* OBSAH */}
			{loading ? (
				<div className="text-center py-16 text-slate-400 text-sm">
					Načítám žádosti...
				</div>
			) : filtered.length === 0 ? (
				<div className="bg-white p-12 rounded-2xl border-2 border-dashed border-slate-200 text-center text-slate-400">
					Žádné žádosti k zobrazení.
				</div>
			) : (
				<div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
					<table className="w-full text-left border-collapse">
						<thead>
							<tr className="bg-slate-50/50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
								<th className="px-6 py-4 font-semibold">Zaměstnanec</th>
								<th className="px-6 py-4 font-semibold">Období</th>
								<th className="px-6 py-4 font-semibold">Poznámka</th>
								<th className="px-6 py-4 font-semibold">Podáno</th>
								<th className="px-6 py-4 font-semibold">Stav</th>
								<th className="px-6 py-4 font-semibold text-right">Akce</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-slate-100">
							{filtered.map((req) => {
								const status = statusConfig[req.status];
								const isProcessing = processingId === req.id;
								return (
									<tr
										key={req.id}
										className="hover:bg-slate-50/50 transition-colors">
										<td className="px-6 py-4">
											<div className="flex items-center gap-3">
												<div className="h-9 w-9 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-sm">
													{req.user.fullName?.[0] ?? "?"}
												</div>
												<div>
													<div className="font-semibold text-slate-900 text-sm">
														{req.user.fullName ?? "—"}
													</div>
													<div className="text-xs text-slate-400">
														{req.user.email}
													</div>
												</div>
											</div>
										</td>
										<td className="px-6 py-4 text-sm font-semibold text-slate-700 whitespace-nowrap">
											{new Date(req.startDate).toLocaleDateString("cs-CZ")} –{" "}
											{new Date(req.endDate).toLocaleDateString("cs-CZ")}
										</td>
										<td className="px-6 py-4 text-sm text-slate-500 max-w-[200px] truncate">
											{req.note ?? (
												<span className="text-slate-300">—</span>
											)}
										</td>
										<td className="px-6 py-4 text-xs text-slate-400 whitespace-nowrap">
											{new Date(req.createdAt).toLocaleDateString("cs-CZ")}
										</td>
										<td className="px-6 py-4">
											<span
												className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase border ${status.className}`}>
												{status.label}
											</span>
										</td>
										<td className="px-6 py-4 text-right">
											{req.status === "PENDING" && (
												<div className="flex items-center justify-end gap-2">
													<button
														disabled={isProcessing}
														onClick={() => handleAction(req.id, "approve")}
														className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-600 border border-green-200 rounded-lg text-xs font-bold hover:bg-green-100 transition-colors disabled:opacity-50">
														<CheckCircle2 size={14} /> Schválit
													</button>
													<button
														disabled={isProcessing}
														onClick={() => handleAction(req.id, "reject")}
														className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-500 border border-red-200 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors disabled:opacity-50">
														<XCircle size={14} /> Zamítnout
													</button>
												</div>
											)}
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}
