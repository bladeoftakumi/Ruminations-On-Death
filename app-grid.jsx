const { useState, useMemo, useEffect, useRef } = React;

// ---------- constants ----------
const WEEKS_PER_YEAR = 52;
const LIFE_EXPECTANCY = 78;
const TOTAL_WEEKS = WEEKS_PER_YEAR * LIFE_EXPECTANCY; // 4056

const PALETTES = {
  sage: {
    lived:   "#1B1B1A",
    neutral: "#85A898",
    work:    "#658C6E",
    workBad: "#D6452A",
    phone:   "#D6452A",
    free:    "#EFF9E8",
    accent:  "#DFCD80",
    paper:   "#F4F0E6",
    ink:     "#1B1B1A",
    rule:    "#1B1B1A",
  },
  straw: {
    lived:   "#1B1B1A",
    neutral: "#C9C0A6",
    work:    "#DFCD80",
    workBad: "#D6452A",
    phone:   "#D6452A",
    free:    "#FBF7E6",
    accent:  "#658C6E",
    paper:   "#F7F2E1",
    ink:     "#1B1B1A",
    rule:    "#1B1B1A",
  },
  cool: {
    lived:   "#0E1414",
    neutral: "#6C7F84",
    work:    "#3E5C66",
    workBad: "#D6452A",
    phone:   "#D6452A",
    free:    "#E8EFEC",
    accent:  "#85A898",
    paper:   "#EDE9DD",
    ink:     "#0E1414",
    rule:    "#0E1414",
  },
};

// ---------- compute ----------
function compute({ age, enjoyWork, workHours, screenHours }) {
  const livedWeeks = Math.max(0, Math.min(TOTAL_WEEKS, Math.round(age * WEEKS_PER_YEAR)));
  const remainingWeeks = TOTAL_WEEKS - livedWeeks;
  const hoursPerWeek = 168;

  const sleepH   = 8   * 7;     // 56
  const eatingH  = 1.5 * 7;     // 10.5
  const commuteH = workHours > 0 ? 1 * 5 : 0;
  const phoneH   = screenHours * 7;
  const workH    = workHours;
  const usedH    = sleepH + eatingH + commuteH + phoneH + workH;
  const freeH    = Math.max(0, hoursPerWeek - usedH);

  const factor = remainingWeeks / hoursPerWeek;
  const sleepWeeks   = Math.round(sleepH   * factor);
  const eatingWeeks  = Math.round(eatingH  * factor);
  const commuteWeeks = Math.round(commuteH * factor);
  const workWeeks    = Math.round(workH    * factor);
  const phoneWeeks   = Math.round(phoneH   * factor);
  // free is what's left so the total stays exact
  const allocated = sleepWeeks + eatingWeeks + commuteWeeks + workWeeks + phoneWeeks;
  const freeWeeks = Math.max(0, remainingWeeks - allocated);

  return {
    livedWeeks, remainingWeeks,
    sleepWeeks, eatingWeeks, commuteWeeks, workWeeks, phoneWeeks, freeWeeks,
    hoursFree: freeH,
    pctFree: (freeWeeks / TOTAL_WEEKS) * 100,
    pctLived: (livedWeeks / TOTAL_WEEKS) * 100,
  };
}

// ---------- build the cell array ----------
function buildCells(stats, enjoyWork, ordering) {
  const arr = new Array(TOTAL_WEEKS);
  let i = 0;
  // lived first (chronological)
  for (let k = 0; k < stats.livedWeeks; k++) arr[i++] = "lived";

  const workKey = enjoyWork ? "work" : "workBad";
  const neutralCount = stats.sleepWeeks + stats.eatingWeeks + stats.commuteWeeks;

  if (ordering === "interleaved") {
    // distribute remaining weeks roughly proportionally so it looks "alive"
    // We'll fill week-by-week using a weighted lottery (deterministic pattern).
    const buckets = [
      { key: "neutral", n: neutralCount },
      { key: workKey,   n: stats.workWeeks },
      { key: "phone",   n: stats.phoneWeeks },
      { key: "free",    n: stats.freeWeeks },
    ];
    const remaining = stats.remainingWeeks;
    const counters = buckets.map(b => ({ ...b, used: 0 }));
    for (let r = 0; r < remaining; r++) {
      // pick bucket with greatest (n*(r+1)/remaining - used)
      let best = -1, bestVal = -Infinity;
      for (let bi = 0; bi < counters.length; bi++) {
        const target = counters[bi].n * (r + 1) / remaining;
        const delta = target - counters[bi].used;
        if (delta > bestVal) { bestVal = delta; best = bi; }
      }
      counters[best].used++;
      arr[i++] = counters[best].key;
    }
  } else {
    // sequential: neutral -> work -> phone -> free
    for (let k = 0; k < neutralCount;        k++) arr[i++] = "neutral";
    for (let k = 0; k < stats.workWeeks;     k++) arr[i++] = workKey;
    for (let k = 0; k < stats.phoneWeeks;    k++) arr[i++] = "phone";
    for (let k = 0; k < stats.freeWeeks;     k++) arr[i++] = "free";
  }
  while (i < TOTAL_WEEKS) arr[i++] = "free";
  return arr;
}

