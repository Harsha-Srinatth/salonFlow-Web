"use client";
import { CircleAlert, CircleCheck, Info, LoaderCircle, TriangleAlert } from "lucide-react";
import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";
const chip = (tone, Icon, spin) => (<span className={`grid size-8 place-items-center rounded-full ${tone}`}>
    <Icon className={`size-4 ${spin ? "animate-spin" : ""}`}/>
  </span>);
const Toaster = ({ ...props }) => {
    const { theme = "system" } = useTheme();
    return (<Sonner theme={theme} className="toaster group" position="top-right" closeButton duration={4500} gap={10} visibleToasts={3} offset={{ top: "var(--toast-top, 24px)", right: 24 }} mobileOffset={{ top: "var(--toast-top, 16px)", left: 16, right: 16 }} icons={{
            success: chip("bg-success/15 text-success", CircleCheck),
            error: chip("bg-destructive/15 text-destructive", CircleAlert),
            warning: chip("bg-warning/20 text-warning", TriangleAlert),
            info: chip("bg-primary/15 text-primary", Info),
            loading: chip("bg-muted text-muted-foreground", LoaderCircle, true),
        }} toastOptions={{
            classNames: {
                toast: "items-center! gap-3! rounded-2xl! border-transparent! p-4! shadow-xl! shadow-black/10!",
                icon: "m-0! size-8! shrink-0!",
                title: "text-sm! font-semibold! leading-5!",
                description: "mt-0.5! text-[13px]! leading-5! text-muted-foreground!",
                actionButton: "h-8! shrink-0! rounded-lg! bg-primary! px-3! text-xs! font-semibold! text-primary-foreground!",
                cancelButton: "h-8! shrink-0! rounded-lg! bg-muted! px-3! text-xs! font-medium! text-muted-foreground!",
                closeButton: "border-border! bg-popover! text-muted-foreground!",
            },
        }} style={{
            "--normal-bg": "hsl(var(--popover))",
            "--normal-text": "hsl(var(--popover-foreground))",
            "--normal-border": "hsl(var(--border))",
        }} {...props}/>);
};
export { Toaster };
