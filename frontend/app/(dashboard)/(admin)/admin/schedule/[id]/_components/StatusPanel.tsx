"use client";

import type { ScheduleStatus } from "./types";

interface StatusPanelProps {
	status: ScheduleStatus;
	generating: boolean;
	onChangeStatus: (status: ScheduleStatus) => void;
	onAutoGenerate: () => void;
}

const STATUS_DOT: Record<ScheduleStatus, string> = {
	DRAFT: "#9ABABA",
	PREFERENCES: "#F5A623",
	GENERATED: "#68B2A0",
	PUBLISHED: "#3EBD8A",
};

const STATUS_LABELS: Record<ScheduleStatus, string> = {
	DRAFT: "Koncept",
	PREFERENCES: "Sběr preferencí",
	GENERATED: "Vygenerováno",
	PUBLISHED: "Publikováno",
};

const btnBase: React.CSSProperties = {
	borderRadius: 12,
	padding: "12px 24px",
	fontSize: 11,
	fontWeight: 800,
	textTransform: "uppercase",
	letterSpacing: "0.08em",
	cursor: "pointer",
	border: "none",
	transition: "all .15s",
};

function TealBtn({
	onClick,
	children,
	variant = "primary",
	disabled,
}: {
	onClick: () => void;
	children: React.ReactNode;
	variant?: "primary" | "secondary" | "ghost";
	disabled?: boolean;
}) {
	const styles: Record<string, React.CSSProperties> = {
		primary: {
			...btnBase,
			background: "linear-gradient(135deg, #1C4E5A 0%, #2C6975 100%)",
			color: "#fff",
			boxShadow: "0 4px 16px rgba(28,78,90,.25)",
		},
		secondary: {
			...btnBase,
			background: "#F0F7F4",
			color: "#1C4E5A",
			border: "1px solid #DDF0E8",
		},
		ghost: {
			...btnBase,
			background: "transparent",
			color: "#9ABABA",
			border: "1px solid #DDF0E8",
		},
	};
	return (
		<button
			onClick={onClick}
			disabled={disabled}
			style={{ ...styles[variant], opacity: disabled ? 0.6 : 1, cursor: disabled ? "not-allowed" : "pointer" }}>
			{children}
		</button>
	);
}

export function StatusPanel({
	status,
	generating,
	onChangeStatus,
	onAutoGenerate,
}: StatusPanelProps) {
	const dot = STATUS_DOT[status];
	const label = STATUS_LABELS[status];

	return (
		<div
			className="card"
			style={{
				padding: "24px 28px",
				display: "flex",
				flexWrap: "wrap",
				alignItems: "center",
				justifyContent: "space-between",
				gap: 16,
			}}>
			{/* Stav */}
			<div style={{ display: "flex", alignItems: "center", gap: 12 }}>
				<span
					style={{
						fontSize: 10,
						fontWeight: 600,
						color: "#9ABABA",
						letterSpacing: "0.12em",
						textTransform: "uppercase",
					}}>
					Stav rozvrhu
				</span>
				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: 8,
						background: "#F0F7F4",
						border: "1px solid #DDF0E8",
						borderRadius: 99,
						padding: "6px 14px",
					}}>
					<span
						className="a-pulse"
						style={{
							width: 7,
							height: 7,
							borderRadius: "50%",
							background: dot,
							boxShadow: `0 0 6px ${dot}`,
							flexShrink: 0,
						}}
					/>
					<span style={{ fontSize: 12, fontWeight: 700, color: "#1C4E5A" }}>
						{label}
					</span>
				</div>
			</div>

			{/* Akce */}
			<div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
				{status === "DRAFT" && (
					<TealBtn onClick={() => onChangeStatus("PREFERENCES")}>
						🔓 Otevřít pro preference
					</TealBtn>
				)}

				{status === "PREFERENCES" && (
					<>
						<TealBtn onClick={() => onChangeStatus("DRAFT")} variant="ghost">
							← Zpět na úpravy
						</TealBtn>
						<TealBtn onClick={onAutoGenerate} disabled={generating}>
							{generating ? (
								<span style={{ display: "flex", alignItems: "center", gap: 6 }}>
									<svg className="animate-spin" style={{ width: 12, height: 12 }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
										<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
										<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
									</svg>
									Generuji…
								</span>
							) : "🤖 Automaticky obsadit"}
						</TealBtn>
						<TealBtn onClick={() => onChangeStatus("GENERATED")} variant="secondary">
							🔒 Uzavřít
						</TealBtn>
					</>
				)}

				{status === "GENERATED" && (
					<>
						<TealBtn onClick={onAutoGenerate} disabled={generating} variant="ghost">
							{generating ? "Generuji…" : "🤖 Znovu přegenerovat"}
						</TealBtn>
						<TealBtn onClick={() => onChangeStatus("PUBLISHED")}>
							✓ Publikovat zaměstnancům
						</TealBtn>
					</>
				)}

				{status === "PUBLISHED" && (
					<TealBtn onClick={() => onChangeStatus("DRAFT")} variant="ghost">
						↩ Vrátit do konceptu
					</TealBtn>
				)}
			</div>
		</div>
	);
}
