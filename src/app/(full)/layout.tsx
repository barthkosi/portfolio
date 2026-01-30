import Nav from "@/components/interface/Nav";

export default function FullLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="relative w-full h-screen overflow-hidden">
            <div className="absolute top-0 left-0 w-full z-10">
                <Nav />
            </div>
            <main className="absolute inset-0 w-full h-full z-0 overflow-hidden">
                {children}
            </main>
        </div>
    );
}
