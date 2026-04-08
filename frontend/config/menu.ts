import {
	LayoutDashboard,
	Users,
	CalendarDays,
	Settings,
	Plane,
} from "lucide-react";

export enum UserRole {
	ADMIN = "ADMIN",
	MANAGER = "MANAGER",
	EMPLOYEE = "EMPLOYEE",
	PART_TIMER = "PART_TIMER",
}

export interface MenuItem {
	title: string;
	href?: string;
	icon: any;
	roles: UserRole[];
	items?: { title: string; href: string; roles: UserRole[] }[];
}

export const menuItems: MenuItem[] = [
	{
		title: "Dashboard",
		href: "/admin/dashboard",
		icon: LayoutDashboard,
		roles: [UserRole.ADMIN, UserRole.MANAGER],
	},
	{
		title: "Dashboard",
		href: "/dashboard",
		icon: LayoutDashboard,
		roles: [UserRole.EMPLOYEE, UserRole.PART_TIMER],
	},
	{
		title: "Správa",
		icon: Users,
		roles: [UserRole.ADMIN, UserRole.MANAGER],
		items: [
			{
				title: "Zaměstnanci",
				href: "/admin/employees",
				roles: [UserRole.ADMIN],
			},
			{
				title: "Pracovní pozice",
				href: "/admin/job-positions",
				roles: [UserRole.ADMIN, UserRole.MANAGER],
			},
			{
				title: "Směny",
				href: "/admin/shift-types",
				roles: [UserRole.ADMIN],
			},
		],
	},
	{
		title: "Rozvrhy",
		href: "/admin/schedule/1",
		icon: CalendarDays,
		roles: [UserRole.ADMIN, UserRole.MANAGER],
	},
	{
		title: "Dovolené",
		href: "/admin/vacations",
		icon: Plane,
		roles: [UserRole.ADMIN, UserRole.MANAGER],
	},
	{
		title: "Moje směny",
		href: "/schedule",
		icon: CalendarDays,
		roles: [UserRole.EMPLOYEE],
	},
	{
		title: "Moje preference",
		href: "/preferences",
		icon: CalendarDays,
		roles: [UserRole.EMPLOYEE, UserRole.PART_TIMER],
	},
	{
		title: "Dovolená",
		href: "/vacations",
		icon: Plane,
		roles: [UserRole.EMPLOYEE, UserRole.PART_TIMER],
	},
];
