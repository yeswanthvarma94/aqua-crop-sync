import * as React from "react";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

const countries = [
  { code: "+91", name: "India", flag: "🇮🇳" },
  { code: "+1", name: "USA", flag: "🇺🇸" },
  { code: "+44", name: "UK", flag: "🇬🇧" },
  { code: "+61", name: "Australia", flag: "🇦🇺" },
  { code: "+49", name: "Germany", flag: "🇩🇪" },
  { code: "+33", name: "France", flag: "🇫🇷" },
  { code: "+81", name: "Japan", flag: "🇯🇵" },
  { code: "+86", name: "China", flag: "🇨🇳" },
  { code: "+55", name: "Brazil", flag: "🇧🇷" },
  { code: "+7", name: "Russia", flag: "🇷🇺" },
];

interface PhoneInputProps extends Omit<React.ComponentProps<"input">, "onChange"> {
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
}

const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ className, value = "", onChange, ...props }, ref) => {
    // Parse the current value to extract country code and number
    const parsePhoneNumber = (phoneValue: string) => {
      if (!phoneValue) return { countryCode: "+91", number: "" };
      
      // Find matching country code
      const matchedCountry = countries.find(country => 
        phoneValue.startsWith(country.code)
      );
      
      if (matchedCountry) {
        return {
          countryCode: matchedCountry.code,
          number: phoneValue.slice(matchedCountry.code.length),
        };
      }
      
      // If no country code found, assume it's a number without country code
      return {
        countryCode: "+91",
        number: phoneValue.startsWith("+") ? phoneValue.slice(1) : phoneValue,
      };
    };
    
    const { countryCode, number } = parsePhoneNumber(value);
    
    const handleCountryChange = (newCountryCode: string) => {
      const newValue = newCountryCode + number;
      onChange?.(newValue);
    };
    
    const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newNumber = e.target.value.replace(/[^\d]/g, ''); // Only allow digits
      const newValue = countryCode + newNumber;
      onChange?.(newValue);
    };
    
    return (
      <div className={cn("flex", className)}>
        <Select value={countryCode} onValueChange={handleCountryChange}>
          <SelectTrigger className="w-32 rounded-r-none border-r-0 focus:z-10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {countries.map((country) => (
              <SelectItem key={country.code} value={country.code}>
                <span className="flex items-center gap-2">
                  <span>{country.flag}</span>
                  <span>{country.code}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          {...props}
          ref={ref}
          type="tel"
          value={number}
          onChange={handleNumberChange}
          className="rounded-l-none border-l-0 focus:z-10"
          placeholder="Enter phone number"
        />
      </div>
    );
  }
);

PhoneInput.displayName = "PhoneInput";

export { PhoneInput };