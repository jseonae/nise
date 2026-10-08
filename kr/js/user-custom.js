/* 사용자 추가 스크립트 */

/* 공유하기 팝업(.cm-share) : SNS 공유 · 페이지 주소 복사
   팝업 열기/닫기는 KRDS 맥락적 도움말 스크립트(ui-script.js krds_contextualHelp)가 처리합니다. */
document.addEventListener("click", (event) => {
  const button = event.target.closest(".cm-share .cm-share-btn");
  if (!button) return;

  const url = encodeURIComponent(location.href);
  const title = encodeURIComponent(document.title);
  const shareUrls = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
    x: `https://twitter.com/intent/tweet?url=${url}&text=${title}`,
    band: `https://band.us/plugin/share?body=${title}%0A${url}&route=${encodeURIComponent(location.hostname)}`,
    naver_blog: `https://blog.naver.com/openapi/share?url=${url}&title=${title}`,
  };
  const type = button.dataset.share;

  if (type === "url") {
    event.preventDefault();
    const done = () => alert("페이지 주소가 복사되었습니다.");
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(location.href).then(done);
    } else {
      const input = document.createElement("textarea");
      input.value = location.href;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      input.remove();
      done();
    }
    return;
  }
  if (shareUrls[type]) button.setAttribute("href", shareUrls[type]);
});

/* [퍼블리싱 확인용] 시계열 시각화 목록 칩 (kr/html/stat/timeseries_list.html)
   고른 탭(주제별 · 조사대상자별)의 고른 칩에 맞춰 아래 목록을 바꿔 보여 줍니다. 개발 시 서버 조회로 바꾸고 이 코드는 지웁니다.
   - 주제별 : 전체는 data-all 카드(Figma 시계열시각화-list), 그 밖은 data-topic 이 같은 카드(Figma 시계열시각화-list-교육과정)
   - 조사대상자별 : 카드가 아직 없음
   - 보여 줄 카드가 없으면 목록 · 페이지네이션 대신 목록 불러오기 실패 안내([data-ts-error])를 보여 줌 (Figma s03알림마당_자료실 list-목록불러오기 실패)
   - 목록 상단의 개수 · 페이지 수는 고른 칩의 data-total · data-pages */
const cmTsFilter = {
  init() {
    const root = document.querySelector(".cm-timeseries");
    const cards = document.querySelectorAll(".cm-ts-list > .cm-ts-card");
    const panels = root ? root.querySelectorAll(".cm-ts-filter .tab-conts, .krds-tab-area .tab-conts") : [];
    if (!root || !cards.length || !panels.length) return;
    const list = root.querySelector(".cm-ts-list");
    const error = root.querySelector("[data-ts-error]");
    const paging = root.querySelector(".krds-pagination");
    const count = root.querySelector(".cm-board-count");
    const apply = () => {
      const panel = [...panels].find((item) => item.classList.contains("active")) || panels[0];
      const radio = panel.querySelector("input[type=radio]:checked");
      if (!radio) return;
      const byTopic = radio.name === "ts_topic";
      cards.forEach((card) => {
        card.hidden = !byTopic || (radio.value === "all" ? card.dataset.all !== "y" : card.dataset.topic !== radio.value);
      });
      const empty = ![...cards].some((card) => !card.hidden);
      if (list) list.hidden = empty;
      if (error) error.hidden = !empty;
      if (paging) paging.hidden = empty;
      if (count) {
        count.querySelector(".total .num").textContent = radio.dataset.total;
        count.querySelector(".page .last").textContent = radio.dataset.pages;
      }
    };
    root.querySelectorAll('input[name="ts_topic"], input[name="ts_target"]').forEach((radio) => radio.addEventListener("change", apply));
    // 탭 전환 : KRDS 탭이 패널의 active 를 바꾼 뒤에 다시 맞춤
    panels.forEach((panel) => new MutationObserver(apply).observe(panel, { attributes: true, attributeFilter: ["class"] }));
  },
};
document.addEventListener("DOMContentLoaded", () => cmTsFilter.init());

/* [퍼블리싱 확인용] 특수교육 현황 학생 수 · 기관 수 기준 (kr/html/stat/edu_status.html)
   탭(학생 수 · 기관 수)마다 기준 선택([data-es-basis])에 맞는 그래프·통계표(.cm-es-result[data-basis])를 보여주고,
   급별일 때는 배치 선택([data-es-place])을 보이며 고른 배치의 결과(.cm-es-result[data-place])를 보여줌. 꺾은선 그래프에서는 패턴 적용을 끔.
   탭을 바꾸면 제목 · 설명([data-es-title] · [data-es-desc])도 그 탭의 것으로 바꿈 (화면설계서 : 기관 수일 때 "특수교육기관 수 추이").
   개발 시 서버 조회로 바꾸고 이 코드는 지웁니다. */
