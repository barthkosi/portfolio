import Nav from "@/components/interface/Nav";
import Footer from "@/components/interface/Footer";

export default function MainLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex flex-col items-center min-h-screen">
            <Nav />
            <main className="flex-1 mx-auto max-w-[1440px] p-4 md:p-8 w-full min-h-screen">
                {children}
            </main>
            <Footer />
        </div>
    );
}
