"use client";
import { useState, useEffect } from "react";

interface ShiftWithAvailabilities {
	id: string;
	startDatetime: string;
	endDatetime: string;
	shiftType: { name: string };
	assignedUser?: { fullName: string }; // Přidáno pro zobrazení výsledku
	availabilities: {
		id: string;
		type: "PREFERRED" | "AVAILABLE" | "UNAVAILABLE";
		user: { fullName: string };
	}[];
}

export default function AdminScheduler() {
	const [shifts, setShifts] = useState<ShiftWithAvailabilities[]>([]);
	const [loading, setLoading] = useState(true);
	const [isGenerating, setIsGenerating] = useState(false);

	// Pomocná funkce pro načtení dat (abychom ji mohli volat opakovaně)
	const loadData = async () => {
		setLoading(true);
		try {
			const res = await fetch(
				"http://localhost:3001/shifts/admin-overview?locationId=1",
			);
			const data = await res.json();
			setShifts(data);
		} catch (err) {
			console.error("Chyba při načítání:", err);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		loadData();
	}, []);

	const handleGenerate = async () => {
		setIsGenerating(true);
		try {
			const res = await fetch("http://localhost:3001/schedule/generate", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					locationId: 1,
					from: new Date().toISOString(), // Uprav podle potřeby
					to: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
				}),
			});
			const result = await res.json();
			alert(result.message);
			await loadData(); // Znovu načteme data, abychom viděli změny
		} catch (err) {
			alert("Chyba při generování");
		} finally {
			setIsGenerating(false);
		}
	};

	if (loading) return <div className="p-6 text-center">Načítám rozvrh...</div>;

	// Zjistíme, jestli už máme nějaké přiřazené lidi (pro zobrazení tlačítka Schválit)
	const hasAssignments = shifts.some((s) => s.assignedUser);

	return (
		<div className="p-6">
			<div className="flex justify-between items-center mb-6">
				<h1 className="text-2xl font-bold italic text-slate-800">
					Plánování směn – Fáze 3
				</h1>
				<div className="space-x-2">
					<button
						className={`${isGenerating ? "bg-gray-400" : "bg-green-600 hover:bg-green-700"} text-white px-4 py-2 rounded shadow transition`}
						onClick={handleGenerate}
						disabled={isGenerating}>
						{isGenerating ? "Generuji..." : "🪄 Spustit automatickou generaci"}
					</button>

					{hasAssignments && (
						<button className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 transition">
							✅ Schválit a publikovat
						</button>
					)}
				</div>
			</div>

			<div className="grid grid-cols-7 gap-3">
				{shifts.map((shift) => (
					<div
						key={shift.id}
						className="border-2 border-slate-200 p-3 rounded-xl bg-white shadow-sm">
						<div className="text-[10px] font-black text-blue-600 uppercase tracking-wider">
							{shift.shiftType.name}
						</div>
						<div className="text-lg font-bold text-slate-700 mb-3">
							{new Date(shift.startDatetime).toLocaleTimeString([], {
								hour: "2-digit",
								minute: "2-digit",
							})}
						</div>

						{/* VÝSLEDEK ALGORITMU: Přiřazený uživatel */}
						{shift.assignedUser ? (
							<div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded-lg">
								<p className="text-[9px] text-blue-500 uppercase font-bold">
									Přiřazen:
								</p>
								<p className="text-sm font-bold text-blue-800">
									{shift.assignedUser.fullName}
								</p>
							</div>
						) : (
							<div className="mb-3 p-2 bg-gray-100 border border-dashed border-gray-300 rounded-lg text-center">
								<p className="text-[9px] text-gray-400 uppercase">Volný slot</p>
							</div>
						)}

						<hr className="my-2" />

						{/* Seznam zájemců */}
						<div className="space-y-1">
							<p className="text-[9px] text-slate-400 uppercase font-bold mb-1">
								Zájemci:
							</p>
							{shift.availabilities.map((av) => (
								<div
									key={av.id}
									className={`text-[10px] p-1.5 rounded-md font-medium ${
										av.type === "PREFERRED"
											? "bg-amber-100 text-amber-700 border border-amber-200"
											: av.type === "UNAVAILABLE"
												? "bg-rose-50 text-rose-400 opacity-50"
												: "bg-emerald-50 text-emerald-700"
									}`}>
									{av.user.fullName} {av.type === "PREFERRED" && "⭐"}
								</div>
							))}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
