/* ==========================================================
   MoodPair — Logique de l'application
   Base de données simulée via localStorage
   ========================================================== */

/* ---------- Constantes ---------- */
const HUMOURS = [
  { id: 'heureux',   emoji: '😄', label: 'Heureux',   color: '#facc15' },
  { id: 'amoureux',  emoji: '😍', label: 'Amoureux',  color: '#f472b6' },
  { id: 'serein',    emoji: '😌', label: 'Serein',    color: '#86efac' },
  { id: 'neutre',    emoji: '😐', label: 'Neutre',    color: '#cbd5e1' },
  { id: 'triste',    emoji: '😔', label: 'Triste',    color: '#93c5fd' },
  { id: 'frustre',   emoji: '😤', label: 'Frustré',   color: '#fdba74' },
  { id: 'en_colere', emoji: '😡', label: 'En colère', color: '#fca5a5' },
  { id: 'stresse',   emoji: '😰', label: 'Stressé',   color: '#c4b5fd' },
  { id: 'fatigue',   emoji: '😴', label: 'Fatigué',   color: '#a5b4fc' },
  { id: 'malade',    emoji: '🤒', label: 'Malade',    color: '#d6b48b' },
  { id: 'euphorique',emoji: '🥳', label: 'Euphorique',color: '#f0abfc' },
  { id: 'pensif',    emoji: '🤔', label: 'Pensif',    color: '#5eead4' },
];

const STORAGE_KEY = 'moodpair_db';

/* ---------- Base de données localStorage ---------- */
function loadDB() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : { users: [], couples: [], moods: [], session: null };
}

function saveDB(db) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

let db = loadDB();

/* ---------- Utilitaires ---------- */
function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function formatPhone(v) {
  return v.replace(/[^+\d]/g, '');
}

function initials(name) {
  return name.trim().split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
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

/* ---------- Navigation écrans ---------- */
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

/* ---------- Confettis ---------- */
function launchConfetti() {
  const container = document.getElementById('confetti-container');
  const colors = ['#ec4899', '#8b5cf6', '#facc15', '#10b981', '#38bdf8', '#f472b6'];
  for (let i = 0; i < 60; i++) {
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
   AUTHENTIFICATION
   ========================================================== */
document.getElementById('form-auth').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = document.getElementById('input-name').value.trim();
  const phone = formatPhone(document.getElementById('input-phone').value.trim());

  if (!name || phone.length < 8) {
    showToast('Vérifie ton prénom et ton numéro');
    return;
  }

  const existing = db.users.find(u => u.phone === phone);

  if (existing) {
    db.session = phone;
    saveDB(db);
    showToast(`Bon retour, ${existing.name} !`);
    startApp();
    return;
  }

  // Nouveau compte → simulation OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  window._pending = { name, phone, otp };
  document.getElementById('otp-hint').textContent = `(Simulation — ton code : ${otp})`;
  document.getElementById('input-otp').value = '';
  showScreen('screen-otp');
});

/* ---------- OTP ---------- */
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
  saveDB(db);
  window._pending = null;

  showToast(`Bienvenue, ${newUser.name} !`);
  startApp();
});

/* ==========================================================
   ASSOCIATION COUPLE
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

  db.couples.push({ users: [me.phone, phone], createdAt: Date.now() });
  saveDB(db);

  msg.textContent = '✅ Vous êtes maintenant connectés !';
  msg.className = 'form-message success';

  setTimeout(() => {
    document.getElementById('pair-message').textContent = '';
    startApp();
  }, 1200);
});

/* ==========================================================
   DÉMARRAGE APP
   ========================================================== */
