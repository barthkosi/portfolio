"use client";

import { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import LoadingScreen from "@/components/LoadingScreen";
import { useImagePreloader } from "@/hooks/useImagePreloader";
import heroMarqueeData from "@/data/heroMarquee.json";

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
    const [isLoading, setIsLoading] = useState(true);
    const [isContentReady, setIsContentReady] = useState(false);
    const [activeBlockers, setActiveBlockers] = useState<Set<string>>(new Set());

    const startLoading = useCallback(() => {
        setIsLoading(true);
        setIsContentReady(false);
    }, []);

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
    const preloadImages = [
        ...heroMarqueeData.map(item => item.image),
        "/globe.svg" // Add other critical static assets here
    ];

    const { progress, isComplete: isResourcesLoaded } = useImagePreloader(preloadImages);

    const completeLoading = useCallback(() => {
        setIsLoading(false);
        // Delay before content animations can start
        setTimeout(() => {
            setIsContentReady(true);
        }, 500); // Increased slightly to match LoadingScreen exit
    }, []);

    // Check if we can complete loading whenever blockers change or resources are loaded
    useEffect(() => {
        if (isLoading && activeBlockers.size === 0 && isResourcesLoaded) {
            // We wait for the LoadingScreen onComplete callback to actually trigger completeLoading
            // But we can use this effect to ensure we are ready state-wise
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
