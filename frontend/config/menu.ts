import { LayoutDashboard, Users, CalendarDays, Settings } from "lucide-react";

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
			{ title: "Pobočky", href: "/admin/locations", roles: [UserRole.ADMIN] },
			{
				title: "Pracovní pozice",
				href: "/admin/positions",
				roles: [UserRole.ADMIN, UserRole.MANAGER],
			},
		],
	},
];
