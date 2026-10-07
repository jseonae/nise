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

/* 선택 상자 (.krds-form-select) 선택 완료 상태
   - KRDS 는 글자 색을 기본(아직 고르지 않음 : text-disabled, 옅은 회색)과 선택 완료(.completed : text-subtle)로 나누지만
     .completed 를 붙이는 스크립트는 패키지에 없음 → 값이 있는 선택 상자에 붙임
   - 붙이지 않으면 값이 골라진 상자도 옅은 회색(밝은 화면 3.1:1, 선명하게 2.6:1)으로 남아 글자 대비 4.5:1 에 못 미침
   - 값이 빈 항목("선택해 주세요" 같은 안내)이 골라져 있거나 사용할 수 없는(disabled) 상자는 KRDS 기본 색 그대로 */
(() => {
  const sync = (select) => select.classList.toggle("completed", select.value !== "" && !select.disabled);
  document.querySelectorAll("select.krds-form-select").forEach(sync);
  document.addEventListener("change", (event) => {
    if (event.target.matches?.("select.krds-form-select")) sync(event.target);
  });
})();
