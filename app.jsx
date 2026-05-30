// ---------- main app ----------
const { useState, useMemo, useEffect, useRef } = React;

// Inline editable number for the madlibs
function NumField({ value, onChange, min, max, step = 1 }) {
  const [v, setV] = useState(String(value));
  useEffect(() => {setV(String(value));}, [value]);
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
      onChange={(e) => setV(e.target.value)}
      onBlur={(e) => commit(e.target.value)}
      onKeyDown={(e) => {if (e.key === "Enter") e.target.blur();}} />);


}

function ToggleWord({ value, options, onChange }) {
  const cycle = () => onChange((value + 1) % options.length);
  return (
    <button className="togglew" onClick={cycle}>
      <span>{options[value]}</span>
    </button>);

}

function App() {
  const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
    "palette": "vivid"
  } /*EDITMODE-END*/;
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  // Phase: "onboarding" or "essay"
  const [phase, setPhase] = useState("onboarding");

  // User answers
  const [user, setUser] = useState({
    name: "",
    age: 30,
    hasGoal: true,
    works: true,
    workEnjoyed: false,
    workHours: 45,
    screenHours: 4
  });

  const stats = useMemo(() => computeStats(user), [user]);

  const palette = PALETTES[t.palette] || PALETTES.vivid;
  useEffect(() => {
    const root = document.documentElement;
    Object.entries(palette).forEach(([k, v]) => {
      root.style.setProperty(`--c-${k}`, v);
    });
    document.body.classList.toggle("is-dark", t.palette === "dusk");
  }, [palette, t.palette]);

  if (phase === "onboarding") {
    return (
      <Onboarding
        initial={user}
        onSubmit={(u) => {setUser(u);setPhase("essay");window.scrollTo(0, 0);}} />);


  }

  return <Essay user={user} setUser={setUser} stats={stats} t={t} setTweak={setTweak} onReset={() => setPhase("onboarding")} />;
}

// ---------- §III: shared figure sequence (reel + PDF use the same data) ----------
function reckoningSlides(user, stats) {
  const name = user.name ? `, ${user.name}` : "";
  return [
  {
    key: "lived",
    value: fmtPct(stats.pctLived),
    cap: "of your life is already lived. These weeks are over."
  },
  {
    key: "left-pct",
    value: fmtPct(stats.pctRemaining),
    cap: "is the time you have left."
  },
  {
    key: "phone",
    tone: "accent",
    value: fmtPct(stats.pctPhone),
    cap: "of your whole life is lost to scrolling — and it never comes back."
  },
  {
    key: "weeks",
    size: "big",
    tone: "accent",
    value: fmtInt(stats.remainingWeeks),
    cap: "weeks remain. But they are not all yours to spend."
  },
  {
    key: "facts",
    value: `– ${fmtInt(stats.factsWeeks)}`,
    cap: "weeks go to the body — sleep, eating, the commute. The price of being alive."
  },
  {
    key: "work",
    value: `– ${fmtInt(stats.workWeeks)}`,
    cap: user.works ?
    "weeks are owed to work, whether or not it serves you." :
    "weeks to work — none, for now."
  },
  {
    key: "scroll",
    tone: "accent",
    value: `– ${fmtInt(stats.phoneWeeks)}`,
    cap: "weeks dissolve into the screen. This is the one you can take back."
  },
  {
    key: "free",
    size: "big",
    tone: "free",
    value: fmtInt(stats.freeWeeks),
    cap: `weeks — ${fmtPct(stats.pctFree)} of a life — are genuinely yours${name}. That is what is left to spend.`
  },
  {
    key: "now",
    kind: "logo",
    cap: "What will you do now?"
  }];

}

