export type ShareOutcome = "shared" | "copied" | "cancelled" | "failed";

// The DOM types promise `navigator.share` everywhere; desktop Firefox and
// older browsers don't have it, so treat it as optional.
type ShareNavigator = { share?: Navigator["share"]; clipboard: Navigator["clipboard"] };

/** Opens the share sheet where there is one, otherwise copies the link. */
export async function shareOrCopy(data: { title: string; text: string; url: string }): Promise<ShareOutcome> {
  const nav: ShareNavigator = navigator;
  try {
    if (nav.share) {
      await nav.share(data);
      return "shared";
    }
    await nav.clipboard.writeText(`${data.text} ${data.url}`);
    return "copied";
  } catch (err: unknown) {
    return err instanceof DOMException && err.name === "AbortError" ? "cancelled" : "failed";
  }
}
