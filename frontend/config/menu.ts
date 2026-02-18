import { LayoutDashboard, Users, CalendarDays, Settings } from "lucide-react";
import { title } from "process";

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
		href: "/dashboard",
		icon: LayoutDashboard,
		roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE],
	},
	{
		title: "Správa",
		icon: Users,
		roles: [UserRole.ADMIN, UserRole.MANAGER],
		items: [
			{
				title: "Zaměstnanci",
				href: "/employees",
				roles: [UserRole.ADMIN],
			},
			{
				title: "Pracovní pozice",
				href: "/job-positions",
				roles: [UserRole.ADMIN, UserRole.MANAGER],
			},
		],
	},
	{
		title: "Rozvrhy",
		href: "/schedule/1",
		icon: CalendarDays,
		roles: [UserRole.ADMIN, UserRole.MANAGER],
	},
	{
		title: "Moje směny",
		href: "/employee/schedule",
		icon: CalendarDays,
		roles: [UserRole.EMPLOYEE],
	},
	{
		title: "Moje preference",
		href: "/employee/preferences",
		icon: CalendarDays,
		roles: [UserRole.EMPLOYEE, UserRole.PART_TIMER],
	},
	{
		title: "Administrace",
		icon: Settings,
		roles: [UserRole.ADMIN],
		items: [
			{
				title: "Směny",
				href: "/shift-types",
				roles: [UserRole.ADMIN],
			},
			{
				title: "Nastavení směn",
				href: "/settings",
				roles: [UserRole.ADMIN],
			},
		],
	},
];
