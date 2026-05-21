// ── CONFIG ──────────────────────────────────────────────────────────
// Configure this value in .env or in GitHub Actions secrets.
const GOOGLE_SCRIPT_URL = import.meta.env.VITE_GOOGLE_SCRIPT_URL || '';
// ────────────────────────────────────────────────────────────────────

// ── AUTO-CALCULATE AGE FROM BIRTH DATE ──
(function initAgeCalc() {
  const diaInput = document.getElementById('f_nac_dia');
  const mesInput = document.getElementById('f_nac_mes');
  const anoInput = document.getElementById('f_nac_ano');
  const edadInput = document.getElementById('f_edad');

  if (anoInput) anoInput.max = new Date().getFullYear().toString();

  function buildBirthDate() {
    const dia = Number(diaInput?.value);
    const mes = Number(mesInput?.value);
    const ano = Number(anoInput?.value);

    if (!dia || !mes || !ano) return null;

    const fecha = new Date(ano, mes - 1, dia);
    const isValid =
      fecha.getFullYear() === ano &&
      fecha.getMonth() === mes - 1 &&
      fecha.getDate() === dia;

    return isValid ? fecha : null;
  }

  function calcularEdad(nac) {
    const hoy = new Date();
    let edad = hoy.getFullYear() - nac.getFullYear();
    const mes = hoy.getMonth() - nac.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < nac.getDate())) edad--;
    return edad;
  }

  function updateEdad() {
    const fechaNac = buildBirthDate();
    if (!fechaNac) return;

    const edad = calcularEdad(fechaNac);
    if (edad >= 0 && edad <= 120) {
      edadInput.value = edad;
      edadInput.classList.remove('input-error');
    }
  }

  if (diaInput && mesInput && anoInput && edadInput) {
    [diaInput, mesInput, anoInput].forEach(input => {
      input.addEventListener('input', updateEdad);
      input.addEventListener('change', updateEdad);
    });
  }
})();

// ── VALIDACIÓN DE CAMPOS ──
// Map: section index -> array of { id, label } for required fields
const REQUIRED_FIELDS = {
  0: [
    { id: 'f_nombre',    label: 'Nombre y Apellidos' },
    { id: 'f_num_doc',   label: 'Nº de documento' },
    { id: 'f_edad',      label: 'Edad' },
  ],
};

function validateSection(sectionIndex) {
  const fields = REQUIRED_FIELDS[sectionIndex];
  if (!fields) return true; // no required fields defined for this section

  const missing = [];
  fields.forEach(({ id, label }) => {
    const el = document.getElementById(id);
    if (!el) return;
    const empty = el.value === null || el.value.toString().trim() === '';
    el.classList.toggle('input-error', empty);
    if (empty) missing.push(label);
  });

  if (missing.length > 0) {
    showToast(`Campos obligatorios: ${missing.join(', ')}`, true);
    return false;
  }
  return true;
}

let currentSection = 0;
const totalSections = 5;

// ── CHIP SELECTION ──
document.querySelectorAll('.option-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    const input = chip.querySelector('input');
    if (input.type === 'radio') {
      const name = input.name;
      document.querySelectorAll(`input[name="${name}"]`).forEach(r => {
        r.closest('.option-chip').classList.remove('selected');
      });
      chip.classList.add('selected');
    } else {
      chip.classList.toggle('selected', input.checked);
    }
  });
});

// ── CONDITIONAL FIELDS ──
function clearFieldValue(el) {
  if (el.type === 'checkbox' || el.type === 'radio') {
    el.checked = false;
    el.closest('.option-chip')?.classList.remove('selected');
  } else {
    el.value = '';
  }
}

function clearConditionalFields(el) {
  el.querySelectorAll('input, select, textarea').forEach(clearFieldValue);
}

function toggleConditional(id, showValue, inputEl) {
  const el = document.getElementById(id);
  if (!el) return;
  const shouldShow = inputEl.value === showValue;
  el.classList.toggle('visible', shouldShow);
  if (!shouldShow) clearConditionalFields(el);
}

document.querySelectorAll('[data-toggle-target]').forEach(input => {
  const target = document.getElementById(input.dataset.toggleTarget);
  if (!target) return;

  input.addEventListener('change', () => {
    target.classList.toggle('visible', input.checked);
    if (!input.checked) clearConditionalFields(target);
  });
});

document.querySelectorAll('input[name="org_tipos"]').forEach(input => {
  input.addEventListener('change', () => {
    const orgInputs = document.querySelectorAll('input[name="org_tipos"]');
    const nsnrInput = document.querySelector('input[name="org_tipos"][value="N/S N/R"]');
    if (!nsnrInput) return;

    if (input === nsnrInput && nsnrInput.checked) {
      orgInputs.forEach(option => {
        if (option === nsnrInput) return;
        clearFieldValue(option);
        option.closest('.option-chip').style.display = 'none';
      });
      return;
    }

    if (input === nsnrInput && !nsnrInput.checked) {
      orgInputs.forEach(option => {
        option.closest('.option-chip').style.display = '';
      });
      return;
    }

    if (input !== nsnrInput && input.checked) {
      clearFieldValue(nsnrInput);
      orgInputs.forEach(option => {
        option.closest('.option-chip').style.display = '';
      });
    }
  });
});

