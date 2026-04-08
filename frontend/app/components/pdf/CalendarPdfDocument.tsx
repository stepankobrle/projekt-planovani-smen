import React from "react";
import {
	Page,
	Text,
	View,
	Document,
	StyleSheet,
	Font,
} from "@react-pdf/renderer";

// 1. REGISTRACE FONTU (Čeština)
Font.register({
	family: "Roboto",
	src: "https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-light-webfont.ttf",
	fonts: [
		{
			src: "https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-light-webfont.ttf",
			fontWeight: 300,
		},
		{
			src: "https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-medium-webfont.ttf",
			fontWeight: 500,
		},
		{
			src: "https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf",
			fontWeight: 700,
		},
	],
});

// Paleta barev
const C = {
	primary: "#4338ca", // indigo-700
	primaryDark: "#312e81", // indigo-900
	primaryLight: "#e0e7ff", // indigo-100
	accent: "#6366f1", // indigo-500
	weekend: "#f1f5f9", // slate-100
	weekendHeader: "#cbd5e1", // slate-300
	border: "#e2e8f0", // slate-200
	borderStrong: "#94a3b8", // slate-400
	text: "#0f172a", // slate-900
	textMuted: "#64748b", // slate-500
	rowAlt: "#f8fafc", // slate-50
	unassigned: "#fef2f2", // red-50
	unassignedAccent: "#ef4444",
	white: "#ffffff",
};

// 2. STYLY
const styles = StyleSheet.create({
	page: {
		padding: 0,
		fontFamily: "Roboto",
		fontSize: 8,
		backgroundColor: C.white,
		color: C.text,
	},

	// === ZÁHLAVÍ ===
	pageHeader: {
		backgroundColor: C.primaryDark,
		paddingHorizontal: 24,
		paddingVertical: 14,
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
	},
	pageHeaderLeft: {
		flexDirection: "column",
	},
	pageHeaderTitle: {
		fontSize: 18,
		fontWeight: 700,
		color: C.white,
		letterSpacing: 1.5,
	},
	pageHeaderSubtitle: {
		fontSize: 9,
		fontWeight: 300,
		color: "#a5b4fc", // indigo-300
		marginTop: 2,
	},
	pageHeaderRight: {
		flexDirection: "column",
		alignItems: "flex-end",
	},
	pageHeaderMonth: {
		fontSize: 22,
		fontWeight: 700,
		color: C.white,
	},
	pageHeaderYear: {
		fontSize: 10,
		fontWeight: 300,
		color: "#a5b4fc",
		marginTop: 1,
	},

	// Barevný pruh pod záhlavím
	accentBar: {
		height: 4,
		backgroundColor: C.accent,
	},

	// === OBSAH ===
	content: {
		paddingHorizontal: 16,
		paddingTop: 12,
		paddingBottom: 16,
		flexGrow: 1,
	},

	// === TABULKA ===
	table: {
		display: "flex",
		flexDirection: "column",
		borderRadius: 4,
		overflow: "hidden",
		border: `1px solid ${C.borderStrong}`,
	},

	// === ŘÁDKY ===
	row: {
		flexDirection: "row",
		alignItems: "stretch",
		minHeight: 22,
	},
	rowEven: {
		backgroundColor: C.white,
	},
	rowOdd: {
		backgroundColor: C.rowAlt,
	},

	// === SLOUPEC JMÉNO ===
	nameCol: {
		width: 108,
		borderRight: `1px solid ${C.borderStrong}`,
		paddingHorizontal: 6,
		paddingVertical: 3,
		justifyContent: "center",
	},
	nameColHeader: {
		backgroundColor: C.primaryDark,
	},
	nameColHeaderText: {
		fontSize: 7,
		fontWeight: 700,
		color: C.white,
		textTransform: "uppercase",
		letterSpacing: 0.5,
	},
	nameText: {
		fontSize: 7,
		fontWeight: 500,
		color: C.text,
	},

	// === SLOUPEC DNE ===
	dayCol: {
		flexGrow: 1,
		flexBasis: 0,
		borderRight: `1px solid ${C.border}`,
		justifyContent: "center",
		alignItems: "center",
		paddingVertical: 2,
		paddingHorizontal: 1,
	},
	dayColWeekend: {
		backgroundColor: C.weekend,
	},

	// Hlavička dne
	headerDayCol: {
		flexGrow: 1,
		flexBasis: 0,
		borderRight: `1px solid rgba(255,255,255,0.15)`,
		paddingVertical: 3,
		backgroundColor: C.primary,
		alignItems: "center",
		justifyContent: "center",
	},
	headerDayColWeekend: {
		backgroundColor: "#5b50d6", // mírně jiný indigo pro víkend
	},
	headerDayNumber: {
		fontSize: 7,
		fontWeight: 700,
		color: C.white,
	},
	headerDayName: {
		fontSize: 5,
		fontWeight: 300,
		color: "#c7d2fe", // indigo-200
		marginTop: 1,
	},
	headerDayNameWeekend: {
		color: "#fde68a", // amber-200 – vizuálně odlišit víkend
	},

	// === BLOK SMĚNY ===
	shiftBlock: {
		width: "92%",
		borderRadius: 3,
		paddingVertical: 2,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: C.accent,
	},
	shiftTimeText: {
		color: C.white,
		fontSize: 5,
		fontWeight: 700,
		letterSpacing: 0.3,
	},

	// === ZÁPATÍ ===
	footer: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingHorizontal: 16,
		paddingVertical: 8,
		borderTop: `1px solid ${C.border}`,
	},
	footerText: {
		fontSize: 7,
		color: C.textMuted,
		fontWeight: 300,
	},
	footerBadge: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: C.primaryLight,
		paddingHorizontal: 6,
		paddingVertical: 2,
		borderRadius: 10,
	},
	footerBadgeText: {
		fontSize: 6,
		color: C.primary,
		fontWeight: 500,
	},
});