// ---------- helpers ----------
const fmtInt = n => n.toLocaleString("en-US");
const fmtPct = n => (n < 1 ? n.toFixed(2) : n.toFixed(1)) + "%";

// Inline editable number — used in the madlibs prose
function NumField({ value, onChange, min, max, step = 1, width }) {
  const [v, setV] = useState(String(value));
  useEffect(() => { setV(String(value)); }, [value]);
  const commit = (raw) => {
    let n = parseFloat(raw);
    if (Number.isNaN(n)) n = value;
    n = Math.max(min, Math.min(max, n));
    n = Math.round(n / step) * step;
    n = Math.round(n * 1000) / 1000;
    setV(String(n));
    onChange(n);
  };
  return (
    <input
      className="numfield"
      style={{ width: width || `${Math.max(2, String(value).length + 1)}ch` }}
      value={v}
      inputMode="decimal"
      onChange={e => setV(e.target.value)}
      onBlur={e => commit(e.target.value)}
      onKeyDown={e => { if (e.key === "Enter") e.target.blur(); }}
    />
  );
}

function ToggleWord({ value, options, onChange }) {
  // value is index into options
  const cycle = () => onChange((value + 1) % options.length);
  return (
    <button className="togglew" onClick={cycle}>
      <span className="togglew-inner">{options[value]}</span>
    </button>
  );
}

