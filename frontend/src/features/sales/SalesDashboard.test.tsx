import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach } from "vitest";

import { resetSalesFixturesForTests } from "../../mocks/handlers";
import { SalesDashboard } from "./SalesDashboard";

describe("SalesDashboard", () => {
  beforeEach(() => {
    resetSalesFixturesForTests();
  });

  it("renders metrics strip and table rows", async () => {
    render(
      <MemoryRouter initialEntries={["/sales"]}>
        <SalesDashboard />
      </MemoryRouter>
    );
    expect(await screen.findByLabelText(/Sales overview/i)).toBeInTheDocument();
    expect(await screen.findByRole("cell", { name: "APP-2026-0001" })).toBeInTheDocument();
  });

  it("shows pending action badge when tasks exist", async () => {
    render(
      <MemoryRouter initialEntries={["/sales"]}>
        <SalesDashboard />
      </MemoryRouter>
    );
    expect((await screen.findAllByText(/1 needed/i)).length).toBeGreaterThanOrEqual(1);
  });

  it("marks Sales nav as current on /sales", async () => {
    render(
      <MemoryRouter initialEntries={["/sales"]}>
        <SalesDashboard />
      </MemoryRouter>
    );
    expect(await screen.findByRole("link", { name: /^Sales$/i })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: /Workflow/i })).toHaveAttribute("href", "/");
  });

  it("opens supplemental field modal and clears task after save", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/sales"]}>
        <SalesDashboard />
      </MemoryRouter>
    );

    await screen.findByRole("cell", { name: "APP-2026-0016" });
    await user.click(screen.getByRole("cell", { name: "APP-2026-0016" }));

    await screen.findByRole("heading", { name: /Provide applicant identity details/i });
    await user.click(screen.getByRole("button", { name: /Fill requested fields/i }));

    await user.type(screen.getByRole("textbox", { name: /First name/i }), "Ana");
    await user.type(screen.getByRole("textbox", { name: /Last name/i }), "Cruz");
    await user.type(screen.getByRole("textbox", { name: /Phone/i }), "+639171234567");
    await user.type(screen.getByRole("textbox", { name: /Address/i }), "Makati");

    await user.click(screen.getByRole("button", { name: /^Save$/i }));

    await screen.findByText(/No pending requests from encoding or credit/i);
  });
});
