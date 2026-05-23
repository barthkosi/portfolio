import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

type BookIconProps = {
    className?: string;
};

export default function BookIcon({ className }: BookIconProps) {
    return (
        <span
            aria-hidden="true"
            className={cn("block h-full w-full bg-[var(--content-brand)]", className)}
            style={
                {
                    WebkitMask: "url('/icons/book.svg') center / contain no-repeat",
                    mask: "url('/icons/book.svg') center / contain no-repeat",
                } as CSSProperties
            }
        />
    );
}