// ---------- the app ----------
function App() {
  const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
    "palette": "sage",
    "livedIntensity": 0.85,
    "ordering": "sequential",
    "showAnnotations": true
  }/*EDITMODE-END*/;
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  const [age, setAge] = useState(34);
  const [enjoyWorkIdx, setEnjoyWorkIdx] = useState(1); // 0 = enjoy, 1 = don't enjoy
  const [workHours, setWorkHours] = useState(45);
  const [screenHours, setScreenHours] = useState(4);
  const [cell, setCell] = useState(8); // px
  const [hover, setHover] = useState(null);

  const enjoyWork = enjoyWorkIdx === 0;
  const stats = useMemo(
    () => compute({ age, enjoyWork, workHours, screenHours }),
    [age, enjoyWork, workHours, screenHours]
  );
  const cells = useMemo(
    () => buildCells(stats, enjoyWork, t.ordering),
    [stats, enjoyWork, t.ordering]
  );

  const palette = PALETTES[t.palette] || PALETTES.sage;
  const livedAlpha = Math.max(0.3, Math.min(1, t.livedIntensity ?? 0.85));

  // Inject palette as CSS vars on root
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--c-lived",   palette.lived);
    root.style.setProperty("--c-neutral", palette.neutral);
    root.style.setProperty("--c-work",    palette.work);
    root.style.setProperty("--c-workBad", palette.workBad);
    root.style.setProperty("--c-phone",   palette.phone);
    root.style.setProperty("--c-free",    palette.free);
    root.style.setProperty("--c-accent",  palette.accent);
    root.style.setProperty("--c-paper",   palette.paper);
    root.style.setProperty("--c-ink",     palette.ink);
    root.style.setProperty("--c-rule",    palette.rule);
    root.style.setProperty("--lived-alpha", String(livedAlpha));
  }, [palette, livedAlpha]);

  const workKey = enjoyWork ? "work" : "workBad";
  const neutralCount = stats.sleepWeeks + stats.eatingWeeks + stats.commuteWeeks;

  return (
    <main className="page" data-screen-label="Ruminations on Death">
      {/* ---------- masthead ---------- */}
      <header className="masthead">
        <div className="eyebrow">
          <span>An essay in a thousand small squares</span>
          <span className="dot">·</span>
          <span>No. 01</span>
        </div>
        <h1 className="title">
          Ruminations<br/>on&nbsp;Death
        </h1>
        <p className="dek">
          The arithmetic is unkind. A long, lucky life&nbsp;— seventy-eight years&nbsp;— is
          four thousand and fifty-six&nbsp;weeks. Most of them are already promised to
          sleep, to traffic, to email, to the glow of a small bright rectangle held
          a few inches from the face.
        </p>
        <p className="dek">
          The grid below is your life, drawn at scale. Each square is one&nbsp;week.
          Fill in the blanks and see what is&nbsp;left.
        </p>
      </header>

      <hr className="rule"/>

      {/* ---------- prose form ---------- */}
      <section className="prompt">
        <div className="caption">§&nbsp;I.&nbsp;&nbsp;The inputs.</div>
        <p className="madlibs">
          I am{" "}
          <NumField value={age} onChange={setAge} min={0} max={LIFE_EXPECTANCY - 1} />
          {" "}years old. I{" "}
          <ToggleWord
            value={enjoyWorkIdx}
            options={["enjoy", "do not enjoy"]}
            onChange={setEnjoyWorkIdx}
          />
          {" "}my work, and spend about{" "}
          <NumField value={workHours} onChange={setWorkHours} min={0} max={100} />
          {" "}hours a week doing it. On most days I spend roughly{" "}
          <NumField value={screenHours} onChange={setScreenHours} min={0} max={16} step={0.5} />
          {" "}hours looking at my phone.
        </p>
      </section>

      <hr className="rule"/>

      {/* ---------- the verdict ---------- */}
      <section className="verdict">
        <div className="caption">§&nbsp;II.&nbsp;&nbsp;The accounting.</div>
        <div className="verdict-grid">
          <Stat n={stats.livedWeeks}    label="weeks already lived"           tone="lived"/>
          <Stat n={neutralCount}        label="the brute facts of being alive" sub="sleep · eating · commute" tone="neutral"/>
          <Stat n={stats.workWeeks}     label={enjoyWork ? "work you say you enjoy" : "work you do not enjoy"} tone={workKey}/>
          <Stat n={stats.phoneWeeks}    label="hours of glow, converted"      sub="phone, screen, scroll"     tone="phone"/>
          <Stat n={stats.freeWeeks}     label="weeks of genuinely free time"  tone="free" emphasis/>
        </div>
      </section>

      <hr className="rule"/>

      {/* ---------- grid ---------- */}
      <section className="gridwrap">
        <div className="grid-head">
          <div className="caption">§&nbsp;III.&nbsp;&nbsp;The grid.</div>
          <div className="zoom">
            <span className="zoom-label">scale</span>
            <input
              type="range"
              min="3"
              max="18"
              step="1"
              value={cell}
              onChange={e => setCell(parseInt(e.target.value))}
              className="zoom-slider"
            />
            <span className="zoom-val">{cell}px</span>
          </div>
        </div>

        <div className="grid-meta">
          <span>52 weeks across</span>
          <span className="dot">·</span>
          <span>78 years down</span>
          <span className="dot">·</span>
          <span>{fmtInt(TOTAL_WEEKS)} squares in total</span>
        </div>

        <div
          className="grid"
          style={{
            "--cell": `${cell}px`,
            "--gap":  `${Math.max(1, Math.floor(cell / 6))}px`,
          }}
        >
          {cells.map((k, idx) => (
            <span
              key={idx}
              className={`cell c-${k}`}
              onMouseEnter={() => setHover(idx)}
              onMouseLeave={() => setHover(null)}
              title={`Week ${idx + 1} of ${TOTAL_WEEKS} — ${labelFor(k, enjoyWork)}`}
            />
          ))}
        </div>

        {t.showAnnotations && (
          <GridAnnotations cell={cell} stats={stats} enjoyWork={enjoyWork} ordering={t.ordering}/>
        )}

        <div className="legend">
          <LegendItem tone="lived"   label="already lived"            n={stats.livedWeeks}/>
          <LegendItem tone="neutral" label="sleep, eating, commute"   n={neutralCount}/>
          <LegendItem tone={workKey} label={enjoyWork ? "work — enjoyed" : "work — endured"} n={stats.workWeeks}/>
          <LegendItem tone="phone"   label="phone time"               n={stats.phoneWeeks}/>
          <LegendItem tone="free"    label="free"                     n={stats.freeWeeks}/>
        </div>
      </section>

      <hr className="rule"/>

      {/* ---------- counter / closer ---------- */}
      <section className="counter">
        <div className="caption">§&nbsp;IV.&nbsp;&nbsp;What is left.</div>
        <div className="counter-figure">
          <div className="big-number">{fmtInt(stats.freeWeeks)}</div>
          <div className="big-label">free weeks remain.</div>
        </div>
        <p className="closer">
          That is <span className="emph">{fmtPct(stats.pctFree)}</span> of a life&nbsp;—
          the part you have not yet sold to sleep, employer, or screen. Of the four
          thousand weeks you were ever going to get, you have already spent{" "}
          <span className="emph">{fmtPct(stats.pctLived)}</span>. What remains, after
          everything else takes its cut, is the colour of pale&nbsp;mint at the bottom
          of the grid.
        </p>
        <p className="closer small">
          The point is not despair. The point is to look at it honestly, once, and
          then to decide what the remaining squares are&nbsp;for.
        </p>
      </section>

      <footer className="colophon">
        <span>Set in Newsreader & IBM Plex Mono.</span>
        <span className="dot">·</span>
        <span>Built after Burkeman, after Seneca, after a long Tuesday.</span>
        <span className="dot">·</span>
        <span>{new Date().getFullYear()}</span>
      </footer>

      {/* ---------- tweaks ---------- */}
      <TweaksPanel title="Tweaks">
        <TweakSection title="Palette">
          <TweakRadio
            label="Theme"
            value={t.palette}
            onChange={v => setTweak("palette", v)}
            options={[
              { value: "sage",  label: "sage" },
              { value: "straw", label: "straw" },
              { value: "cool",  label: "cool" },
            ]}
          />
        </TweakSection>
        <TweakSection title="Grid">
          <TweakRadio
            label="Order of remaining weeks"
            value={t.ordering}
            onChange={v => setTweak("ordering", v)}
            options={[
              { value: "sequential",   label: "sequential" },
              { value: "interleaved",  label: "interleaved" },
            ]}
          />
          <TweakSlider
            label="Lived-week intensity"
            value={t.livedIntensity}
            onChange={v => setTweak("livedIntensity", v)}
            min={0.3} max={1} step={0.05}
          />
          <TweakToggle
            label="Show grid annotations"
            value={t.showAnnotations}
            onChange={v => setTweak("showAnnotations", v)}
          />
        </TweakSection>
      </TweaksPanel>
    </main>
  );
}

