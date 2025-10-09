import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Check, X } from 'lucide-react';

interface MPINSetupProps {
  onComplete: (mpin: string) => void;
  onSkip: () => void;
  isLoading?: boolean;
  error?: string;
}

export function MPINSetup({ onComplete, onSkip, isLoading, error }: MPINSetupProps) {
  const [step, setStep] = useState<'create' | 'confirm'>('create');
  const [createMpin, setCreateMpin] = useState(['', '', '', '']);
  const [confirmMpin, setConfirmMpin] = useState(['', '', '', '']);
  const [validationError, setValidationError] = useState('');
  
  const createInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const confirmInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (step === 'create') {
      createInputRefs.current[0]?.focus();
    } else {
      confirmInputRefs.current[0]?.focus();
    }
  }, [step]);

  const handleChange = (
    index: number, 
    value: string, 
    isConfirm: boolean = false
  ) => {
    const mpin = isConfirm ? confirmMpin : createMpin;
    const setMpin = isConfirm ? setConfirmMpin : setCreateMpin;
    const inputRefs = isConfirm ? confirmInputRefs : createInputRefs;

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
      
      const lastFilledIndex = Math.min(index + digits.length - 1, 3);
      inputRefs.current[lastFilledIndex]?.focus();
      
      // Auto proceed if complete
      if (newMpin.every(digit => digit !== '')) {
        if (!isConfirm) {
          setTimeout(() => setStep('confirm'), 300);
        }
      }
      return;
    }

    if (/^\d$/.test(value) || value === '') {
      const newMpin = [...mpin];
      newMpin[index] = value;
      setMpin(newMpin);
      setValidationError('');

      if (value !== '') {
        if (index < 3) {
          inputRefs.current[index + 1]?.focus();
        } else if (!isConfirm && newMpin.every(digit => digit !== '')) {
          // Auto proceed to confirm step
          setTimeout(() => setStep('confirm'), 300);
        }
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent, isConfirm: boolean = false) => {
    const mpin = isConfirm ? confirmMpin : createMpin;
    const inputRefs = isConfirm ? confirmInputRefs : createInputRefs;

    if (e.key === 'Backspace' && mpin[index] === '' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleNext = () => {
    if (createMpin.every(digit => digit !== '')) {
      setStep('confirm');
    }
  };

  const handleBack = () => {
    setStep('create');
    setConfirmMpin(['', '', '', '']);
    setValidationError('');
  };

  const handleComplete = () => {
    const createMpinString = createMpin.join('');
    const confirmMpinString = confirmMpin.join('');

    if (createMpinString !== confirmMpinString) {
      setValidationError('MPINs do not match. Please try again.');
      return;
    }

    if (createMpinString.length !== 4) {
      setValidationError('Please enter a 4-digit MPIN');
      return;
    }

    onComplete(createMpinString);
  };

  const renderMPINInputs = (
    mpin: string[], 
    onChange: (index: number, value: string) => void,
    onKeyDown: (index: number, e: React.KeyboardEvent) => void,
    inputRefs: React.MutableRefObject<(HTMLInputElement | null)[]>,
    isConfirm: boolean = false
  ) => (
    <div className="flex justify-center gap-3">
      {mpin.map((digit, index) => (
        <input
          key={index}
          ref={(el) => (inputRefs.current[index] = el)}
          type="password"
          value={digit}
          onChange={(e) => onChange(index, e.target.value)}
          onKeyDown={(e) => onKeyDown(index, e)}
          className="w-12 h-12 text-center text-xl font-semibold border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-background"
          maxLength={1}
          disabled={isLoading}
        />
      ))}
    </div>
  );

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-2">
        <CardTitle className="text-xl flex items-center gap-2">
          {step === 'create' ? (
            <>
              <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">1</div>
              Create MPIN
            </>
          ) : (
            <>
              <div className="w-6 h-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm">
                <Check className="w-3 h-3" />
              </div>
              <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">2</div>
              Confirm MPIN
            </>
          )}
        </CardTitle>
        <CardDescription>
          {step === 'create' 
            ? 'Create a 4-digit MPIN for quick login'
            : 'Enter your MPIN again to confirm'
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {step === 'create' ? (
          <>
            {renderMPINInputs(
              createMpin, 
              (index, value) => handleChange(index, value, false),
              (index, e) => handleKeyDown(index, e, false),
              createInputRefs
            )}
            
            <div className="space-y-3">
              <Button 
                onClick={handleNext}
                disabled={!createMpin.every(digit => digit !== '') || isLoading}
                className="w-full"
              >
                Continue
              </Button>
              <Button 
                variant="outline" 
                onClick={onSkip}
                className="w-full"
              >
                Skip for now
              </Button>
            </div>
          </>
        ) : (
          <>
            {renderMPINInputs(
              confirmMpin, 
              (index, value) => handleChange(index, value, true),
              (index, e) => handleKeyDown(index, e, true),
              confirmInputRefs,
              true
            )}
            
            {(validationError || error) && (
              <div className="text-sm text-destructive text-center">
                {validationError || error}
              </div>
            )}
            
            <div className="space-y-3">
              <Button 
                onClick={handleComplete}
                disabled={!confirmMpin.every(digit => digit !== '') || isLoading}
                className="w-full"
              >
                {isLoading ? 'Setting up MPIN...' : 'Complete Setup'}
              </Button>
              <Button 
                variant="outline" 
                onClick={handleBack}
                className="w-full"
              >
                Back
              </Button>
            </div>
          </>
        )}
        
        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            MPIN will be required for future logins on this device
          </p>
        </div>
      </CardContent>
    </Card>
  );
}