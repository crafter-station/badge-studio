import { Fragment } from "react";

export function CommandCode({ code }: { code: string }) {
	return (
		<code className="text-syntax-text">
			{code.split("\n").map((line, index, lines) => {
				let command = true;
				let offset = 0;
				return (
					<Fragment key={`${index}:${line}`}>
						{(line.match(/#[^\n]*|"(?:\\.|[^"\\])*"|'[^']*'|\S+|\s+/g) ?? []).map((token) => {
							const start = offset;
							offset += token.length;
							if (!token.trim()) return token;
							const color = token.startsWith("#")
								? "text-syntax-comment"
								: token.startsWith('"') || token.startsWith("'")
									? "text-syntax-string"
									: token.startsWith("-")
										? "text-syntax-keyword"
										: command
											? "text-syntax-function"
											: undefined;
							command = false;
							return (
								<span key={start} className={color}>
									{token}
								</span>
							);
						})}
						{index < lines.length - 1 ? "\n" : null}
					</Fragment>
				);
			})}
		</code>
	);
}
