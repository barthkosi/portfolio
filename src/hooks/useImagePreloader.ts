"use client";

import { useState, useEffect, useCallback, useRef } from 'react';

export function useImagePreloader(imageUrls: string[]) {
    const [progress, setProgress] = useState(0);
    const [isComplete, setIsComplete] = useState(false);
    const loadedCountRef = useRef(0);
    const totalRef = useRef(imageUrls.length);

    const reset = useCallback(() => {
        loadedCountRef.current = 0;
        setProgress(0);
        setIsComplete(false);
    }, []);

    useEffect(() => {
        if (imageUrls.length === 0) {
            setProgress(100);
            setIsComplete(true);
            return;
        }

        totalRef.current = imageUrls.length;
        loadedCountRef.current = 0;

        const loadImage = (src: string): Promise<void> => {
            return new Promise((resolve) => {
                const img = new Image();
                img.onload = () => {
                    loadedCountRef.current += 1;
                    const newProgress = Math.round((loadedCountRef.current / totalRef.current) * 100);
                    setProgress(newProgress);
                    resolve();
                };
                img.onerror = () => {
                    // Still count failed images to avoid stuck loading
                    loadedCountRef.current += 1;
                    const newProgress = Math.round((loadedCountRef.current / totalRef.current) * 100);
                    setProgress(newProgress);
                    resolve();
                };
                img.src = src;
            });
        };

        Promise.all(imageUrls.map(loadImage)).then(() => {
            setIsComplete(true);
        });
    }, [imageUrls]);

    return { progress, isComplete, reset };
}
