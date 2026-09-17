export function createOrbitSound() {
	let context: AudioContext | undefined;
	let last = 0;
	return {
		async unlock() {
			context ??= new AudioContext();
			if (context.state === "suspended") await context.resume();
		},
		tick(strength: number) {
			if (!context || context.state !== "running") return;
			const now = context.currentTime;
			if (now - last < 0.035) return;
			last = now;
			const buffer = context.createBuffer(
				1,
				Math.ceil(context.sampleRate * 0.028),
				context.sampleRate,
			);
			const samples = buffer.getChannelData(0);
			for (let index = 0; index < samples.length; index++)
				samples[index] = (Math.random() * 2 - 1) * Math.exp((-index / samples.length) * 8);
			const noise = context.createBufferSource();
			noise.buffer = buffer;
			const filter = context.createBiquadFilter();
			filter.type = "bandpass";
			filter.frequency.value = 1900;
			filter.Q.value = 1.3;
			const gain = context.createGain();
			gain.gain.setValueAtTime(0.07 + Math.min(strength, 1) * 0.025, now);
			gain.gain.exponentialRampToValueAtTime(0.001, now + 0.028);
			noise.connect(filter).connect(gain).connect(context.destination);
			noise.start(now);
			noise.stop(now + 0.032);
			noise.onended = () => {
				noise.disconnect();
				filter.disconnect();
				gain.disconnect();
			};
		},
		dispose() {
			if (context) void context.close();
		},
	};
}
