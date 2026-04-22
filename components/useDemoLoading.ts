'use client';

import { useEffect, useState } from 'react';

export function useDemoLoading(delay = 650) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timeout = window.setTimeout(() => setIsLoading(false), delay);
    return () => window.clearTimeout(timeout);
  }, [delay]);

  return isLoading;
}
