/* ==========================================================================
   사용자단 공통 영역 인클루드 (퍼블리싱용)
   - 페이지의 <div data-include="이름"></div> 를 kr/tmpl/이름.html 로 바꿉니다.
     header(헤더) · page-top(브레드크럼·페이지 제목) · footer(푸터·TOP 버튼) · modal(모달)
   - 템플릿 안의 {{root}}(저장소 루트), {{html}}(kr/html/) 은 실제 경로로 바뀝니다.
   - MENU(메뉴 구조, _common/docs/ia.md)로 메인메뉴·모바일 메뉴·브레드크럼·페이지 제목을 채우고 현재 메뉴를 표시합니다.
   - KRDS 스크립트(ui-script.js)가 메뉴·모달 등을 초기화하기 전에 끝나야 하므로
     KRDS 스크립트보다 먼저 불러오고, 동기 방식으로 읽습니다. (로컬 서버에서 열어야 동작, file:// 불가)
   - 개발 연동 시에는 서버 인클루드(JSP include 등)로 바꾸고 이 파일은 쓰지 않습니다.
   ========================================================================== */
(() => {
  const MENU = [
    {
      name: "통계정보", dir: "stat",
      items: [
        { name: "조사 변천사", file: "survey_history", list: true, desc: "회차별 특수교육 실태조사와 조사 대상자와 조사 문장 구성을 봅니다." },
        { name: "특수교육 현황", file: "edu_status", desc: "2008~2026년 특수교육대상자 수와 특수교육기관 수의 변화를 확인할 수 있습니다." },
        { name: "시계열 시각화", file: "timeseries", list: true, desc: "조사 연도별 실태조사 결과를 그래프로 봅니다." },
        { name: "핵심데이터 시각화", file: "keydata", list: true, desc: "연도별 주요 특수교육 실태조사 데이터를 그래프로 봅니다." },
      ],
    },
    {
      name: "데이터분석", dir: "analysis",
      items: [
        { name: "교차분석", file: "cross_analysis", desc: "특수교육 실태조사 원자료로 문항 응답을 응답자 특성별로 교차분석할 수 있습니다. 가중치를 적용한 그래프와 통계표를 제공합니다." },
      ],
    },
    {
      name: "알림마당", dir: "board",
      items: [
        { name: "조사개요", file: "survey_overview", desc: "" },
        { name: "공지사항", file: "notice", list: true, desc: "새로운 소식과 안내 사항을 알려 드립니다." },
        { name: "자료실", file: "archive", list: true, desc: "특수교육 실태조사 보고서와 통계·정책 자료를 내려받을 수 있습니다." },
        { name: "홍보영상", file: "promo_video", desc: "시스템 소개 영상과 이용 매뉴얼을 제공합니다." },
      ],
    },
  ];

  const script = document.currentScript;
  const krBase = new URL("../", script.src); // kr/
  const htmlBase = new URL("html/", krBase).href; // kr/html/
  const rootBase = new URL("../", krBase).href; // 저장소 루트
  const tmplBase = new URL("tmpl/", krBase).href;

  const pageUrl = (section, item) => `${htmlBase}${section.dir}/${item.list ? `${item.file}_list` : item.file}.html`;

  // 현재 페이지 찾기 (xxx_view.html 은 xxx 목록 메뉴로, xxx_ready.html(준비 중 화면)은 xxx 메뉴로 봄)
  const path = location.pathname;
  const fileName = path.split("/").pop().replace(/\.html$/, "");
  const isView = /_view$/.test(fileName);
  const baseName = fileName.replace(/_(list|view|ready)$/, "");
  let current = null;
  MENU.forEach((section) => {
    section.items.forEach((item) => {
      if (path.includes(`/html/${section.dir}/`) && item.file === baseName) current = { section, item };
    });
  });

  // 1) 템플릿 넣기
  const load = (name) => {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", `${tmplBase}${name}.html`, false);
    xhr.send();
    if (xhr.status !== 200 && xhr.status !== 0) {
      console.error(`[include] ${name}.html 을 불러오지 못했습니다. (${xhr.status})`);
      return "";
    }
    return xhr.responseText.replaceAll("{{root}}", rootBase).replaceAll("{{html}}", htmlBase);
  };
  document.querySelectorAll("[data-include]").forEach((el) => {
    const name = el.getAttribute("data-include");
    const tpl = document.createElement("template");
    tpl.innerHTML = load(name);
    const dataset = { ...el.dataset };
    const nodes = [...tpl.content.childNodes];
    el.replaceWith(...nodes);
    if (name === "page-top") fillPageTop(nodes, dataset);
    // 메인메뉴 없는 헤더 : <div data-include="header" data-gnb="none"> (통합검색처럼 메뉴에 속하지 않는 화면, Figma 헤더 160px)
    if (name === "header" && dataset.gnb === "none") document.querySelector("#krds-header .krds-main-menu")?.remove();
  });

  // 2) 메인메뉴(GNB) · 모바일 메뉴 : 현재 1Depth 의 2Depth
  const section = current ? current.section : MENU[MENU.length - 1];
  const gnb = document.querySelector(".krds-main-menu .gnb-menu");
  if (gnb) {
    gnb.insertAdjacentHTML("beforeend", section.items.map((item) => {
      const on = current && item === current.item;
      return `<li><a href="${pageUrl(section, item)}" class="gnb-main-trigger${on ? " cm-current" : ""}" data-trigger="gnb"${on ? ' aria-current="page"' : ""}>${item.name}</a></li>`;
    }).join(""));
  }
  const mobile = document.querySelector(".cm-mobile-menu");
  if (mobile) {
    mobile.insertAdjacentHTML("beforeend", section.items.map((item) => {
      const on = current && item === current.item;
      return `<li><a href="${pageUrl(section, item)}"${on ? ' aria-current="page"' : ""}>${item.name}</a></li>`;
    }).join(""));
  }

  // 3) 페이지 상단 : 브레드크럼 · 제목 · 설명 (data-title · data-desc 로 바꿀 수 있음)
  function fillPageTop(nodes, dataset) {
    const top = nodes.find((n) => n.nodeType === 1 && n.classList.contains("cm-page-top"));
    if (!top) return;
    const crumb = top.querySelector(".breadcrumb");
    let html = `<li class="home"><a href="${htmlBase}main.html" class="txt">홈</a></li>`;
    if (current) {
      html += `<li><a href="${pageUrl(current.section, current.section.items[0])}" class="txt">${current.section.name}</a></li>`;
      html += `<li><a href="${pageUrl(current.section, current.item)}" class="txt">${current.item.name}</a></li>`;
    }
    // 상세 화면 : data-crumb 가 있으면 현재 글 제목을 마지막 경로로 붙임 (KRDS 브레드크럼과 같은 a.txt, 현재 위치 표시)
    if (dataset.crumb) {
      html += `<li><a href="${location.pathname.split("/").pop()}" class="txt" aria-current="page">${dataset.crumb}</a></li>`;
    }
    crumb.insertAdjacentHTML("beforeend", html);

    const title = top.querySelector(".cm-page-title");
    if (isView || dataset.type === "view") {
      top.classList.add("cm-page-top-view"); // 상세 : 제목 없이 브레드크럼 · 공유/인쇄만
      title.remove();
      return;
    }
    title.querySelector(".h-tit").textContent = dataset.title || (current ? current.item.name : "");
    const desc = dataset.desc !== undefined ? dataset.desc : current ? current.item.desc : "";
    if (desc) title.querySelector(".desc").textContent = desc;
    else title.querySelector(".desc").remove();
  }
})();
