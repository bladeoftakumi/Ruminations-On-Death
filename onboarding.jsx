// ---------- onboarding wizard ----------
const { useState: useStateOnb, useRef: useRefOnb, useEffect: useEffectOnb } = React;

function Onboarding({ initial, onSubmit }) {
  const [state, setState] = useStateOnb(initial);
  const [step, setStep] = useStateOnb(0);
  const [direction, setDirection] = useStateOnb(1); // for animation

  const u = (patch) => setState((prev) => ({ ...prev, ...patch }));

  // Build dynamic steps based on answers
  const steps = [];
  steps.push({ id: "welcome" });
  steps.push({ id: "name" });
  steps.push({ id: "age" });
  steps.push({ id: "works" });
  if (state.works) {
    steps.push({ id: "goal" });
    steps.push({ id: "workHours" });
  }
  steps.push({ id: "screen" });
  steps.push({ id: "submit" });

  const idx = Math.min(step, steps.length - 1);
  const current = steps[idx];
  const total = steps.length;

  const next = () => {
    setDirection(1);
    if (idx >= total - 1) {
      onSubmit(state);
    } else {
      setStep(idx + 1);
    }
  };
  const back = () => {
    setDirection(-1);
    setStep(Math.max(0, idx - 1));
  };

  // Validation for current step
  const canAdvance = (() => {
    if (current.id === "name") return state.name.trim().length > 0;
    if (current.id === "age") return state.age >= 0 && state.age < LIFE_EXPECTANCY;
    if (current.id === "workHours") return state.workHours >= 0 && state.workHours <= 100;
    if (current.id === "screen") return state.screenHours >= 0 && state.screenHours <= 16;
    return true;
  })();

  return (
    <div className="onb">
      <div className="onb-frame">
        <header className="onb-header">
          <div className="onb-mark">Ruminations on Death</div>
          <div className="onb-progress">
            <span className="onb-step-n">0{idx + 1}</span>
            <span className="onb-step-sep">/</span>
            <span className="onb-step-t">0{total}</span>
          </div>
        </header>

        <div className="onb-stage" key={current.id} data-dir={direction}>
          <OnbStep
            current={current}
            state={state}
            update={u}
            next={next}
            canAdvance={canAdvance} />
          
        </div>

        <footer className="onb-footer">
          {idx > 0 &&
          <button className="onb-back" onClick={back}>← back</button>
          }
          <div className="onb-spacer" />
          {current.id !== "welcome" && current.id !== "works" && current.id !== "goal" && current.id !== "submit" &&
          <button
            className="onb-next"
            onClick={next}
            disabled={!canAdvance}>
            
              {idx === total - 1 ? "Show me my life →" : "next →"}
            </button>
          }
        </footer>
      </div>
    </div>);

}

