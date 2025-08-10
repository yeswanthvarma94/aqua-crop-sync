import React, { createContext, useContext, useMemo, useState } from "react";

export interface LocationRef { id: string; name: string }
export interface TankRef { id: string; name: string; type: "shrimp" | "fish" }

interface SelectionState {
  location: LocationRef | null;
  tank: TankRef | null;
  setLocation: (loc: LocationRef | null) => void;
  setTank: (tank: TankRef | null) => void;
}

const SelectionContext = createContext<SelectionState | undefined>(undefined);

export const SelectionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [location, setLocation] = useState<LocationRef | null>(null);
  const [tank, setTank] = useState<TankRef | null>(null);

  const value = useMemo(() => ({ location, tank, setLocation, setTank }), [location, tank]);

  return <SelectionContext.Provider value={value}>{children}</SelectionContext.Provider>;
};

export const useSelection = () => {
  const ctx = useContext(SelectionContext);
  if (!ctx) throw new Error("useSelection must be used within SelectionProvider");
  return ctx;
};
