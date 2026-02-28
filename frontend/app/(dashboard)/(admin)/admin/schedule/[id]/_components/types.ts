export interface Shift {
	id: string;
	startDatetime: string;
	endDatetime: string;
	assignedUser?: { id: string; email: string; fullName: string } | null;
	shiftType: { id: number; name: string; colorCode: string };
	jobPosition?: { name: string };
	jobPositionId: number;
	location?: { name: string };
	locationId: number;
	isMarketplace: boolean;
}

export interface ScheduleGroup {
	id: string;
	year: number;
	month: number;
	status: ScheduleStatus;
	calendarDays: string[];
	shifts: Shift[];
}

export type ScheduleStatus = "DRAFT" | "PREFERENCES" | "GENERATED" | "PUBLISHED";

export interface ModalState {
	isOpen: boolean;
	editId: string | null;
	date: string;
	shiftTypeId: string | number;
	jobPositionId: number;
	assignedUserId: string;
	startDatetime: string;
	endDatetime: string;
	showCustomTimes: boolean;
}

export interface PositionColor {
	row: string;
	badge: string;
	text: string;
	border: string;
}