// ---------- §III: one figure at a time, scroll/swipe/click through ----------
function PercentReel({ user, stats }) {
  const slides = useMemo(() => reckoningSlides(user, stats), [user, stats]);

  const [i, setI] = useState(0);
  const [dir, setDir] = useState(1);
  const count = slides.length;
  const clamp = (n) => Math.max(0, Math.min(count - 1, n));
  const go = (n) => {
    const next = clamp(n);
    setDir(next >= i ? 1 : -1);
    setI(next);
  };
  const prev = () => go(i - 1);
  const next = () => go(i + 1);

  // keyboard arrows
  const wrapRef = useRef(null);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onKey = (e) => {
      if (e.key === "ArrowRight") next();else
      if (e.key === "ArrowLeft") prev();
    };
    el.addEventListener("keydown", onKey);
    return () => el.removeEventListener("keydown", onKey);
  });

  // touch / swipe
  const touch = useRef(null);
  const onTouchStart = (e) => {touch.current = e.touches[0].clientX;};
  const onTouchEnd = (e) => {
    if (touch.current == null) return;
    const dx = e.changedTouches[0].clientX - touch.current;
    if (dx < -40) next();else
    if (dx > 40) prev();
    touch.current = null;
  };

  const s = slides[i];

  return (
    <div
      className="reel"
      ref={wrapRef}
      tabIndex={0}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}>

      <button
        className="reel-arrow reel-arrow-prev"
        onClick={prev}
        disabled={i === 0}
        aria-label="Previous">
        ←
      </button>

      <div className="reel-stage">
        <div
          key={s.key}
          className={`reel-slide reel-slide-${dir > 0 ? "next" : "prev"}` + (
          s.tone ? ` reel-slide-${s.tone}` : "") + (
          s.kind === "logo" ? " reel-slide-final" : "")}>
          {s.kind === "logo" ?
          <img className="reel-logo" src="assets/hourglass-logo.png" alt="" /> :

          <div className={"reel-num" + (s.size === "big" ? " reel-num-big" : "")}>
            {s.value}
          </div>
          }
          <div className="reel-cap">{s.cap}</div>
        </div>
      </div>

      <button
        className="reel-arrow reel-arrow-next"
        onClick={next}
        disabled={i === count - 1}
        aria-label="Next">
        →
      </button>

      <div className="reel-dots">
        {slides.map((sl, idx) =>
        <button
          key={sl.key}
          className={"reel-dot" + (idx === i ? " is-on" : "")}
          onClick={() => go(idx)}
          aria-label={`Figure ${idx + 1}`} />
        )}
      </div>
    </div>);

}

// ---------- print-only document: one figure per page, for Save-as-PDF ----------
function PrintDoc({ user, stats }) {
  const slides = reckoningSlides(user, stats);
  return (
    <div className="printdoc" aria-hidden="true">
      {/* title page */}
      <section className="pp-page pp-title">
        <img className="pp-logo" src="assets/hourglass-logo.png" alt="" />
        <div className="pp-kicker">An essay in four thousand squares</div>
        <h1 className="pp-h1">Ruminations<br />on Death</h1>
        <div className="pp-meta">
          {user.name ? `For ${user.name} · ` : ""}
          {user.age} years old · {fmtInt(stats.remainingWeeks)} weeks remain
        </div>
      </section>

      {/* the grid, static, full view + legend */}
      <section className="pp-page pp-grid">
        <div className="pp-grid-head">§ II. Your life, laid out — four thousand weeks.</div>
        <div className="pp-grid-holder">
          <ConcentricGrid user={user} stats={stats} zoom={0} />
        </div>
      </section>

      {/* one figure per page */}
      {slides.map((s) =>
        <section
          key={s.key}
          className={"pp-page" + (s.tone ? ` pp-${s.tone}` : "") + (s.kind === "logo" ? " pp-final" : "")}>
          {s.kind === "logo" ?
          <img className="pp-final-logo" src="assets/hourglass-logo.png" alt="" /> :

          <div className={"pp-num" + (s.size === "big" ? " pp-num-big" : "")}>{s.value}</div>
          }
          <div className="pp-cap">{s.cap}</div>
        </section>
      )}
    </div>);

}

function savePdf() {
  document.body.classList.add("printing");
  window.print();
  setTimeout(() => document.body.classList.remove("printing"), 400);
}