const cmEduBasis = {
  init() {
    document.querySelectorAll("[data-es-basis]").forEach((select) => {
      const panel = select.closest(".tab-conts");
      const results = panel.querySelectorAll(".cm-es-result");
      const sub = panel.querySelector(".cm-es-sub");
      const place = panel.querySelector("[data-es-place]");
      const pattern = panel.querySelector('[data-chart-option="pattern"]');
      const apply = () => {
        const value = select.value;
        results.forEach((result) => {
          result.hidden = result.dataset.basis !== value || (value === "level" && result.dataset.place !== place.value);
        });
        if (sub) sub.hidden = value !== "level";
        if (pattern) {
          // 꺾은선 패널(배치·급별·장애유형별)은 패턴을 쓰지 않음. 그래프 모듈(cm-chart.js)이 바뀐 값을 읽도록 change 를 보냄
          pattern.disabled = value !== "total";
          pattern.checked = value === "total";
          pattern.dispatchEvent(new Event("change"));
        }
        window.dispatchEvent(new Event("resize"));
      };
      select.addEventListener("change", () => {
        if (place) place.value = "all"; // 기준을 바꿀 때마다 배치 선택은 기본값(전체 배치)으로
        apply();
      });
      if (place) place.addEventListener("change", apply);
      apply();
    });
    // 탭(학생 수 · 기관 수)을 바꾸면 제목 · 설명 · 콘텐츠 내 탐색 이름을 그 탭의 것으로 바꿈
    const tabs = document.querySelectorAll(".cm-es-tab [role=tab][data-es-title]");
    const syncTitle = () => {
      const tab = [...tabs].find((item) => item.getAttribute("aria-selected") === "true");
      if (!tab) return;
      document.querySelectorAll("[data-es-title]:not([role=tab])").forEach((el) => (el.textContent = tab.dataset.esTitle));
      document.querySelectorAll("[data-es-desc]:not([role=tab])").forEach((el) => (el.textContent = tab.dataset.esDesc));
    };
    tabs.forEach((tab) => new MutationObserver(syncTitle).observe(tab, { attributes: true, attributeFilter: ["aria-selected"] }));
  },
};
document.addEventListener("DOMContentLoaded", () => cmEduBasis.init());

/* [퍼블리싱 확인용] 시계열 시각화 상세 특성별 조회 (kr/html/stat/timeseries_view.html)
   특성별 조회 선택에 맞는 칩 그룹(.cm-ts-chips[data-feature])만 보여줌. 칩 내용은 임시이며 개발 시 서버 조회로 바꿉니다. */
const cmTsFeature = {
  init() {
    const select = document.getElementById("ts_feature");
    const groups = document.querySelectorAll(".cm-ts-chips[data-feature]");
    if (!select || !groups.length) return;
    const apply = () => {
      groups.forEach((group) => {
        group.hidden = group.dataset.feature !== select.value;
      });
    };
    select.addEventListener("change", apply);
    apply();
  },
};
document.addEventListener("DOMContentLoaded", () => cmTsFeature.init());

/* [퍼블리싱 확인용] 통합검색 : 검색어에 따라 결과 화면을 나눠 보여줌 (kr/html/search/search_result.html · search_result_none.html)
   - 퍼블리싱에는 '통합교육' 결과 화면만 있으므로, 그 밖의 검색어로 검색하면 결과 없음 화면으로 보냅니다.
   - 결과 없음 화면은 주소의 ?q= 값을 검색어 칸과 [data-search-keyword] 자리에 넣습니다. (Figma 예시 검색어 : 운영)
   - 개발 시 서버 검색으로 바꾸고 이 스크립트는 지웁니다. */
const cmSearchDemo = {
  KEYWORD: "통합교육",
  init() {
    const base = document.querySelector(".cm-search-form")?.getAttribute("action") || "search_result.html";
    const pageFor = (keyword) => (keyword === this.KEYWORD ? base : base.replace("search_result.html", "search_result_none.html"));
    // 헤더 통합검색 · 결과 화면의 검색어 입력 띠 : 검색어에 맞는 화면으로 보냄
    document.querySelectorAll(".cm-search-form, .cm-search-top-form").forEach((form) => {
      form.addEventListener("submit", () => {
        const keyword = form.querySelector("input[name=q]").value.trim();
        if (keyword) form.setAttribute("action", pageFor(keyword));
      });
    });
    const result = document.querySelector(".cm-search-result");
    if (!result) return;
    const keyword = (new URLSearchParams(location.search).get("q") || "").trim();
    if (!keyword) return;
    const isNonePage = !!result.querySelector("[data-search-keyword]");
    // 주소로 바로 들어온 경우에도 검색어와 화면이 맞도록 옮김
    if (isNonePage === (keyword === this.KEYWORD)) {
      location.replace(`${keyword === this.KEYWORD ? "search_result.html" : "search_result_none.html"}?q=${encodeURIComponent(keyword)}`);
      return;
    }
    if (!isNonePage) return;
    const input = document.getElementById("search_keyword");
    if (input) input.value = keyword;
    result.querySelectorAll("[data-search-keyword]").forEach((el) => {
      el.textContent = keyword;
    });
    document.title = document.title.replace(/^통합검색 결과 없음/, `‘${keyword}’ 통합검색 결과 없음`);
  },
};
document.addEventListener("DOMContentLoaded", () => cmSearchDemo.init());
