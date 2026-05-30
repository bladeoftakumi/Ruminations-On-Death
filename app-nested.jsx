const { useState, useMemo, useEffect, useRef } = React;

// ---------- constants ----------
const WEEKS_PER_YEAR = 52;
const LIFE_EXPECTANCY = 78;
const TOTAL_WEEKS = WEEKS_PER_YEAR * LIFE_EXPECTANCY; // 4056

// ---------- palettes ----------
const PALETTES = {
  vivid: {
    paper:   "#F4F0E6",
    ink:     "#1B1B1A",
    mute:    "#5A574F",
    rule:    "#1B1B1A",

    lived:   "#181410",   // warm near-black, outermost
    facts:   "#4A4136",   // warm brown, slightly lifted from lived
    workPos: "#4D8C68",   // vivid sage — work enjoyed
    workNeg: "#C23A22",   // deep red — work endured
    phone:   "#FF3D1A",   // vivid alarm red
    free:    "#FBF7DC",   // warm pale cream
    accent:  "#E8B73B",   // vivid gold for borders + emph
  },
  dusk: {
    paper:   "#13110D",
    ink:     "#EFEAD8",
    mute:    "#8E8775",
    rule:    "#EFEAD8",

    lived:   "#0A0807",
    facts:   "#3A3328",
    workPos: "#5FA37C",
    workNeg: "#D63F22",
    phone:   "#FF4520",
    free:    "#FBF7DC",
    accent:  "#F0C24A",
  },
  meadow: {
    paper:   "#F4F0E6",
    ink:     "#1B1B1A",
    mute:    "#5A574F",
    rule:    "#1B1B1A",

    lived:   "#1A1F1A",
    facts:   "#4D5C4E",
    workPos: "#658C6E",
    workNeg: "#D6452A",
    phone:   "#E63A1B",
    free:    "#EFF9E8",
    accent:  "#DFCD80",
  },
};

// ---------- compute ----------
function compute({ age, enjoyWork, workHours, screenHours }) {
  const livedWeeks = Math.max(0, Math.min(TOTAL_WEEKS, Math.round(age * WEEKS_PER_YEAR)));
  const remainingWeeks = TOTAL_WEEKS - livedWeeks;
  const hoursPerWeek = 168;

  const sleepH   = 8   * 7;
  const eatingH  = 1.5 * 7;
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
  const factsWeeks   = sleepWeeks + eatingWeeks + commuteWeeks;
  const allocated    = factsWeeks + workWeeks + phoneWeeks;
  const freeWeeks    = Math.max(0, remainingWeeks - allocated);

  return {
    livedWeeks, remainingWeeks,
    factsWeeks, sleepWeeks, eatingWeeks, commuteWeeks,
    workWeeks, phoneWeeks, freeWeeks,
    pctFree: (freeWeeks / TOTAL_WEEKS) * 100,
    pctLived: (livedWeeks / TOTAL_WEEKS) * 100,
    pctRemaining: (remainingWeeks / TOTAL_WEEKS) * 100,
  };
}

// ---------- ring data ----------
function buildRings(stats, enjoyWork) {
  // Outer → inner
  return [
    {
      key: "lived",
      weeks: stats.livedWeeks,
      colorVar: "--c-lived",
      label: "Already lived",
      desc: "The weeks behind you. These are over.",
    },
    {
      key: "facts",
      weeks: stats.factsWeeks,
      colorVar: "--c-facts",
      label: "The body's tax",
      desc: "Sleep, eating, the commute. The price of being alive.",
    },
    {
      key: "work",
      weeks: stats.workWeeks,
      colorVar: enjoyWork ? "--c-workPos" : "--c-workNeg",
      label: enjoyWork ? "Work — enjoyed" : "Work — endured",
      desc: enjoyWork
        ? "Time at work you say you enjoy. A portion of life you'd choose."
        : "Time at work you do not enjoy. Borrowed against the only thing you have.",
    },
    {
      key: "phone",
      weeks: stats.phoneWeeks,
      colorVar: "--c-phone",
      label: "The small bright rectangle",
      desc: "Phone, screen, scroll. Hours of glow, converted to weeks of life.",
    },
    {
      key: "free",
      weeks: stats.freeWeeks,
      colorVar: "--c-free",
      label: "Free",
      desc: "What is left. What is yours.",
    },
  ];
}

// ---------- helpers ----------
const fmtInt = n => n.toLocaleString("en-US");
const fmtPct = n => (n < 1 ? n.toFixed(2) : n.toFixed(1)) + "%";

