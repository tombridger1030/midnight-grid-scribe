import React from 'react';
import { HeroUIProvider } from '@heroui/react';

interface HeroUIProviderProps {
  children: React.ReactNode;
}

export const CustomHeroUIProvider: React.FC<HeroUIProviderProps> = ({ children }) => {
  return (
    <HeroUIProvider>
      {children}
    </HeroUIProvider>
  );
};

export default CustomHeroUIProvider;