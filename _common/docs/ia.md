# 메뉴 구조 (IA) · 페이지 목록

사용자단(kr) 기준. 2026-10-01 확정본.

## 구조 규칙

- 1Depth는 헤더 오른쪽 아이콘 메뉴(통계정보 · 데이터분석 · 알림마당)다.
- 2Depth는 메인메뉴(GNB)에 1단 링크로 나온다. 메인메뉴에는 현재 1Depth의 2Depth만 보이고, 그 아래 뎁스는 없다.
- 목록(list) 화면에는 항상 상세(view) 화면이 짝으로 있다. 파일명은 `이름_list.html` / `이름_view.html`.
- 사이트맵 · 이용안내 · 개인정보처리방침 같은 기타 메뉴는 메인메뉴에 넣지 않는다. 추가가 확정되면 `kr/html/etc/` 아래에 둔다.

## 페이지 목록

| 1Depth | 2Depth | 파일 | Figma 프레임 (컨텐츠 > 컨텐츠 디자인 작업 완료) |
|---|---|---|---|
| 통계정보 | 조사 변천사 | `kr/html/stat/survey_history_list.html` · `survey_history_view.html` | s01통계정보_조사 변천사 list / view |
| 통계정보 | 특수교육 현황 | `kr/html/stat/edu_status.html` | 특수교육현황-학생수기준-계 |
| 통계정보 | 시계열 시각화 | `kr/html/stat/timeseries_list.html` · `timeseries_view.html` | 시계열시각화-list / view |
| 통계정보 | 핵심데이터 시각화 | `kr/html/stat/keydata_list.html` · `keydata_view.html` | 핵심데이터시각화-list / view |
| 데이터분석 | 교차분석 | `kr/html/analysis/cross_analysis.html` | s02데이터분석_교차분석_view |
| 알림마당 | 조사개요 | `kr/html/board/survey_overview.html` | s03알림마당_조사개요 |
| 알림마당 | 공지사항 | `kr/html/board/notice_list.html` · `notice_view.html` | s03알림마당_공지사항 list / view |
| 알림마당 | 자료실 | `kr/html/board/archive_list.html` · `archive_view.html` | s03알림마당_자료실 list / view |
| 알림마당 | 홍보영상 | `kr/html/board/promo_video.html` | s03알림마당_홍보영상 view |

- 헤더 아이콘 메뉴는 각 1Depth의 첫 2Depth 화면으로 이동한다.
- 상세 화면은 페이지 제목 없이 브레드크럼과 공유·인쇄 버튼만 있는 페이지 상단(`.cm-page-top.cm-page-top-view`)을 쓴다.
- 아직 퍼블리싱하지 않은 화면은 본문에 `.cm-todo` 자리표시만 있다. 완성된 화면: 공지사항 목록.

## 공통 영역 인클루드

- 헤더·페이지 상단(브레드크럼·제목)·푸터·모달은 `kr/tmpl/` 에 있고, 페이지에는 `<div data-include="header"></div>` 처럼 자리만 둡니다.
- `kr/js/include.js` 가 KRDS 스크립트보다 먼저 템플릿을 넣고, 위 메뉴 구조(파일 안 `MENU`)로 메인메뉴·모바일 메뉴·브레드크럼·페이지 제목과 현재 메뉴를 채웁니다. 메뉴가 바뀌면 이 표와 `MENU` 를 함께 고칩니다.
- 로컬 서버(`python3 -m http.server`)로 열어야 동작합니다. 파일을 직접 여는 file:// 에서는 인클루드가 되지 않습니다.
- 공공누리 표시는 공지사항용 `kr/tmpl/kogl/notice/`, 자료실용 `kr/tmpl/kogl/archive/` 의 유형별 파일(type0 · type1 · type2 · type3 · type4 · typeAI)을 `<div data-include="kogl/notice/type1"></div>` 처럼 넣습니다. 문구는 Figma 공공누리 컴포넌트 기준이고, 마크 이미지·클래스는 한국문화정보원 공통코드(https://www.kogl.or.kr/edu/eduDataView.do?dataIdx=170)를 씁니다. 개발 시 관리자가 글 등록 때 고른 유형을 인클루드합니다.
