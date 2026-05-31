// ---------- concentric grid visualization ----------
const { useState: useStateG, useMemo: useMemoG, useEffect: useEffectG, useRef: useRefG } = React;

const GRID_W = 80; // columns (each column ≈ one year)
const GRID_H = 50; // rows    (each row ≈ one week within a year)
// total = 4000

// ---------- ring math (for zoom) ----------
function ringSize(k) {
  const w = GRID_W - 2 * k;
  const h = GRID_H - 2 * k;
  if (w <= 0 || h <= 0) return 0;
  if (w === 1) return h;
  if (h === 1) return w;
  return 2 * w + 2 * h - 4;
}
// Smallest ring index k such that cumulative cells in rings 0..k > count
function firstRingPastCount(count) {
  let cum = 0;
  for (let k = 0; k < 25; k++) {
    cum += ringSize(k);
    if (cum > count) return k;
  }
  return 24;
}
// scale needed so the inner rect (after stripping `count` outer cells) fits
// entirely in the viewport (contain — the full section of focus is visible)
function scaleForCount(count) {
  if (count <= 0) return 1;
  const k = firstRingPastCount(count);
  const innerW = Math.max(1, GRID_W - 2 * k);
  const innerH = Math.max(1, GRID_H - 2 * k);
  return Math.min(GRID_W / innerW, GRID_H / innerH);
}

// Build cell ordering: outer perimeter first, then spiralling inward.
// Returns an array of [x, y] positions in concentric order.
function buildConcentricOrder() {
  const order = [];
  const visited = new Set();
  const key = (x, y) => `${x},${y}`;
  const ringsDeep = Math.ceil(Math.min(GRID_W, GRID_H) / 2);

  for (let k = 0; k < ringsDeep; k++) {
    const x0 = k,y0 = k;
    const x1 = GRID_W - 1 - k,y1 = GRID_H - 1 - k;
    if (x0 > x1 || y0 > y1) break;

    // top edge (left → right)
    for (let x = x0; x <= x1; x++) add(x, y0);
    // right edge (top+1 → bottom)
    for (let y = y0 + 1; y <= y1; y++) add(x1, y);
    // bottom edge (right-1 → left)  — only if multiple rows in this ring
    if (y1 > y0) for (let x = x1 - 1; x >= x0; x--) add(x, y1);
    // left edge (bottom-1 → top+1)  — only if multiple cols and rows
    if (x1 > x0 && y1 > y0) for (let y = y1 - 1; y > y0; y--) add(x0, y);
  }
  function add(x, y) {
    const k = key(x, y);
    if (!visited.has(k)) {visited.add(k);order.push([x, y]);}
  }
  return order;
}

const CONCENTRIC_ORDER = buildConcentricOrder();

// Assign each cell index (in concentric order) to a category based on stats.
function buildAssignment(stats, workEnjoyed, works) {
  const workKey = workEnjoyed ? "workPos" : "workNeg";
  const counts = [
  ["lived", stats.livedWeeks],
  ["facts", stats.factsWeeks],
  [workKey, works ? stats.workWeeks : 0],
  ["phone", stats.phoneWeeks],
  ["free", stats.freeWeeks]];

  const cats = new Array(TOTAL_WEEKS).fill("free");
  let i = 0;
  for (const [cat, n] of counts) {
    for (let k = 0; k < n && i < TOTAL_WEEKS; k++) cats[i++] = cat;
  }
  while (i < TOTAL_WEEKS) cats[i++] = "free";
  return cats;
}

