// ================== INSTÄLLNINGAR ==================

const MAL = 10; // antal kort som krävs för att vinna

// Länk till ditt publicerade Google-kalkylark (CSV).
// Lämna tom ("") om du bara vill använda kort.txt.
const CSV_URL = "";

// ================== ELEMENT ==================

const kortEl    = document.getElementById("kort");
const kortText  = document.getElementById("kortText");
const valorUppe = document.getElementById("valorUppe");
const valorNere = document.getElementById("valorNere");
const draBtn    = document.getElementById("dra");
const avbrytBtn = document.getElementById("avbryt");
const statusEl  = document.getElementById("status");

let lek = [];
let dragna = 0;

// ================== KORTLEK ==================

async function laddaLek() {
  // 1. Påståenden från kort.txt
  let franFil = [];
  try {
    const txt = await (await fetch("kort.txt?nocache=" + Date.now())).text();
    franFil = txt
      .split("\n")
      .map(rad => rad.trim())
      .filter(rad => rad && !rad.startsWith("#"));
  } catch (e) {
    console.warn("Kunde inte läsa kort.txt:", e);
  }

  // 2. Påståenden från Google Formulär (om länk finns)
  let franFormular = [];
  if (CSV_URL) {
    try {
      const avskiljare = CSV_URL.includes("?") ? "&" : "?";
      const csv = await (await fetch(CSV_URL + avskiljare + "nocache=" + Date.now())).text();
      franFormular = tolkaCsv(csv)
        .slice(1)                          // hoppa över rubrikraden
        .map(rad => (rad[1] || "").trim()) // kolumn B = svaret
        .filter(Boolean);
    } catch (e) {
      console.warn("Kunde inte läsa formulärsvar:", e);
    }
  }

  lek = [...franFil, ...franFormular];
  blanda(lek);
  dragna = 0;
  uppdateraStatus();
}

