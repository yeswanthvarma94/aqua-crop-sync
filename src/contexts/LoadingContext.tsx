import React, { createContext, useContext, useState, ReactNode } from 'react';

export type LoadingType = 
  | 'farms'
  | 'tanks' 
  | 'stocks'
  | 'feeding'
  | 'expenses'
  | 'materials'
  | 'sync'
  | 'offline-operation'
  | 'initial-load';

interface LoadingState {
  activeLoaders: Set<LoadingType>;
  isLoading: (type?: LoadingType) => boolean;
  startLoading: (type: LoadingType) => void;
  stopLoading: (type: LoadingType) => void;
  hasAnyLoading: boolean;
}

const LoadingContext = createContext<LoadingState | undefined>(undefined);

export const LoadingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeLoaders, setActiveLoaders] = useState<Set<LoadingType>>(new Set());

  const startLoading = (type: LoadingType) => {
    setActiveLoaders(prev => new Set([...prev, type]));
  };

  const stopLoading = (type: LoadingType) => {
    setActiveLoaders(prev => {
      const newSet = new Set(prev);
      newSet.delete(type);
      return newSet;
    });
  };

  const isLoading = (type?: LoadingType) => {
    if (!type) return activeLoaders.size > 0;
    return activeLoaders.has(type);
  };

  const hasAnyLoading = activeLoaders.size > 0;

  return (
    <LoadingContext.Provider 
      value={{
        activeLoaders,
        isLoading,
        startLoading,
        stopLoading,
        hasAnyLoading
      }}
    >
      {children}
    </LoadingContext.Provider>
  );
};

export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
};