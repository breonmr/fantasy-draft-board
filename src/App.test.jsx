import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { STORAGE_KEY } from "./data/draftDefaults.js";
import App from "./App.jsx";

describe("Fantasy Draft Board", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders the board with its starter rankings", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", { name: "Fantasy Draft Board" })
    ).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Draft" })).toHaveLength(10);
  });

  it("moves a drafted player from the rankings to the draft board", () => {
    render(<App />);

    fireEvent.click(screen.getAllByRole("button", { name: "Draft" })[0]);

    expect(screen.getAllByRole("button", { name: "Draft" })).toHaveLength(9);
    expect(screen.getByText("Ja'Marr Chase")).toBeInTheDocument();
  });

  it("keeps pick numbers right-aligned in empty and occupied slots", () => {
    const { container } = render(<App />);

    expect(container.querySelector('[data-pick-number="1"]')).toHaveClass("right-1", "top-1/2", "-translate-y-1/2");
    fireEvent.click(screen.getAllByRole("button", { name: "Draft" })[0]);
    expect(container.querySelector('[data-pick-number="1"]')).toHaveClass("right-1", "top-1/2", "-translate-y-1/2");
  });

  it("selects and persists My Team while team names are edited", () => {
    const { unmount } = render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Edit Teams" }));
    fireEvent.click(screen.getByRole("button", { name: "Set Team 3 as My Team" }));
    fireEvent.change(screen.getByDisplayValue("Team 3"), { target: { value: "My Squad" } });
    fireEvent.click(screen.getByRole("button", { name: "Done" }));

    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(saved.settings.myTeam).toBe(2);
    expect(saved.settings.teamNames[2]).toBe("My Squad");
    expect(screen.getByText("MY")).toBeInTheDocument();

    unmount();
    render(<App />);
    expect(screen.getByText("My Squad")).toBeInTheDocument();
    expect(screen.getByText("MY")).toBeInTheDocument();
  });

  it("uses a single neutral segmented filter control with drafted counts", () => {
    render(<App />);

    const allFilter = screen.getByRole("button", { name: /ALL.*0\/10/ });
    const runningBackFilter = screen.getByRole("button", { name: /RB.*0\/4/ });
    expect(allFilter).toHaveClass("bg-teal-400");
    expect(runningBackFilter).toHaveClass("bg-slate-800");
    expect(screen.getByRole("button", { name: /DEF.*0\/0/ })).toBeInTheDocument();

    fireEvent.click(runningBackFilter);
    expect(screen.getAllByRole("button", { name: "Draft" })).toHaveLength(4);
    expect(runningBackFilter).toHaveClass("bg-teal-400");
  });

  it("clears a player search with the clear control", () => {
    render(<App />);

    const search = screen.getByPlaceholderText("Search by name / team");
    fireEvent.change(search, { target: { value: "Jefferson" } });

    expect(screen.getByRole("button", { name: "Clear search" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Draft" })).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));

    expect(search).toHaveValue("");
    expect(screen.getAllByRole("button", { name: "Draft" })).toHaveLength(10);
  });

  it("opens player details when an available-player card is clicked", () => {
    const { container } = render(<App />);

    fireEvent.click(container.querySelector("li[data-id]"));

    expect(screen.getByRole("button", { name: "Expand player details" })).toBeInTheDocument();
    expect(screen.getByText("Overall #1")).toBeInTheDocument();
    expect(screen.getByText("☆ Not starred")).toBeInTheDocument();
  });

  it("opens and closes expanded player details without losing the selected player", () => {
    const { container } = render(<App />);
    fireEvent.click(container.querySelector("li[data-id]"));
    fireEvent.click(screen.getByRole("button", { name: "Expand player details" }));

    expect(screen.getByRole("dialog", { name: "Expanded player details" })).toBeInTheDocument();
    expect(screen.getByText("Recent performance")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close expanded player details" }));
    expect(screen.queryByRole("dialog", { name: "Expanded player details" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Expand player details" })).toBeInTheDocument();
  });

  it("toggles a player watchlist star without opening their details", () => {
    render(<App />);

    const watchlistButton = screen.getByRole("button", { name: "Add Ja'Marr Chase to watchlist" });
    fireEvent.click(watchlistButton);

    expect(screen.getByRole("button", { name: "Remove Ja'Marr Chase from watchlist" })).toBeInTheDocument();
    expect(screen.queryByText("Player profile")).not.toBeInTheDocument();
  });
});
