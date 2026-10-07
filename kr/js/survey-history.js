/* ==========================================================================
   조사 변천사 : 엑셀 파일을 읽어 목록 · 상세 그리기
   - 화면 : kr/html/stat/survey_history_list.html · survey_history_view.html?id=번호
   - 데이터 : kr/data/survey_history/survey_history.xlsx (시트 3개 : 차수 · 조사대상자 · 문항)
       서버의 이 엑셀 파일만 바꾸면 화면이 바뀝니다. 따로 변환할 것이 없습니다. (적는 방법 : kr/data/survey_history/README.md)
       엑셀은 _common/resources/js/cm-xlsx.js (CmXlsx) 가 읽습니다. 이 파일보다 먼저 불러와야 합니다.
   - 문항 수 합계 · 영역 수 · 묶음의 종 수 · 요약 문구 · 이전글/다음글은 엑셀에 적지 않고 여기서 계산합니다.
   - 엑셀에 잘못 적힌 줄이 있으면 화면에는 "불러오지 못했습니다" 안내만 보이고, 원인(어느 시트 몇 번째 줄)은
       · 브라우저 개발자 도구의 콘솔
       · 주소 끝에 ?check=1 을 붙였을 때 화면
     에 나옵니다. 운영 서버에 올리기 전에 개발 서버에서 ?check=1 로 확인하세요.
   - 마크업은 퍼블리싱된 조사 변천사 list · view (Figma: 컨텐츠 > s01통계정보_조사 변천사 list / view) 그대로입니다.
   - KRDS 스크립트(ui-script.js)가 탭을 초기화하기 전에 탭 · 패널이 만들어져 있어야 하므로
     include.js 다음, KRDS 스크립트보다 먼저 불러오고 동기 방식으로 읽습니다. (include.js 와 같은 방식)
   ========================================================================== */
