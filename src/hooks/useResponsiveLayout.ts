"use client";

import { useState, useEffect } from 'react';

// Hook to get responsive column count and gutter
export function useResponsiveLayout() {
    const [layout, setLayout] = useState({ columnCount: 3, gutter: 16 });

    useEffect(() => {
        const updateLayout = () => {
            // lg breakpoint is 1024px, md breakpoint is 768px
            if (window.innerWidth >= 1024) {
                setLayout({ columnCount: 3, gutter: 16 });
            } else if (window.innerWidth >= 768) {
                setLayout({ columnCount: 2, gutter: 16 });
            } else {
                setLayout({ columnCount: 2, gutter: 12 });
            }
        };

        updateLayout();
        window.addEventListener("resize", updateLayout);
        return () => window.removeEventListener("resize", updateLayout);
    }, []);

    return layout;
}
