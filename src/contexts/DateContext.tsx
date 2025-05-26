import React, { createContext, useState, useContext, ReactNode } from 'react';
import { getCurrentLocalDate } from '@/lib/dateUtils';

interface DateContextType {
  currentDate: string;
  setCurrentDate: (date: string) => void;
}

const DateContext = createContext<DateContextType | undefined>(undefined);

export const DateProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentDate, setCurrentDate] = useState<string>(getCurrentLocalDate());
  
  return (
    <DateContext.Provider value={{ currentDate, setCurrentDate }}>
      {children}
    </DateContext.Provider>
  );
};

export const useDate = (): DateContextType => {
  const context = useContext(DateContext);
  if (!context) {
    throw new Error('useDate must be used within DateProvider');
  }
  return context;
}; 