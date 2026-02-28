"use client";

import type { ScheduleStatus } from "./types";

interface StatusPanelProps {
	status: ScheduleStatus;
	generating: boolean;
	onChangeStatus: (status: ScheduleStatus) => void;
	onAutoGenerate: () => void;
}

const STATUS_COLORS: Record<ScheduleStatus, string> = {
	DRAFT: "bg-slate-100 text-slate-500",
	PREFERENCES: "bg-indigo-100 text-indigo-600",
	GENERATED: "bg-blue-100 text-blue-600",
	PUBLISHED: "bg-green-100 text-green-600",
};

function AutoGenerateButton({ generating, onClick }: { generating: boolean; onClick: () => void }) {
	return (
		<button
			onClick={onClick}
			disabled={generating}
			className={`px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-[10px] font-black uppercase shadow-lg hover:shadow-xl transition-all flex items-center gap-2 ${
				generating ? "opacity-70 cursor-not-allowed" : "hover:scale-105"
			}`}>
			{generating ? (
				<>
					<svg className="animate-spin h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
						<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
						<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
					</svg>
					Generuji...
				</>
			) : (
				<>🤖 Automaticky obsadit</>
			)}
		</button>
	);
}

export function StatusPanel({ status, generating, onChangeStatus, onAutoGenerate }: StatusPanelProps) {
	return (
		<div className="flex flex-col items-center gap-4 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
			<div className="flex items-center gap-2">
				<span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Stav rozvrhu:</span>
				<span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${STATUS_COLORS[status]}`}>
					{status}
				</span>
			</div>

			{status === "DRAFT" && (
				<button
					onClick={() => onChangeStatus("PREFERENCES")}
					className="px-8 py-3 bg-indigo-600 text-white rounded-xl text-[11px] font-black uppercase shadow-lg hover:bg-indigo-700 transition-all transform hover:scale-105">
					🔓 Otevřít pro preference
				</button>
			)}

			{status === "PREFERENCES" && (
				<div className="flex flex-wrap justify-center gap-2">
					<button
						onClick={() => onChangeStatus("DRAFT")}
						className="px-6 py-3 border border-slate-200 text-slate-400 rounded-xl text-[10px] font-black uppercase hover:bg-slate-50 transition-all">
						← Zpět na úpravy
					</button>
					<AutoGenerateButton generating={generating} onClick={onAutoGenerate} />
					<button
						onClick={() => onChangeStatus("GENERATED")}
						className="px-6 py-3 bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase hover:bg-slate-700 transition-all shadow-lg">
						🔒 Uzavřít a Publikovat
					</button>
				</div>
			)}

			{status === "GENERATED" && (
				<div className="flex flex-wrap justify-center gap-2">
					<button
						onClick={onAutoGenerate}
						disabled={generating}
						className="px-6 py-3 border border-blue-200 text-blue-600 rounded-xl text-[10px] font-black uppercase hover:bg-blue-50 transition-all">
						{generating ? "Generuji..." : "🤖 Znovu přegenerovat"}
					</button>
					<button
						onClick={() => onChangeStatus("PUBLISHED")}
						className="px-6 py-3 bg-green-600 text-white rounded-xl text-[10px] font-black uppercase hover:bg-green-700 transition-all shadow-lg">
						✓ Publikovat zaměstnancům
					</button>
				</div>
			)}
		</div>
	);
}
