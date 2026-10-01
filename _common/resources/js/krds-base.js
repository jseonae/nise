/* ==========================================================================
   KRDS 기본 보정 스크립트 (공통)
   - KRDS 패키지에는 없지만 krds.go.kr 사이트에서 기본으로 쓰는 동작입니다. (스타일: krds-base.css)
   - KRDS 원본(krds/)은 수정하지 않습니다.
   ========================================================================== */

/* 페이지 상단으로 이동 버튼 (.page-top-button)
   기준: krds.go.kr resources/js/site/ui-guide-script.js goTopBtn
   - 화면 높이의 1.5배 넘게 내려가면 .active 로 표시, 누르면 맨 위로 이동 후 브레드크럼 "홈"으로 포커스 */
(() => {
  const goTopTag = document.querySelector(".page-top-button");
  if (!goTopTag) return;

  const home = document.querySelector(".breadcrumb .home a");
  const toggleVisibility = () => {
    goTopTag.classList.toggle("active", window.scrollY > window.innerHeight * 1.5);
  };
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    home?.focus();
  };
  window.addEventListener("scroll", toggleVisibility);
  goTopTag.addEventListener("click", scrollToTop);
  toggleVisibility();
})();
