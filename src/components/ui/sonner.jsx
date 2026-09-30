"use client";
import { CircleAlert, CircleCheck, Info, LoaderCircle, TriangleAlert } from "lucide-react";
import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";
const Toaster = ({ ...props }) => {
    const { theme = "system" } = useTheme();
    return (<Sonner theme={theme} className="toaster group" position="top-right" closeButton duration={4500} gap={10} icons={{
            success: <CircleCheck className="size-5 text-success"/>,
            error: <CircleAlert className="size-5 text-destructive"/>,
            warning: <TriangleAlert className="size-5 text-warning"/>,
            info: <Info className="size-5 text-primary"/>,
            loading: <LoaderCircle className="size-5 animate-spin text-muted-foreground"/>,
        }} toastOptions={{
            classNames: {
                toast: "items-start! gap-3! rounded-2xl! border-border! p-4! shadow-xl! shadow-black/10!",
                icon: "mt-0.5!",
                title: "text-sm! font-semibold! leading-5!",
                description: "mt-0.5! text-[13px]! leading-5! text-muted-foreground!",
                actionButton: "h-8! shrink-0! self-center! rounded-lg! bg-primary! px-3! text-xs! font-semibold! text-primary-foreground!",
                cancelButton: "h-8! shrink-0! self-center! rounded-lg! bg-muted! px-3! text-xs! font-medium! text-muted-foreground!",
                closeButton: "border-border! bg-popover! text-muted-foreground! hover:text-foreground!",
            },
        }} style={{
            // The theme tokens are bare HSL triplets, so they need wrapping to be colours.
            "--normal-bg": "hsl(var(--popover))",
            "--normal-text": "hsl(var(--popover-foreground))",
            "--normal-border": "hsl(var(--border))",
        }} {...props}/>);
};
export { Toaster };
