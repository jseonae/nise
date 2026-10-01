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
