import Nav from "@/components/Nav";
import Footer from "@/components/Footer";

export default function AltLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex flex-col items-center min-h-screen">
            <Nav />
            <main className="flex-1 mx-auto max-w-[1440px] w-full min-h-screen">
                {children}
            </main>
            <Footer />
        </div>
    );
}
