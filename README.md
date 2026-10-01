# nise
NISE Center Data Platform

## 디렉토리 구조

```
_common/      공통 소스 (스타일가이드, KRDS 추가 스타일·컴포넌트·폰트·이미지, 문서)
kr/           사용자 사이트 (html, tmpl, css, js)
adm/          관리자 사이트 (html, tmpl, css, js)
krds/         KRDS 원본 (수정 금지, 버전은 krds/KRDS_VERSION.md)
```

CSS 불러오는 순서: KRDS 원본 → `_common/resources/css/krds-base.css`(KRDS 사이트 기본 보정) → `_common/resources/css/krds-custom.css` → 사이트 `krds-theme.css` → 사이트 추가 스타일
