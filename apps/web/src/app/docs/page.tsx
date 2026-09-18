import Link from "next/link";
import "../landing/landing.css";
import "./toolkit.css";

export const metadata = { title: "Design toolkit" };

export default function ToolkitPage() {
	return (
		<main className="studio-landing toolkit-page">
			<article className="toolkit-content">
				<span className="section-kicker">The design toolkit · Node.js 22+</span>
				<h1>
					Same design.
					<br />
					<em>Another way in.</em>
				</h1>
				<p className="toolkit-lead">
					Design by hand, or bring your coding agent into the same editor. You share the canvas.
					Your agent brings the ideas.
				</p>
				<section id="agents">
					<h2>Your agent. Your canvas.</h2>
					<p>
						The web editor stays fully editable. WebMCP lets a connected agent read and change the
						same layers, typography, materials, photos and metadata you control by hand. It can flip
						the badge, save locally, undo a layout change and export either face.
					</p>
					<pre>
						<code>
							{
								'npx skills add crafter-station/badge-studio --skill badge-studio\n\nagent-browser --session badges --webgpu open https://badge-studio.crafter.run/design\nagent-browser --session badges webmcp list badge_inspect --json\nagent-browser --session badges webmcp invoke badge_inspect --params \'{"section":"state"}\' --json'
							}
						</code>
					</pre>
					<p>
						Your coding agent reasons about the design using its own subscription. Badge Studio
						applies and validates the changes in your browser. It does not call a language model to
						plan your layout. Each change checks the current revision so it cannot silently
						overwrite a newer edit.
					</p>
					<blockquote>
						“Open my badge in Badge Studio. Give it a warmer editorial direction, with oversized
						serif type and a quiet reverse. Keep my photo, preserve the QR and show me both sides.”
					</blockquote>
					<p>
						Use a browser and agent with native WebMCP support. Agent-browser exposes these tools
						directly; other clients need a compatible browser connection. If unavailable, the manual
						editor and JSON workflow below still work.
					</p>
				</section>
				<section>
					<h2>Image magic, outside the browser.</h2>
					<p>
						Use the editor's filters when they fit. For a new illustration, pixel art or background
						removal, your agent can export the photo, run{" "}
						<a
							href="https://github.com/vercel-labs/ai-cli"
							target="_blank"
							rel="noopener noreferrer"
						>
							ai-cli
						</a>{" "}
						with your AI Gateway credentials, inspect the result and import it through WebMCP.
					</p>
					<pre>
						<code>
							{
								'npm install --global ai-cli\nai models --type image --json\nai image -m "$BADGE_IMAGE_MODEL" -i portrait.webp \\\n  --output transformed.png "Restyle this portrait. Preserve the person, pose and crop."'
							}
						</code>
					</pre>
					<p>
						Choose a model that supports reference images. Image generation uses your Gateway
						credits, separately from your coding agent subscription. Keys stay in your local
						environment. Badge Studio does not run paid generation or send your photo to a model.
						The companion skill includes image transfer helpers and the complete workflow.
					</p>
				</section>
				<section>
					<h2>01 / Meet badgio</h2>
					<p>Badge Studio from your terminal. Run the CLI without installing it globally.</p>
					<pre>
						<code>{"npx badgio --help\nnpx badgio styles list"}</code>
					</pre>
					<p>
						The package is called badgio. It runs on Node.js 22 or newer and works without an
						account or AI key. Install it globally with <code>npm install --global badgio</code> if
						you prefer.
					</p>
				</section>
				<section>
					<h2>02 / Pick your starting point</h2>
					<pre>
						<code>
							{"npx badgio styles list\nnpx badgio design create --style gtm --out badge.json"}
						</code>
					</pre>
					<p>
						Seventeen editable directions: nine event references, three physical originals and five
						custom explorations. The file contains both faces, every layer and the material recipe.
						Existing files are never overwritten.
					</p>
				</section>
				<section>
					<h2>03 / Make it yours with your agent</h2>
					<pre>
						<code>{"npx badgio schema --json\nnpx badgio design validate --file badge.json"}</code>
					</pre>
					<p>
						Ask your agent to edit badge.json using the schema: typography, positions, shapes,
						portrait treatments, effects and materials. Keep the name and role bindings so the same
						design works for different people.
					</p>
					<blockquote>
						“Turn this into an editorial badge with cobalt type and warm paper. Keep the portrait
						and a clear QR. Validate it before handing it back.”
					</blockquote>
					<p>
						The CLI creates and validates documents locally. Your agent supplies the creative
						changes. It does not call an LLM or generate images itself.
					</p>
				</section>
				<section>
					<h2>04 / Bring it to life</h2>
					<p>
						Open the editor and upload your photo or try the example portrait. Then choose{" "}
						<strong>Importar JSON</strong> in the toolbar, refine either face, and export PNG or the
						editable JSON. Your photo and name stay with you across every style.
					</p>
					<p>
						Artwork references are separate from the document. Built-in assets ship with the studio;
						custom artwork can be imported into your browser's design library.
					</p>
					<Link href="/design?style=gtm" className="primary-action">
						Open the editor ↗
					</Link>
				</section>
				<aside className="toolkit-note">
					<h2>Made for agents, too</h2>
					<p>
						A companion skill lives at <code>skills/badge-studio/SKILL.md</code>. JSON output is
						automatic when piped, commands never prompt, and <code>--dry-run</code> previews file
						creation.
					</p>
					<p>
						The public studio saves your profile, photo, designs and illustrations in this browser.
						Your photo is not uploaded to a server. Export your work to keep a separate copy. Cloud
						sync and additional physical formats are future work. Image generation is handled by
						your own agent and tools outside the browser.
					</p>
				</aside>
			</article>
		</main>
	);
}
