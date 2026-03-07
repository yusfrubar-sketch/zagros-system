(function () {
  'use strict';

  const SUPABASE_URL = window.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = window.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    document.body.innerHTML = '<div class="container"><p class="error">Missing config. Copy config.example.js to config.js and set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.</p></div>';
    return;
  }

  var createClient = typeof window.supabase === 'function' ? window.supabase : (window.supabase && (window.supabase.createClient || window.supabase.default));
  var supabase = createClient && createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  if (!supabase) {
    document.body.innerHTML = '<div class="container"><p class="error">Supabase script failed to load. Check config.js and console.</p></div>';
    return;
  }

  function generatePassword(length) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let s = '';
    const arr = new Uint8Array(length);
    crypto.getRandomValues(arr);
    for (let i = 0; i < length; i++) s += chars[arr[i] % chars.length];
    return s;
  }

  function hashKey(key) {
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(key.trim())).then(function (buf) {
      return Array.from(new Uint8Array(buf)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
    });
  }

  document.getElementById('btnGenerate').addEventListener('click', function () {
    const resultEl = document.getElementById('generatedResult');
    const keyEl = document.getElementById('generatedKey');
    const errEl = document.getElementById('generateError');
    errEl.classList.add('hidden');
    const key = generatePassword(16);
    hashKey(key).then(function (keyHash) {
      return supabase.from('license_activations').insert({ key_hash: keyHash, machine_id: null, activated_at: null }).select().single();
    }).then(function () {
      keyEl.value = key;
      resultEl.classList.remove('hidden');
    }).catch(function (e) {
      errEl.textContent = e.message || 'Failed to generate';
      errEl.classList.remove('hidden');
    });
  });

  document.getElementById('btnCopyKey').addEventListener('click', function () {
    const input = document.getElementById('generatedKey');
    input.select();
    navigator.clipboard.writeText(input.value);
  });

  function loadTrials() {
    const tbody = document.querySelector('#trialsTable tbody');
    const errEl = document.getElementById('trialsError');
    errEl.classList.add('hidden');
    tbody.innerHTML = '';
    supabase.from('trials').select('machine_id, trial_ends_at').order('trial_ends_at', { ascending: false }).then(function (r) {
      if (r.error) {
        errEl.textContent = r.error.message;
        errEl.classList.remove('hidden');
        return;
      }
      (r.data || []).forEach(function (row) {
        const tr = document.createElement('tr');
        tr.innerHTML = '<td><code>' + (row.machine_id || '') + '</code></td><td>' + (row.trial_ends_at || '') + '</td>';
        tbody.appendChild(tr);
      });
    });
  }

  function loadLicenses() {
    const tbody = document.querySelector('#licensesTable tbody');
    const errEl = document.getElementById('licensesError');
    errEl.classList.add('hidden');
    tbody.innerHTML = '';
    supabase.from('license_activations').select('machine_id, activated_at').not('machine_id', 'is', null).order('activated_at', { ascending: false }).then(function (r) {
      if (r.error) {
        errEl.textContent = r.error.message;
        errEl.classList.remove('hidden');
        return;
      }
      (r.data || []).forEach(function (row) {
        const tr = document.createElement('tr');
        tr.innerHTML = '<td><code>' + (row.machine_id || '') + '</code></td><td>' + (row.activated_at || '') + '</td>';
        tbody.appendChild(tr);
      });
    });
  }

  document.getElementById('btnRefreshTrials').addEventListener('click', loadTrials);
  document.getElementById('btnRefreshLicenses').addEventListener('click', loadLicenses);
  loadTrials();
  loadLicenses();
})();
