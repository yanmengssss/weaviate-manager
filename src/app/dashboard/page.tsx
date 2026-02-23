export default function DashboardOverviewPage() {
    return (
        <div className="h-full flex flex-col items-center justify-center text-center py-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-primary/5 p-6 rounded-full mb-6 ring-8 ring-primary/5">
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="48"
                    height="48"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-primary opacity-80"
                >
                    <ellipse cx="12" cy="5" rx="9" ry="3" />
                    <path d="M3 5V19A9 3 0 0 0 21 19V5" />
                    <path d="M3 12A9 3 0 0 0 21 12" />
                </svg>
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground mb-4">
                Database Connected
            </h2>
            <p className="text-muted-foreground max-w-lg text-lg mb-8">
                Welcome to Weaviate Manager. Select a class from the sidebar to view and manage its data objects, or create a new Schema Class to get started.
            </p>
        </div>
    );
}
