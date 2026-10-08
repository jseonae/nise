/* ==========================================================================
   KRDS 스크립트 보정 (공통)
   - KRDS 원본(krds/resources/js/component/ui-script.js)은 수정하지 않고 여기서 보정합니다.
   - ui-script.js 다음, DOMContentLoaded 전에 불러옵니다.
   ========================================================================== */

/* 모바일 전체메뉴 (cmMobileMenu) : 1Depth 를 누르면 그 메뉴의 2Depth 만 오른쪽에 보임 (Figma: main_menu__mo)
   - KRDS 기본은 오른쪽에 모든 2Depth 목록이 이어져 있고, 1Depth 를 누르면 그 위치로 스크롤 · 스크롤 위치에 따라 1Depth 가 바뀜
   - 이 사업은 스크롤 방식이 아니라 전환 방식이라, 스크롤로 1Depth 를 고르는 단계(setupAnchorScroll)를 끄고
     KRDS 가 붙인 탭 속성(role="tab" · aria-controls · aria-selected)은 그대로 쓰면서 고른 메뉴의 목록만 남기고 나머지는 hidden 처리
   - 1Depth 가 없는 마크업이면 KRDS 초기화가 오류로 멈추지 않게 건너뜀 */
if (typeof krds_mainMenuMobile !== "undefined") {
  krds_mainMenuMobile.setupAnchorScroll = function () {};
  const krdsSetupAnchorLinks = krds_mainMenuMobile.setupAnchorLinks;
  krds_mainMenuMobile.setupAnchorLinks = function (mobileGnb) {
    const tabs = [...mobileGnb.querySelectorAll(".menu-wrap .gnb-main-trigger")];
    if (!tabs.length) return;
    krdsSetupAnchorLinks.call(this, mobileGnb);
    const select = (tab) => {
      tabs.forEach((item) => {
        const on = item === tab;
        item.classList.toggle("active", on);
        item.setAttribute("aria-selected", String(on));
        const panel = document.getElementById(item.getAttribute("href").slice(1));
        if (panel) panel.hidden = !on;
      });
    };
    tabs.forEach((tab) => tab.addEventListener("click", () => select(tab)));
    select(tabs.find((tab) => tab.classList.contains("active")) || tabs[0]);
  };
}

/* 모달 Esc 닫기 보정 (모든 KRDS 모달)
   - KRDS 는 모달을 열 때 Esc 처리를 { once: true } 로 한 번만 걸어 두어, 모달 안에서 다른 키(Tab 등)를 먼저 누르면 그 뒤로는 Esc 가 듣지 않음
   - 열려 있는 모달 중 맨 위(나중에 연 것)를 닫기 버튼(.close-modal)으로 닫음. KRDS 가 먼저 닫았으면 열린 모달이 없어 아무 일도 하지 않음 */
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" && event.key !== "Esc") return;
  const opened = [...document.querySelectorAll(".krds-modal.shown")];
  if (!opened.length) return;
  const top = opened.reduce((a, b) => (Number(getComputedStyle(b).zIndex) >= Number(getComputedStyle(a).zIndex) ? b : a));
  top.querySelector(".close-modal")?.click();
});

/* 가로 스크롤 탭 (.krds-tab-area.cm-tab-scroll, 마크업 _common/html/code/tab--scroll.html)
   - 탭 전환은 KRDS 스크립트(krds_tab)가 맡고, 여기서는 넘칠 때 좌우 이동 버튼 표시·스크롤만 처리합니다.
   - 처음 열 때와 탭을 고를 때 선택된 탭이 보이도록 스크롤합니다. */
