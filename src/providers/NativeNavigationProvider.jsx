import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { NativeNavigationContext } from '../context/NativeNavigationContext';

export const NativeNavigationProvider = ({ children, primaryTabs = [], defaultTab = '/' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [overlays, setOverlays] = useState([]);
  const [exitAttempt, setExitAttempt] = useState(false);
  const exitTimerRef = useRef(null);
  
  // Keep track of the last visited sub-path for each primary tab
  const tabHistory = useRef({});

  // Register/Unregister overlays (modals, drawers, etc.)
  const registerOverlay = useCallback((id, closeFn) => {
    setOverlays(prev => [...prev, { id, close: closeFn }]);
  }, []);

  const unregisterOverlay = useCallback((id) => {
    setOverlays(prev => prev.filter(o => o.id !== id));
  }, []);

  // Check if current path is a primary tab root
  const isPrimaryTabRoot = useCallback((path) => {
    return primaryTabs.some(tab => tab === path);
  }, [primaryTabs]);

  const isDefaultTab = location.pathname === defaultTab;

  const handleBack = useCallback(() => {
    // 1. Close active overlays first
    if (overlays.length > 0) {
      const activeOverlay = overlays[overlays.length - 1];
      activeOverlay.close();
      return;
    }

    // 2. If at default tab root, handle exit confirmation
    if (isDefaultTab) {
      if (exitAttempt) {
        // Real exit behavior (browser back or close)
        window.history.back();
      } else {
        setExitAttempt(true);
        if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
        exitTimerRef.current = setTimeout(() => setExitAttempt(false), 2000);
      }
      return;
    }

    // 3. If at a primary tab root (not default), go to default tab
    if (isPrimaryTabRoot(location.pathname)) {
      navigate(defaultTab, { replace: true });
      return;
    }

    // 4. Otherwise, standard back
    navigate(-1);
  }, [overlays, isDefaultTab, isPrimaryTabRoot, location.pathname, navigate, defaultTab, exitAttempt]);

  // Intercept Browser Back
  useEffect(() => {
    const handlePopState = () => {
      // Prevent browser default back by pushing state back
      window.history.pushState(null, '', window.location.href);
      handleBack();
    };

    // Initial push to enable interception
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    };
  }, [handleBack]);

  // Update tab history on navigation
  useEffect(() => {
    primaryTabs.forEach(tab => {
      if (location.pathname.startsWith(tab)) {
        tabHistory.current[tab] = location.pathname;
      }
    });
  }, [location.pathname, primaryTabs]);

  // Method to switch tabs with memory restoration
  const switchTab = useCallback((tabPath) => {
    // If we are already in this tab hierarchy and click it again, go to root
    if (location.pathname.startsWith(tabPath)) {
      navigate(tabPath);
    } else {
      // Otherwise restore last visited sub-path
      const target = tabHistory.current[tabPath] || tabPath;
      navigate(target);
    }
  }, [navigate, location.pathname]);

  const value = {
    registerOverlay,
    unregisterOverlay,
    handleBack,
    switchTab,
    exitAttempt,
    resetExitState: () => setExitAttempt(false)
  };

  return (
    <NativeNavigationContext.Provider value={value}>
      {children}
    </NativeNavigationContext.Provider>
  );
};
