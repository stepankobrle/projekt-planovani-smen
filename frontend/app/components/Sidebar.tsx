"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
	ChevronDown,
	ChevronRight,
	Menu,
	X,
	PanelLeftClose,
	PanelLeftOpen,
	LogOut,
} from "lucide-react";
import { menuItems, UserRole } from "@/config/menu";
import { cn } from "@/lib/utils";
import Cookies from "js-cookie";

interface SidebarProps {
	userRole: UserRole;
}

export default function Sidebar({ userRole }: SidebarProps) {
	const pathname = usePathname();
	const router = useRouter();
	const [openMenus, setOpenMenus] = useState<string[]>([]);
	const [isCollapsed, setIsCollapsed] = useState(false);
	const [isMobileOpen, setIsMobileOpen] = useState(false);

	const toggleMenu = (title: string) => {
		if (isCollapsed) setIsCollapsed(false);
		setOpenMenus((prev) =>
			prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title],
		);
	};

	const handleLogout = () => {
		Cookies.remove("token");
		router.push("/login");
	};

	const filteredMenu = menuItems.filter((item) =>
		item.roles.includes(userRole),
	);

	return (
		<>
			{/* MOBILNÍ HAMBURGER TLAČÍTKO */}
			<button
				onClick={() => setIsMobileOpen(!isMobileOpen)}
				className="fixed top-4 left-4 z-50 rounded-md bg-slate-900 p-2 text-white lg:hidden">
				{isMobileOpen ? <X size={20} /> : <Menu size={20} />}
			</button>

			{/* OVERLAY PRO MOBIL */}
			{isMobileOpen && (
				<div
					className="fixed inset-0 z-40 bg-black/50 lg:hidden"
					onClick={() => setIsMobileOpen(false)}
				/>
			)}

			{/* SIDEBAR CONTAINER */}
			<div
				className={cn(
					"fixed inset-y-0 left-0 z-40 flex flex-col bg-slate-900 text-slate-300 border-r border-slate-800 transition-all duration-300",
					isCollapsed ? "w-20" : "w-64",
					isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
					"lg:relative lg:z-0",
				)}>
				{/* LOGO SEKCE */}
				<div
					className={cn(
						"flex items-center p-6",
						isCollapsed ? "justify-center" : "justify-between",
					)}>
					{!isCollapsed && (
						<h1 className="text-xl font-bold text-white tracking-tight">
							ShiftMaster<span className="text-blue-500">.</span>
						</h1>
					)}
					<button
						onClick={() => setIsCollapsed(!isCollapsed)}
						className="hidden lg:block text-slate-500 hover:text-white">
						{isCollapsed ? (
							<PanelLeftOpen size={20} />
						) : (
							<PanelLeftClose size={20} />
						)}
					</button>
				</div>

				{/* NAVIGACE */}
				<nav className="flex-1 space-y-1 px-3 overflow-y-auto overflow-x-hidden">
					{filteredMenu.map((item) => {
						const hasSubItems = !!(item.items && item.items.length > 0);
						const isMenuOpen = openMenus.includes(item.title);
						const Icon = item.icon;

						return (
							<div key={item.title}>
								{hasSubItems ? (
									<div>
										<button
											onClick={() => toggleMenu(item.title)}
											className={cn(
												"w-full group flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-slate-800 hover:text-white transition-all",
												isCollapsed && "justify-center",
											)}>
											<Icon
												className={cn(
													"h-5 w-5 text-slate-400 group-hover:text-blue-400",
													!isCollapsed && "mr-3",
												)}
											/>
											{!isCollapsed && (
												<>
													<span className="flex-1 text-left">{item.title}</span>
													{isMenuOpen ? (
														<ChevronDown size={16} />
													) : (
														<ChevronRight size={16} />
													)}
												</>
											)}
										</button>

										{!isCollapsed && isMenuOpen && (
											<div className="mt-1 ml-9 space-y-1 border-l border-slate-700 pl-2">
												{item
													.items!.filter((sub) => sub.roles.includes(userRole))
													.map((sub) => (
														<Link
															key={sub.href}
															href={sub.href}
															onClick={() => setIsMobileOpen(false)}
															className={cn(
																"block rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
																pathname === sub.href
																	? "bg-blue-600/10 text-blue-400"
																	: "text-slate-500 hover:text-white hover:bg-slate-800",
															)}>
															{sub.title}
														</Link>
													))}
											</div>
										)}
									</div>
								) : (
									<Link
										href={item.href || "#"}
										onClick={() => setIsMobileOpen(false)}
										className={cn(
											"group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-all",
											isCollapsed && "justify-center",
											pathname === item.href
												? "bg-blue-600 text-white shadow-lg shadow-blue-900/20"
												: "text-slate-400 hover:bg-slate-800 hover:text-white",
										)}>
										<Icon
											className={cn(
												"h-5 w-5",
												!isCollapsed && "mr-3",
												pathname === item.href
													? "text-white"
													: "text-slate-500 group-hover:text-blue-400",
											)}
										/>
										{!isCollapsed && <span>{item.title}</span>}
									</Link>
								)}
							</div>
						);
					})}
				</nav>

				{/* PATIČKA */}
				<div className="p-4 border-t border-slate-800 bg-slate-900/50 space-y-3">
					<div
						className={cn(
							"flex items-center gap-3",
							isCollapsed && "justify-center",
						)}>
						<div className="h-8 w-8 min-w-[32px] rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold">
							{userRole ? userRole[0] : "?"}
						</div>
						{!isCollapsed && (
							<div className="overflow-hidden">
								<p className="text-xs font-semibold text-white truncate uppercase tracking-wider">
									{userRole}
								</p>
							</div>
						)}
					</div>

					<button
						onClick={handleLogout}
						className={cn(
							"w-full group flex items-center rounded-md px-3 py-2 text-sm font-medium text-slate-400 hover:bg-red-900/30 hover:text-red-400 transition-all",
							isCollapsed && "justify-center",
						)}>
						<LogOut
							className={cn("h-5 w-5 flex-shrink-0", !isCollapsed && "mr-3")}
						/>
						{!isCollapsed && <span>Odhlásit se</span>}
					</button>
				</div>
			</div>
		</>
	);
}
