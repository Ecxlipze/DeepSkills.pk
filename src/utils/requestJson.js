// One attempt only: an interrupted mutation or mail send may have completed.
export async function requestJson(url, options) {
  const response = await fetch(url, options);
  let result;
  try { result = await response.json(); }
  catch { throw new Error(`Service returned an invalid response (HTTP ${response.status}). Please check the server.`); }
  if (!response.ok || !result || result.status === 'error' || result.ok === false || (result.status !== 'success' && result.ok !== true)) {
    throw new Error(result?.message || `Request failed (HTTP ${response.status}).`);
  }
  return result;
}
