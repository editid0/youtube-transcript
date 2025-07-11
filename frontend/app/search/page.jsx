import moment from "moment/moment";
import Link from "next/link";
import { Pool } from "pg";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";

/**
 * YouTube Transcript Search
 *
 * Search Features:
 * - Regular search: Shows videos containing any of the search terms
 * - Strict mode: When enabled via the "strict=true" query parameter,
 *   only shows videos that contain at least one occurrence of each
 *   word in the search query
 *
 * Example:
 * - Regular search (/search?q=this is): Shows videos containing "this" OR "is"
 * - Strict search (/search?q=this is&strict=true): Only shows videos containing both "this" AND "is"
 */

const pool = new Pool({
	user: process.env.DB_USER,
	host: process.env.DB_HOST,
	database: process.env.DB_NAME,
	password: process.env.DB_PASS,
	port: 5432,
});

function formatTime(seconds) {
	// Convert seconds to 0h0m0s format, if hours are 0, omit them, if minutes are 0, omit them
	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	const secs = seconds % 60;
	let formatted = "";
	if (hours > 0) {
		formatted += `${hours}h`;
	}
	if (minutes > 0 || hours > 0) {
		formatted += `${minutes}m`;
	}
	formatted += `${secs}s`;
	return formatted;
}

function formatTimeReadable(seconds) {
	// Convert seconds to hh:mm:ss or mm:ss format
	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	const secs = seconds % 60;
	let formatted = "";
	if (hours > 0) {
		formatted += `${hours}:`;
	}
	formatted += `${minutes.toString().padStart(2, "0")}:${secs
		.toString()
		.padStart(2, "0")}`;
	return formatted;
}

async function fetchSearchResults(query, isStrictMode = false) {
	const client = await pool.connect();
	try {
		// Split the query into individual words
		const queryWords = query
			.trim()
			.split(/\s+/)
			.filter((word) => word.length > 0);

		// If there are multiple words, search for segments that contain any of the words
		if (queryWords.length > 1) {
			// Create a condition for each word with ILIKE
			const conditions = queryWords.map(
				(_, index) => `text ILIKE $${index + 1}`
			);
			const params = queryWords.map((word) => `%${word}%`);

			const res = await client.query(
				`SELECT id, video_id, text, start_time, end_time FROM segments WHERE ${conditions.join(
					" OR "
				)}`,
				params
			);

			if (res.rows.length === 0) {
				return [];
			}

			const results = res.rows.map((row) => ({
				id: row.id,
				video_id: row.video_id,
				text: row.text,
				start_time: row.start_time,
				end_time: row.end_time,
			}));

			// If strict mode is enabled, filter videos to only include those with at least one result for each query word
			if (isStrictMode && queryWords.length > 1) {
				// First, get all unique video IDs from the results
				const videoIds = [
					...new Set(results.map((result) => result.video_id)),
				];

				// Filter to only include videos that have at least one segment containing each query word
				const strictVideoIds = videoIds.filter((videoId) => {
					const videoSegments = results.filter(
						(result) => result.video_id === videoId
					);
					// Check if each query word appears in at least one segment of this video
					return queryWords.every((word) => {
						const escapedWord = word.replace(
							/[.*+?^${}()|[\]\\]/g,
							"\\$&"
						);
						const regex = new RegExp(escapedWord, "i");
						return videoSegments.some((segment) =>
							regex.test(segment.text)
						);
					});
				});

				// Filter results to only include segments from videos that passed the strict mode check
				return results.filter((result) =>
					strictVideoIds.includes(result.video_id)
				);
			}

			return results;
		} else {
			// Original query for a single word
			const res = await client.query(
				"SELECT id, video_id, text, start_time, end_time FROM segments WHERE text ILIKE $1",
				[`%${query}%`]
			);
			if (res.rows.length === 0) {
				return [];
			}
			return res.rows.map((row) => ({
				id: row.id,
				video_id: row.video_id,
				text: row.text,
				start_time: row.start_time,
				end_time: row.end_time,
			}));
		}
	} catch (error) {
		console.error("Error fetching search results:", error);
		throw error;
	} finally {
		client.release();
	}
}

