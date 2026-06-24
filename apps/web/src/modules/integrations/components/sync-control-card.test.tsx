/** @vitest-environment jsdom */

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SyncControlCard } from "./sync-control-card";
import type { SyncStatusResponse } from "../types/integrations";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function mount(node: React.ReactNode) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => root.render(node));
  return {
    container,
    cleanup: () => act(() => root.unmount()),
  };
}

function buildSyncStatus(): SyncStatusResponse {
  return {
    activeRun: null,
    availability: {
      canRun: true,
      currentWindowKey: null,
      currentWindowLabel: null,
      currentWindowSlot: null,
      lastSuccessfulSyncAt: "2026-06-21T10:00:00.000Z",
      message: "Pronto para sincronizar.",
      nextAvailableAt: null,
      provider: "mercadolivre",
      reason: "available",
    },
    lastCompletedRun: null,
  };
}

const baseProps = {
  endDate: "2026-06-22",
  isLoading: false,
  isSyncing: false,
  onEndDateChange: vi.fn(),
  onStartDateChange: vi.fn(),
  onSyncClick: vi.fn(),
  startDate: "2026-06-15",
  syncStatus: buildSyncStatus(),
};

afterEach(() => {
  document.body.innerHTML = "";
  vi.clearAllMocks();
});

describe("SyncControlCard", () => {
  it("does not render the alert banner when there is no range error", () => {
    const { container } = mount(<SyncControlCard {...baseProps} rangeError={null} />);

    expect(container.querySelector('[role="alert"]')).toBeNull();
  });

  it("renders the premium error banner when rangeError is provided and dates are selected", () => {
    const { container } = mount(
      <SyncControlCard
        {...baseProps}
        rangeError="Período manual deve ficar dentro dos últimos 30 dias."
      />,
    );

    const alert = container.querySelector('[role="alert"]');
    expect(alert).not.toBeNull();
    expect(alert?.getAttribute("id")).toBe("manual-sync-range-error");
    expect(alert?.getAttribute("aria-live")).toBe("polite");

    const text = container.textContent ?? "";
    expect(text).toContain("Fora da janela de 30 dias");
    expect(text).toContain(
      "Período manual deve ficar dentro dos últimos 30 dias.",
    );
    expect(text).toContain(
      "Selecione datas mais recentes, dentro da janela permitida.",
    );
  });

  it("marks the date inputs as aria-invalid and links them to the banner when an error is active", () => {
    const { container } = mount(
      <SyncControlCard
        {...baseProps}
        rangeError="Período manual não pode ultrapassar 1 mês."
      />,
    );

    const startInput = container.querySelector<HTMLInputElement>(
      "#manual-sync-start",
    );
    const endInput = container.querySelector<HTMLInputElement>(
      "#manual-sync-end",
    );

    expect(startInput).not.toBeNull();
    expect(endInput).not.toBeNull();
    expect(startInput?.getAttribute("aria-invalid")).toBe("true");
    expect(endInput?.getAttribute("aria-invalid")).toBe("true");
    expect(startInput?.getAttribute("aria-describedby")).toBe(
      "manual-sync-range-error",
    );
    expect(endInput?.getAttribute("aria-describedby")).toBe(
      "manual-sync-range-error",
    );
    expect(startInput?.className ?? "").toContain("border-error");
    expect(endInput?.className ?? "").toContain("border-error");
  });

  it("does not mark inputs as invalid when no range error is present", () => {
    const { container } = mount(<SyncControlCard {...baseProps} rangeError={null} />);

    const startInput = container.querySelector<HTMLInputElement>(
      "#manual-sync-start",
    );
    const endInput = container.querySelector<HTMLInputElement>(
      "#manual-sync-end",
    );

    expect(startInput?.getAttribute("aria-invalid")).toBe("false");
    expect(endInput?.getAttribute("aria-invalid")).toBe("false");
    expect(startInput?.getAttribute("aria-describedby")).toBeNull();
    expect(endInput?.getAttribute("aria-describedby")).toBeNull();
  });

  it("does not render the banner when rangeError exists but no dates are selected", () => {
    const { container } = mount(
      <SyncControlCard
        {...baseProps}
        endDate=""
        rangeError="Selecione data inicial e final."
        startDate=""
      />,
    );

    expect(container.querySelector('[role="alert"]')).toBeNull();
  });

  it("invokes the change handlers when date inputs change", () => {
    const onStartDateChange = vi.fn();
    const onEndDateChange = vi.fn();
    const { container } = mount(
      <SyncControlCard
        {...baseProps}
        onEndDateChange={onEndDateChange}
        onStartDateChange={onStartDateChange}
        rangeError={null}
      />,
    );

    const startInput = container.querySelector<HTMLInputElement>(
      "#manual-sync-start",
    );
    const endInput = container.querySelector<HTMLInputElement>(
      "#manual-sync-end",
    );

    function setValue(input: HTMLInputElement | null, value: string) {
      if (!input) return;
      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )?.set;
      nativeSetter?.call(input, value);
      act(() => {
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
      });
    }

    setValue(startInput, "2026-06-10");
    setValue(endInput, "2026-06-20");

    expect(onStartDateChange).toHaveBeenCalledWith("2026-06-10");
    expect(onEndDateChange).toHaveBeenCalledWith("2026-06-20");
  });
});
