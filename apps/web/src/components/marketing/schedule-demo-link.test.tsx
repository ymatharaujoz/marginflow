/** @vitest-environment jsdom */

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ScheduleDemoLink } from "./schedule-demo-link";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("ScheduleDemoLink", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("renders whatsapp link with phone env", () => {
    vi.stubEnv("NEXT_PUBLIC_WHATSAPP_PHONE", "5511999999999");

    const markup = renderToStaticMarkup(<ScheduleDemoLink className="btn" />);

    expect(markup).toContain('href="https://wa.me/5511999999999?text=Ol%C3%A1%2C%20gostaria%20de%20saber%20mais%20sobre%20a%20plataforma%20Lucreii."');
    expect(markup).toContain('target="_blank"');
    expect(markup).toContain("Fale conosco");
  });

  it("falls back to legacy whatsapp demo url env when phone is not set", () => {
    vi.stubEnv("NEXT_PUBLIC_WHATSAPP_DEMO_URL", "https://wa.me/5511888888888?text=legacy");

    const markup = renderToStaticMarkup(<ScheduleDemoLink className="btn" />);

    expect(markup).toContain('href="https://wa.me/5511888888888?text=legacy"');
  });

  it("renders disabled span when no whatsapp env is set and fallback is disabled", () => {
    const markup = renderToStaticMarkup(<ScheduleDemoLink className="btn" allowDemoFallback={false} />);

    expect(markup).not.toContain('href="https://wa.me');
    expect(markup).toContain("Fale conosco");
    expect(markup).toContain("cursor-not-allowed");
  });

  it("renders fallback demo anchor when no whatsapp env is set", () => {
    const markup = renderToStaticMarkup(<ScheduleDemoLink className="btn" />);

    expect(markup).not.toContain('href="https://wa.me');
    expect(markup).toContain('href="#demo"');
    expect(markup).toContain("Fale conosco");
  });
});
