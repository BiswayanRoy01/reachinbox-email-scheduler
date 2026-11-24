import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Login } from "../pages/Login";
import { AuthProvider } from "../contexts/AuthContext";

describe("Login and Authentication Component", () => {
  const queryClient = new QueryClient();

  const renderComponent = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <Login />
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    );

  it("renders ReachInbox branding and Google OAuth button", () => {
    renderComponent();

    const reachElements = screen.getAllByText(/Reach/i);
    expect(reachElements.length).toBeGreaterThan(0);
    expect(screen.getByText(/Continue with Google/i)).toBeInTheDocument();
  });

  it("renders email login form for authenticated sessions", () => {
    renderComponent();

    expect(screen.getByPlaceholderText(/alex@reachinbox.ai/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Continue with Email/i })).toBeInTheDocument();
  });

  it("handles email input changes", () => {
    renderComponent();

    const input = screen.getByPlaceholderText(/alex@reachinbox.ai/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "test@domain.com" } });
    expect(input.value).toBe("test@domain.com");
  });
});
