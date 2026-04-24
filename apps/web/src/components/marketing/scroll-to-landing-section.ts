export function scrollToLandingSection(elementId: string) {
  if (typeof document === "undefined") {
    return;
  }
  const el = document.getElementById(elementId);
  if (!el) {
    return;
  }
  const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
}
