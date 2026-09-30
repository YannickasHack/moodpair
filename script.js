/* ==========================================================
   MoodPair — Logique de l'application
   Flux : Créer compte → OTP → Chercher partenaire → App
   ========================================================== */

/* ---------- Humeurs ---------- */
const HUMOURS = [
  { id: 'heureux',   emoji: '😄', label: 'Heureux' },
  { id: 'amoureux',  emoji: '😍', label: 'Amoureux' },
  { id: 'serein',    emoji: '😌', label: 'Serein' },
  { id: 'neutre',    emoji: '😐', label: 'Neutre' },
  { id: 'triste',    emoji: '😔', label: 'Triste' },
  { id: 'frustre',   emoji: '😤', label: 'Frustré' },
  { id: 'en_colere', emoji: '😡', label: 'En colère' },
  { id: 'stresse',   emoji: '😰', label: 'Stressé' },
  { id: 'fatigue',   emoji: '😴', label: 'Fatigué' },
  { id: 'malade',    emoji: '🤒', label: 'Malade' },
  { id: 'euphorique',emoji: '🥳', label: 'Euphorique' },
  { id: 'pensif',    emoji: '🤔', label: 'Pensif' },
];

const STORAGE_KEY = 'moodpair_db_v2';

/* ---------- Base locale ---------- */
function loadDB() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : { users: [], moods: [], session: null };
}

function saveDB() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

let db = loadDB();
let selectedMoodId = null;

/* ---------- Utilitaires ---------- */
function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function formatPhone(v) {
  return v.replace(/[^+\d]/g, '');
}

function initials(name) {
  return name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function getCurrentUser() {
  if (!db.session) return null;
  return db.users.find(u => u.phone === db.session) || null;
}

function getPartner(user) {
  if (!user || !user.partnerPhone) return null;
  return db.users.find(u => u.phone === user.partnerPhone) || null;
}

/* ---------- Toast ---------- */
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove('show'), 2600);
}

/* ---------- Écrans ---------- */
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

/* ---------- Confettis ---------- */
function launchConfetti() {
  const container = document.getElementById('confetti-container');
  const colors = ['#e11d48', '#f43f5e', '#ffffff', '#9f1239', '#fecdd3'];
  for (let i = 0; i < 70; i++) {
    const c = document.createElement('div');
    c.className = 'confetti';
    c.style.left = Math.random() * 100 + 'vw';
    c.style.background = colors[Math.floor(Math.random() * colors.length)];
    c.style.animationDuration = (Math.random() * 2 + 2) + 's';
    c.style.animationDelay = (Math.random() * 0.6) + 's';
    c.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
    container.appendChild(c);
    setTimeout(() => c.remove(), 4500);
  }
}

/* ==========================================================
   ÉTAPE 1 — CRÉATION DU COMPTE
   ========================================================== */
document.getElementById('form-auth').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = document.getElementById('input-name').value.trim();
  const phone = formatPhone(document.getElementById('input-phone').value.trim());

  if (!name || phone.length < 8) {
    showToast('Vérifie ton prénom et ton numéro');
    return;
  }

  // Compte existant → reconnexion directe
  const existing = db.users.find(u => u.phone === phone);
  if (existing) {
    db.session = phone;
    saveDB();
    showToast(`Bon retour, ${existing.name} !`);
    routeAfterAuth(existing);
    return;
  }

  // Nouveau compte → OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  window._pending = { name, phone, otp };
  document.getElementById('otp-hint').textContent = `(Simulation — ton code : ${otp})`;
  document.getElementById('input-otp').value = '';
  showScreen('screen-otp');
});

/* ==========================================================
   ÉTAPE 2 — VALIDATION OTP → CRÉATION EFFECTIVE DU COMPTE
   ========================================================== */
document.getElementById('form-otp').addEventListener('submit', (e) => {
  e.preventDefault();
  const code = document.getElementById('input-otp').value.trim();
  const pending = window._pending;

  if (!pending || code !== pending.otp) {
    showToast('Code incorrect');
    return;
  }

  const newUser = {
    phone: pending.phone,
    name: pending.name,
    partnerPhone: null,
    createdAt: Date.now(),
  };

  db.users.push(newUser);
  db.session = newUser.phone;
  saveDB();
  window._pending = null;

  showToast(`Compte créé, ${newUser.name} !`);
  routeAfterAuth(newUser);
});

