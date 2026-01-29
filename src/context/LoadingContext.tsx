"use client";

import { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import LoadingScreen from "@/components/LoadingScreen";
import { useImagePreloader } from "@/hooks/useImagePreloader";
import heroMarqueeData from "@/data/heroMarquee.json";
import booksData from "@/data/books.json";
import illustrationsData from "@/data/illustrations.json";
import { usePathname } from 'next/navigation';

interface LoadingContextType {
    isLoading: boolean;
    isContentReady: boolean;
    completeLoading: () => void;
    startLoading: () => void;
    addBlocker: (key: string) => void;
    removeBlocker: (key: string) => void;
    isBlocked: boolean;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export function LoadingProvider({ children }: { children: ReactNode }) {
    const pathname = usePathname();

    // Determine if we should show the loading screen based on the path
    // We want to skip it for individual post pages
    const isPostPage = pathname?.startsWith('/writing/') ||
        pathname?.startsWith('/work/') ||
        pathname?.startsWith('/explorations/');

    // Also check if it's the home page for specific preloading
    const isHomePage = pathname === '/';

    // Initialize loading state based on route
    const [isLoading, setIsLoading] = useState(!isPostPage);
    const [isContentReady, setIsContentReady] = useState(isPostPage);
    const [activeBlockers, setActiveBlockers] = useState<Set<string>>(new Set());

    const startLoading = useCallback(() => {
        // Don't start loading if we are on a post page
        if (!isPostPage) {
            setIsLoading(true);
            setIsContentReady(false);
        }
    }, [isPostPage]);

    const addBlocker = useCallback((key: string) => {
        setActiveBlockers(prev => {
            const newSet = new Set(prev);
            newSet.add(key);
            return newSet;
        });
    }, []);

    const removeBlocker = useCallback((key: string) => {
        setActiveBlockers(prev => {
            const newSet = new Set(prev);
            newSet.delete(key);
            return newSet;
        });
    }, []);

    // List of critical images to preload
    // Only preload hero marquee images on the home page
    const preloadImages = [
        ...(isHomePage ? heroMarqueeData.map(item => item.image) : []),
        ...(pathname === '/reading-list' ? booksData.map(item => item.image) : []),
        ...(pathname === '/illustrations' ? illustrationsData.map(item => item.image) : []),
        // Preload favicons
        "https://res.cloudinary.com/barthkosi/image/upload/favicon-light.png",
        "https://res.cloudinary.com/barthkosi/image/upload/favicon-dark.png"
    ];

    const { progress, isComplete: isResourcesLoaded } = useImagePreloader(preloadImages);

    const completeLoading = useCallback(() => {
        setIsLoading(false);
        // Delay before content animations can start
        setTimeout(() => {
            setIsContentReady(true);
        }, 500); // Increased slightly to match LoadingScreen exit
    }, []);

    // Reset loading state when pathname changes
    useEffect(() => {
        if (isPostPage) {
            setIsLoading(false);
            setIsContentReady(true);
        } else {
            // Trigger loading for non-post pages
            setIsLoading(true);
            setIsContentReady(false);
        }
    }, [pathname, isPostPage]);

    // Check if we can complete loading whenever blockers change or resources are loaded
    useEffect(() => {
        if (isLoading && activeBlockers.size === 0 && isResourcesLoaded) {
            // If resources are legally loaded (even effectively instantly), we can proceed
            // The LoadingScreen component itself usually handles the minimum display time
            // causing the onComplete to fire, which then calls completeLoading.
            // So we don't need to force completeLoading here usually, but we need to ensure
            // the Logic flows correctly if the preloader finishes instantly.
        }
    }, [activeBlockers, isLoading, isResourcesLoaded]);

    return (
        <LoadingContext.Provider value={{
            isLoading,
            isContentReady,
            completeLoading,
            startLoading,
            addBlocker,
            removeBlocker,
            isBlocked: activeBlockers.size > 0
        }}>
            {isLoading && (
                <LoadingScreen
                    progress={progress}
                    onComplete={() => {
                        if (activeBlockers.size === 0) {
                            completeLoading();
                        }
                    }}
                />
            )}
            <div className={isLoading ? "opacity-0" : "opacity-100 transition-opacity duration-500"}>
                {children}
            </div>
        </LoadingContext.Provider>
    );
}

export function useLoading() {
    const context = useContext(LoadingContext);
    if (context === undefined) {
        throw new Error('useLoading must be used within a LoadingProvider');
    }
    return context;
}
