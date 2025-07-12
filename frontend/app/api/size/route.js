import { Pool } from "pg";

const pool = new Pool({
	user: process.env.DB_USER,
	host: process.env.DB_HOST,
	database: process.env.DB_NAME,
	password: process.env.DB_PASS,
	port: 5432,
});

export async function GET({ request }) {
	const client = await pool.connect();
	try {
		const res = await client.query(
			"SELECT pg_size_pretty (pg_relation_size('segments')) as size;"
		);
		// Return the size of the segments table
		if (res.rows.length === 0) {
			return new Response("No data found", { status: 404 });
		}
		// Assuming the size is in the first row and first column
		return new Response(JSON.stringify(res.rows[0].size), {
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		console.error("Error fetching video data:", error);
		return new Response("Error fetching video data", { status: 500 });
	} finally {
		client.release();
	}
}
