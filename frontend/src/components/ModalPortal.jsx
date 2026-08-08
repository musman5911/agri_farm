import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export default function ModalPortal({ children }) {
  const [container, setContainer] = useState(null);

  useEffect(() => {
    let portalRoot = document.getElementById('ff-modal-root');
    if (!portalRoot) {
      portalRoot = document.createElement('div');
      portalRoot.id = 'ff-modal-root';
      document.body.appendChild(portalRoot);
    }
    setContainer(portalRoot);
  }, []);

  if (!container) return null;
  return createPortal(children, container);
}
