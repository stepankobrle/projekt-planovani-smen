"use client";

import React from "react";
import "../(dashboard)/(admin)/admin/dashboard/dashboard.css"; // Natažení animací a tříd jako .a-up, .card atd.

/**
 * 1. PageContainer
 * Hlavní wrapper stránky, stará se o výšku a šedozelené pozadí.
 */
export function PageContainer({ children }: { children: React.ReactNode }) {
	return (
		<div
			className="min-h-full flex flex-col relative"
			style={{ background: "#F0F7F4", color: "#0F2E35", overflow: "hidden" }}>
			{children}
		</div>
	);
}

/**
 * 2. HeroHeader
 * Obaluje nadpisovou sadu, modro-zelený gradient, dekorační šum a Action tlačítko (vpravo).
 */
export function HeroHeader({
	title,
	subtitle,
	action,
}: {
	title: React.ReactNode;
	subtitle: React.ReactNode;
	action?: React.ReactNode;
}) {
	return (
		<div
			className="a-up px-6 py-12 md:pt-24 md:pb-16 md:px-24 bg-hero-gradient shrink-0 relative overflow-hidden"
			style={{ "--d": "0ms" } as React.CSSProperties}>
			{/* Dekorativní vrstvy chráněné vůči klikání */}
			<div
				style={{
					position: "absolute",
					right: -80,
					top: "50%",
					transform: "translateY(-50%)",
					width: 320,
					height: 320,
					borderRadius: "50%",
					border: "1px solid rgba(104,178,160,.18)",
					pointerEvents: "none",
				}}
			/>
			<div
				style={{
					position: "absolute",
					right: -20,
					top: "50%",
					transform: "translateY(-50%)",
					width: 200,
					height: 200,
					borderRadius: "50%",
					border: "1px solid rgba(104,178,160,.12)",
					pointerEvents: "none",
				}}
			/>
			<div
				style={{
					position: "absolute",
					right: 40,
					top: "50%",
					transform: "translateY(-50%)",
					width: 100,
					height: 100,
					borderRadius: "50%",
					background: "radial-gradient(circle, rgba(104,178,160,.15) 0%, transparent 70%)",
					pointerEvents: "none",
				}}
			/>
			<div
				style={{
					position: "absolute",
					inset: 0,
					backgroundImage:
						'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.75\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
					opacity: 0.03,
					pointerEvents: "none",
					mixBlendMode: "overlay",
				}}
			/>

			<div className="relative flex flex-col md:flex-row md:items-start justify-between gap-6 md:gap-0">
				<div>
					<p
						style={{
							color: "rgba(205,224,201,.5)",
							fontSize: 11,
							fontWeight: 600,
							letterSpacing: "0.14em",
							textTransform: "uppercase",
							marginBottom: 10,
						}}>
						{subtitle}
					</p>
					<h1 style={{ color: "#fff", lineHeight: 1.05 }}>
						<span className="block text-[32px] md:text-[38px] font-extrabold">{title}</span>
					</h1>
				</div>
				{action && <div className="pt-1">{action}</div>}
			</div>
		</div>
	);
}

/**
 * 3. OverlapPanel
 * Menší kontejner uříznutý nad hlavičku přes negativní margin. Většinou pro filtry, search.
 */
export function OverlapPanel({
	children,
	delay = "100ms",
}: {
	children?: React.ReactNode;
	delay?: string;
}) {
	return (
		<div className="relative z-10 mx-6 md:mx-24 -mt-[50px] md:-mt-[36px] mb-2 md:mb-4">
			<div
				className="card a-up flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 p-4 md:px-6 md:py-4 w-full"
				style={{ "--d": delay } as React.CSSProperties}>
				{children}
			</div>
		</div>
	);
}

/**
 * 4. TableCard
 * Centrální wrapper tabulky, rolování a pagination. Flex 1 min-h-0 zajišťuje auto-rolování.
 */
export function TableCard({
	children,
	delay = "180ms",
	footer,
	isOverlapping = false,
}: {
	children: React.ReactNode;
	delay?: string;
	footer?: React.ReactNode;
	isOverlapping?: boolean;
}) {
	return (
		<div className={`flex-1 px-6 md:px-24 md:pb-11 flex flex-col overflow-hidden ${isOverlapping ? "relative z-10 -mt-8 md:-mt-14" : "pt-6 md:pt-8"}`}>
			<div
				className="card a-up flex-1 flex flex-col overflow-hidden"
				style={{ "--d": delay, padding: "12px 12px 0 12px" } as React.CSSProperties}>
				<div className="scr flex-1" style={{ overflowY: "auto" }}>
					<table className="w-full text-left border-collapse">
						{children}
					</table>
				</div>
				{footer && (
					<div
						className="flex items-center justify-between px-4 py-3 border-t shrink-0 mt-auto bg-white"
						style={{ borderColor: "#DDF0E8" }}>
						{footer}
					</div>
				)}
			</div>
		</div>
	);
}
