import React, { useState, useEffect, useMemo, useRef } from "react";
import { storage } from "./lib/storage";
import { askClaude } from "./lib/claude";

/* ------------------------------------------------------------------ */
/*  Leaf & Lore                                                        */
/*  Read a little each day, say what it stirred, watch a leaf appear.  */
/* ------------------------------------------------------------------ */

const GENRES = [
  { key: "fantasy", label: "Fantasy", color: "#A98BD8" },
  { key: "scifi", label: "Sci-fi", color: "#6FA6D6" },
  { key: "mystery", label: "Mystery", color: "#4FB39A" },
  { key: "romance", label: "Romance", color: "#E79FB0" },
  { key: "literary", label: "Literary", color: "#DFCDA0" },
  { key: "nonfiction", label: "Nonfiction", color: "#E9B44C" },
  { key: "historical", label: "Historical", color: "#CE8560" },
  { key: "poetry", label: "Poetry", color: "#B8D07E" },
  { key: "horror", label: "Horror", color: "#7A88A8" },
  { key: "other", label: "Other", color: "#9BAF96" },
];
const genreOf = (k) => GENRES.find((g) => g.key === k) || GENRES[9];

const STATUSES = [
  { key: "reading", label: "Reading now" },
  { key: "want", label: "Want to read" },
  { key: "finished", label: "Finished" },
  { key: "paused", label: "Paused" },
  { key: "dnf", label: "Set down" },
];