function OnbStep({ current, state, update, next, canAdvance }) {
  // The actual content for each step
  switch (current.id) {
    case "welcome":
      return (
        <div className="onb-content">
          <p className="onb-eyebrow">Before we begin</p>
          <h1 className="onb-title">Four small questions.</h1>
          <p className="onb-body">
            They take less than a minute. Be honest — the only person reading
            your answers is&nbsp;you.
          </p>
          <p className="onb-note">
            <span className="onb-note-star">*</span> No data is saved — nothing
            ever leaves your&nbsp;browser.
          </p>
          <button className="onb-cta" onClick={next}>Begin →</button>
        </div>);


    case "name":
      return (
        <div className="onb-content">
          <p className="onb-eyebrow">First</p>
          <h1 className="onb-title">What should I call you?</h1>
          <p className="onb-body">A name, a nickname, an initial. Anything you'll recognise.</p>
          <OnbTextInput
            value={state.name}
            onChange={(v) => update({ name: v })}
            onEnter={() => canAdvance && next()}
            placeholder="your name"
            autoFocus />
          
        </div>);


    case "age":
      return (
        <div className="onb-content">
          <p className="onb-eyebrow">{state.name ? `Hello, ${state.name}.` : "Next"}</p>
          <h1 className="onb-title">How old are you?</h1>
          <p className="onb-body">An honest number. The arithmetic is unkind, but it works on truth&nbsp;only.</p>
          <OnbNumberInput
            value={state.age}
            onChange={(v) => update({ age: v })}
            onEnter={() => canAdvance && next()}
            min={0} max={LIFE_EXPECTANCY - 1}
            suffix="years" />
          
        </div>);


    case "works":
      return (
        <div className="onb-content">
          <p className="onb-eyebrow">About your work</p>
          <h1 className="onb-title">Do you currently work?</h1>
          <p className="onb-body">
            Paid employment, study, a craft. Anything you spend
            structured&nbsp;hours&nbsp;on.
          </p>
          <OnbChoice
            value={state.works}
            options={[
            { value: true, label: "Yes, I work" },
            { value: false, label: "No, not at the moment" }]
            }
            onChange={(v) => {update({ works: v });setTimeout(next, 150);}} />
          
        </div>);


    case "goal":
      return (
        <div className="onb-content">
          <p className="onb-eyebrow">A harder question</p>
          <h1 className="onb-title">Is your work tied to your goal in life?</h1>
          <p className="onb-body">
            Not whether it pays the rent — whether it builds, in some real way,
            the life you say you&nbsp;want.
          </p>
          <OnbChoice
            value={state.workEnjoyed}
            options={[
            { value: true, label: "Yes — it's part of the plan" },
            { value: false, label: "Not really" }]
            }
            onChange={(v) => {update({ workEnjoyed: v });setTimeout(next, 150);}} />
          
        </div>);


    case "workHours":
      return (
        <div className="onb-content">
          <p className="onb-eyebrow">Roughly</p>
          <h1 className="onb-title">How many hours a week does it take?</h1>
          <p className="onb-body">Add the meetings, the commute-thinking, the half-hour of catching&nbsp;up.</p>
          <OnbNumberInput
            value={state.workHours}
            onChange={(v) => update({ workHours: v })}
            onEnter={() => canAdvance && next()}
            min={0} max={100}
            suffix="hours / week" />
          
        </div>);


    case "screen":
      return (
        <div className="onb-content">
          <p className="onb-eyebrow">And finally</p>
          <h1 className="onb-title">How many hours a day on distractions?</h1>
          <p className="onb-body">
            Time on a phone, scrolling, gaming, other small addictions —
            anything that pulls you away from what you say&nbsp;matters.
          </p>
          <OnbNumberInput
            value={state.screenHours}
            onChange={(v) => update({ screenHours: v })}
            onEnter={() => canAdvance && next()}
            min={0} max={16} step={0.5}
            suffix="hours / day" />
          
        </div>);


    case "submit":
      return (
        <div className="onb-content">
          <p className="onb-eyebrow">{state.name ? `${state.name},` : "Ready"}</p>
          <h1 className="onb-title">Ready to see what's left?</h1>
          <p className="onb-body">
            What follows is a small piece of arithmetic, drawn at scale. You can
            change any of your answers from inside the&nbsp;essay.
          </p>
          <button className="onb-cta onb-cta-warm" onClick={next}>
            Show me my life →
          </button>
        </div>);


    default:
      return null;
  }
}

// ---------- inputs ----------
function OnbTextInput({ value, onChange, onEnter, placeholder, autoFocus }) {
  const ref = useRefOnb(null);
  useEffectOnb(() => {if (autoFocus && ref.current) ref.current.focus();}, [autoFocus]);
  return (
    <input
      ref={ref}
      className="onb-input onb-input-text"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {if (e.key === "Enter") onEnter?.();}} />);


}

function OnbNumberInput({ value, onChange, onEnter, min, max, step = 1, suffix }) {
  const ref = useRefOnb(null);
  const [v, setV] = useStateOnb(String(value));
  useEffectOnb(() => {setV(String(value));}, [value]);
  useEffectOnb(() => {if (ref.current) {ref.current.focus();ref.current.select?.();}}, []);
  const commit = () => {
    let n = parseFloat(v);
    if (Number.isNaN(n)) n = value;
    n = Math.max(min, Math.min(max, n));
    n = Math.round(n / step) * step;
    n = Math.round(n * 1000) / 1000;
    setV(String(n));
    onChange(n);
  };
  return (
    <div className="onb-numwrap">
      <input
        ref={ref}
        className="onb-input onb-input-num"
        inputMode="decimal"
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {commit();onEnter?.();}
        }} />
      
      {suffix && <span className="onb-suffix">{suffix}</span>}
    </div>);

}

function OnbChoice({ value, options, onChange }) {
  return (
    <div className="onb-choice">
      {options.map((o, i) =>
      <button
        key={i}
        className={`onb-choice-btn ${value === o.value ? "is-on" : ""}`}
        onClick={() => onChange(o.value)}>
        
          {o.label}
        </button>
      )}
    </div>);

}

// Export
window.Onboarding = Onboarding;