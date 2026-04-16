"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { PageContainer, HeroHeader, OverlapPanel, TableCard } from "@/app/components/AdminLayout";
import { Calendar, Loader2, Send } from "lucide-react";
import "@/app/(dashboard)/(admin)/admin/dashboard/dashboard.css";

interface VacationRequest {
	id: string;
	startDate: string;
	endDate: string;
	note: string | null;
	status: "PENDING" | "APPROVED" | "REJECTED";
	createdAt: string;
}

const statusConfig: Record<
	VacationRequest["status"],
	{ label: string; className: string }
> = {
	PENDING: {
		label: "Čeká na schválení",
		className: "bg-[#FDEEDC] text-[#C85A30] border-transparent",
	},
	APPROVED: {
		label: "Schváleno",
		className: "bg-[#E6F2EE] text-[#68B2A0] border-transparent",
	},
	REJECTED: {
		label: "Zamítnuto",
		className: "bg-[rgba(200,90,48,.1)] text-[#C85A30] border-[rgba(200,90,48,.2)]",
	},
};

export default function VacationsPage() {
	const [requests, setRequests] = useState<VacationRequest[]>([]);
	const [loading, setLoading] = useState(true);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");
	const [form, setForm] = useState({ startDate: "", endDate: "", note: "" });

	const fetchRequests = async () => {
		try {
			const res = await api.get("/vacations/my");
			setRequests(res.data);
		} catch (err) {
			console.error("Chyba při načítání žádostí:", err);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchRequests();
	}, []);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		setSuccess("");
		setSubmitting(true);

		try {
			await api.post("/vacations", {
				startDate: form.startDate,
				endDate: form.endDate,
				note: form.note || undefined,
			});
			setSuccess("Žádost o dovolenou byla odeslána.");
			setForm({ startDate: "", endDate: "", note: "" });
			fetchRequests();
		} catch (err: any) {
			setError(err.response?.data?.message || "Chyba při odesílání žádosti.");
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<PageContainer>
			<HeroHeader subtitle="Plánování volna" title="Moje dovolená" />

			<OverlapPanel delay="100ms">
				<form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-4 items-end w-full">
					{error && (
						<div className="absolute -top-12 left-1/2 -translate-x-1/2 px-4 py-2 bg-[rgba(200,90,48,.1)] text-[#C85A30] text-[10px] font-black rounded-lg border border-[rgba(200,90,48,.2)] uppercase tracking-widest whitespace-nowrap opacity-0 animate-in fade-in slide-in-from-bottom-4">
							{error}
						</div>
					)}
					{success && (
						<div className="absolute -top-12 left-1/2 -translate-x-1/2 px-4 py-2 bg-[#E6F2EE] text-[#68B2A0] text-[10px] font-black rounded-lg border border-[#DDF0E8] uppercase tracking-widest whitespace-nowrap opacity-0 animate-in fade-in slide-in-from-bottom-4">
							{success}
						</div>
					)}

					<div className="w-full md:w-40 flex-shrink-0">
						<label className="block text-[9px] font-black uppercase tracking-widest text-[#9ABABA] mb-1.5 ml-1">Od</label>
						<input
							type="date"
							required
							value={form.startDate}
							onChange={(e) => setForm({ ...form, startDate: e.target.value })}
							className="w-full rounded-xl border border-[#DDF0E8] px-4 py-3 text-sm font-semibold text-[#0F2E35] outline-none transition-all hover:bg-[#F0F7F4] focus:bg-[#F0F7F4] focus:border-[#68B2A0]"
						/>
					</div>
					
					<div className="w-full md:w-40 flex-shrink-0">
						<label className="block text-[9px] font-black uppercase tracking-widest text-[#9ABABA] mb-1.5 ml-1">Do</label>
						<input
							type="date"
							required
							value={form.endDate}
							onChange={(e) => setForm({ ...form, endDate: e.target.value })}
							className="w-full rounded-xl border border-[#DDF0E8] px-4 py-3 text-sm font-semibold text-[#0F2E35] outline-none transition-all hover:bg-[#F0F7F4] focus:bg-[#F0F7F4] focus:border-[#68B2A0]"
						/>
					</div>

					<div className="w-full relative flex-1">
						<label className="block text-[9px] font-black uppercase tracking-widest text-[#9ABABA] mb-1.5 ml-1">Poznámka</label>
						<input
							type="text"
							value={form.note}
							onChange={(e) => setForm({ ...form, note: e.target.value })}
							className="w-full rounded-xl border border-[#DDF0E8] px-4 py-3 text-sm font-semibold text-[#0F2E35] outline-none transition-all hover:bg-[#F0F7F4] focus:bg-[#F0F7F4] focus:border-[#68B2A0]"
							placeholder="Důvod žádosti (nepovinné)..."
						/>
					</div>

					<button
						type="submit"
						disabled={submitting}
						className="relative h-[46px] w-full md:w-auto px-8 rounded-xl shadow-[0_4px_12px_rgba(44,105,117,.15)] font-bold text-xs uppercase tracking-wider text-white transition-all active:scale-95 disabled:scale-100 disabled:opacity-70 hover:brightness-110 flex items-center justify-center gap-2"
						style={{ background: "linear-gradient(90deg, #2C6975, #68B2A0)" }}>
						{submitting ? <Loader2 size={16} className="animate-spin" /> : <><Send size={16} /> Odeslat</>}
					</button>
				</form>
			</OverlapPanel>

			<TableCard delay="180ms" isOverlapping={false}>
				<thead style={{ position: "sticky", top: 0, zIndex: 10, background: "rgba(255,255,255,0.95)", backdropFilter: "blur(8px)" }}>
					<tr style={{ borderBottom: "2px solid #DDF0E8" }}>
						<th className="px-6 py-4 text-[10px] font-black tracking-[0.1em] uppercase" style={{ color: "#9ABABA" }}>Termín</th>
						<th className="px-6 py-4 text-[10px] font-black tracking-[0.1em] uppercase" style={{ color: "#9ABABA" }}>Poznámka a detail</th>
						<th className="px-6 py-4 text-[10px] font-black tracking-[0.1em] uppercase text-right" style={{ color: "#9ABABA" }}>Stav žádosti</th>
					</tr>
				</thead>

				<tbody className="divide-y divide-[#DDF0E8]">
					{loading ? (
						<tr>
							<td colSpan={3} className="px-6 py-12 text-center text-[10px] font-black uppercase tracking-widest text-[#9ABABA] animate-pulse">
								Načítám žádosti...
							</td>
						</tr>
					) : requests.length === 0 ? (
						<tr>
							<td colSpan={3} className="px-6 py-16 text-center text-[10px] font-black uppercase tracking-widest text-[#9ABABA]">
								Zatím jste nepodali žádnou žádost o dovolenou.
							</td>
						</tr>
					) : (
						requests.map((req, idx) => {
							const status = statusConfig[req.status];
							return (
								<tr key={req.id} className="a-fade transition-colors hover:bg-slate-50" style={{ "--d": `${idx * 30}ms` } as React.CSSProperties}>
									<td className="px-6 py-4">
										<div className="flex items-center gap-3">
											<div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#F0F7F4", color: "#68B2A0" }}>
												<Calendar size={16} />
											</div>
											<div>
												<span className="font-extrabold text-[13px]" style={{ color: "#1C4E5A" }}>
													{new Date(req.startDate).toLocaleDateString("cs-CZ", { day: "numeric", month: "short", year: "numeric" })} 
													{" – "}
													{new Date(req.endDate).toLocaleDateString("cs-CZ", { day: "numeric", month: "short", year: "numeric" })}
												</span>
											</div>
										</div>
									</td>
									<td className="px-6 py-4">
										{req.note ? (
											<span className="text-[12px] font-semibold text-[#5A8A8A] truncate inline-block max-w-[300px]">
												{req.note}
											</span>
										) : (
											<span className="text-[12px] font-medium italic text-[#9ABABA]">
												Bez poznámky
											</span>
										)}
										<div className="text-[9px] font-black uppercase tracking-widest text-[#9ABABA] mt-1">
											Podáno: {new Date(req.createdAt).toLocaleDateString("cs-CZ")}
										</div>
									</td>
									<td className="px-6 py-4 text-right">
										<span className={`inline-block px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider border shadow-sm ${status.className}`}>
											{status.label}
										</span>
									</td>
								</tr>
							);
						})
					)}
				</tbody>
			</TableCard>
		</PageContainer>
	);
}