/* ---------- Routage après auth ---------- */
function routeAfterAuth(user) {
  if (!user.partnerPhone) {
    showScreen('screen-pair');
  } else {
    startApp();
  }
}

/* ==========================================================
   ÉTAPE 3 — RECHERCHE DU PARTENAIRE
   ========================================================== */
document.getElementById('form-pair').addEventListener('submit', (e) => {
  e.preventDefault();
  const me = getCurrentUser();
  const phone = formatPhone(document.getElementById('input-partner-phone').value.trim());
  const msg = document.getElementById('pair-message');

  if (phone === me.phone) {
    msg.textContent = "Tu ne peux pas te lier à toi-même 😄";
    msg.className = 'form-message error';
    return;
  }

  const partner = db.users.find(u => u.phone === phone);

  if (!partner) {
    msg.textContent = "Cette personne n'a pas encore rejoint MoodPair.";
    msg.className = 'form-message error';
    return;
  }

  if (partner.partnerPhone && partner.partnerPhone !== me.phone) {
    msg.textContent = "Cette personne est déjà liée à quelqu'un d'autre.";
    msg.className = 'form-message error';
    return;
  }

  // Liaison réciproque
  me.partnerPhone = phone;
  partner.partnerPhone = me.phone;
  saveDB();

  msg.textContent = '✅ Vous êtes maintenant connectés !';
  msg.className = 'form-message success';

  setTimeout(() => {
    msg.textContent = '';
    document.getElementById('input-partner-phone').value = '';
    startApp();
    showToast('Couple connecté 💞');
  }, 1100);
});

/* ---------- Passer cette étape ---------- */
document.getElementById('btn-skip-pair').addEventListener('click', () => {
  startApp();
  showToast('Tu pourras ajouter ton partenaire plus tard');
});

/* ==========================================================
   DÉMARRAGE DE L'APP
   ========================================================== */
function startApp() {
  const me = getCurrentUser();
  if (!me) { showScreen('screen-auth'); return; }

  showScreen('screen-app');
  renderHeader(me);
  renderMoodGrid();
  renderDashboard();
  renderHistory();
  renderProfile();

  // Restaure humeur du jour
  const today = todayKey();
  const myMood = db.moods.find(m => m.userPhone === me.phone && m.date === today);
  if (myMood) {
    selectedMoodId = myMood.moodId;
    document.querySelectorAll('.mood-card').forEach(c => {
      c.classList.toggle('selected', c.dataset.id === myMood.moodId);
    });
    document.getElementById('input-note').value = myMood.note || '';
  } else {
    selectedMoodId = null;
    document.getElementById('input-note').value = '';
    document.querySelectorAll('.mood-card').forEach(c => c.classList.remove('selected'));
  }
}

function renderHeader(me) {
  document.getElementById('header-avatar').textContent = initials(me.name);
  document.getElementById('header-name').textContent = me.name;
}

/* ==========================================================
   HUMEURS
   ========================================================== */
function renderMoodGrid() {
  const grid = document.getElementById('mood-grid');
  if (grid.dataset.rendered) return;
  grid.innerHTML = '';

  HUMOURS.forEach(h => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'mood-card';
    card.dataset.id = h.id;
    card.innerHTML = `
      <span class="mood-emoji">${h.emoji}</span>
      <span class="mood-label">${h.label}</span>
    `;
    card.addEventListener('click', () => selectMood(h.id));
    grid.appendChild(card);
  });
  grid.dataset.rendered = '1';
}

function selectMood(id) {
  selectedMoodId = id;
  document.querySelectorAll('.mood-card').forEach(c => {
    c.classList.toggle('selected', c.dataset.id === id);
  });
  if (navigator.vibrate) navigator.vibrate(12);
}

