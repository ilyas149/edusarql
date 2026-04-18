import { useContext } from 'react';
import { NativeNavigationContext } from '../context/NativeNavigationContext';

export const useNativeBackNavigation = () => {
  const context = useContext(NativeNavigationContext);
  if (!context) {
    throw new Error('useNativeBackNavigation must be used within NativeNavigationProvider');
  }
  return context;
};
