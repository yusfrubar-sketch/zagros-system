/**
 * License and trial: all Supabase access lives here in main process.
 * Credentials are read from process.env only (loaded from .env file, never in source).
 * Renderer never sees URL or keys.
 */

import crypto from 'crypto'
import os from 'os'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY

let supabaseClient: ReturnType<typeof createClient> | null = null

function createClient() {
  if (typeof SUPABASE_URL !== 'string' || typeof SUPABASE_ANON_KEY !== 'string' || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return null
  }
  const { createClient: createSupabaseClient } = require('@supabase/supabase-js')
  return createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY)
}

function getClient() {
  if (supabaseClient === null) {
    supabaseClient = createClient()
  }
  return supabaseClient
}

/** Stable machine fingerprint (main process only). */
export function getMachineId(): string {
  const raw = [
    os.hostname(),
    os.platform(),
    os.arch(),
    process.env.USERPROFILE || process.env.HOME || '',
    process.env.COMPUTERNAME || process.env.HOSTNAME || '',
  ].join('|')
  return crypto.createHash('sha256').update(raw, 'utf8').digest('hex').slice(0, 32)
}

function hashKey(key: string): string {
  return crypto.createHash('sha256').update(key.trim(), 'utf8').digest('hex')
}

export type TrialResult = { ok: true; trialEndsAt: string } | { ok: false; error: string }

/** Start 7-day trial. Uses server time so user cannot extend by changing PC date. */
export async function startTrial(machineId: string): Promise<TrialResult> {
  const client = getClient()
  if (!client) return { ok: false, error: 'offline' }

  try {
    const { data: timeData, error: timeErr } = await client.rpc('get_server_time').single()
    const serverNow = timeErr || !timeData?.now ? new Date() : new Date(timeData.now as string)
    const trialEndsAt = new Date(serverNow.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()

    const { error } = await client.from('trials').upsert(
      { machine_id: machineId, trial_ends_at: trialEndsAt },
      { onConflict: 'machine_id', ignoreDuplicates: true }
    )
    if (error) {
      const { data: existing } = await client.from('trials').select('trial_ends_at').eq('machine_id', machineId).single()
      if (existing) return { ok: true, trialEndsAt: existing.trial_ends_at as string }
      return { ok: false, error: error.message }
    }
    const { data: row } = await client.from('trials').select('trial_ends_at').eq('machine_id', machineId).single()
    return { ok: true, trialEndsAt: (row?.trial_ends_at as string) ?? trialEndsAt }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'unknown' }
  }
}

export type CheckTrialResult =
  | { ok: true; valid: boolean; trialEndsAt: string }
  | { ok: false; error: string }

/** Check if trial still valid. Uses server time so changing PC date cannot extend trial. */
export async function checkTrial(machineId: string): Promise<CheckTrialResult> {
  const client = getClient()
  if (!client) return { ok: false, error: 'offline' }

  try {
    const { data: timeData } = await client.rpc('get_server_time').single().catch(() => ({ data: null }))
    const serverNow = timeData?.now ? new Date(timeData.now as string) : new Date()

    const { data: row, error } = await client.from('trials').select('trial_ends_at').eq('machine_id', machineId).single()
    if (error || !row) return { ok: false, error: 'no_trial' }
    const trialEndsAt = row.trial_ends_at as string
    const valid = serverNow < new Date(trialEndsAt)
    return { ok: true, valid, trialEndsAt }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'unknown' }
  }
}

export type ActivateResult = { ok: true } | { ok: false; error: string }

/** Activate license for this machine. One key = one PC. Requires online. */
export async function activateLicense(key: string, machineId: string): Promise<ActivateResult> {
  const client = getClient()
  if (!client) return { ok: false, error: 'offline' }

  const keyHash = hashKey(key)
  try {
    const { data: row, error: selectErr } = await client
      .from('license_activations')
      .select('machine_id')
      .eq('key_hash', keyHash)
      .maybeSingle()

    if (selectErr) return { ok: false, error: selectErr.message }
    if (!row) return { ok: false, error: 'invalid_key' }
    const existing = row.machine_id as string | null
    if (existing && existing !== machineId) return { ok: false, error: 'already_used' }
    if (existing === machineId) return { ok: true }

    const { error: updateErr } = await client
      .from('license_activations')
      .update({ machine_id: machineId, activated_at: new Date().toISOString() })
      .eq('key_hash', keyHash)
      .is('machine_id', null)

    if (updateErr) return { ok: false, error: updateErr.message }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'unknown' }
  }
}

export async function checkLicense(machineId: string): Promise<boolean> {
  const client = getClient()
  if (!client) return false
  const { data } = await client.from('license_activations').select('key_hash').eq('machine_id', machineId).limit(1)
  return Array.isArray(data) && data.length > 0
}