document.getElementById('btn-share-mood').addEventListener('click', () => {
  if (!selectedMoodId) {
    showToast('Choisis d\'abord une humeur 😊');
    return;
  }

  const me = getCurrentUser();
  const today = todayKey();
  const note = document.getElementById('input-note').value.trim();

  db.moods = db.moods.filter(m => !(m.userPhone === me.phone && m.date === today));

  db.moods.push({
    userPhone: me.phone,
    moodId: selectedMoodId,
    note,
    date: today,
    createdAt: Date.now(),
  });

  saveDB();
  showToast('Humeur partagée 💫');
  renderDashboard();
  renderHistory();

  const partner = getPartner(me);
  if (partner) {
    const partnerMood = db.moods.find(m => m.userPhone === partner.phone && m.date === today);
    if (partnerMood) launchConfetti();
  }
});

/* ==========================================================
   TABLEAU DE BORD
   ========================================================== */
function renderDashboard() {
  const me = getCurrentUser();
  if (!me) return;
  const partner = getPartner(me);
  const today = todayKey();

  const myMood = db.moods.find(m => m.userPhone === me.phone && m.date === today);
  const partnerMood = partner ? db.moods.find(m => m.userPhone === partner.phone && m.date === today) : null;

  // Ma carte
  if (myMood) {
    const h = HUMOURS.find(x => x.id === myMood.moodId);
    document.getElementById('me-emoji').textContent = h.emoji;
    document.getElementById('me-mood').textContent = h.label;
    document.getElementById('me-note').textContent = myMood.note ? `« ${myMood.note} »` : '';
  } else {
    document.getElementById('me-emoji').textContent = '❔';
    document.getElementById('me-mood').textContent = 'Aucune humeur partagée';
    document.getElementById('me-note').textContent = '';
  }

  // Carte partenaire
  if (partnerMood) {
    const h = HUMOURS.find(x => x.id === partnerMood.moodId);
    document.getElementById('partner-emoji').textContent = h.emoji;
    document.getElementById('partner-mood').textContent = h.label;
    document.getElementById('partner-note').textContent = partnerMood.note ? `« ${partnerMood.note} »` : '';
  } else {
    document.getElementById('partner-emoji').textContent = '❔';
    document.getElementById('partner-mood').textContent = partner ? 'En attente…' : 'Aucun partenaire';
    document.getElementById('partner-note').textContent = partner ? '' : 'Ajoute ton partenaire dans Profil';
  }

  // Comparaison
  const banner = document.getElementById('compare-text');
  if (myMood && partnerMood) {
    const hm = HUMOURS.find(x => x.id === myMood.moodId);
    const hp = HUMOURS.find(x => x.id === partnerMood.moodId);
    if (myMood.moodId === partnerMood.moodId) {
      banner.textContent = `Vous êtes tous les deux ${hm.emoji} ${hm.label.toLowerCase()} aujourd'hui !`;
    } else {
      banner.textContent = `Toi : ${hm.emoji} ${hm.label} · Partenaire : ${hp.emoji} ${hp.label}`;
    }
  } else {
    banner.textContent = 'Partagez vos humeurs pour voir votre compatibilité du jour.';
  }

  renderStats(me, partner);
}

function renderStats(me, partner) {
  if (!partner) {
    document.getElementById('stat-days').textContent = '0';
    document.getElementById('stat-top').textContent = '—';
    document.getElementById('stat-match').textContent = '0%';
    return;
  }

  const myMoods = db.moods.filter(m => m.userPhone === me.phone);
  const partnerMoods = db.moods.filter(m => m.userPhone === partner.phone);

  const myDates = new Set(myMoods.map(m => m.date));
  const sharedDays = partnerMoods.filter(m => myDates.has(m.date)).length;

  document.getElementById('stat-days').textContent = sharedDays;

  const counts = {};
  myMoods.forEach(m => { counts[m.moodId] = (counts[m.moodId] || 0) + 1; });
  const topId = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];
  document.getElementById('stat-top').textContent = topId
    ? HUMOURS.find(h => h.id === topId).emoji
    : '—';

  let matches = 0;
  partnerMoods.forEach(pm => {
    const mm = myMoods.find(m => m.date === pm.date);
    if (mm && mm.moodId === pm.moodId) matches++;
  });
  const pct = sharedDays ? Math.round((matches / sharedDays) * 100) : 0;
  document.getElementById('stat-match').textContent = pct + '%';
}

