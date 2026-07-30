// Integration test suite simulating text input area, outputs and buttons triggers
import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { SmartInput } from "../components/ui/Input/SmartInput";
import { SummaryOutput } from "../components/ui/SummaryOutput/SummaryOutput";

describe("SmartInput & SummaryOutput Integration Tests", () => {
  
  test("should render SmartInput and update value on input typing", () => {
    const handleChange = jest.fn();
    const handleSubmit = jest.fn();
    
    render(
      <SmartInput 
        value="" 
        onChange={handleChange} 
        onSubmit={handleSubmit} 
        placeholder="Type text here..."
      />
    );
    
    const textarea = screen.getByPlaceholderText("Type text here...");
    expect(textarea).toBeInTheDocument();
    
    fireEvent.change(textarea, { target: { value: "Artificial intelligence trends" } });
    expect(handleChange).toHaveBeenCalledWith("Artificial intelligence trends");
  });

  test("should trigger onSubmit when Ctrl + Enter key is pressed", () => {
    const handleChange = jest.fn();
    const handleSubmit = jest.fn();
    
    render(
      <SmartInput 
        value="Focus statements" 
        onChange={handleChange} 
        onSubmit={handleSubmit} 
        placeholder="Type text here..."
      />
    );
    
    const textarea = screen.getByPlaceholderText("Type text here...");
    fireEvent.keyDown(textarea, { key: "Enter", ctrlKey: true });
    
    expect(handleSubmit).toHaveBeenCalled();
  });

  test("should stream typewriter output when SummaryOutput finishes loading", () => {
    jest.useFakeTimers();
    
    render(
      <SummaryOutput 
        summary="Summarization is complete." 
        isLoading={false} 
      />
    );
    
    // Fast-forward interval ticks
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    
    // Check if key findings heading is loaded
    const resultElement = screen.getByText(/Key Findings/i);
    expect(resultElement).toBeInTheDocument();
    
    jest.useRealTimers();
  });
});
