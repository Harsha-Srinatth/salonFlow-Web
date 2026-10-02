"use client";
import { LoadingOrb } from "@/components/shared/loading-orb";

// Kept under the old names so every admin page shows the shared orb instead of grey placeholder blocks.
export function SkeletonRows({ className }) {
    return <LoadingOrb compact className={className} />;
}

export function SkeletonCards({ className }) {
    return <LoadingOrb compact className={className} />;
}
