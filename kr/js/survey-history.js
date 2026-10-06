/* ==========================================================================
   조사 변천사 : 데이터(JSON)로 목록 · 상세 그리기
   - 화면 : kr/html/stat/survey_history_list.html · survey_history_view.html?id=번호
   - 데이터 : kr/data/survey_history/index.json(목록) · round_N.json(상세)
       엑셀 _data/survey_history.xlsx 를 고친 뒤 `python3 _tools/build_survey_history.py` 로 다시 만듭니다.
   - 마크업은 퍼블리싱된 조사 변천사 list · view (Figma: 컨텐츠 > s01통계정보_조사 변천사 list / view) 그대로입니다.
   - KRDS 스크립트(ui-script.js)가 탭을 초기화하기 전에 탭 · 패널이 만들어져 있어야 하므로
     include.js 다음, KRDS 스크립트보다 먼저 불러오고 동기 방식으로 읽습니다. (include.js 와 같은 방식)
   - 개발 연동 시에는 서버 출력으로 바꾸고 이 파일은 쓰지 않습니다.
   ========================================================================== */
(() => {
  const script = document.currentScript;
  const dataBase = new URL("../data/survey_history/", script.src).href;
  const SITE = "특수교육 실태조사 데이터 활용 플랫폼";
  const TAG_MAX = 6; // 카드에 보이는 영역 태그 수 (넘으면 '외 N개')

  const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const two = (n) => String(n).padStart(2, "0");
  const roundName = (r) => `제${r.round}차(${r.year}년)`;
  const load = (name, retry = 1) => {
    try {
      const xhr = new XMLHttpRequest();
      xhr.open("GET", `${dataBase}${name}`, false);
      xhr.send();
      if (xhr.status !== 200) throw new Error(`HTTP ${xhr.status}`);
      return JSON.parse(xhr.responseText);
    } catch (error) {
      if (retry > 0) return load(name, retry - 1); // 연결이 잠깐 끊긴 경우를 위해 한 번 더 시도
      console.error(`[survey-history] ${name} 을 불러오지 못했습니다.`, error);
      return null;
    }
  };
  /* 불러오기 실패 안내 : 빈 상태 컴포넌트 오류 변형 (_common/html/code/ext_empty.html .cm-empty.is-error) */
  const errorBox = (title, text, button) =>
    `<div class="cm-empty is-error" role="alert"><p class="tit">${esc(title)}</p><p class="txt">${esc(text)}</p>${button}</div>`;

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
    const index = load("index.json");
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
    const round = id ? load(`round_${Math.floor(id / 100)}.json`) : null;
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
