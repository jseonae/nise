/* ==========================================================================
   KRDS 기본 보정 스크립트 (공통)
   - KRDS 패키지에는 없지만 krds.go.kr 사이트에서 기본으로 쓰는 동작입니다. (스타일: krds-base.css)
   - KRDS 원본(krds/)은 수정하지 않습니다.
   ========================================================================== */

/* 페이지 상단으로 이동 버튼 (.page-top-button)
   기준: krds.go.kr resources/js/site/ui-guide-script.js goTopBtn
   - 화면 높이의 SHOW_RATIO 배 넘게 내려가면 .active 로 표시, 누르면 맨 위로 이동 후 브레드크럼 "홈"으로 포커스
   - KRDS 사이트는 1.5배지만, 이 사업은 페이지가 짧아(예: 공지사항 목록은 일반 모니터에서 1배도 안 내려감)
     버튼이 아예 나타나지 않거나 늦게 나타나 0.25배로 낮춤 (1920×1080 모니터의 브라우저 창 기준 약 240px 스크롤 시 표시) */
(() => {
  const goTopTag = document.querySelector(".page-top-button");
  if (!goTopTag) return;

  const SHOW_RATIO = 0.25; // KRDS 사이트 기본값 1.5

  const home = document.querySelector(".breadcrumb .home a");
  const toggleVisibility = () => {
    goTopTag.classList.toggle("active", window.scrollY > window.innerHeight * SHOW_RATIO);
  };
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    home?.focus();
  };
  window.addEventListener("scroll", toggleVisibility);
  goTopTag.addEventListener("click", scrollToTop);
  toggleVisibility();
})();
