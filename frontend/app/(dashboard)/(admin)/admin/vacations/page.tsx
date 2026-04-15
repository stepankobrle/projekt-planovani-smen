"use client";

import React, { useEffect, useState, useCallback } from "react";
import { CheckCircle2, XCircle, Search } from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/app/components/ProtectedRoute";
import { PageContainer, HeroHeader, OverlapPanel, TableCard } from "@/app/components/AdminLayout";
import "../dashboard/dashboard.css";

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

const statusConfig: Record<Status, { label: string; bg: string; color: string; border: string }> = {
	PENDING: {
		label: "Čeká",
		bg: "rgba(212,152,12,.1)", color: "#D4980C", border: "1px solid rgba(212,152,12,.2)",
	},
	APPROVED: {
		label: "Schváleno",
		bg: "rgba(104,178,160,.1)", color: "#68B2A0", border: "1px solid rgba(104,178,160,.2)",
	},
	REJECTED: {
		label: "Zamítnuto",
		bg: "rgba(200,90,48,.1)", color: "#C85A30", border: "1px solid rgba(200,90,48,.2)",
	},
};

const tabs: { key: FilterTab; label: string; alert?: boolean }[] = [
	{ key: "PENDING", label: "Čekající" },
	{ key: "ALL", label: "Všechny" },
	{ key: "APPROVED", label: "Schválené" },
	{ key: "REJECTED", label: "Zamítnuté", alert: true },
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

	const filtered = filter === "ALL" ? requests : requests.filter((r) => r.status === filter);
	const pendingCount = requests.filter((r) => r.status === "PENDING").length;

	return (
		<PageContainer>
			
			<HeroHeader
				subtitle="Správa volna"
				title="Žádosti o dovolenou"
			/>

			<OverlapPanel delay="100ms">
				
				<div className="flex flex-col sm:flex-row gap-3 w-full lg:justify-between items-center">
					<div className="text-sm font-bold" style={{ color: "#2C6975" }}>
						{pendingCount > 0 ? (
							<span>Máte <span style={{ color: "#C85A30" }}>{pendingCount}</span> nevyřízených žádostí</span>
						) : (
							<span>Všechny žádosti vyřízeny</span>
						)}
					</div>
					
					<div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
						{tabs.map((tab) => {
							const active = filter === tab.key;
							return (
								<button
									key={tab.key}
									onClick={() => setFilter(tab.key)}
									className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all border whitespace-nowrap"
									style={{
										background: active ? (tab.alert ? "#C85A30" : "#2C6975") : "white",
										color: active ? "#ffffff" : (tab.alert ? "#C85A30" : "#5A8A8A"),
										borderColor: active ? "transparent" : (tab.alert ? "rgba(200,90,48,.2)" : "#DDF0E8"),
									}}>
									{tab.label}
									{tab.key === "PENDING" && pendingCount > 0 && (
										<span style={{
											background: active ? "rgba(255,255,255,.2)" : "rgba(212,152,12,.1)",
											color: active ? "white" : "#D4980C",
											padding: "2px 6px", borderRadius: 99, fontSize: 10,
										}}>
											{pendingCount}
										</span>
									)}
								</button>
							);
						})}
					</div>
				</div>
			</OverlapPanel>

			{loading ? (
				<div className="flex-1 flex justify-center items-center">
					<div className="text-sm font-bold" style={{ color: "#9ABABA" }}>Načítám žádosti...</div>
				</div>
			) : filtered.length === 0 ? (
				<div className="flex-1 px-6 py-6 md:px-24 md:pb-11 md:pt-4">
					<div className="card h-40 flex items-center justify-center a-up" style={{ textAlign: "center", color: "#9ABABA" }}>
						Žádné žádosti k zobrazení.
					</div>
				</div>
			) : (
				<TableCard delay="180ms">
					<thead style={{ position: "sticky", top: 0, zIndex: 5, background: "rgba(255,255,255,0.95)", backdropFilter: "blur(10px)" }}>
						<tr style={{ borderBottom: "2px solid #DDF0E8" }}>
							{["Zaměstnanec", "Období", "Poznámka", "Podáno", "Stav", "Akce"].map((h, i) => (
								<th key={h} className={`px-4 py-3 text-[10px] font-bold tracking-[0.1em] uppercase ${i === 5 ? "text-right" : ""}`} style={{ color: "#9ABABA" }}>
									{h}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
									{filtered.map((req, index) => {
										const status = statusConfig[req.status];
										const isProcessing = processingId === req.id;
										return (
											<tr key={req.id} className="a-fade border-b border-[#DDF0E8] last:border-0 transition-colors hover:bg-[#E6F2EE]" style={{ "--d": `${index * 30}ms` } as React.CSSProperties}>
												
												<td className="px-4 py-4">
													<div className="flex items-center gap-3">
														<div className="h-9 w-9 rounded-full flex items-center justify-center font-bold text-[13px]" style={{ background: "rgba(104,178,160,.15)", color: "#2C6975" }}>
															{req.user.fullName?.[0] ?? "?"}
														</div>
														<div>
															<div className="font-semibold text-[13px]" style={{ color: "#0F2E35" }}>
																{req.user.fullName ?? "—"}
															</div>
															<div className="text-[11px]" style={{ color: "#9ABABA" }}>
																{req.user.email}
															</div>
														</div>
													</div>
												</td>
												
												<td className="px-4 py-4 text-[13px] font-semibold whitespace-nowrap" style={{ color: "#2C6975" }}>
													{new Date(req.startDate).toLocaleDateString("cs-CZ")} –{" "}
													{new Date(req.endDate).toLocaleDateString("cs-CZ")}
												</td>
												
												<td className="px-4 py-4 text-[12px] max-w-[200px] truncate" style={{ color: "#5A8A8A" }}>
													{req.note ?? <span style={{ color: "#DDF0E8" }}>—</span>}
												</td>
												
												<td className="px-4 py-4 text-[11px] whitespace-nowrap" style={{ color: "#9ABABA" }}>
													{new Date(req.createdAt).toLocaleDateString("cs-CZ")}
												</td>
												
												<td className="px-4 py-4">
													<span className="px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-[0.05em]" style={{ background: status.bg, color: status.color, border: status.border }}>
														{status.label}
													</span>
												</td>
												
												<td className="px-4 py-4 text-right">
													{req.status === "PENDING" && (
														<div className="flex items-center justify-end gap-2">
															<button
																disabled={isProcessing}
																onClick={() => handleAction(req.id, "approve")}
																className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:brightness-110 active:scale-95 disabled:opacity-50 border shadow-sm"
																style={{ background: "#F0F7F4", color: "#68B2A0", borderColor: "rgba(104,178,160,.3)" }}>
																<CheckCircle2 size={14} /> Schválit
															</button>
															<button
																disabled={isProcessing}
																onClick={() => handleAction(req.id, "reject")}
																className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:brightness-110 active:scale-95 disabled:opacity-50 border shadow-sm"
																style={{ background: "#fff", color: "#C85A30", borderColor: "rgba(200,90,48,.3)" }}>
																<XCircle size={14} /> Zamítnout
															</button>
														</div>
													)}
												</td>
											</tr>
										);
									})}
								</tbody>
				</TableCard>
			)}
		</PageContainer>
	);
}
