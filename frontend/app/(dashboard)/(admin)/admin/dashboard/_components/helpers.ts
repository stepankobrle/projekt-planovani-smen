import { useEffect, useState } from "react";

export const fmtShort = (iso: string) =>
	new Date(iso).toLocaleDateString("cs-CZ", { day: "numeric", month: "short" });

export const fmtTime = (iso: string) =>
	new Date(iso).toLocaleTimeString("cs-CZ", {
		hour: "2-digit",
		minute: "2-digit",
	});

export const isToday = (iso: string) => {
	const d = new Date(iso),
		now = new Date();
	return (
		d.getFullYear() === now.getFullYear() &&
		d.getMonth() === now.getMonth() &&
		d.getDate() === now.getDate()
	);
};

export const initials = (name: string | null) =>
	name
		?.split(" ")
		.map((w) => w[0])
		.join("")
		.toUpperCase()
		.slice(0, 2) ?? "?";

export function useCountUp(target: number, duration = 1000): number {
	const [val, setVal] = useState(0);
	useEffect(() => {
		if (target === 0) {
			setVal(0);
			return;
		}
		const start = performance.now();
		const tick = (now: number) => {
			const pct = Math.min((now - start) / duration, 1);
			setVal(Math.round((1 - Math.pow(1 - pct, 3)) * target));
			if (pct < 1) requestAnimationFrame(tick);
		};
		requestAnimationFrame(tick);
	}, [target, duration]);
	return val;
}
