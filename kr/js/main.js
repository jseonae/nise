/* ==========================================================================
   메인 화면 전용 스크립트 (kr/html/main.html)
   - cmMainHero    : 히어로 배경 영상 (조건이 맞을 때만 불러와 재생, 정지 · 재생 버튼)
   - cmMainSearch  : 히어로 추천 검색어 → 검색어 칸에 넣고 바로 검색
   - cmMainHistory : 실태조사변천사 카드 넘김 (이전 · 다음 · 연도 버튼, 자동 넘김 없음)
   - cmMainReport  : 연구 보고서 표지 넘김 (KRDS 포함 Swiper, 자동 넘김 없음)
   - cmMainBanner  : 알림판 배너 넘김 (KRDS 포함 Swiper, 자동 넘김 + 정지 · 재생, 쪽수)
   - cmMainQuick   : 바로가기 TOP 버튼
   ========================================================================== */

/* 히어로 배경 영상 : 꾸밈용 영상(소리 없음, 반복, 약 8초 · 4MB)
   - 동작 줄이기 설정, 데이터 절약 모드, 모바일(767px 이하), 선명하게 모드에서는 불러오지 않음 → 정지 이미지 그대로
   - 화면이 다 뜬 뒤(load)에 불러와 첫 화면 표시를 늦추지 않음
   - 재생이 시작되면 정지 · 재생 버튼을 보임. 화면 밖으로 나가면 멈춤 */
const cmMainHero = {
  init() {
    const hero = document.querySelector(".cm-hero");
    const video = hero?.querySelector(".cm-hero-video");
    const toggle = hero?.querySelector(".cm-hero-toggle");
    if (!video || !toggle) return;
    const dark = () => {
      const mode = document.documentElement.getAttribute("data-krds-mode");
      return mode === "high-contrast" || (mode === "theme" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(max-width: 767px)").matches) return;
    if (navigator.connection?.saveData) return;
    if (dark()) return;

    let paused = false; // 사용자가 직접 멈췄는지
    const render = () => {
      toggle.querySelector(".sr-only").textContent = paused ? "배경 영상 재생" : "배경 영상 정지";
      toggle.querySelector(".svg-icon").className = `svg-icon ${paused ? "ico-swiper-play" : "ico-swiper-stop"}`;
    };
    const start = () => {
      video.src = video.dataset.src;
      video.addEventListener("playing", () => {
        hero.classList.add("is-video");
        toggle.hidden = false;
      }, { once: true });
      video.play().catch(() => {}); // 자동 재생이 막히면 정지 이미지 그대로
      if ("IntersectionObserver" in window) {
        new IntersectionObserver(([entry]) => {
          if (paused) return;
          if (entry.isIntersecting) video.play().catch(() => {});
          else video.pause();
        }).observe(hero);
      }
    };
    toggle.addEventListener("click", () => {
      paused = !paused;
      if (paused) video.pause();
      else video.play().catch(() => {});
      render();
    });
    if (document.readyState === "complete") start();
    else window.addEventListener("load", start, { once: true });
  },
};

/* 히어로 추천 검색어 : 검색 결과 화면 이동은 기존 폼 제출(cmSearchResult · cmSearchDemo)을 그대로 씀 */
const cmMainSearch = {
  init() {
    const form = document.querySelector(".cm-hero-form");
    if (!form) return;
    const input = form.querySelector("input[name=q]");
    document.querySelectorAll(".cm-hero-search .cm-search-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        input.value = chip.dataset.keyword || chip.textContent.replace(/^#/, "").trim();
        form.requestSubmit();
      });
    });
  },
};

/* 실태조사변천사 : 카드 한 장만 보이고, 연도 진행 막대가 현재 연도까지 채워짐
   - 처음 · 끝에서 이전 · 다음을 누르면 반대쪽 끝으로 돌아감
   - 연도 버튼 : 왼쪽 · 오른쪽 방향키로 이동, 현재 연도 aria-current */
const cmMainHistory = {
  init() {
    document.querySelectorAll("[data-cm-history]").forEach((root) => this.setup(root));
  },
  setup(root) {
    const slides = [...root.querySelectorAll(".cm-history-slide")];
    const timeline = root.querySelector(".cm-history-timeline");
    const items = [...timeline.querySelectorAll("li")];
    const buttons = items.map((item) => item.querySelector("button"));
    let index = Math.max(0, slides.findIndex((slide) => slide.classList.contains("is-active")));

    const fill = () => {
      const item = items[index];
      // 채움 폭 : 첫 연도는 그 칸 폭, 마지막 연도는 끝까지, 그 사이는 칸 가운데까지
      let width = item.offsetLeft + item.offsetWidth / 2;
      if (index === 0) width = item.offsetWidth;
      if (index === items.length - 1) width = timeline.offsetWidth;
      timeline.style.setProperty("--cm-history-fill", `${width}px`);
    };
    const go = (next) => {
      index = (next + slides.length) % slides.length;
      slides.forEach((slide, i) => {
        slide.hidden = i !== index;
        slide.classList.toggle("is-active", i === index);
      });
      items.forEach((item, i) => {
        item.classList.toggle("is-active", i === index);
        if (i === index) buttons[i].setAttribute("aria-current", "true");
        else buttons[i].removeAttribute("aria-current");
      });
      fill();
    };

    root.querySelector(".cm-history-arrows .prev").addEventListener("click", () => go(index - 1));
    root.querySelector(".cm-history-arrows .next").addEventListener("click", () => go(index + 1));
    buttons.forEach((button, i) => {
      button.addEventListener("click", () => go(i));
      button.addEventListener("keydown", (event) => {
        if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
        event.preventDefault();
        const target = buttons[(i + (event.key === "ArrowRight" ? 1 : -1) + buttons.length) % buttons.length];
        target.focus();
        target.click();
      });
    });

    // 탭이 숨겨져 있을 때는 폭을 잴 수 없으므로, 보이게 되거나 폭이 바뀔 때마다 다시 계산
    if ("ResizeObserver" in window) new ResizeObserver(fill).observe(timeline);
    else window.addEventListener("resize", fill);
    go(index);
  },
};

