import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';

interface MPINInputProps {
  onSubmit: (mpin: string) => void;
  onBack: () => void;
  isLoading?: boolean;
  error?: string;
  phone: string;
}

export function MPINInput({ onSubmit, onBack, isLoading, error, phone }: MPINInputProps) {
  const [mpin, setMpin] = useState(['', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Focus first input on mount
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste
      const digits = value.slice(0, 4).split('');
      const newMpin = [...mpin];
      digits.forEach((digit, i) => {
        if (index + i < 4 && /^\d$/.test(digit)) {
          newMpin[index + i] = digit;
        }
      });
      setMpin(newMpin);
      
      // Focus last filled input or next empty
      const lastFilledIndex = Math.min(index + digits.length - 1, 3);
      inputRefs.current[lastFilledIndex]?.focus();
      
      // Auto submit if complete
      if (newMpin.every(digit => digit !== '')) {
        onSubmit(newMpin.join(''));
      }
      return;
    }

    if (/^\d$/.test(value) || value === '') {
      const newMpin = [...mpin];
      newMpin[index] = value;
      setMpin(newMpin);

      if (value !== '') {
        // Move to next input
        if (index < 3) {
          inputRefs.current[index + 1]?.focus();
        }
        
        // Auto submit when complete
        if (index === 3 && newMpin.every(digit => digit !== '')) {
          onSubmit(newMpin.join(''));
        }
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && mpin[index] === '' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'Enter' && mpin.every(digit => digit !== '')) {
      onSubmit(mpin.join(''));
    }
  };

  const handleSubmit = () => {
    if (mpin.every(digit => digit !== '')) {
      onSubmit(mpin.join(''));
    }
  };

  const maskedPhone = phone.replace(/(\+?\d{1,3})(\d+)(\d{4})/, '$1****$3');

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-2">
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onBack}
            className="p-1 h-8 w-8"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <CardTitle className="text-xl">Enter MPIN</CardTitle>
        </div>
        <CardDescription>
          Enter your 4-digit MPIN for {maskedPhone}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex justify-center gap-3">
          {mpin.map((digit, index) => (
            <input
              key={index}
              ref={(el) => (inputRefs.current[index] = el)}
              type="password"
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className="w-12 h-12 text-center text-xl font-semibold border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-background"
              maxLength={1}
              disabled={isLoading}
            />
          ))}
        </div>

        {error && (
          <div className="text-sm text-destructive text-center">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <Button 
            onClick={handleSubmit}
            disabled={!mpin.every(digit => digit !== '') || isLoading}
            className="w-full"
          >
            {isLoading ? 'Verifying...' : 'Login'}
          </Button>
          
          <div className="text-center">
            <Button 
              variant="link" 
              onClick={onBack}
              className="text-sm text-muted-foreground"
            >
              Forgot MPIN? Use OTP instead
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}