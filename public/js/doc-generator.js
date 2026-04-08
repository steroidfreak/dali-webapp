(function initDocGenerator() {
  const form = document.querySelector('#doc-form');
  const generateBtn = document.querySelector('#generate-btn');
  const statusEl = document.querySelector('#form-status');
  const scanBtn = document.querySelector('#scan-docs-btn');
  const scanStatusEl = document.querySelector('#scan-status');

  if (!form) return;

  // Set default date to today
  const today = new Date().toISOString().split('T')[0];
  const contractDateEl = document.querySelector('#contractDate');
  if (contractDateEl) contractDateEl.value = today;

  // ── Upload zone drag-and-drop ────────────────────────────────────────────
  function setupUploadZone(zoneId, inputId, filesDisplayId) {
    const zone = document.getElementById(zoneId);
    const input = document.getElementById(inputId);
    const filesDisplay = document.getElementById(filesDisplayId);
    if (!zone || !input) return;

    ['dragenter', 'dragover'].forEach(evt =>
      zone.addEventListener(evt, e => { e.preventDefault(); zone.classList.add('drag-over'); })
    );
    ['dragleave', 'drop'].forEach(evt =>
      zone.addEventListener(evt, e => { e.preventDefault(); zone.classList.remove('drag-over'); })
    );
    zone.addEventListener('drop', e => {
      input.files = e.dataTransfer.files;
      updateFileNames(input.files, filesDisplay);
    });
    input.addEventListener('change', () => {
      updateFileNames(input.files, filesDisplay);
    });

    function updateFileNames(files, el) {
      if (!files.length) { el.textContent = ''; return; }
      el.textContent = Array.from(files).map(f => f.name).join(', ');
    }
  }

  setupUploadZone('id-card-zone', 'id-card-input', 'id-card-files');
  setupUploadZone('passport-zone', 'passport-input', 'passport-files');

  // ── Scan button ──────────────────────────────────────────────────────────
  if (scanBtn) {
    scanBtn.addEventListener('click', async () => {
      const idCardInput = document.getElementById('id-card-input');
      const passportInput = document.getElementById('passport-input');
      const files = [...(idCardInput?.files || []), ...(passportInput?.files || [])];

      if (!files.length) {
        scanStatusEl.textContent = 'Please select files first.';
        scanStatusEl.style.color = '#cc0000';
        return;
      }

      scanBtn.disabled = true;
      scanBtn.textContent = 'Scanning…';
      scanStatusEl.textContent = '';
      scanStatusEl.style.color = '';

      try {
        const formData = new FormData();
        files.forEach(f => formData.append('files', f));

        const res = await fetch('http://localhost:8787/api/scan', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(errText || `HTTP ${res.status}`);
        }

        const data = await res.json();
        const info = data.data || {};

        // Auto-fill fields based on extracted info
        const fieldMap = {
          fdwName: info.name || info.fdw_name || info.full_name,
          fdwFin:  info.fin  || info.work_permit || info.fin_number,
          fdwPassport: info.passport || info.passport_number || info.passport_no,
          fdwNationality: info.nationality,
        };

        let filled = 0;
        Object.entries(fieldMap).forEach(([id, val]) => {
          if (val) {
            const el = document.getElementById(id);
            if (el && !el.value) { el.value = val.trim(); filled++; }
          }
        });

        scanStatusEl.textContent = filled
          ? `Scanned — ${filled} field${filled > 1 ? 's' : ''} auto-filled.`
          : 'No fields auto-filled — please fill in manually.';
        scanStatusEl.style.color = filled ? 'var(--success)' : '#cc0000';
      } catch (err) {
        console.error('Scan failed:', err);
        scanStatusEl.textContent = `Scan error: ${err.message}`;
        scanStatusEl.style.color = '#cc0000';
      } finally {
        scanBtn.disabled = false;
        scanBtn.textContent = 'Scan Documents';
      }
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const data = {
      employerName: document.querySelector('#employerName')?.value.trim(),
      employerNric: document.querySelector('#employerNric')?.value.trim(),
      employerAddress: document.querySelector('#employerAddress')?.value.trim(),
      employerContact: document.querySelector('#employerContact')?.value.trim(),
      fdwName: document.querySelector('#fdwName')?.value.trim(),
      fdwFin: document.querySelector('#fdwFin')?.value.trim(),
      fdwPassport: document.querySelector('#fdwPassport')?.value.trim(),
      fdwNationality: document.querySelector('#fdwNationality')?.value.trim(),
      wage: parseFloat(document.querySelector('#wage')?.value) || 0,
      city: document.querySelector('#city')?.value.trim() || 'Singapore',
      country: document.querySelector('#country')?.value.trim() || 'Singapore',
      totalLoan: parseFloat(document.querySelector('#totalLoan')?.value) || 0,
      contractDate: document.querySelector('#contractDate')?.value,
      witness: document.querySelector('#witness')?.value.trim(),
      paymentStartMonth: document.querySelector('#paymentStartMonth')?.value,
      numMonths: parseInt(document.querySelector('#numMonths')?.value) || 24,
    };

    // Validate required
    const required = ['employerName', 'employerNric', 'employerAddress', 'employerContact',
      'fdwName', 'fdwPassport', 'wage'];
    const missing = required.filter(k => !data[k]);
    if (missing.length) {
      statusEl.textContent = `Missing: ${missing.join(', ')}`;
      statusEl.style.color = '#cc0000';
      return;
    }

    generateBtn.textContent = 'Generating…';
    generateBtn.disabled = true;
    statusEl.textContent = '';
    statusEl.style.color = '';

    try {
      const res = await fetch('http://localhost:8787/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || `HTTP ${res.status}`);
      }

      const json = await res.json();
      if (!json.files?.length) throw new Error('No files returned from generator');

      // Decode and download each file
      for (const file of json.files) {
        const binary = atob(file.data);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        a.click();
        URL.revokeObjectURL(url);
      }

      statusEl.textContent = `${json.files.length} files downloaded successfully.`;
      statusEl.style.color = 'var(--success)';
    } catch (err) {
      console.error('Generation failed:', err);
      statusEl.textContent = `Error: ${err.message}`;
      statusEl.style.color = '#cc0000';
    } finally {
      generateBtn.textContent = 'Generate Documents';
      generateBtn.disabled = false;
    }
  });
})();