function ConcentricGrid({ user, stats, zoom = 0 }) {
  const gridRef = useRefG(null);
  const [hover, setHover] = useStateG(null);
  const [tipPos, setTipPos] = useStateG({ x: 0, y: 0 });

  const cats = useMemoG(
    () => buildAssignment(stats, user.workEnjoyed, user.works),
    [stats, user.workEnjoyed, user.works]
  );

  // Build cells array: one entry per cell, in render-order = row-major
  // For each (x,y) we need to know its category (from concentric index)
  const cellMap = useMemoG(() => {
    const map = new Map();
    CONCENTRIC_ORDER.forEach(([x, y], idx) => {
      map.set(`${x},${y}`, { cat: cats[idx], rank: idx });
    });
    return map;
  }, [cats]);

  // How many concentric cells live OUTSIDE the current focus
  // (zoom 0: nothing; zoom 1: lived; zoom 2: lived+facts+work)
  const focusOffset = useMemoG(() => {
    if (zoom === 0) return 0;
    const lived = stats.livedWeeks;
    const facts = stats.factsWeeks;
    const work = user.works ? stats.workWeeks : 0;
    return zoom === 1 ? lived : lived + facts + work;
  }, [zoom, stats, user.works]);

  // Render cells in row-major order so spatial position is natural.
  // Each cell carries per-side `edges` (true where its 4-neighbour is a
  // DIFFERENT category) so we can widen the gap between bands of colour,
  // and `faded` for cells that fall outside the current focus.
  const cells = useMemoG(() => {
    const arr = [];
    for (let y = 0; y < GRID_H; y++) {
      for (let x = 0; x < GRID_W; x++) {
        const meta = cellMap.get(`${x},${y}`);
        const cat = meta.cat;
        const ne = (nx, ny) => {
          if (nx < 0 || ny < 0 || nx >= GRID_W || ny >= GRID_H) return false;
          return cellMap.get(`${nx},${ny}`).cat !== cat;
        };
        const edges = {
          t: ne(x, y - 1),
          r: ne(x + 1, y),
          b: ne(x, y + 1),
          l: ne(x - 1, y)
        };
        arr.push({
          x, y, cat, rank: meta.rank, edges,
          faded: meta.rank < focusOffset
        });
      }
    }
    return arr;
  }, [cellMap, focusOffset]);

  // Zoom scale
  const scale = useMemoG(() => {
    if (zoom === 0) return 1;
    return scaleForCount(focusOffset);
  }, [zoom, focusOffset]);

  // Event delegation — pointer (mouse) hover
  const onMove = (e) => {
    const cell = e.target.closest("[data-cat]");
    if (!cell) {setHover(null);return;}
    const cat = cell.dataset.cat;
    const rank = parseInt(cell.dataset.rank);
    setHover({ cat, rank, touch: false });
    setTipPos({ x: e.clientX, y: e.clientY });
  };
  const onLeave = () => setHover(null);

  // Touch: cells are tiny, so resolve the cell under the finger on tap/drag
  // and auto-dismiss shortly after the finger lifts.
  const dismissT = useRefG(null);
  const resolveTouch = (e) => {
    const tch = e.touches && e.touches[0];
    if (!tch) return;
    const el = document.elementFromPoint(tch.clientX, tch.clientY);
    const cell = el && el.closest ? el.closest("[data-cat]") : null;
    if (!cell) return;
    if (dismissT.current) {clearTimeout(dismissT.current);dismissT.current = null;}
    setHover({ cat: cell.dataset.cat, rank: parseInt(cell.dataset.rank), touch: true });
    setTipPos({ x: tch.clientX, y: tch.clientY });
  };
  const onTouchEnd = () => {
    if (dismissT.current) clearTimeout(dismissT.current);
    dismissT.current = setTimeout(() => setHover(null), 2600);
  };

  return (
    <div className="wgrid-wrap">
      <div className="wgrid-frame">
        <div className="wgrid-stage">
          <div
            ref={gridRef}
            className="wgrid"
            data-zoom={zoom}
            style={{ transform: `scale(${scale})` }}
            onMouseMove={onMove}
            onMouseLeave={onLeave}
            onTouchStart={resolveTouch}
            onTouchMove={resolveTouch}
            onTouchEnd={onTouchEnd}>
            
            {cells.map((c, i) => {
              const sh = [];
              if (c.edges.t) sh.push("inset 0 2px 0 var(--c-paper)");
              if (c.edges.r) sh.push("inset -2px 0 0 var(--c-paper)");
              if (c.edges.b) sh.push("inset 0 -2px 0 var(--c-paper)");
              if (c.edges.l) sh.push("inset 2px 0 0 var(--c-paper)");
              return (
                <span
                  key={i}
                  data-cat={c.cat}
                  data-rank={c.rank}
                  className={`wcell wc-${c.cat}${c.faded ? " is-faded" : ""}`}
                  style={sh.length ? { boxShadow: sh.join(", ") } : undefined} />);


            })}
          </div>
        </div>

        <div className="wgrid-tag wgrid-tag-tl">
          {zoom === 0 && "your life · 4,000 weeks"}
          {zoom === 1 && "the weeks remaining"}
          {zoom === 2 && "what's left after the rest"}
        </div>
        <div className="wgrid-tag wgrid-tag-br">0{zoom + 1} / 03</div>
      </div>

      {hover && <HoverTip pos={tipPos} hover={hover} stats={stats} />}

      <GridLegend stats={stats} workEnjoyed={user.workEnjoyed} works={user.works} />
    </div>);

}

