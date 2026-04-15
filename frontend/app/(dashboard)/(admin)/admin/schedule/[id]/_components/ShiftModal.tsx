"use client";

import { AlertTriangle, X, CalendarPlus, Pencil } from "lucide-react";
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

const label: React.CSSProperties = {
	display: "block",
	fontSize: 10,
	fontWeight: 700,
	letterSpacing: "0.12em",
	textTransform: "uppercase",
	color: "#9ABABA",
	marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
	width: "100%",
	padding: "12px 14px",
	background: "#F0F7F4",
	border: "1px solid #DDF0E8",
	borderRadius: 12,
	fontSize: 13,
	fontWeight: 600,
	color: "#0F2E35",
	outline: "none",
	appearance: "none",
	WebkitAppearance: "none",
	transition: "border-color .15s",
};

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

	const isEdit = !!modal.editId;
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
		<div
			style={{
				position: "fixed",
				inset: 0,
				background: "rgba(15,46,53,.55)",
				backdropFilter: "blur(6px)",
				zIndex: 200,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				padding: 16,
			}}>
			<div
				style={{
					background: "#fff",
					borderRadius: 24,
					padding: "32px 32px 28px",
					maxWidth: 480,
					width: "100%",
					boxShadow: "0 24px 80px rgba(15,46,53,.22), 0 4px 16px rgba(15,46,53,.08)",
					position: "relative",
				}}>

				{/* Zavřít */}
				<button
					onClick={onClose}
					style={{
						position: "absolute",
						top: 20,
						right: 20,
						width: 32,
						height: 32,
						borderRadius: "50%",
						background: "#F0F7F4",
						border: "none",
						cursor: "pointer",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						color: "#9ABABA",
						transition: "all .15s",
					}}>
					<X size={15} />
				</button>

				{/* Hlavička */}
				<div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28 }}>
					<div
						style={{
							width: 48,
							height: 48,
							borderRadius: 14,
							background: "linear-gradient(135deg, #1C4E5A 0%, #2C6975 100%)",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							flexShrink: 0,
							boxShadow: "0 4px 12px rgba(28,78,90,.3)",
						}}>
						{isEdit
							? <Pencil size={20} color="#fff" />
							: <CalendarPlus size={20} color="#fff" />
						}
					</div>
					<div>
						<h2 style={{ fontSize: 18, fontWeight: 800, color: "#0F2E35", lineHeight: 1.2, marginBottom: 2 }}>
							{isEdit ? "Upravit směnu" : "Přidat směnu"}
						</h2>
						<p style={{ fontSize: 12, color: "#9ABABA", fontWeight: 500 }}>
							{isEdit ? `Datum: ${modal.date}` : "Zadejte parametry nové směny."}
						</p>
					</div>
				</div>

				<div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
					{/* Pozice */}
					<div>
						<span style={label}>Pozice</span>
						<select
							style={inputStyle}
							value={modal.jobPositionId}
							onChange={(e) => setModal({ ...modal, jobPositionId: Number(e.target.value) })}>
							{positions.map((p) => (
								<option key={p.id} value={p.id}>{p.name}</option>
							))}
						</select>
					</div>

					{/* Typ směny */}
					<div>
						<span style={label}>Typ směny</span>
						<select
							style={inputStyle}
							value={modal.shiftTypeId}
							onChange={(e) =>
								setModal({ ...modal, shiftTypeId: e.target.value, showCustomTimes: e.target.value === "vlastni" })
							}>
							<option value="">— Vyberte typ —</option>
							{shiftTypes.map((t) => (
								<option key={t.id} value={t.id}>{t.name}</option>
							))}
							<option value="vlastni">Vlastní čas</option>
						</select>
					</div>

					{/* Vlastní časy */}
					{modal.showCustomTimes && (
						<div
							style={{
								background: "#F0F7F4",
								border: "1px solid #DDF0E8",
								borderRadius: 14,
								padding: "16px 16px 12px",
							}}>
							<span style={{ ...label, marginBottom: 10 }}>Vlastní časy</span>
							<div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 8 }}>
								<input
									type="time"
									value={modal.startDatetime}
									onChange={(e) => setModal({ ...modal, startDatetime: e.target.value })}
									style={{ ...inputStyle, background: "#fff", textAlign: "center" }}
								/>
								<span style={{ fontSize: 12, color: "#9ABABA", fontWeight: 700 }}>–</span>
								<input
									type="time"
									value={modal.endDatetime}
									onChange={(e) => setModal({ ...modal, endDatetime: e.target.value })}
									style={{ ...inputStyle, background: "#fff", textAlign: "center" }}
								/>
							</div>
						</div>
					)}

					{/* Zaměstnanec */}
					<div>
						<span style={label}>Zaměstnanec <span style={{ color: "#C5DED9", fontWeight: 500, textTransform: "none", letterSpacing: 0 }}>(nepovinné)</span></span>
						<select
							style={inputStyle}
							value={modal.assignedUserId}
							onChange={(e) => setModal({ ...modal, assignedUserId: e.target.value })}>
							<option value="">— Nechat volné —</option>
							{matching.length > 0 && (
								<optgroup label="Odpovídající pozice">
									{matching.map(renderUserOption)}
								</optgroup>
							)}
							{others.length > 0 && (
								<optgroup label="Ostatní zaměstnanci">
									{others.map(renderUserOption)}
								</optgroup>
							)}
						</select>
						{users.length === 0 && (
							<p style={{ fontSize: 11, color: "#C85A30", fontWeight: 600, marginTop: 6 }}>
								Pro tuto lokaci nejsou evidováni žádní zaměstnanci.
							</p>
						)}
					</div>

					{/* Potvrzení minulého data */}
					{showPastConfirm ? (
						<div
							style={{
								background: "#FFF8F0",
								border: "1px solid #F5D9B8",
								borderRadius: 14,
								padding: 16,
								display: "flex",
								flexDirection: "column",
								gap: 12,
							}}>
							<div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
								<AlertTriangle size={16} color="#C85A30" style={{ flexShrink: 0, marginTop: 1 }} />
								<p style={{ fontSize: 12, fontWeight: 600, color: "#C85A30", lineHeight: 1.5 }}>
									Tato směna má datum v minulosti. Chcete ji přesto uložit?
								</p>
							</div>
							<div style={{ display: "flex", gap: 8 }}>
								<button
									onClick={() => setShowPastConfirm(false)}
									style={{
										flex: 1,
										padding: "10px 0",
										borderRadius: 10,
										background: "#F0F7F4",
										border: "1px solid #DDF0E8",
										fontSize: 11,
										fontWeight: 800,
										textTransform: "uppercase",
										color: "#9ABABA",
										cursor: "pointer",
									}}>
									Zpět
								</button>
								<button
									onClick={onShiftSubmit}
									style={{
										flex: 1,
										padding: "10px 0",
										borderRadius: 10,
										background: "#C85A30",
										border: "none",
										fontSize: 11,
										fontWeight: 800,
										textTransform: "uppercase",
										color: "#fff",
										cursor: "pointer",
										boxShadow: "0 4px 12px rgba(200,90,48,.3)",
									}}>
									Přesto uložit
								</button>
							</div>
						</div>
					) : (
						<div style={{ display: "flex", gap: 10, paddingTop: 8 }}>
							{isEdit && (
								<button
									onClick={onDeleteShift}
									style={{
										padding: "13px 16px",
										borderRadius: 12,
										background: "#FFF0F0",
										border: "1px solid #FCCACA",
										fontSize: 11,
										fontWeight: 800,
										textTransform: "uppercase",
										color: "#C85A30",
										cursor: "pointer",
										transition: "all .15s",
									}}>
									Smazat
								</button>
							)}
							<button
								onClick={onClose}
								style={{
									flex: 1,
									padding: "13px 0",
									borderRadius: 12,
									background: "#F0F7F4",
									border: "1px solid #DDF0E8",
									fontSize: 11,
									fontWeight: 800,
									textTransform: "uppercase",
									color: "#9ABABA",
									cursor: "pointer",
									transition: "all .15s",
								}}>
								Zrušit
							</button>
							<button
								onClick={onSaveClick}
								style={{
									flex: 2,
									padding: "13px 0",
									borderRadius: 12,
									background: "linear-gradient(135deg, #1C4E5A 0%, #2C6975 100%)",
									border: "none",
									fontSize: 11,
									fontWeight: 800,
									textTransform: "uppercase",
									color: "#fff",
									cursor: "pointer",
									boxShadow: "0 4px 16px rgba(28,78,90,.3)",
									transition: "all .15s",
								}}>
								{isEdit ? "Uložit změny" : "Vytvořit směnu"}
							</button>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