// ── NAVIGATION ──
function navigate(dir) {
  // Validate before advancing forward
  if (dir > 0 && !validateSection(currentSection)) return;

  const sections = document.querySelectorAll('.form-section');
  const dots = document.querySelectorAll('.step-dot');

  dots[currentSection].classList.remove('active');
  dots[currentSection].classList.add('done');

  sections[currentSection].classList.remove('active');
  currentSection += dir;
  if (currentSection < 0) currentSection = 0;
  if (currentSection >= totalSections) currentSection = totalSections - 1;

  sections[currentSection].classList.add('active');
  dots[currentSection].classList.remove('done');
  dots[currentSection].classList.add('active');

  updateNav();
  updateProgress();
  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (currentSection === totalSections - 1) buildSummary();
}

function updateNav() {
  const prev = document.getElementById('btn-prev');
  const next = document.getElementById('btn-next');
  const submit = document.getElementById('btn-submit');

  prev.disabled = currentSection === 0;
  if (currentSection === totalSections - 1) {
    next.style.display = 'none';
    submit.style.display = 'flex';
  } else {
    next.style.display = 'flex';
    submit.style.display = 'none';
  }
}

function updateProgress() {
  const pct = Math.round(((currentSection + 1) / totalSections) * 100);
  document.getElementById('progress-fill').style.width = pct + '%';
  document.getElementById('progress-label').textContent = `Sección ${currentSection + 1}/${totalSections}`;
}

// ── SUMMARY ──
function buildSummary() {
  const data = collectFormData();
  let html = '<div style="display:grid;gap:8px;">';
  for (const [key, val] of Object.entries(data)) {
    if (!val || val === '' || (Array.isArray(val) && val.length === 0)) continue;
    const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const value = Array.isArray(val) ? val.join(', ') : val;
    html += `<div style="display:flex;gap:12px;padding:6px 0;border-bottom:1px solid var(--border)">
      <span style="font-weight:600;min-width:200px;color:var(--text)">${label}:</span>
      <span style="color:var(--muted)">${value}</span>
    </div>`;
  }
  html += '</div>';
  document.getElementById('summary-content').innerHTML = html;
}

// ── COLLECT DATA ──
function collectFormData() {
  const data = {};
  const inputs = document.querySelectorAll('input, select, textarea');
  inputs.forEach(el => {
    if (!el.name) return;
    if (el.type === 'radio') {
      if (el.checked) data[el.name] = el.value;
    } else if (el.type === 'checkbox') {
      if (el.checked) {
        if (!data[el.name]) data[el.name] = [];
        data[el.name].push(el.value);
      }
    } else {
      if (el.value) data[el.name] = el.value;
    }
  });
  data['timestamp'] = new Date().toISOString();
  return data;
}

// ── SUBMIT ──
async function submitForm() {
  if (!GOOGLE_SCRIPT_URL) {
    showToast('Configura VITE_GOOGLE_SCRIPT_URL antes de enviar.', true);
    return;
  }

  const btn = document.getElementById('btn-submit');
  btn.disabled = true;
  btn.textContent = '⏳ Enviando...';

  const data = collectFormData();

  try {
    // Flatten arrays for Google Sheets
    const flatData = {};
    for (const [k, v] of Object.entries(data)) {
      flatData[k] = Array.isArray(v) ? v.join(' | ') : v;
    }

    const formBody = new URLSearchParams(flatData).toString();
    await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formBody,
      mode: 'no-cors'
    });

    // no-cors means we can't read the response, assume success
    document.querySelectorAll('.form-section').forEach(s => s.classList.remove('active'));
    document.getElementById('nav-bar').style.display = 'none';
    document.getElementById('success-view').classList.add('visible');
    showToast('✅ ¡Ficha enviada correctamente!');
  } catch (err) {
    console.error(err);
    showToast('❌ Error al enviar. Revisa la conexión.', true);
    btn.disabled = false;
    btn.textContent = '📤 Enviar ficha';
  }
}

function resetForm() {
  document.querySelectorAll('input, textarea, select').forEach(el => {
    if (el.type === 'checkbox' || el.type === 'radio') {
      el.checked = false;
      el.closest('.option-chip')?.classList.remove('selected');
    } else {
      el.value = '';
    }
    el.classList.remove('input-error');
  });
  document.querySelectorAll('.conditional').forEach(c => c.classList.remove('visible'));
  document.querySelectorAll('input[name="org_tipos"]').forEach(input => {
    input.closest('.option-chip').style.display = '';
  });
  currentSection = 0;
  document.querySelectorAll('.form-section').forEach((s, i) => s.classList.toggle('active', i === 0));
  document.querySelectorAll('.step-dot').forEach((d, i) => {
    d.classList.toggle('active', i === 0);
    d.classList.remove('done');
  });
  document.getElementById('nav-bar').style.display = 'flex';
  document.getElementById('success-view').classList.remove('visible');
  updateNav();
  updateProgress();
}

// ── TOAST ──
function showToast(msg, isError = false) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'show' + (isError ? ' error' : '');
  setTimeout(() => t.className = '', 3500);
}

// ── DOT NAVIGATION ──
document.querySelectorAll('.step-dot').forEach((dot, i) => {
  dot.addEventListener('click', () => {
    const diff = i - currentSection;
    if (diff !== 0) navigate(diff);
  });
});

// Expose handlers used by the existing markup.
Object.assign(window, { navigate, resetForm, submitForm, toggleConditional });

// Init
updateProgress();
updateNav();
