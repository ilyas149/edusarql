import { useContext } from 'react';
import { HeaderContext } from '../context/HeaderContext';

export const useHeader = () => useContext(HeaderContext);
