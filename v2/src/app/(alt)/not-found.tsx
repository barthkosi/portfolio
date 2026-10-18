import NotFoundContent from "@/components/pages/NotFoundContent";

// Rendered inside AltLayout, which already provides Nav and Footer.
export default function AltNotFound() {
  return (
    <div className="p-4 md:p-8">
      <NotFoundContent />
    </div>
  );
}
