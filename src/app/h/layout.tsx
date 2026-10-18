import type { Metadata } from "next";

// Huddle links are private by default: keep them out of search results.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function HuddleLayout({ children }: LayoutProps<"/h">) {
  return children;
}