/* 연구 보고서 : 한 장씩 넘김. 처음 · 끝에서는 반대쪽으로 돌아감(rewind) */
const cmMainReport = {
  init() {
    const root = document.querySelector(".cm-report");
    if (!root || typeof Swiper === "undefined") return;
    new Swiper(root.querySelector(".swiper"), {
      slidesPerView: 1,
      rewind: true,
      navigation: { prevEl: root.querySelector(".prev"), nextEl: root.querySelector(".next") },
      a11y: { enabled: false }, // 버튼 이름 · 슬라이드 설명은 마크업에 직접 적음
      on: {
        init: (swiper) => this.sync(swiper),
        slideChangeTransitionEnd: (swiper) => this.sync(swiper),
      },
    });
  },
  // 보이지 않는 슬라이드의 링크는 초점 · 낭독에서 뺌
  sync(swiper) {
    swiper.slides.forEach((slide, i) => {
      const on = i === swiper.activeIndex;
      slide.toggleAttribute("inert", !on);
      slide.setAttribute("aria-hidden", String(!on));
    });
  },
};

/* 알림판 : 자동 넘김(5초) + 정지 · 재생 버튼, 쪽수 표시
   - 마우스를 올리거나 초점이 들어오면 멈춤, 동작 줄이기 설정이면 자동 넘김을 켜지 않음
   - 배너는 477×288 기준으로 그리고 칸 폭에 맞춰 통째로 줄임(--cm-banner-scale) */
const cmMainBanner = {
  DELAY: 5000,
  init() {
    const root = document.querySelector(".cm-banner-area");
    if (!root || typeof Swiper === "undefined") return;
    const container = root.querySelector(".swiper");
    const current = root.querySelector(".count .current");
    const total = root.querySelector(".count .total");
    const toggle = root.querySelector(".toggle");
    const two = (n) => String(n).padStart(2, "0");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const scale = () => {
      const banner = container.querySelector(".cm-banner");
      if (!banner || !container.clientWidth) return;
      root.style.setProperty("--cm-banner-scale", String(Math.min(1, container.clientWidth / banner.offsetWidth)));
    };
    scale();

    const swiper = new Swiper(container, {
      slidesPerView: 1,
      loop: true,
      autoplay: reduced ? false : { delay: this.DELAY, disableOnInteraction: false, pauseOnMouseEnter: true },
      navigation: { prevEl: root.querySelector(".prev"), nextEl: root.querySelector(".next") },
      a11y: { enabled: false },
      on: {
        init: (instance) => this.sync(instance, current),
        slideChangeTransitionEnd: (instance) => this.sync(instance, current),
        slideChange: (instance) => {
          current.textContent = two(instance.realIndex + 1);
        },
      },
    });
    total.textContent = two(container.querySelectorAll(".swiper-slide:not(.swiper-slide-duplicate)").length);

    // 정지 · 재생
    let playing = !reduced;
    const render = () => {
      toggle.querySelector(".sr-only").textContent = playing ? "자동 넘김 정지" : "자동 넘김 재생";
      toggle.querySelector(".svg-icon").className = `svg-icon ${playing ? "ico-swiper-stop" : "ico-swiper-play"}`;
    };
    toggle.addEventListener("click", () => {
      playing = !playing;
      if (playing) swiper.autoplay.start();
      else swiper.autoplay.stop();
      render();
    });
    render();
    // 키보드 초점이 배너 안에 있는 동안은 넘기지 않음
    container.addEventListener("focusin", () => playing && swiper.autoplay.stop());
    container.addEventListener("focusout", () => playing && swiper.autoplay.start());

    if ("ResizeObserver" in window) {
      new ResizeObserver(() => {
        scale();
        swiper.update();
      }).observe(container);
    }
  },
  sync(swiper, current) {
    swiper.slides.forEach((slide, i) => {
      const on = i === swiper.activeIndex;
      slide.toggleAttribute("inert", !on);
      slide.setAttribute("aria-hidden", String(!on));
    });
    current.textContent = String(swiper.realIndex + 1).padStart(2, "0");
  },
};

/* 바로가기 TOP : 맨 위로 올리고 초점을 본문 바로가기 쪽(문서 처음)으로 옮김 */
const cmMainQuick = {
  init() {
    const button = document.querySelector(".cm-quick .btn-top");
    if (!button) return;
    button.addEventListener("click", () => {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
      const wrap = document.getElementById("wrap");
      if (!wrap) return;
      wrap.setAttribute("tabindex", "-1");
      wrap.focus({ preventScroll: true });
    });
  },
};

document.addEventListener("DOMContentLoaded", () => {
  cmMainHero.init();
  cmMainSearch.init();
  cmMainHistory.init();
  cmMainReport.init();
  cmMainBanner.init();
  cmMainQuick.init();
});
