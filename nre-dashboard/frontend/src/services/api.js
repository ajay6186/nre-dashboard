/**
 * API service layer.
 *
 * All calls to the Django backend go through this module.
 * Swap the base URL or add auth headers here without touching components.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || ''

/**
 * Fetch all network devices from the backend.
 *
 * @returns {Promise<Array<{id: number, name: string, ip_address: string, status: string}>>}
 * @throws {Error} When the HTTP response is not OK
 */
export async function fetchDevices() {
  const response = await fetch(`${API_BASE_URL}/devices`)

  if (!response.ok) {
    throw new Error(`Failed to fetch devices — HTTP ${response.status}`)
  }

  return response.json()
}

/**
 * Force an immediate device state change via FastAPI.
 * FastAPI toggles a random unstable device and fires the webhook to Django,
 * which broadcasts the update over WebSocket to all connected clients.
 *
 * @returns {Promise<{triggered: boolean, device_id: number, device_name: string, new_status: string}>}
 */
export async function triggerWebhookChange() {
  const response = await fetch(`${API_BASE_URL}/devices/trigger`, {
    method: 'POST',
  })

  if (!response.ok) {
    throw new Error(`Trigger failed — HTTP ${response.status}`)
  }

  return response.json()
}