/* ---------- Réactions ---------- */
document.querySelectorAll('.reaction-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    showToast(`Réaction ${btn.dataset.reaction} envoyée !`);
    if (navigator.vibrate) navigator.vibrate(20);
  });
});

/* ==========================================================
   HISTORIQUE
   ========================================================== */
function renderHistory() {
  const me = getCurrentUser();
  if (!me) return;
  const partner = getPartner(me);
  const grid = document.getElementById('history-grid');
  grid.innerHTML = '';

  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }

  days.forEach(dateStr => {
    const myMood = db.moods.find(m => m.userPhone === me.phone && m.date === dateStr);
    const partnerMood = partner ? db.moods.find(m => m.userPhone === partner.phone && m.date === dateStr) : null;

    const label = new Date(dateStr).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });

    const row = document.createElement('div');
    row.className = 'history-row';
    row.innerHTML = `
      <span class="history-date">${label}</span>
      <span class="history-emojis">
        <span title="Moi">${myMood ? HUMOURS.find(h => h.id === myMood.moodId).emoji : '·'}</span>
        <span title="Partenaire">${partnerMood ? HUMOURS.find(h => h.id === partnerMood.moodId).emoji : '·'}</span>
      </span>
    `;
    grid.appendChild(row);
  });
}

/* ==========================================================
   PROFIL
   ========================================================== */
function renderProfile() {
  const me = getCurrentUser();
  if (!me) return;
  const partner = getPartner(me);

  document.getElementById('profile-avatar').textContent = initials(me.name);
  document.getElementById('profile-name').textContent = me.name;
  document.getElementById('profile-phone').textContent = me.phone;

  const status = document.getElementById('profile-status');
  if (partner) {
    status.textContent = `💞 Lié à ${partner.name}`;
    status.style.background = 'rgba(225, 29, 72, 0.15)';
    status.style.color = 'var(--red-bright)';
  } else {
    status.textContent = '🔓 Aucun partenaire lié';
    status.style.background = 'rgba(255,255,255,0.06)';
    status.style.color = 'var(--gray-2)';
  }
}

/* ---------- Actions profil ---------- */
document.getElementById('btn-logout').addEventListener('click', logout);
document.getElementById('btn-logout-2').addEventListener('click', logout);

function logout() {
  db.session = null;
  saveDB();
  document.getElementById('input-name').value = '';
  document.getElementById('input-phone').value = '';
  document.getElementById('input-partner-phone').value = '';
  showScreen('screen-auth');
  showToast('Déconnecté 👋');
}

document.getElementById('btn-unlink').addEventListener('click', () => {
  const me = getCurrentUser();
  const partner = getPartner(me);
  if (!partner) {
    showToast('Aucun partenaire à délier');
    return;
  }
  if (!confirm(`Délier ton couple avec ${partner.name} ?`)) return;

  partner.partnerPhone = null;
  me.partnerPhone = null;
  saveDB();
  showToast('Couple délié');
  renderDashboard();
  renderHistory();
  renderProfile();
});

document.getElementById('btn-relink').addEventListener('click', () => {
  showScreen('screen-pair');
  document.getElementById('pair-message').textContent = '';
  document.getElementById('input-partner-phone').value = '';
});

/* ==========================================================
   NAVIGATION
   ========================================================== */
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById('view-' + btn.dataset.view).classList.add('active');

    if (btn.dataset.view === 'couple') renderDashboard();
    if (btn.dataset.view === 'history') renderHistory();
    if (btn.dataset.view === 'profile') renderProfile();
  });
});

/* ==========================================================
   DÉMARRAGE
   ========================================================== */
(function init() {
  const me = getCurrentUser();
  if (me) {
    routeAfterAuth(me);
  } else {
    showScreen('screen-auth');
  }
})();
