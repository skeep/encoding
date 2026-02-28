import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { QueueDashboard } from "./QueueDashboard";

describe("QueueDashboard", () => {
  it("renders queue tabs and table rows", async () => {
    render(<QueueDashboard />);
    expect(screen.getByRole("tab", { name: /Intake & Encoding In Progress/i })).toBeInTheDocument();
    expect(await screen.findByRole("cell", { name: "APP-2026-0001" })).toBeInTheDocument();
  });

  it("switches tab and loads encoding detail content", async () => {
    const user = userEvent.setup();
    render(<QueueDashboard />);

    await user.click(screen.getByRole("tab", { name: /Encoding Complete/i }));
    expect(await screen.findByRole("cell", { name: "APP-2026-0004" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Final Encoding Adjustment", level: 3 })).toBeInTheDocument();
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
});
