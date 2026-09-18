import { type ParticipantIdentity, emptyIdentity, validIdentity } from "./participant-profile";

const validPhoto = (value: unknown): value is Blob =>
	value instanceof Blob &&
	value.size > 0 &&
	value.size <= 4 * 1024 * 1024 &&
	["image/png", "image/jpeg", "image/webp"].includes(value.type);

export class ParticipantProfileStore {
	private opening?: Promise<IDBDatabase>;

	constructor(
		private factory: IDBFactory,
		private name = "badge-studio-participant-v1",
	) {}

	private database() {
		if (!this.opening) {
			this.opening = new Promise<IDBDatabase>((resolve, reject) => {
				let finished = false;
				const request = this.factory.open(this.name, 1);
				const fail = (reason?: unknown) => {
					if (finished) return;
					finished = true;
					clearTimeout(timer);
					reject(
						reason instanceof Error
							? reason
							: new Error("No pudimos abrir tu perfil en este navegador."),
					);
				};
				const timer = setTimeout(fail, 5000);
				request.onupgradeneeded = () => request.result.createObjectStore("profile");
				request.onerror = () => fail(request.error);
				request.onblocked = () => fail();
				request.onsuccess = () => {
					clearTimeout(timer);
					if (finished) {
						request.result.close();
						return;
					}
					finished = true;
					request.result.onversionchange = () => {
						request.result.close();
						this.opening = undefined;
					};
					resolve(request.result);
				};
			}).catch((error) => {
				this.opening = undefined;
				throw error;
			});
		}
		return this.opening;
	}

	private async transaction<T>(
		mode: IDBTransactionMode,
		work: (store: IDBObjectStore) => () => T,
		signal?: AbortSignal,
	): Promise<T> {
		signal?.throwIfAborted();
		const db = await this.database();
		signal?.throwIfAborted();
		return new Promise<T>((resolve, reject) => {
			const transaction = db.transaction("profile", mode);
			const timer = setTimeout(() => transaction.abort(), 5000);
			const cancel = () => transaction.abort();
			signal?.addEventListener("abort", cancel, { once: true });
			const cleanup = () => {
				clearTimeout(timer);
				signal?.removeEventListener("abort", cancel);
			};
			transaction.onabort = () => {
				cleanup();
				reject(signal?.reason ?? transaction.error ?? new Error("No pudimos guardar tu perfil."));
			};
			try {
				const result = work(transaction.objectStore("profile"));
				transaction.oncomplete = () => {
					cleanup();
					try {
						resolve(result());
					} catch (error) {
						reject(error);
					}
				};
			} catch (error) {
				cleanup();
				transaction.abort();
				reject(error);
			}
		});
	}

	read(signal?: AbortSignal) {
		return this.transaction(
			"readonly",
			(store) => {
				const identity = store.get("identity");
				const photo = store.get("photo");
				return () => ({
					identity: validIdentity(identity.result) ? identity.result : { ...emptyIdentity },
					photo: validPhoto(photo.result) ? photo.result : null,
				});
			},
			signal,
		);
	}

	save(identity: ParticipantIdentity, photo?: Blob | null, signal?: AbortSignal) {
		if (!validIdentity(identity)) return Promise.reject(new Error("Revisa los datos del perfil."));
		if (photo !== undefined && photo !== null && !validPhoto(photo))
			return Promise.reject(new Error("Elige una foto PNG, JPG o WebP de hasta 4 MB."));
		return this.transaction(
			"readwrite",
			(store) => {
				store.put(identity, "identity");
				if (photo === null) store.delete("photo");
				else if (photo) store.put(photo, "photo");
				return () => undefined;
			},
			signal,
		);
	}

	close() {
		void this.opening?.then((db) => db.close()).catch(() => {});
		this.opening = undefined;
	}
}
