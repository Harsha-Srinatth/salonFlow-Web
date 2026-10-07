import { LandingStatusPage } from "@/components/kit-extra/landing-status-page";

/** Any unknown URL. "Go home" lands on / which sends signed-in people to their own portal. */
export default function NotFoundPage() {
  return <LandingStatusPage kind="notFound" />;
}
