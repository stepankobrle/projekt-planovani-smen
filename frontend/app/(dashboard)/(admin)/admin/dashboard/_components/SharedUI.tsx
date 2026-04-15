import React from "react";

export function Empty({
	icon: Icon,
	text,
	positive = false,
	small = false,
}: {
	icon: React.ElementType;
	text: string;
	positive?: boolean;
	small?: boolean;
}) {
	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				gap: 8,
				padding: small ? "16px 0" : "24px 0",
			}}>
			<Icon
				size={small ? 16 : 20}
				color={positive ? "#68B2A0" : "#CDE0C9"} // mid / sage
			/>
			<p
				style={{
					fontSize: 12,
					color: "#9ABABA", // muted
					textAlign: "center",
				}}>
				{text}
			</p>
		</div>
	);
}

export function SectionTitle({
	title,
	badge,
	warn = false,
	small = false,
	noMargin = false,
}: {
	title: string;
	badge?: number;
	warn?: boolean;
	small?: boolean;
	noMargin?: boolean;
}) {
	return (
		<div
			style={{
				display: "flex",
				alignItems: "center",
				gap: 10,
				marginBottom: noMargin ? 0 : 18,
			}}>
			<div
				style={{
					width: 3,
					height: small ? 16 : 20,
					background: warn
						? "linear-gradient(180deg, #C85A30, #F0A882)" // var(--warn)
						: "linear-gradient(180deg, #2C6975, #68B2A0)", // var(--teal) to var(--mid)
					borderRadius: 2,
					flexShrink: 0,
				}}
			/>
			<h2
				style={{
					fontSize: small ? 14 : 17,
					fontWeight: 700,
					color: "#0F2E35", // ink
				}}>
				{title}
			</h2>
			{badge !== undefined && badge > 0 && (
				<span
					style={{
						fontSize: 11,
						fontWeight: 700,
						background: warn ? "#FBF0EC" : "#E6F2EE", // warn-l or mist
						color: warn ? "#C85A30" : "#2C6975", // warn or teal
						border: `1px solid ${warn ? "rgba(200,90,48,.2)" : "#CDE0C9"}`,
						padding: "2px 9px",
						borderRadius: 99,
					}}>
					{badge}
				</span>
			)}
		</div>
	);
}