// Editable number inline in the madlibs
function NumField({ value, onChange, min, max, step = 1 }) {
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
      style={{ width: `${Math.max(2, String(value).length + 1)}ch` }}
      value={v}
      inputMode="decimal"
      onChange={e => setV(e.target.value)}
      onBlur={e => commit(e.target.value)}
      onKeyDown={e => { if (e.key === "Enter") e.target.blur(); }}
    />
  );
}

function ToggleWord({ value, options, onChange }) {
  const cycle = () => onChange((value + 1) % options.length);
  return (
    <button className="togglew" onClick={cycle}>
      <span>{options[value]}</span>
    </button>
  );
}

// ---------- the nested visualization ----------
function NestedLife({ stats, enjoyWork, zoom, hover, setHover }) {
  const VB = 1000;          // viewBox units
  const rings = useMemo(() => buildRings(stats, enjoyWork), [stats, enjoyWork]);

  // cumulative inner-side fraction at each ring's *outer* edge
  // outerFrac[i] = sum of weeks for ring i and all inner rings, / total
  const outerFrac = useMemo(() => {
    const arr = new Array(rings.length);
    let cum = 0;
    for (let i = rings.length - 1; i >= 0; i--) {
      cum += rings[i].weeks / TOTAL_WEEKS;
      arr[i] = cum;
    }
    return arr;
  }, [rings]);

  // side at each ring's outer edge
  const sides = outerFrac.map(f => VB * Math.sqrt(Math.max(0, f)));

  // Scale per zoom step:
  //   0 — full view, lived ring fills viewport
  //   1 — facts ring fills viewport (lived clipped)
  //   2 — phone ring fills viewport (lived, facts, work clipped)
  const zoomTarget = [0, 1, 3][zoom] ?? 0;
  const scale = sides[zoomTarget] > 0 ? VB / sides[zoomTarget] : 1;

  // Hover-aware classNames for the placard
  const isOn = key => hover?.key === key;

  const onEnter = (ring) => setHover(ring);
  const onLeave = () => setHover(null);

  // Special hover for the "time remaining" boundary
  const remainingMeta = {
    key: "remaining",
    weeks: stats.remainingWeeks,
    label: "What remains",
    desc: "Every week still ahead of you, before the rest is taken.",
    isBoundary: true,
  };

  return (
    <div className="nest-stage">
      <div className="nest-viewport" data-zoom={zoom}>
        <svg viewBox={`0 0 ${VB} ${VB}`} className="nest-svg" style={{ transform: `scale(${scale})` }}>
          {/* draw outer → inner so later (inner) rects sit on top */}
          {rings.map((r, i) => {
            const side = sides[i];
            const x = (VB - side) / 2;
            return (
              <rect
                key={r.key}
                className={`nest-ring nest-${r.key} ${isOn(r.key) ? "is-on" : ""}`}
                x={x} y={x} width={side} height={side}
                style={{ fill: `var(${r.colorVar})` }}
                onMouseEnter={() => onEnter(r)}
                onMouseLeave={onLeave}
                onClick={() => onEnter(r)}
              />
            );
          })}

          {/* boundary stroke between lived and the rest — "time remaining" */}
          {sides[1] > 0 && (
            <rect
              className={`nest-boundary ${isOn("remaining") ? "is-on" : ""}`}
              x={(VB - sides[1]) / 2}
              y={(VB - sides[1]) / 2}
              width={sides[1]}
              height={sides[1]}
              fill="none"
              stroke="var(--c-accent)"
              strokeWidth="3"
              vectorEffect="non-scaling-stroke"
              pointerEvents="stroke"
              onMouseEnter={() => onEnter(remainingMeta)}
              onMouseLeave={onLeave}
            />
          )}

          {/* accent border framing the free center */}
          {sides[4] > 0 && (
            <rect
              x={(VB - sides[4]) / 2}
              y={(VB - sides[4]) / 2}
              width={sides[4]}
              height={sides[4]}
              fill="none"
              stroke="var(--c-accent)"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
              pointerEvents="none"
            />
          )}
        </svg>

        {/* corner tags */}
        <div className="nest-tag nest-tag-tl">your life · {fmtInt(TOTAL_WEEKS)} weeks total</div>
        <div className="nest-tag nest-tag-br">
          0{zoom + 1} / 03
        </div>
      </div>

      <Placard hover={hover} stats={stats} enjoyWork={enjoyWork} />
    </div>
  );
}

// hover info beneath the viz
function Placard({ hover, stats, enjoyWork }) {
  if (!hover) {
    return (
      <div className="placard placard-empty">
        <div className="placard-eyebrow">Hover any ring</div>
        <div className="placard-body">
          Each layer of the square is a category of remaining life. Move your cursor
          over a colour to read what it&nbsp;costs.
        </div>
      </div>
    );
  }
  const pct = (hover.weeks / TOTAL_WEEKS) * 100;
  return (
    <div className={`placard placard-${hover.key}`}>
      <div className="placard-eyebrow">
        <span className={`placard-sw sw-${hover.key}`}/>
        <span>{hover.label}</span>
      </div>
      <div className="placard-figure">
        <div className="placard-n">{fmtInt(hover.weeks)}</div>
        <div className="placard-n-label">weeks · <span className="placard-pct">{fmtPct(pct)} of a life</span></div>
      </div>
      <div className="placard-body">{hover.desc}</div>
    </div>
  );
}