function startApp() {
  const me = getCurrentUser();
  if (!me) {
    showScreen('screen-auth');
    return;
  }

  if (!me.partnerPhone) {
    showScreen('screen-pair');
    return;
  }

  showScreen('screen-app');
  renderHeader(me);
  renderMoodGrid();
  renderDashboard();
  renderHistory();
  renderProfile();

  // Pré-sélectionne l'humeur du jour
  const today = todayKey();
  const myMood = db.moods.find(m => m.userPhone === me.phone && m.date === today);
  if (myMood) {
    document.querySelectorAll('.mood-card').forEach(c => {
      if (c.dataset.id === myMood.moodId) c.classList.add('selected');
    });
    document.getElementById('input-note').value = myMood.note || '';
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
  grid.innerHTML = '';

  HUMOURS.forEach(h => {
    const card = document.createElement('button');
    card.className = 'mood-card';
    card.dataset.id = h.id;
    card.style.setProperty('--mood-color', h.color);
    card.innerHTML = `
      <span class="mood-emoji">${h.emoji}</span>
      <span class="mood-label">${h.label}</span>
    `;
    card.addEventListener('click', () => selectMood(h.id));
    grid.appendChild(card);
  });
}

let selectedMoodId = null;

function selectMood(id) {
  selectedMoodId = id;
  document.querySelectorAll('.mood-card').forEach(c => {
    c.classList.toggle('selected', c.dataset.id === id);
  });
  if (navigator.vibrate) navigator.vibrate(15);
}

document.getElementById('btn-share-mood').addEventListener('click', () => {
  if (!selectedMoodId) {
    showToast('Choisis d\'abord une humeur 😊');
    return;
  }

  const me = getCurrentUser();
  const today = todayKey();
  const note = document.getElementById('input-note').value.trim();

  // Supprime l'ancienne humeur du jour si elle existe
  db.moods = db.moods.filter(m => !(m.userPhone === me.phone && m.date === today));

  db.moods.push({
    userPhone: me.phone,
    moodId: selectedMoodId,
    note,
    date: today,
    createdAt: Date.now(),
  });

  saveDB(db);
  showToast('Humeur partagée 💫');
  renderDashboard();
  renderHistory();

  // Confettis si les deux ont partagé
  const partner = getPartner(me);
  if (partner) {
    const partnerMood = db.moods.find(m => m.userPhone === partner.phone && m.date === today);
    if (partnerMood) launchConfetti();
  }
});

/* ==========================================================
   TABLEAU DE BORD COUPLE
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
    document.getElementById('partner-note').textContent = '';
  }

  // Bannière comparaison
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

  // Statistiques
  renderStats(me, partner);
}

function renderStats(me, partner) {
  if (!partner) return;

  const myMoods = db.moods.filter(m => m.userPhone === me.phone);
  const partnerMoods = db.moods.filter(m => m.userPhone === partner.phone);

  // Jours partagés = dates communes
  const myDates = new Set(myMoods.map(m => m.date));
  const sharedDays = partnerMoods.filter(m => myDates.has(m.date)).length;

  document.getElementById('stat-days').textContent = sharedDays;

  // Humeur dominante
  const counts = {};
  myMoods.forEach(m => { counts[m.moodId] = (counts[m.moodId] || 0) + 1; });
  const topId = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];
  document.getElementById('stat-top').textContent = topId
    ? HUMOURS.find(h => h.id === topId).emoji
    : '—';

  // Compatibilité
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
  document.getElementById('profile-avatar').textContent = initials(me.name);
  document.getElementById('profile-name').textContent = me.name;
  document.getElementById('profile-phone').textContent = me.phone;
}

/* ---------- Actions profil ---------- */
document.getElementById('btn-logout').addEventListener('click', logout);
document.getElementById('btn-logout-2').addEventListener('click', logout);

function logout() {
  db.session = null;
  saveDB(db);
  document.getElementById('input-name').value = '';
  document.getElementById('input-phone').value = '';
  showScreen('screen-auth');
  showToast('Déconnecté 👋');
}

document.getElementById('btn-unlink').addEventListener('click', () => {
  if (!confirm('Délier le couple ? Vous ne verrez plus les humeurs de votre partenaire.')) return;
  const me = getCurrentUser();
  const partner = getPartner(me);
  if (partner) partner.partnerPhone = null;
  me.partnerPhone = null;
  saveDB(db);
  showToast('Couple délié');
  startApp();
});

/* ==========================================================
   NAVIGATION BASSE
   ========================================================== */
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById('view-' + btn.dataset.view).classList.add('active');

    // Rafraîchit les vues dynamiques
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
    startApp();
  } else {
    showScreen('screen-auth');
  }
})();