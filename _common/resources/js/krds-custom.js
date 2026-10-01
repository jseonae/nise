/* ==========================================================================
   KRDS 스크립트 보정 (공통)
   - KRDS 원본(krds/resources/js/component/ui-script.js)은 수정하지 않고 여기서 보정합니다.
   - ui-script.js 다음, DOMContentLoaded 전에 불러옵니다.
   ========================================================================== */

/* 모바일 전체메뉴 : 1단 링크 목록(.cm-mobile-menu)을 쓸 때
   KRDS는 탭 메뉴(.menu-wrap .gnb-main-trigger)가 있다고 가정해 첫 탭을 활성화하므로,
   탭 메뉴가 없으면 이 단계를 건너뜁니다. (건너뛰지 않으면 오류로 이후 KRDS 초기화가 멈춤) */
if (typeof krds_mainMenuMobile !== "undefined") {
  const krdsSetupAnchorLinks = krds_mainMenuMobile.setupAnchorLinks;
  krds_mainMenuMobile.setupAnchorLinks = function (mobileGnb) {
    if (!mobileGnb.querySelector(".menu-wrap .gnb-main-trigger")) return;
    return krdsSetupAnchorLinks.call(this, mobileGnb);
  };
}

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
   - Esc · 닫기 버튼으로 닫고 초점을 여는 버튼으로 되돌림, "오늘 하루 열지 않기"는 말풍선만 하루 숨김
   - [퍼블리싱 확인용] 대화 진행 화면에는 Figma 예시 대화가 들어 있고, 새로 보낸 질문에는 Figma의 "답변을 만들지 못했어요."를 붙임
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
      openBtn.setAttribute("aria-expanded", "true");
      panel.querySelector(".cm-ai-title").focus({ preventScroll: true });
    };
    const close = () => {
      panel.hidden = true;
      root.removeAttribute("data-open");
      openBtn.setAttribute("aria-expanded", "false");
      openBtn.focus();
    };
    const showChat = () => {
      panel.dataset.state = "chat";
      chat.scrollTop = chat.scrollHeight;
    };
    const addAsk = (text) => {
      const ask = document.createElement("li");
      ask.className = "ask";
      ask.innerHTML = '<p class="bubble"><span class="sr-only">질문 : </span></p>';
      ask.querySelector(".bubble").append(text);
      const answer = document.createElement("li");
      answer.className = "answer";
      answer.innerHTML = '<div class="bubble"><span class="sr-only">답변 : </span>답변을 만들지 못했어요.</div>';
      list.append(ask, answer);
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
        showChat();
        input.focus();
      })
    );
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const text = input.value.trim();
      if (text) addAsk(text);
      input.value = "";
      showChat();
    });
  },
};
document.addEventListener("DOMContentLoaded", () => cmAiHelper.init());
