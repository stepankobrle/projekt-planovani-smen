"use client";

import { useState, useRef, useEffect } from "react";
import { Bell, Search, User, X } from "lucide-react";
import { UserRole } from "@/config/menu";
import { useNotifications } from "@/hooks/useNotifications";

interface HeaderProps {
	userRole: UserRole;
}

export default function Header({ userRole }: HeaderProps) {
	const [isOpen, setIsOpen] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);
	const {
		unreadCount,
		notifications,
		fetchNotifications,
		markAsRead,
		markAllAsRead,
	} = useNotifications();

	// Zavření dropdownu při kliknutí mimo
	useEffect(() => {
		if (!isOpen) return;
		const handler = (e: MouseEvent) => {
			if (
				dropdownRef.current &&
				!dropdownRef.current.contains(e.target as Node)
			) {
				setIsOpen(false);
			}
		};
		document.addEventListener("mousedown", handler);
		return () => document.removeEventListener("mousedown", handler);
	}, [isOpen]);

	const handleBellClick = () => {
		if (!isOpen) fetchNotifications();
		setIsOpen((prev) => !prev);
	};

	const formatTime = (iso: string) =>
		new Date(iso).toLocaleString("cs-CZ", {
			day: "2-digit",
			month: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
		});

	return (
		<header className="h-16 bg-brand-primary px-8 flex items-center justify-between sticky top-0 z-30">
			{/* LEVÁ ČÁST: Vyhledávání */}
			<div className="hidden md:flex items-center relative max-w-sm w-full">
				<Search
					className="absolute left-3 top-1/2 -translate-y-1/2 text-white"
					size={18}
				/>
				<input
					type="text"
					placeholder="Rychlé hledání..."
					className="w-full pl-10 pr-4 py-2 bg-brand-grey text-white rounded-s focus:outline-none focus:ring-2 focus:ring-brand-secondary/10 focus:border-brand-secondary transition-all text-sm"
				/>
			</div>

			{/* PRAVÁ ČÁST: Ikony a Profil */}
			<div className="flex items-center gap-4 ml-auto">
				{/* Notifikace */}
				<div className="relative" ref={dropdownRef}>
					<button
						onClick={handleBellClick}
						className="p-2 text-slate-500 hover:bg-slate-50 rounded-full relative transition-colors">
						<Bell size={20} />
						{unreadCount > 0 && (
							<span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 bg-red-500 rounded-full border-2 border-white flex items-center justify-center text-white text-[9px] font-bold px-0.5">
								{unreadCount > 9 ? "9+" : unreadCount}
							</span>
						)}
					</button>

					{/* Dropdown */}
					{isOpen && (
						<div className="absolute right-0 top-full mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
							{/* Hlavička */}
							<div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
								<span className="font-semibold text-sm text-slate-900">
									Notifikace
								</span>
								<div className="flex items-center gap-3">
									{unreadCount > 0 && (
										<button
											onClick={markAllAsRead}
											className="text-xs text-brand-secondary hover:underline">
											Označit vše jako přečtené
										</button>
									)}
									<button onClick={() => setIsOpen(false)}>
										<X
											size={14}
											className="text-slate-400 hover:text-slate-600"
										/>
									</button>
								</div>
							</div>

							{/* Seznam */}
							<div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
								{notifications.length === 0 ? (
									<p className="text-sm text-slate-400 text-center py-8">
										Žádné notifikace
									</p>
								) : (
									notifications.map((n) => (
										<div
											key={n.id}
											onClick={() => !n.isRead && markAsRead(n.id)}
											className={`px-4 py-3 transition-colors ${
												!n.isRead
													? "bg-brand-secondary/10 hover:bg-brand-secondary/15 cursor-pointer"
													: "hover:bg-slate-50"
											}`}>
											<div className="flex items-start gap-2">
												{!n.isRead && (
													<span className="mt-1.5 w-2 h-2 rounded-full bg-brand-secondary shrink-0" />
												)}
												<div className={n.isRead ? "ml-4" : ""}>
													<p className="text-sm text-slate-700 leading-snug">
														{n.content}
													</p>
													<p className="text-[11px] text-slate-400 mt-0.5">
														{formatTime(n.createdAt)}
													</p>
												</div>
											</div>
										</div>
									))
								)}
							</div>
						</div>
					)}
				</div>

				{/* Vertikální oddělovač */}
				<div className="h-8 w-[1px] bg-slate-200 mx-2 shadow-sm"></div>

				{/* Uživatel */}
				<div className="flex items-center gap-3 pl-2 group cursor-pointer">
					<div className="text-right hidden sm:block">
						<p className="text-sm font-semibold text-slate-900 leading-none">
							Administrátor
						</p>
						<p className="text-[11px] text-slate-500 mt-1 uppercase font-bold tracking-wider">
							{userRole}
						</p>
					</div>
					<div className="h-9 w-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-brand-secondary/10 hover:text-brand-secondary transition-all shadow-inner">
						<User size={20} />
					</div>
				</div>
			</div>
		</header>
	);
}
