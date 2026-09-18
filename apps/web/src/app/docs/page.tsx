import Link from "next/link";
import { AgentSetup } from "../../components/agent-setup";
import { CommandCode } from "../../components/command-code";
import { Button } from "../../components/ui/button";
import { agentFirstPrompt } from "../../lib/agent-setup";
import "../landing/landing.css";
import "./toolkit.css";

export const metadata = { title: "Design with your agent" };

export default function ToolkitPage() {
	return (
		<main className="studio-landing toolkit-page">
			<article className="toolkit-content">
				<span className="section-kicker">The design toolkit · Node.js 22+</span>
				<h1>
					Your photo.
					<br />
					<em>Your agent. Your badge.</em>
				</h1>
				<p className="toolkit-lead">
					Bring a photo and an idea. Your agent composes the badge, opens a live preview and keeps
					refining it with you.
				</p>
				<section id="agents">
					<h2>Install two things. Then just ask.</h2>
					<AgentSetup />
					<p>
						The first command installs badgio, the Badge Studio CLI. The second adds the
						badge-studio skill to your coding agent. Choose your agent in the installer, then start
						a session with the skill available.
					</p>
					<blockquote>“{agentFirstPrompt}”</blockquote>
					<p>
						Attach your image or give its path. If you forget, your agent will ask. It will also ask
						before installing agent-browser for browser inspection. You do not need an image model
						or an API key to compose a badge.
					</p>
				</section>
				<section>
					<h2>The preview stays with you.</h2>
					<p>
						Your agent opens the canvas in your session's built-in browser when one is available.
						Otherwise it opens your default browser. That same tab stays editable while you work
						together.
					</p>
					<blockquote>
						“Bigger type. More contrast. Keep my photo, and make the back feel like a festival
						ticket.”
					</blockquote>
					<p>
						Keep asking in the same conversation. Move a layer yourself, change the name, flip the
						badge or ask your agent for a different direction. The agent reads your latest changes
						before applying its own.
					</p>
					<p>
						Keep the local preview process running while you design. At the end, save in the editor
						or export a PNG and the editable design. Keep your original photo and any generated
						artwork too.
					</p>
				</section>
				<section>
					<h2>A starting point, never a ceiling.</h2>
					<p>
						Ask for the energy of Vibecode Fest, the photographic character of She Ships, a
						pixel-art hackathon pass or something entirely yours. Your agent can compose both faces,
						move and layer graphics, reshape the typography, treat your portrait and tune the
						physical material.
					</p>
					<p>
						The seventeen styles are references. Every supported layer and material control is
						available to your agent. Names, roles and the QR stay useful as the design gets more
						expressive.
					</p>
				</section>
				<section>
					<h2>Image generation, only when you want it.</h2>
					<p>
						For pixel art, a new illustration or a transformed photo, your agent can offer{" "}
						<a
							href="https://github.com/vercel-labs/ai-cli"
							target="_blank"
							rel="noopener noreferrer"
						>
							ai-cli
						</a>
						. It asks before installing it or starting a paid generation. Ordinary layout changes
						and editable photo filters need neither.
					</p>
					<pre>
						<CommandCode
							code={"# Optional: only for AI image transformations\nnpm install --global ai-cli"}
						/>
					</pre>
					<p>
						Generation uses your AI Gateway credentials and credits, separately from your coding
						agent's subscription. Your agent prepares the image outside the website, checks the
						result and brings it back into the same badge. Your keys stay in your local environment.
					</p>
				</section>
				<section>
					<h2>The small skill stays up to date.</h2>
					<p>
						The installed skill is a short entry point. It loads its complete workflow directly from
						your installed CLI, so the commands and instructions travel together.
					</p>
					<pre>
						<CommandCode code={"badgio skills get core\nbadgio skills list\nbadgio doctor"} />
					</pre>
					<details>
						<summary>CLI and browser connection details</summary>
						<p>
							Native WebMCP and the local preview connection share the same editor tools,
							validation, revision checks and undo. The local connection lets your agent edit the
							visible canvas even when its browser has no native WebMCP. Agent-browser can use a
							compatible existing browser connection; it cannot attach to every browser
							automatically.
						</p>
						<pre>
							<CommandCode
								code={
									"badgio studio start\n\n# For an agent with a built-in browser panel\nbadgio studio start --no-open --json"
								}
							/>
						</pre>
						<p>
							Use the returned session URL for tool discovery and edits. The local process listens
							only on your computer. Keep its session URL private and its preview tab open. The
							skill handles this connection during normal use.
						</p>
					</details>
				</section>
				<section>
					<h2>Prefer a document?</h2>
					<pre>
						<CommandCode
							code={
								"badgio styles list\nbadgio design create --style gtm --out badge.json\nbadgio schema --json\nbadgio design validate --file badge.json"
							}
						/>
					</pre>
					<p>
						Edit the JSON with your agent, validate it, then use <strong>Importar JSON</strong> in
						the editor. The file includes both faces and their layers. Portraits and custom artwork
						are separate files.
					</p>
					<Button variant="outline" nativeButton={false} render={<Link href="/design" />}>
						Open the editor ↗
					</Button>
				</section>
				<aside className="toolkit-note">
					<h2>Your work stays in your hands.</h2>
					<p>
						The website keeps your profile, photo, designs and artwork in browser storage. The local
						connection carries edits between your agent and the preview; it does not add cloud sync.
						Browser panels may keep separate storage, so export work you want to keep outside the
						session. Image generation sends only the images you authorize to your chosen provider.
					</p>
				</aside>
			</article>
		</main>
	);
}
