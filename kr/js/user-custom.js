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
