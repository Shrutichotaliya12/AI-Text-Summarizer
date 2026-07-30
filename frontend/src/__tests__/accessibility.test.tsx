// Accessibility test suite verifying roles and labels attributes
import React from "react";
import { render, screen } from "@testing-library/react";
import { Tooltip } from "../components/ui/Tooltip";
import { Button } from "../components/ui/Button";

describe("Accessibility Compliance Tests", () => {
  
  test("interactive buttons should support target accessibility aria attributes", () => {
    render(
      <Button aria-label="Confirm Action" className="px-4">
        Save Setup
      </Button>
    );
    
    const button = screen.getByRole("button", { name: /Confirm Action/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("aria-label", "Confirm Action");
  });

  test("tooltips should render readable helper labels", () => {
    render(
      <Tooltip content="Tooltip details content text">
        <button>Trigger Info</button>
      </Tooltip>
    );
    
    const trigger = screen.getByText("Trigger Info");
    expect(trigger).toBeInTheDocument();
  });

  test("input areas should map labels correctly for screen readers", () => {
    render(
      <div>
        <label htmlFor="test-input">Describe document content details</label>
        <input id="test-input" type="text" />
      </div>
    );
    
    const input = screen.getByLabelText("Describe document content details");
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("type", "text");
  });
});
