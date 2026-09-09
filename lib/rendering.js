// Public pages retain ISR and on-demand rendering on the Node server.
export function maybeRevalidate(seconds) {
  return { revalidate: seconds };
}

export function staticFallback(mode = 'blocking') {
  return mode;
}
