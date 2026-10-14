// Site pour Maelys — tout le JavaScript, sans framework.
(function () {
  "use strict";
  const C = window.CONFIG;
  const $ = (s) => document.querySelector(s);
  const JOUR = 86400000;

  // ---------- Outils ----------
  const stock = {
    lire(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    ecrire(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  // Date du jour "AAAA-MM-JJ" dans un fuseau donné
  const dateDans = (tz, d = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  const numJour = (iso) => Math.floor(Date.parse(iso + "T00:00:00Z") / JOUR); // n° de jour depuis 1970
  const aujourdhuiSH = () => dateDans("Asia/Shanghai");
  const joliDate = (iso) => new Date(iso + "T12:00:00Z").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

  // fetch avec délai maximal : renvoie null en cas d'échec (fallback silencieux)
  async function charger(url, opts = {}, delai = 8000) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), delai);
    try {
      const r = await fetch(url, { ...opts, signal: ctrl.signal });
      if (!r.ok) return null;
      const txt = await r.text();
      return txt ? JSON.parse(txt) : {};
    } catch (e) { return null; } finally { clearTimeout(t); }
  }
  const json = (nom) => charger(nom, { cache: "no-cache" }).then((d) => d || null);
  const echapper = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function toast(txt, duree = 3500) {
    const t = $("#toast"); t.textContent = txt; t.hidden = false;
    clearTimeout(toast.t); toast.t = setTimeout(() => (t.hidden = true), duree);
  }
  function pluie(symboles, n = 40) {
    const zone = $("#pluie");
    for (let i = 0; i < n; i++) {
      const g = document.createElement("span");
      g.className = "goutte";
      g.textContent = symboles[i % symboles.length];
      g.style.left = Math.random() * 100 + "vw";
      g.style.fontSize = 16 + Math.random() * 22 + "px";
      g.style.animationDuration = 3 + Math.random() * 4 + "s";
      g.style.animationDelay = Math.random() * 2 + "s";
      zone.appendChild(g);
      setTimeout(() => g.remove(), 9500);
    }
  }
  function coeurVole(x, y, s = "❤️") {
    const c = document.createElement("span");
    c.className = "coeur-vole"; c.textContent = s;
    c.style.left = x - 16 + "px"; c.style.top = y - 16 + "px";
    document.body.appendChild(c); setTimeout(() => c.remove(), 1700);
  }

  // ---------- 1. Mot de passe ----------
  function verrou() {
    const v = $("#verrou");
    const ouvrir = () => { v.classList.add("eclose"); setTimeout(() => v.classList.add("ouvert"), 1100); };
    // le code est redemandé 1 heure après la dernière saisie
    const DUREE = 60 * 60 * 1000;
    const ouvertLe = stock.lire("maelys-ouvert", 0);
    if (typeof ouvertLe === "number" && Date.now() - ouvertLe < DUREE) {
      v.remove();
      setTimeout(() => location.reload(), DUREE - (Date.now() - ouvertLe));
      return;
    }
    setTimeout(() => $("#verrou .fleur").classList.add("eclose"), 300);
    $("#verrou-code").focus();
    $("#verrou-form").addEventListener("submit", (e) => {
      e.preventDefault();
      if ($("#verrou-code").value.trim() === C.motDePasse) {
        stock.ecrire("maelys-ouvert", Date.now());
        setTimeout(() => location.reload(), DUREE);
        ouvrir(); pluie(["🌸", "🌷", "💗"], 25);
      } else {
        const err = $("#verrou-erreur"); err.hidden = true; void err.offsetWidth; err.hidden = false;
        $("#verrou-code").value = "";
      }
    });
  }

  // ---------- Navigation ----------
  function navigation() {
    const montrer = (id) => {
      document.querySelectorAll(".onglet").forEach((s) => s.classList.toggle("actif", s.id === id));
      document.querySelectorAll("#nav button").forEach((b) => b.classList.toggle("actif", b.dataset.onglet === id));
      if (id === "ensemble") partage.charger();
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
    $("#nav").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) { montrer(b.dataset.onglet); history.replaceState(null, "", "#" + b.dataset.onglet); } });
    const h = location.hash.slice(1);
    if (h && document.getElementById(h)?.classList.contains("onglet")) montrer(h);
  }

  // ---------- 2. Fond du jour ----------
  let PHOTOS = [];
  function fondDuJour() {
    if (!PHOTOS.length) return;
    const i = indexDuJour(PHOTOS.length);
    const img = new Image();
    img.onload = () => ($("#fond").style.backgroundImage = `url("${img.src}")`);
    img.src = "photos-optimized/" + PHOTOS[i].fichier;
  }

  // ---------- 3. Compte à rebours ----------
  const retour = Date.parse(C.retour), depart = Date.parse(C.depart);
  let fete = false;
  function rebours() {
    const reste = retour - Date.now();
    if (reste <= 0) {
      $("#rebours").hidden = true; $("#titre-rebours").hidden = true; $("#message-final").hidden = false;
      if (!fete) { fete = true; pluie(["🌸", "💗", "🌷", "❤️", "💐"], 70); setInterval(() => pluie(["🌸", "💗"], 15), 8000); }
      return;
    }
    const s = Math.floor(reste / 1000);
    $("#r-j").textContent = Math.floor(s / 86400);
    $("#r-h").textContent = String(Math.floor(s / 3600) % 24).padStart(2, "0");
    $("#r-m").textContent = String(Math.floor(s / 60) % 60).padStart(2, "0");
    $("#r-s").textContent = String(s % 60).padStart(2, "0");
  }

  // ---------- 4. Horloges ----------
  function horloges() {
    for (const [id, tz] of [["paris", "Europe/Paris"], ["shanghai", "Asia/Shanghai"]]) {
      const el = $("#h-" + id);
      const hm = new Intl.DateTimeFormat("fr-FR", { timeZone: tz, hour: "2-digit", minute: "2-digit" }).format(new Date());
      el.querySelector(".heure").textContent = hm;
      const h = parseInt(hm, 10), jour = h >= 7 && h < 20;
      el.classList.toggle("nuit", !jour);
      el.querySelector(".astre").className = "astre " + (jour ? "soleil" : "lune");
    }
  }

  // ---------- 5. Progression et avion ----------
  function progression() {
    const p = Math.min(1, Math.max(0, (Date.now() - depart) / (retour - depart)));
    $("#pourcent").textContent = (p * 100).toFixed(1).replace(".", ",") + " %";
    $("#barre-rempli").style.width = p * 100 + "%";
    const chemin = $("#trajet-fait"), L = chemin.getTotalLength();
    chemin.style.strokeDasharray = `${L * p} ${L}`;
    const a = chemin.getPointAtLength(L * p), b = chemin.getPointAtLength(Math.min(L, L * p + 1));
    const angle = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
    // l’émoji ✈️ pointe vers le haut à droite (-45°) : on compense
    $("#avion").setAttribute("transform", `translate(${a.x} ${a.y}) rotate(${angle + 45})`);
  }

  // ---------- 6. Météo (Open-Meteo, sans clé) ----------
  const CIEL = { 0: "☀️ dégagé", 1: "🌤 plutôt beau", 2: "⛅ nuageux", 3: "☁️ couvert", 45: "🌫 brouillard", 48: "🌫 brouillard", 51: "🌦 bruine", 53: "🌦 bruine", 55: "🌦 bruine", 61: "🌧 pluie", 63: "🌧 pluie", 65: "🌧 forte pluie", 71: "🌨 neige", 73: "🌨 neige", 75: "❄️ neige", 80: "🌦 averses", 81: "🌧 averses", 82: "⛈ averses", 95: "⛈ orage", 96: "⛈ orage", 99: "⛈ orage" };
  async function meteo(villes) {
    for (const id of ["paris", "shanghai"]) {
      const v = villes[id];
      const d = await charger(`https://api.open-meteo.com/v1/forecast?latitude=${v.lat}&longitude=${v.lon}&current=temperature_2m,weather_code&timezone=auto`);
      const t = d?.current?.temperature_2m;
      if (typeof t === "number") $(`#h-${id} .meteo`).textContent = `${Math.round(t)} °C · ${CIEL[d.current.weather_code] || ""}`;
    }
  }

  // ---------- 7. Câlins ----------
  function calins() {
    const jours = Math.max(0, numJour(aujourdhuiSH()) - numJour(C.depart.slice(0, 10)));
    let envoyes = stock.lire("maelys-calins", 0);
    $("#calins-jour").textContent = C.calinsParJour;
    $("#calins-dus").textContent = jours * C.calinsParJour;
    $("#calins-envoyes").textContent = envoyes;
    $("#btn-calin").addEventListener("click", (e) => {
      envoyes++; stock.ecrire("maelys-calins", envoyes);
      $("#calins-envoyes").textContent = envoyes;
      for (let i = 0; i < 6; i++) setTimeout(() => coeurVole(e.clientX + (Math.random() - .5) * 80, e.clientY, ["❤️", "💗", "💕", "🤗"][i % 4]), i * 90);
    });
  }

  // ---------- 8. Message du jour / calendrier ----------
  function calendrier(messages) {
    const auj = aujourdhuiSH(), dates = Object.keys(messages).sort();
    const afficher = (d) => {
      $("#msg-date").textContent = joliDate(d);
      $("#msg-texte").textContent = messages[d];
      document.querySelectorAll(".case").forEach((c) => c.classList.toggle("choisi", c.dataset.d === d));
    };
    const cal = $("#calendrier");
    for (const d of dates) {
      const b = document.createElement("button");
      b.className = "case " + (d < auj ? "passe" : d === auj ? "aujourdhui" : "futur");
      b.dataset.d = d;
      const [, mo, j] = d.split("-");
      b.innerHTML = d > auj ? `🔒<br>${+j}/${+mo}` : `${+j}/${+mo}`;
      b.title = d > auj ? "Patience, mon amour…" : joliDate(d);
      b.addEventListener("click", () => d > auj ? toast("Pas encore… cette case s'ouvre le " + joliDate(d) + " 🔒") : afficher(d));
      cal.appendChild(b);
    }
    const dispo = dates.filter((d) => d <= auj);
    if (dispo.length) afficher(dispo[dispo.length - 1]);
    else { $("#msg-texte").textContent = "Le premier message arrive bientôt…"; }
  }

  // ---------- 15. Mandarin du jour ----------
  function mandarin(mots) {
    if (!mots?.length) return;
    const m = mots[((numJour(aujourdhuiSH()) % mots.length) + mots.length) % mots.length];
    $("#zh-hanzi").textContent = m.hanzi; $("#zh-pinyin").textContent = m.pinyin; $("#zh-fr").textContent = m.fr;
  }

  // ---------- 9. Raisons ----------
  function raisons(liste) {
    if (!liste?.length) return;
    let derniere = -1;
    $("#btn-raison").addEventListener("click", (e) => {
      let i; do { i = Math.floor(Math.random() * liste.length); } while (i === derniere && liste.length > 1);
      derniere = i;
      const p = $("#raison"); p.style.opacity = 0;
      setTimeout(() => { p.textContent = liste[i]; p.style.transition = "opacity .5s"; p.style.opacity = 1; }, 150);
      coeurVole(e.clientX, e.clientY);
    });
  }

  // ---------- 10. Frise ----------
  function frise(etapes) {
    $("#frise").innerHTML = (etapes || []).map((e) => `
      <li><div class="carte">
        ${e.photo ? `<img src="photos-optimized/${echapper(e.photo)}" alt="" loading="lazy" onerror="this.remove()">` : ""}
        <div class="date">${echapper(e.date)}</div>
        <h3>${echapper(e.titre)}</h3>
        <p>${echapper(e.texte)}</p>
      </div></li>`).join("");
    $("#frise").addEventListener("click", (ev) => { if (ev.target.tagName === "IMG") visionneuse.ouvrirSrc(ev.target.src); });
  }

  // ---------- 11. Galerie + visionneuse ----------
  const visionneuse = (() => {
    const v = $("#visionneuse"), img = v.querySelector("img");
    let liste = [], i = 0;
    const montrer = () => (img.src = liste[i]);
    const fermer = () => (v.hidden = true);
    const bouger = (n) => { if (liste.length > 1) { i = (i + n + liste.length) % liste.length; montrer(); } };
    v.querySelector(".v-fermer").onclick = fermer;
    v.querySelector(".v-prec").onclick = () => bouger(-1);
    v.querySelector(".v-suiv").onclick = () => bouger(1);
    v.addEventListener("click", (e) => { if (e.target === v) fermer(); });
    document.addEventListener("keydown", (e) => {
      if (v.hidden) return;
      if (e.key === "Escape") fermer(); if (e.key === "ArrowLeft") bouger(-1); if (e.key === "ArrowRight") bouger(1);
    });
    let x0 = null;
    v.addEventListener("touchstart", (e) => (x0 = e.touches[0].clientX), { passive: true });
    v.addEventListener("touchend", (e) => { if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 50) bouger(dx < 0 ? 1 : -1); x0 = null; });
    return {
      ouvrir(l, n) { liste = l; i = n; montrer(); v.hidden = false; },
      ouvrirSrc(src) { liste = [src]; i = 0; montrer(); v.hidden = false; }
    };
  })();
  const indexDuJour = (n) => ((numJour(aujourdhuiSH()) % n) + n) % n;
  function photoDuJour() {
    if (!PHOTOS.length) { $("#galerie-vide").hidden = false; return; }
    const src = "photos-optimized/" + PHOTOS[indexDuJour(PHOTOS.length)].fichier;
    const img = $("#photo-jour-img");
    img.src = src;
    img.onclick = () => visionneuse.ouvrirSrc(src);
    // couronne de cœurs autour de la photo
    const coeurs = ["❤️", "💗", "💕", "💖", "🌸"], n = 26;
    $("#couronne").innerHTML = Array.from({ length: n }, (_, k) => {
      // répartis le long des 4 bords du cadre
      const p = (k / n) * 4, c = Math.floor(p), f = (p - c) * 100;
      const [x, y] = [[f, 3], [97, f], [100 - f, 97], [3, 100 - f]][c];
      return `<span style="left:${x}%;top:${y}%;font-size:${18 + (k % 3) * 6}px;animation-delay:${(k % 6) * .4}s">${coeurs[k % coeurs.length]}</span>`;
    }).join("");
    $("#photo-jour").hidden = false;
  }

  // ---------- 12. Quiz ----------
  // Un seul quiz : toutes les questions sont visibles, une nouvelle se débloque tous les X jours.
  // Chaque question n'a qu'une réponse possible (gardée dans ce navigateur).
  function quiz(donnees) {
    const zone = $("#quiz");
    const questions = donnees?.questions;
    if (!questions?.length) return;
    const ecart = numJour(aujourdhuiSH()) - numJour(donnees.debut);
    const ouverture = (k) => new Date((numJour(donnees.debut) + k * donnees.tousLes) * JOUR).toISOString().slice(0, 10);
    const ouverte = (k) => ecart >= k * donnees.tousLes;
    const bonnes = (q) => Array.isArray(q.bonne) ? q.bonne : [q.bonne];
    const faits = stock.lire("maelys-quiz", {});

    zone.innerHTML = questions.map((q, k) => `
      <div class="question ${ouverte(k) ? "" : "verrouillee"}" data-k="${k}">
        <p class="message">${k + 1}. ${echapper(q.question)}</p>
        ${ouverte(k) ? "" : `<p class="petit">🔒 Cette question s'ouvre le ${joliDate(ouverture(k))}</p>`}
        <div class="choix">${q.choix.map((c, i) => `<label><input type="radio" name="q${k}" value="${i}">${echapper(c)}</label>`).join("")}</div>
      </div>`).join("") + `<div class="resultat"></div>`;

    const corriger = (k) => {
      const q = questions[k];
      zone.querySelectorAll(`[name="q${k}"]`).forEach((inp) => {
        inp.disabled = true; inp.checked = +inp.value === faits[k];
        const lab = inp.closest("label");
        if (bonnes(q).includes(+inp.value)) lab.classList.add("bon");
        else if (inp.checked) lab.classList.add("faux");
      });
    };
    const bilan = () => {
      const repondues = Object.keys(faits).map(Number);
      const score = repondues.filter((k) => bonnes(questions[k]).includes(faits[k])).length;
      const suivante = questions.findIndex((_, k) => !ouverte(k));
      let txt = repondues.length ? `<p class="message">${score} / ${repondues.length} bonne(s) réponse(s)</p>` : "";
      if (repondues.length === questions.length) {
        const r = score / questions.length;
        txt += `<p>${r === 1 ? "Parfait ! Tu me connais par cœur… normal, tu as volé le mien. 💘"
          : r >= .7 ? "Bravo mon amour, tu me connais vraiment bien ! Récompense : un câlin bonus à ton retour. 🤗"
          : r >= .4 ? "Pas mal ! Il va falloir de longues discussions à ton retour pour réviser… 😏"
          : "Aïe ! Bon… on rattrapera tout ça avec beaucoup de dîners en tête-à-tête. ❤️"}</p>`;
      } else if (suivante > -1) txt += `<p class="petit">Prochaine question le ${joliDate(ouverture(suivante))} ✨</p>`;
      zone.querySelector(".resultat").innerHTML = txt;
    };

    questions.forEach((_, k) => {
      if (faits[k] !== undefined) corriger(k);
      else if (!ouverte(k)) zone.querySelectorAll(`[name="q${k}"]`).forEach((inp) => (inp.disabled = true));
    });
    zone.addEventListener("change", (e) => {
      const k = +e.target.name.slice(1);
      if (!ouverte(k) || faits[k] !== undefined) return;
      faits[k] = +e.target.value; stock.ecrire("maelys-quiz", faits);
      corriger(k); bilan();
      if (bonnes(questions[k]).includes(faits[k])) pluie(["💗", "🌸"], 20);
    });
    bilan();
  }

  // ---------- 14 & 16. Bucket list + livre d'or (Supabase) ----------
  const partage = (() => {
    const actif = !!(C.supabaseUrl && C.supabaseCle);
    const base = (C.supabaseUrl || "").replace(/\/(rest\/v1\/?)?$/, "").replace(/\/$/, "") + "/rest/v1/";
    const entetes = { apikey: C.supabaseCle, "Content-Type": "application/json", Prefer: "return=representation" };
    const api = (chemin, opts = {}) => actif ? charger(base + chemin, { ...opts, headers: entetes }) : Promise.resolve(null);
    const qui = () => $("#qui").value;
    const horsLigne = (oui) => ($("#hors-ligne").hidden = !oui);
    let initial = [];

    function dessinerBucket(items, enLigne) {
      $("#bucket").innerHTML = items.map((it) => `<li class="${it.fait ? "fait" : ""}"><input type="checkbox" data-id="${it.id ?? ""}" ${it.fait ? "checked" : ""} ${enLigne ? "" : "disabled"}><span>${echapper(it.texte)}</span></li>`).join("");
    }
    function dessinerLivre(msgs) {
      $("#livre").innerHTML = msgs.length ? msgs.map((m) => `<li class="${echapper(m.auteur)}"><div class="auteur">${echapper(m.auteur)} · <span class="petit">${new Date(m.cree_le).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}</span></div>${echapper(m.texte).replace(/\n/g, "<br>")}</li>`).join("")
        : `<li class="petit">Pas encore de message… sois la première (ou le premier) !</li>`;
    }
    async function chargerTout() {
      const [b, l] = await Promise.all([api("bucket?select=*&order=id.asc"), api("livre_or?select=*&order=cree_le.desc&limit=200")]);
      const ok = Array.isArray(b) && Array.isArray(l);
      horsLigne(!ok);
      dessinerBucket(ok ? b : initial.map((t) => ({ texte: t, fait: false })), ok);
      if (ok) dessinerLivre(l); else $("#livre").innerHTML = "";
      $("#bucket-form button").disabled = $("#livre-form button").disabled = !ok;
    }
    function init(bucketInitial) {
      initial = bucketInitial || [];
      $("#qui").value = stock.lire("maelys-qui", "Maelys");
      $("#qui").onchange = () => stock.ecrire("maelys-qui", qui());
      $("#bucket").addEventListener("change", async (e) => {
        const c = e.target; if (!c.dataset.id) return;
        c.closest("li").classList.toggle("fait", c.checked);
        const r = await api("bucket?id=eq." + c.dataset.id, { method: "PATCH", body: JSON.stringify({ fait: c.checked }) });
        if (!r) { horsLigne(true); c.checked = !c.checked; c.closest("li").classList.toggle("fait", c.checked); }
        else if (c.checked) pluie(["🌸", "✨"], 15);
      });
      $("#bucket-form").addEventListener("submit", async (e) => {
        e.preventDefault(); const t = $("#bucket-texte").value.trim(); if (!t) return;
        const r = await api("bucket", { method: "POST", body: JSON.stringify({ texte: t, ajoute_par: qui() }) });
        if (r) { $("#bucket-texte").value = ""; chargerTout(); } else horsLigne(true);
      });
      $("#livre-form").addEventListener("submit", async (e) => {
        e.preventDefault(); const t = $("#livre-texte").value.trim(); if (!t) return;
        const r = await api("livre_or", { method: "POST", body: JSON.stringify({ auteur: qui(), texte: t }) });
        if (r) { $("#livre-texte").value = ""; toast("Message envoyé 💌"); chargerTout(); } else horsLigne(true);
      });
    }
    return { init, charger: chargerTout };
  })();

  // ---------- 18. Musique ----------
  function musique(pistes) {
    if (!Array.isArray(pistes) || !pistes.length) return;
    const a = $("#m-audio"); let i = 0;
    const charge = () => { a.src = "music/" + pistes[i].fichier; $("#m-titre").textContent = pistes[i].titre || pistes[i].fichier; };
    const jouer = () => a.play().then(() => ($("#m-play").textContent = "⏸")).catch(() => {});
    $("#musique").hidden = false; charge();
    $("#m-play").onclick = () => a.paused ? jouer() : (a.pause(), ($("#m-play").textContent = "▶"));
    $("#m-suiv").onclick = () => { i = (i + 1) % pistes.length; charge(); jouer(); };
    $("#m-prec").onclick = () => { i = (i - 1 + pistes.length) % pistes.length; charge(); jouer(); };
    a.onended = $("#m-suiv").onclick;
    a.onerror = () => ($("#m-titre").textContent = "Morceau introuvable");
  }

  // ---------- 17. Easter eggs ----------
  function surprises() {
    // a) 10 clics sur le cœur du logo → pluie de fleurs
    let clics = 0, t;
    $("#logo").addEventListener("click", (e) => {
      coeurVole(e.clientX, e.clientY); clics++; clearTimeout(t); t = setTimeout(() => (clics = 0), 3000);
      if (clics >= 10) { clics = 0; pluie(["🌸", "🌷", "🌹", "🌺", "💐", "🌼"], 80); toast("Toutes les fleurs du monde pour toi 💐"); }
    });
    // b) taper « je t'aime » ou « nekfeu » au clavier
    let tape = "";
    document.addEventListener("keydown", (e) => {
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName) || e.key.length !== 1) return;
      tape = (tape + e.key.toLowerCase()).slice(-12).replace(/’/g, "'");
      if (tape.endsWith("je t'aime") || tape.endsWith("jetaime")) { tape = ""; pluie(["❤️", "💖", "💕", "💘"], 90); toast("Moi aussi je t'aime. Plus que tout. ❤️", 5000); }
      if (tape.endsWith("nekfeu")) { tape = ""; toast("🎤 « Mon amour » — ce que je te dirai en boucle à ton retour.", 5000); pluie(["🎵", "🎶", "💗"], 40); }
    });
    // c) cliquer sur la lune ou le soleil de Shanghai
    $("#h-shanghai .astre").addEventListener("click", (e) => { coeurVole(e.clientX, e.clientY, "🌙"); toast("Regarde le ciel : je regarde le même, quelques heures plus tard. 🌙✨", 5000); });
    $("#h-shanghai .astre").style.cursor = "pointer";
  }

  // ---------- Démarrage ----------
  async function demarrer() {
    verrou();
    navigation();
    rebours(); horloges(); progression(); calins(); surprises();
    setInterval(() => { rebours(); horloges(); }, 1000);
    setInterval(progression, 60000);

    const [photos, messages, raisonsL, quizL, mots, bucket, etapes, villes, pistes] = await Promise.all(
      ["photos-optimized/photos.json", "data/messages.json", "data/raisons.json", "data/quiz.json", "data/mandarin.json", "data/bucket.json", "data/frise.json", "data/villes.json", "music/playlist.json"].map(json));
    PHOTOS = Array.isArray(photos) ? photos : [];
    fondDuJour(); photoDuJour();
    if (messages) calendrier(messages);
    raisons(raisonsL); quiz(quizL); mandarin(mots); frise(etapes); musique(pistes);
    partage.init(bucket);
    if (villes) meteo(villes);
  }
  demarrer();
})();
