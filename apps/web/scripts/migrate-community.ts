import { readFile } from "node:fs/promises";
import { neon } from "@neondatabase/serverless";

const connection = process.env.DATABASE_URL;
if (!connection) throw new Error("DATABASE_URL is required.");
const sql = neon(connection);
const migration = await readFile(
	new URL("../migrations/001-community.sql", import.meta.url),
	"utf8",
);
await sql.transaction(
	migration
		.split(";")
		.map((statement) => statement.trim())
		.filter(Boolean)
		.map((statement) => sql.query(statement)),
);
console.log("Community migration applied.");
