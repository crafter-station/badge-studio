import core from "../skill-data/core.md";
import design from "../skill-data/design.md";
import images from "../skill-data/images.md";

export const skills = {
	core: {
		description: "Photo, setup, live preview and natural-language iteration.",
		content: core,
	},
	design: {
		description: "Art direction and the full editable design vocabulary.",
		content: design,
	},
	images: {
		description: "Optional ai-cli transformations and local image transfer.",
		content: images,
	},
};

export function getSkill(name: string, full = false) {
	if (!Object.hasOwn(skills, name))
		throw new Error(`Unknown skill: ${name}. Run badgio skills list.`);
	const skill = skills[name as keyof typeof skills];
	return full
		? Object.values(skills)
				.map((entry) => entry.content)
				.join("\n\n")
		: skill.content;
}
