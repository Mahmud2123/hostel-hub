import * as React from "react";
import { cn } from "@/utils/cn";
import { Check } from "lucide-react";

interface CheckboxProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export function Checkbox({
  checked,
  onChange,
  label,
  disabled,
  className,
  id,
}: CheckboxProps) {
  const checkId = id || label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <label
      htmlFor={checkId}
      className={cn(
        "flex items-center gap-2.5 cursor-pointer select-none",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      <div className="relative">
        <input
          type="checkbox"
          id={checkId}
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange?.(e.target.checked)}
          className="sr-only"
        />
        <div
          className={cn(
            "h-4 w-4 rounded border transition-all duration-150 flex items-center justify-center",
            checked
              ? "bg-emerald-600 border-emerald-600"
              : "bg-slate-800 border-slate-600 hover:border-slate-500"
          )}
        >
          {checked && <Check className="h-3 w-3 text-white stroke-[3]" />}
        </div>
      </div>
      {label && <span className="text-sm text-slate-300">{label}</span>}
    </label>
  );
}

interface CheckboxGroupProps {
  label?: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  columns?: 1 | 2 | 3;
}

export function CheckboxGroup({
  label,
  options,
  selected,
  onChange,
  columns = 2,
}: CheckboxGroupProps) {
  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {label && <p className="text-sm font-medium text-slate-300">{label}</p>}
      <div
        className={cn("grid gap-2", {
          "grid-cols-1": columns === 1,
          "grid-cols-2": columns === 2,
          "grid-cols-3": columns === 3,
        })}
      >
        {options.map((opt) => (
          <Checkbox
            key={opt}
            label={opt}
            checked={selected.includes(opt)}
            onChange={() => toggle(opt)}
          />
        ))}
      </div>
    </div>
  );
}
