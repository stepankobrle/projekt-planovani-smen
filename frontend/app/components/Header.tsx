"use client";

import React from "react";
import { Bell, Search, User, LogOut, Settings, HelpCircle } from "lucide-react";
import { UserRole } from "@/config/menu";
import { cn } from "@/lib/utils";

interface HeaderProps {
	userRole: UserRole;
}

export default function Header({ userRole }: HeaderProps) {
	return (
		<header className="h-16 border-b border-slate-200 bg-white px-8 flex items-center justify-between sticky top-0 z-30">
			{/* LEVÁ ČÁST: Vyhledávání */}
			<div className="hidden md:flex items-center relative max-w-sm w-full">
				<Search
					className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
					size={18}
				/>
				<input
					type="text"
					placeholder="Rychlé hledání..."
					className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm"
				/>
			</div>

			{/* PRAVÁ ČÁST: Ikony a Profil */}
			<div className="flex items-center gap-4 ml-auto">
				{/* Notifikace */}
				<button className="p-2 text-slate-500 hover:bg-slate-50 rounded-full relative transition-colors">
					<Bell size={20} />
					<span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
				</button>

				{/* Vertikální oddělovač */}
				<div className="h-8 w-[1px] bg-slate-200 mx-2 shadow-sm"></div>

				{/* Uživatel Dropdown (prozatím statický) */}
				<div className="flex items-center gap-3 pl-2 group cursor-pointer">
					<div className="text-right hidden sm:block">
						<p className="text-sm font-semibold text-slate-900 leading-none">
							Administrátor
						</p>
						<p className="text-[11px] text-slate-500 mt-1 uppercase font-bold tracking-wider">
							{userRole}
						</p>
					</div>
					<div className="h-9 w-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-all shadow-inner">
						<User size={20} />
					</div>
				</div>
			</div>
		</header>
	);
}