const cmTabScroll = {
  init() {
    document.querySelectorAll(".cm-tab-scroll > .tab").forEach((tab) => this.setup(tab));
  },
  setup(tab) {
    const list = tab.querySelector(":scope > ul");
    const prev = tab.querySelector(".cm-tab-scroll-nav.prev");
    const next = tab.querySelector(".cm-tab-scroll-nav.next");
    if (!list || !prev || !next) return;

    const update = () => {
      const max = list.scrollWidth - list.clientWidth;
      [[prev, list.scrollLeft <= 1], [next, list.scrollLeft >= max - 1]].forEach(([nav, hide]) => {
        // 초점이 있던 이동 버튼이 사라지면 초점을 선택된 탭으로 옮김
        if (hide && nav.contains(document.activeElement)) list.querySelector(":scope > li.active button")?.focus({ preventScroll: true });
        nav.hidden = hide;
      });
    };
    const move = (dir) => {
      const item = list.querySelector(":scope > li");
      const step = item ? item.offsetWidth : list.clientWidth / 2;
      list.scrollBy({ left: dir * step });
    };
    const showActive = (smooth) => {
      const active = list.querySelector(":scope > li.active");
      if (!active) return;
      const left = active.offsetLeft - (list.clientWidth - active.offsetWidth) / 2;
      list.scrollTo({ left: Math.max(0, left), behavior: smooth ? "smooth" : "instant" });
    };

    prev.querySelector("button").addEventListener("click", () => move(-1));
    next.querySelector("button").addEventListener("click", () => move(1));
    list.addEventListener("scroll", update, { passive: true });
    list.addEventListener("click", () => showActive(true));
    if ("ResizeObserver" in window) new ResizeObserver(update).observe(list);
    else window.addEventListener("resize", update);

    showActive(false);
    update();
  },
};
document.addEventListener("DOMContentLoaded", () => cmTabScroll.init());

/* AI 해설 도우미 (.cm-ai, 마크업 _common/html/code/ext_ai_helper.html, 화면마다 페이지에 둠)
   - 여는 버튼 → 대화 창(처음 안내). 질문 예시를 누르거나 질문을 보내면 대화 진행 화면으로 바뀜
   - Esc · 닫기 버튼으로 닫고 초점을 여는 버튼으로 되돌림. 닫았다 다시 열면 대화 중이었어도 처음 안내 화면으로 열림, "오늘 하루 열지 않기"는 말풍선만 하루 숨김
   - 처음 안내에서 질문 예시를 누르거나 질문을 보내면 새 대화(빈 화면 + 그 질문)로 시작함
   - [퍼블리싱 확인용] 페이지의 Figma 예시 대화는 첫 질문 예시를 누르면 전체가 그대로 보이고(답변 종류별 예시), 그 밖에는 질문별 답변 사전으로 씀.
     사전에 없는 질문에는 Figma의 "답변을 만들지 못했어요."를 붙임
     개발 시 질문 전송·답변 받기로 바꿈 */
