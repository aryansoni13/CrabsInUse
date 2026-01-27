import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

interface AutoSuggestInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  suggestions: string[];
  onValueChange?: (value: string) => void;
  columnId?: string;
}

const AutoSuggestInput = React.forwardRef<HTMLInputElement, AutoSuggestInputProps>(
  ({ className, suggestions, onValueChange, value, onChange, onKeyDown, onBlur, columnId, ...props }, ref) => {
    const [showSuggestions, setShowSuggestions] = React.useState(false);
    const [filteredSuggestions, setFilteredSuggestions] = React.useState<string[]>([]);
    const [selectedIndex, setSelectedIndex] = React.useState(-1);
    const inputRef = React.useRef<HTMLInputElement>(null);
    const suggestionsRef = React.useRef<HTMLDivElement>(null);

    // Combine refs
    React.useImperativeHandle(ref, () => inputRef.current!);

    const inputValue = String(value ?? "");

    // Filter suggestions based on input
    React.useEffect(() => {
      if (!inputValue.trim()) {
        setFilteredSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      const lowerValue = inputValue.toLowerCase();
      const uniqueSuggestions = [...new Set(suggestions)];
      const filtered = uniqueSuggestions
        .filter((s) => s && s.toLowerCase().includes(lowerValue) && s.toLowerCase() !== lowerValue)
        .slice(0, 8); // Limit to 8 suggestions

      setFilteredSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
      setSelectedIndex(-1);
    }, [inputValue, suggestions]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(e);
      onValueChange?.(e.target.value);
    };

    const handleSelectSuggestion = (suggestion: string) => {
      onValueChange?.(suggestion);
      // Create a synthetic event for onChange
      if (inputRef.current) {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          "value"
        )?.set;
        nativeInputValueSetter?.call(inputRef.current, suggestion);
        const event = new Event("input", { bubbles: true });
        inputRef.current.dispatchEvent(event);
      }
      setShowSuggestions(false);
      setSelectedIndex(-1);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!showSuggestions || filteredSuggestions.length === 0) {
        onKeyDown?.(e);
        return;
      }

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < filteredSuggestions.length - 1 ? prev + 1 : prev
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
          break;
        case "Enter":
          if (selectedIndex >= 0 && selectedIndex < filteredSuggestions.length) {
            e.preventDefault();
            handleSelectSuggestion(filteredSuggestions[selectedIndex]);
          } else {
            setShowSuggestions(false);
            onKeyDown?.(e);
          }
          break;
        case "Escape":
          e.preventDefault();
          setShowSuggestions(false);
          setSelectedIndex(-1);
          break;
        case "Tab":
          setShowSuggestions(false);
          onKeyDown?.(e);
          break;
        default:
          onKeyDown?.(e);
      }
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      // Delay hiding to allow click on suggestion
      setTimeout(() => {
        setShowSuggestions(false);
        setSelectedIndex(-1);
      }, 150);
      onBlur?.(e);
    };

    const handleFocus = () => {
      if (inputValue.trim() && filteredSuggestions.length > 0) {
        setShowSuggestions(true);
      }
    };

    // Scroll selected suggestion into view
    React.useEffect(() => {
      if (selectedIndex >= 0 && suggestionsRef.current) {
        const items = suggestionsRef.current.querySelectorAll("[data-suggestion-item]");
        items[selectedIndex]?.scrollIntoView({ block: "nearest" });
      }
    }, [selectedIndex]);

    return (
      <div className="relative">
        <Input
          ref={inputRef}
          className={className}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          onFocus={handleFocus}
          data-column-id={columnId}
          {...props}
        />
        {showSuggestions && filteredSuggestions.length > 0 && (
          <div
            ref={suggestionsRef}
            className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-y-auto"
          >
            {filteredSuggestions.map((suggestion, index) => (
              <div
                key={`${suggestion}-${index}`}
                data-suggestion-item
                className={cn(
                  "px-3 py-2 cursor-pointer text-sm transition-colors",
                  index === selectedIndex
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-muted"
                )}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelectSuggestion(suggestion);
                }}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                {suggestion}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
);

AutoSuggestInput.displayName = "AutoSuggestInput";

export { AutoSuggestInput };
