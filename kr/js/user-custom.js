/* 사용자 추가 스크립트 */

/* 공유하기 팝업(.cm-share) : SNS 공유 · 페이지 주소 복사
   팝업 열기/닫기는 KRDS 맥락적 도움말 스크립트(ui-script.js krds_contextualHelp)가 처리합니다. */
document.addEventListener("click", (event) => {
  const button = event.target.closest(".cm-share .cm-share-btn");
  if (!button) return;

  const url = encodeURIComponent(location.href);
  const title = encodeURIComponent(document.title);
  const shareUrls = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
    x: `https://twitter.com/intent/tweet?url=${url}&text=${title}`,
    band: `https://band.us/plugin/share?body=${title}%0A${url}&route=${encodeURIComponent(location.hostname)}`,
    naver_blog: `https://blog.naver.com/openapi/share?url=${url}&title=${title}`,
  };
  const type = button.dataset.share;

  if (type === "url") {
    event.preventDefault();
    const done = () => alert("페이지 주소가 복사되었습니다.");
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(location.href).then(done);
    } else {
      const input = document.createElement("textarea");
      input.value = location.href;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      input.remove();
      done();
    }
    return;
  }
  if (shareUrls[type]) button.setAttribute("href", shareUrls[type]);
});

/* [퍼블리싱 확인용] 시계열 시각화 목록 주제 칩 (kr/html/stat/timeseries_list.html)
   고른 주제의 카드만 보여 줍니다. 개발 시 서버 조회로 바꾸고 이 코드는 지웁니다.
   전체 : data-all 카드(Figma 시계열시각화-list), 그 밖 : data-topic 이 같은 카드(Figma 시계열시각화-list-교육과정) */
const cmTsFilter = {
  init() {
    const radios = document.querySelectorAll('input[name="ts_topic"]');
    const cards = document.querySelectorAll(".cm-ts-list > .cm-ts-card");
    if (!radios.length || !cards.length) return;
    radios.forEach((radio) =>
      radio.addEventListener("change", () => {
        const value = radio.value;
        cards.forEach((card) => {
          card.hidden = value === "all" ? card.dataset.all !== "y" : card.dataset.topic !== value;
        });
        const count = document.querySelector(".cm-timeseries .cm-board-count");
        if (count) {
          count.querySelector(".total .num").textContent = radio.dataset.total;
          count.querySelector(".page .last").textContent = radio.dataset.pages;
        }
      })
    );
  },
};
document.addEventListener("DOMContentLoaded", () => cmTsFilter.init());

/* [퍼블리싱 확인용] 특수교육 현황 학생 수 기준 (kr/html/stat/edu_status.html)
   선택에 맞는 그래프·통계표(.cm-es-result[data-basis])를 보여주고, 급별일 때 배치 선택을 보이며, 꺾은선 그래프에서는 패턴 적용을 끔.
   개발 시 서버 조회로 바꾸고 이 코드는 지웁니다. */
const cmEduBasis = {
  init() {
    const select = document.getElementById("es_basis");
    if (!select) return;
    const results = document.querySelectorAll(".cm-es-result");
    const sub = document.querySelector(".cm-es-sub");
    const pattern = document.getElementById("es_pattern");
    const apply = () => {
      const value = select.value;
      results.forEach((result) => {
        result.hidden = result.dataset.basis !== value;
      });
      if (sub) sub.hidden = value !== "level";
      if (pattern) {
        pattern.disabled = value !== "total";
        pattern.checked = value === "total";
      }
      window.dispatchEvent(new Event("resize"));
    };
    select.addEventListener("change", apply);
    apply();
  },
};
document.addEventListener("DOMContentLoaded", () => cmEduBasis.init());
