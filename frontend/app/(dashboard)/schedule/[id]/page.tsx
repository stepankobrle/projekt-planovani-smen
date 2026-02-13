"use client";

import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/app/components/ProtectedRoute";

interface Shift {
	id: string;
	startDatetime: string;
	endDatetime: string;
	assignedUser?: {
		id: string;
		email: string;
	} | null;
	shiftType: { id: string; name: string; colorCode: string };
}

interface ScheduleGroup {
	id: string;
	name: string;
	status: "DRAFT" | "OPEN" | "PUBLISHED";
	calendarDays: string[];
	shifts: Shift[];
}

export default function ScheduleDetailPage() {
	const params = useParams();
	const router = useRouter();
	const { role } = useAuth();
	const [users, setUsers] = useState<
		{ id: string; email: string; fullName: string }[]
	>([]);

	const [data, setData] = useState<ScheduleGroup | null>(null);
	const [loading, setLoading] = useState(true);
	const [isDirty, setIsDirty] = useState(false);
	const [editModal, setEditModal] = useState<{
		isOpen: boolean;
		shift: Shift | null;
	}>({
		isOpen: false,
		shift: null,
	});

	const handleUpdateShift = async (
		shiftId: string,
		{ startTime, endTime }: { startTime: string; endTime: string },
	) => {
		try {
			const originalDate = new Date(editModal.shift!.startDatetime);

			// Vytvoříme nové objekty Date kombinací původního dne a nového času
			const start = new Date(originalDate);
			const [sHour, sMin] = startTime.split(":");
			start.setHours(parseInt(sHour), parseInt(sMin));

			const end = new Date(originalDate);
			const [eHour, eMin] = endTime.split(":");
			end.setHours(parseInt(eHour), parseInt(eMin));

			await axios.patch(
				`http://localhost:3001/shifts/${shiftId}`,
				{
					startDatetime: start,
					endDatetime: end,
				},
				{ withCredentials: true },
			);

			setEditModal({ isOpen: false, shift: null });
			fetchData(); // Obnovit data v tabulce
		} catch (err) {
			alert("Nepodařilo se aktualizovat časy směny.");
		}
	};

	const handleManualAssign = async (shiftId: string, userId: string) => {
		try {
			await axios.patch(
				`http://localhost:3001/shifts/${shiftId}`,
				{
					assignedUserId: userId === "" ? null : userId,
				},
				{ withCredentials: true },
			);

			fetchData();
			setEditModal({ isOpen: false, shift: null });
		} catch (err: any) {
			console.error("Chyba při ukládání:", err.response?.data);
			alert(
				"Nepodařilo se uložit změny: " +
					(err.response?.data?.message || "Neznámá chyba"),
			);
		}
	};

	// Preference: { "datum_typId": "PREFER" | "AVAILABLE" | "CANNOT" }
	const [preferences, setPreferences] = useState<Record<string, string>>({});

	const [modalConfig, setModalConfig] = useState({
		isOpen: false,
		title: "",
		type: "CONFIRM_ACTION" as "CONFIRM_ACTION" | "UNSAVED_CHANGES",
		endpoint: "",
		method: "patch" as "post" | "patch" | "delete",
	});

	const fetchData = useCallback(async () => {
		try {
			const locationId = 1;

			const [resGroup, resUsers] = await Promise.all([
				axios.get(`http://localhost:3001/schedule-groups/${params.id}`, {
					withCredentials: true,
				}),
				axios.get(
					`http://localhost:3001/shifts/available-employees/${locationId}`,
					{ withCredentials: true },
				),
			]);

			setData(resGroup.data);
			setUsers(resUsers.data); // Teď už by to nemělo hodit 404
		} catch (err: any) {
			console.error("Chyba při načítání:", err.response?.data || err.message);
		}
	}, [params.id]);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	const handleBackClick = () => {
		if (isDirty) {
			setModalConfig({
				isOpen: true,
				title:
					"Máte neuložené změny v preferencích. Chcete je před odchodem uložit?",
				type: "UNSAVED_CHANGES",
				endpoint: "",
				method: "patch",
			});
		} else {
			router.push("/schedule");
		}
	};

	const handlePreferenceChange = (
		shiftTypeId: string,
		date: string,
		level: string,
	) => {
		const key = `${date}_${shiftTypeId}`;
		setPreferences((prev) => ({ ...prev, [key]: level }));
		setIsDirty(true);
	};

	// Hromadné uložení preferencí
	const savePreferences = async () => {
		try {
			await axios.post(
				`http://localhost:3001/preferences/bulk`,
				{
					scheduleGroupId: params.id,
					preferences: Object.entries(preferences).map(([key, level]) => {
						const [date, shiftTypeId] = key.split("_");
						return { date, shiftTypeId, level };
					}),
				},
				{ withCredentials: true },
			);
			setIsDirty(false);
			alert("Preference uloženy.");
		} catch (err) {
			alert("Chyba při ukládání.");
		}
	};

	const addShiftAdmin = async (day: string) => {
		try {
			const res = await axios.post(
				`http://localhost:3001/shifts`,
				{
					scheduleGroupId: params.id,
					date: day,
					shiftTypeId: 1,
					locationId: 1,
					count: 1,
				},
				{ withCredentials: true },
			);

			if (res.status === 201 || res.status === 200) {
				fetchData();
			}
		} catch (err: any) {
			console.error("Detaily chyby:", err.response?.data);
			alert(
				`Chyba: ${err.response?.data?.message || "Nepodařilo se přidat směnu."}`,
			);
		}
	};

	const executeAction = async () => {
		// 1. Ošetření neuložených změn (tlačítko Zpět)
		if (modalConfig.type === "UNSAVED_CHANGES") {
			setIsDirty(false);
			router.push("/schedule");
			return;
		}

		try {
			let url = "";
			let method = modalConfig.method;

			// 2. Dynamické sestavení URL podle typu akce
			if (modalConfig.endpoint.startsWith("shifts/")) {
				// Případ: Smazání směny
				url = `http://localhost:3001/${modalConfig.endpoint}`;
			} else {
				// Případ: Akce nad rozvrhem (generate, publish-for-preferences, publish-final)
				url = `http://localhost:3001/schedule-groups/${params.id}/${modalConfig.endpoint}`;
			}

			console.log(`Volám API: ${method.toUpperCase()} ${url}`);

			// 3. Samotné volání axiosu
			if (method === "delete") {
				await axios.delete(url, { withCredentials: true });
			} else if (method === "post") {
				await axios.post(url, {}, { withCredentials: true });
			} else {
				await axios.patch(url, {}, { withCredentials: true });
			}

			// 4. Úspěch -> zavřít modál a obnovit data
			setModalConfig({ ...modalConfig, isOpen: false });
			fetchData();
		} catch (err: any) {
			console.error(
				"Chyba při vykonávání akce:",
				err.response?.data || err.message,
			);
			alert(
				`Akce se nezdařila: ${err.response?.data?.message || "Server vrátil chybu."}`,
			);
		}
	};

	const openConfirmModal = (
		title: string,
		endpoint: string,
		method: "post" | "patch" | "delete" = "patch",
	) => {
		setModalConfig({
			isOpen: true,
			title,
			endpoint,
			method,
			type: "CONFIRM_ACTION",
		});
	};

	return (
		<div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8 text-slate-900 font-sans">
			<div className="max-w-[1200px] mx-auto mb-4 flex justify-between items-center">
				<button
					onClick={handleBackClick}
					className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 hover:text-indigo-600 transition-colors group">
					<span className="text-lg group-hover:-translate-x-1 transition-transform">
						←
					</span>{" "}
					Zpět
				</button>
				{isDirty && role === "EMPLOYEE" && (
					<button
						onClick={savePreferences}
						className="bg-indigo-600 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase shadow-lg animate-bounce">
						Uložit změny
					</button>
				)}
			</div>

			<div className="max-w-[1200px] mx-auto mb-10 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
				<h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">
					{data?.name}
				</h1>
				{role === "ADMIN" && (
					<div className="flex gap-2">
						{data?.status === "DRAFT" && (
							<button
								onClick={() =>
									openConfirmModal(
										"Chcete spustit sběr preferencí?",
										"publish-for-preferences",
										"patch",
									)
								}
								className="px-4 py-2 border border-slate-200 rounded-xl text-[10px] font-black uppercase hover:bg-slate-50 transition">
								Otevřít preference
							</button>
						)}
						{data?.status === "OPEN" && (
							<button
								onClick={() =>
									openConfirmModal(
										"Spustit automatické generování?",
										"generate",
										"post",
									)
								}
								className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition">
								Spustit algoritmus
							</button>
						)}
						{data?.status === "OPEN" && (
							<button
								onClick={() =>
									openConfirmModal(
										"Opravdu chcete zveřejnit finální rozvrh?",
										"publish-final",
										"patch",
									)
								}
								className="px-4 py-2 bg-green-600 text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-green-100 hover:bg-green-700 transition">
								Zveřejnit
							</button>
						)}
					</div>
				)}
			</div>

			<div className="max-w-[1200px] mx-auto space-y-4">
				{data?.calendarDays.map((day) => {
					const dayShifts = data.shifts.filter((s) =>
						s.startDatetime.startsWith(day),
					);

					// Seskupení pro zaměstnance
					const uniqueShifts =
						role === "EMPLOYEE" && data.status === "OPEN"
							? dayShifts.reduce((acc: Shift[], curr) => {
									if (
										!acc.find((s) => s.shiftType.name === curr.shiftType.name)
									)
										acc.push(curr);
									return acc;
								}, [])
							: dayShifts;

					return (
						<div
							key={day}
							className="flex flex-col md:flex-row bg-white border border-slate-100 rounded-[1.5rem] overflow-hidden shadow-sm">
							<div className="w-full md:w-40 bg-slate-50 p-5 flex md:flex-col justify-between items-center border-b md:border-b-0 md:border-r border-slate-100">
								<span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">
									{new Date(day).toLocaleDateString("cs-CZ", {
										weekday: "short",
									})}
								</span>
								<span className="text-2xl font-black text-slate-800">
									{new Date(day).toLocaleDateString("cs-CZ", {
										day: "numeric",
										month: "numeric",
									})}
								</span>
							</div>

							<div className="flex-1 p-5 flex flex-wrap gap-3">
								{uniqueShifts.map((shift) => (
									<div
										key={shift.id}
										className="min-w-[240px] bg-white border border-slate-200 p-4 rounded-2xl flex flex-col gap-3 shadow-sm">
										<div className="text-[11px] font-black text-slate-800 uppercase">
											{shift.shiftType.name}
										</div>
										{role === "EMPLOYEE" && data.status === "OPEN" && (
											<div className="grid grid-cols-3 gap-1 bg-slate-50 p-1 rounded-xl border border-slate-100">
												{["PREFER", "AVAILABLE", "CANNOT"].map((level) => (
													<button
														key={level}
														onClick={() =>
															handlePreferenceChange(
																shift.shiftType.id,
																day,
																level,
															)
														}
														className={`py-2 text-[8px] font-black rounded-lg transition-all ${
															(preferences[`${day}_${shift.shiftType.id}`] ||
																"AVAILABLE") === level
																? level === "PREFER"
																	? "bg-indigo-600 text-white"
																	: level === "CANNOT"
																		? "bg-red-500 text-white"
																		: "bg-green-500 text-white"
																: "text-slate-300"
														}`}>
														{level === "PREFER"
															? "CHCI"
															: level === "CANNOT"
																? "NE"
																: "MŮŽU"}
													</button>
												))}
											</div>
										)}
										{(role === "ADMIN" || data.status === "PUBLISHED") && (
											<div className="text-[10px] font-bold text-slate-500">
												{shift.assignedUser?.email || "Volno"}
											</div>
										)}
										<div className="flex justify-between items-center">
											<span className="text-[11px] font-black text-slate-800 uppercase">
												{shift.shiftType.name}
											</span>
											<div className="flex gap-2">
												{role === "ADMIN" && (
													<>
														{/* Tlačítko pro detailní editaci */}
														<button
															onClick={() =>
																setEditModal({ isOpen: true, shift })
															}
															className="text-slate-400 hover:text-indigo-600 transition-colors">
															✎
														</button>
														<button
															onClick={() =>
																openConfirmModal(
																	"Smazat?",
																	`shifts/${shift.id}`,
																	"delete",
																)
															}
															className="text-red-300 hover:text-red-500">
															✕
														</button>
													</>
												)}
											</div>
										</div>
									</div>
								))}
								{role === "ADMIN" && data.status === "DRAFT" && (
									<button
										onClick={() => addShiftAdmin(day)}
										className="h-[92px] w-14 border-2 border-dashed border-slate-200 rounded-2xl text-slate-300 hover:border-indigo-400 transition-all text-2xl font-light">
										+
									</button>
								)}
							</div>
						</div>
					);
				})}
			</div>

			{/* MODÁL */}
			{modalConfig.isOpen && (
				<div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
					<div className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl text-center">
						<h2 className="text-xl font-black text-slate-800 mb-8 uppercase tracking-tight">
							{modalConfig.title}
						</h2>
						<div className="flex gap-3">
							<button
								onClick={() => {
									setIsDirty(false);
									router.push("/schedule");
								}}
								className="flex-1 py-3 text-xs font-black text-slate-400 uppercase tracking-widest">
								{modalConfig.type === "UNSAVED_CHANGES" ? "Zahodit" : "Zrušit"}
							</button>
							<button
								onClick={executeAction}
								className="flex-1 py-3 bg-indigo-600 text-white text-xs font-black rounded-xl uppercase tracking-widest shadow-lg">
								{modalConfig.type === "UNSAVED_CHANGES" ? "Uložit" : "Potvrdit"}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* EDIT shift MODAL */}
			{editModal.isOpen && editModal.shift && (
				<div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[130] p-4">
					<div className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl">
						<h2 className="text-xl font-black mb-6 uppercase tracking-tight text-slate-800">
							Upravit směnu
						</h2>

						<div className="space-y-4">
							{/* VÝBĚR ZAMĚSTNANCE */}
							<div>
								<label className="text-[10px] font-black uppercase text-slate-400">
									Zaměstnanec
								</label>
								<select
									key={editModal.shift.id} // Vynutí reset hodnoty při otevření jiné směny
									defaultValue={editModal.shift.assignedUser?.id || ""}
									onChange={(e) => {
										// Okamžitě přiřadíme člověka po změně v selectu
										handleManualAssign(editModal.shift!.id, e.target.value);
									}}
									className="w-full mt-1 p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500">
									<option value="">-- Nepřiřazeno --</option>
									{users.map((u) => (
										<option key={u.id} value={u.id}>
											{u.fullName || u.email}{" "}
											{/* Zobrazujeme jméno, pokud je */}
										</option>
									))}
								</select>
							</div>

							{/* ČASOVÉ INPUTY */}
							<div className="grid grid-cols-2 gap-4">
								<div>
									<label className="text-[10px] font-black uppercase text-slate-400">
										Začátek
									</label>
									<input
										type="time"
										id="edit-start-time"
										defaultValue={new Date(
											editModal.shift.startDatetime,
										).toLocaleTimeString("cs-CZ", {
											hour: "2-digit",
											minute: "2-digit",
										})}
										className="w-full mt-1 p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold"
									/>
								</div>
								<div>
									<label className="text-[10px] font-black uppercase text-slate-400">
										Konec
									</label>
									<input
										type="time"
										id="edit-end-time"
										defaultValue={new Date(
											editModal.shift.endDatetime,
										).toLocaleTimeString("cs-CZ", {
											hour: "2-digit",
											minute: "2-digit",
										})}
										className="w-full mt-1 p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold"
									/>
								</div>
							</div>

							{/* TLAČÍTKA */}
							<div className="flex gap-2 pt-6">
								<button
									onClick={() => setEditModal({ isOpen: false, shift: null })}
									className="flex-1 py-3 text-xs font-black uppercase text-slate-400">
									Zavřít
								</button>
								<button
									onClick={() => {
										// Tady vytáhneme hodnoty z časových inputů
										const startTime = (
											document.getElementById(
												"edit-start-time",
											) as HTMLInputElement
										).value;
										const endTime = (
											document.getElementById(
												"edit-end-time",
											) as HTMLInputElement
										).value;

										// Voláme funkci pro uložení celého objektu (včetně času)
										handleUpdateShift(editModal.shift!.id, {
											startTime,
											endTime,
										});
									}}
									className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase shadow-lg hover:bg-indigo-700 transition-all">
									Uložit časy
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
