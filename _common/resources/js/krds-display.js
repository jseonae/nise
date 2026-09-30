/* ==========================================================================
   글자·화면 표시 설정 (KRDS)
   - krds.go.kr 사이트의 displaySettings()(/resources/js/site/ui-guide-script.js)를 옮겨온 스크립트입니다.
   - KRDS 원본(krds/)은 수정하지 않고, 이 파일을 추가로 불러옵니다.
   - 사용법: <head> 안에서 KRDS CSS 다음에 불러옵니다. (defer/async 없이)
       <script src="../../_common/resources/js/krds-display.js"></script>
     KRDS ui-script.js는 기존처럼 </body> 앞에서 불러옵니다.
   - 필요한 마크업: _common/resources/html/display-settings.html 참고
     (열기 버튼 .open-modal[data-target="modal_adjust_display"] + #modal_adjust_display 모달)
   - 저장: localStorage "displayScale"(배율 값), "displayMode"(light | high-contrast | theme)
   ========================================================================== */

(() => {
  const root = document.documentElement;
  const STORAGE_SCALE = "displayScale";
  const STORAGE_MODE = "displayMode";
  const DEFAULT_MODE = "light";

  const getLocal = (key) => {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  };
  const setLocal = (key, value) => {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      /* 저장소를 쓸 수 없는 환경에서는 저장하지 않음 */
    }
  };

  // set theme mode (시스템 설정일 때 OS 다크 모드 여부 표시)
  const setTheme = () => {
    root.setAttribute("data-krds-theme", window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  };

  const setViewMode = (mode) => {
    root.setAttribute("data-krds-mode", mode);
    if (mode === "theme") {
      setTheme();
    } else {
      root.removeAttribute("data-krds-theme");
    }
  };

  // 화면 깜빡임 방지: 페이지를 그리기 전에(<head>에서) 저장된 화면 모드를 먼저 적용
  setViewMode(getLocal(STORAGE_MODE) || DEFAULT_MODE);

  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (root.getAttribute("data-krds-mode") === "theme") setTheme();
  });

  // 글자·화면 크기 적용 (KRDS ui-script.js의 krds_adjustContentScale 사용)
  const applyScale = (value) => {
    if (typeof krds_adjustContentScale !== "undefined") {
      krds_adjustContentScale.scaleValue(value);
    } else {
      document.body.style.zoom = value;
    }
  };

  // 확대 시 레이아웃 보정 (KRDS CSS의 .krds-scaled-layout)
  const setScaledLayout = () => {
    const wrap = document.getElementById("wrap");
    if (!wrap) return;
    const zoomLevel = parseFloat(document.body.style.zoom) || 1;
    wrap.classList.toggle("krds-scaled-layout", window.innerWidth >= 1024 && zoomLevel > 1);
  };

  const displaySettings = () => {
    const rootStyles = getComputedStyle(root);
    const getScaleValue = (scale) => rootStyles.getPropertyValue(`--krds-zoom-${scale}`).trim();

    // 저장된 배율 적용 (모달이 없는 페이지에도 적용)
    const savedScale = getLocal(STORAGE_SCALE);
    if (savedScale) applyScale(savedScale);
    setScaledLayout();
    window.addEventListener("resize", setScaledLayout);

    // 화면조정 모달 설정
    const adjustDisplay = document.getElementById("modal_adjust_display");
    if (!adjustDisplay) return;

    // modalBack 투명 처리 (설정 변경이 바로 보이도록)
    const modalBack = adjustDisplay.querySelector(".modal-back");
    if (modalBack) modalBack.style.backgroundColor = "transparent";

    const scaleOptions = adjustDisplay.querySelectorAll(".scale-options .krds-form-check input[type=radio]");
    const viewModeOptions = adjustDisplay.querySelectorAll(".view-mode-options .krds-form-check input[type=radio]");
    const resetDisplay = document.getElementById("reset_display");
    const defaultScale = adjustDisplay.querySelector("#scale_level_medium");
    const defaultViewMode = adjustDisplay.querySelector("#view_mode_light");

    let selectedScale = savedScale || getScaleValue("medium") || 1;
    let selectedViewMode = root.getAttribute("data-krds-mode") || DEFAULT_MODE;

    // 저장된 값으로 라디오 선택 상태 맞추기
    scaleOptions.forEach((option) => {
      if (getScaleValue(option.value) === String(selectedScale)) option.checked = true;
    });
    viewModeOptions.forEach((option) => {
      if (option.value === selectedViewMode) option.checked = true;
    });

    const saveDisplay = () => {
      setLocal(STORAGE_SCALE, selectedScale);
      setLocal(STORAGE_MODE, selectedViewMode);
      setScaledLayout();
    };

    const applyDisplay = () => {
      applyScale(selectedScale);
      setViewMode(selectedViewMode);
      saveDisplay();
    };

    scaleOptions.forEach((option) => {
      option.addEventListener("click", () => {
        selectedScale = getScaleValue(option.value);
        applyDisplay();
      });
    });

    viewModeOptions.forEach((option) => {
      option.addEventListener("click", () => {
        selectedViewMode = option.value;
        applyDisplay();
      });
    });

    if (resetDisplay) {
      resetDisplay.addEventListener("click", () => {
        if (defaultScale) defaultScale.checked = true;
        if (defaultViewMode) defaultViewMode.checked = true;
        selectedScale = getScaleValue("medium") || 1;
        selectedViewMode = DEFAULT_MODE;
        applyDisplay();
      });
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", displaySettings);
  } else {
    displaySettings();
  }
})();
