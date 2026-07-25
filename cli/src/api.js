async function parseErrorBody(res) {
  try {
    const body = await res.json();
    return body.message || JSON.stringify(body);
  } catch {
    return res.statusText;
  }
}

export async function login(baseUrl, email, password) {
  const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`로그인 실패 (${res.status}): ${await parseErrorBody(res)}`);
  return res.json();
}

export async function createProject(baseUrl, token, project) {
  const res = await fetch(`${baseUrl}/api/v1/projects`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(project),
  });
  if (!res.ok) throw new Error(`프로젝트 생성 실패 (${res.status}): ${await parseErrorBody(res)}`);
  return res.json();
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
