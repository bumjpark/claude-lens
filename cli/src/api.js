async function parseErrorBody(res) {
  try {
    const body = await res.json();
    return body.message || JSON.stringify(body);
  } catch {
    return res.statusText;
  }
}

// apiKey가 이 projectId에 대해 유효한지 미리 확인한다 (오타를 init 시점에 바로 잡기 위함).
export async function verifyApiKey(baseUrl, apiKey, projectId) {
  const res = await fetch(`${baseUrl}/api/v1/ingest/status/${projectId}`, {
    headers: { 'X-API-Key': apiKey },
  });
  if (!res.ok) throw new Error(`API Key 확인 실패 (${res.status}): ${await parseErrorBody(res)}`);
}

export async function uploadBatch(baseUrl, apiKey, logs) {
  const res = await fetch(`${baseUrl}/api/v1/ingest/interaction/batch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
    },
    body: JSON.stringify({ logs }),
  });
  if (!res.ok) throw new Error(`업로드 실패 (${res.status}): ${await parseErrorBody(res)}`);
}
