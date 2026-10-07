/* ==========================================================================
   그래프 (신규 컴포넌트, KRDS 없음) : _common/html/code/ext_chart.html
   - 기준 : nise2026/nise_graph_13types_v1.0.html (그래프 13종 검토본 v63)
       색·패턴 세트(TS_VISUAL_SETS), 세트 사용 순서, 패턴 타일(tsPatternTilePath·tsBarDecal),
       꺾은선 모양(tsApplyLinePatterns), HTML 범례(tsRenderHtmlLegend), 키보드 탐색(chart-keyboard-navigation-v22),
       다운로드(dl-legend-v63), 다크 팔레트(graph-dark-palette-v63), ⑧ 콤보·스몰 멀티플(sm-trend-v63) 규칙을 옮겼습니다.
       검토본의 주소(#) 분기, echarts.init 덮어쓰기, 렌더 후 DOM 재배치는 가져오지 않았습니다.
   - 라이브러리 : ECharts 5.5.0 (_common/resources/js/lib/echarts.min.js), SVG 렌더러
   - 값은 페이지의 통계표(data-chart-table)나 JSON(data-chart-data)에서 읽습니다. 개발 시 서버 데이터로 바꿉니다.
   - 사용법은 _common/html/code/ext_chart.html 참고
   ========================================================================== */
