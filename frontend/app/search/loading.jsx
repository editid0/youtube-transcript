import { LoaderCircle } from "lucide-react";

export default function LoadingPage() {
	return (
		<div className="flex items-center justify-center h-screen flex-col gap-4">
			<LoaderCircle className="animate-spin h-10 w-10 text-primary" />
			<p className="ml-4 text-lg text-gray-700">Loading...</p>
			<p>
				It can take a while to find results, especially for complex
				queries.
			</p>
		</div>
	);
}
