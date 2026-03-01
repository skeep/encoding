import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

import { queueApi } from "../../api/queueApi";
import { QueueDashboard } from "./QueueDashboard";

describe("QueueDashboard", () => {
  it("renders queue tabs and table rows", async () => {
    render(<QueueDashboard />);
    expect(screen.getByRole("tab", { name: /Encoding Queue/i })).toBeInTheDocument();
    expect(await screen.findByRole("cell", { name: "APP-2026-0001" })).toBeInTheDocument();
  });

  it("switches tab and loads encoding detail content", async () => {
    const user = userEvent.setup();
    render(<QueueDashboard />);

    await user.click(screen.getByRole("tab", { name: /Encoding Completed/i }));
    expect(await screen.findByRole("cell", { name: "APP-2026-0004" })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /Save Adjustments & Trigger Decision/i })).toBeInTheDocument();
  });

  it("shows decision summary when decision completed tab selected", async () => {
    const user = userEvent.setup();
    render(<QueueDashboard />);

    await user.click(screen.getByRole("tab", { name: /Decision Completed/i }));
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Decision Completed", level: 3 })).toBeInTheDocument();
    });
    expect(await screen.findByText(/Rule Matrix/i)).toBeInTheDocument();
    expect(await screen.findByText(/Credit Memo/i)).toBeInTheDocument();
  });

  it("shows feature-gated filters by status tab", async () => {
    const user = userEvent.setup();
    render(<QueueDashboard />);

    expect(await screen.findByLabelText(/Filter by intake status/i)).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Dealer Email" })).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /Decision Queue/i }));
    await screen.findByRole("cell", { name: "APP-2026-0005" });

    expect(screen.queryByLabelText(/Filter by intake status/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Dealer Email" })).not.toBeInTheDocument();
  });

  it("sorts intake statuses with encoding in progress first", async () => {
    render(<QueueDashboard />);
    await screen.findByRole("cell", { name: "APP-2026-0003" });
    const inProgressCell = screen.getByRole("cell", { name: "APP-2026-0003" });
    const inQueueCell = screen.getByRole("cell", { name: "APP-2026-0002" });
    const emailCell = screen.getByRole("cell", { name: "APP-2026-0001" });

    expect(inProgressCell.compareDocumentPosition(inQueueCell) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(inQueueCell.compareDocumentPosition(emailCell) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("supports rows-per-page and sticky-header table classes", async () => {
    const user = userEvent.setup();
    const getApplicationsSpy = vi.spyOn(queueApi, "getApplications");
    render(<QueueDashboard />);

    await screen.findByRole("cell", { name: "APP-2026-0001" });
    const rowsSelect = screen.getByRole("combobox", { name: /Rows/i });
    await user.selectOptions(rowsSelect, "20");

    await waitFor(() => {
      expect(
        getApplicationsSpy.mock.calls.some(
          (call) =>
            typeof call[0] === "object" &&
            call[0] !== null &&
            (call[0] as { status?: string; size?: number }).status === "INTAKE_IN_PROGRESS" &&
            (call[0] as { status?: string; size?: number }).size === 20
        )
      ).toBeTruthy();
    });

    await screen.findByRole("cell", { name: "APP-2026-0001" });
    const table = document.querySelector(".queue-table");
    expect(table).not.toBeNull();
    const tableWrap = table?.parentElement ?? null;
    expect(table).toHaveClass("sticky-header-enabled");
    expect(tableWrap).toHaveClass("queue-table-wrap");
    expect(tableWrap).toHaveClass("table-body-scroll");
    expect(tableWrap).toHaveClass("table-sticky-header");
    expect(table).toBeInTheDocument();

    getApplicationsSpy.mockRestore();
  });
});
