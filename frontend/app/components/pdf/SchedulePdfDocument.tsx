import React from "react";
import {
	Page,
	Text,
	View,
	Document,
	StyleSheet,
	Font,
} from "@react-pdf/renderer";

// Registrace fontu pro češtinu
Font.register({
	family: "Roboto",
	src: "https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-light-webfont.ttf",
});

const styles = StyleSheet.create({
	page: {
		padding: 30,
		fontFamily: "Roboto",
		fontSize: 12,
	},
	header: {
		marginBottom: 20,
		textAlign: "center",
		fontSize: 18,
		fontWeight: "bold",
	},
	table: {
		display: "flex",
		width: "auto",
		borderStyle: "solid",
		borderWidth: 1,
		borderRightWidth: 0,
		borderBottomWidth: 0,
	},
	tableRow: {
		margin: "auto",
		flexDirection: "row",
	},
	tableCol: {
		width: "25%", // 4 sloupce = 25% šířka pro každý
		borderStyle: "solid",
		borderWidth: 1,
		borderLeftWidth: 0,
		borderTopWidth: 0,
	},
	tableCell: {
		margin: 5,
		fontSize: 10,
	},
	headerCell: {
		margin: 5,
		fontSize: 10,
		fontWeight: "bold",
		backgroundColor: "#eee",
	},
});

// Definice dat, která očekáváme (musí sedět s tím, co posíláš z Admin stránky)
export interface ShiftData {
	id: string;
	startDatetime: string;
	endDatetime: string;
	// Používáme ? (optional), aby PDF nespadlo, když data chybí
	jobPosition?: { name: string };
	location?: { name: string };
	assignedUser?: { fullName: string } | null;
}

interface PdfProps {
	shifts: ShiftData[];
	month: string;
	year: number;
}

export const SchedulePdfDocument = ({ shifts, month, year }: PdfProps) => (
	<Document>
		<Page size="A4" style={styles.page}>
			<Text style={styles.header}>
				Rozpis směn - {month} {year}
			</Text>

			<View style={styles.table}>
				{/* --- HLAVIČKA TABULKY --- */}
				<View style={styles.tableRow}>
					<View style={styles.tableCol}>
						<Text style={styles.headerCell}>Datum a Čas</Text>
					</View>
					<View style={styles.tableCol}>
						<Text style={styles.headerCell}>Pozice</Text>
					</View>
					<View style={styles.tableCol}>
						<Text style={styles.headerCell}>Lokace</Text>
					</View>
					<View style={styles.tableCol}>
						<Text style={styles.headerCell}>Zaměstnanec</Text>
					</View>
				</View>

				{/* --- DATA (ŘÁDKY) --- */}
				{shifts.map((shift) => {
					const start = new Date(shift.startDatetime);
					const end = new Date(shift.endDatetime);

					const dateStr = start.toLocaleDateString("cs-CZ");
					const timeStr = `${start.toLocaleTimeString([], {
						hour: "2-digit",
						minute: "2-digit",
					})} - ${end.toLocaleTimeString([], {
						hour: "2-digit",
						minute: "2-digit",
					})}`;

					return (
						<View style={styles.tableRow} key={shift.id}>
							{/* 1. Sloupec: Datum a Čas */}
							<View style={styles.tableCol}>
								<Text style={styles.tableCell}>
									{dateStr}
									{"\n"}
									{timeStr}
								</Text>
							</View>

							{/* 2. Sloupec: Pozice */}
							<View style={styles.tableCol}>
								<Text style={styles.tableCell}>
									{/* Bezpečný přístup ?.name */}
									{shift.jobPosition?.name || "Neznámá pozice"}
								</Text>
							</View>

							{/* 3. Sloupec: Lokace */}
							<View style={styles.tableCol}>
								<Text style={styles.tableCell}>
									{/* Pokud nemáš v datech objekt location, vypíše se pomlčka */}
									{shift.location?.name || "-"}
								</Text>
							</View>

							{/* 4. Sloupec: Zaměstnanec */}
							<View style={styles.tableCol}>
								<Text style={styles.tableCell}>
									{shift.assignedUser?.fullName || "Neobsazeno"}
								</Text>
							</View>
						</View>
					);
				})}
			</View>
		</Page>
	</Document>
);
