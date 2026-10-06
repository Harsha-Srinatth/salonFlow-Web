import QRCode from "react-qr-code";
import { Check, Copy, MessageCircle, QrCode, Share2 } from "lucide-react";
import { useState } from "react";
import { copyText, DEFAULT_SHARE_TEXT, shareLink, whatsappShareHref } from "@/lib/referral";
import { notify } from "@/lib/notify";
import { haptic } from "@/components/motion/presets";
import { ResponsiveModal } from "./responsive-modal";

/**
 * Invite options in a sheet (dialog on desktop): native share, WhatsApp, copy link, QR code.
 * @param {{ open: boolean, onOpenChange: (o:boolean)=>void, link: string, code?: string, shareText?: string }} props
 */
export function InviteSheet({ open, onOpenChange, link, code, shareText = DEFAULT_SHARE_TEXT }) {
  const [copied, setCopied] = useState(false);
  const canShare = typeof navigator !== "undefined" && Boolean(navigator.share);
  const options = [
    canShare && {
      id: "share",
      icon: Share2,
      label: "Share",
      onClick: async () => {
        await shareLink({ url: link, text: shareText });
      },
    },
    { id: "whatsapp", icon: MessageCircle, label: "WhatsApp", href: whatsappShareHref(link, shareText) },
    {
      id: "copy",
      icon: copied ? Check : Copy,
      label: copied ? "Copied" : "Copy link",
      onClick: async () => {
        if (await copyText(link)) {
          haptic("success");
          setCopied(true);
          notify.success("Link copied");
          setTimeout(() => setCopied(false), 1800);
        } else notify.error("Couldn't copy the link");
      },
    },
  ].filter(Boolean);

  return (
    <ResponsiveModal open={open} onOpenChange={onOpenChange} title="Invite a friend" description="They get a welcome bonus, you earn when they visit." icon={QrCode} size="sm">
      <div className="mx-auto mt-1 w-fit rounded-3xl bg-white p-4 shadow-soft">
        <QRCode value={link || " "} size={176} fgColor="#0b1220" bgColor="#ffffff" aria-label="QR code for your invite link" />
      </div>
      {code ? <p className="mt-3 text-center font-mono text-lg font-bold tracking-[0.25em]">{code}</p> : null}
      <div className="mt-5 grid grid-cols-3 gap-2">
        {options.map(({ id, icon: Icon, label, onClick, href }) => {
          const cls = "flex flex-col items-center gap-2 rounded-2xl bg-card p-3 text-caption font-semibold ring-1 ring-inset ring-border/60 transition-colors hover:bg-muted";
          const inner = (
            <>
              <span className="grid size-11 place-items-center rounded-2xl bg-portal/12 text-portal">
                <Icon className="size-5" aria-hidden />
              </span>
              {label}
            </>
          );
          return href ? (
            <a key={id} href={href} target="_blank" rel="noopener noreferrer" className={cls}>
              {inner}
            </a>
          ) : (
            <button key={id} type="button" onClick={onClick} className={cls}>
              {inner}
            </button>
          );
        })}
      </div>
      <p className="mt-4 truncate rounded-xl bg-muted px-3 py-2 text-center text-caption text-ink-neutral">{link}</p>
    </ResponsiveModal>
  );
}
