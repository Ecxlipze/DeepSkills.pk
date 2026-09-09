// Node-only transport. Never replay an interrupted mutation.
export async function requestComplaints({ headers, method = 'GET', body, query = '' } = {}) {
  const endpoint = '/api/admin/academic/complaints';
  const options = {
    method,
    headers: { Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}), ...headers },
    ...(body ? { body: JSON.stringify(body) } : {})
  };
  let response = await fetch(`${endpoint}${query}`, options);


  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error(`Complaints service returned an invalid response (HTTP ${response.status}). Please check the API server.`);
  }
  if (!response.ok || result?.status !== 'success') {
    throw new Error(result?.message || `Complaints request failed (HTTP ${response.status}).`);
  }
  return result.data;
}
