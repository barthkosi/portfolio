"use client";

import React, { useState } from 'react';

export const MediaWrapper = ({
    children,
    aspectRatio = '16/9',
    className = "",
    fixedAspectRatio = false
}: {
    children: React.ReactNode,
    aspectRatio?: string,
    type?: 'image' | 'video',
    className?: string,
    fixedAspectRatio?: boolean
}) => {
    const [isLoaded, setIsLoaded] = useState(false);

    return (
        <span
            className={`block relative overflow-hidden rounded-[12px] w-full bg-[var(--background-secondary)] transition-all duration-300 ${!isLoaded ? 'shimmer-loading' : ''} ${className}`}
            style={{ aspectRatio: (isLoaded && !fixedAspectRatio) ? 'auto' : aspectRatio }}
        >
            <span className={`block w-full transition-opacity duration-500 ${isLoaded ? 'opacity-100 h-auto' : 'opacity-0 h-full'}`}>
                {React.isValidElement(children) ? React.cloneElement(children as React.ReactElement<any>, {
                    onLoad: () => setIsLoaded(true),
                    onLoadedData: () => setIsLoaded(true),
                }) : children}
            </span>
        </span>
    );
};
