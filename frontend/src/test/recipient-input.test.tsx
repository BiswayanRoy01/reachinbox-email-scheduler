import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { RecipientChipInput } from "../components/compose/RecipientChipInput";

describe("RecipientChipInput Component", () => {
  it("displays existing recipients as chips", () => {
    const recipients = ["test1@example.com", "test2@example.com"];
    const onChange = vi.fn();
    const onOpenUploadModal = vi.fn();

    render(
      <RecipientChipInput
        recipients={recipients}
        onChange={onChange}
        onOpenUploadModal={onOpenUploadModal}
      />
    );

    expect(screen.getByText("test1@example.com")).toBeInTheDocument();
    expect(screen.getByText("test2@example.com")).toBeInTheDocument();
  });

  it("adds recipient on Enter key press", () => {
    const onChange = vi.fn();
    const onOpenUploadModal = vi.fn();

    render(
      <RecipientChipInput
        recipients={[]}
        onChange={onChange}
        onOpenUploadModal={onOpenUploadModal}
      />
    );

    const input = screen.getByPlaceholderText(/Enter email addresses/i);
    fireEvent.change(input, { target: { value: "lead@acme.com" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onChange).toHaveBeenCalledWith(["lead@acme.com"]);
  });

  it("rejects invalid email formats", () => {
    const onChange = vi.fn();
    const onOpenUploadModal = vi.fn();

    render(
      <RecipientChipInput
        recipients={[]}
        onChange={onChange}
        onOpenUploadModal={onOpenUploadModal}
      />
    );

    const input = screen.getByPlaceholderText(/Enter email addresses/i);
    fireEvent.change(input, { target: { value: "not-an-email" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText(/"not-an-email" is not a valid email address/i)).toBeInTheDocument();
  });
});