// Fisher–Yates-blandning
function blanda(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

// Enkel CSV-tolkare som klarar kommatecken och citattecken i svaren
function tolkaCsv(text) {
  const rader = [];
  let rad = [], falt = "", iCitat = false;
  for (let i = 0; i < text.length; i++) {
    const t = text[i];
    if (iCitat) {
      if (t === '"' && text[i + 1] === '"') { falt += '"'; i++; }
      else if (t === '"') iCitat = false;
      else falt += t;
    } else if (t === '"') iCitat = true;
    else if (t === ",") { rad.push(falt); falt = ""; }
    else if (t === "\n") { rad.push(falt); rader.push(rad); rad = []; falt = ""; }
    else if (t !== "\r") falt += t;
  }
  if (falt || rad.length) { rad.push(falt); rader.push(rad); }
  return rader;
}

// ================== KORTDESIGN ==================

// Hörnen visar kortets nummer: A, 2, 3 … 10 (eller valfri symbol)
function sattValor(n) {
  const v = n === 1 ? "A" : String(n);
  valorUppe.textContent = v;
  valorNere.textContent = v;
}

function formatera(kort) {
  return "Din dejt " + kort.charAt(0).toLowerCase() + kort.slice(1);
}

// ================== SPELLOGIK ==================

function draKort() {
  if (lek.length === 0) {
    kortText.textContent = "Kortleken är slut!";
    draBtn.disabled = true;
    return;
  }

  const kort = lek.pop();
  dragna++;

  // Lås knapparna direkt på sista kortet
  if (dragna === MAL) {
    draBtn.disabled = true;
    avbrytBtn.disabled = true;
  }

  kortEl.classList.add("vand");
  setTimeout(() => {
    kortEl.classList.remove("baksida");
    sattValor(dragna);
    kortText.textContent = formatera(kort);
    kortEl.classList.remove("vand");

    if (dragna === MAL) {
      setTimeout(vinst, 1500); // visa 10:e kortet en stund först
    }
  }, 300);

  draBtn.textContent = "Dra ett till";
  uppdateraStatus();
}

function vinst() {
  kortEl.classList.add("vand");
  setTimeout(() => {
    kortEl.classList.remove("baksida");
    kortEl.classList.add("vinst");
    sattValor("♥");
    kortText.textContent = "💕 Grattis! Ni är nu i ett förhållande! 💕";
    kortEl.classList.remove("vand");
  }, 300);

  statusEl.textContent = `Du klarade alla ${MAL} kort!`;
  startaFyrverkeri();

  draBtn.textContent = "Spela igen";
  draBtn.disabled = false;
  draBtn.onclick = starta;
}

function avbryt() {
  kortEl.classList.add("vand");
  setTimeout(() => {
    kortEl.classList.remove("vinst");
    kortEl.classList.add("baksida");
    kortText.textContent = `Spelet avslutat. Du klarade ${dragna} av ${MAL} kort.`;
    kortEl.classList.remove("vand");
  }, 300);

  draBtn.textContent = "Starta om";
  draBtn.disabled = false;
  draBtn.onclick = starta;
}

async function starta() {
  draBtn.disabled = true;
  kortText.textContent = "Blandar kortleken…";

  await laddaLek();
  stoppaFyrverkeri();

  kortEl.classList.remove("vinst");
  kortEl.classList.add("baksida");
  sattValor("♥");

  avbrytBtn.disabled = false;
  draBtn.disabled = false;
  draBtn.textContent = "Dra kort";
  draBtn.onclick = draKort;

  if (lek.length < MAL) {
    kortText.textContent = `Varning: kortleken har bara ${lek.length} kort. Lägg till minst ${MAL} för att kunna vinna.`;
  } else {
    kortText.textContent = 'Tryck på "Dra kort" för att börja';
  }
}

function uppdateraStatus() {
  statusEl.textContent = `${dragna} / ${MAL} kort klarade · ${lek.length} kvar i leken`;
}

// ================== FYRVERKERIER ==================

const canvas = document.getElementById("fyrverkeri");
const ctx = canvas.getContext("2d");
let partiklar = [];
let fyrverkeriAktivt = false;
let animId = null;
let fyrverkeriTimer = null;

function anpassaCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener("resize", anpassaCanvas);
anpassaCanvas();

function explosion(x, y) {
  const nyans = Math.random() * 360;
  for (let i = 0; i < 80; i++) {
    const vinkel = Math.random() * Math.PI * 2;
    const fart = Math.random() * 5 + 2;
    partiklar.push({
      x, y,
      vx: Math.cos(vinkel) * fart,
      vy: Math.sin(vinkel) * fart,
      liv: 1,
      farg: `hsl(${nyans + Math.random() * 30}, 100%, 60%)`
    });
  }
}

function animera() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (fyrverkeriAktivt && Math.random() < 0.06) {
    explosion(Math.random() * canvas.width, Math.random() * canvas.height * 0.6);
  }

  for (const p of partiklar) {
    p.vx *= 0.98;
    p.vy = p.vy * 0.98 + 0.05; // luftmotstånd + gravitation
    p.x += p.vx;
    p.y += p.vy;
    p.liv -= 0.012;

    ctx.globalAlpha = Math.max(p.liv, 0);
    ctx.fillStyle = p.farg;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  partiklar = partiklar.filter(p => p.liv > 0);

  if (fyrverkeriAktivt || partiklar.length > 0) {
    animId = requestAnimationFrame(animera);
  } else {
    animId = null;
  }
}

function startaFyrverkeri() {
  fyrverkeriAktivt = true;
  for (let i = 0; i < 3; i++) {
    explosion(Math.random() * canvas.width, Math.random() * canvas.height * 0.5);
  }
  if (!animId) animera();
  clearTimeout(fyrverkeriTimer);
  fyrverkeriTimer = setTimeout(() => (fyrverkeriAktivt = false), 6000);
}

function stoppaFyrverkeri() {
  fyrverkeriAktivt = false;
  clearTimeout(fyrverkeriTimer);
  partiklar = [];
  if (animId) cancelAnimationFrame(animId);
  animId = null;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// ================== START ==================

avbrytBtn.onclick = avbryt;
starta();