// Map color tone to readable label
function labelFor(key, enjoyWork) {
  switch (key) {
    case "lived":   return "already lived";
    case "neutral": return "sleep, eating, commute";
    case "work":    return "work — enjoyed";
    case "workBad": return "work — endured";
    case "phone":   return "phone time";
    case "free":    return "free";
    default:        return key;
  }
}

function Stat({ n, label, sub, tone, emphasis }) {
  return (
    <div className={`stat ${emphasis ? "stat-emph" : ""}`}>
      <div className={`stat-swatch sw-${tone}`}/>
      <div className="stat-body">
        <div className="stat-n">{fmtInt(n)}</div>
        <div className="stat-l">{label}</div>
        {sub && <div className="stat-sub">{sub}</div>}
      </div>
    </div>
  );
}

function LegendItem({ tone, label, n }) {
  return (
    <div className="legend-item">
      <span className={`legend-sw sw-${tone}`}/>
      <span className="legend-l">{label}</span>
      <span className="legend-n">{fmtInt(n)}</span>
    </div>
  );
}

// Optional annotations alongside the grid (right margin labels)
function GridAnnotations({ cell, stats, enjoyWork, ordering }) {
  if (ordering !== "sequential") return null;
  const gap = Math.max(1, Math.floor(cell / 6));
  const rowH = cell + gap;
  const rowOf = (n) => n / 52;
  const r0 = 0;
  const r1 = rowOf(stats.livedWeeks);
  const r2 = rowOf(stats.livedWeeks + stats.sleepWeeks + stats.eatingWeeks + stats.commuteWeeks);
  const r3 = rowOf(stats.livedWeeks + stats.sleepWeeks + stats.eatingWeeks + stats.commuteWeeks + stats.workWeeks);
  const r4 = rowOf(stats.livedWeeks + stats.sleepWeeks + stats.eatingWeeks + stats.commuteWeeks + stats.workWeeks + stats.phoneWeeks);
  const r5 = 78;

  const bands = [
    { from: r0, to: r1, label: "lived" },
    { from: r1, to: r2, label: "the brute facts" },
    { from: r2, to: r3, label: enjoyWork ? "work — enjoyed" : "work — endured" },
    { from: r3, to: r4, label: "phone" },
    { from: r4, to: r5, label: "free" },
  ].filter(b => b.to - b.from > 0.5);

  return (
    <div className="annot" style={{ "--row-h": `${rowH}px` }}>
      {bands.map((b, i) => {
        const top = b.from * rowH;
        const height = (b.to - b.from) * rowH;
        return (
          <div key={i} className="annot-band" style={{ top, height }}>
            <span className="annot-tick"/>
            <span className="annot-label">{b.label}</span>
          </div>
        );
      })}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
