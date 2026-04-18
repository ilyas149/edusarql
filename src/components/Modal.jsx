import React, { useEffect } from 'react';
import { useNativeBackNavigation } from '../hooks/useNativeBackNavigation';
import '../styles/Modal.css';

const Modal = ({ isOpen, onClose, title, children, variant, id }) => {
  const { registerOverlay, unregisterOverlay } = useNativeBackNavigation();
  const generatedId = React.useId();
  const modalId = React.useMemo(() => 
    id || `modal-${title?.replace(/\s+/g, '-').toLowerCase() || generatedId.replace(/:/g, '')}`,
    [id, title, generatedId]
  );

  useEffect(() => {
    if (isOpen) {
      registerOverlay(modalId, onClose);
      return () => unregisterOverlay(modalId);
    }
  }, [isOpen, modalId, onClose, registerOverlay, unregisterOverlay]);

  if (!isOpen) return null;

  if (variant === 'image') {
    return (
      <div className="modal-overlay image-preview-mode" onClick={onClose}>
        <div className="modal-content-plain" onClick={e => e.stopPropagation()}>
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
