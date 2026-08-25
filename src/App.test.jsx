import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
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
});
