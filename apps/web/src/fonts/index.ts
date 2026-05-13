import localFont from "next/font/local";

/** Inter variable files live under `src/fonts/inter/` (OFL). */
export const inter = localFont({
  src: [
    {
      path: "./inter/Inter-VariableFont_opsz,wght.ttf",
      style: "normal",
      weight: "100 900",
    },
    {
      path: "./inter/Inter-Italic-VariableFont_opsz,wght.ttf",
      style: "italic",
      weight: "100 900",
    },
  ],
  display: "swap",
  variable: "--font-body",
});