const cmAiHelper = {
  hideKey: "cmAiBubbleHide",
  init() {
    const root = document.querySelector(".cm-ai");
    if (!root) return;
    const openBtn = root.querySelector(".cm-ai-open");
    const panel = root.querySelector(".cm-ai-panel");
    const bubble = root.querySelector(".cm-ai-bubble");
    const chat = panel.querySelector(".cm-ai-chat");
    const list = panel.querySelector(".cm-ai-list");
    const form = panel.querySelector(".cm-ai-input");
    const input = form.querySelector("input");

    try {
      if (Number(localStorage.getItem(this.hideKey)) > Date.now()) bubble.hidden = true;
    } catch (e) {}

    const open = () => {
      panel.hidden = false;
      root.setAttribute("data-open", "");
      document.body.classList.add("cm-ai-opened"); // 창에 가려지는 TOP 버튼 숨김 (krds-custom.css)
      openBtn.setAttribute("aria-expanded", "true");
      panel.querySelector(".cm-ai-title").focus({ preventScroll: true });
    };
    const close = () => {
      panel.hidden = true;
      panel.dataset.state = "intro"; // 다시 열면 처음 안내 화면부터
      root.removeAttribute("data-open");
      document.body.classList.remove("cm-ai-opened");
      openBtn.setAttribute("aria-expanded", "false");
      openBtn.focus();
    };
    /* [퍼블리싱 확인용] 페이지에 적어 둔 Figma 예시 대화를 따로 간직하고 대화 목록은 비움
       → 예시 대화의 첫 질문과 같은 질문 예시를 누르면 예시 대화 전체가 그대로 보임 (답변 종류별 예시 확인용)
       → 그 밖에는 빈 화면에서 새 대화로 시작하고, 예시와 같은 질문을 보내면 예시 답변이, 다른 질문에는 "답변을 만들지 못했어요."가 붙음 */
    const askText = (item) => {
      const bubble = item.querySelector(".bubble").cloneNode(true);
      bubble.querySelectorAll(".sr-only").forEach((el) => el.remove());
      return bubble.textContent.replace(/\s+/g, " ").trim();
    };
    const example = [...list.children].map((item) => item.cloneNode(true)); // 예시 대화 전체 (첫 질문 예시를 누르면 그대로 보여 줌)
    const exampleAsk = example.length && example[0].classList.contains("ask") ? askText(example[0]) : "";
    const samples = new Map();
    list.querySelectorAll(":scope > .ask").forEach((item) => {
      const answer = item.nextElementSibling;
      if (answer && answer.classList.contains("answer")) samples.set(askText(item), answer.cloneNode(true));
    });
    list.replaceChildren();
    const showChat = () => {
      // 처음 안내에서 넘어올 때는 새 대화로 시작 (앞서 나눈 대화를 비움)
      if (panel.dataset.state !== "chat") list.replaceChildren();
      panel.dataset.state = "chat";
    };
    const addAsk = (text) => {
      const ask = document.createElement("li");
      ask.className = "ask";
      ask.innerHTML = '<p class="bubble"><span class="sr-only">질문 : </span></p>';
      ask.querySelector(".bubble").append(text);
      let answer;
      if (samples.has(text)) answer = samples.get(text).cloneNode(true);
      else {
        answer = document.createElement("li");
        answer.className = "answer";
        answer.innerHTML = '<div class="bubble"><span class="sr-only">답변 : </span>답변을 만들지 못했어요.</div>';
      }
      list.append(ask, answer);
      chat.scrollTop = chat.scrollHeight;
    };

    openBtn.addEventListener("click", open);
    panel.querySelector(".cm-ai-close").addEventListener("click", close);
    panel.querySelector(".cm-ai-reset").addEventListener("click", () => {
      panel.dataset.state = "intro";
      panel.querySelector(".cm-ai-title").focus({ preventScroll: true });
    });
    panel.addEventListener("keydown", (event) => {
      if (event.key === "Escape") close();
    });
    bubble.querySelector(".cm-ai-bubble-close").addEventListener("click", () => {
      bubble.hidden = true;
      openBtn.focus();
      try {
        localStorage.setItem(this.hideKey, String(Date.now() + 24 * 60 * 60 * 1000));
      } catch (e) {}
    });
    panel.querySelectorAll(".cm-ai-suggest button").forEach((button) =>
      button.addEventListener("click", () => {
        const text = button.textContent.replace(/\s+/g, " ").trim();
        showChat();
        if (text === exampleAsk) {
          // 예시 대화의 첫 질문과 같은 질문 예시 : Figma 예시 대화 전체를 보여 줌 (답변 종류별 모양을 개발팀이 확인하는 화면)
          list.replaceChildren(...example.map((item) => item.cloneNode(true)));
          chat.scrollTop = chat.scrollHeight;
        } else addAsk(text); // 그 밖의 질문 예시는 첫 질문으로 보냄
        input.focus();
      })
    );
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const text = input.value.trim();
      input.value = "";
      if (!text) return; // 빈 질문으로는 대화를 시작하지 않음
      showChat();
      addAsk(text);
    });
  },
};
document.addEventListener("DOMContentLoaded", () => cmAiHelper.init());

/* 가로 스크롤 표 (.cm-table-scroll, 마크업 _common/html/code/ext_table_scroll.html)
   - 이전/다음 버튼으로 한 열씩 옮기고 끝에서 버튼을 disabled 로 바꿈
   - 한 번이라도 옮기면 손가락 그림(.cm-table-scroll-hint)을 숨김 */
const cmTableScroll = {
  init() {
    document.querySelectorAll(".cm-table-scroll").forEach((box) => this.setup(box));
  },
  setup(box) {
    const wrap = box.querySelector(".krds-table-wrap");
    const prev = box.querySelector(".cm-table-prev");
    const next = box.querySelector(".cm-table-next");
    if (!wrap || !prev || !next) return;
    const step = () => {
      const cell = wrap.querySelector("thead th:nth-child(2)");
      return cell ? cell.offsetWidth : wrap.clientWidth / 2;
    };
    const update = () => {
      const max = wrap.scrollWidth - wrap.clientWidth;
      const atStart = wrap.scrollLeft <= 1;
      const atEnd = wrap.scrollLeft >= max - 1;
      [[prev, atStart], [next, atEnd]].forEach(([btn, off]) => {
        if (off && btn === document.activeElement) (btn === prev ? next : prev).focus();
        btn.disabled = off;
      });
      box.classList.toggle("is-end", atEnd);
      box.classList.toggle("no-scroll", max <= 1);
      if (!atStart) box.classList.add("is-scrolled");
    };
    prev.addEventListener("click", () => wrap.scrollBy({ left: -step(), behavior: "smooth" }));
    next.addEventListener("click", () => wrap.scrollBy({ left: step(), behavior: "smooth" }));
    wrap.addEventListener("scroll", update, { passive: true });
    if ("ResizeObserver" in window) new ResizeObserver(update).observe(wrap);
    update();
  },
};
document.addEventListener("DOMContentLoaded", () => cmTableScroll.init());

