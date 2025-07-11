import { LoaderCircle } from "lucide-react";

export default function LoadingPage() {
	return (
		<div className="flex items-center justify-center h-screen flex-col gap-4">
			<LoaderCircle className="animate-spin h-10 w-10 text-primary" />
			<p className="ml-4 text-lg text-muted-foreground">Loading...</p>
			<p className="text-center text-sm text-muted-foreground">
				It can take a while to find results, especially for complex
				queries.
			</p>
		</div>
	);
}
