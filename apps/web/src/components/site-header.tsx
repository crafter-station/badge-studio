"use client";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Monitor, Moon, Stack, Sun } from "@phosphor-icons/react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const navigation = [
	{ href: "/gallery", label: "Gallery" },
	{ href: "/design", label: "Studio" },
	{ href: "/docs", label: "Toolkit" },
];

export function SiteHeader() {
	const path = usePathname();
	const { theme, setTheme } = useTheme();
	const [mounted, setMounted] = useState(false);
	useEffect(() => setMounted(true), []);

	return (
		<header className="app-header">
			<Link href="/" className="app-wordmark" aria-label="Badge Studio home">
				<Stack weight="duotone" aria-hidden="true" />
				Badge Studio<span aria-hidden="true">.</span>
			</Link>
			<nav className="app-navigation" aria-label="Main navigation">
				{navigation.map((item) => (
					<Link
						key={item.href}
						href={item.href}
						aria-current={path === item.href ? "page" : undefined}
					>
						{item.label}
					</Link>
				))}
				<a
					href="https://github.com/crafter-station/badge-studio"
					target="_blank"
					rel="noopener noreferrer"
				>
					GitHub<span className="sr-only"> (opens in a new tab)</span>
				</a>
			</nav>
			<ToggleGroup
				className="app-theme"
				aria-label="Color theme"
				value={[mounted ? theme || "system" : "system"]}
				onValueChange={(values) => {
					if (values[0]) setTheme(values[0]);
				}}
				variant="outline"
				size="sm"
				spacing={0}
			>
				<ToggleGroupItem value="light" aria-label="Light theme" title="Light">
					<Sun aria-hidden="true" />
				</ToggleGroupItem>
				<ToggleGroupItem value="dark" aria-label="Dark theme" title="Dark">
					<Moon aria-hidden="true" />
				</ToggleGroupItem>
				<ToggleGroupItem value="system" aria-label="System theme" title="System">
					<Monitor aria-hidden="true" />
				</ToggleGroupItem>
			</ToggleGroup>
		</header>
	);
}
