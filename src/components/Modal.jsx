import React from 'react';
import { createPortal } from 'react-dom';
import '../styles/Modal.css';

const Modal = ({ isOpen, onClose, title, children, variant }) => {
  if (!isOpen) return null;

  const modalContent = variant === 'image' ? (
    <div className="modal-overlay image-preview-mode" onClick={onClose}>
      <div className="modal-content-plain" onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  ) : (
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

  return createPortal(modalContent, document.body);
};

export default Modal;
