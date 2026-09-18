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
					Start with a badge. Let your agent edit its layers. Bring it back to the studio to see it
					move.
				</p>
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
						sync, public AI generation and additional physical formats are future work.
					</p>
				</aside>
			</article>
		</main>
	);
}
