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
