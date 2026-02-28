"use client";

import type { Shift, PositionColor } from "./types";

interface DayCardProps {
	day: string;
	shifts: Shift[];
	positions: { id: number; name: string }[];
	colorPalette: PositionColor[];
	onEditShift: (shift: Shift) => void;
	onAddShift: (day: string) => void;
}

export function DayCard({ day, shifts, positions, colorPalette, onEditShift, onAddShift }: DayCardProps) {
	const dayShifts = shifts.filter((s) => s.startDatetime.startsWith(day));

	const grouped = dayShifts.reduce<Record<string, Shift[]>>((acc, shift) => {
		const key = String(shift.jobPositionId);
		if (!acc[key]) acc[key] = [];
		acc[key].push(shift);
		return acc;
	}, {});

	const activePositionIds = Object.keys(grouped);
	const date = new Date(day);
	const weekday = date.toLocaleDateString("cs-CZ", { weekday: "short" });
	const dayNum = date.getDate();
	const monthNum = date.getMonth() + 1;

	return (
		<div className="bg-white rounded-[1.5rem] shadow-sm border border-slate-100 overflow-hidden">
			<div className="bg-slate-100 px-6 py-3 flex justify-between items-center border-b border-slate-200">
				<div className="font-black text-slate-600 uppercase text-xs tracking-wider">
					{weekday} {dayNum}.{monthNum}
				</div>
				<button
					onClick={() => onAddShift(day)}
					className="text-[10px] font-black uppercase text-slate-400 hover:text-indigo-600 transition-colors">
					pridat směnu
				</button>
			</div>

			<div className="p-4 space-y-2 overflow-x-auto">
				{activePositionIds.length === 0 ? (
					<div className="py-4 text-center text-[10px] font-black uppercase text-slate-300 tracking-widest opacity-50">
						Žádné směny
					</div>
				) : (
					activePositionIds.map((posId) => {
						const posName = positions.find((p) => p.id === Number(posId))?.name || "Neznámá pozice";
						const shiftsInPos = grouped[posId];
						const color = colorPalette[Number(posId) % colorPalette.length];

						return (
							<div
								key={posId}
								className="flex items-center gap-3 border-b border-slate-100 py-3 last:border-0 min-w-max rounded-xl px-2"
								style={{ backgroundColor: color.row }}>
								<div
									className="w-28 shrink-0 px-3 py-3 rounded-xl text-center font-black uppercase text-[10px] leading-tight"
									style={{ backgroundColor: color.badge, color: color.text }}>
									{posName}
								</div>
								<div className="flex gap-2">
									{shiftsInPos.map((shift) => (
										<div
											key={shift.id}
											onClick={() => onEditShift(shift)}
											className="p-3 rounded-xl min-w-[130px] shrink-0 text-center shadow-sm cursor-pointer hover:scale-105 transition-all bg-white"
											style={{
												borderWidth: 2,
												borderStyle: "solid",
												borderColor: shift.assignedUser ? color.border : "#e2e8f0",
											}}>
											<div className="text-[9px] font-black uppercase opacity-60">
												{new Date(shift.startDatetime).toLocaleTimeString("cs-CZ", {
													hour: "2-digit",
													minute: "2-digit",
												})}
												{" - "}
												{new Date(shift.endDatetime).toLocaleTimeString("cs-CZ", {
													hour: "2-digit",
													minute: "2-digit",
												})}
											</div>
											<div
												className="text-[11px] font-bold truncate"
												style={{ color: shift.assignedUser ? color.text : "#94a3b8" }}>
												{shift.assignedUser?.fullName || "VOLNÝ SLOT"}
											</div>
										</div>
									))}
								</div>
							</div>
						);
					})
				)}
			</div>
		</div>
	);
}
