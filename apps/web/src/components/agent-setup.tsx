import { agentSetupCommands } from "../lib/agent-setup";
import { CommandCode } from "./command-code";
import { CopyButton } from "./ui/copy-button";

export function AgentSetup() {
	return (
		<div className="agent-setup">
			<pre>
				<CommandCode code={agentSetupCommands} />
			</pre>
			<CopyButton value={agentSetupCommands} label="Copy setup" />
		</div>
	);
}
