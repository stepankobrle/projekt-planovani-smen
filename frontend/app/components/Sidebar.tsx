"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
	ChevronDown,
	ChevronRight,
	X,
	PanelLeftClose,
	PanelLeftOpen,
	LogOut,
} from "lucide-react";
import { Manrope } from "next/font/google";
import { menuItems, UserRole } from "@/config/menu";
import { cn } from "@/lib/utils";
import Cookies from "js-cookie";
import { useAuth } from "@/app/components/ProtectedRoute";

const manrope = Manrope({
	subsets: ["latin"],
	weight: ["400", "500", "600", "700", "800"],
	variable: "--font-mr",
});

interface SidebarProps {
	userRole: UserRole;
	isMobileOpen: boolean;
	onClose: () => void;
}

// ─── BARVY SIDEBARU ───────────────────────────────────────────────────────────
const S = {
	bg: "linear-gradient(rgb(16 50 61) 0%, rgb(0 0 0) 100%)",
	border: "rgba(104,178,160,.12)",
	hoverBg: "rgba(255,255,255,.05)",
	activeBg: "rgba(104,178,160,.15)",
	activeBorder: "#68B2A0",
	textPrimary: "rgba(255,255,255,.88)",
	textMuted: "rgba(255,255,255,.88)",
	textActive: "#ffffff",
	iconMuted: "rgba(255,255,255,.55)",
	iconActive: "#68B2A0",
	subBg: "rgba(0,0,0,.15)",
	subBorder: "rgba(104,178,160,.15)",
	footerBg: "rgba(0,0,0,.2)",
	avatarGrad: "linear-gradient(135deg, #2C6975, #68B2A0)",
};

