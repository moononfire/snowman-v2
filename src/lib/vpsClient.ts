const VPS_URL = process.env.VPS_WORKER_URL!
const VPS_TOKEN = process.env.VPS_WORKER_TOKEN!

async function vpsFetch(path: string, init: RequestInit = {}, timeoutMs = 10_000) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(`${VPS_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${VPS_TOKEN}`,
        ...(init.headers ?? {}),
      },
    })
    return res
  } finally {
    clearTimeout(timeout)
  }
}

export const vps = {
  createClient: (slug: string, name: string) =>
    vpsFetch('/clients', {
      method: 'POST',
      body: JSON.stringify({ slug, name, config: {} }),
    }),

  deleteClient: (slug: string) =>
    vpsFetch(`/clients/${slug}`, { method: 'DELETE' }),

  suspendClient: (slug: string) =>
    vpsFetch(`/clients/${slug}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'suspended' }),
    }),

  startRun: (payload: {
    runId: string
    clientSlug: string
    script: string
    params: Record<string, unknown>
    webhookUrl: string
  }) =>
    vpsFetch('/run', { method: 'POST', body: JSON.stringify(payload) }),

  getRun: (vpsRunId: string) => vpsFetch(`/runs/${vpsRunId}`),

  getLogs: (vpsRunId: string, tail?: number) =>
    vpsFetch(`/runs/${vpsRunId}/logs${tail ? `?tail=${tail}` : ''}`),

  getFiles: (slug: string) => vpsFetch(`/clients/${slug}/files`),

  getFile: (slug: string, filename: string) =>
    vpsFetch(`/clients/${slug}/files/${encodeURIComponent(filename)}`, {}, 30_000),

  deleteFile: (slug: string, filename: string) =>
    vpsFetch(`/clients/${slug}/files/${encodeURIComponent(filename)}`, {
      method: 'DELETE',
    }),

  health: () => vpsFetch('/health'),
}
