"use client";
import * as React from "react";
import * as SheetPrimitive from "@radix-ui/react-dialog";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";
const Sheet = SheetPrimitive.Root;
const SheetTrigger = SheetPrimitive.Trigger;
const SheetClose = SheetPrimitive.Close;
const SheetTitle = SheetPrimitive.Title;
const SheetDescription = SheetPrimitive.Description;
const sheetVariants = cva("fixed z-50 flex flex-col gap-4 bg-card text-card-foreground shadow-2xl outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-200 data-[state=open]:duration-300", {
    variants: {
        side: {
            bottom: "inset-x-0 bottom-0 max-h-[85vh] rounded-t-3xl p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
            right: "inset-y-0 right-0 h-full w-80 max-w-[90vw] p-5 data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
        },
    },
    defaultVariants: { side: "bottom" },
});
function SheetContent({ side = "bottom", className, children, ...props }) {
    return (<SheetPrimitive.Portal>
      <SheetPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"/>
      <SheetPrimitive.Content className={cn(sheetVariants({ side }), className)} {...props}>
        {side === "bottom" ? <div className="mx-auto h-1.5 w-10 shrink-0 rounded-full bg-muted-foreground/30"/> : null}
        {children}
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>);
}
export { Sheet, SheetTrigger, SheetClose, SheetContent, SheetTitle, SheetDescription };
