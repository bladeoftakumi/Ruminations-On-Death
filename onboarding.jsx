// ---------- shared constants ----------
window.WEEKS_PER_YEAR = 50;
window.LIFE_EXPECTANCY = 80;
window.TOTAL_WEEKS = 50 * 80; // 4000 — "four thousand weeks"

// ---------- palettes ----------
window.PALETTES = {
  vivid: {
    paper:   "#F4F0E6",
    ink:     "#1B1B1A",
    mute:    "#5A574F",
    rule:    "#1B1B1A",

    lived:   "#181410",
    facts:   "#4A4136",
    workPos: "#4D8C68",
    workNeg: "#C23A22",
    phone:   "#FF3D1A",
    free:    "#FBF7DC",
    accent:  "#E8B73B",
  },
  dusk: {
    paper:   "#16140F",
    ink:     "#E8E0CE",
    mute:    "#8E8775",
    rule:    "#4A4436",

    lived:   "#221E17",
    facts:   "#3C3527",
    workPos: "#5FA37C",
    workNeg: "#D6452A",
    phone:   "#F2542D",
    free:    "#FBF7DC",
    accent:  "#E0A23D",
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

// ---------- compute breakdown of remaining time ----------
window.computeStats = function ({ age, works, workEnjoyed, workHours, screenHours }) {
  const livedWeeks = Math.max(0, Math.min(TOTAL_WEEKS, Math.round(age * WEEKS_PER_YEAR)));
  const remainingWeeks = TOTAL_WEEKS - livedWeeks;
  const hoursPerWeek = 168;

  const sleepH   = 8   * 7;
  const eatingH  = 1.5 * 7;
  const commuteH = works ? 5 : 0;
  const phoneH   = screenHours * 7;
  const workH    = works ? workHours : 0;
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
    pctPhone: (phoneWeeks / TOTAL_WEEKS) * 100,
  };
};

// ---------- category meta ----------
window.CATEGORIES = {
  lived: {
    key: "lived",
    label: "Already lived",
    desc: "Weeks behind you. These are over.",
    cssVar: "--c-lived",
  },
  facts: {
    key: "facts",
    label: "The body's tax",
    desc: "Sleep, eating, the commute. The price of being alive.",
    cssVar: "--c-facts",
  },
  workPos: {
    key: "workPos",
    label: "Work — tied to your goals",
    desc: "Time at work that builds the life you want.",
    cssVar: "--c-workPos",
  },
  workNeg: {
    key: "workNeg",
    label: "Work — untied",
    desc: "Time at work that does not move you toward what you say matters.",
    cssVar: "--c-workNeg",
  },
  phone: {
    key: "phone",
    label: "Distractions",
    desc: "Hours spent on a phone, gaming, or other addictions — pulled away from your goals.",
    cssVar: "--c-phone",
  },
  free: {
    key: "free",
    label: "Free",
    desc: "What is left. What is yours.",
    cssVar: "--c-free",
  },
};

// ---------- formatting helpers ----------
window.fmtInt = n => n.toLocaleString("en-US");
window.fmtPct = n => (n < 1 ? n.toFixed(2) : n.toFixed(1)) + "%";
