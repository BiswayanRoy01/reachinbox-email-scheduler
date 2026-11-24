import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { EmailRow } from "../components/email/EmailRow";
import { Email } from "../types";

describe("EmailRow Component", () => {
  const queryClient = new QueryClient();

  const mockScheduledEmail: Email = {
    id: "email-123",
    userId: "user-1",
    senderId: "sender-1",
    recipient: "client@example.com",
    subject: "Follow-up proposal",
    body: "<p>Hi client, just wanted to check in</p>",
    scheduledAt: new Date(Date.now() + 86400000).toISOString(),
    status: "SCHEDULED",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    sender: {
      displayName: "Alex Outreach",
      emailAddress: "alex@reachinbox.ai",
    },
  };

  const renderComponent = (email: Email, variant: "scheduled" | "sent") =>
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <EmailRow email={email} variant={variant} />
        </BrowserRouter>
      </QueryClientProvider>
    );

  it("renders recipient, subject, and body snippet correctly", () => {
    renderComponent(mockScheduledEmail, "scheduled");

    expect(screen.getByText("client@example.com")).toBeInTheDocument();
    expect(screen.getByText("Follow-up proposal")).toBeInTheDocument();
    expect(screen.getByText(/Hi client, just wanted to check in/i)).toBeInTheDocument();
  });

  it("renders scheduled clock badge when email status is SCHEDULED", () => {
    renderComponent(mockScheduledEmail, "scheduled");

    // Formatted scheduled badge prints formatted date & time with AM/PM word boundary
    expect(screen.getByText(/\b(AM|PM)\b/)).toBeInTheDocument();
  });

  it("renders sent badge when email status is SENT", () => {
    const mockSentEmail: Email = {
      ...mockScheduledEmail,
      status: "SENT",
      sentAt: new Date().toISOString(),
    };

    renderComponent(mockSentEmail, "sent");

    expect(screen.getByText(/Sent/i)).toBeInTheDocument();
  });
});