// ---------- app ----------
function App() {
  const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
    "palette": "vivid",
    "viewMode": "nested",
    "ordering": "sequential"
  }/*EDITMODE-END*/;
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  const [age, setAge] = useState(34);
  const [enjoyWorkIdx, setEnjoyWorkIdx] = useState(1);
  const [workHours, setWorkHours] = useState(45);
  const [screenHours, setScreenHours] = useState(4);
  const [zoom, setZoom] = useState(0);
  const [hover, setHover] = useState(null);

  const enjoyWork = enjoyWorkIdx === 0;
  const stats = useMemo(
    () => compute({ age, enjoyWork, workHours, screenHours }),
    [age, enjoyWork, workHours, screenHours]
  );

  const palette = PALETTES[t.palette] || PALETTES.vivid;

  useEffect(() => {
    const root = document.documentElement;
    Object.entries(palette).forEach(([k, v]) => {
      root.style.setProperty(`--c-${k}`, v);
    });
    document.body.classList.toggle("is-dark", t.palette === "dusk");
  }, [palette, t.palette]);

  return (
    <main className="page" data-screen-label="Ruminations on Death">
      {/* ---------- masthead ---------- */}
      <header className="masthead">
        <div className="eyebrow">
          <span>An essay in nested squares</span>
          <span className="dot">·</span>
          <span>No. 01</span>
        </div>
        <h1 className="title">
          Ruminations<br/>on&nbsp;Death
        </h1>
        <p className="dek">
          The arithmetic is unkind. A long, lucky life — seventy-eight years — is
          four thousand and fifty-six weeks. Most of them are already promised to
          sleep, to traffic, to email, to the glow of a small bright rectangle held
          a few inches from the face.
        </p>
        <p className="dek">
          The square below is your life, drawn at scale. Each band is a category of
          time. The bright cream at the centre is what is genuinely&nbsp;yours.
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

      {/* ---------- the visualization ---------- */}
      <section className="nestsec">
        <div className="nest-head">
          <div className="caption">§&nbsp;II.&nbsp;&nbsp;Your life, laid out.</div>
          <ZoomControl zoom={zoom} setZoom={setZoom}/>
        </div>

        <NestedLife
          stats={stats}
          enjoyWork={enjoyWork}
          zoom={zoom}
          hover={hover}
          setHover={setHover}
        />
      </section>

      <hr className="rule"/>

      {/* ---------- counter / closer ---------- */}
      <section className="counter">
        <div className="caption">§&nbsp;III.&nbsp;&nbsp;What is left.</div>
        <div className="counter-figure">
          <div className="big-number">{fmtInt(stats.freeWeeks)}</div>
          <div className="big-label">free weeks remain.</div>
        </div>
        <p className="closer">
          That is <span className="emph">{fmtPct(stats.pctFree)}</span> of a life&nbsp;—
          the part you have not yet sold to sleep, employer, or screen. Of the four
          thousand weeks you were ever going to get, you have already spent{" "}
          <span className="emph">{fmtPct(stats.pctLived)}</span>. What remains, after
          everything else takes its cut, is the small lit square at the centre of
          the&nbsp;diagram.
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
              { value: "vivid",  label: "vivid" },
              { value: "meadow", label: "meadow" },
              { value: "dusk",   label: "dusk" },
            ]}
          />
        </TweakSection>
      </TweaksPanel>
    </main>
  );
}

// Discrete 3-step zoom
function ZoomControl({ zoom, setZoom }) {
  const steps = [
    { i: 0, label: "01", title: "Full view" },
    { i: 1, label: "02", title: "What remains" },
    { i: 2, label: "03, the encroachment" },
  ];
  return (
    <div className="zoom3">
      <span className="zoom3-label">zoom in</span>
      <div className="zoom3-track">
        {[0, 1, 2].map(i => (
          <button
            key={i}
            className={`zoom3-step ${zoom === i ? "is-on" : ""}`}
            onClick={() => setZoom(i)}
            aria-label={`Zoom step ${i + 1}`}
          >
            <span className="zoom3-num">0{i + 1}</span>
            <span className="zoom3-name">
              {i === 0 && "Full view"}
              {i === 1 && "What remains"}
              {i === 2 && "Free vs. encroachment"}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
