import React, { useState } from 'react';
import { HeaderContext } from './HeaderContext';

export const HeaderProvider = ({ children }) => {
  const [headerAction, setHeaderAction] = useState(null);
  const [headerTitle, setHeaderTitle] = useState(null);
  const [backAction, setBackAction] = useState(null);

  return (
    <HeaderContext.Provider value={{ 
      headerAction, setHeaderAction, 
      headerTitle, setHeaderTitle,
      backAction, setBackAction 
    }}>
      {children}
    </HeaderContext.Provider>
  );
};