(() => {
  "use strict";
  if (!window.echarts) return;

  /* ------------------------------------------------------------------
     1. 색·패턴 세트 (13types TS_VISUAL_SETS 그대로 : KRDS Primary 5→90, 색과 패턴이 한 세트)
     ------------------------------------------------------------------ */
  const SETS = [
    { bg: "#ECF2FE", pattern: "slash", patternColor: "#4C87F6", text: "#0B50D0", gap: 4, thickness: 1.15, angle: 45, alpha: 100, size: 100 },
    { bg: "#D8E5FD", pattern: "horizontal", patternColor: "#256EF4", text: "#0B50D0", gap: 6, thickness: 0.55, angle: 0, alpha: 44, size: 155 },
    { bg: "#B1CEFB", pattern: "dot", patternColor: "#0B50D0", text: "#083891", gap: 10, thickness: 0.9, angle: 0, alpha: 44, size: 100 },
    { bg: "#86AFF9", pattern: "grid", patternColor: "#0B50D0", text: "#083891", gap: 8, thickness: 0.7, angle: 0, alpha: 36, size: 100 },
    { bg: "#4C87F6", pattern: "vertical", patternColor: "#083891", text: "#03163A", gap: 6, thickness: 2.25, angle: 0, alpha: 39, size: 135 },
    { bg: "#256EF4", pattern: "none", patternColor: "#FFFFFF", text: "#FFFFFF", gap: 8, thickness: 1, angle: 0, alpha: 100, size: 100 },
    { bg: "#0B50D0", pattern: "bigdot", patternColor: "#86AFF9", text: "#FFFFFF", gap: 12, thickness: 1.8, angle: 0, alpha: 33, size: 100 },
    { bg: "#083891", pattern: "shortdiag", patternColor: "#4C87F6", text: "#FFFFFF", gap: 9, thickness: 1, angle: 0, alpha: 100, size: 100 },
    { bg: "#052561", pattern: "densediag", patternColor: "#256EF4", text: "#FFFFFF", gap: 8, thickness: 0.5, angle: 0, alpha: 59, size: 200 },
    { bg: "#03163A", pattern: "plus", patternColor: "#256EF4", text: "#FFFFFF", gap: 29, thickness: 1.25, angle: 0, alpha: 100, size: 50 },
  ];
  /* 다크(선명한 화면) : 밝기를 반전, 패턴은 진한 남색 (graph-dark-palette-v63) */
  const DARK_BG = ["#256EF4", "#256EF4", "#4C87F6", "#4C87F6", "#86AFF9", "#86AFF9", "#B1CEFB", "#B1CEFB", "#D8E5FD", "#ECF2FE"];
  const DARK_TEXT = ["#FFFFFF", "#FFFFFF", "#03163A", "#03163A", "#03163A", "#03163A", "#03163A", "#03163A", "#03163A", "#03163A"];
  const DARK_PATTERN = "#052561";
  const palette = (dark) =>
    SETS.map((s, i) => {
      if (!dark) return s;
      const d = Object.assign({}, s, { bg: DARK_BG[i], text: DARK_TEXT[i] });
      if (s.pattern !== "none") Object.assign(d, { patternColor: DARK_PATTERN, alpha: Math.max(40, Math.min(70, s.alpha)) });
      return d;
    });
  /* 세트 사용 순서 : 일반은 기준 블루(세트 5)부터, 막대 2개는 [5,7], 연도 계열은 과거 연하게 → 최신 진하게 */
  const ORDER_DEFAULT = [5, 7, 6, 4, 8, 3, 9, 2, 1, 0];
  const ORDER_BINARY = [5, 7];
  const ORDER_YEAR = { 1: [5], 2: [4, 6], 3: [4, 5, 6], 4: [3, 4, 6, 7] };
  const ORDER_YEAR_MANY = [3, 4, 5, 6, 7];
  /* 꺾은선 : 선 모양 + 점 모양으로 구분 (tsApplyLinePatterns) */
  const LINE_STYLES = [
    { type: "solid", symbol: "circle" },
    { type: "dashed", symbol: "rect" },
    { type: "dotted", symbol: "triangle" },
    { type: [8, 4, 2, 4], symbol: "diamond" },
    { type: "solid", symbol: "roundRect" },
    { type: "dashed", symbol: "pin" },
    { type: "dotted", symbol: "arrow" },
  ];
  const FOCUS_LINE = "#03163A"; // hover · 키보드 초점 막대 외곽선 (스타일 가이드)
  const FONT_FALLBACK = '"Pretendard GOV", Pretendard, "Malgun Gothic", sans-serif';
  const TYPE_NAME = { bar: "세로막대 그래프", hbar: "가로막대 그래프", "stack-h": "누적 가로막대 그래프", line: "꺾은선 그래프", combo: "막대·꺾은선 그래프", multiples: "꺾은선 그래프" };
  /* 통계표에서 계열을 읽는 방향 : col = 표의 열이 계열, row = 표의 행이 계열 */
  const SERIES_FROM = { bar: "col", hbar: "col", "stack-h": "row", line: "row", combo: "row", multiples: "row" };

  /* ------------------------------------------------------------------
     2. 공통 도구
     ------------------------------------------------------------------ */
  let seq = 0;
  const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const isYear = (v) => /^\d{4}$/.test(String(v).trim());
  const yearLabel = (v) => (isYear(v) ? `${String(v).trim()}년` : String(v));
  const toNumber = (text) => {
    const t = String(text == null ? "" : text).replace(/[,%\s명개※]/g, ""); // ※ : 표 아래 주석 표시
    if (t === "" || t === "-" || t === "미집계") return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  };
  const fmtNumber = (v) => (v == null ? "-" : Number(v).toLocaleString("ko-KR"));
  const fmtValue = (v, unit) => {
    if (v == null) return "미집계";
    return unit === "%" ? `${v}%` : `${fmtNumber(v)}${unit || ""}`;
  };
  const axisMan = (v) => (v >= 10000 ? `${Math.round((v / 10000) * 10) / 10}만` : fmtNumber(v));
  const cssVar = (el, name, fallback) => getComputedStyle(el).getPropertyValue(name).trim() || fallback;
  const luminance = (color) => {
    const m = String(color).match(/\d+(\.\d+)?/g);
    if (!m || m.length < 3) return 1;
    const c = m.slice(0, 3).map((x) => {
      const v = Number(x) / 255;
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  /* 화면 모드 : 배경이 어두우면 다크 팔레트 (고대비 · 시스템 다크) */
  const isDark = () => {
    const probe = document.body || document.documentElement;
    return luminance(getComputedStyle(probe).backgroundColor) < 0.3;
  };
  const colors = (el) => ({
    text: cssVar(el, "--cm-color-text-basic", "#1E2124"),
    strong: cssVar(el, "--cm-color-text-bolder", "#131416"),
    sub: cssVar(el, "--cm-color-text-subtle", "#464C53"),
    split: cssVar(el, "--cm-color-divider-light", "#E6E8EA"),
    axis: cssVar(el, "--cm-color-border-gray-dark", "#6D7882"),
    surface: cssVar(el, "--cm-color-surface-white", "#FFFFFF"),
    border: cssVar(el, "--cm-color-border-light", "#CDD1D5"),
    font: getComputedStyle(document.body || document.documentElement).fontFamily || FONT_FALLBACK,
  });
  const live = (() => {
    let node;
    let timer;
    return (message) => {
      if (!node) {
        node = document.createElement("div");
        node.className = "sr-only";
        node.setAttribute("aria-live", "polite");
        node.setAttribute("aria-atomic", "true");
        document.body.appendChild(node);
      }
      clearTimeout(timer);
      node.textContent = "";
      timer = setTimeout(() => {
        node.textContent = message;
      }, 40);
    };
  })();

  /* ------------------------------------------------------------------
     3. 패턴 (13types tsPatternTilePath · tsBarDecal · 범례 견본)
     ------------------------------------------------------------------ */
  const patternRGBA = (set) => {
    const c = set.patternColor.slice(1).match(/../g).map((h) => parseInt(h, 16));
    return `rgba(${c.join(", ")}, ${set.alpha / 100})`;
  };
  const tilePath = (set) => {
    const g = set.gap;
    const w = Math.min(set.thickness, g / 3);
    const half = w / 2;
    let p = `M0 0L0 0M${g} ${g}L${g} ${g}`;
    const rect = (x, y, a, b) => `M${x} ${y}h${a}v${b}h${-a}Z`;
    const line = (x1, y1, x2, y2) => {
      const len = Math.hypot(x2 - x1, y2 - y1);
      const dx = (-(y2 - y1) / len) * half;
      const dy = ((x2 - x1) / len) * half;
      return `M${x1 + dx} ${y1 + dy}L${x2 + dx} ${y2 + dy}L${x2 - dx} ${y2 - dy}L${x1 - dx} ${y1 - dy}Z`;
    };
    const circle = (cx, cy, r) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
    switch (set.pattern) {
      case "slash":
      case "vertical":
        p += rect(g / 2 - half, 0, w, g);
        break;
      case "horizontal":
        p += rect(0, g / 2 - half, g, w);
        break;
      case "grid":
        p += rect(0, 0, g, w) + rect(0, w, w, g - w);
        break;
      case "dot":
      case "bigdot": {
        const r = Math.min(set.thickness, g / 4 - 0.1);
        p += circle(g / 4, g / 4, r) + circle(g * 0.75, g * 0.75, r);
        break;
      }
      case "shortdiag":
        p += line(g * 0.2, g * 0.8, g * 0.8, g * 0.2);
        break;
      case "densediag": {
        const d = w / Math.SQRT2;
        p += `M0 0H${d}L${g} ${g - d}V${g}H${g - d}L0 ${d}Z` + `M${g} 0V${d}L${d} ${g}H0V${g - d}L${g - d} 0Z`;
        break;
      }
      case "plus":
        p += rect(g * 0.2, g / 2 - half, g * 0.6, w) + rect(g / 2 - half, g * 0.2, w, g * 0.3 - half) + rect(g / 2 - half, g / 2 + half, w, g * 0.3 - half);
        break;
      default:
        break;
    }
    return p;
  };
  const pitchOf = (set) => Math.max(2, Math.round((set.gap * set.size) / 100));
  const decal = (set) => {
    if (set.pattern === "none") return null;
    const pitch = pitchOf(set);
    return {
      symbol: `path://${tilePath(set)}`,
      symbolSize: 1,
      symbolKeepAspect: false,
      color: patternRGBA(set),
      backgroundColor: null,
      dashArrayX: [pitch, 0],
      dashArrayY: [pitch, 0],
      rotation: (set.angle * Math.PI) / 180,
      maxTileWidth: 512,
      maxTileHeight: 512,
    };
  };
  /* 막대 견본 (범례 · 툴팁) : SVG 그림 */
  const barSwatch = (set, patterns, w = 22, h = 22) => {
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" rx="3" fill="${set.bg}"/>`;
    if (patterns && set.pattern !== "none") {
      const pitch = pitchOf(set);
      svg +=
        `<defs><pattern id="p" width="${pitch}" height="${pitch}" patternUnits="userSpaceOnUse" patternTransform="rotate(${set.angle || 0})">` +
        `<g transform="scale(${pitch / set.gap})"><path d="${tilePath(set)}" fill="${patternRGBA(set)}"/></g></pattern></defs>` +
        `<rect width="${w}" height="${h}" rx="3" fill="url(#p)"/>`;
    }
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`${svg}</svg>`)}`;
  };
  /* 꺾은선 견본 : 선 모양 + 점 모양 */
  const lineSwatch = (color, style, w = 40, h = 22) => {
    const t = style.type;
    const dash = Array.isArray(t) ? t : t === "dashed" ? [7, 4] : t === "dotted" ? [2.5, 2.5] : [];
    const c = w / 2;
    const m = h / 2;
    const shapes = {
      circle: `<circle cx="${c}" cy="${m}" r="4"/>`,
      rect: `<rect x="${c - 4}" y="${m - 4}" width="8" height="8"/>`,
      triangle: `<polygon points="${c},${m - 5} ${c + 5},${m + 4} ${c - 5},${m + 4}"/>`,
      diamond: `<polygon points="${c},${m - 5} ${c + 5},${m} ${c},${m + 5} ${c - 5},${m}"/>`,
      roundRect: `<rect x="${c - 4}" y="${m - 4}" width="8" height="8" rx="2"/>`,
      pin: `<path d="M${c} ${m + 6} L${c - 4} ${m - 1} A4.6 4.6 0 1 1 ${c + 4} ${m - 1} Z"/>`,
      arrow: `<path d="M${c} ${m - 6} L${c + 5} ${m + 5} L${c} ${m + 2} L${c - 5} ${m + 5} Z"/>`,
    };
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
      `<line x1="1" y1="${m}" x2="${w - 1}" y2="${m}" stroke="${color}" stroke-width="2.5"${dash.length ? ` stroke-dasharray="${dash.join(" ")}"` : ""}/>` +
      `<g fill="${color}">${shapes[style.symbol] || shapes.circle}</g></svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  };
  const swatchImg = (src, w, h) => `<img alt="" width="${w}" height="${h}" src="${src}" style="vertical-align:middle;margin-right:6px">`;

  /* ------------------------------------------------------------------
     4. 데이터 : 통계표 또는 JSON
     ------------------------------------------------------------------ */
  /* 통계표 → { cols:[열 이름], rows:[{ name, values }] } (data-chart-skip 이 붙은 행·열은 뺌) */
  const readTable = (table) => {
    const headRow = table.querySelector("thead tr:last-child");
    const heads = headRow ? [...headRow.children] : [];
    const skipCols = new Set();
    heads.forEach((th, i) => {
      if (th.hasAttribute("data-chart-skip")) skipCols.add(i);
    });
    const cols = heads.map((th, i) => ({ i, name: th.textContent.replace(/\s+/g, " ").trim() })).filter((c) => c.i > 0 && !skipCols.has(c.i));
    const rows = [...table.querySelectorAll("tbody tr")]
      .filter((tr) => !tr.hasAttribute("data-chart-skip"))
      .map((tr) => {
        const cells = [...tr.children];
        const texts = cols.map((c) => (cells[c.i] ? cells[c.i].textContent.replace(/\s+/g, " ").trim() : ""));
        return { name: cells[0].textContent.replace(/\s+/g, " ").trim(), values: texts.map(toNumber), texts, unit: tr.dataset.chartUnit || "" };
      });
    return { cols: cols.map((c) => c.name), rows };
  };
  /* 유형에 맞는 방향으로 { categories, series:[{ name, data }] } 를 만듦 */
  const modelOf = (config, type) => {
    if (config.data) return JSON.parse(JSON.stringify(config.data));
    const t = readTable(config.table);
    const from = config.seriesFrom || SERIES_FROM[type];
    if (from === "row") return { categories: t.cols, series: t.rows.map((r) => ({ name: r.name, data: r.values, texts: r.texts, unit: r.unit })) };
    return { categories: t.rows.map((r) => r.name), series: t.cols.map((c, j) => ({ name: c, data: t.rows.map((r) => r.values[j]), texts: t.rows.map((r) => r.texts[j]) })) };
  };

  /* ------------------------------------------------------------------
     5. 그래프 옵션 만들기
     ctx : { type, model, unit, sets, order, patterns, labels, selected, colors, scale, width, sortBy }
     ------------------------------------------------------------------ */
  const orderFor = (config, model, bars) => {
    if (config.palette) return config.palette;
    const names = model.series.map((s) => s.name);
    if (names.length && names.every((n) => /^\d{4}년?$/.test(String(n)))) return ORDER_YEAR[names.length] || ORDER_YEAR_MANY;
    if (bars === 2) return ORDER_BINARY;
    return ORDER_DEFAULT;
  };
  const fs = (ctx, size) => Math.round(size * ctx.scale * 10) / 10;
  const baseOption = (ctx) => {
    const c = ctx.colors;
    return {
      animation: false,
      aria: { enabled: false }, // 접근성은 키보드 대리 칸 · 요약문 · 통계표로 제공
      textStyle: { fontFamily: c.font, fontSize: fs(ctx, 15), color: c.text },
      legend: { show: false, data: ctx.model.series.map((s) => s.name), selected: Object.assign({}, ctx.selected) },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow", shadowStyle: { color: "rgba(109, 120, 130, 0.12)" } },
        backgroundColor: c.surface,
        borderColor: c.border,
        borderWidth: 1,
        padding: [12, 16],
        textStyle: { fontFamily: c.font, fontSize: fs(ctx, 15), color: c.text },
        extraCssText: "border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,.12);",
        confine: true,
      },
    };
  };
  const valueAxis = (ctx, extra) =>
    Object.assign(
      {
        type: "value",
        axisLabel: { color: ctx.colors.sub, fontSize: fs(ctx, 13), formatter: ctx.unit === "%" ? "{value}%" : axisMan },
        axisLine: { show: false },
        splitLine: { lineStyle: { color: ctx.colors.split } },
      },
      extra,
    );
  const categoryAxis = (ctx, data, extra) =>
    Object.assign(
      {
        type: "category",
        data,
        axisTick: { show: false },
        axisLine: { lineStyle: { color: ctx.colors.axis } },
        axisLabel: { color: ctx.colors.text, fontSize: fs(ctx, 13), interval: 0, hideOverlap: false },
      },
      extra,
    );
  const rawText = (p) => (p.data && typeof p.data === "object" && p.data.raw ? p.data.raw : null);
  /* 꺾은선 값 레이블 상자 : 선 · 점과 겹쳐도 읽히도록 그래프 바탕색 면 + 얇은 테두리 */
  const labelBox = (ctx, borderColor) => ({ backgroundColor: ctx.colors.surface, borderColor: borderColor || ctx.colors.border, borderWidth: 1, borderRadius: 4, padding: [3, 6] });
  /* 툴팁 : 견본(패턴·선 모양) + 계열 이름 + 값 */
  const tooltipFormatter = (ctx, markers) => (params) => {
    const arr = Array.isArray(params) ? params : [params];
    if (!arr.length) return "";
    const head = arr[0].axisValueLabel || arr[0].axisValue || arr[0].name;
    let html = `<div style="font-weight:700;margin-bottom:6px">${esc(head)}</div>`;
    arr.forEach((p) => {
      const v = p.value && typeof p.value === "object" ? p.value.value : p.value;
      const unit = (markers[p.seriesIndex] && markers[p.seriesIndex].unit) || ctx.unit;
      const raw = rawText(p);
      const text = raw && v != null ? (unit === "%" && !/%$/.test(raw) ? `${raw}%` : raw) : fmtValue(v == null ? null : v, unit);
      html +=
        `<div style="display:flex;align-items:center;gap:2px;line-height:1.8;white-space:nowrap">${markers[p.seriesIndex] ? markers[p.seriesIndex].html : ""}` +
        `<span>${esc(p.seriesName)}</span><b style="margin-left:auto;padding-left:16px">${esc(text)}</b></div>`;
    });
    return html;
  };
  /* 값 라벨 : 통계표의 원문 표기(예 0.0%)를 그대로 씀 (13types 원칙 : 재계산하지 않음) */
  const barLabelFormatter = (ctx) => (p) => {
    if (p.value == null) return "";
    const raw = rawText(p);
    if (raw) return ctx.unit === "%" && !/%$/.test(raw) ? `${raw}%` : raw;
    return ctx.unit === "%" ? `${p.value}%` : fmtNumber(p.value);
  };

  /* 막대 계열 (세로·가로) */
  const barSeries = (ctx, s, i, horizontal, stack) => {
    const set = ctx.sets[ctx.order[i % ctx.order.length]];
    const pattern = ctx.patterns ? decal(set) : null;
    const item = { color: set.bg, decal: pattern, borderRadius: 0 };
    const one = {
      name: s.name,
      type: "bar",
      itemStyle: item,
      emphasis: { itemStyle: { borderColor: FOCUS_LINE, borderWidth: 2 } },
      data: s.data.map((v, k) => ({ value: v, raw: s.texts ? s.texts[k] : "", itemStyle: Object.assign({}, item) })),
      _set: set,
    };
    if (stack) {
      /* 누적 막대 라벨 : 3% 미만 숨김, 그 이상은 조각 안쪽 (패턴 위에서는 바탕색 상자) */
      one.stack = "total";
      one.barMaxWidth = 64;
      one.data = one.data.map((d) => {
        const show = ctx.labels && d.value != null && d.value >= 3;
        d.label = {
          show,
          position: "inside",
          color: set.text,
          backgroundColor: pattern ? set.bg : "transparent",
          borderRadius: 4,
          padding: pattern ? [3, 6] : 0,
          fontWeight: "bold",
          fontSize: fs(ctx, 13),
          formatter: barLabelFormatter(ctx),
        };
        return d;
      });
    } else {
      one.barGap = "15%";
      one.label = {
        show: ctx.labels && ctx.showBarLabels,
        position: horizontal ? "right" : "top",
        color: ctx.colors.text,
        fontSize: fs(ctx, 13),
        fontWeight: horizontal && ctx.model.series.length === 1 ? "bold" : "normal",
        formatter: barLabelFormatter(ctx),
      };
    }
    return one;
  };
  const markersOf = (ctx, series) =>
    series.map((s) => {
      if (s.type === "line") return { html: swatchImg(lineSwatch(s.lineStyle.color, s._lineStyle || LINE_STYLES[0], 30, 16), 30, 16), unit: s._unit };
      return { html: swatchImg(barSwatch(s._set, ctx.patterns, 30, 16), 30, 16), unit: s._unit };
    });

  const BUILD = {
    /* 세로 묶음 막대 (⑨ 그룹 세로막대 · ③ 특성별 비교 · 교차분석 그룹막대) */
    bar(ctx) {
      const { model } = ctx;
      ctx.order = ctx.order || orderFor(ctx.config, model, model.series.length);
      ctx.showBarLabels = model.categories.length * model.series.length <= 36;
      const series = model.series.map((s, i) => barSeries(ctx, s, i, false, false));
      const plotWidth = Math.max(200, ctx.width - 80);
      const o = baseOption(ctx);
      o.grid = { left: 8, right: 16, top: 28, bottom: 8, containLabel: true };
      o.xAxis = categoryAxis(ctx, model.categories.map((c) => (ctx.type === "bar" && isYear(c) ? yearLabel(c) : c)), {
        axisLabel: { color: ctx.colors.text, fontSize: fs(ctx, 13), interval: 0, width: Math.max(40, plotWidth / Math.max(1, model.categories.length) - 12), overflow: "break", lineHeight: fs(ctx, 18) },
      });
      o.yAxis = valueAxis(ctx);
      o.series = series;
      o.tooltip.formatter = tooltipFormatter(ctx, markersOf(ctx, series));
      return o;
    },
    /* 가로 막대 (핵심데이터 단일 가로막대 · 교차분석 가로막대) */
    hbar(ctx) {
      const { model } = ctx;
      ctx.order = ctx.order || orderFor(ctx.config, model, model.series.length);
      ctx.showBarLabels = model.categories.length * model.series.length <= 36;
      const series = model.series.map((s, i) => barSeries(ctx, s, i, true, false));
      if (model.series.length === 1) series[0].barCategoryGap = "30%";
      const o = baseOption(ctx);
      o.grid = { left: 8, right: 56, top: 8, bottom: 8, containLabel: true };
      o.xAxis = valueAxis(ctx);
      o.yAxis = categoryAxis(ctx, model.categories, {
        inverse: true,
        axisLabel: { color: ctx.colors.text, fontSize: fs(ctx, 13), interval: 0, width: Math.min(200, Math.max(80, ctx.width * 0.22)), overflow: "break", lineHeight: fs(ctx, 18) },
      });
      o.series = series;
      o.tooltip.formatter = tooltipFormatter(ctx, markersOf(ctx, series));
      return o;
    },
    /* 누적 가로막대 100% (⑤) */
    "stack-h": function stackH(ctx) {
      const { model } = ctx;
      ctx.order = ctx.order || orderFor(ctx.config, model, model.series.length);
      const series = model.series.map((s, i) => barSeries(ctx, s, i, true, true));
      const o = baseOption(ctx);
      o.grid = { left: 8, right: 24, top: 8, bottom: 8, containLabel: true };
      /* 합계가 사실상 100%면 축을 100%로 고정 (tsPinPercentAxis) */
      let max = 0;
      model.categories.forEach((c, k) => {
        max = Math.max(max, model.series.reduce((t, s) => t + (Number(s.data[k]) || 0), 0));
      });
      o.xAxis = valueAxis(ctx, ctx.unit === "%" && max >= 95 && max <= 100.6 ? { max: 100 } : {});
      o.yAxis = categoryAxis(ctx, model.categories.map(yearLabel), { inverse: true, axisLabel: { color: ctx.colors.text, fontSize: fs(ctx, 13), fontWeight: "bold" } });
      o.series = series;
      o.tooltip.formatter = tooltipFormatter(ctx, markersOf(ctx, series));
      return o;
    },
    /* 다중 꺾은선 (①) */
    line(ctx) {
      const { model } = ctx;
      ctx.order = ctx.order || (ctx.config.palette || ORDER_DEFAULT);
      /* 값 레이블 자리 : 항목(가로축 한 칸)마다 보이는 계열을 값 순서로 세워 위쪽 절반은 점 위, 아래쪽 절반은 점 아래에 둠
         (선이 두 개면 큰 값은 위 · 작은 값은 아래). 그래도 서로 겹치는 레이블은 겹치지 않을 때까지 세로로 밀어내고 점과 지시선으로 이음
         - 자리를 미리 계산하려고 그림 영역 여백과 세로축 범위를 직접 정함 */
      const shown = model.series.map((s, i) => i).filter((i) => ctx.selected[model.series[i].name] !== false);
      const values = shown.flatMap((i) => model.series[i].data.filter((v) => v != null));
      const lo = Math.min(...values, 0);
      const hi = Math.max(...values, 1);
      const rough = (hi - lo) / 5;
      const pow = Math.pow(10, Math.floor(Math.log10(rough)));
      const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((m) => m >= rough);
      const yMin = Math.floor(lo / step) * step;
      const yMax = Math.ceil(hi / step) * step;
      const H = ctx.height || 400;
      const size = fs(ctx, 13);
      const gridTop = 52;
      const gridBottom = 40;
      const boxH = size + 8; // 글자 + 상자 안쪽 여백 · 테두리
      const gap = 3;
      const dist = 8;
      const pixel = (v) => gridTop + (H - gridTop - gridBottom) * (1 - (v - yMin) / (yMax - yMin));
      const below = model.series.map(() => []);
      const shift = model.series.map(() => []);
      model.categories.forEach((c, k) => {
        const ranked = shown.filter((i) => model.series[i].data[k] != null).sort((a, b) => model.series[b].data[k] - model.series[a].data[k]);
        const items = ranked.map((i, r) => {
          const down = ranked.length > 1 && r >= Math.ceil(ranked.length / 2);
          below[i][k] = down;
          const y = pixel(model.series[i].data[k]);
          const natural = down ? y + dist + boxH / 2 : y - dist - boxH / 2; // 밀어내기 전 레이블 가운데
          return { i, natural, center: natural };
        });
        items.sort((a, b) => a.natural - b.natural);
        items.forEach((item, j) => {
          item.center = Math.max(item.natural, j ? items[j - 1].center + boxH + gap : 2 + boxH / 2);
        });
        const floor = H - gridBottom - 2 - boxH / 2; // 가로축 아래(항목 이름)로 내려가지 않게
        for (let j = items.length - 1; j >= 0; j--) {
          items[j].center = Math.min(items[j].center, j === items.length - 1 ? floor : items[j + 1].center - boxH - gap);
        }
        items.forEach((item) => {
          shift[item.i][k] = Math.round(item.center - item.natural);
        });
      });
      const series = model.series.map((s, i) => {
        const set = ctx.sets[ctx.order[i % ctx.order.length]];
        const style = ctx.patterns ? LINE_STYLES[i % LINE_STYLES.length] : LINE_STYLES[0];
        return {
          name: s.name,
          type: "line",
          data: s.data.map((v, k) => ({ value: v, raw: s.texts ? s.texts[k] : "", label: { position: below[i][k] ? "bottom" : "top" } })),
          connectNulls: false,
          symbol: style.symbol,
          symbolSize: 8,
          showAllSymbol: true,
          itemStyle: { color: set.bg },
          lineStyle: { color: set.bg, width: 2.5, type: style.type },
          emphasis: { scale: 1.38, lineStyle: { width: 3 } },
          label: Object.assign({ show: ctx.labels, position: "top", distance: dist, fontSize: size, color: ctx.colors.text, formatter: barLabelFormatter(ctx) }, labelBox(ctx, set.bg)),
          labelLayout: (p) => ({ dy: shift[i][p.dataIndex] || 0 }),
          labelLine: { show: true, lineStyle: { color: set.bg, width: 1 } },
          _lineStyle: style,
        };
      });
      const o = baseOption(ctx);
      o.tooltip.axisPointer = { type: "line", lineStyle: { color: ctx.colors.axis, type: "dashed" } };
      o.grid = { left: Math.round(64 * ctx.scale), right: 24, top: gridTop, bottom: gridBottom };
      o.xAxis = categoryAxis(ctx, model.categories.map(yearLabel), { boundaryGap: true });
      o.yAxis = valueAxis(ctx, { min: yMin, max: yMax, interval: step });
      o.series = series;
      o.tooltip.formatter = tooltipFormatter(ctx, markersOf(ctx, series));
      return o;
    },
    /* 막대 + 전년 대비 증가율 꺾은선 (⑧ 계, sm-trend-v63 totalOption) */
    combo(ctx) {
      const { model } = ctx;
      const s = model.series[0];
      const skip = new Set(ctx.config.growthSkip || []);
      const growth = s.data.map((v, i) => {
        if (i === 0 || v == null || s.data[i - 1] == null || s.data[i - 1] === 0 || skip.has(String(model.categories[i]))) return null;
        return Math.round((v / s.data[i - 1] - 1) * 1000) / 10;
      });
      const valid = growth.filter((x) => x != null);
      const gMin = Math.min(0, Math.floor(Math.min(...valid, 0) / 3) * 3);
      const gMax = Math.max(3, Math.ceil((Math.max(...valid, 0) * 1.8) / 3) * 3);
      const unit = ctx.unit || "명";
      const barSet = ctx.sets[5];
      const lineSet = ctx.sets[8];
      const lineStyle = ctx.patterns ? LINE_STYLES[1] : LINE_STYLES[0];
      const barName = `${s.name} (${unit})`;
      const lineName = "전년 대비 증가율(%)";
      const last = (arr) => arr.reduce((li, v, i) => (v != null ? i : li), -1);
      const labelled = (arr, color, text, box) => {
        const li = last(arr);
        return arr.map((v, i) => (v == null ? v : { value: v, label: Object.assign({ show: ctx.labels, fontWeight: i === li ? 700 : 400, color, fontSize: fs(ctx, 13), formatter: text }, box) }));
      };
      const bar = {
        name: barName,
        type: "bar",
        itemStyle: { color: barSet.bg, decal: ctx.patterns ? decal(barSet) : null, borderRadius: 0 },
        emphasis: { itemStyle: { borderColor: FOCUS_LINE, borderWidth: 2 } },
        label: { position: "top" },
        data: labelled(s.data, ctx.colors.text, (p) => fmtNumber(p.value)),
        _set: barSet,
        _unit: unit,
      };
      const line = {
        name: lineName,
        type: "line",
        yAxisIndex: 1,
        connectNulls: false,
        symbol: lineStyle.symbol === "circle" ? "circle" : "rect",
        symbolSize: 8,
        itemStyle: { color: lineSet.bg },
        lineStyle: { color: lineSet.bg, width: 3, type: lineStyle.type },
        emphasis: { scale: 1.38, lineStyle: { width: 3.5 } },
        z: 10,
        label: { position: "top", distance: 8 },
        data: labelled(growth, lineSet.bg, (p) => `${(+p.value).toFixed(1)}%`, Object.assign(labelBox(ctx, lineSet.bg), { padding: [3, 4] })), // 파란 막대 위에서도 읽히게 상자 (옆 해의 막대 값과 닿지 않게 좁은 여백)
        _lineStyle: { type: lineStyle.type, symbol: lineStyle.symbol === "circle" ? "circle" : "rect" },
        _unit: "%",
      };
      const o = baseOption(ctx);
      o.legend.data = [barName, lineName];
      /* 값 레이블이 서로 겹치지 않게 자리를 미리 계산함 (그래프 모양은 그대로 : 한 그림 영역에 막대 + 꺾은선)
         → 그림 영역 여백과 막대 축 최댓값을 직접 정함 (가장 큰 값보다 조금 큰 깔끔한 수) */
      const H = ctx.height || 480;
      const size = fs(ctx, 13);
      const left = Math.round(64 * ctx.scale);
      const right = Math.round(56 * ctx.scale);
      const gridTop = 64; // 축 이름 + 윗줄로 올린 막대 값 자리
      const gridBottom = 36;
      const plotH = H - gridTop - gridBottom;
      const peak = Math.max(...s.data.filter((v) => v != null), 1);
      const mag = Math.pow(10, Math.floor(Math.log10(peak)));
      const yMax = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].map((m) => m * mag).find((m) => m >= peak * 1.02);
      const pitch = (ctx.width - left - right) / model.categories.length;
      const barY = (i) => (bar.data[i] == null ? null : gridTop + plotH * (1 - bar.data[i].value / yMax));
      const lineY = (i) => gridTop + plotH * (1 - (growth[i] - gMin) / (gMax - gMin));
      // 글자 너비 : 실제 글꼴로 잼 (잴 수 없으면 어림값)
      const pen = document.createElement("canvas").getContext("2d");
      const textW = (t, bold) => {
        if (pen) {
          pen.font = `${bold ? 700 : 400} ${size}px ${ctx.colors.font}`;
          return pen.measureText(t).width;
        }
        return size * (0.62 * t.replace(/,/g, "").length + 0.3 * (t.length - t.replace(/,/g, "").length));
      };
      /* ① 막대 값 : 값이 길어 이웃한 값끼리 가로로 겹칠 때(여섯 자리 값 · 좁은 막대)는 하나 걸러 하나를 윗줄로 올림
            제자리 레이블(마지막 값에서 거꾸로 세어 짝수 번째)은 움직이지 않아 줄이 계단처럼 밀리지 않음 */
      const lastIndex = last(s.data);
      const barDist = bar.data.map(() => 5);
      const barW = bar.data.map((d, i) => (d == null ? 0 : textW(fmtNumber(d.value), i === lastIndex)));
      if (Math.max(...barW) + 4 > pitch) {
        bar.data.forEach((d, i) => {
          if (d == null || (lastIndex - i) % 2 === 0) return;
          const tops = [i - 1, i, i + 1].map(barY).filter((y) => y != null);
          barDist[i] = barY(i) - Math.min(...tops) + 5 + size + 3; // 양옆 제자리 레이블보다 위
        });
      }
      // 꺾은선(점과 그 양옆 선의 절반)이 막대 값 글자 위를 지나가면 그 막대 값을 꺾은선 위로 올림
      bar.data.forEach((d, i) => {
        if (d == null || growth[i] == null) return;
        const ys = [lineY(i)];
        [i - 1, i + 1].forEach((j) => {
          if (growth[j] != null) ys.push((lineY(i) + lineY(j)) / 2);
        });
        const bottom = barY(i) - barDist[i];
        if (!(Math.max(...ys) > bottom - size - 6 && Math.min(...ys) < bottom + 6)) return;
        barDist[i] = barY(i) - Math.min(...ys) + 10;
        // 올린 자리가 양옆 막대 값과 같은 높이면 그 위로 한 번 더 올림
        [i - 1, i + 1].forEach((j) => {
          if (barY(j) == null) return;
          const mine = barY(i) - barDist[i];
          const other = barY(j) - barDist[j];
          if (mine > other - size - 3 && mine - size < other + 3) barDist[i] = barY(i) - (other - size - 3);
        });
      });
      bar.data.forEach((d, i) => {
        if (d != null) d.label.distance = barDist[i];
      });
      /* ② 증가율 : 점 위에 두되 막대 값(같은 해 · 양옆 해)과 만나면 점 아래로, 아래도 막히면 막대 값들 위로 올림 */
      const boxH = size + 8;
      const dist = 8;
      const barLabel = (i) => (barY(i) == null ? null : { top: barY(i) - barDist[i] - size - 2, bottom: barY(i) - barDist[i] + 2 });
      line.data.forEach((d, i) => {
        if (d == null) return;
        // 같은 해의 막대 값은 늘 위아래로 놓이고, 양옆 해의 막대 값은 가로로 실제 닿을 때만 따짐
        const boxW = textW(`${(+d.value).toFixed(1)}%`, i === last(growth)) + 10; // 글자 + 안쪽 여백 4 + 테두리 1
        const near = [i - 1, i, i + 1].filter((j) => j === i || (boxW + barW[j]) / 2 > pitch).map(barLabel).filter(Boolean);
        const hits = (top) => near.some((r) => top < r.bottom && top + boxH > r.top);
        const y = lineY(i);
        if (!hits(y - dist - boxH)) return; // 점 위 (기본)
        if (!hits(y + dist)) {
          d.label.position = "bottom";
          d.label.distance = dist;
          return;
        }
        d.label.distance = y - Math.min(...near.map((r) => r.top)) + 3;
      });
      o.grid = { left, right, top: gridTop, bottom: gridBottom };
      o.xAxis = categoryAxis(ctx, model.categories, {});
      o.yAxis = [
        valueAxis(ctx, { min: 0, max: yMax, name: unit, nameTextStyle: { color: ctx.colors.sub, align: "right", fontSize: fs(ctx, 13) }, axisLabel: { color: ctx.colors.sub, fontSize: fs(ctx, 13), formatter: axisMan } }),
        valueAxis(ctx, { min: gMin, max: gMax, interval: 3, name: "%", nameTextStyle: { color: ctx.colors.sub, align: "left", fontSize: fs(ctx, 13) }, axisLabel: { color: ctx.colors.sub, fontSize: fs(ctx, 13), formatter: "{value}%" }, splitLine: { show: false } }),
      ];
      o.series = [bar, line];
      o.tooltip.formatter = tooltipFormatter(ctx, markersOf(ctx, o.series));
      return o;
    },
    /* 스몰 멀티플 패널 하나 (⑧ 배치별·급별·장애유형별, sm-trend-v63 panelOption) */
    panel(ctx, s) {
      const { model } = ctx;
      const set = ctx.sets[5];
      const li = s.data.reduce((a, v, i) => (v != null ? i : a), -1);
      const n = model.categories.length;
      const o = baseOption(ctx);
      o.legend = { show: false };
      o.tooltip.trigger = "axis";
      o.tooltip.axisPointer = { type: "line", lineStyle: { color: ctx.colors.axis, type: "dashed" } };
      o.tooltip.formatter = (ps) => {
        const q = ps[0];
        return `<div style="font-weight:700;margin-bottom:6px">${esc(s.name)}</div>${esc(q.axisValue)}년 : <b>${esc(fmtValue(q.value, s.unit || ctx.unit))}</b>`;
      };
      o.grid = { left: 12, right: 36, top: 40, bottom: 8, containLabel: true };
      o.xAxis = categoryAxis(ctx, model.categories, {
        boundaryGap: false,
        axisLabel: { color: ctx.colors.sub, fontSize: fs(ctx, 13), interval: (i) => i === 0 || i === Math.floor((n - 1) / 2) || i === n - 1 },
      });
      o.yAxis = valueAxis(ctx, { min: 0 });
      o.yAxis.axisLabel.formatter = axisMan;
      o.series = [
        {
          name: s.name,
          type: "line",
          connectNulls: false,
          symbol: "circle",
          symbolSize: 8,
          showAllSymbol: true,
          itemStyle: { color: set.bg },
          lineStyle: { color: set.bg, width: 2.5 },
          emphasis: { scale: 1.38, lineStyle: { width: 3 } },
          data: s.data.map((v, i) => (v == null ? v : { value: v, label: Object.assign({ show: ctx.labels && i === li, position: "top", distance: 8, fontWeight: 700, color: ctx.colors.strong, fontSize: fs(ctx, 13), formatter: (p) => fmtNumber(p.value) }, labelBox(ctx), { borderWidth: 0 }) })), // 패널 값 상자는 테두리 없이 면만
        },
      ];
      return o;
    },
  };

  /* 범례 선택 반영 (숨긴 계열은 legend.selected 로) · 정렬 */
  const sortModel = (model, sortBy) => {
    if (!sortBy || sortBy === "view") return model;
    const mean = (s) => s.data.reduce((t, v) => t + (Number(v) || 0), 0) / Math.max(1, s.data.length);
    const series = model.series.map((s, i) => ({ s, i, m: mean(s) }));
    series.sort((a, b) => (sortBy === "asc" ? a.m - b.m : b.m - a.m));
    return { categories: model.categories, series: series.map((x) => x.s), orderIndex: series.map((x) => x.i) };
  };

  /* ------------------------------------------------------------------
     6. 키보드 탐색 (13types chart-keyboard-navigation-v22 를 옮김)
        차트 안에 role=grid 대리 칸을 두고 ←→ 값, ↑↓ 계열, Enter/Space 툴팁, Esc 닫기
     ------------------------------------------------------------------ */
  const keyboard = (chart, dom, title) => {
    if (dom._cmKeyboard && dom._cmKeyboard.chart === chart) return;
    if (dom._cmKeyboard) dom._cmKeyboard.destroy();
    let current = null;
    let showing = false;
    let signature = "";
    let syncing = false;
    const hint = "방향키로 데이터를 탐색할 수 있습니다. 좌우: 이전·다음 항목, 상하: 계열 이동. Enter 또는 Space: 값 확인, Esc: 닫기.";
    const grid = document.createElement("div");
    grid.className = "cm-chart-focus-grid";
    grid.setAttribute("role", "grid");
    grid.setAttribute("aria-label", `${title}. ${hint}`);
    grid.setAttribute("aria-keyshortcuts", "ArrowLeft ArrowRight ArrowUp ArrowDown Enter Space Escape");
    dom.appendChild(grid);
    dom.dataset.chartKeyboard = "true";
    const cells = new Map();
    const id = (p) => `${p.seriesIndex}:${p.dataIndex}`;
    const groups = () => {
      const option = chart.getOption();
      const legends = option.legend || [];
      const selected = (name) => !legends.some((l) => l.selected && l.selected[name] === false);
      return (option.series || [])
        .map((s, si) => {
          const points = [];
          if (selected(s.name))
            (s.data || []).forEach((d, di) => {
              const v = d && typeof d === "object" && !Array.isArray(d) ? d.value : d;
              if (v === null || v === undefined || v === "" || !Number.isFinite(Number(v))) return;
              points.push({ seriesIndex: si, dataIndex: di });
            });
          return points;
        })
        .filter((g) => g.length);
    };
    const describe = (point) => {
      const option = chart.getOption();
      const s = option.series[point.seriesIndex];
      let axis = (option.xAxis || [])[s.xAxisIndex || 0];
      if (!axis || axis.type !== "category") axis = (option.yAxis || [])[s.yAxisIndex || 0];
      const category = axis && axis.data ? axis.data[point.dataIndex] : "";
      const d = s.data[point.dataIndex];
      const v = d && typeof d === "object" ? d.value : d;
      const unit = s._unit || chart._cmUnit;
      const raw = d && typeof d === "object" && d.raw ? d.raw : "";
      const text = raw ? (unit === "%" && !/%$/.test(raw) ? `${raw}%` : raw) : fmtValue(v, unit);
      return `${typeof category === "object" ? category.value : category}, ${s.name}: ${text}`;
    };
    const sync = () => {
      if (syncing || chart.isDisposed()) return;
      syncing = true;
      try {
        const gs = groups();
        const data = gs.map((g) => g.map((p) => ({ point: p, label: describe(p) })));
        const next = JSON.stringify(data);
        if (signature === next) return;
        const hadFocus = grid.contains(document.activeElement);
        signature = next;
        cells.clear();
        grid.replaceChildren();
        data.forEach((g) => {
          const row = document.createElement("div");
          row.setAttribute("role", "row");
          grid.appendChild(row);
          g.forEach((item) => {
            const cell = document.createElement("div");
            cell.setAttribute("role", "gridcell");
            cell.className = "cm-chart-focus-point";
            cell.tabIndex = -1;
            cell.textContent = item.label;
            cell._point = item.point;
            row.appendChild(cell);
            cells.set(id(item.point), cell);
          });
        });
        if (!current || !cells.has(id(current))) current = gs.length ? gs[0][0] : null;
        grid.tabIndex = current ? -1 : 0;
        if (current) cells.get(id(current)).tabIndex = 0;
        else grid.setAttribute("aria-label", "표시된 데이터가 없습니다. 범례에서 항목을 선택하세요.");
        if (hadFocus) (current ? cells.get(id(current)) : grid).focus({ preventScroll: true });
      } finally {
        syncing = false;
      }
    };
    const clear = () => {
      if (chart.isDisposed()) return;
      if (current) chart.dispatchAction(Object.assign({ type: "downplay" }, current));
      chart.dispatchAction({ type: "hideTip" });
      showing = false;
    };
    const show = (speak) => {
      if (chart.isDisposed() || !current) return;
      chart.dispatchAction(Object.assign({ type: "highlight" }, current));
      chart.dispatchAction(Object.assign({ type: "showTip" }, current));
      showing = true;
      if (speak !== false) live(describe(current));
    };
    const moveFocus = () => {
      sync();
      cells.forEach((cell) => {
        cell.tabIndex = current && id(cell._point) === id(current) ? 0 : -1;
      });
      const cell = current && cells.get(id(current));
      if (cell) cell.focus({ preventScroll: true });
    };
    const keydown = (e) => {
      if (!grid.contains(e.target) || e.altKey || e.ctrlKey || e.metaKey) return;
      if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Enter", " ", "Spacebar", "Escape"].includes(e.key)) return;
      e.preventDefault();
      e.stopPropagation();
      if (e.key === "Escape") {
        clear();
        live("값 안내를 닫았습니다.");
        return;
      }
      const gs = groups();
      if (!gs.length) {
        live("표시된 데이터가 없습니다. 범례에서 항목을 선택하세요.");
        return;
      }
      let gi = Math.max(0, gs.findIndex((g) => current && g[0].seriesIndex === current.seriesIndex));
      let di = Math.max(0, gs[gi].findIndex((p) => current && p.dataIndex === current.dataIndex));
      clear();
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") di = (di + (e.key === "ArrowRight" ? 1 : -1) + gs[gi].length) % gs[gi].length;
      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        const wanted = gs[gi][di].dataIndex;
        gi = (gi + (e.key === "ArrowDown" ? 1 : -1) + gs.length) % gs.length;
        di = Math.max(0, gs[gi].findIndex((p) => p.dataIndex === wanted));
      }
      current = gs[gi][di];
      moveFocus();
      show();
    };
    const focusin = (e) => {
      if (e.target._point) {
        current = e.target._point;
        show();
      }
    };
    const focusout = (e) => {
      if (!grid.contains(e.relatedTarget)) clear();
    };
    const restore = () => {
      if (showing && grid.contains(document.activeElement)) show(false);
    };
    grid.addEventListener("keydown", keydown);
    grid.addEventListener("focusin", focusin);
    grid.addEventListener("focusout", focusout);
    chart.on("globalout", restore);
    chart.on("rendered", sync);
    sync();
    dom._cmKeyboard = {
      chart,
      sync,
      destroy() {
        grid.remove();
        if (!chart.isDisposed()) {
          chart.off("globalout", restore);
          chart.off("rendered", sync);
        }
      },
    };
  };

  /* ------------------------------------------------------------------
     7. 그래프 하나 : 범례 · 요약문 · 그림 영역(또는 패널 카드)
     ------------------------------------------------------------------ */
  const charts = [];
  class CmChart {
    constructor(el, config) {
      this.el = el;
      this.config = config;
      this.type = config.type;
      this.selected = Object.assign({}, config.selected || {});
      this.scale = config.scale || 1;
      this.instances = [];
      this.rendered = false;
      this.uid = `cm_chart_${++seq}`;
      el.classList.add("cm-chart");
      el.innerHTML = "";
      this.legend = document.createElement("div");
      this.legend.className = "cm-chart-legend";
      this.legend.setAttribute("role", "group");
      this.legend.setAttribute("aria-label", "그래프 범례. 항목을 누르면 그래프에서 표시하거나 숨길 수 있습니다.");
      this.summary = document.createElement("p");
      this.summary.className = "sr-only";
      this.summary.id = `${this.uid}_summary`;
      this.body = document.createElement("div");
      this.body.className = "cm-chart-body";
      el.append(this.legend, this.summary, this.body);
      this.observer = new ResizeObserver(() => this.schedule());
      this.observer.observe(el);
      charts.push(this);
    }
    get state() {
      const t = this.config.tools;
      const input = (name) => t && t.querySelector(`[data-chart-option="${name}"]`);
      const pattern = input("pattern");
      const label = input("label");
      const sort = t && t.querySelector("[data-chart-sort]:checked");
      return {
        patterns: pattern ? pattern.checked && !pattern.disabled : true,
        labels: label ? label.checked : true,
        sortBy: sort ? sort.value : "view",
      };
    }
    visible() {
      return this.el.offsetWidth > 0 && this.el.offsetHeight >= 0 && this.el.getClientRects().length > 0;
    }
    schedule() {
      if (this.queued) return;
      this.queued = true;
      setTimeout(() => {
        this.queued = false;
        if (!this.visible()) return;
        const w = this.body.clientWidth;
        if (!this.rendered || Math.abs(w - (this.lastWidth || 0)) > 1) this.render();
      }, 16);
    }
    context(width) {
      const st = this.state;
      const dark = isDark();
      const raw = modelOf(this.config, this.type);
      const model = this.type === "multiples" || this.type === "combo" ? raw : sortModel(raw, st.sortBy);
      if (this.type !== "combo" && this.type !== "multiples") model.series.forEach((s) => (s.name = yearLabel(s.name)));
      const ctx = {
        type: this.type,
        config: this.config,
        model,
        unit: this.config.unit,
        sets: palette(dark),
        dark,
        patterns: st.patterns,
        labels: st.labels,
        selected: this.selected,
        colors: colors(this.el),
        scale: this.scale,
        width,
        height: (this.plot && this.plot.clientHeight) || 0,
      };
      if (model.orderIndex) {
        const base = orderFor(this.config, raw, raw.series.length);
        ctx.order = model.orderIndex.map((i) => base[i % base.length]);
      }
      return ctx;
    }
    option(width) {
      const ctx = this.context(width);
      const o = BUILD[this.type](ctx);
      return { o, ctx };
    }
    dispose() {
      this.instances.forEach((c) => {
        if (c.getDom()._cmKeyboard) c.getDom()._cmKeyboard.destroy();
        c.dispose();
      });
      this.instances = [];
    }
    render() {
      if (!this.visible()) return;
      this.rendered = true;
      this.lastWidth = this.body.clientWidth;
      if (this.type === "multiples") {
        this.renderPanels();
        return;
      }
      if (!this.plot) {
        this.body.innerHTML = "";
        this.plot = document.createElement("div");
        this.plot.className = "cm-chart-plot";
        this.plot.setAttribute("role", "group");
        this.plot.setAttribute("aria-label", this.config.title);
        this.plot.setAttribute("aria-describedby", this.summary.id);
        if (this.config.height) this.plot.style.height = this.config.height;
        this.body.appendChild(this.plot);
      }
      const { o, ctx } = this.option(this.plot.clientWidth || this.body.clientWidth);
      let chart = this.instances[0];
      if (!chart || chart.isDisposed()) {
        chart = echarts.init(this.plot, null, { renderer: "svg" });
        this.instances = [chart];
      }
      chart._cmUnit = ctx.unit;
      chart.setOption(o, { notMerge: true });
      chart.resize();
      keyboard(chart, this.plot, this.config.title);
      if (this.plot._cmKeyboard) this.plot._cmKeyboard.sync();
      this.renderLegend(o, ctx);
      this.renderSummary(ctx);
    }
    renderPanels() {
      const ctx = this.context(this.body.clientWidth);
      const { model } = ctx;
      const same = this.panelKey === model.series.map((s) => s.name).join("|") && this.instances.length;
      if (!same) {
        this.dispose();
        this.body.innerHTML = "";
        const list = document.createElement("div");
        list.className = "cm-chart-panels";
        model.series.forEach((s, i) => {
          const card = document.createElement("section");
          card.className = "cm-chart-panel";
          const head = document.createElement("h4");
          head.className = "cm-chart-panel-tit";
          head.id = `${this.uid}_panel_${i}`;
          const plot = document.createElement("div");
          plot.className = "cm-chart-plot";
          plot.setAttribute("role", "group");
          plot.setAttribute("aria-labelledby", head.id);
          card.append(head, plot);
          list.appendChild(card);
        });
        this.body.appendChild(list);
        this.panelKey = model.series.map((s) => s.name).join("|");
      }
      const cards = [...this.body.querySelectorAll(".cm-chart-panel")];
      model.series.forEach((s, i) => {
        const card = cards[i];
        const plot = card.querySelector(".cm-chart-plot");
        const li = s.data.reduce((a, v, k) => (v != null ? k : a), -1);
        card.querySelector(".cm-chart-panel-tit").innerHTML = `${esc(s.name)} · <b>${esc(fmtValue(s.data[li], s.unit || ctx.unit))}</b>`;
        let chart = this.instances[i];
        if (!chart || chart.isDisposed()) {
          chart = echarts.init(plot, null, { renderer: "svg" });
          this.instances[i] = chart;
        }
        chart._cmUnit = s.unit || ctx.unit;
        chart.setOption(BUILD.panel(ctx, s), { notMerge: true });
        chart.resize();
        keyboard(chart, plot, `${this.config.title} - ${s.name}`);
      });
      this.legend.hidden = true;
      this.renderSummary(ctx);
    }
    /* HTML 범례 : 버튼(aria-pressed) + 견본, 숨긴 항목이 있으면 '전체 보기' */
    renderLegend(o, ctx) {
      const names = (o.legend && o.legend.data) || [];
      this.legend.innerHTML = "";
      this.legend.hidden = names.length < 2 && !this.config.legend;
      if (this.legend.hidden) return;
      names.forEach((name) => {
        const on = this.selected[name] !== false;
        const s = o.series.find((x) => x.name === name);
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "cm-chart-legend-item";
        btn.setAttribute("aria-pressed", String(on));
        const img = document.createElement("img");
        img.alt = "";
        img.className = "cm-chart-legend-swatch";
        if (s.type === "line") {
          img.src = lineSwatch(s.lineStyle.color, s._lineStyle || LINE_STYLES[0]);
          img.classList.add("line");
        } else img.src = barSwatch(s._set, ctx.patterns);
        const label = document.createElement("span");
        label.textContent = name;
        const state = document.createElement("span");
        state.className = "sr-only";
        state.textContent = on ? " 표시 중" : " 숨김";
        btn.append(img, label, state);
        btn.addEventListener("click", () => {
          this.selected[name] = !on;
          this.render();
          const again = [...this.legend.querySelectorAll(".cm-chart-legend-item")].find((b) => b.textContent.indexOf(name) === 0);
          if (again) again.focus();
          live(`${name} ${on ? "숨김" : "표시"}`);
        });
        this.legend.appendChild(btn);
      });
      const hiddenCount = names.filter((n) => this.selected[n] === false).length;
      if (hiddenCount) {
        const all = document.createElement("button");
        all.type = "button";
        all.className = "cm-chart-legend-all";
        all.textContent = "전체 보기";
        all.setAttribute("aria-label", `범례 전체 보기. 숨긴 항목 ${hiddenCount}개를 모두 다시 표시`);
        all.addEventListener("click", () => {
          this.selected = {};
          this.render();
          const first = this.legend.querySelector(".cm-chart-legend-item");
          if (first) first.focus();
          live("숨긴 범례 항목을 모두 다시 표시했습니다.");
        });
        this.legend.appendChild(all);
      }
    }
    /* 스크린리더 요약 : 제목 · 그래프 종류 · 앞쪽 값 (자세한 값은 통계표) */
    renderSummary(ctx) {
      const { model } = ctx;
      const parts = model.categories.slice(0, 8).map((c, k) => {
        const vals = model.series
          .map((s) => {
            const raw = s.texts && s.texts[k];
            return `${model.series.length > 1 ? `${s.name} ` : ""}${raw && s.data[k] != null ? (ctx.unit === "%" && !/%$/.test(raw) ? `${raw}%` : raw) : fmtValue(s.data[k], ctx.unit)}`;
          })
          .join(", ");
        return `${this.type === "combo" || this.type === "multiples" ? c : yearLabel(c)}: ${vals}`;
      });
      const more = model.categories.length > 8 ? " 등" : "";
      this.summary.textContent = `${this.config.title}, ${TYPE_NAME[this.type] || "그래프"}. ${parts.join(". ")}${more}. 자세한 값은 통계표를 참고하세요.`;
    }
    /* 내보내기·확대·인쇄용 옵션 : 제목 · 범례 · 출처를 그래프 안에 함께 그림 */
    exportOption(width, height) {
      if (this.type === "multiples") return this.combinedOption(width);
      const { o, ctx } = this.option(width);
      const names = (o.legend.data || []).filter((n) => n);
      const showLegend = names.length > 1;
      const top = showLegend ? 88 : 52;
      o.backgroundColor = ctx.colors.surface;
      o.title = [{ text: this.config.title, left: 16, top: 12, textStyle: { fontSize: 17, fontWeight: 700, color: ctx.colors.strong, fontFamily: ctx.colors.font } }];
      o.legend = { show: showLegend, data: names, selected: Object.assign({}, this.selected), top: 48, left: "center", itemWidth: 28, itemHeight: 14, itemGap: 16, textStyle: { fontSize: 13, color: ctx.colors.text } };
      const grids = Array.isArray(o.grid) ? o.grid : [o.grid];
      grids.forEach((g) => {
        g.top = (g.top || 0) + top;
        g.bottom = (g.bottom || 0) + 32;
      });
      if (this.config.source) o.graphic = [{ type: "text", left: 16, bottom: 10, silent: true, style: { text: this.config.source, fontSize: 12, fill: ctx.colors.sub, fontFamily: ctx.colors.font } }];
      return { option: o, width, height: (height || this.plot.clientHeight) + top + 32 };
    }
    /* 스몰 멀티플 한 장 그림 : 패널 카드를 2열로 (sm-trend-v63 combined) */
    combinedOption(width) {
      const ctx = this.context(width);
      const { model } = ctx;
      const cols = 2;
      const gap = 24;
      const pad = 16;
      const headH = 48;
      const plotH = 260;
      const top = 52;
      const rows = Math.ceil(model.series.length / cols);
      const pw = (width - pad * 2 - gap * (cols - 1)) / cols;
      const o = { animation: false, backgroundColor: ctx.colors.surface, textStyle: { fontFamily: ctx.colors.font }, title: [], grid: [], xAxis: [], yAxis: [], series: [], graphic: [] };
      o.title.push({ text: this.config.title, left: pad, top: 12, textStyle: { fontSize: 17, fontWeight: 700, color: ctx.colors.strong } });
      model.series.forEach((s, i) => {
        const x = pad + (i % cols) * (pw + gap);
        const y = top + Math.floor(i / cols) * (headH + plotH + gap);
        const li = s.data.reduce((a, v, k) => (v != null ? k : a), -1);
        o.graphic.push(
          { type: "rect", silent: true, z: -30, shape: { x: x + 0.5, y: y + 0.5, width: pw - 1, height: headH + plotH - 1, r: 12 }, style: { fill: ctx.colors.surface, stroke: ctx.colors.border, lineWidth: 1 } },
          { type: "line", silent: true, z: -28, shape: { x1: x + 1, y1: y + headH + 0.5, x2: x + pw - 1, y2: y + headH + 0.5 }, style: { stroke: ctx.colors.border, lineWidth: 1 } },
        );
        o.title.push({
          text: `{n|${s.name} · }{v|${fmtValue(s.data[li], s.unit || ctx.unit)}}`,
          left: x + pw / 2,
          top: y + headH / 2,
          textAlign: "center",
          textVerticalAlign: "middle",
          textStyle: { rich: { n: { fontSize: 15, fontWeight: 700, color: ctx.colors.text }, v: { fontSize: 15, fontWeight: 700, color: ctx.sets[6].bg } } },
        });
        const p = BUILD.panel(ctx, s);
        o.grid.push({ left: x + 16, width: pw - 56, top: y + headH + 24, height: plotH - 48, containLabel: true });
        o.xAxis.push(Object.assign(p.xAxis, { gridIndex: i }));
        o.yAxis.push(Object.assign(p.yAxis, { gridIndex: i, splitNumber: 4 }));
        o.series.push(Object.assign(p.series[0], { xAxisIndex: i, yAxisIndex: i }));
      });
      let height = top + rows * (headH + plotH) + gap * (rows - 1) + pad;
      if (this.config.source) {
        o.graphic.push({ type: "text", left: pad, top: height, silent: true, style: { text: this.config.source, fontSize: 12, fill: ctx.colors.sub } });
        height += 28;
      }
      return { option: o, width, height };
    }
    toImage(renderer, done) {
      const width = Math.max(720, Math.round(this.body.clientWidth || 960));
      const { option, height } = this.exportOption(width, this.plot ? this.plot.clientHeight : 400);
      const box = document.createElement("div");
      box.style.cssText = `position:fixed;left:-99999px;top:0;width:${width}px;height:${height}px`;
      document.body.appendChild(box);
      const tmp = echarts.init(box, null, { renderer, width, height });
      try {
        tmp.setOption(option, { notMerge: true, silent: true });
        return done(tmp, box);
      } finally {
        tmp.dispose();
        box.remove();
      }
    }
    fileName(ext) {
      return `${this.config.title.replace(/[\\/:*?"<>|]/g, "").replace(/\s+/g, "_")}.${ext}`;
    }
    download(kind) {
      const save = (url, name) => {
        const a = document.createElement("a");
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
      };
      if (kind === "png") this.toImage("canvas", (t) => save(t.getDataURL({ type: "png", pixelRatio: 2, backgroundColor: colors(this.el).surface }), this.fileName("png")));
      if (kind === "svg")
        this.toImage("svg", (t) => {
          let str = t.renderToSVGString();
          if (str.indexOf("<?xml") !== 0) str = `<?xml version="1.0" encoding="UTF-8"?>\n${str}`;
          save(URL.createObjectURL(new Blob([str], { type: "image/svg+xml;charset=utf-8" })), this.fileName("svg"));
        });
      if (kind === "csv") {
        const lines = [];
        if (this.config.table) {
          const table = this.config.table;
          const head = [...table.querySelectorAll("thead tr:last-child th")].map((th) => th.textContent.replace(/\s+/g, " ").trim());
          lines.push(head);
          table.querySelectorAll("tbody tr").forEach((tr) => lines.push([...tr.children].map((td) => td.textContent.replace(/\s+/g, " ").trim().replace(/,(?=\d{3})/g, ""))));
        } else {
          const model = modelOf(this.config, this.type);
          lines.push(["구분"].concat(model.categories));
          model.series.forEach((s) => lines.push([s.name].concat(s.data.map((v) => (v == null ? "" : v)))));
        }
        if (this.config.unit) lines.unshift([`단위 : ${this.config.unit}`]);
        if (this.config.source) lines.push([], [this.config.source]);
        const text = `﻿${lines.map((r) => r.map((v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : v)).join(",")).join("\r\n")}`;
        save(URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" })), this.fileName("csv"));
      }
    }
    print() {
      const url = this.toImage("canvas", (t) => t.getDataURL({ type: "png", pixelRatio: 2, backgroundColor: "#FFFFFF" }));
      const frame = document.createElement("iframe");
      frame.setAttribute("aria-hidden", "true");
      frame.tabIndex = -1;
      frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
      document.body.appendChild(frame);
      const doc = frame.contentDocument;
      doc.open();
      doc.write(
        `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>${esc(this.config.title)}</title>` +
          `<style>@page{size:landscape;margin:15mm}body{margin:0;font-family:${esc(colors(this.el).font)}}img{width:100%;height:auto}</style></head>` +
          `<body><img src="${url}" alt="${esc(this.config.title)}"></body></html>`,
      );
      doc.close();
      const img = doc.querySelector("img");
      const go = () => {
        frame.contentWindow.focus();
        frame.contentWindow.print();
        setTimeout(() => frame.remove(), 1000);
      };
      if (img.complete) setTimeout(go, 50);
      else img.addEventListener("load", go);
    }
  }

  /* ------------------------------------------------------------------
     8. 화면 연결 : data 속성 읽기 · 도구(토글·버튼) · 확대 모달 · 화면 모드
     ------------------------------------------------------------------ */
  const configOf = (el) => {
    const d = el.dataset;
    const pick = (sel) => (sel ? document.querySelector(sel) : null);
    const source = pick(d.chartSource);
    let data = null;
    if (d.chartData) {
      const node = pick(d.chartData);
      if (node) data = JSON.parse(node.textContent);
    }
    return {
      type: d.cmChart,
      title: d.chartTitle || "통계 그래프",
      table: pick(d.chartTable),
      data,
      unit: d.chartUnit || "",
      tools: pick(d.chartTools),
      seriesFrom: d.chartSeries || "",
      palette: d.chartPalette ? d.chartPalette.split(",").map(Number) : null,
      growthSkip: d.chartGrowthSkip ? d.chartGrowthSkip.split(",").map((x) => x.trim()) : null,
      height: d.chartHeight || "",
      source: source ? source.textContent.replace(/\s+/g, " ").trim() : "",
      legend: d.chartLegend === "true",
    };
  };
  const visibleChart = (tools) => charts.find((c) => c.config.tools === tools && !c.zoom && c.visible()) || charts.find((c) => c.config.tools === tools && !c.zoom);

  /* 도구 하나에 그래프 여러 개가 묶일 수 있음 (특수교육 현황 : 계·배치별·급별·장애유형별) */
  const bindTools = (tools) => {
    if (!tools || tools._cmBound) return;
    tools._cmBound = true;
    const pattern = tools.querySelector('[data-chart-option="pattern"]');
    const label = tools.querySelector('[data-chart-option="label"]');
    const rerender = () => charts.filter((c) => c.config.tools === tools || (c.zoom && c.source && c.source.config.tools === tools)).forEach((c) => c.rendered && c.render());
    /* 패턴 적용 · 레이블 보기는 서로 영향을 주지 않고 각각 켜고 끔
       (둘 다 꺼서 색만 남아도 값은 그래프 아래 통계표와 그래프 안 키보드 탐색으로 확인 가능) */
    [pattern, label].forEach((input) => input && input.addEventListener("change", rerender));
    tools.querySelectorAll("[data-chart-sort]").forEach((radio) => radio.addEventListener("change", rerender));
    /* 그래프 종류 버튼 : aria-pressed · KRDS secondary/tertiary 전환 */
    const typeButtons = [...tools.querySelectorAll("[data-chart-type]")];
    typeButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        typeButtons.forEach((b) => {
          const on = b === btn;
          b.setAttribute("aria-pressed", String(on));
          b.classList.toggle("secondary", on);
          b.classList.toggle("tertiary", !on);
        });
        charts
          .filter((c) => c.config.tools === tools && !c.zoom)
          .forEach((c) => {
            c.type = btn.dataset.chartType;
            c.config.type = c.type;
            c.dispose();
            c.render();
          });
        live(`${btn.textContent.trim()}로 바꿨습니다.`);
      });
    });
    tools.querySelectorAll("[data-chart-action]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const chart = visibleChart(tools);
        if (!chart) return;
        const action = btn.dataset.chartAction;
        if (action === "zoom") openZoom(chart, btn);
        if (action === "print") chart.print();
      });
    });
    tools.querySelectorAll("[data-chart-download]").forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const chart = visibleChart(tools);
        if (chart) chart.download(link.dataset.chartDownload);
        const drop = link.closest(".krds-drop-wrap");
        const opener = drop && drop.querySelector(".drop-btn.active");
        if (opener) opener.click();
      });
    });
  };

  /* 차트 확대 : kr/tmpl/modal.html #modal_chart_zoom (KRDS 모달) 안에 같은 그래프를 크게 다시 그림, 글자 크기 5단계 */
  const FONT_LEVELS = [0.9, 1, 1.2, 1.4, 1.6];
  let zoomChart = null;
  const openZoom = (chart, trigger) => {
    const modal = document.getElementById("modal_chart_zoom");
    if (!modal || typeof krds_modal === "undefined") return; // eslint-disable-line no-undef
    const body = modal.querySelector(".cm-chart-zoom-body");
    const title = modal.querySelector(".modal-title");
    title.textContent = chart.config.title;
    if (zoomChart) {
      zoomChart.dispose();
      charts.splice(charts.indexOf(zoomChart), 1);
    }
    body.innerHTML = "";
    const host = document.createElement("div");
    body.appendChild(host);
    const level = Number(modal.dataset.fontLevel || 1);
    zoomChart = new CmChart(host, Object.assign({}, chart.config, { type: chart.type, selected: chart.selected, scale: FONT_LEVELS[level], height: "" }));
    zoomChart.zoom = true;
    zoomChart.source = chart;
    trigger.setAttribute("data-modal-id", modal.id);
    trigger.classList.add("modal-opened");
    krds_modal.openModal(modal.id); // eslint-disable-line no-undef
    setTimeout(() => zoomChart && zoomChart.render(), 200);
  };
  const bindZoomModal = () => {
    const modal = document.getElementById("modal_chart_zoom");
    if (!modal) return;
    const levelText = modal.querySelector(".cm-chart-zoom-level");
    const setLevel = (n) => {
      const level = Math.max(0, Math.min(FONT_LEVELS.length - 1, n));
      modal.dataset.fontLevel = level;
      levelText.textContent = `${Math.round(FONT_LEVELS[level] * 100)}%`;
      modal.querySelector('[data-chart-font="down"]').disabled = level === 0;
      modal.querySelector('[data-chart-font="up"]').disabled = level === FONT_LEVELS.length - 1;
      if (zoomChart) {
        zoomChart.scale = FONT_LEVELS[level];
        zoomChart.render();
      }
    };
    modal.querySelectorAll("[data-chart-font]").forEach((btn) =>
      btn.addEventListener("click", () => setLevel(Number(modal.dataset.fontLevel || 1) + (btn.dataset.chartFont === "up" ? 1 : -1))),
    );
    setLevel(1);
    /* 모달이 닫히면 확대 그래프 정리, 범례 선택은 원래 그래프에 돌려줌 */
    new MutationObserver(() => {
      if (!modal.classList.contains("shown") && zoomChart) {
        const src = zoomChart.source;
        src.selected = Object.assign({}, zoomChart.selected);
        zoomChart.dispose();
        charts.splice(charts.indexOf(zoomChart), 1);
        zoomChart = null;
        src.render();
      }
    }).observe(modal, { attributes: true, attributeFilter: ["class"] });
  };

  /* 화면 모드(data-krds-mode) · 시스템 다크 전환 시 다시 그림 */
  const watchMode = () => {
    const redraw = () => requestAnimationFrame(() => charts.forEach((c) => c.rendered && c.render()));
    new MutationObserver(redraw).observe(document.documentElement, { attributes: true, attributeFilter: ["data-krds-mode", "data-krds-theme", "data-krds-scale", "style", "class"] });
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", redraw);
  };

  const init = () => {
    document.querySelectorAll("[data-cm-chart]").forEach((el) => {
      if (el._cmChart) return;
      const config = configOf(el);
      el._cmChart = new CmChart(el, config);
      bindTools(config.tools);
    });
    bindZoomModal();
    watchMode();
    charts.forEach((c) => c.schedule());
  };
  window.addEventListener("load", () => charts.forEach((c) => c.schedule()));
  window.CmChart = { init, charts };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