/* 만족도조사 (.cm-research, 마크업 kr/tmpl/research.html) : 의견 글자 수 세기 (KRDS textarea-count 표시) */
const cmResearch = {
  init() {
    document.querySelectorAll(".cm-research").forEach((box) => {
      const input = box.querySelector(".cm-research-opinion input");
      const now = box.querySelector(".textarea-count .count-now");
      if (!input || !now) return;
      const update = () => {
        now.textContent = input.value.length;
      };
      input.addEventListener("input", update);
      update();
      // [퍼블리싱 확인용] 저장 주소가 없어 제출하면 오류 페이지로 넘어가므로 제출을 막음 (의견 입력창에서 Enter 를 누를 때)
      // 개발 시 평가하기 버튼을 type="submit" 으로 바꾸면서 아래 한 줄을 지웁니다.
      box.querySelector("form")?.addEventListener("submit", (event) => event.preventDefault());
    });
  },
};
document.addEventListener("DOMContentLoaded", () => cmResearch.init());

/* 콘텐츠 내 탐색 (KRDS in_page_navigation) : 지금 보고 있는 섹션의 링크에 active 표시
   - KRDS 스크립트(krds_inPageNavigation.updateActiveSection)는 .scroll-check > .section-link 구조와 탭 안 섹션만 다루고
     위치를 offsetTop 으로 계산해서, 1단 본문(.cm-contents) · 탭이 섞인 화면에서는 첫 링크에 active 가 고정됩니다.
   - 여기서는 탐색 링크(href="#id")가 가리키는 섹션의 화면 위치로 판단합니다.
       · 헤더 아래 기준선을 지난 마지막 섹션이 현재 섹션, 아직 아무 섹션도 지나지 않았으면 첫 섹션
       · 링크를 눌러 이동할 때(KRDS applyScroll : 섹션 위 = 헤더 높이)와 같은 기준선을 씁니다.
       · 페이지 끝의 짧은 섹션(예 : 교차분석 용어해설·유의사항·출처)은 헤더 아래까지 올라오지 못하므로,
         끝에 가까워질수록 기준선을 화면 아래쪽으로 내려 차례로 켜지게 합니다 (맨 끝에서 기준선 = 화면 아래).
       · 링크를 눌러 이동한 경우에는 누른 링크를 그대로 켜 두고, 사용자가 직접 스크롤하면 다시 위치로 판단합니다.
   - 현재 링크에는 aria-current="location" 도 함께 붙입니다. */
const cmPageNav = {
  init() {
    const links = [...document.querySelectorAll(".krds-in-page-navigation-area:not(.sample) .in-page-navigation-list a[href^='#']")];
    const items = links.map((link) => ({ link, target: document.getElementById(link.getAttribute("href").slice(1)) })).filter((item) => item.target);
    if (!items.length) return;
    let queued = false;
    let locked = null;
    const update = () => {
      queued = false;
      const visible = items.filter((item) => item.target.getClientRects().length);
      if (!visible.length) return;
      const header = (document.querySelector("#krds-masthead")?.clientHeight || 0) + (document.querySelector("#krds-header .header-in")?.clientHeight || 0);
      const zone = Math.max(1, window.innerHeight - header);
      const remain = Math.max(0, document.documentElement.scrollHeight - window.innerHeight - window.scrollY);
      const line = header + 8 + Math.max(0, zone - remain);
      let current = visible[0];
      visible.forEach((item) => {
        if (item.target.getBoundingClientRect().top <= line) current = item;
      });
      if (locked && visible.includes(locked)) current = locked;
      items.forEach((item) => {
        const on = item === current;
        item.link.classList.toggle("active", on);
        if (on) item.link.setAttribute("aria-current", "location");
        else item.link.removeAttribute("aria-current");
      });
    };
    const request = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(update);
    };
    items.forEach((item) => {
      item.link.addEventListener("click", () => {
        locked = item;
        request();
      });
    });
    const unlock = () => {
      locked = null;
    };
    ["wheel", "touchmove"].forEach((type) => window.addEventListener(type, unlock, { passive: true }));
    window.addEventListener("keydown", (event) => {
      if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(event.key) && !event.target.closest(".in-page-navigation-list")) unlock();
    });
    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", request);
    update();
  },
};
document.addEventListener("DOMContentLoaded", () => cmPageNav.init());

