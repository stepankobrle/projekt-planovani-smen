"use client";

import type { Shift, PositionColor } from "./types";

interface DayCardProps {
	day: string;
	index: number;
	shifts: Shift[];
	positions: { id: number; name: string }[];
	colorPalette: PositionColor[];
	onEditShift: (shift: Shift) => void;
	onAddShift: (day: string) => void;
}

export function DayCard({
	day,
	index,
	shifts,
	positions,
	colorPalette,
	onEditShift,
	onAddShift,
}: DayCardProps) {
	const dayShifts = shifts.filter((s) => s.startDatetime.startsWith(day));

	const grouped = dayShifts.reduce<Record<string, Shift[]>>((acc, shift) => {
		const key = String(shift.jobPositionId);
		if (!acc[key]) acc[key] = [];
		acc[key].push(shift);
		return acc;
	}, {});

	const activePositionIds = Object.keys(grouped);
	const date = new Date(day);
	const weekday = date.toLocaleDateString("cs-CZ", { weekday: "long" });
	const dayNum = date.getDate();
	const monthNum = date.getMonth() + 1;

	const delay = Math.min(index * 40, 400);

	return (
		<div
			className="card a-up"
			style={{ "--d": `${delay}ms`, overflow: "hidden" } as React.CSSProperties}>
			{/* Hlavička dne */}
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					padding: "12px 20px",
					borderBottom: "1px solid #DDF0E8",
					background: "#F0F7F4",
				}}>
				<div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
					<span
						style={{
							fontSize: 18,
							fontWeight: 800,
							color: "#1C4E5A",
							lineHeight: 1,
						}}>
						{dayNum}.{monthNum}.
					</span>
					<span
						style={{
							fontSize: 11,
							fontWeight: 600,
							color: "#9ABABA",
							textTransform: "uppercase",
							letterSpacing: "0.1em",
						}}>
						{weekday}
					</span>
				</div>
				<button
					onClick={() => onAddShift(day)}
					style={{
						fontSize: 10,
						fontWeight: 700,
						color: "#68B2A0",
						background: "none",
						border: "1px solid #DDF0E8",
						borderRadius: 8,
						padding: "5px 12px",
						cursor: "pointer",
						letterSpacing: "0.08em",
						textTransform: "uppercase",
						transition: "all .12s",
					}}>
					+ Přidat směnu
				</button>
			</div>

			{/* Obsah */}
			<div style={{ padding: "12px 16px", overflowX: "auto" }}>
				{activePositionIds.length === 0 ? (
					<div
						style={{
							padding: "16px 0",
							textAlign: "center",
							fontSize: 10,
							fontWeight: 700,
							textTransform: "uppercase",
							letterSpacing: "0.12em",
							color: "#C5DED9",
						}}>
						Žádné směny
					</div>
				) : (
					<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
						{activePositionIds.map((posId, posIndex) => {
							const posName =
								positions.find((p) => p.id === Number(posId))?.name ||
								"Neznámá pozice";
							const shiftsInPos = grouped[posId];
							const color = colorPalette[posIndex % colorPalette.length];

							return (
								<div
									key={posId}
									style={{
										display: "flex",
										alignItems: "center",
										gap: 12,
										background: color.row,
										borderRadius: 12,
										padding: "10px 12px",
										minWidth: "max-content",
									}}>
									{/* Pozice badge */}
									<div
										style={{
											width: 112,
											flexShrink: 0,
											padding: "10px 12px",
											borderRadius: 10,
											textAlign: "center",
											fontSize: 10,
											fontWeight: 800,
											textTransform: "uppercase",
											letterSpacing: "0.06em",
											lineHeight: 1.3,
											background: color.badge,
											color: color.text,
										}}>
										{posName}
									</div>

									{/* Směny */}
									<div style={{ display: "flex", gap: 8 }}>
										{shiftsInPos.map((shift) => (
											<div
												key={shift.id}
												onClick={() => onEditShift(shift)}
												style={{
													padding: "10px 14px",
													borderRadius: 10,
													minWidth: 130,
													flexShrink: 0,
													textAlign: "center",
													background: "#fff",
													border: `2px solid ${shift.assignedUser ? color.border : "#DDF0E8"}`,
													cursor: "pointer",
													transition: "all .15s",
													boxShadow: "0 1px 4px rgba(28,78,90,.06)",
												}}>
												<div
													style={{
														fontSize: 9,
														fontWeight: 700,
														textTransform: "uppercase",
														letterSpacing: "0.06em",
														color: "#9ABABA",
														marginBottom: 4,
													}}>
													{new Date(shift.startDatetime).toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" })}
													{" – "}
													{new Date(shift.endDatetime).toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" })}
												</div>
												<div
													style={{
														fontSize: 11,
														fontWeight: 700,
														color: shift.assignedUser ? color.text : "#C5DED9",
														overflow: "hidden",
														textOverflow: "ellipsis",
														whiteSpace: "nowrap",
													}}>
													{shift.assignedUser?.fullName || "Volný slot"}
												</div>
											</div>
										))}
									</div>
								</div>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
}
