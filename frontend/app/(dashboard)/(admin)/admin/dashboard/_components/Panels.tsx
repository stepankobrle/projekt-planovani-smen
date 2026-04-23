import React, { useEffect, useState } from "react";
import { ScheduleGroup, Shift } from "./types";
import { useCountUp } from "./helpers";

const PHASE: Record<string, { label: string; dot: string }> = {
	DRAFT: { label: "Koncept", dot: "#7AABB0" },
	PREFERENCES: { label: "Sběr preferencí", dot: "#D4980C" },
	GENERATED: { label: "Vygenerováno", dot: "#68B2A0" },
	PUBLISHED: { label: "Publikováno", dot: "#3A9A78" },
};

export { PHASE };

export function SchedulePanel({
	schedule,
	allShifts,
}: {
	schedule: ScheduleGroup | null;
	allShifts: Shift[];
}) {
	const assigned = allShifts.filter((s) => s.assignedUserId !== null).length;
	const total = allShifts.length;
	const pct = total > 0 ? Math.round((assigned / total) * 100) : 0;
	const [bar, setBar] = useState(0);

	useEffect(() => {
		const t = setTimeout(() => setBar(pct), 400);
		return () => clearTimeout(t);
	}, [pct]);

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
			<div>
				<div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
					<span style={{ fontSize: 11, color: "#9ABABA", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>
						Obsazenost
					</span>
					<span style={{ fontSize: 22, fontWeight: 800, color: "#2C6975" }}>
						{pct}%
					</span>
				</div>
				<div style={{ height: 5, background: "#E6F2EE", borderRadius: 99, overflow: "hidden" }}>
					<div
						style={{
							height: "100%", borderRadius: 99, width: `${bar}%`,
							background: "linear-gradient(90deg, #2C6975, #68B2A0)",
							transition: "width 1s cubic-bezier(.16,1,.3,1)",
						}}
					/>
				</div>
				<div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
					<span style={{ fontSize: 10, color: "#9ABABA" }}>{assigned} obsaz.</span>
					<span style={{ fontSize: 10, color: "#9ABABA" }}>{total} celkem</span>
				</div>
			</div>

			<div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
				{Object.entries(PHASE).map(([key, val]) => {
					const active = schedule?.status === key;
					return (
						<div key={key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
							<div
								style={{
									width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
									background: active ? val.dot : "#DDF0E8", boxShadow: active ? `0 0 5px ${val.dot}` : "none",
									transition: "all .3s",
								}}
							/>
							<span style={{ fontSize: 12, fontWeight: active ? 600 : 400, color: active ? "#0F2E35" : "#9ABABA" }}>
								{val.label}
							</span>
						</div>
					);
				})}
			</div>
		</div>
	);
}

export function MetricBlock({
	label,
	value,
	delay,
	alert = false,
	alertSub = "",
	last = false,
}: {
	label: string;
	value: number;
	delay: number;
	alert?: boolean;
	alertSub?: string;
	last?: boolean;
}) {
	const count = useCountUp(value, 950);

	return (
		<div
			className={`a-up relative border-[#DDF0E8] border-b sm:border-b-0 lg:border-r ${last ? "sm:border-r-0 lg:border-r-0" : "sm:border-r"}`}
			style={{ "--d": `${delay}ms`, padding: "28px 28px 24px" } as React.CSSProperties}>
			{alert && value > 0 && (
				<div
					style={{
						position: "absolute", top: 20, right: 20, width: 8, height: 8,
						borderRadius: "50%", background: "#C85A30", boxShadow: "0 0 8px rgba(200,90,48,.5)",
					}}
					className="a-pulse"
				/>
			)}
			<div
				className={alert && value > 0 ? "num-warn" : "num-grad"}
				style={{ fontSize: 64, fontWeight: 800, lineHeight: 1, marginBottom: 8 }}>
				{count}
			</div>
			<div style={{ fontSize: 11, fontWeight: 600, color: "#9ABABA", letterSpacing: "0.1em", textTransform: "uppercase" }}>
				{label}
			</div>
			{alert && value > 0 && alertSub && (
				<div style={{ fontSize: 11, color: "#C85A30", fontWeight: 500, marginTop: 2 }}>
					{value} {alertSub}
				</div>
			)}
			<div
				style={{
					position: "absolute", bottom: 0, left: 28, right: 28, height: 2, borderRadius: 1,
					background: alert && value > 0 ? "#C85A30" : "linear-gradient(90deg, #2C6975, #68B2A0)", opacity: 0.6,
				}}
			/>
		</div>
	);
}
