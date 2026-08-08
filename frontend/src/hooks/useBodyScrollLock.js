import { useEffect } from 'react';

let lockCount = 0;

export default function useBodyScrollLock(active) {
  useEffect(() => {
    if (!active) return;

    if (lockCount === 0) {
      document.body.style.overflow = 'hidden';
      document.body.style.width = '100%';
    }
    lockCount++;

    return () => {
      lockCount--;
      if (lockCount === 0) {
        document.body.style.overflow = '';
        document.body.style.width = '';
      }
    };
  }, [active]);
}