function formatResult(text, queries) {
	// queries is an array of strings, bold all occurrences of each query in the text
	let formattedText = text;

	// For each query, split it into words if it contains spaces
	queries.forEach((query) => {
		const queryWords = query
			.trim()
			.split(/\s+/)
			.filter((word) => word.length > 0);

		// If query has multiple words, bold each word separately
		if (queryWords.length > 1) {
			queryWords.forEach((word) => {
				// Escape special regex characters in the word
				const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
				const regex = new RegExp(`(${escapedWord})`, "gi");
				formattedText = formattedText.replace(
					regex,
					`<strong class="text-primary">$1</strong>`
				);
			});
		} else {
			// Single word query - original behavior
			// Escape special regex characters in the query
			const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
			const regex = new RegExp(`(${escapedQuery})`, "gi");
			formattedText = formattedText.replace(
				regex,
				`<strong class="text-primary">$1</strong>`
			);
		}
	});
	return formattedText;
}

async function getVideoDetails(videoId) {
	const client = await pool.connect();
	try {
		const res = await client.query(
			"SELECT title, description, thumbnail, channel_name, upload_date, yt_id FROM videos WHERE yt_id = $1",
			[videoId]
		);
		if (res.rows.length === 0) {
			return null;
		}
		return {
			title: res.rows[0].title,
			thumbnail: res.rows[0].thumbnail,
			channel: res.rows[0].channel_name,
			upload_date: res.rows[0].upload_date,
			yt_id: res.rows[0].yt_id,
		};
	} catch (error) {
		console.error("Error fetching video details:", error);
		throw error;
	} finally {
		client.release();
	}
}

function findVideoIds({ results }) {
	// Take in a list of objects, with id and video_id properties, return a list of unique video_ids
	const videoIds = new Set();
	results.forEach((result) => {
		videoIds.add(result.video_id);
	});
	return Array.from(videoIds);
}