/* 통합검색 영역 (.cm-search-popup, 마크업 kr/tmpl/header.html · _common/html/code/ext_search_popup.html)
   - 헤더의 통합검색 버튼(.btn-navi.sch, aria-controls)으로 열고 닫습니다. 열리면 검색어 칸으로 초점을 옮기고,
     닫으면(닫기 버튼 · Esc · 바깥 누름) 통합검색 버튼으로 초점을 돌려줍니다.
   - 화면을 가리는 모달이 아니라 펼침 영역이라 aria-expanded 로 상태를 알립니다.
   - 검색어가 있으면 지우기 버튼을 보이고, 추천 검색어를 누르면 검색어 칸에 넣습니다.
   - 검색하면 form action(통합검색 결과 화면)으로 이동합니다. */
const cmSearchPopup = {
  init() {
    const popup = document.getElementById("cm_search_popup");
    const opener = document.querySelector(`[aria-controls="cm_search_popup"]`);
    if (!popup || !opener) return;
    const input = popup.querySelector("#cm_search_keyword");
    const clear = popup.querySelector(".cm-search-delete");
    const sync = () => {
      clear.hidden = input.value === "";
    };
    const open = () => {
      popup.hidden = false;
      opener.setAttribute("aria-expanded", "true");
      sync();
      input.focus();
    };
    const close = (returnFocus = true) => {
      if (popup.hidden) return;
      popup.hidden = true;
      opener.setAttribute("aria-expanded", "false");
      if (returnFocus) opener.focus();
    };
    opener.addEventListener("click", () => (popup.hidden ? open() : close()));
    popup.querySelector(".cm-search-close").addEventListener("click", () => close());
    popup.addEventListener("keydown", (event) => {
      if (event.key === "Escape") close();
    });
    document.addEventListener("click", (event) => {
      if (!popup.hidden && !popup.contains(event.target) && !opener.contains(event.target)) close(false);
    });
    input.addEventListener("input", sync);
    clear.addEventListener("click", () => {
      input.value = "";
      sync();
      input.focus();
    });
    popup.querySelectorAll(".cm-search-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        input.value = chip.dataset.keyword || chip.textContent.replace(/^#/, "").trim();
        sync();
        input.focus();
      });
    });
    // 검색어 없이 보내지 않음
    popup.querySelector("form").addEventListener("submit", (event) => {
      if (input.value.trim() !== "") return;
      event.preventDefault();
      input.focus();
    });
  },
};
document.addEventListener("DOMContentLoaded", () => cmSearchPopup.init());

/* 통합검색 결과 (.cm-search-result, kr/html/search/search_result.html)
   - 전체 탭의 [더보기] : data-search-tab 에 적힌 분류 탭으로 옮기고 초점을 그 탭에 둡니다. (탭 전환 자체는 KRDS 스크립트)
   - 검색어 입력 띠(.cm-search-top-form) : 검색어 없이 보내지 않습니다. */
const cmSearchResult = {
  init() {
    document.querySelectorAll(".cm-search-more-btn[data-search-tab]").forEach((button) => {
      button.addEventListener("click", () => {
        const tab = document.querySelector(`#${button.dataset.searchTab} .btn-tab`);
        if (!tab) return;
        tab.click();
        tab.focus({ preventScroll: true });
        tab.closest(".krds-tab-area").scrollIntoView({ block: "start" });
      });
    });
    document.querySelectorAll(".cm-search-top-form").forEach((form) => {
      form.addEventListener("submit", (event) => {
        const input = form.querySelector("input[name=q]");
        if (input.value.trim() !== "") return;
        event.preventDefault();
        input.focus();
      });
    });
  },
};
document.addEventListener("DOMContentLoaded", () => cmSearchResult.init());
