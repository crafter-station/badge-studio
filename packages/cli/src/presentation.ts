import { stripVTControlCharacters } from "node:util";

export function machineOutput(json: boolean) {
	return json || !process.stdout.isTTY;
}

export function style(text: string, code: string, enabled: boolean) {
	return enabled && process.env.NO_COLOR === undefined ? `\u001b[${code}m${text}\u001b[0m` : text;
}

export function column(text: string, width: number) {
	return text + " ".repeat(Math.max(0, width - stripVTControlCharacters(text).length));
}

export function banner(version: string) {
	process.stderr.write(
		`\n  ${style("✳ Badge Studio", "1", Boolean(process.stderr.isTTY))}  v${version}\n  Editable design, from your terminal.\n\n`,
	);
}