export default function Sidebar({
	userRole,
	isMobileOpen,
	onClose,
}: SidebarProps) {
	const pathname = usePathname();
	const router = useRouter();
	const { user } = useAuth();
	const [openMenus, setOpenMenus] = useState<string[]>([]);
	const [isCollapsed, setIsCollapsed] = useState(false);

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
	const userInitial = (user?.fullName ?? user?.email ?? "?")[0].toUpperCase();
	const displayName = user?.fullName ?? user?.email ?? "Uživatel";

	return (
		<>
			{/* OVERLAY — MOBIL */}
			{isMobileOpen && (
				<div
					className="fixed inset-0 z-40 lg:hidden"
					style={{
						background: "rgba(15,46,53,.6)",
						backdropFilter: "blur(2px)",
					}}
					onClick={onClose}
				/>
			)}

			{/* SIDEBAR */}
			<div
				className={cn(
					"fixed inset-y-0 left-0 z-40 flex flex-col transition-all duration-300",
					isCollapsed ? "w-[72px]" : "w-64",
					isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
					"lg:relative lg:z-0",
					manrope.variable,
				)}
				style={{
					background: S.bg,
					fontFamily: "var(--font-mr), sans-serif",
				}}>
				{/* LOGO */}
				<div
					className={cn(
						"flex items-center px-5 py-6",
						isCollapsed ? "justify-center" : "justify-between",
					)}
					style={{ borderBottom: `1px solid ${S.border}` }}>
					{!isCollapsed && (
						<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
							{/* Logo ikona */}
							<div
								style={{
									width: 28,
									height: 28,
									borderRadius: 8,
									background: S.avatarGrad,
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									flexShrink: 0,
								}}>
								<svg width="14" height="14" viewBox="0 0 14 14" fill="none">
									<rect
										x="1"
										y="1"
										width="5"
										height="5"
										rx="1"
										fill="white"
										fillOpacity=".9"
									/>
									<rect
										x="8"
										y="1"
										width="5"
										height="5"
										rx="1"
										fill="white"
										fillOpacity=".5"
									/>
									<rect
										x="1"
										y="8"
										width="5"
										height="5"
										rx="1"
										fill="white"
										fillOpacity=".5"
									/>
									<rect
										x="8"
										y="8"
										width="5"
										height="5"
										rx="1"
										fill="white"
										fillOpacity=".9"
									/>
								</svg>
							</div>
							<span
								style={{
									color: S.textPrimary,
									fontSize: 15,
									fontWeight: 700,
									letterSpacing: "-0.01em",
								}}>
								Shift<span style={{ color: "#68B2A0" }}>Planner</span>
							</span>
						</div>
					)}

					{isCollapsed && (
						<div
							style={{
								width: 32,
								height: 32,
								borderRadius: 9,
								background: S.avatarGrad,
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
							}}>
							<svg width="16" height="16" viewBox="0 0 14 14" fill="none">
								<rect
									x="1"
									y="1"
									width="5"
									height="5"
									rx="1"
									fill="white"
									fillOpacity=".9"
								/>
								<rect
									x="8"
									y="1"
									width="5"
									height="5"
									rx="1"
									fill="white"
									fillOpacity=".5"
								/>
								<rect
									x="1"
									y="8"
									width="5"
									height="5"
									rx="1"
									fill="white"
									fillOpacity=".5"
								/>
								<rect
									x="8"
									y="8"
									width="5"
									height="5"
									rx="1"
									fill="white"
									fillOpacity=".9"
								/>
							</svg>
						</div>
					)}

					{/* Desktop collapse / Mobile close */}
					<button
						onClick={() => setIsCollapsed(!isCollapsed)}
						className="hidden lg:flex items-center justify-center"
						style={{
							color: S.textMuted,
							transition: "color .15s",
							padding: 4,
							borderRadius: 6,
						}}
						onMouseEnter={(e) => (e.currentTarget.style.color = S.textPrimary)}
						onMouseLeave={(e) => (e.currentTarget.style.color = S.textMuted)}>
						{isCollapsed ? (
							<PanelLeftOpen size={17} />
						) : (
							<PanelLeftClose size={17} />
						)}
					</button>
					<button
						onClick={onClose}
						className="lg:hidden flex items-center justify-center"
						style={{ color: S.textMuted, padding: 4 }}>
						<X size={17} />
					</button>
				</div>

				{/* NAVIGACE */}
				<nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-3">
					{/* Label sekce */}

					<div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
						{filteredMenu.map((item) => {
							const hasSubItems = !!(item.items && item.items.length > 0);
							const isMenuOpen = openMenus.includes(item.title);
							const isActive = pathname === item.href;
							const Icon = item.icon;

							return (
								<div key={item.title}>
									{hasSubItems ? (
										<div>
											<button
												onClick={() => toggleMenu(item.title)}
												className={cn(
													"w-full flex items-center rounded-xl px-3 py-2.5 transition-all",
													isCollapsed && "justify-center",
												)}
												style={{
													color: S.textMuted,
													background: isMenuOpen ? S.hoverBg : "transparent",
													fontSize: 13,
													fontWeight: 500,
												}}
												onMouseEnter={(e) => {
													e.currentTarget.style.background = S.hoverBg;
													e.currentTarget.style.color = S.textPrimary;
												}}
												onMouseLeave={(e) => {
													e.currentTarget.style.background = isMenuOpen
														? S.hoverBg
														: "transparent";
													e.currentTarget.style.color = S.textMuted;
												}}>
												<Icon
													size={17}
													style={{
														flexShrink: 0,
														marginRight: isCollapsed ? 0 : 10,
														color: "inherit",
													}}
												/>
												{!isCollapsed && (
													<>
														<span style={{ flex: 1, textAlign: "left" }}>
															{item.title}
														</span>
														{isMenuOpen ? (
															<ChevronDown
																size={14}
																style={{ color: S.textMuted }}
															/>
														) : (
															<ChevronRight
																size={14}
																style={{ color: S.textMuted }}
															/>
														)}
													</>
												)}
											</button>

											{!isCollapsed && isMenuOpen && (
												<div
													style={{
														marginTop: 2,
														marginLeft: 12,
														paddingLeft: 16,
														borderLeft: `1px solid ${S.subBorder}`,
														display: "flex",
														flexDirection: "column",
														gap: 1,
													}}>
													{item
														.items!.filter((sub) =>
															sub.roles.includes(userRole),
														)
														.map((sub) => {
															const subActive = pathname === sub.href;
															return (
																<Link
																	key={sub.href}
																	href={sub.href}
																	onClick={onClose}
																	style={{
																		display: "block",
																		padding: "6px 10px",
																		borderRadius: 8,
																		fontSize: 12,
																		fontWeight: subActive ? 600 : 400,
																		color: subActive ? "#68B2A0" : S.textMuted,
																		background: subActive
																			? "rgba(104,178,160,.1)"
																			: "transparent",
																		transition: "all .12s",
																	}}
																	onMouseEnter={(e) => {
																		if (!subActive) {
																			(
																				e.currentTarget as HTMLElement
																			).style.color = S.textPrimary;
																			(
																				e.currentTarget as HTMLElement
																			).style.background = S.hoverBg;
																		}
																	}}
																	onMouseLeave={(e) => {
																		if (!subActive) {
																			(
																				e.currentTarget as HTMLElement
																			).style.color = S.textMuted;
																			(
																				e.currentTarget as HTMLElement
																			).style.background = "transparent";
																		}
																	}}>
																	{sub.title}
																</Link>
															);
														})}
												</div>
											)}
										</div>
									) : (
										<Link
											href={item.href || "#"}
											onClick={onClose}
											className={cn(
												"flex items-center rounded-xl px-3 py-2.5 transition-all",
												isCollapsed && "justify-center",
											)}
											style={{
												color: isActive ? S.textActive : S.textMuted,
												background: isActive ? S.activeBg : "transparent",
												borderLeft: isActive
													? `2px solid ${S.activeBorder}`
													: "2px solid transparent",
												fontSize: 13,
												fontWeight: isActive ? 600 : 500,
											}}
											onMouseEnter={(e) => {
												if (!isActive) {
													(e.currentTarget as HTMLElement).style.background =
														S.hoverBg;
													(e.currentTarget as HTMLElement).style.color =
														S.textPrimary;
												}
											}}
											onMouseLeave={(e) => {
												if (!isActive) {
													(e.currentTarget as HTMLElement).style.background =
														"transparent";
													(e.currentTarget as HTMLElement).style.color =
														S.textMuted;
												}
											}}>
											<Icon
												size={17}
												style={{
													flexShrink: 0,
													marginRight: isCollapsed ? 0 : 10,
													color: isActive ? S.iconActive : "inherit",
												}}
											/>
											{!isCollapsed && <span>{item.title}</span>}
										</Link>
									)}
								</div>
							);
						})}
					</div>
				</nav>

				{/* PATIČKA — uživatel */}
				<div
					style={{
						borderTop: `1px solid ${S.border}`,
						background: S.footerBg,
						padding: "14px 12px",
						display: "flex",
						flexDirection: "column",
						gap: 8,
					}}>
					{/* Uživatel */}
					<div
						className={cn(
							"flex items-center gap-3",
							isCollapsed && "justify-center",
						)}>
						<div
							style={{
								width: 34,
								height: 34,
								minWidth: 34,
								borderRadius: 10,
								background: S.avatarGrad,
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								color: "#fff",
								fontSize: 13,
								fontWeight: 700,
								boxShadow: "0 2px 8px rgba(44,105,117,.35)",
							}}>
							{userInitial}
						</div>
						{!isCollapsed && (
							<div style={{ overflow: "hidden", flex: 1 }}>
								<p
									style={{
										fontSize: 13,
										fontWeight: 600,
										color: S.textPrimary,
										overflow: "hidden",
										textOverflow: "ellipsis",
										whiteSpace: "nowrap",
										lineHeight: 1.2,
										marginBottom: 2,
									}}>
									{displayName}
								</p>
								<p
									style={{
										fontSize: 10,
										fontWeight: 600,
										color: S.textMuted,
										textTransform: "uppercase",
										letterSpacing: "0.1em",
									}}>
									{userRole}
								</p>
							</div>
						)}
					</div>

					{/* Odhlásit */}
					<button
						onClick={handleLogout}
						className={cn(
							"flex items-center rounded-xl px-3 py-2 transition-all w-full",
							isCollapsed && "justify-center",
						)}
						style={{
							color: S.textMuted,
							background: "transparent",
							fontSize: 12,
							fontWeight: 500,
							fontFamily: "inherit",
						}}
						onMouseEnter={(e) => {
							e.currentTarget.style.background = "rgba(200,90,48,.12)";
							e.currentTarget.style.color = "#F0A882";
						}}
						onMouseLeave={(e) => {
							e.currentTarget.style.background = "transparent";
							e.currentTarget.style.color = S.textMuted;
						}}>
						<LogOut
							size={15}
							style={{ flexShrink: 0, marginRight: isCollapsed ? 0 : 8 }}
						/>
						{!isCollapsed && <span>Odhlásit se</span>}
					</button>
				</div>
			</div>
		</>
	);
}