const STORE_KEY = "leaflore:v2";
const uid = () => Math.random().toString(36).slice(2, 10);
const today = () => new Date().toISOString().slice(0, 10);
const dayLabel = (d) =>
  new Date(d + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" });
const monthKey = (d) => d.slice(0, 7);
const monthLabel = (k) =>
  new Date(k + "-02T12:00:00").toLocaleDateString(undefined, { month: "long", year: "numeric" });

function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function rng(seed) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function quad(p0, p1, p2, t) {
  const mt = 1 - t;
  return {
    x: mt * mt * p0[0] + 2 * mt * t * p1[0] + t * t * p2[0],
    y: mt * mt * p0[1] + 2 * mt * t * p1[1] + t * t * p2[1],
    a: (Math.atan2(
      2 * mt * (p1[1] - p0[1]) + 2 * t * (p2[1] - p1[1]),
      2 * mt * (p1[0] - p0[0]) + 2 * t * (p2[0] - p1[0])
    ) * 180) / Math.PI,
  };
}

const normBook = (b) => ({
  id: b.id || uid(),
  title: b.title || "Untitled",
  author: b.author || "Unknown",
  genre: GENRES.some((g) => g.key === b.genre) ? b.genre : "other",
  status: STATUSES.some((s) => s.key === b.status) ? b.status : "want",
  rating: Number(b.rating) || 0,
  pages: Number(b.pages) || 0,
  notes: b.notes || "",
  why: b.why || "",
  addedAt: b.addedAt || Date.now(),
});

/* ------------------------------ sample ---------------------------- */

function sampleData() {
  const mk = (t, a, g, s, r, p) => normBook({ title: t, author: a, genre: g, status: s, rating: r, pages: p });
  const b1 = mk("Piranesi", "Susanna Clarke", "fantasy", "finished", 5, 245);
  const b2 = mk("Braiding Sweetgrass", "Robin Wall Kimmerer", "nonfiction", "reading", 0, 390);
  const b3 = mk("The Song of Achilles", "Madeline Miller", "literary", "finished", 4, 378);
  const b4 = mk("The Thursday Murder Club", "Richard Osman", "mystery", "reading", 0, 382);
  const b5 = mk("Devotions", "Mary Oliver", "poetry", "want", 0, 0);
  const b6 = mk("Infinite Jest", "David Foster Wallace", "literary", "dnf", 0, 0);

  const sparks = [
    "The house itself feels like a character. I keep thinking about the halls.",
    "One paragraph about moss made me put the book down and just sit there.",
    "Patroclus noticing small things. The whole thing is in the small things.",
    "Elizabeth is doing something and nobody knows what. Delighted.",
    "Quiet chapter, but the ending line landed hard.",
    "Read on the porch. Best twenty minutes of the day.",
  ];
  const drags = [
    "", "The middle section repeats itself a bit.", "",
    "Too many names introduced at once.", "", "Started to skim the flashback.",
  ];

  const entries = [];
  for (let back = 0; back < 82; back++) {
    // steady lately, a fallow stretch in the middle, steady again before that
    const skip = back < 26 ? back % 3 === 2 : back < 56 ? back % 7 !== 0 : back % 3 === 2;
    if (skip) continue;
    const d = new Date(); d.setDate(d.getDate() - back);
    const bookId = back < 26 ? (back % 2 ? b2.id : b4.id) : back < 54 ? b3.id : b1.id;
    entries.push({
      id: uid(), bookId, date: d.toISOString().slice(0, 10),
      amount: 14 + ((back * 7) % 34),
      spark: sparks[back % sparks.length],
      drag: drags[back % drags.length],
      at: Date.now() - back * 86400000,
    });
  }
  return { books: [b1, b2, b3, b4, b5, b6], entries, settings: { goal: 20, unit: "pages" } };
}

/* ------------------------------ styles ---------------------------- */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,500;9..144,600&family=Karla:wght@400;500;700&display=swap');

.ll { --ink:#0B1815; --bone:#ECE6D6; --mute:#8FA096; --line:rgba(236,230,214,.14);
  --amber:#E9B44C; --blush:#E79FB0; --sap:#B8D07E;
  font-family:'Karla',ui-sans-serif,system-ui,sans-serif; color:var(--bone);
  background:
    radial-gradient(120% 80% at 50% 6%, #17302A 0%, rgba(11,24,21,0) 60%),
    radial-gradient(90% 60% at 50% 100%, #10231D 0%, rgba(11,24,21,0) 70%), var(--ink);
  min-height:100vh; -webkit-font-smoothing:antialiased; }
.ll * { box-sizing:border-box; }
.ll button { font-family:inherit; cursor:pointer; }
.ll :focus-visible { outline:2px solid var(--amber); outline-offset:3px; border-radius:2px; }
.ll-shell { max-width:1000px; margin:0 auto; padding:18px 18px 100px; }

.ll-top { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; padding-bottom:14px; }
.ll-mark { font-family:'Fraunces',Georgia,serif; font-weight:500; font-size:23px; }
.ll-mark em { font-style:italic; color:var(--sap); }
.ll-eyebrow { font-size:10.5px; letter-spacing:.19em; text-transform:uppercase; color:var(--mute); font-weight:700; }

.ll-nav { position:fixed; left:50%; transform:translateX(-50%); bottom:16px; z-index:40;
  display:flex; gap:2px; padding:5px; border-radius:999px;
  background:rgba(9,20,17,.88); border:1px solid var(--line); backdrop-filter:blur(12px);
  box-shadow:0 12px 34px rgba(0,0,0,.5); }
.ll-nav button { border:0; background:none; color:var(--mute); font-size:13px; font-weight:500;
  padding:9px 16px; border-radius:999px; transition:color .18s, background .18s; }
.ll-nav button:hover { color:var(--bone); }
.ll-nav button[aria-current="true"] { background:rgba(184,208,126,.14); color:var(--sap); }

.ll-canopy { position:relative; border-radius:20px; overflow:hidden;
  border:1px solid var(--line); background:linear-gradient(180deg,#0E211C 0%,#0A1714 100%); }
.ll-canopy svg { display:block; width:100%; height:auto; }
.hit { cursor:pointer; }
.hit:hover .cl { filter:brightness(1.45); }

.ll-hud { position:absolute; left:0; right:0; bottom:0; padding:16px;
  display:flex; flex-wrap:wrap; gap:10px 22px; align-items:flex-end; justify-content:space-between;
  background:linear-gradient(0deg,rgba(8,18,15,.95) 32%,rgba(8,18,15,0)); }
.ll-stat b { font-family:'Fraunces',serif; font-weight:500; font-size:25px; display:block; line-height:1.1; }
.ll-stat span { font-size:10.5px; letter-spacing:.16em; text-transform:uppercase; color:var(--mute); font-weight:700; }

.ll-goal { margin-top:14px; border:1px solid var(--line); border-radius:18px; padding:16px;
  background:rgba(255,255,255,.025); display:flex; gap:16px; align-items:center; }
.ll-goal .txt { flex:1; min-width:0; }
.ll-ring { flex:none; }

h2.ll-h { font-family:'Fraunces',serif; font-weight:500; font-size:20px; margin:26px 0 12px; }
.ll-sub { color:var(--mute); font-size:13.5px; line-height:1.6; }
.ll-note { font-size:12.5px; color:var(--mute); line-height:1.6; }
.ll-err { color:#E7A08F; font-size:13px; line-height:1.6; }

.ll-btn { border:1px solid var(--line); background:rgba(236,230,214,.06); color:var(--bone);
  padding:9px 15px; border-radius:999px; font-size:13px; font-weight:500; transition:background .18s,border-color .18s; }
.ll-btn:hover { background:rgba(236,230,214,.11); border-color:rgba(236,230,214,.3); }
.ll-btn.primary { background:var(--sap); color:#12241C; border-color:var(--sap); font-weight:700; }
.ll-btn.primary:hover { background:#C7DE8E; }
.ll-btn:disabled { opacity:.5; cursor:default; }
.ll-btn.small { padding:6px 11px; font-size:12px; }
.ll-row { display:flex; gap:10px; flex-wrap:wrap; align-items:center; }

.ll-filters { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:14px; }
.ll-chip { border:1px solid var(--line); background:none; color:var(--mute); font-size:12px;
  padding:6px 12px; border-radius:999px; }
.ll-chip[aria-pressed="true"] { color:var(--bone); border-color:rgba(236,230,214,.42); background:rgba(236,230,214,.07); }

.ll-list { display:flex; flex-direction:column; gap:1px; background:var(--line);
  border:1px solid var(--line); border-radius:14px; overflow:hidden; }
.ll-item { display:flex; gap:13px; align-items:center; width:100%; text-align:left; border:0;
  background:#0D1F1A; padding:13px 15px; color:inherit; transition:background .16s; }
.ll-item:hover { background:#122A23; }
.ll-item .t { font-size:14.5px; font-weight:500; }
.ll-item .a { font-size:12.5px; color:var(--mute); margin-top:2px; }
.ll-item .meta { margin-left:auto; text-align:right; font-size:11px; color:var(--mute); white-space:nowrap; }
.ll-dot { width:9px; height:9px; border-radius:50%; flex:none; }

.ll-empty { border:1px dashed rgba(236,230,214,.2); border-radius:16px; padding:30px 22px; text-align:center; }

.ll-sheet { position:fixed; inset:0; z-index:60; display:flex; align-items:flex-end; justify-content:center;
  background:rgba(4,10,9,.66); backdrop-filter:blur(3px); }
.ll-sheetbody { width:100%; max-width:560px; max-height:90vh; overflow:auto; background:#0E211C;
  border:1px solid var(--line); border-bottom:0; border-radius:22px 22px 0 0;
  padding:22px 22px 30px; animation:rise .26s cubic-bezier(.2,.8,.3,1); }
@keyframes rise { from { transform:translateY(20px); opacity:0 } }

label.ll-l { display:block; font-size:10.5px; letter-spacing:.16em; text-transform:uppercase;
  color:var(--mute); font-weight:700; margin:15px 0 6px; }
.ll input[type=text], .ll input[type=number], .ll select, .ll textarea {
  width:100%; background:#0A1815; border:1px solid var(--line); color:var(--bone);
  border-radius:10px; padding:10px 12px; font-family:inherit; font-size:14px; }
.ll textarea { resize:vertical; min-height:66px; line-height:1.55; }
.ll select { appearance:none; }
.ll input::placeholder, .ll textarea::placeholder { color:#5D6E65; }

.ll-stars { display:flex; gap:5px; }
.ll-stars button { border:0; background:none; padding:2px; font-size:20px; line-height:1; color:rgba(236,230,214,.22); }
.ll-stars button.on { color:var(--blush); }

.ll-card { border:1px solid var(--line); border-radius:16px; padding:16px; background:rgba(255,255,255,.025); }
.ll-cards { display:grid; gap:11px; grid-template-columns:repeat(auto-fill,minmax(238px,1fr)); }
.ll-why { font-size:13px; color:var(--mute); line-height:1.6; margin:8px 0 13px; }

.ll-entry { border-left:2px solid var(--line); padding:2px 0 14px 14px; margin-left:3px; position:relative; }
.ll-entry:last-child { padding-bottom:0; }
.ll-entry .d { font-size:10.5px; letter-spacing:.14em; text-transform:uppercase; color:var(--mute); font-weight:700; }
.ll-entry p { margin:6px 0 0; font-size:13.5px; line-height:1.6; }
.ll-entry .dg { color:var(--mute); }
.ll-entry i.pip { position:absolute; left:-5px; top:4px; width:8px; height:8px; border-radius:50%; }

.ll-ins { display:grid; gap:11px; grid-template-columns:repeat(auto-fill,minmax(150px,1fr)); }
.ll-ins > div { border:1px solid var(--line); border-radius:14px; padding:14px; }
.ll-ins b { font-family:'Fraunces',serif; font-weight:500; font-size:27px; display:block; line-height:1.1; }
.ll-ins span { font-size:10.5px; letter-spacing:.15em; text-transform:uppercase; color:var(--mute); font-weight:700; }

.ll-week { display:flex; gap:5px; align-items:flex-end; height:70px; margin:14px 0 6px; }
.ll-week div { flex:1; background:rgba(236,230,214,.09); border-radius:3px 3px 0 0; position:relative; min-height:3px; }
.ll-week div.met { background:var(--sap); }
.ll-week div.some { background:rgba(184,208,126,.42); }
.ll-daylabels { display:flex; gap:5px; }
.ll-daylabels span { flex:1; text-align:center; font-size:10px; color:var(--mute); }

.ll-scene { border:1px solid var(--line); border-radius:20px; overflow:hidden; margin-top:16px; }
.ll-band { display:block; width:100%; border:0; padding:0; text-align:left; color:inherit; position:relative;
  background:linear-gradient(180deg,#0D211C 0%,#0A1714 82%); transition:background .2s; }
.ll-band:hover { background:linear-gradient(180deg,#123029 0%,#0A1714 82%); }
.ll-band:hover .ll-bandtag { color:var(--sap); }
.ll-band .ll-inner { display:flex; align-items:flex-end; padding:30px 20px 0; position:relative; z-index:2; }
.ll-band .ll-inner svg { display:block; width:100%; height:auto; pointer-events:none; }
.ll-far { position:absolute; left:0; right:0; bottom:22px; height:96px; z-index:1; pointer-events:none; }
.ll-far svg { width:100%; height:100%; display:block; }
.ll-bandtag { position:absolute; top:14px; left:18px; z-index:3;
  font-size:10.5px; letter-spacing:.19em; text-transform:uppercase; color:var(--mute); font-weight:700; transition:color .2s; }
.ll-soil { position:relative; z-index:3; padding:7px 18px 11px; background:#081411;
  border-top:1px solid rgba(184,208,126,.16); display:flex; justify-content:space-between; gap:12px; align-items:center; }
.ll-soil .sm { font-size:11.5px; color:var(--mute); }
.ll-soil .pips { display:flex; gap:4px; }
.ll-soil .pips i { width:7px; height:7px; border-radius:50%; display:block; }
.ll-barren { font-size:11.5px; color:#9A8F72; font-style:italic; }

.ll-seg { display:inline-flex; gap:2px; padding:4px; border:1px solid var(--line); border-radius:999px; margin-bottom:12px; }
.ll-seg button { border:0; background:none; color:var(--mute); font-size:12.5px; font-weight:500; padding:6px 13px; border-radius:999px; }
.ll-seg button:hover { color:var(--bone); }
.ll-seg button[aria-pressed="true"] { background:rgba(184,208,126,.14); color:var(--sap); }

.ll-genrebar { display:flex; height:8px; border-radius:999px; overflow:hidden; margin:12px 0 8px; background:rgba(255,255,255,.05); }
.ll-legend { display:flex; flex-wrap:wrap; gap:10px 16px; font-size:12px; color:var(--mute); }
.ll-legend i { display:inline-block; width:8px; height:8px; border-radius:50%; margin-right:6px; }

.sway { transform-box:fill-box; transform-origin:bottom center; animation:sway 9s ease-in-out infinite; }
@keyframes sway { 0%,100% { transform:rotate(-.55deg) } 50% { transform:rotate(.55deg) } }
.mote { animation:drift 16s ease-in-out infinite; }
@keyframes drift { 0%,100% { transform:translate(0,0); opacity:.15 } 50% { transform:translate(10px,-22px); opacity:.5 } }
.breathe { animation:breathe 4.2s ease-in-out infinite; }
@keyframes breathe { 0%,100% { opacity:.35 } 50% { opacity:.85 } }
.sprout { animation:sprout .6s cubic-bezier(.2,.9,.3,1) backwards; transform-box:fill-box; transform-origin:center; }
@keyframes sprout { from { transform:scale(0); opacity:0 } }
@media (prefers-reduced-motion: reduce) { .sway,.mote,.breathe,.sprout,.ll-sheetbody { animation:none !important } }
@media (max-width:560px) {
  .ll-shell { padding:14px 13px 100px; }
  .ll-nav button { padding:9px 9px; font-size:12px; }
  .ll-goal { flex-direction:row; }
}
`;

/* ------------------------------ tree ------------------------------ */

const LEAF = "M0 0 C 4.6 -4.6 11.5 -4 16 0 C 11.5 4 4.6 4.6 0 0 Z";

function Tree({ books, entries, settings, onPickBook, mini, crop, vitality = 1 }) {
  const W = 800, H = 700, baseY = 648, cx = 400;

  const model = useMemo(() => {
    const byBook = {};
    entries.forEach((e) => (byBook[e.bookId] = [...(byBook[e.bookId] || []), e]));

    const live = books.filter((b) => b.status !== "dnf");
    const fallen = books.filter((b) => b.status === "dnf");

    const trunkH = 150 + Math.min(entries.length, 70) * 2.6;
    const top = [cx, baseY - trunkH];
    const p0 = [cx, baseY], p1 = [cx - 12, baseY - trunkH * 0.55];

    const byGenre = {};
    live.forEach((b) => (byGenre[b.genre] = [...(byGenre[b.genre] || []), b]));
    const keys = Object.keys(byGenre).sort(
      (a, b) =>
        byGenre[b].reduce((s, x) => s + (byBook[x.id]?.length || 0), 0) -
        byGenre[a].reduce((s, x) => s + (byBook[x.id]?.length || 0), 0)
    );

    const branches = keys.map((k, i) => {
      const side = i % 2 === 0 ? -1 : 1;
      const rank = Math.floor(i / 2);
      const rows = Math.ceil(keys.length / 2);
      const u = 0.42 + (rows <= 1 ? 0.28 : (rank / (rows - 1)) * 0.48);
      const anchor = quad(p0, p1, top, u);
      const r = rng(hash(k));
      const ang = ((side * (72 - u * 24 + r() * 14)) * Math.PI) / 180;
      const weight = byGenre[k].reduce((s, x) => s + (byBook[x.id]?.length || 0), 0);
      const len = Math.min(220, 112 + weight * 5) * (1 - u * 0.2);
      const dx = Math.sin(ang), dy = -Math.cos(ang);
      const b0 = [anchor.x, anchor.y];
      const b2 = [anchor.x + dx * len, anchor.y + dy * len * 0.85];
      const b1 = [anchor.x + dx * len * 0.4, anchor.y + dy * len * 0.72];
      return { key: k, color: genreOf(k).color, b0, b1, b2, books: byGenre[k] };
    });

    // Before anything is planted, the sapling still has bare limbs to grow into.
    if (branches.length === 0) {
      [[0.52, -1, "a"], [0.72, 1, "b"], [0.9, -1, "c"]].forEach(([u, side, s]) => {
        const anchor = quad(p0, p1, top, u);
        const ang = ((side * (58 - u * 16)) * Math.PI) / 180;
        const len = 84 * (1 - u * 0.24);
        const dx = Math.sin(ang), dy = -Math.cos(ang);
        branches.push({
          key: "bare" + s, color: "#3B3024", bare: true, books: [],
          b0: [anchor.x, anchor.y],
          b1: [anchor.x + dx * len * 0.4, anchor.y + dy * len * 0.72],
          b2: [anchor.x + dx * len, anchor.y + dy * len * 0.85],
        });
      });
    }

    return { branches, fallen, byBook, p0, p1, top, trunkH, trunkW: 9 + Math.min(entries.length, 70) * 0.36 };
  }, [books, entries]);

  const goal = settings.goal || 20;
  const tw = model.trunkW, half = tw / 2, tip = Math.max(1.8, tw * 0.13);
  const dry = vitality < 0.5;
  const lift = 0.58 + 0.42 * Math.min(1, vitality);
  const cropTop = crop ? Math.max(0, baseY - model.trunkH - 250) : 0;
  const viewBox = crop ? `165 ${cropTop} 470 ${baseY + 42 - cropTop}` : `0 0 ${W} ${H}`;

  return (
    <svg viewBox={viewBox} role="img" aria-label="Your reading tree"
      style={dry ? { filter: "saturate(.45) brightness(.92)" } : undefined}>
      <defs>
        <filter id="glow" x="-150%" y="-150%" width="400%" height="400%">
          <feGaussianBlur stdDeviation="4" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <radialGradient id="halo" cx="50%" cy="45%">
          <stop offset="0%" stopColor="#B8D07E" stopOpacity=".13" />
          <stop offset="100%" stopColor="#B8D07E" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="bark" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#4A3B2C" /><stop offset="100%" stopColor="#33291F" />
        </linearGradient>
      </defs>

      <ellipse cx={400} cy={model.top[1] + 60} rx={310} ry={220} fill="url(#halo)" opacity={vitality} />
      {!mini && [[130, 210], [660, 170], [250, 130], [590, 260], [400, 118]].map(([x, y], i) => (
        <circle key={i} className="mote" cx={x} cy={y} r="1.8" fill="#E9B44C"
          style={{ animationDelay: `${i * 2.6}s`, opacity: 0.2 }} />
      ))}

      <ellipse cx={400} cy={baseY + 6} rx={196} ry={13} fill="#0B1815" />
      <path d={`M204 ${baseY + 4} Q 400 ${baseY - 12} 596 ${baseY + 4}`} stroke="rgba(184,208,126,.16)" strokeWidth="1.5" fill="none" />

      <path d={`M${cx - half} ${baseY} Q ${model.p1[0]} ${model.p1[1]} ${model.top[0] - tip} ${model.top[1]}
                L ${model.top[0] + tip} ${model.top[1]} Q ${model.p1[0] + tw * 0.72} ${model.p1[1]} ${cx + half} ${baseY} Z`} fill="url(#bark)" />
      <path d={`M${400 - 90 - tw * 3} ${baseY + 2} Q 300 ${baseY - 4} ${cx - half} ${baseY - 26}`}
        stroke="#33291F" strokeWidth={Math.max(3, tw * 0.22)} fill="none" strokeLinecap="round" opacity=".8" />
      <path d={`M${400 + 90 + tw * 3} ${baseY + 2} Q 500 ${baseY - 4} ${cx + half} ${baseY - 26}`}
        stroke="#33291F" strokeWidth={Math.max(3, tw * 0.22)} fill="none" strokeLinecap="round" opacity=".8" />

      {model.branches.map((br, bi) => (
        <g key={br.key} className="sway" style={{ animationDelay: `${bi * 0.9}s`, animationDuration: `${8.5 + bi}s` }}>
          <path d={`M${br.b0[0]} ${br.b0[1]} Q ${br.b1[0]} ${br.b1[1]} ${br.b2[0]} ${br.b2[1]}`}
            stroke="#3B3024" strokeWidth={br.bare ? 2.6 : 5.5} fill="none" strokeLinecap="round" />

          {br.books.map((bk, i) => {
            const list = model.byBook[bk.id] || [];
            const n = br.books.length;
            const t = n === 1 ? 0.72 : 0.34 + (i / (n - 1)) * 0.62;
            const p = quad(br.b0, br.b1, br.b2, t);
            const off = (i % 2 === 0 ? 1 : -1) * 13;
            const px = p.x + Math.cos(((p.a + 90) * Math.PI) / 180) * off;
            const py = p.y + Math.sin(((p.a + 90) * Math.PI) / 180) * off;
            const r = rng(hash(bk.id));
            const c = br.color;
            const reading = bk.status === "reading";

            return (
              <g key={bk.id} className="hit" onClick={() => onPickBook(bk)} tabIndex={0} role="button"
                aria-label={`${bk.title}, ${list.length} reading sessions`}
                onKeyDown={(e) => e.key === "Enter" && onPickBook(bk)}
                transform={`translate(${px} ${py})`}>
                {reading && list.length > 0 && (
                  <circle className="breathe" r={12 + Math.sqrt(list.length) * 6} fill={c} opacity=".1" />
                )}

                {/* stem to the branch */}
                <line x1={-Math.cos(((p.a + 90) * Math.PI) / 180) * off} y1={-Math.sin(((p.a + 90) * Math.PI) / 180) * off}
                  x2="0" y2="0" stroke="#3B3024" strokeWidth="1.6" />

                <g className="cl">
                  {list.length === 0 ? (
                    bk.status === "want" ? (
                      <>
                        <circle cy="8" r="5" fill={c} opacity=".45" />
                        <circle cx="-1.4" cy="6.6" r="1.3" fill="#ECE6D6" opacity=".45" />
                      </>
                    ) : (
                      <circle r="2.6" fill={c} opacity=".3" />
                    )
                  ) : (
                    list.slice(0, 44).map((e, j) => {
                      const ang = j * 137.5 + r() * 30;
                      const rad = 3 + 4.1 * Math.sqrt(j);
                      const lx = Math.cos((ang * Math.PI) / 180) * rad;
                      const ly = Math.sin((ang * Math.PI) / 180) * rad * 0.82;
                      const met = e.amount >= goal;
                      const scale = met ? 0.9 : 0.66;
                      return (
                        <g key={e.id} className="sprout" style={{ animationDelay: `${Math.min(j, 12) * 0.03}s` }}
                          transform={`translate(${lx} ${ly}) rotate(${ang * 0.6 - 25}) scale(${scale})`}>
                          <path d={LEAF} fill={c} opacity={(met ? 0.95 : 0.5) * lift}
                            filter={met && !mini && e.date === today() ? "url(#glow)" : undefined}
                            transform="translate(-8,0)" />
                        </g>
                      );
                    })
                  )}

                  {bk.rating === 5 && (
                    <g>
                      {[0, 72, 144, 216, 288].map((a) => (
                        <ellipse key={a} rx="3.4" ry="6" cy="-5" fill="#E79FB0" opacity=".95" transform={`rotate(${a})`} />
                      ))}
                      <circle r="2.5" fill="#E9B44C" />
                    </g>
                  )}
                </g>
              </g>
            );
          })}
        </g>
      ))}

      {/* a thin month sheds: what little grew is already on the ground */}
      {dry && (() => {
        const r = rng(hash("shed" + (entries[0]?.id || "x") + entries.length));
        const n = Math.round((1 - vitality) * 9);
        const tint = books[0] ? genreOf(books[0].genre).color : "#9BAF96";
        return Array.from({ length: n }, (_, i) => (
          <path key={i} d={LEAF} fill={tint} opacity={0.16 + r() * 0.12}
            transform={`translate(${255 + r() * 290} ${baseY + 2 + r() * 20}) rotate(${r() * 360}) scale(.85)`} />
        ));
      })()}

      {model.fallen.map((bk) => {
        const r = rng(hash(bk.id));
        const x = 245 + r() * 310, y = baseY + 4 + r() * 16;
        return (
          <g key={bk.id} className="hit" transform={`translate(${x} ${y}) rotate(${r() * 360})`}
            onClick={() => onPickBook(bk)} tabIndex={0} role="button" aria-label={`${bk.title}, set down`}
            onKeyDown={(e) => e.key === "Enter" && onPickBook(bk)}>
            <path className="cl" d={LEAF} fill={genreOf(bk.genre).color} opacity=".3" transform="translate(-8,0)" />
          </g>
        );
      })}
    </svg>
  );
}

/* ------------------------------ ring ------------------------------ */

function Ring({ pct, size = 74, met }) {
  const r = size / 2 - 5, c = 2 * Math.PI * r;
  return (
    <svg className="ll-ring" width={size} height={size} aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(236,230,214,.12)" strokeWidth="5" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={met ? "#B8D07E" : "#E9B44C"} strokeWidth="5"
        strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(pct, 1))}
        transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: "stroke-dashoffset .5s ease" }} />
      <text x="50%" y="53%" textAnchor="middle" dominantBaseline="middle"
        fill="#ECE6D6" fontFamily="Fraunces,serif" fontSize="17">{Math.round(pct * 100)}%</text>
    </svg>
  );
}

/* --------------------------- log a session ------------------------ */

function LogSheet({ books, settings, entry, onSave, onClose }) {
  const active = books.filter((b) => ["reading", "paused", "want"].includes(b.status));
  const pool = active.length ? active : books;
  const [d, setD] = useState(
    entry || { id: uid(), bookId: pool[0]?.id || "", date: today(), amount: settings.goal, spark: "", drag: "", at: Date.now() }
  );
  const ref = useRef(null);
  useEffect(() => { ref.current?.focus(); }, []);
  const set = (k, v) => setD((p) => ({ ...p, [k]: v }));
  const met = Number(d.amount) >= settings.goal;

  return (
    <div className="ll-sheet" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="ll-sheetbody" role="dialog" aria-modal="true" aria-label="Log today's reading">
        <div className="ll-row" style={{ justifyContent: "space-between" }}>
          <span className="ll-eyebrow">Today's reading</span>
          <button className="ll-btn small" onClick={onClose}>Close</button>
        </div>

        <label className="ll-l" htmlFor="lb">Book</label>
        <select id="lb" ref={ref} value={d.bookId} onChange={(e) => set("bookId", e.target.value)}>
          {pool.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}
        </select>

        <label className="ll-l" htmlFor="la">
          {settings.unit === "minutes" ? "Minutes read" : "Pages read"} — goal is {settings.goal}
        </label>
        <input id="la" type="number" min="0" value={d.amount} onChange={(e) => set("amount", Number(e.target.value))} />
        <p className="ll-note" style={{ marginTop: 6 }}>
          {met ? "A full leaf." : "A small leaf — still counts, still grows."}
        </p>

        <label className="ll-l" htmlFor="ls">What pulled you forward?</label>
        <textarea id="ls" value={d.spark} onChange={(e) => set("spark", e.target.value)}
          placeholder="A line, a turn, a character doing something you didn't expect…" />

        <label className="ll-l" htmlFor="ld">What dragged? (leave blank if nothing)</label>
        <textarea id="ld" value={d.drag} onChange={(e) => set("drag", e.target.value)}
          placeholder="Where your attention slipped." />

        <div className="ll-row" style={{ marginTop: 20, justifyContent: "flex-end" }}>
          <button className="ll-btn primary" disabled={!d.bookId}
            onClick={() => onSave({ ...d, amount: Number(d.amount) || 0 })}>Grow the leaf</button>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------- book sheet -------------------------- */

function BookSheet({ book, entries, onSave, onDelete, onClose }) {
  const [d, setD] = useState(book);
  const set = (k, v) => setD((p) => ({ ...p, [k]: v }));
  const mine = entries.filter((e) => e.bookId === book.id).sort((a, b) => b.date.localeCompare(a.date));
  const read = mine.reduce((s, e) => s + e.amount, 0);
  const c = genreOf(d.genre).color;

  return (
    <div className="ll-sheet" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="ll-sheetbody" role="dialog" aria-modal="true" aria-label="Book details">
        <div className="ll-row" style={{ justifyContent: "space-between" }}>
          <span className="ll-eyebrow" style={{ color: c }}>{genreOf(d.genre).label}</span>
          <button className="ll-btn small" onClick={onClose}>Close</button>
        </div>

        <label className="ll-l" htmlFor="t">Title</label>
        <input id="t" type="text" value={d.title} onChange={(e) => set("title", e.target.value)} />
        <label className="ll-l" htmlFor="a">Author</label>
        <input id="a" type="text" value={d.author} onChange={(e) => set("author", e.target.value)} />

        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label className="ll-l" htmlFor="g">Genre</label>
            <select id="g" value={d.genre} onChange={(e) => set("genre", e.target.value)}>
              {GENRES.map((g) => <option key={g.key} value={g.key}>{g.label}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label className="ll-l" htmlFor="s">Status</label>
            <select id="s" value={d.status} onChange={(e) => set("status", e.target.value)}>
              {STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>
        </div>

        <label className="ll-l" htmlFor="pg">Total pages (optional)</label>
        <input id="pg" type="number" min="0" value={d.pages || ""} onChange={(e) => set("pages", Number(e.target.value))} />

        <label className="ll-l">Rating</label>
        <div className="ll-stars">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} className={d.rating >= n ? "on" : ""} aria-label={`${n} stars`}
              onClick={() => set("rating", d.rating === n ? 0 : n)}>✦</button>
          ))}
        </div>
        {d.rating === 5 && <p className="ll-note" style={{ marginTop: 8 }}>Five stars opens a flower at the centre of this cluster.</p>}

        {d.why ? <p className="ll-why" style={{ marginTop: 14 }}>Recommended because: {d.why}</p> : null}

        <div className="ll-row" style={{ marginTop: 20, justifyContent: "space-between" }}>
          <button className="ll-btn" onClick={() => onDelete(d.id)}>Remove</button>
          <button className="ll-btn primary" onClick={() => onSave(normBook(d))}>Save book</button>
        </div>

        <h2 className="ll-h" style={{ marginBottom: 4 }}>
          {mine.length} {mine.length === 1 ? "leaf" : "leaves"}
        </h2>
        <p className="ll-sub" style={{ marginBottom: 16 }}>
          {read} {read === 1 ? "page" : "pages"} logged{d.pages ? ` of ${d.pages} — ${Math.min(100, Math.round((read / d.pages) * 100))}%` : ""}
        </p>

        {mine.length === 0 ? (
          <p className="ll-note">No sessions yet. Log one and this cluster starts filling in.</p>
        ) : (
          mine.map((e) => (
            <div className="ll-entry" key={e.id}>
              <i className="pip" style={{ background: c }} />
              <div className="d">{dayLabel(e.date)} · {e.amount} pages</div>
              {e.spark && <p>{e.spark}</p>}
              {e.drag && <p className="dg">Dragged: {e.drag}</p>}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ------------------------------- app ------------------------------ */

export default function LeafAndLore() {
  const [books, setBooks] = useState([]);
  const [entries, setEntries] = useState([]);
  const [settings, setSettings] = useState({ goal: 20, unit: "pages" });
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState("tree");
  const [sel, setSel] = useState(null);
  const [logging, setLogging] = useState(false);
  const [filter, setFilter] = useState("all");
  const [scope, setScope] = useState({ type: "month", key: monthKey(today()) });

  // Each month grows its own tree. The current month also carries the buds
  // for what you mean to read next; past months are exactly what they were.
  const view = useMemo(() => {
    if (scope.type === "all") return { books, entries };
    const es = entries.filter((e) => monthKey(e.date) === scope.key);
    const ids = new Set(es.map((e) => e.bookId));
    const current = scope.key === monthKey(today());
    const bs = books.filter(
      (b) => ids.has(b.id) || (current && ["want", "reading", "dnf"].includes(b.status))
    );
    return { books: bs, entries: es };
  }, [scope, books, entries]);

  useEffect(() => {
    (async () => {
      try {
        const r = await storage.get(STORE_KEY);
        if (r?.value) {
          const v = JSON.parse(r.value);
          setBooks((v.books || []).map(normBook));
          setEntries(v.entries || []);
          setSettings(v.settings || { goal: 20, unit: "pages" });
        }
      } catch { /* nothing saved yet */ }
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    storage.set(STORE_KEY, JSON.stringify({ books, entries, settings })).catch(() => {});
  }, [books, entries, settings, loaded]);

  const saveBook = (b) => {
    setBooks((p) => (p.some((x) => x.id === b.id) ? p.map((x) => (x.id === b.id ? b : x)) : [...p, b]));
    setSel(null);
  };
  const removeBook = (id) => {
    setBooks((p) => p.filter((b) => b.id !== id));
    setEntries((p) => p.filter((e) => e.bookId !== id));
    setSel(null);
  };
  const saveEntry = (e) => {
    setEntries((p) => [...p.filter((x) => x.id !== e.id), e]);
    setBooks((p) => p.map((b) => (b.id === e.bookId && b.status === "want" ? { ...b, status: "reading" } : b)));
    setLogging(false);
    setScope({ type: "month", key: monthKey(e.date) });
    setTab("tree");
  };

  const stats = useMemo(() => {
    const days = [...new Set(entries.map((e) => e.date))].sort().reverse();
    const totals = {};
    entries.forEach((e) => (totals[e.date] = (totals[e.date] || 0) + e.amount));

    let streak = 0;
    const cur = new Date();
    if (!totals[today()]) cur.setDate(cur.getDate() - 1);
    for (;;) {
      const k = cur.toISOString().slice(0, 10);
      if ((totals[k] || 0) >= settings.goal) { streak++; cur.setDate(cur.getDate() - 1); } else break;
    }

    const week = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const k = d.toISOString().slice(0, 10);
      week.push({ key: k, amount: totals[k] || 0, label: d.toLocaleDateString(undefined, { weekday: "narrow" }) });
    }

    const counts = {};
    books.forEach((b) => {
      if (b.status === "dnf") return;
      counts[b.genre] = (counts[b.genre] || 0) + entries.filter((e) => e.bookId === b.id).length;
    });
    Object.keys(counts).forEach((k) => { if (!counts[k]) counts[k] = 1; });
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1]);

    return {
      leaves: entries.length,
      todayAmount: totals[today()] || 0,
      streak, week, days: days.length,
      finished: books.filter((b) => b.status === "finished").length,
      blooms: books.filter((b) => b.rating === 5).length,
      genres: Object.keys(counts).length,
      pages: entries.reduce((s, e) => s + e.amount, 0),
      top, total: Object.values(counts).reduce((a, b) => a + b, 0),
    };
  }, [books, entries, settings]);

  return (
    <div className="ll">
      <style>{CSS}</style>
      <div className="ll-shell">
        <header className="ll-top">
          <div>
            <div className="ll-mark">Leaf <em>&amp;</em> Lore</div>
            <div className="ll-eyebrow" style={{ marginTop: 4 }}>Read a little. Say what it stirred.</div>
          </div>
          <button className="ll-btn small" onClick={() => setSel(normBook({ status: "want" }))}>Add a book</button>
        </header>

        {tab === "tree" && (
          <TreeView books={view.books} entries={view.entries} allBooks={books} settings={settings} stats={stats}
            scope={scope} setScope={setScope}
            onPickBook={setSel} onLog={() => setLogging(true)}
            onAdd={() => setSel(normBook({ status: "want" }))}
            onSample={() => { const s = sampleData(); setBooks(s.books); setEntries(s.entries); setSettings(s.settings); }} />
        )}
        {tab === "forest" && (
          <ForestView books={books} entries={entries} settings={settings}
            onOpen={(key) => { setScope({ type: key === "all" ? "all" : "month", key }); setTab("tree"); }} />
        )}
        {tab === "library" && (
          <LibraryView books={books} entries={entries} filter={filter} setFilter={setFilter}
            onPick={setSel} onAdd={() => setSel(normBook({ status: "want" }))} />
        )}
        {tab === "discover" && <DiscoverView books={books} entries={entries} onAdd={saveBook} />}
        {tab === "insights" && (
          <InsightsView books={books} entries={entries} stats={stats}
            settings={settings} setSettings={setSettings} />
        )}
      </div>

      <nav className="ll-nav" aria-label="Sections">
        {[["tree", "Tree"], ["forest", "Forest"], ["library", "Library"], ["discover", "Discover"], ["insights", "Insights"]].map(([k, l]) => (
          <button key={k} aria-current={tab === k} onClick={() => setTab(k)}>{l}</button>
        ))}
      </nav>

      {sel && <BookSheet book={sel} entries={entries} onSave={saveBook} onDelete={removeBook} onClose={() => setSel(null)} />}
      {logging && <LogSheet books={books} settings={settings} onSave={saveEntry} onClose={() => setLogging(false)} />}
    </div>
  );
}

/* ------------------------------ views ----------------------------- */

function TreeView({ books, entries, allBooks, settings, stats, scope, setScope, onPickBook, onLog, onAdd, onSample }) {
  const empty = allBooks.length === 0;
  const pct = stats.todayAmount / (settings.goal || 20);
  const met = stats.todayAmount >= settings.goal;
  const thisMonth = monthKey(today());
  const past = scope.type === "month" && scope.key !== thisMonth;
  const leaves = entries.length;
  const pages = entries.reduce((s, e) => s + e.amount, 0);
  const blooms = books.filter((b) => b.rating === 5).length;

  return (
    <>
      {!empty && (
        <div className="ll-row" style={{ justifyContent: "space-between", marginBottom: 4 }}>
          <div className="ll-seg" role="group" aria-label="What the tree shows">
            <button aria-pressed={scope.type === "month" && !past}
              onClick={() => setScope({ type: "month", key: thisMonth })}>This month</button>
            <button aria-pressed={scope.type === "all"} onClick={() => setScope({ type: "all" })}>All time</button>
          </div>
          {past && (
            <div className="ll-row" style={{ gap: 8 }}>
              <span className="ll-eyebrow" style={{ color: "var(--sap)" }}>{monthLabel(scope.key)}</span>
              <button className="ll-btn small" onClick={() => setScope({ type: "month", key: thisMonth })}>Back to now</button>
            </div>
          )}
        </div>
      )}

      <div className="ll-canopy">
        <Tree books={books} entries={entries} settings={settings} onPickBook={onPickBook} />
        <div className="ll-hud" style={empty ? { justifyContent: "center", textAlign: "center" } : undefined}>
          {empty ? (
            <p className="ll-sub" style={{ maxWidth: 380, margin: 0 }}>
              A bare sapling, waiting. Every session you read grows one leaf here.
            </p>
          ) : (
            <>
              <div className="ll-stat"><b>{leaves}</b><span>Leaves</span></div>
              <div className="ll-stat"><b>{past ? new Set(entries.map((e) => e.date)).size : stats.streak}</b>
                <span>{past ? "Days read" : "Day streak"}</span></div>
              <div className="ll-stat"><b>{pages}</b><span>Pages</span></div>
              <div className="ll-stat"><b>{blooms}</b><span>Blooms</span></div>
            </>
          )}
        </div>
      </div>

      {empty ? (
        <div className="ll-goal" style={{ display: "block" }}>
          <div className="ll-eyebrow">Start here</div>
          <p className="ll-sub" style={{ margin: "7px 0 0", color: "var(--bone)", maxWidth: 460 }}>
            Add the book in your hands, then log each day you read it. Leaves for one book gather
            into a cluster on its genre's branch.
          </p>
          <div className="ll-row" style={{ marginTop: 13 }}>
            <button className="ll-btn primary small" onClick={onAdd}>Add your first book</button>
            <button className="ll-btn small" onClick={onSample}>Fill with three months of reading</button>
          </div>
        </div>
      ) : past ? (
        <div className="ll-goal" style={{ display: "block" }}>
          <div className="ll-eyebrow">{monthLabel(scope.key)}</div>
          <p className="ll-sub" style={{ margin: "7px 0 0", color: "var(--bone)" }}>
            This tree is finished growing. {leaves} {leaves === 1 ? "leaf" : "leaves"} across{" "}
            {new Set(entries.map((e) => e.date)).size} days, {books.length} {books.length === 1 ? "book" : "books"}.
          </p>
        </div>
      ) : (
        <div className="ll-goal">
          <Ring pct={pct} met={met} />
          <div className="txt">
            <div className="ll-eyebrow">{met ? "Today's leaf is grown" : "Today"}</div>
            <p className="ll-sub" style={{ margin: "6px 0 0", color: "var(--bone)" }}>
              {met
                ? `${stats.todayAmount} pages read. ${stats.streak} ${stats.streak === 1 ? "day" : "days"} running.`
                : `${stats.todayAmount} of ${settings.goal} pages. ${settings.goal - stats.todayAmount} to go.`}
            </p>
            <button className="ll-btn primary small" style={{ marginTop: 11 }} onClick={onLog}>
              {met ? "Log more reading" : "Log today's reading"}
            </button>
          </div>
        </div>
      )}

      {!empty && (
        <p className="ll-note" style={{ marginTop: 12 }}>
          Tap any cluster to read back what you wrote while you were in that book.
        </p>
      )}
    </>
  );
}

function FarTrees({ seed, vitality }) {
  const r = rng(hash(seed));
  const n = 11;
  return (
    <div className="ll-far" aria-hidden="true">
      <svg viewBox="0 0 800 96" preserveAspectRatio="none">
        {Array.from({ length: n }, (_, i) => {
          const x = (i / (n - 1)) * 820 - 10 + r() * 26;
          const h = 34 + r() * 46;
          const w = 9 + r() * 13;
          const bare = r() > 0.25 + vitality * 0.6;
          return (
            <g key={i} opacity={0.5 + r() * 0.3}>
              <line x1={x} y1={96} x2={x} y2={96 - h} stroke="#152C25" strokeWidth="2" />
              {bare ? (
                <>
                  <line x1={x} y1={96 - h * 0.65} x2={x - w * 0.7} y2={96 - h * 0.95} stroke="#152C25" strokeWidth="1.4" />
                  <line x1={x} y1={96 - h * 0.75} x2={x + w * 0.7} y2={96 - h} stroke="#152C25" strokeWidth="1.4" />
                </>
              ) : (
                <ellipse cx={x} cy={96 - h} rx={w} ry={w * 0.9} fill="#16302A" />
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function ForestView({ books, entries, settings, onOpen }) {
  const now = monthKey(today());

  const plots = useMemo(() => {
    const by = {};
    entries.forEach((e) => (by[monthKey(e.date)] = [...(by[monthKey(e.date)] || []), e]));
    return Object.keys(by).sort().reverse().map((key) => {
      const es = by[key];
      const ids = new Set(es.map((e) => e.bookId));
      const bs = books.filter((b) => ids.has(b.id));
      const counts = {};
      es.forEach((e) => {
        const g = books.find((b) => b.id === e.bookId)?.genre || "other";
        counts[g] = (counts[g] || 0) + 1;
      });
      const days = new Set(es.map((e) => e.date)).size;
      const [y, m] = key.split("-").map(Number);
      const inMonth = key === now ? new Date().getDate() : new Date(y, m, 0).getDate();
      return {
        key, entries: es, books: bs, days, inMonth,
        pages: es.reduce((s, e) => s + e.amount, 0),
        vitality: Math.min(1, days / (inMonth * 0.6)),
        genres: Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([g]) => g).slice(0, 5),
      };
    });
  }, [books, entries, now]);

  if (plots.length === 0) {
    return (
      <>
        <h2 className="ll-h">Forest</h2>
        <div className="ll-empty">
          <p className="ll-sub" style={{ maxWidth: 380, margin: "0 auto" }}>
            No trees standing yet. Each month grows one of its own, and when the month ends it stays
            here exactly as you left it.
          </p>
        </div>
      </>
    );
  }

  const totalDays = new Set(entries.map((e) => e.date)).size;

  return (
    <>
      <h2 className="ll-h">Forest</h2>
      <p className="ll-sub" style={{ maxWidth: 520 }}>
        {plots.length} {plots.length === 1 ? "tree" : "trees"}, {totalDays} days of reading. Newest at the
        top — keep scrolling to walk back through your months.
      </p>
      <button className="ll-btn small" style={{ marginTop: 12 }} onClick={() => onOpen("all")}>
        See every season as one tree
      </button>

      <div className="ll-scene">
        {plots.map((p, i) => {
          const width = Math.round(40 + Math.min(p.entries.length, 46) * 0.85);
          const align = i % 3 === 0 ? "flex-start" : i % 3 === 1 ? "flex-end" : "center";
          const barren = p.vitality < 0.5;
          return (
            <button key={p.key} className="ll-band" onClick={() => onOpen(p.key)}
              aria-label={`${monthLabel(p.key)}, ${p.entries.length} leaves`}>
              <span className="ll-bandtag">
                {monthLabel(p.key)}{p.key === now ? " · still growing" : ""}
              </span>
              <FarTrees seed={p.key} vitality={p.vitality} />
              <div className="ll-inner" style={{ justifyContent: align }}>
                <div style={{ width: `${width}%` }}>
                  <Tree books={p.books} entries={p.entries} settings={settings}
                    mini crop vitality={p.vitality} onPickBook={() => {}} />
                </div>
              </div>
              <div className="ll-soil">
                <span className="sm">
                  {p.entries.length} leaves · {p.pages} pages · {p.days} of {p.inMonth} days
                </span>
                <span className="ll-row" style={{ gap: 10 }}>
                  {barren && <span className="ll-barren">a thin month</span>}
                  <span className="pips">
                    {p.genres.map((g) => (
                      <i key={g} style={{ background: genreOf(g).color }} title={genreOf(g).label} />
                    ))}
                  </span>
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <p className="ll-note" style={{ marginTop: 12 }}>
        Months you barely read stand bare, with what grew already on the ground.
      </p>
    </>
  );
}

function LibraryView({ books, entries, filter, setFilter, onPick, onAdd }) {
  const shown = filter === "all" ? books : books.filter((b) => b.status === filter);
  const order = { reading: 0, want: 1, finished: 2, paused: 3, dnf: 4 };
  const sorted = [...shown].sort((a, b) => order[a.status] - order[b.status] || b.addedAt - a.addedAt);

  return (
    <>
      <h2 className="ll-h">Library</h2>
      <div className="ll-filters">
        <button className="ll-chip" aria-pressed={filter === "all"} onClick={() => setFilter("all")}>All {books.length}</button>
        {STATUSES.map((s) => (
          <button key={s.key} className="ll-chip" aria-pressed={filter === s.key} onClick={() => setFilter(s.key)}>
            {s.label} {books.filter((b) => b.status === s.key).length}
          </button>
        ))}
      </div>

      {sorted.length === 0 ? (
        <div className="ll-empty">
          <p className="ll-sub">Nothing on this shelf yet.</p>
          <button className="ll-btn primary" style={{ marginTop: 14 }} onClick={onAdd}>Add a book</button>
        </div>
      ) : (
        <div className="ll-list">
          {sorted.map((b) => {
            const n = entries.filter((e) => e.bookId === b.id).length;
            return (
              <button key={b.id} className="ll-item" onClick={() => onPick(b)}>
                <span className="ll-dot" style={{ background: genreOf(b.genre).color, opacity: b.status === "dnf" ? 0.35 : 1 }} />
                <span>
                  <span className="t">{b.title}</span>
                  <span className="a">{b.author}</span>
                </span>
                <span className="meta">
                  {n ? `${n} ${n === 1 ? "leaf" : "leaves"}` : STATUSES.find((s) => s.key === b.status).label}
                  {b.rating ? <><br />{"✦".repeat(b.rating)}</> : null}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}

function DiscoverView({ books, entries, onAdd }) {
  const [recs, setRecs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [mood, setMood] = useState("");

  const fetchRecs = async () => {
    setLoading(true); setErr(""); setRecs([]);
    const line = (b) => `${b.title} by ${b.author} (${genreOf(b.genre).label}${b.rating ? `, ${b.rating}/5` : ""})`;
    const loved = books.filter((b) => b.status === "finished" && b.rating >= 4).map(line);
    const read = books.filter((b) => b.status === "finished" && b.rating < 4).map(line);
    const dnf = books.filter((b) => b.status === "dnf").map(line);
    const want = books.filter((b) => b.status === "want").map((b) => b.title);
    const sparks = entries.filter((e) => e.spark).slice(-14).map((e) => {
      const b = books.find((x) => x.id === e.bookId);
      return `On ${b?.title}: ${e.spark}`;
    });
    const drags = entries.filter((e) => e.drag).slice(-10).map((e) => {
      const b = books.find((x) => x.id === e.bookId);
      return `On ${b?.title}: ${e.drag}`;
    });

    const prompt = `You are a well-read bookseller. Recommend 4 books for this reader.

Loved: ${loved.join("; ") || "none recorded"}
Also finished: ${read.join("; ") || "none"}
Abandoned: ${dnf.join("; ") || "none"}
Already on their want-to-read list (do NOT suggest these): ${want.join("; ") || "none"}

Their own notes on what excited them while reading:
${sparks.join("\n") || "none yet"}

What dragged for them:
${drags.join("\n") || "none yet"}
${mood ? `\nWhat they want right now: ${mood}` : ""}

Weight their reflection notes heavily — they say more about taste than genre labels do.
Only recommend real, published books. Vary the recommendations.
Respond with ONLY a JSON array, no prose, no markdown fences:
[{"title":"","author":"","genre":"one of: fantasy, scifi, mystery, romance, literary, nonfiction, historical, poetry, horror, other","why":"one sentence, max 25 words, referencing something specific they wrote or loved"}]`;

    try {
      const text = await askClaude(prompt);
      const clean = text.replace(/```json|```/g, "").trim();
      setRecs(JSON.parse(clean.slice(clean.indexOf("["), clean.lastIndexOf("]") + 1)));
    } catch {
      setErr("Couldn't reach the recommender just now. Try again in a moment.");
    }
    setLoading(false);
  };

  const written = entries.filter((e) => e.spark).length;

  return (
    <>
      <h2 className="ll-h">Discover</h2>
      <p className="ll-sub" style={{ maxWidth: 520 }}>
        {written === 0
          ? "Log a few sessions with a note about what pulled you forward — those notes are what make the recommendations sharp."
          : `Reading your ${written} reflection${written === 1 ? "" : "s"} alongside your shelf.`}
      </p>

      <div style={{ marginTop: 16, maxWidth: 520 }}>
        <label className="ll-l" htmlFor="mood">In the mood for (optional)</label>
        <input id="mood" type="text" value={mood} onChange={(e) => setMood(e.target.value)}
          placeholder="something short and strange for a rainy weekend" />
        <button className="ll-btn primary" style={{ marginTop: 12 }} onClick={fetchRecs} disabled={loading || books.length === 0}>
          {loading ? "Looking…" : "Find my next read"}
        </button>
      </div>

      {err && <p className="ll-err" style={{ marginTop: 14 }}>{err}</p>}

      {recs.length > 0 && (
        <>
          <h2 className="ll-h">New buds</h2>
          <div className="ll-cards">
            {recs.map((r, i) => (
              <div className="ll-card" key={i}>
                <span className="ll-eyebrow" style={{ color: genreOf(r.genre).color }}>{genreOf(r.genre).label}</span>
                <div style={{ fontFamily: "'Fraunces',serif", fontSize: 17, margin: "7px 0 3px" }}>{r.title}</div>
                <div className="ll-sub" style={{ fontSize: 12.5 }}>{r.author}</div>
                <p className="ll-why">{r.why}</p>
                <button className="ll-btn small" onClick={() => {
                  onAdd(normBook({ ...r, status: "want" }));
                  setRecs((p) => p.filter((_, j) => j !== i));
                }}>Add to want to read</button>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}

function InsightsView({ books, entries, stats, settings, setSettings }) {
  const [read, setRead] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const maxWeek = Math.max(settings.goal, ...stats.week.map((d) => d.amount), 1);

  const readTaste = async () => {
    setLoading(true); setErr(""); setRead("");
    const notes = entries.filter((e) => e.spark || e.drag).slice(-25).map((e) => {
      const b = books.find((x) => x.id === e.bookId);
      return `${e.date} — ${b?.title}: excited by "${e.spark || "—"}"${e.drag ? `; dragged by "${e.drag}"` : ""}`;
    }).join("\n");
    const shelf = books.map((b) =>
      `${b.title} by ${b.author} — ${genreOf(b.genre).label}, ${b.status}${b.rating ? `, ${b.rating}/5` : ""}`).join("\n");
    try {
      const text = await askClaude(
        `A reader's shelf:\n${shelf}\n\nTheir daily reading reflections:\n${notes}\n\nWrite 3 short observations about what this person actually responds to in a book — quote or paraphrase their own words where it helps. Then one sentence on what tends to lose them. Plain sentences, one per line, no bullets, no preamble, no headings.`
      );
      setRead(text.trim());
    } catch {
      setErr("Couldn't read your reflections just now. Try again in a moment.");
    }
    setLoading(false);
  };

  return (
    <>
      <h2 className="ll-h">Insights</h2>
      <div className="ll-ins">
        <div><b>{stats.streak}</b><span>Day streak</span></div>
        <div><b>{stats.days}</b><span>Days read</span></div>
        <div><b>{stats.pages}</b><span>Pages total</span></div>
        <div><b>{stats.finished}</b><span>Books finished</span></div>
      </div>

      <h2 className="ll-h">This week</h2>
      <div className="ll-week">
        {stats.week.map((d) => (
          <div key={d.key} title={`${dayLabel(d.key)} — ${d.amount} pages`}
            className={d.amount >= settings.goal ? "met" : d.amount > 0 ? "some" : ""}
            style={{ height: `${Math.max(3, (d.amount / maxWeek) * 100)}%` }} />
        ))}
      </div>
      <div className="ll-daylabels">{stats.week.map((d) => <span key={d.key}>{d.label}</span>)}</div>

      <h2 className="ll-h">Daily goal</h2>
      <div className="ll-row">
        <input type="number" min="1" style={{ width: 110 }} value={settings.goal}
          onChange={(e) => setSettings({ ...settings, goal: Math.max(1, Number(e.target.value) || 1) })} />
        <select style={{ width: 130 }} value={settings.unit}
          onChange={(e) => setSettings({ ...settings, unit: e.target.value })}>
          <option value="pages">pages a day</option>
          <option value="minutes">minutes a day</option>
        </select>
      </div>
      <p className="ll-note" style={{ marginTop: 8 }}>
        Hit the goal and the day's leaf grows full. Fall short and it still appears, just smaller.
      </p>

      {stats.total > 0 && (
        <>
          <h2 className="ll-h">Your canopy</h2>
          <div className="ll-genrebar">
            {stats.top.map(([k, n]) => (
              <i key={k} style={{ width: `${(n / stats.total) * 100}%`, background: genreOf(k).color, display: "block" }} />
            ))}
          </div>
          <div className="ll-legend">
            {stats.top.map(([k, n]) => (
              <span key={k}><i style={{ background: genreOf(k).color }} />{genreOf(k).label} {n}</span>
            ))}
          </div>
        </>
      )}

      <h2 className="ll-h">What your notes say</h2>
      {read ? (
        <div className="ll-card">
          {read.split("\n").filter(Boolean).map((l, i) => (
            <p key={i} className="ll-sub" style={{ margin: i ? "10px 0 0" : 0, color: "var(--bone)" }}>{l}</p>
          ))}
        </div>
      ) : (
        <p className="ll-sub" style={{ maxWidth: 520 }}>
          A short read on what you actually respond to, drawn from what you wrote in the moment rather than from stars.
        </p>
      )}
      {err && <p className="ll-err" style={{ marginTop: 12 }}>{err}</p>}
      <button className="ll-btn" style={{ marginTop: 14 }} onClick={readTaste} disabled={loading || entries.length < 3}>
        {loading ? "Reading…" : read ? "Read again" : "Read my reflections"}
      </button>
      {entries.length < 3 && <p className="ll-note" style={{ marginTop: 8 }}>Log at least three sessions first.</p>}
    </>
  );
}
