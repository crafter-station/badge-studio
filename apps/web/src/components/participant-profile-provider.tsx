"use client";

import { preparePhoto } from "@/app/badge/prepare-photo";
import { type ParticipantIdentity, emptyIdentity, validIdentity } from "@/lib/participant-profile";
import { ParticipantProfileStore } from "@/lib/participant-profile-store";
import { currentExamplePhoto, sampleParticipant } from "@/lib/sample-participant";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";

type ProfileState = {
	identity: ParticipantIdentity;
	portraitUrl: string;
	ready: boolean;
	uploading: boolean;
	saving: boolean;
	error: string;
	warning: string;
};

type Profile = ProfileState & {
	updateIdentity: (patch: Partial<ParticipantIdentity>) => void;
	changePhoto: (file: File, signal?: AbortSignal) => Promise<boolean>;
	useExamplePhoto: (signal?: AbortSignal) => Promise<boolean>;
	removePhoto: () => void;
};

const ProfileContext = createContext<Profile | null>(null);

export function ParticipantProfileProvider({ children }: { children: React.ReactNode }) {
	const [state, setState] = useState<ProfileState>({
		identity: emptyIdentity,
		portraitUrl: "",
		ready: false,
		uploading: false,
		saving: false,
		error: "",
		warning: "",
	});
	const identity = useRef(emptyIdentity);
	const photo = useRef<Blob | null>(null);
	const ready = useRef(false);
	const store = useRef<ParticipantProfileStore | null>(null);
	const mounted = useRef(false);
	const photoRevision = useRef(0);
	const pendingWrite = useRef<{ identity: ParticipantIdentity; photo: Blob | null } | null>(null);
	const writing = useRef(false);
	const writes = useRef<Promise<void>>(Promise.resolve());

	useEffect(() => {
		mounted.current = true;
		const controller = new AbortController();
		const database =
			typeof indexedDB === "undefined" ? null : new ParticipantProfileStore(indexedDB);
		store.current = database;
		void (database ? database.read(controller.signal) : Promise.reject())
			.then(async (saved) => {
				const restoredPhoto = await currentExamplePhoto(saved.photo, controller.signal);
				let warning = "";
				if (restoredPhoto !== saved.photo && !controller.signal.aborted) {
					try {
						await database?.save(saved.identity, restoredPhoto, controller.signal);
					} catch {
						warning = "La nueva foto de ejemplo estará disponible solo durante esta sesión.";
					}
				}
				if (controller.signal.aborted) return;
				identity.current = restoredPhoto ? { ...saved.identity, started: true } : saved.identity;
				photo.current = restoredPhoto;
				const portraitUrl = restoredPhoto ? URL.createObjectURL(restoredPhoto) : "";
				ready.current = true;
				setState((current) => ({
					...current,
					identity: identity.current,
					portraitUrl,
					ready: true,
					warning,
				}));
			})
			.catch(() => {
				if (!controller.signal.aborted) {
					ready.current = true;
					setState((current) => ({
						...current,
						ready: true,
						warning: "Tu perfil estará disponible solo durante esta sesión.",
					}));
				}
			});
		return () => {
			mounted.current = false;
			ready.current = false;
			photoRevision.current++;
			controller.abort();
			void writes.current.finally(() => database?.close());
		};
	}, []);

	useEffect(() => {
		const url = state.portraitUrl;
		return () => {
			if (url) URL.revokeObjectURL(url);
		};
	}, [state.portraitUrl]);

	const persist = useCallback((next: ParticipantIdentity) => {
		pendingWrite.current = { identity: next, photo: photo.current };
		const database = store.current;
		setState((current) => ({ ...current, saving: true }));
		if (writing.current) return;
		writing.current = true;
		writes.current = (async () => {
			let warning = "";
			while (pendingWrite.current) {
				const pending = pendingWrite.current;
				pendingWrite.current = null;
				try {
					if (!database) throw new Error("Storage unavailable");
					await database.save(pending.identity, pending.photo);
					warning = "";
				} catch {
					warning =
						"Tu perfil está aplicado. No pudimos guardarlo para la próxima visita; exporta tu badge.";
				}
			}
			writing.current = false;
			if (mounted.current) setState((current) => ({ ...current, saving: false, warning }));
		})();
	}, []);

	const updateIdentity = useCallback(
		(patch: Partial<ParticipantIdentity>) => {
			if (!ready.current) return;
			const next = { ...identity.current, ...patch };
			if (!validIdentity(next) || JSON.stringify(next) === JSON.stringify(identity.current)) return;
			identity.current = next;
			setState((current) => ({ ...current, identity: next }));
			persist(next);
		},
		[persist],
	);

	const changePhoto = useCallback(
		async (file: File, signal?: AbortSignal) => {
			if (!ready.current || signal?.aborted) return false;
			const revision = ++photoRevision.current;
			setState((current) => ({ ...current, uploading: true, error: "" }));
			try {
				const image = await preparePhoto(file);
				if (!mounted.current || revision !== photoRevision.current) return false;
				if (signal?.aborted) {
					setState((current) => ({ ...current, uploading: false }));
					return false;
				}
				const next = { ...identity.current, started: true };
				identity.current = next;
				photo.current = image;
				const portraitUrl = URL.createObjectURL(image);
				setState((current) => ({
					...current,
					identity: next,
					portraitUrl,
					uploading: false,
				}));
				persist(next);
				return true;
			} catch (error) {
				if (mounted.current && revision === photoRevision.current)
					setState((current) => ({
						...current,
						uploading: false,
						error:
							error instanceof DOMException
								? "No pudimos leer esa foto. Prueba con otra imagen JPG, PNG o WebP."
								: error instanceof Error
									? error.message
									: "No pudimos preparar esa foto. Prueba con otra imagen.",
					}));
				return false;
			}
		},
		[persist],
	);

	const removePhoto = useCallback(() => {
		if (!ready.current) return;
		photoRevision.current++;
		photo.current = null;
		setState((current) => ({ ...current, portraitUrl: "", uploading: false, error: "" }));
		persist(identity.current);
	}, [persist]);

	const useExamplePhoto = useCallback(
		async (signal?: AbortSignal) => {
			if (!ready.current || signal?.aborted) return false;
			const revision = ++photoRevision.current;
			setState((current) => ({ ...current, uploading: true, error: "" }));
			try {
				const response = await fetch(sampleParticipant.portraitUrl, {
					signal: signal
						? AbortSignal.any([signal, AbortSignal.timeout(10000)])
						: AbortSignal.timeout(10000),
				});
				if (!response.ok) throw new Error("Example unavailable");
				const image = await response.blob();
				signal?.throwIfAborted();
				if (!mounted.current || revision !== photoRevision.current) return false;
				const applied = await changePhoto(
					new File([image], "example.webp", { type: "image/webp" }),
					signal,
				);
				if (applied)
					updateIdentity({
						name: identity.current.name.trim() || sampleParticipant.name,
						role: identity.current.role.trim() || sampleParticipant.role,
					});
				return applied;
			} catch {
				if (mounted.current && revision === photoRevision.current)
					setState((current) => ({
						...current,
						uploading: false,
						error: signal?.aborted
							? ""
							: "No pudimos cargar la foto de ejemplo. Inténtalo otra vez o sube la tuya.",
					}));
				return false;
			}
		},
		[changePhoto, updateIdentity],
	);

	const value = useMemo(
		() => ({ ...state, updateIdentity, changePhoto, useExamplePhoto, removePhoto }),
		[state, updateIdentity, changePhoto, useExamplePhoto, removePhoto],
	);
	return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useParticipantProfile() {
	const profile = useContext(ProfileContext);
	if (!profile) throw new Error("ParticipantProfileProvider is required.");
	return profile;
}