// 3. INTERFACE
export interface ShiftData {
	id: string;
	startDatetime: string;
	endDatetime: string;
	jobPosition?: { name: string };
	assignedUser?: { id: string; fullName: string } | null;
	shiftType?: { colorCode: string; name: string };
}

interface PdfProps {
	shifts: ShiftData[];
	month: string;
	year: number;
	monthIndex: number; // 1-12
}

// Formátování hodin do "HH" s nulou
function fmtHour(dt: string): string {
	const h = new Date(dt).getHours();
	return String(h).padStart(2, "0");
}

export const CalendarPdfDocument = ({
	shifts,
	month,
	year,
	monthIndex,
}: PdfProps) => {
	// A) ZÍSKÁNÍ SEZNAMU DNÍ
	const daysInMonth = new Date(year, monthIndex, 0).getDate();
	const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

	// B) SESKUPENÍ SMĚN PODLE ZAMĚSTNANCŮ
	const employeesMap = new Map<
		string,
		{ name: string; shifts: ShiftData[]; isUnassigned?: boolean }
	>();
	const unassignedShifts: ShiftData[] = [];

	shifts.forEach((shift) => {
		if (shift.assignedUser) {
			const uid = shift.assignedUser.id;
			if (!employeesMap.has(uid)) {
				employeesMap.set(uid, {
					name: shift.assignedUser.fullName,
					shifts: [],
				});
			}
			employeesMap.get(uid)!.shifts.push(shift);
		} else {
			unassignedShifts.push(shift);
		}
	});

	const sortedEmployees = Array.from(employeesMap.values()).sort((a, b) =>
		a.name.localeCompare(b.name),
	);

	if (unassignedShifts.length > 0) {
		sortedEmployees.push({
			name: "Neobsazeno",
			shifts: unassignedShifts,
			isUnassigned: true,
		});
	}

	const generatedAt = new Date().toLocaleDateString("cs-CZ", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
	});

	return (
		<Document>
			<Page size="A4" orientation="landscape" style={styles.page}>
				{/* === ZÁHLAVÍ STRÁNKY === */}
				<View style={styles.pageHeader}>
					<View style={styles.pageHeaderLeft}>
						<Text style={styles.pageHeaderTitle}>PŘEHLED SMĚN</Text>
						<Text style={styles.pageHeaderSubtitle}>
							Pracovní rozvrh zaměstnanců
						</Text>
					</View>
					<View style={styles.pageHeaderRight}>
						<Text style={styles.pageHeaderMonth}>{month}</Text>
						<Text style={styles.pageHeaderYear}>{year}</Text>
					</View>
				</View>

				{/* Barevný pruh */}
				<View style={styles.accentBar} />

				{/* === OBSAH === */}
				<View style={styles.content}>
					<View style={styles.table}>
						{/* --- HLAVIČKA (DNY) --- */}
						<View style={[styles.row, { minHeight: 28 }]}>
							<View style={[styles.nameCol, styles.nameColHeader]}>
								<Text style={styles.nameColHeaderText}>Zaměstnanec</Text>
							</View>
							{daysArray.map((d) => {
								const date = new Date(year, monthIndex - 1, d);
								const dow = date.getDay();
								const isWeekend = dow === 0 || dow === 6;
								const dayNames = ["Ne", "Po", "Út", "St", "Čt", "Pá", "So"];

								return (
									<View
										key={d}
										style={[
											styles.headerDayCol,
											isWeekend ? styles.headerDayColWeekend : {},
										]}>
										<Text style={styles.headerDayNumber}>{d}</Text>
										<Text
											style={[
												styles.headerDayName,
												isWeekend ? styles.headerDayNameWeekend : {},
											]}>
											{dayNames[dow]}
										</Text>
									</View>
								);
							})}
						</View>

						{/* --- ŘÁDKY ZAMĚSTNANCŮ --- */}
						{sortedEmployees.map((emp, index) => (
							<View
								key={index}
								style={[
									styles.row,
									index % 2 === 0 ? styles.rowEven : styles.rowOdd,
								]}>
								{/* Jméno */}
								<View
									style={[
										styles.nameCol,
										emp.isUnassigned ? { backgroundColor: C.unassigned } : {},
									]}>
									{emp.isUnassigned && (
										<View
											style={{
												width: 3,
												height: "100%",
												backgroundColor: C.unassignedAccent,
												position: "absolute",
												left: 0,
												top: 0,
											}}
										/>
									)}
									<Text
										style={[
											styles.nameText,
											emp.isUnassigned ? { color: C.unassignedAccent } : {},
										]}>
										{emp.name}
									</Text>
								</View>

								{/* Dny */}
								{daysArray.map((d) => {
									const dateStr = `${year}-${String(monthIndex).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
									const dayShift = emp.shifts.find((s: ShiftData) =>
										s.startDatetime.startsWith(dateStr),
									);
									const date = new Date(year, monthIndex - 1, d);
									const isWeekend = date.getDay() === 0 || date.getDay() === 6;

									// Barva bloku: shiftType.colorCode > unassigned červená > výchozí indigo
									const blockColor = emp.isUnassigned
										? C.unassignedAccent
										: (dayShift?.shiftType?.colorCode ?? C.accent);

									return (
										<View
											key={d}
											style={[
												styles.dayCol,
												isWeekend ? styles.dayColWeekend : {},
											]}>
											{dayShift && (
												<View
													style={[
														styles.shiftBlock,
														{ backgroundColor: blockColor },
													]}>
													<Text style={styles.shiftTimeText}>
														{fmtHour(dayShift.startDatetime)}
													</Text>
												</View>
											)}
										</View>
									);
								})}
							</View>
						))}
					</View>
				</View>

				{/* === ZÁPATÍ === */}
				<View style={styles.footer} fixed>
					<Text style={styles.footerText}>
						Vygenerováno: {generatedAt}
						{"  "}·{"  "}
						Číslo v bloku = čas začátku a konce směny (HH–HH)
					</Text>
					<View style={styles.footerBadge}>
						<Text style={styles.footerBadgeText}>ShiftPlanner</Text>
					</View>
				</View>
			</Page>
		</Document>
	);
};
