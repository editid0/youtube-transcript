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

async function fetchSearchResults(query) {
	const client = await pool.connect();
	try {
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
	} catch (error) {
		console.error("Error fetching search results:", error);
		throw error;
	} finally {
		client.release();
	}
}

function formatResult(text, queries) {
	// queries is an array of strings, bold all occurances of each query in the text
	let formattedText = text;
	queries.forEach((query) => {
		const regex = new RegExp(`(${query})`, "gi");
		formattedText = formattedText.replace(
			regex,
			`<strong class="text-primary">$1</strong>`
		);
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
	const results = await fetchSearchResults(query);
	const videos = findVideoIds({ results });
	const videoDetails = await Promise.all(
		videos.map((videoId) => getVideoDetails(videoId))
	);
	console.log(videoDetails);
	// Get a count of how many results each video has
	const videoResultCount = {};
	results.forEach((result) => {
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
				</p>
			</div>
		);
	}
	if (!results || results.length === 0) {
		return (
			<div className="flex items-center justify-center h-screen max-w-md mx-auto flex-col gap-4">
				<h1 className="text-center text-4xl">Search Results</h1>
				<p className="text-center text-accent-foreground">
					No results found for: <strong>{query}</strong>
				</p>
			</div>
		);
	}
	return (
		<div className="flex items-center h-screen max-w-md mx-auto flex-col gap-4">
			<h1 className="text-center text-4xl">Search Results</h1>
			<p className="text-center text-accent-foreground">
				Results for: <strong>{query}</strong>
			</p>
			{/* First get video details */}
			<div className="flex flex-col max-w-lg mx-auto w-full">
				{videoDetails.map((video) => (
					<Dialog key={video.yt_id}>
						<DialogTrigger asChild>
							<div className="w-full rounded-lg flex flex-row items-start gap-4 bg-muted cursor-pointer">
								<div className="my-2 ml-2">
									<img
										src={video.thumbnail}
										alt={video.title}
										className="w-auto max-h-24 rounded-sm"
									/>
								</div>
								<div className="flex flex-col justify-center mt-2">
									<h2 className="text-xl font-semibold">
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
									Lines mentioning: <strong>{query}</strong>
								</DialogTitle>
								<DialogDescription asChild>
									<div className="max-h-[30vh] overflow-y-auto">
										{results.map((result) => (
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
																		[query]
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
