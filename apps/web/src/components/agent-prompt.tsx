import { agentFirstPrompt } from "../lib/agent-setup";
import { CopyButton } from "./ui/copy-button";

export function AgentPrompt({ compact = false }: { compact?: boolean }) {
	return (
		<div className="agent-prompt">
			{compact ? null : (
				<blockquote className="agent-first-prompt" lang="es">
					{agentFirstPrompt}
				</blockquote>
			)}
			<CopyButton
				value={agentFirstPrompt}
				label="Copy prompt for your agent"
				copiedLabel="Prompt copied"
				variant="default"
			/>
		</div>
	);
}
