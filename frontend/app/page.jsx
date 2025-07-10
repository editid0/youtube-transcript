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
				<Input
					placeholder="Search..."
					value={query}
					onChange={(e) => setQuery(e.target.value || "")}
				/>
				<Button asChild disabled={!query}>
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
