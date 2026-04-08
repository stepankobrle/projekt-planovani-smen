"use client";

import { AlertTriangle } from "lucide-react";
import type { ModalState } from "./types";

interface ShiftModalProps {
	modal: ModalState;
	setModal: React.Dispatch<React.SetStateAction<ModalState>>;
	showPastConfirm: boolean;
	setShowPastConfirm: (v: boolean) => void;
	positions: { id: number; name: string }[];
	shiftTypes: { id: number; name: string; colorCode: string }[];
	users: any[];
	onSaveClick: () => void;
	onDeleteShift: () => void;
	onShiftSubmit: () => void;
	onClose: () => void;
}

export function ShiftModal({
	modal,
	setModal,
	showPastConfirm,
	setShowPastConfirm,
	positions,
	shiftTypes,
	users,
	onSaveClick,
	onDeleteShift,
	onShiftSubmit,
	onClose,
}: ShiftModalProps) {
	if (!modal.isOpen) return null;

	const matching = users.filter((u) => u.jobPositionId === modal.jobPositionId);
	const others = users.filter((u) => u.jobPositionId !== modal.jobPositionId);

	const renderUserOption = (u: any) => {
		const name = u.fullName ?? u.email;
		const contractLabel = u.employmentContract?.label;
		return (
			<option key={u.id} value={u.id}>
				{contractLabel ? `${name} — ${contractLabel}` : name}
			</option>
		);
	};

	return (
		<div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
			<div className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl">
				<div className="flex justify-between items-center mb-6">
					<h2 className="text-xl font-black uppercase text-slate-800 tracking-tight">
						{modal.editId ? "Upravit směnu" : "Přidat směnu"}
					</h2>
					{modal.editId && (
						<button
							onClick={onDeleteShift}
							className="text-[10px] font-black uppercase text-red-500 hover:text-red-700 transition-colors underline decoration-2 underline-offset-4">
							Smazat směnu
						</button>
					)}
				</div>

				<div className="space-y-4">
					<div>
						<label className="text-[10px] font-black uppercase text-slate-400">Pozice</label>
						<select
							className="w-full mt-1 p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
							value={modal.jobPositionId}
							onChange={(e) => setModal({ ...modal, jobPositionId: Number(e.target.value) })}>
							{positions.map((p) => (
								<option key={p.id} value={p.id}>{p.name}</option>
							))}
						</select>
					</div>

					<div>
						<label className="text-[10px] font-black uppercase text-slate-400">Typ směny</label>
						<select
							className="w-full mt-1 p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
							value={modal.shiftTypeId}
							onChange={(e) =>
								setModal({ ...modal, shiftTypeId: e.target.value, showCustomTimes: e.target.value === "vlastni" })
							}>
							<option value="">-- Vyberte --</option>
							{shiftTypes.map((t) => (
								<option key={t.id} value={t.id}>{t.name}</option>
							))}
							<option value="vlastni">VLASTNÍ ČAS</option>
						</select>
					</div>

					{modal.showCustomTimes && (
						<div className="grid grid-cols-2 gap-4 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
							<input
								type="time"
								value={modal.startDatetime}
								onChange={(e) => setModal({ ...modal, startDatetime: e.target.value })}
								className="p-2 rounded-lg border border-slate-200 font-bold text-center outline-none focus:ring-2 focus:ring-indigo-500"
							/>
							<input
								type="time"
								value={modal.endDatetime}
								onChange={(e) => setModal({ ...modal, endDatetime: e.target.value })}
								className="p-2 rounded-lg border border-slate-200 font-bold text-center outline-none focus:ring-2 focus:ring-indigo-500"
							/>
						</div>
					)}

					<div>
						<label className="text-[10px] font-black uppercase text-slate-400">Zaměstnanec (nepovinné)</label>
						<select
							className="w-full mt-1 p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
							value={modal.assignedUserId}
							onChange={(e) => setModal({ ...modal, assignedUserId: e.target.value })}>
							<option value="">-- Nechat volné --</option>
							{matching.length > 0 && (
								<optgroup label="— Odpovídající pozice —">
									{matching.map(renderUserOption)}
								</optgroup>
							)}
							{others.length > 0 && (
								<optgroup label="— Ostatní zaměstnanci —">
									{others.map(renderUserOption)}
								</optgroup>
							)}
						</select>
						{users.length === 0 && (
							<p className="text-[10px] text-amber-600 mt-1 font-semibold">
								Pro tuto lokaci nejsou evidováni žádní zaměstnanci.
							</p>
						)}
					</div>

					{showPastConfirm ? (
						<div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-3">
							<div className="flex items-start gap-2 text-amber-700">
								<AlertTriangle size={18} className="shrink-0 mt-0.5" />
								<p className="text-xs font-bold">
									Tato směna má datum v minulosti. Chcete ji přesto uložit?
								</p>
							</div>
							<div className="flex gap-2">
								<button
									onClick={() => setShowPastConfirm(false)}
									className="flex-1 py-2.5 font-black uppercase text-slate-500 text-xs hover:bg-slate-100 rounded-xl transition-colors">
									Zpět
								</button>
								<button
									onClick={onShiftSubmit}
									className="flex-1 py-2.5 bg-amber-600 text-white rounded-xl font-black uppercase text-xs shadow-lg hover:bg-amber-700 transition-all">
									Přesto uložit
								</button>
							</div>
						</div>
					) : (
						<div className="flex gap-2 pt-4">
							<button
								onClick={onClose}
								className="flex-1 py-3 font-black uppercase text-slate-400 text-xs hover:text-slate-600 transition-colors">
								Zavřít
							</button>
							<button
								onClick={onSaveClick}
								className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-black uppercase text-xs shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">
								{modal.editId ? "Uložit změny" : "Vytvořit směnu"}
							</button>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
