import { strict as assert } from "node:assert";
import { randomUUID } from "node:crypto";
import { findDesign } from "@crafter-station/badge-studio-design/catalog";
import {
	COMMUNITY_PREPARATION_TTL,
	type CommunityIntent,
	canonicalJson,
	communitySnapshotSchema,
	createPublicationSecret,
	publicParticipant,
} from "../src/lib/community-contract";
import {
	approvePublication,
	authorizePublication,
	cancelPublication,
	commitPublication,
	communityDb,
	getPublication,
	grantForSecret,
	secretKey,
	sha256,
	stagePublication,
} from "../src/lib/community-store";
import { demoParticipantForDesign } from "../src/lib/studio-participant";

const owner = `community-test:${randomUUID()}`;
const actor = {
	ownerId: owner,
	sessionId: `session:${randomUUID()}`,
	authorName: "Integration test",
};
const design = findDesign("noche-abierta");
if (!design) throw new Error("Missing Noche Abierta.");
const snapshot = communitySnapshotSchema.parse({
	format: 1,
	design,
	participant: publicParticipant(demoParticipantForDesign(design)),
	images: { portrait: sha256("fake fixture image; no provider claim"), artwork: null },
});
const cases: string[] = [];
const secretHashes: string[] = [];
async function prepare(
	target?: { publicationId: string; expectedVersion: number },
	withdrawal = false,
) {
	const secret = createPublicationSecret();
	secretHashes.push(secretKey(secret));
	const base = {
		operationId: randomUUID(),
		snapshotHash: sha256(canonicalJson(snapshot)),
		title: snapshot.design.name,
		participantName: snapshot.participant.name,
	};
	const intent: CommunityIntent = target
		? { ...base, ...target, action: withdrawal ? "withdraw" : "update" }
		: { ...base, action: "create" };
	await authorizePublication(actor, secretKey(secret), intent);
	if (!withdrawal) await stagePublication(secret, snapshot);
	return { secret, intent };
}
async function media(operationId: string) {
	await communityDb().query(
		"INSERT INTO community_media (id,operation_id,slot,input_hash,output_hash,provider_key,bytes,state) VALUES ($1,$2,'portrait',$3,$3,'test-only-never-fetch',10,'ready')",
		[randomUUID(), operationId, snapshot.images.portrait],
	);
}
try {
	const first = await prepare();
	await assert.rejects(() => commitPublication(first.secret, snapshot), /REVIEW_REQUIRED/);
	await assert.rejects(
		() => approvePublication(actor, first.intent.operationId, first.intent.snapshotHash),
		/imágenes/,
	);
	assert.equal((await grantForSecret(first.secret))?.approved_at, null);
	cases.push("No public commit before approval or complete media");
	await authorizePublication(actor, secretKey(first.secret), first.intent);
	await assert.rejects(
		() =>
			authorizePublication(actor, secretKey(first.secret), { ...first.intent, title: "Changed" }),
		/otra autorización/,
	);
	cases.push("Immutable mint and idempotent authorization");
	await media(first.intent.operationId);
	const created = await approvePublication(
		actor,
		first.intent.operationId,
		first.intent.snapshotHash,
	);
	assert.deepEqual((await cancelPublication(first.secret)).receipt, created);
	cases.push("Cancel after commit returns the durable receipt instead of false cancellation");
	const duplicate = await Promise.all(
		Array.from({ length: 4 }, () => commitPublication(first.secret, snapshot)),
	);
	assert(duplicate.every((receipt) => receipt.id === created.id && receipt.version === 1));
	cases.push("Concurrent identical retries produce one publication");
	await assert.rejects(
		() =>
			commitPublication(first.secret, {
				...snapshot,
				participant: { ...snapshot.participant, name: "Changed" },
			}),
		/SNAPSHOT_CONFLICT/,
	);
	cases.push("Changed retry body rejected after committed receipt");
	const target = { publicationId: created.id, expectedVersion: 1 };
	await assert.rejects(
		() =>
			authorizePublication(
				{ ...actor, ownerId: `stranger:${randomUUID()}` },
				secretKey(createPublicationSecret()),
				{
					...first.intent,
					...target,
					operationId: randomUUID(),
					action: "update",
				},
			),
		/Solo el autor/,
	);
	cases.push("A different owner cannot authorize an update");
	const updates = await Promise.all([prepare(target), prepare(target)]);
	await Promise.all(updates.map((value) => media(value.intent.operationId)));
	const raced = await Promise.allSettled(
		updates.map((value) =>
			approvePublication(actor, value.intent.operationId, value.intent.snapshotHash),
		),
	);
	assert.equal(raced.filter((result) => result.status === "fulfilled").length, 1);
	assert.equal((await getPublication(created.id)).version, 2);
	cases.push("Competing version updates have exactly one winner");
	const withdrawal = await prepare({ publicationId: created.id, expectedVersion: 2 }, true);
	const removed = await approvePublication(
		actor,
		withdrawal.intent.operationId,
		withdrawal.intent.snapshotHash,
	);
	assert.equal(removed.state, "withdrawn");
	await assert.rejects(() => getPublication(created.id), /No encontramos/);
	await communityDb().query(
		"UPDATE community_grants SET expires_at=now()-interval '1 hour' WHERE operation_id=$1",
		[first.intent.operationId],
	);
	assert.equal((await commitPublication(first.secret, snapshot)).state, "withdrawn");
	cases.push("Historical expired retry cannot resurrect withdrawn publication");
	const expired = await prepare();
	await communityDb().query(
		"UPDATE community_grants SET expires_at=now()-interval '1 second' WHERE operation_id=$1",
		[expired.intent.operationId],
	);
	await assert.rejects(() => stagePublication(expired.secret, snapshot), /EXPIRED/);
	cases.push("Expired unconsumed authorization refuses new work");
	const cancelled = await prepare();
	await media(cancelled.intent.operationId);
	assert.equal((await cancelPublication(cancelled.secret)).state, "cancelled");
	await assert.rejects(
		() => approvePublication(actor, cancelled.intent.operationId, cancelled.intent.snapshotHash),
		/CANCELLED/,
	);
	await assert.rejects(() => stagePublication(cancelled.secret, snapshot), /CANCELLED/);
	await assert.rejects(
		() => authorizePublication(actor, secretKey(cancelled.secret), cancelled.intent),
		/CANCELLED/,
	);
	assert.equal((await grantForSecret(cancelled.secret))?.snapshot, null);
	cases.push("Cancelled preparation cannot be approved, staged, or reauthorized");
	const unmintedSecret = createPublicationSecret();
	secretHashes.push(secretKey(unmintedSecret));
	await cancelPublication(unmintedSecret);
	await assert.rejects(
		() =>
			authorizePublication(actor, secretKey(unmintedSecret), {
				...first.intent,
				operationId: randomUUID(),
			}),
		/CANCELLED/,
	);
	cases.push("Cancellation before authorization is durable");
	for (let attempt = 0; attempt < 3; attempt++) {
		const secret = createPublicationSecret();
		secretHashes.push(secretKey(secret));
		const intent = { ...first.intent, operationId: randomUUID() };
		await Promise.allSettled([
			authorizePublication(actor, secretKey(secret), intent),
			cancelPublication(secret),
		]);
		await assert.rejects(
			() => stagePublication(secret, snapshot),
			/CANCELLED|AUTHORIZATION_REQUIRED/,
		);
		await assert.rejects(() => authorizePublication(actor, secretKey(secret), intent), /CANCELLED/);
	}
	cases.push("Concurrent authorization and cancellation never leave a live grant");
	const expiredSecret = createPublicationSecret(Date.now() - COMMUNITY_PREPARATION_TTL - 10_000);
	const expiredKey = secretKey(expiredSecret);
	secretHashes.push(expiredKey);
	await communityDb().query(
		"INSERT INTO community_cancellations(secret_hash,expires_at) VALUES($1,now()-interval '1 second')",
		[expiredKey],
	);
	const freshSecret = createPublicationSecret();
	secretHashes.push(secretKey(freshSecret));
	await cancelPublication(freshSecret);
	assert.equal(
		(
			await communityDb().query("SELECT 1 FROM community_cancellations WHERE secret_hash=$1", [
				expiredKey,
			])
		).rowCount,
		0,
	);
	await assert.rejects(
		() => authorizePublication(actor, expiredKey, { ...first.intent, operationId: randomUUID() }),
		/EXPIRED/,
	);
	await cancelPublication(expiredSecret);
	assert.equal(
		(
			await communityDb().query("SELECT 1 FROM community_cancellations WHERE secret_hash=$1", [
				expiredKey,
			])
		).rowCount,
		0,
	);
	cases.push("Pruning expired cancellation records cannot replay the expired authorization key");
	const cappedKeys = Array.from({ length: 200 }, () => secretKey(createPublicationSecret()));
	secretHashes.push(...cappedKeys);
	await communityDb().query(
		"INSERT INTO community_cancellations(secret_hash,expires_at) SELECT k,now()+interval '1 hour' FROM unnest($1::text[]) AS k",
		[cappedKeys],
	);
	await assert.rejects(() => cancelPublication(createPublicationSecret()), /RATE_LIMITED/);
	assert.equal((await cancelPublication(freshSecret)).state, "cancelled");
	cases.push(
		"Anonymous cancellation rate is bounded while repeated cancellation remains idempotent",
	);

	console.log(
		JSON.stringify(
			{
				passed: cases.length,
				cases,
				scope: "Real Neon transactions; fixture media, no provider or Clerk HTTP claim.",
			},
			null,
			2,
		),
	);
} finally {
	await communityDb().query("DELETE FROM community_publications WHERE owner_id=$1", [owner]);
	await communityDb().query(
		"DELETE FROM community_media WHERE operation_id IN (SELECT operation_id FROM community_grants WHERE owner_id=$1)",
		[owner],
	);
	await communityDb().query("DELETE FROM community_grants WHERE owner_id=$1", [owner]);
	await communityDb().query(
		"DELETE FROM community_cancellations WHERE secret_hash=ANY($1::text[])",
		[secretHashes],
	);
	await communityDb().end();
}
