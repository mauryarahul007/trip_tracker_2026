// Shares plain text through the phone's share sheet; where there isn't one
// (desktop browsers), copies it and opens WhatsApp with it pre-filled.
export async function shareTextOrWhatsApp(title: string, text: string): Promise<void> {
  const copy = () => { void navigator.clipboard?.writeText(text).catch(() => {}); };
  if (navigator.share) {
    try {
      await navigator.share({ title, text });
    } catch (err) {
      if ((err as Error).name !== 'AbortError') copy();
    }
    return;
  }
  copy();
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
}
