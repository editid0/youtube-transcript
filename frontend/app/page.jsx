"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";

export default function Home() {
	const [query, setQuery] = useState("");
	const [isStrictMode, setIsStrictMode] = useState(false);
	const [size, setSize] = useState("Loading...");
	const [popularQueries, setPopularQueries] = useState([]);
	useEffect(() => {
		// Make a request to /api/size to get the size of the segments table
		fetch("/api/size", { next: { revalidate: 120 } })
			.then((response) => {
				if (!response.ok) {
					throw new Error("Network response was not ok");
				}
				return response.json();
			})
			.then((data) => {
				setSize(data);
			})
			.catch((error) => {
				console.error("Error fetching size:", error);
				setSize("Error fetching size");
			});
	}, []);
	useEffect(() => {
		// Fetch popular queries from the API
		fetch("/api/popular", { next: { revalidate: 120 } })
			.then((response) => {
				if (!response.ok) {
					throw new Error("Network response was not ok");
				}
				return response.json();
			})
			.then((data) => {
				var defaultQueries = [
					{ content: "CMS", strict: false },
					{ content: "Discover", strict: false },
				];
				if (data) {
					// Count how many times each query appears, then sort by occurrences
					const queryCount = data.reduce((acc, query) => {
						const key = `${query.content}-${query.strict}`;
						acc[key] = (acc[key] || 0) + 1;
						return acc;
					}, {});
					// Sort the queries by their occurrence count
					const sortedQueries = Object.entries(queryCount)
						.sort((a, b) => b[1] - a[1])
						.map((entry) => {
							const [key, count] = entry;
							const [content, strict] = key.split("-");
							return {
								content,
								strict: strict === "true",
								count,
							};
						});
					// Set the max 5 most popular queries
					setPopularQueries(sortedQueries.slice(0, 5));
				} else {
					setPopularQueries(defaultQueries);
				}
			})
			.catch((error) => {
				console.error("Error fetching popular queries:", error);
			});
	}, []);
	return (
		<>
			<div className="flex items-center justify-center h-screen max-w-md mx-auto flex-col gap-4">
				<h1 className="text-center text-4xl">
					YouTube Transcript Searcher
				</h1>
				<p className="text-center text-accent-foreground">
					Enter your search query, and we'll find videos mentioning
					your query.
				</p>
				<p className="text-sm text-muted-foreground text-center">
					Current size of database: {size}
				</p>
				<Input
					placeholder="Search..."
					value={query}
					onChange={(e) => setQuery(e.target.value || "")}
					onKeyDown={(e) => {
						if (e.key === "Enter" && query) {
							window.location.href = `/search?q=${encodeURIComponent(
								query
							)}&strict=${isStrictMode}`;
						}
					}}
				/>
				<div className="flex items-center gap-2">
					<Checkbox
						id="strict-mode"
						checked={isStrictMode}
						onCheckedChange={setIsStrictMode}
					/>
					<Tooltip>
						<TooltipTrigger>
							<Label htmlFor="strict-mode">Strict Mode</Label>
						</TooltipTrigger>
						<TooltipContent>
							<p>
								Only show results that contain all search terms.
							</p>
						</TooltipContent>
					</Tooltip>
				</div>
				<Button
					asChild
					disabled={!query}
					className={!query ? "opacity-50 cursor-not-allowed" : ""}
				>
					{!query ? (
						<p>Search</p>
					) : (
						<Link
							href={`/search?q=${encodeURIComponent(
								query
							)}&strict=${isStrictMode}`}
						>
							Search
						</Link>
					)}
				</Button>
				<div className="flex flex-col items-center gap-2 w-full">
					<p className="text-muted-foreground text-sm">
						Popular queries in the last 24h
					</p>
					<div className="flex flex-row items-center justify-center gap-2 w-full">
						{popularQueries.length > 0 ? (
							popularQueries.map((query, index) => (
								<Button
									key={index}
									variant="outline"
									size="sm"
									className={"capitalize cursor-pointer"}
									asChild
								>
									<Link
										href={`/search?q=${encodeURIComponent(
											query.content
										)}&strict=${query.strict}&src=popular`}
									>
										{query.content}
									</Link>
								</Button>
							))
						) : (
							<p className="text-muted-foreground text-sm">
								No popular queries found.
							</p>
						)}
					</div>
				</div>
				<p className="text-sm text-muted-foreground text-center">
					We recommend not using common words, such as "the", "is",
					and "in", as well as avoiding single letters, as they might
					return irrelevant results.
				</p>
				<Link
					href={"https://app.youform.com/forms/vfwgjtwu"}
					className="text-sm text-primary hover:underline"
					target="_blank"
					rel="noopener noreferrer"
				>
					Submit a video to transcribe
				</Link>
				<Link
					href={"https://app.youform.com/forms/ookrceiq"}
					className="text-sm text-primary hover:underline"
					target="_blank"
					rel="noopener noreferrer"
				>
					Feedback + Suggestions
				</Link>
			</div>
		</>
	);
}
