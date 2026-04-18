import React, { useState, useRef } from 'react';
import { RefreshCw } from 'lucide-react';
import '../styles/PullToRefresh.css';

const PullToRefresh = ({ onRefresh, children }) => {
  const [pullDist, setPullDist] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const containerRef = useRef(null);
  const startY = useRef(0);
  
  const PULL_THRESHOLD = 80;
  const PULL_MAX = 120;

  const handleTouchStart = (e) => {
    if (containerRef.current.scrollTop === 0 && !isRefreshing) {
      startY.current = e.touches[0].pageY;
      setIsPulling(true);
    }
  };

  const handleTouchMove = (e) => {
    if (!isPulling || isRefreshing) return;
    
    const currentY = e.touches[0].pageY;
    const diff = currentY - startY.current;
    
    if (diff > 0) {
      // Resistance effect
      const dist = Math.min(diff * 0.4, PULL_MAX);
      setPullDist(dist);
      
      // Stop body scroll if pulling
      if (diff > 5) {
        if (e.cancelable) e.preventDefault();
      }
    } else {
      setIsPulling(false);
      setPullDist(0);
    }
  };

  const handleTouchEnd = () => {
    if (!isPulling || isRefreshing) return;
    
    if (pullDist >= PULL_THRESHOLD) {
      setIsRefreshing(true);
      setPullDist(PULL_THRESHOLD);
      onRefresh().finally(() => {
        setTimeout(() => {
          setIsRefreshing(false);
          setPullDist(0);
          setIsPulling(false);
        }, 1000);
      });
    } else {
      setPullDist(0);
      setIsPulling(false);
    }
  };

  return (
    <div 
      ref={containerRef}
      className="ptr-container"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div 
        className="ptr-indicator"
        style={{ 
          transform: `translateY(${pullDist}px) scale(${Math.min(pullDist / PULL_THRESHOLD, 1)})`,
          opacity: pullDist / PULL_THRESHOLD,
          transition: isPulling ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s'
        }}
      >
        <div className={`ptr-icon-box ${isRefreshing ? 'spinning' : ''}`}>
           <RefreshCw size={20} color="var(--primary)" />
        </div>
      </div>
      
      <div 
        className="ptr-content"
        style={{ 
          transform: `translateY(${pullDist}px)`,
          transition: isPulling ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default PullToRefresh;