// ---------- the essay (post-onboarding) ----------
function Essay({ user, setUser, stats, t, setTweak, onReset }) {
  const u = (patch) => setUser((prev) => ({ ...prev, ...patch }));
  const [zoom, setZoom] = useState(0);

  // Enjoy-work toggle for the madlibs
  const enjoyIdx = user.workEnjoyed ? 0 : 1;
  const setEnjoyIdx = (i) => u({ workEnjoyed: i === 0 });

  return (
    <React.Fragment>
    <main className="page" data-screen-label="Ruminations on Death — essay">
      {/* ---------- masthead ---------- */}
      <header className="masthead">
        <div className="eyebrow">
          {user.name && <span>For {user.name}</span>}
          {user.name && <span className="dot">·</span>}
          <span>An essay in four thousand squares</span>
        </div>
        <h1 className="title">
          Ruminations<br />on&nbsp;Death
        </h1>
        <p className="dek">
          The arithmetic is unkind. A long, lucky life — eighty years — is
          four thousand weeks. Most of them are already promised to sleep, to
          traffic, to the glow of a small bright rectangle held a few inches
          from the face.
        </p>
        <p className="dek">
          The grid below is your life, drawn at scale. Each rounded square is one
          week. Hover any week to learn what it&nbsp;costs.
        </p>
      </header>

      <hr className="rule" />

      {/* ---------- madlibs (editable inputs) ---------- */}
      <section className="prompt">
        <div className="caption">§&nbsp;I.&nbsp;&nbsp;Your answers.</div>
        <p className="madlibs">
          I am{" "}
          <NumField value={user.age} onChange={(v) => u({ age: v })} min={0} max={LIFE_EXPECTANCY - 1} />
          {" "}years old. My work is{" "}
          <ToggleWord
            value={enjoyIdx}
            options={["tied to my goals", "not tied to my goals"]}
            onChange={setEnjoyIdx} />
          
          , and takes about{" "}
          <NumField value={user.workHours} onChange={(v) => u({ workHours: v })} min={0} max={100} />
          {" "}hours a week. Outside of work I lose roughly{" "}
          <NumField value={user.screenHours} onChange={(v) => u({ screenHours: v })} min={0} max={16} step={0.5} />
          {" "}hours a day to&nbsp;scrolling.
        </p>
        <button className="reset-link" onClick={onReset}>Start the questions over</button>
      </section>

      <hr className="rule" />

      {/* ---------- the grid ---------- */}
      <section className="gridsec">
        <div className="gridsec-head">
          <div className="gridsec-head-row">
            <div>
              <div className="caption">§&nbsp;II.&nbsp;&nbsp;Your life, laid out.</div>
              <p className="gridsec-note">
                The outer cells are weeks already lived. Each layer inward represents
                one category of remaining time. The pale cells at the centre are
                what's genuinely&nbsp;yours.
              </p>
            </div>
            <ZoomControl zoom={zoom} setZoom={setZoom} />
          </div>
        </div>

        <ConcentricGrid user={user} stats={stats} zoom={zoom} />
      </section>

      <hr className="rule" />

      {/* ---------- counter / closer ---------- */}
      <section className="counter">
        <div className="caption">§&nbsp;III.&nbsp;&nbsp;The reckoning.</div>
        <PercentReel user={user} stats={stats} />
        <p className="closer small reel-coda">
          The point is not despair. The point is to look at it honestly, once, and
          then to decide what the remaining squares are&nbsp;for.
        </p>
        <div className="reel-save">
          <button className="save-pdf" onClick={savePdf}>↓ Save as PDF</button>
          <span className="reel-save-note">One figure per page — nothing leaves your browser.</span>
        </div>
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
            onChange={(v) => setTweak("palette", v)}
            options={[
            { value: "vivid", label: "vivid" },
            { value: "meadow", label: "meadow" },
            { value: "dusk", label: "dusk" }]
            } />
          
        </TweakSection>
      </TweaksPanel>
    </main>
    <PrintDoc user={user} stats={stats} />
    </React.Fragment>);

}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);