"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useState } from "react";

export default function Home() {
	const [query, setQuery] = useState("");
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
				<Input
					placeholder="Search..."
					value={query}
					onChange={(e) => setQuery(e.target.value || "")}
				/>
				<Button
					asChild
					disabled={!query}
					className={!query ? "opacity-50 cursor-not-allowed" : ""}
				>
					{!query ? (
						<p>Search</p>
					) : (
						<Link href={`/search?q=${encodeURIComponent(query)}`}>
							Search
						</Link>
					)}
				</Button>
			</div>
		</>
	);
}
