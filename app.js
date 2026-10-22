const MAL = 10; // antal kort som krävs för att vinna

let lek = [];
let dragna = 0;

const kortEl    = document.getElementById("kort");
const draBtn    = document.getElementById("dra");
const avbrytBtn = document.getElementById("avbryt");
const statusEl  = document.getElementById("status");

// ---------- Kortlek ----------

const CSV_URL = "KLISTRA_IN_DIN_LÄNK_HÄR";

async function laddaLek() {
  // Påståenden från kort.txt
  const txt = await (await fetch("kort.txt?nocache=" + Date.now())).text();
  const franFil = txt
    .split("\n")
    .map(rad => rad.trim())
    .filter(rad => rad && !rad.startsWith("#"));

  // Påståenden från formuläret
  let franFormular = [];
  try {
    const csv = await (await fetch(CSV_URL + "&nocache=" + Date.now())).text();
    franFormular = tolkaCsv(csv)
      .slice(1)                       // hoppa över rubrikraden
      .map(rad => (rad[1] || "").trim()) // kolumn 2 = svaret, kolumn 1 = tidsstämpel
      .filter(Boolean);
  } catch (e) {
    console.warn("Kunde inte läsa formulärsvar:", e);
  }

  lek = [...franFil, ...franFormular];
  blanda(lek);
  dragna = 0;
  uppdateraStatus();
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

function blanda(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

// ---------- Spellogik ----------

function draKort() {
  if (lek.length === 0) {
    kortEl.textContent = "Kortleken är slut!";
    draBtn.disabled = true;
    return;
  }
  const kort = lek.pop();
  dragna++;

  // Lås knapparna direkt på sista kortet så man inte hinner dra fler
  if (dragna === MAL) {
    draBtn.disabled = true;
    avbrytBtn.disabled = true;
  }

  kortEl.classList.add("vand");
  setTimeout(() => {
    kortEl.textContent = "Din dejt " + kort.charAt(0).toLowerCase() + kort.slice(1);
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
    kortEl.textContent = "💕 Grattis! Ni är nu i ett förhållande! 💕";
    kortEl.classList.add("vinst");
    kortEl.classList.remove("vand");
  }, 300);

  statusEl.textContent = `Du klarade alla ${MAL} kort!`;
  startaFyrverkeri();

  draBtn.textContent = "Spela igen";
  draBtn.disabled = false;
  draBtn.onclick = starta;
}

function avbryt() {
  kortEl.textContent = `Spelet avslutat. Du klarade ${dragna} av ${MAL} kort.`;
  draBtn.textContent = "Starta om";
  draBtn.disabled = false;
  draBtn.onclick = starta;
}

async function starta() {
  await laddaLek();
  stoppaFyrverkeri();
  kortEl.classList.remove("vinst");
  avbrytBtn.disabled = false;
  draBtn.disabled = false;
  draBtn.textContent = "Dra kort";
  draBtn.onclick = draKort;

  if (lek.length < MAL) {
    kortEl.textContent = `Varning: kortleken har bara ${lek.length} kort. Lägg till minst ${MAL} i kort.txt för att kunna vinna.`;
  } else {
    kortEl.textContent = 'Tryck på "Dra kort" för att börja';
  }
}

function uppdateraStatus() {
  statusEl.textContent = `${dragna} / ${MAL} kort klarade · ${lek.length} kvar i leken`;
}

// ---------- Fyrverkerier ----------

const canvas = document.getElementById("fyrverkeri");
const ctx = canvas.getContext("2d");
let partiklar = [];
let fyrverkeriAktivt = false;
let animId = null;

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

  // Nya explosioner slumpmässigt medan fyrverkeriet pågår
  if (fyrverkeriAktivt && Math.random() < 0.06) {
    explosion(
      Math.random() * canvas.width,
      Math.random() * canvas.height * 0.6
    );
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
  // Några explosioner direkt för en kraftfull start
  for (let i = 0; i < 3; i++) {
    explosion(
      Math.random() * canvas.width,
      Math.random() * canvas.height * 0.5
    );
  }
  if (!animId) animera();
  setTimeout(() => (fyrverkeriAktivt = false), 6000); // pågår i 6 sekunder
}

function stoppaFyrverkeri() {
  fyrverkeriAktivt = false;
  partiklar = [];
  if (animId) cancelAnimationFrame(animId);
  animId = null;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// ---------- Start ----------

avbrytBtn.onclick = avbryt;
starta();
