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
				<p className="text-sm text-muted-foreground text-center">
					We recommend not using common words, such as "the", "is",
					and "in", as well as avoiding single letters, as they might
					return irrelevant results.
				</p>
				<Link
					href={"https://app.youform.com/forms/vfwgjtwu"}
					className="text-sm text-primary hover:underline"
				>
					Submit a video to transcribe
				</Link>
			</div>
		</>
	);
}
