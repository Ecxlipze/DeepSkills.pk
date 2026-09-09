// Asks the Next server to regenerate public pages after an admin content edit.
// Fire-and-forget: on the static-export deploy /api/revalidate is answered by
// public/api/revalidate (which triggers a CI rebuild instead), and any
// failure must never break the admin save flow.
export async function requestRevalidate(paths) {
  try {
    await fetch('/api/revalidate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-revalidate-secret': process.env.NEXT_PUBLIC_REVALIDATE_SECRET || ''
      },
      body: JSON.stringify({ paths })
    });
  } catch {
    /* silent no-op */
  }
}
