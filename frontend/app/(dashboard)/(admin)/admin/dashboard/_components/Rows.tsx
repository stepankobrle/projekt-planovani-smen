import React from "react";
import { AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { Shift, VacationRequest, Notification, ScheduleGroup } from "./types";
import { fmtShort, fmtTime, initials } from "./helpers";

export function TodayRow({ shift, index }: { shift: Shift; index: number }) {
	const name = shift.assignedUser?.fullName ?? shift.assignedUser?.email ?? "—";
	const ini = initials(shift.assignedUser?.fullName ?? null);
	const grads = [
		"var(--brand-gradient-chart-1)",
		"var(--brand-gradient-chart-2)",
		"var(--brand-gradient-chart-3)",
		"var(--brand-gradient-chart-4)",
	];

	return (
		<div
			className="t-row a-fade"
			style={{ "--d": `${index * 40}ms`, gridTemplateColumns: "1fr 100px 100px", gap: 12, padding: "11px 6px" } as React.CSSProperties}>
			<div style={{ display: "flex", alignItems: "center", gap: 10 }}>
				<div
					style={{
						width: 32, height: 32, borderRadius: "50%", background: grads[index % grads.length],
						display: "flex", alignItems: "center", justifyContent: "center", color: "#fff",
						fontSize: 11, fontWeight: 700, flexShrink: 0, boxShadow: "0 2px 6px rgba(28,78,90,.2)",
					}}>
					{ini}
				</div>
				<div>
					<div style={{ fontSize: 13, fontWeight: 600, color: "#0F2E35" }}>
						{name.split(" ")[0]}{" "}
						<span style={{ fontWeight: 400, color: "#5A8A8A" }}>{name.split(" ").slice(1).join(" ")}</span>
					</div>
					<div style={{ fontSize: 11, color: "#9ABABA", marginTop: 1 }}>
						{shift.jobPosition?.name ?? "—"}
					</div>
				</div>
			</div>
			<div style={{ fontSize: 12, fontWeight: 600, color: "#2C6975" }}>
				{fmtTime(shift.startDatetime)}
				<span style={{ color: "#9ABABA", fontWeight: 400 }}> – {fmtTime(shift.endDatetime)}</span>
			</div>
			<div style={{ textAlign: "right" }}>
				{shift.shiftType && (
					<span
						style={{
							fontSize: 10, fontWeight: 600, color: shift.shiftType.colorCode,
							background: `${shift.shiftType.colorCode}14`, border: `1px solid ${shift.shiftType.colorCode}30`,
							padding: "3px 8px", borderRadius: 99, letterSpacing: "0.06em",
						}}>
						{shift.shiftType.name}
					</span>
				)}
			</div>
		</div>
	);
}

export function UnassignedRow({ shift, index }: { shift: Shift; index: number }) {
	return (
		<div
			className="t-row a-fade"
			style={{ "--d": `${index * 35}ms`, gridTemplateColumns: "80px 1fr 100px", gap: 12, padding: "11px 6px" } as React.CSSProperties}>
			<span style={{ fontSize: 12, fontWeight: 600, color: "#C85A30" }}>{fmtShort(shift.startDatetime)}</span>
			<div style={{ display: "flex", alignItems: "center", gap: 6 }}>
				<AlertCircle size={12} color="#C85A30" style={{ flexShrink: 0 }} />
				<span style={{ fontSize: 12, color: "#5A8A8A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
					{shift.jobPosition?.name ?? "—"}
				</span>
			</div>
			<div style={{ textAlign: "right", fontSize: 12, color: "#9ABABA" }}>
				{fmtTime(shift.startDatetime)}
			</div>
		</div>
	);
}

export function VacationRow({
	req,
	index,
	processing,
	onAction,
}: {
	req: VacationRequest;
	index: number;
	processing: boolean;
	onAction: (id: string, action: "approve" | "reject") => void;
}) {
	const ini = initials(req.user.fullName ?? null);
	return (
		<div
			className="a-fade"
			style={{
				"--d": `${index * 50}ms`, padding: "12px 14px", borderRadius: 12,
				background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.1)",
			} as React.CSSProperties}>
			<div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
				<div
					style={{
						width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,.15)",
						display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,.8)",
						fontSize: 11, fontWeight: 700, flexShrink: 0,
					}}>
					{ini}
				</div>
				<div style={{ flex: 1, minWidth: 0 }}>
					<div style={{ fontSize: 13, fontWeight: 600, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
						{req.user.fullName ?? req.user.email}
					</div>
					<div style={{ fontSize: 11, color: "rgba(205,224,201,.5)", marginTop: 1 }}>
						{fmtShort(req.startDate)} – {fmtShort(req.endDate)}
					</div>
				</div>
				{processing && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#CDE0C9", flexShrink: 0 }} className="a-pulse" />}
			</div>
			<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
				<button
					disabled={processing}
					onClick={() => onAction(req.id, "approve")}
					className="btn-ok"
					style={{
						padding: "7px 0", borderRadius: 10, fontSize: 12, fontWeight: 600, display: "flex",
						alignItems: "center", justifyContent: "center", gap: 5, opacity: processing ? 0.4 : 1,
						cursor: processing ? "not-allowed" : "pointer", fontFamily: "inherit",
					}}>
					<CheckCircle2 size={12} /> Schválit
				</button>
				<button
					disabled={processing}
					onClick={() => onAction(req.id, "reject")}
					className="btn-no"
					style={{
						padding: "7px 0", borderRadius: 10, fontSize: 12, fontWeight: 600, display: "flex",
						alignItems: "center", justifyContent: "center", gap: 5, opacity: processing ? 0.4 : 1,
						cursor: processing ? "not-allowed" : "pointer", fontFamily: "inherit",
					}}>
					<XCircle size={12} /> Zamítnout
				</button>
			</div>
		</div>
	);
}

export function NotifRow({ notif, index }: { notif: Notification; index: number }) {
	return (
		<div
			className="a-fade"
			style={{
				"--d": `${index * 30}ms`, padding: "8px 6px", borderBottom: "1px solid #DDF0E8",
				display: "flex", gap: 8, alignItems: "flex-start",
			} as React.CSSProperties}>
			{!notif.isRead && <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#68B2A0", flexShrink: 0, marginTop: 5 }} />}
			<div>
				<p style={{ fontSize: 11, lineHeight: 1.45, color: notif.isRead ? "#9ABABA" : "#5A8A8A", fontWeight: notif.isRead ? 400 : 500 }}>
					{notif.content}
				</p>
				<span style={{ fontSize: 10, color: "#9ABABA" }}>{new Date(notif.createdAt).toLocaleDateString("cs-CZ")}</span>
			</div>
		</div>
	);
}
