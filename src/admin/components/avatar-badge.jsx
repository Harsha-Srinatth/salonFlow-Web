"use client";
import { Avatar } from "@/components/kit";

const SIZE = { sm: "sm", md: "md", lg: "lg" };

/** Initials avatar for people in admin lists (the kit Avatar: stable gradient per name). */
export function AvatarBadge({ name, src, size = "md", className }) {
  return <Avatar name={name || "?"} src={src} size={SIZE[size] ?? "md"} className={className} />;
}
