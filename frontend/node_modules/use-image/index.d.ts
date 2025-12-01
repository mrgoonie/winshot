declare function useImage(
  url: string,
  crossOrigin?: 'anonymous' | 'use-credentials',
  referrerpolicy?: 'no-referrer' | 'no-referrer-when-downgrade' | 'origin' | 'origin-when-cross-origin' | 'same-origin' | 'strict-origin' | 'strict-origin-when-cross-origin' | 'unsafe-url'
): [undefined | HTMLImageElement, 'loaded' | 'loading' | 'failed'];

export = useImage;