(() => {
  const script = document.currentScript;
  const source = new URL("../data/survey_history/survey_history.xlsx", script.src).href;
  const SITE = "특수교육 실태조사 데이터 활용 플랫폼";
  const TAG_MAX = 6; // 카드에 보이는 영역 태그 수 (넘으면 '외 N개')
  const CHECK = new URLSearchParams(location.search).has("check"); // ?check=1 : 엑셀 오류 원인을 화면에 보여 줌

  const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const two = (n) => String(n).padStart(2, "0");
  const roundName = (r) => `제${r.round}차(${r.year}년)`;

  /* ------------------------------------------------------------------
     엑셀 → 화면용 데이터
       { index : { rounds : [차수 · 개요 · 카드] }, rounds : { 차수 : 상세(조사대상자별 표) } }
     ------------------------------------------------------------------ */
  const SHEETS = {
    차수: ["차수", "연도", "상태", "기준", "영역 이름", "묶음 단위", "문항 단위", "조사 부분", "안내", "출처"],
    조사대상자: ["번호", "차수", "묶음", "순서", "조사대상자", "문항수"],
    문항: ["번호", "순서", "영역", "세부 조사 문항", "문항수", "주석"],
  };
  // 엑셀 내용이 잘못된 경우의 오류 (어느 시트 몇 번째 줄인지 담음)
  class DataError extends Error {}
  const asInt = (value, sheet, row, name, required = true) => {
    if (value === "") {
      if (required) throw new DataError(`[${sheet}] ${row}번째 줄 : '${name}' 칸이 비어 있습니다.`);
      return null;
    }
    const number = Number(value);
    if (Number.isNaN(number)) throw new DataError(`[${sheet}] ${row}번째 줄 : '${name}' 칸은 숫자여야 합니다. (지금 값 : ${value})`);
    if (!Number.isInteger(number)) throw new DataError(`[${sheet}] ${row}번째 줄 : '${name}' 칸은 소수점 없는 숫자여야 합니다. (지금 값 : ${value})`);
    return number;
  };
  const build = (book) => {
    Object.entries(SHEETS).forEach(([sheet, columns]) => {
      if (!(sheet in book)) throw new DataError(`엑셀에 '${sheet}' 시트가 없습니다.`);
      if (book[sheet].length) {
        const missing = columns.filter((c) => !(c in book[sheet][0]));
        if (missing.length) throw new DataError(`[${sheet}] 첫 줄(제목 줄)에 다음 열이 없습니다 : ${missing.join(", ")}`);
      }
    });
    // 1) 차수
    const rounds = new Map();
    book["차수"].forEach((r) => {
      const n = asInt(r["차수"], "차수", r._row, "차수");
      if (rounds.has(n)) throw new DataError(`[차수] ${r._row}번째 줄 : 차수 ${n} 이(가) 두 번 적혀 있습니다.`);
      const state = r["상태"] || "공개";
      if (state !== "공개" && state !== "예정") throw new DataError(`[차수] ${r._row}번째 줄 : '상태' 칸은 공개 또는 예정이어야 합니다. (지금 값 : ${state})`);
      rounds.set(n, {
        round: n,
        year: asInt(r["연도"], "차수", r._row, "연도"),
        open: state === "공개",
        axis: r["기준"] === "부문" ? "조사 부문" : "조사 대상자",
        areaWord: r["영역 이름"] || "영역",
        groupUnit: r["묶음 단위"] || "종",
        unit: r["문항 단위"] || "문항",
        parts: r["조사 부분"].split(/\r?\n/).map((line) => line.trim()).filter(Boolean),
        note: r["안내"],
        source: r["출처"],
        targets: [],
      });
    });
    // 2) 조사대상자
    const targets = new Map();
    book["조사대상자"].forEach((t) => {
      const id = asInt(t["번호"], "조사대상자", t._row, "번호");
      const n = asInt(t["차수"], "조사대상자", t._row, "차수");
      if (targets.has(id)) throw new DataError(`[조사대상자] ${t._row}번째 줄 : 번호 ${id} 이(가) 두 번 적혀 있습니다.`);
      if (!rounds.has(n)) throw new DataError(`[조사대상자] ${t._row}번째 줄 : 차수 ${n} 이(가) '차수' 시트에 없습니다.`);
      if (!t["조사대상자"]) throw new DataError(`[조사대상자] ${t._row}번째 줄 : '조사대상자' 칸이 비어 있습니다.`);
      const target = {
        id,
        group: t["묶음"],
        order: asInt(t["순서"], "조사대상자", t._row, "순서"),
        label: t["조사대상자"],
        fixedTotal: asInt(t["문항수"], "조사대상자", t._row, "문항수", false),
        row: t._row,
        areas: [],
      };
      targets.set(id, target);
      rounds.get(n).targets.push(target);
    });
    // 3) 문항 (표의 행)
    book["문항"].forEach((q) => {
      const id = asInt(q["번호"], "문항", q._row, "번호");
      if (!targets.has(id)) throw new DataError(`[문항] ${q._row}번째 줄 : 번호 ${id} 이(가) '조사대상자' 시트에 없습니다.`);
      if (!q["영역"]) throw new DataError(`[문항] ${q._row}번째 줄 : '영역' 칸이 비어 있습니다.`);
      targets.get(id).areas.push({
        order: asInt(q["순서"], "문항", q._row, "순서"),
        name: q["영역"],
        detail: q["세부 조사 문항"],
        count: asInt(q["문항수"], "문항", q._row, "문항수", false),
        note: q["주석"],
      });
    });
    // 4) 계산 : 합계 · 영역 수 · 묶음 · 요약 문구 · 이전글/다음글
    const data = { index: { rounds: [] }, rounds: {} };
    [...rounds.keys()].sort((a, b) => a - b).forEach((n) => {
      const rd = rounds.get(n);
      rd.targets.sort((a, b) => a.order - b.order);
      rd.targets.forEach((t) => {
        t.areas.sort((a, b) => a.order - b.order);
        if (rd.open && !t.areas.length) throw new DataError(`[문항] 번호 ${t.id} (${t.label}) 의 문항 줄이 하나도 없습니다.`);
        // 문항 수 : 문항 시트의 영역별 문항수를 더함. 영역별 문항수가 없는 차수는 조사대상자 시트의 문항수를 씀
        const counted = t.areas.reduce((sum, a) => sum + (a.count || 0), 0);
        if (t.fixedTotal !== null && counted && t.fixedTotal !== counted) {
          throw new DataError(`[조사대상자] ${t.row}번째 줄 : 문항수 ${t.fixedTotal} 이(가) 문항 시트의 합계 ${counted} 과(와) 다릅니다. 한쪽을 고치거나 이 칸을 비워 주세요.`);
        }
        t.total = t.fixedTotal !== null ? t.fixedTotal : counted;
      });
      const total = rd.targets.reduce((sum, t) => sum + t.total, 0);
      const areas = rd.targets.reduce((sum, t) => sum + t.areas.length, 0);
      const head = {
        round: rd.round,
        year: rd.year,
        open: rd.open,
        areaWord: rd.areaWord,
        groupUnit: rd.groupUnit,
        unit: rd.unit,
        parts: rd.parts,
        note: rd.note,
        summary: rd.targets.length ? `${rd.axis} ${rd.targets.length}개·${rd.areaWord} ${areas}개·총 ${total}${rd.unit}` : "",
      };
      const groups = [];
      rd.targets.forEach((t) => {
        if (!groups.length || groups[groups.length - 1].title !== t.group) groups.push({ title: t.group, targets: [] });
        groups[groups.length - 1].targets.push(t);
      });
      // 목록용 : 카드에 필요한 값만
      data.index.rounds.push({
        ...head,
        groups: groups.map((g) => ({
          title: g.title,
          targets: g.targets.map((t) => ({ id: t.id, label: t.label, total: t.total, areas: t.areas.map((a) => ({ name: a.name, count: a.count })) })),
        })),
      });
      // 상세용 : 차수 하나의 모든 조사대상자
      if (rd.open) {
        data.rounds[n] = {
          ...head,
          source: rd.source,
          targets: rd.targets.map((t, i) => ({
            id: t.id,
            label: t.label,
            total: t.total,
            areas: t.areas.map((a) => ({ name: a.name, detail: a.detail, count: a.count, note: a.note })),
            prev: i > 0 ? rd.targets[i - 1].id : null,
            next: i < rd.targets.length - 1 ? rd.targets[i + 1].id : null,
          })),
        };
      }
    });
    return data;
  };
  // 엑셀을 읽어 화면용 데이터로. 실패하면 null 을 돌려주고 원인은 failure 에 남김
  let failure = "";
  const load = (retry = 1) => {
    try {
      return build(CmXlsx.read(source));
    } catch (error) {
      if (!(error instanceof DataError) && retry > 0) return load(retry - 1); // 연결이 잠깐 끊긴 경우를 위해 한 번 더 시도
      failure = error instanceof DataError ? `엑셀 내용을 확인해 주세요. ${error.message}` : `엑셀 파일을 읽지 못했습니다. ${error.message}`;
      console.error(`[survey-history] ${failure}`, error);
      return null;
    }
  };
  const data = typeof CmXlsx === "undefined" ? null : load();
  if (CHECK) window.cmSurveyHistory = { data, get failure() { return failure; } }; // 확인용 : 콘솔에서 읽은 결과를 볼 수 있음
  /* 불러오기 실패 안내 : 빈 상태 컴포넌트 오류 변형 (_common/html/code/ext_empty.html .cm-empty.is-error) */
  const errorBox = (title, text, button) =>
    `<div class="cm-empty is-error" role="alert"><p class="tit">${esc(title)}</p><p class="txt">${esc(text)}</p>${CHECK && failure ? `<p class="txt"><strong>확인용 안내(?check=1)</strong> : ${esc(failure)}</p>` : ""}${button}</div>`;

  /* ------------------------------------------------------------------
     목록 : 차수 탭 + 차수별 개요 · 조사대상자 카드
     ------------------------------------------------------------------ */
  const card = (round, target) => {
    const tags = target.areas.slice(0, TAG_MAX).map(
      (area) =>
        `<li><span class="krds-btn-tag">${esc(area.name)}${area.count == null ? "" : ` <span class="num">${area.count}</span><span class="sr-only">${esc(round.unit)}</span>`}</span></li>`,
    );
    const rest = target.areas.length - TAG_MAX;
    if (rest > 0) tags.push(`<li><span class="krds-btn-tag">외 ${rest}개</span></li>`);
    return `<li class="cm-survey-card">
  <h4 class="tit"><a href="survey_history_view.html?id=${target.id}"><span class="txt">${esc(target.label)}</span><i class="svg-icon ico-angle right" aria-hidden="true"></i></a></h4>
  <dl class="cm-survey-stat">
    <div class="item"><dt class="sr-only">${esc(round.unit)} 수</dt><dd><strong class="num">${target.total}</strong> ${esc(round.unit)}</dd></div>
    <div class="area"><dt>${esc(round.areaWord)}</dt><dd><strong>${target.areas.length}</strong>개</dd></div>
  </dl>
  <ul class="krds-tag-wrap medium cm-survey-tags" aria-label="${esc(round.areaWord)}별 ${esc(round.unit)} 수">${tags.join("")}</ul>
</li>`;
  };
  const panel = (round) => {
    const title = `<h2 class="cm-history-tit">${roundName(round)} 특수교육 실태조사</h2>`;
    if (!round.open) return `${title}<p class="cm-history-ready">조사 결과를 준비하고 있습니다.</p>`;
    const parts = round.parts.length
      ? `<div class="cm-history-part"><p class="tit">조사 부분 <span class="num">${round.parts.length}</span>개</p><ul class="cm-dot-list">${round.parts.map((p) => `<li>${esc(p)}</li>`).join("")}</ul></div>`
      : "";
    const groups = round.groups
      .map(
        (group) => `<div class="cm-survey-group">
  ${group.title ? `<h3 class="cm-survey-group-tit">${esc(group.title)} <span class="krds-badge bg-light-information">${group.targets.length}${esc(round.groupUnit)}</span></h3>` : `<h3 class="sr-only">조사 대상자별 ${esc(round.unit)}</h3>`}
  <ul class="cm-survey-cards">${group.targets.map((t) => card(round, t)).join("")}</ul>
</div>`,
      )
      .join("");
    return `<div class="cm-history-summary">
  ${title}
  <dl class="cm-history-meta"><dt>조사 문항</dt><dd>${esc(round.summary)}</dd></dl>
  ${round.note ? `<p class="cm-history-note">※ ${esc(round.note)}</p>` : ""}
  ${parts}
</div>${groups}`;
  };
  const renderList = (root) => {
    const tablist = root.querySelector("[role=tablist]");
    const wrap = root.querySelector(".tab-conts-wrap");
    const index = data && data.index;
    if (!index || !index.rounds.length) {
      root.querySelector(".tab").hidden = true;
      wrap.innerHTML = errorBox("목록을 불러오지 못했습니다.", "잠시 후 다시 시도해 주세요.", `<button type="button" class="krds-btn large tertiary" onclick="location.reload()">다시시도</button>`);
      return;
    }
    // 처음 보여 줄 차수 : 주소의 ?round=N, 없으면 공개된 차수 중 가장 최근
    const open = index.rounds.filter((r) => r.open);
    const wanted = Number(new URLSearchParams(location.search).get("round"));
    const active = open.find((r) => r.round === wanted) || open[open.length - 1] || index.rounds[0];
    tablist.innerHTML = index.rounds
      .map((r) => {
        const on = r === active;
        const id = two(r.round);
        return `<li id="tab_history_${id}" role="tab" aria-selected="${on}" aria-controls="panel_history_${id}"${on ? ' class="active"' : ""}>
  <button type="button" class="btn-tab"${r.open ? "" : " disabled"}>${r.year}년 <span class="sub">${r.open ? `제${r.round}차` : "예정"}</span></button>
</li>`;
      })
      .join("");
    wrap.innerHTML = index.rounds
      .map((r) => {
        const id = two(r.round);
        return `<section id="panel_history_${id}" aria-labelledby="tab_history_${id}" class="tab-conts${r === active ? " active" : ""}" data-quick-nav="false">${panel(r)}</section>`;
      })
      .join("");
  };

  /* ------------------------------------------------------------------
     상세 : 조사대상자 한 종의 조사 문항 표 (주소 ?id=번호, 번호 = 차수×100 + 순서)
     ------------------------------------------------------------------ */
  const renderView = (root) => {
    const id = Number(new URLSearchParams(location.search).get("id"));
    // 번호가 어느 차수의 것인지는 데이터에서 찾음 (번호 = 차수×100 + 순서 로 매기지만 계산에 기대지 않음)
    const round = (id && data && Object.values(data.rounds).find((r) => r.targets.some((t) => t.id === id))) || null;
    const target = round ? round.targets.find((t) => t.id === id) : null;
    if (!target) {
      document.title = `조사 변천사 | 통계정보 | ${SITE}`;
      root.querySelectorAll("#section_01, #section_02, .page-btn-wrap, .krds-in-page-navigation-type").forEach((el) => el.remove());
      root.insertAdjacentHTML(
        "afterbegin",
        errorBox("조사 문항을 불러오지 못했습니다.", "주소가 바뀌었거나 없는 자료입니다. 목록에서 다시 선택해 주세요.", `<a href="survey_history_list.html" class="krds-btn large tertiary">목록으로</a>`),
      );
      return;
    }
    const name = roundName(round);
    const countHead = round.unit === "문항" ? "문항수" : `${round.unit}수`;
    // 화면 제목 · 브레드크럼 · 콘텐츠 내 탐색 제목
    document.title = `${target.label} - ${name} 조사 변천사 | 통계정보 | ${SITE}`;
    const crumb = document.querySelector(".cm-page-top .breadcrumb");
    if (crumb) crumb.insertAdjacentHTML("beforeend", `<li><a href="survey_history_view.html?id=${target.id}" class="txt" aria-current="page">${esc(target.label)}</a></li>`);
    const quick = root.querySelector(".quick-title");
    if (quick) quick.textContent = target.label;
    // 개요
    root.querySelector("#section_01 .tit").textContent = target.label;
    root.querySelector("#section_01 .count").innerHTML = `<strong class="num">${target.total}</strong> ${esc(round.unit)}`;
    // 조사 문항 표
    const question = root.querySelector("#section_02");
    question.querySelector(".cm-survey-question-top .tit").textContent = `${target.label} 조사 ${round.unit}`;
    question.querySelector(".cm-survey-question-top .desc").textContent = `${name} · ${round.summary}`;
    question.querySelector("caption").textContent = `${name} ${target.label} 조사 ${round.unit} 표로 ${round.areaWord}, 세부 조사 ${round.unit}, ${countHead}로 구성되어 있습니다.`;
    const heads = question.querySelectorAll("thead th");
    heads[0].textContent = round.areaWord;
    heads[1].textContent = `세부 조사 ${round.unit}`;
    heads[2].textContent = countHead;
    question.querySelector("tbody").innerHTML = target.areas
      .map(
        (area) => `<tr>
  <th scope="row">${esc(area.name)}</th>
  <td>${area.detail ? esc(area.detail) : "-"}${area.note ? `<p class="cm-question-note">※ ${esc(area.note)}</p>` : ""}</td>
  <td>${area.count == null ? "-" : area.count}</td>
</tr>`,
      )
      .join("");
    // 표 아래 안내 : ( ) 표기는 문항 단위로 센 차수에만 해당
    const note = question.querySelector(".cm-table-note");
    if (note) note.hidden = round.unit !== "문항";
    // 이전글 · 다음글 · 목록 (같은 차수 안에서, 처음 · 끝은 비활성)
    const buttons = root.querySelector(".page-btn-wrap");
    const link = (to, html) =>
      to ? `<a href="survey_history_view.html?id=${to}" class="krds-btn medium tertiary">${html}</a>` : `<a role="link" aria-disabled="true" class="krds-btn medium tertiary disabled">${html}</a>`;
    buttons.querySelector(".btn-wrap").innerHTML =
      link(target.prev, '<i class="svg-icon ico-angle left"></i> 이전글') + link(target.next, '다음글 <i class="svg-icon ico-angle right"></i>');
    buttons.querySelector(":scope > a").href = `survey_history_list.html?round=${round.round}`;
  };

  const list = document.querySelector(".cm-survey-history[data-survey-history]");
  if (list) renderList(list);
  const view = document.querySelector(".cm-survey-view[data-survey-history]");
  if (view) renderView(view);
})();
