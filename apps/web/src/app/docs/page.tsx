import Link from "next/link";
import "../landing/landing.css";
import "./toolkit.css";

export const metadata = { title: "Design toolkit" };

export default function ToolkitPage() {
	return (
		<main className="studio-landing toolkit-page">
			<header className="landing-nav">
				<Link href="/" className="studio-wordmark">
					<span className="studio-mark" aria-hidden="true">
						✳
					</span>
					Badge Studio.
				</Link>
				<Link href="/design" className="nav-open">
					Open studio ↗
				</Link>
			</header>
			<article className="toolkit-content">
				<span className="section-kicker">The design toolkit · 0.1.0</span>
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
					<h2>01 / Run it from the source</h2>
					<p>The CLI is available in this repository. It has not been published as a package.</p>
					<pre>
						<code>{"bun install\nbun run build:packages\nbun run studio --help\nbun run dev"}</code>
					</pre>
					<p>
						The local app opens on port 3004. Browsing, editing and exporting work without an AI
						key. Prompt generation needs your own gateway key.
					</p>
				</section>
				<section>
					<h2>02 / Pick your starting point</h2>
					<pre>
						<code>
							{
								"bun run studio styles list\nbun run studio design create --style gtm --out badge.json"
							}
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
						<code>
							{"bun run studio schema --json\nbun run studio design validate --file badge.json"}
						</code>
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
						Open the editor and choose <strong>Importar JSON</strong> in the header. Upload your
						portrait, refine either face, and export PNG or the editable JSON.
					</p>
					<p>
						Artwork references are separate from the document. Built-in assets ship with the studio;
						custom artwork must also be available in the same local app.
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
						This is a local studio. Shared accounts, durable hosted storage, package distribution
						and additional physical formats are future work.
					</p>
				</aside>
			</article>
		</main>
	);
}
