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
	// Get the values from the queries table where ts is in the last 24 hours, ordering by occurrences of content
	try {
		const res = await client.query(
			"SELECT strict, content, ts FROM queries WHERE ts > NOW() - INTERVAL '24 hours';"
		);
		// Return the results as JSON
		if (res.rows.length === 0) {
			return new Response(JSON.stringify([]), {
				headers: { "Content-Type": "application/json" },
			});
		}
		return new Response(JSON.stringify(res.rows), {
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		console.error("Error fetching popular queries:", error);
		return new Response("Error fetching popular queries", { status: 500 });
	} finally {
		client.release();
	}
}
