import React from 'react';
import '../styles/Modal.css';

const Modal = ({ isOpen, onClose, title, children, variant }) => {
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
