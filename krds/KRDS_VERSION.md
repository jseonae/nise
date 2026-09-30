# KRDS 원본 파일

이 폴더는 KRDS(범정부 UI/UX 디자인 시스템) 원본 파일입니다. **수정하지 마세요.**
추가·변경이 필요한 스타일은 `_common/resources/css/krds-custom.css`, 각 사이트의 `css/` 파일에 작성합니다.

- 출처: https://github.com/KRDS-uiux/krds-uiux
- 버전: 태그 `1.0.6` (commit `508e961bc65ab1aa6660270c7cddcc650d91ead0`, 2025-09-05)
- 가져온 파일: `resources/{cdn,css,fonts,img,js}`, `package.json` (그대로 복사)
- 예외: `resources/img/component/favicon/`은 1.0.6에 없어 태그 `1.1.0` (commit `d6bb184c823e4757f05807ea4646a23e3133b6e6`, 2026-01-12)에서 그대로 가져옴
- 제외: 원본의 `resources/scss`, `html`(컴포넌트 예제 코드), `tokens`

참고: `cdn/krds.min.css`는 이미지 경로가 krds.go.kr 원격 주소로 되어 있어,
로컬 파일을 쓰는 페이지는 `css/common/common.css` + `css/component/component.css`를 불러옵니다.
