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

// ---------- the essay (post-onboarding) ----------
function Essay({ user, setUser, stats, t, setTweak, onReset }) {
  const u = (patch) => setUser((prev) => ({ ...prev, ...patch }));
  const [zoom, setZoom] = useState(0);

  // Enjoy-work toggle for the madlibs
  const enjoyIdx = user.workEnjoyed ? 0 : 1;
  const setEnjoyIdx = (i) => u({ workEnjoyed: i === 0 });

  return (
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
        <div className="caption">§&nbsp;III.&nbsp;&nbsp;The percentages.</div>

        <div className="pct-grid">
          <div className="pct-item">
            <div className="pct-num">{fmtPct(stats.pctLived)}</div>
            <div className="pct-cap">
              of your life is already lived. These weeks are&nbsp;over.
            </div>
          </div>
          <div className="pct-item">
            <div className="pct-num">{fmtPct(stats.pctRemaining)}</div>
            <div className="pct-cap">
              is all that is left ahead of you{user.name ? `, ${user.name}` : ""}.
            </div>
          </div>
          <div className="pct-item pct-item-accent">
            <div className="pct-num">{fmtPct(stats.pctPhone)}</div>
            <div className="pct-cap">
              of your whole life comes back if you stop losing{" "}
              {fmtInt(stats.phoneWeeks)}&nbsp;weeks to&nbsp;scrolling.
            </div>
          </div>
        </div>

        <p className="closer">
          What is genuinely yours — after sleep, the body, work and the screen
          each take their cut — is just{" "}
          <span className="emph">{fmtPct(stats.pctFree)}</span>: the{" "}
          {fmtInt(stats.freeWeeks)} pale weeks at the centre of the&nbsp;grid.
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
            onChange={(v) => setTweak("palette", v)}
            options={[
            { value: "vivid", label: "vivid" },
            { value: "meadow", label: "meadow" },
            { value: "dusk", label: "dusk" }]
            } />
          
        </TweakSection>
      </TweaksPanel>
    </main>);

}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);