export default async function SearchPage({ searchParams }) {
	const query = searchParams.q || "";
	const isStrictMode = searchParams.strict === "true";

	if (!query) {
		return (
			<div className="flex items-center justify-center h-screen max-w-md mx-auto flex-col gap-4">
				<h1 className="text-center text-4xl">Search Results</h1>
				<p className="text-center text-accent-foreground">
					No search query provided.
				</p>
			</div>
		);
	}

	// Split the query into words for better formatting in results
	const queryWords = query
		.trim()
		.split(/\s+/)
		.filter((word) => word.length > 0);

	const results = await fetchSearchResults(query, isStrictMode);

	// Remove duplicate transcript segments (same text in the same video)
	const uniqueResults = [];
	const seenSegments = new Map(); // Map to track unique segments by video_id + text

	results.forEach((result) => {
		const key = `${result.video_id}_${result.text}`;
		if (!seenSegments.has(key)) {
			seenSegments.set(key, true);
			uniqueResults.push(result);
		}
	});

	const videos = findVideoIds({ results: uniqueResults });
	const videoDetails = await Promise.all(
		videos.map((videoId) => getVideoDetails(videoId))
	);

	// Get a count of how many results each video has
	const videoResultCount = {};
	uniqueResults.forEach((result) => {
		videoResultCount[result.video_id] =
			(videoResultCount[result.video_id] || 0) + 1;
	});

	// Order videoDetails by the number of results they have
	videoDetails.sort((a, b) => {
		return (
			(videoResultCount[b.yt_id] || 0) - (videoResultCount[a.yt_id] || 0)
		);
	});
	if (videos.length === 0) {
		return (
			<div className="flex items-center justify-center h-screen max-w-md mx-auto flex-col gap-4">
				<h1 className="text-center text-4xl">Search Results</h1>
				<p className="text-center text-accent-foreground">
					No results found for: <strong>{query}</strong>
					{isStrictMode && " (strict mode)"}
				</p>
			</div>
		);
	}
	if (!uniqueResults || uniqueResults.length === 0) {
		return (
			<div className="flex items-center justify-center h-screen max-w-md mx-auto flex-col gap-4">
				<h1 className="text-center text-4xl">Search Results</h1>
				<p className="text-center text-accent-foreground">
					No results found for: <strong>{query}</strong>
					{isStrictMode && " (strict mode)"}
				</p>
			</div>
		);
	}
	return (
		<div className="flex items-center h-screen max-w-md mx-auto flex-col gap-4">
			<h1 className="text-center text-4xl">Search Results</h1>
			<p className="text-center text-accent-foreground">
				Results for: <strong>{query}</strong>
				{isStrictMode && " (strict mode)"}
			</p>
			<p className="text-center text-muted-foreground text-sm">
				{uniqueResults.length} results found over {videoDetails.length}{" "}
				videos
			</p>
			{/* First get video details */}
			<div className="flex flex-col max-w-lg mx-auto w-full">
				{videoDetails.map((video) => (
					<Dialog key={video.yt_id}>
						<DialogTrigger asChild>
							<div className="w-full rounded-lg flex flex-row items-start gap-4 bg-muted cursor-pointer my-2">
								<div
									className="my-2 ml-2 w-40 aspect-video overflow-hidden relative flex-shrink-0"
									style={{ width: "160px", height: "90px" }} // 16:9 ratio, fixed size
								>
									<img
										src={video.thumbnail}
										alt={video.title}
										className="absolute inset-0 w-full h-full object-cover rounded-sm"
									/>
								</div>
								<div className="flex flex-col justify-center mt-2">
									<h2
										className="text-xl font-semibold truncate max-w-xs"
										style={{
											overflow: "hidden",
											textOverflow: "ellipsis",
											whiteSpace: "nowrap",
											maxWidth: "220px",
										}}
										title={video.title}
									>
										{video.title}
									</h2>
									<p className="text-sm text-muted-foreground">
										Channel: {video.channel}
									</p>
									<p className="text-sm text-muted-foreground">
										Uploaded:{" "}
										{moment(video.upload_date).fromNow()}
									</p>
									<p className="text-sm text-muted-foreground">
										Click to view details
									</p>
								</div>
							</div>
						</DialogTrigger>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>
									{video.title} - {video.channel}
								</DialogTitle>
								<DialogDescription asChild>
									<div className="max-h-[30vh] overflow-y-auto">
										{/* Show how many results found */}
										<p className="text-sm text-muted-foreground mb-2">
											{
												uniqueResults.filter(
													(result) =>
														result.video_id ===
														video.yt_id
												).length
											}{" "}
											results found
										</p>
										{uniqueResults.map((result) => (
											<div key={result.id}>
												{result.video_id ===
													video.yt_id && (
													<Link
														href={`https://youtu.be/${
															result.video_id
														}?t=${formatTime(
															result.start_time
														)}`}
														target="_blank"
													>
														<div className="border-2 rounded-md my-2 p-2 mr-1">
															<p
																dangerouslySetInnerHTML={{
																	__html: formatResult(
																		result.text,
																		queryWords.length >
																			1
																			? queryWords
																			: [
																					query,
																			  ]
																	),
																}}
															></p>
															<p className="text-sm text-muted-foreground">
																{formatTimeReadable(
																	result.start_time
																)}{" "}
																-{" "}
																{formatTimeReadable(
																	result.end_time
																)}
															</p>
														</div>
													</Link>
												)}
											</div>
										))}
									</div>
								</DialogDescription>
							</DialogHeader>
						</DialogContent>
					</Dialog>
				))}
			</div>
		</div>
	);
}
