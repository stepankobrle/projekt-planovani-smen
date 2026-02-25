"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/api";

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
			setError(
				err.response?.data?.message || "Chyba při odesílání žádosti.",
			);
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<div className="max-w-2xl mx-auto space-y-8">
			{/* FORMULÁŘ */}
			<div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
				<h2 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-6">
					Nová žádost o dovolenou
				</h2>

				{error && (
					<div className="mb-4 p-3 bg-red-50 text-red-600 text-xs font-bold rounded-xl border border-red-100 uppercase tracking-wide">
						{error}
					</div>
				)}
				{success && (
					<div className="mb-4 p-3 bg-green-50 text-green-600 text-xs font-bold rounded-xl border border-green-100 uppercase tracking-wide">
						{success}
					</div>
				)}

				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="grid grid-cols-2 gap-4">
						<div>
							<label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
								Datum od
							</label>
							<input
								type="date"
								required
								value={form.startDate}
								onChange={(e) =>
									setForm({ ...form, startDate: e.target.value })
								}
								className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium outline-none focus:ring-2 focus:ring-brand-secondary"
							/>
						</div>
						<div>
							<label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
								Datum do
							</label>
							<input
								type="date"
								required
								value={form.endDate}
								onChange={(e) =>
									setForm({ ...form, endDate: e.target.value })
								}
								className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium outline-none focus:ring-2 focus:ring-brand-secondary"
							/>
						</div>
					</div>

					<div>
						<label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
							Poznámka (volitelné)
						</label>
						<textarea
							value={form.note}
							onChange={(e) => setForm({ ...form, note: e.target.value })}
							rows={3}
							className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium outline-none focus:ring-2 focus:ring-brand-secondary resize-none"
							placeholder="Důvod nebo poznámka k žádosti..."
						/>
					</div>

					<button
						type="submit"
						disabled={submitting}
						className={`w-full p-3 rounded-xl text-white font-bold text-sm uppercase tracking-widest transition-all shadow ${
							submitting
								? "bg-brand-secondary/40 cursor-not-allowed"
								: "bg-brand-secondary hover:bg-brand-secondary-hover"
						}`}>
						{submitting ? "Odesílám..." : "Odeslat žádost"}
					</button>
				</form>
			</div>

			{/* SEZNAM ŽÁDOSTÍ */}
			<div>
				<h2 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-4">
					Moje žádosti
				</h2>

				{loading ? (
					<div className="text-center py-8 text-slate-400 text-sm">
						Načítám...
					</div>
				) : requests.length === 0 ? (
					<div className="bg-white p-8 rounded-2xl border-2 border-dashed border-slate-200 text-center text-slate-400 text-sm">
						Zatím jste nepodali žádnou žádost.
					</div>
				) : (
					<div className="space-y-3">
						{requests.map((req) => {
							const status = statusConfig[req.status];
							return (
								<div
									key={req.id}
									className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center justify-between gap-4">
									<div>
										<div className="font-black text-slate-800">
											{new Date(req.startDate).toLocaleDateString("cs-CZ")} –{" "}
											{new Date(req.endDate).toLocaleDateString("cs-CZ")}
										</div>
										{req.note && (
											<div className="text-xs text-slate-400 mt-0.5">
												{req.note}
											</div>
										)}
										<div className="text-[10px] text-slate-300 mt-1 uppercase tracking-wide">
											Podáno:{" "}
											{new Date(req.createdAt).toLocaleDateString("cs-CZ")}
										</div>
									</div>
									<span
										className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase border whitespace-nowrap ${status.className}`}>
										{status.label}
									</span>
								</div>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
}
