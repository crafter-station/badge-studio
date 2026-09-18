"use client";

import { ParticipantProfileProvider } from "@/components/participant-profile-provider";
import { ThemeProvider } from "next-themes";

export function Providers({ children }: { children: React.ReactNode }) {
	return (
		<ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
			<ParticipantProfileProvider>{children}</ParticipantProfileProvider>
		</ThemeProvider>
	);
}
