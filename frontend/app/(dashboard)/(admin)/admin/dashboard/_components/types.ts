export interface ShiftUser {
	id: string;
	fullName: string | null;
	email: string;
}

export interface Shift {
	id: string;
	startDatetime: string;
	endDatetime: string;
	status: string;
	assignedUserId: string | null;
	assignedUser: ShiftUser | null;
	shiftType: { name: string; colorCode: string } | null;
	jobPosition: { name: string } | null;
}

export interface ScheduleGroup {
	id: string;
	status: string;
	shifts: Shift[];
}

export interface VacationRequest {
	id: string;
	startDate: string;
	endDate: string;
	status: "PENDING" | "APPROVED" | "REJECTED";
	user: { fullName: string | null; email: string };
}

export interface Notification {
	id: string;
	content: string;
	type: string;
	isRead: boolean;
	createdAt: string;
}