function HoverTip({ pos, hover, stats }) {
  const cat = CATEGORIES[hover.cat];
  const weekNum = hover.rank + 1; // 1-indexed
  const yearNum = Math.floor((weekNum - 1) / WEEKS_PER_YEAR) + 1;

  // keep the tooltip on-screen; on touch, float it above the finger
  const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const TW = Math.min(280, vw - 16);
  const TH = 132;
  let left, top;
  if (hover.touch) {
    left = pos.x - TW / 2;
    top = pos.y - TH - 22;
    if (top < 8) top = pos.y + 28; // not enough room above → below
  } else {
    left = pos.x + 18;
    top = pos.y + 18;
    if (left + TW > vw - 8) left = pos.x - TW - 18;
    if (top + TH > vh - 8) top = pos.y - TH - 18;
  }
  left = Math.max(8, Math.min(left, vw - TW - 8));
  top = Math.max(8, Math.min(top, vh - TH - 8));

  return (
    <div
      className="wtip"
      style={{
        left,
        top,
        width: TW
      }}>
      
      <div className="wtip-head">
        <span className={`wtip-sw sw-${cat.key}`} />
        <span className="wtip-cat">{cat.label}</span>
      </div>
      <div className="wtip-meta">
        week {fmtInt(weekNum)} of {fmtInt(TOTAL_WEEKS)}
        <span className="wtip-dot">·</span>
        year {yearNum} of {LIFE_EXPECTANCY}
      </div>
      <div className="wtip-desc">{cat.desc}</div>
    </div>);

}

function GridLegend({ stats, workEnjoyed, works }) {
  const workKey = workEnjoyed ? "workPos" : "workNeg";
  const items = [
  { key: "lived", n: stats.livedWeeks },
  { key: "facts", n: stats.factsWeeks },
  { key: workKey, n: works ? stats.workWeeks : 0, hide: !works },
  { key: "phone", n: stats.phoneWeeks },
  { key: "free", n: stats.freeWeeks }].
  filter((i) => !i.hide);

  return (
    <div className="wlegend">
      {items.map((it) => {
        const cat = CATEGORIES[it.key];
        const pct = it.n / TOTAL_WEEKS * 100;
        return (
          <div className="wlegend-item" key={it.key}>
            <span className={`wlegend-sw sw-${cat.key}`} />
            <span className="wlegend-label">{cat.label}</span>
            <span className="wlegend-n">{fmtInt(it.n)}</span>
            <span className="wlegend-pct">{fmtPct(pct)}</span>
          </div>);

      })}
    </div>);

}

window.ConcentricGrid = ConcentricGrid;

// ---------- ZoomControl ----------
function ZoomControl({ zoom, setZoom }) {
  return (
    <div className="zoom3">
      <span className="zoom3-label">zoom in</span>
      <div className="zoom3-track">
        {[
        { i: 0, name: "Full view" },
        { i: 1, name: "What remains" },
        { i: 2, name: "Free vs. distraction" }].
        map((s) =>
        <button
          key={s.i}
          className={`zoom3-step ${zoom === s.i ? "is-on" : ""}`}
          onClick={() => setZoom(s.i)}>
          
            <span className="zoom3-num">0{s.i + 1}</span>
            <span className="zoom3-name">{s.name}</span>
          </button>
        )}
      </div>
    </div>);

}
window.ZoomControl = ZoomControl;