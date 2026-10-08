#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""특수교육 현황 연도별 추이 통계표 · 그래프 마크업 만들기

사용법 (저장소 루트에서)
    python3 _tools/build_edu_status.py

- 값은 kr/data/edu_status/edu_status.json 에 있습니다. (원본 : 화면설계서 통합본 sub_0102 의 TD · TNOTE · NOGROWTH)
- kr/html/stat/edu_status.html 의 아래 두 구간을 다시 채웁니다.
    <!-- es-data:student-level --> ~ <!-- /es-data:student-level -->   학생 수 탭의 급별 (배치 5가지)
    <!-- es-data:institution -->   ~ <!-- /es-data:institution -->     기관 수 탭 전체 (조회 도구 + 계 · 배치별 · 급별)
  학생 수 탭의 계 · 배치별 · 장애유형별은 Figma 화면을 그대로 옮긴 마크업이라 이 스크립트가 건드리지 않습니다. (값은 JSON 과 같음)
- 그래프는 통계표에서 값을 읽으므로(cm-chart.js) 표만 만들면 됩니다. null 은 '미집계'로 적습니다.
- 안내 문구는 화면설계서의 noteOf() 규칙을 옮긴 것입니다.
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PAGE = ROOT / "kr" / "html" / "stat" / "edu_status.html"
DATA = json.loads((ROOT / "kr" / "data" / "edu_status" / "edu_status.json").read_text(encoding="utf-8"))
YEARS = DATA["years"]

# 급별일 때 고르는 배치 : (select 값, 화면 이름, JSON cross 키)
PLACES = [
    ("all", "전체 배치", None),
    ("school", "특수학교", "특수학교"),
    ("class", "일반학교 특수학급", "일반학교 특수학급"),
    ("full", "일반학교 일반학급(완전통합)", "일반학교 일반학급(완전통합)"),
    ("center", "특수교육지원센터", "특수교육지원센터"),
]
SOURCE = "<strong>출처 -</strong> 교육부 국립특수교육원, 특수교육통계 (2008~2026년) — 행정통계 기준으로 실태조사 결과와 집계 대상·시점이 다를 수 있습니다."
SOURCE_INST = SOURCE + "<br>전체 기관 수는 각 연도 통계집 주요 현황 표의 공표 계를 그대로 표기했습니다."
LEVEL_GUIDE = "<p><strong>급별 구분 안내</strong> — 원자료에는 장애유형별 구분이 포함되어 있지 않아 배치 유형을 가로지르는 <strong>학교과정별(장애영아·유치원·초등학교·중학교·고등학교·전공과)</strong> 구분을 제공합니다.</p>"
CENTER_ROW = "특수교육지원센터 장애영아 학급"  # 기관 수 배치별에서 이 줄만 단위가 '학급'

I = "              "  # .cm-es-result 들여쓰기


def num(v, mark=""):
    return "미집계" if v is None else "{:,}".format(v) + mark


def result(basis, place, chart_type, title, table_id, src_id, unit, label, measure, rows, desc="", first_col="23rem",
           tools="#es_tools", attrs="", marks=None, after_table="", notes="", source=SOURCE, row_units=None):
    """그래프 + 통계표 + 안내 한 묶음 (.cm-es-result)"""
    head = "".join('<th scope="col">%s</th>' % y for y in YEARS)
    body = []
    for name, values in rows.items():
        cells = "".join("<td>%s</td>" % num(v, (marks or {}).get(str(YEARS[i]), "") if v is not None else "") for i, v in enumerate(values))
        unit_attr = ' data-chart-unit="%s"' % row_units[name] if row_units and name in row_units else ""
        body.append('%s        <tr%s><th scope="row">%s</th>%s</tr>' % (I, unit_attr, name, cells))
    place_attr = ' data-place="%s"' % place if place else ""
    height = ' data-chart-height="48rem"' if chart_type == "combo" else ""
    out = [
        '%s<div class="cm-es-result" data-basis="%s"%s hidden>' % (I, basis, place_attr),
        "%s  <!-- 그래프 : 신규 컴포넌트 _common/html/code/ext_chart.html (스크립트 cm-chart.js), 값은 아래 통계표에서 읽음 -->" % I,
        '%s  <div class="cm-chart-box cm-es-chart">' % I,
    ]
    if desc:
        out.append('%s    <p class="cm-es-desc">%s</p>' % (I, desc))
    out += [
        '%s    <div class="cm-chart-area">' % I,
        '%s      <div data-cm-chart="%s" data-chart-title="%s" data-chart-table="#%s" data-chart-unit="%s" data-chart-tools="%s"%s%s data-chart-source="#%s"></div>'
        % (I, chart_type, title, table_id, unit, tools, height, attrs, src_id),
        "%s    </div>" % I,
        "%s  </div>" % I,
        '%s  <h3 class="cm-es-tit">통계표</h3>' % I,
        "%s  <!-- 가로 스크롤 표 : 신규 컴포넌트 _common/html/code/ext_table_scroll.html (스크립트 krds-custom.js cmTableScroll) -->" % I,
        '%s  <div class="cm-table-scroll">' % I,
        '%s    <div class="krds-table-wrap cm-stat-table cm-es-table" tabindex="0" role="group" aria-label="%s 표, 좌우로 스크롤">' % (I, label),
        '%s      <table class="tbl col data" id="%s" style="--cm-first-col: %s;">' % (I, table_id, first_col),
        "%s        <caption>%s 표로 구분과 2008년부터 2026년까지 연도별 %s로 구성되어 있습니다.</caption>" % (I, label, measure),
        "%s        <thead>" % I,
        '%s          <tr><th scope="col">구분</th>%s</tr>' % (I, head),
        "%s        </thead>" % I,
        "%s        <tbody>" % I,
        *body,
        "%s        </tbody>" % I,
        "%s      </table>" % I,
        "%s    </div>" % I,
        '%s    <span class="cm-table-scroll-hint" aria-hidden="true"></span>' % I,
        '%s    <div class="cm-table-scroll-ctrl">' % I,
        "%s      <p>표를 좌우로 이동하여 확인하세요.</p>" % I,
        '%s      <button type="button" class="krds-btn small tertiary cm-table-prev" disabled><i class="svg-icon ico-angle left"></i>이전<span class="sr-only"> 열 보기</span></button>' % I,
        '%s      <button type="button" class="krds-btn small tertiary cm-table-next">다음<span class="sr-only"> 열 보기</span><i class="svg-icon ico-angle right"></i></button>' % I,
        "%s    </div>" % I,
        "%s  </div>" % I,
        '%s  <div class="cm-es-notes">' % I,
    ]
    if after_table:
        out.append("%s    %s" % (I, after_table))
    if notes:
        out.append("%s    %s" % (I, notes))
    out += [
        '%s    <p class="cm-source cm-es-source" id="%s">%s</p>' % (I, src_id, source),
        "%s  </div>" % I,
        "%s</div>" % I,
    ]
    return "\n".join(out)


def level_results(metric, prefix, tools, unit, what, measure, desc, title, source):
    """급별 : 배치 5가지 (전체 배치는 byLevel, 나머지는 cross)"""
    data = DATA[metric]
    blocks = []
    for value, name, key in PLACES:
        rows = data["byLevel"] if key is None else data["cross"][key]
        # 기관 수의 특수교육지원센터는 학교 수가 아니라 장애영아 학급 수
        row_unit = "학급" if metric == "institution" and value == "center" else unit
        blocks.append("%s<!-- %s 기준 : 급별 · %s -->" % (I, what, name))
        blocks.append(result(
            "level", value, "multiples", "%s (%s)" % (title, name), "%s_table_level_%s" % (prefix, value), "%s_src_level_%s" % (prefix, value),
            row_unit, "%s 기준 급별 %s" % (what, name), measure if row_unit == unit else "장애영아 학급 수(학급)", rows,
            desc=desc, tools=tools, notes=LEVEL_GUIDE, source=source))
    return "\n".join(blocks)


def student_level():
    return level_results(
        "student", "es", "#es_tools", "명", "학생 수", "학생 수(명)",
        "'장애영아'는 특수학교 장애영아 과정과 특수교육지원센터를 합산한 값입니다 · 2008년은 장애영아 구분이 없어 '미집계'로 표시합니다.",
        "급별 특수교육대상자 수 추이", SOURCE)


def institution_tools():
    return """                <!-- 조회 도구 : 기관 수 기준을 바꾸면 아래 그래프·통계표가 바뀜 (기관 수는 원자료에 장애유형별 구분이 없어 계 · 배치별 · 급별만 있음)
                     퍼블리싱에서는 확인용 스크립트(kr/js/user-custom.js cmEduBasis)가 상태(.cm-es-result)를 바꿔 보여줌, 개발 시 서버 조회로 바꿈 -->
                <div class="cm-ts-tool" id="es2_tools">
                  <div class="cm-ts-tool-filter">
                    <div class="cm-ts-select">
                      <label for="es2_basis">기관 수 기준</label>
                      <select id="es2_basis" class="krds-form-select small" data-es-basis>
                        <option value="total" selected>계</option>
                        <option value="place">배치별</option>
                        <option value="level">급별</option>
                      </select>
                    </div>
                    <!-- 급별일 때만 보이는 배치 선택 -->
                    <div class="cm-ts-select cm-es-sub" hidden>
                      <label for="es2_place" class="sr-only">배치 선택</label>
                      <select id="es2_place" class="krds-form-select small" data-es-place>
%s
                      </select>
                    </div>
                  </div>
                  <div class="cm-ts-tool-btns">
                    <!-- 꺾은선 그래프(배치·급별)에서는 패턴을 쓰지 않아 disabled -->
                    <div class="cm-ts-tool-group">
                      <div class="krds-form-toggle-switch medium">
                        <input type="checkbox" id="es2_pattern" data-chart-option="pattern" checked>
                        <label for="es2_pattern"><span class="switch-toggle"><i></i></span>패턴 적용</label>
                      </div>
                      <div class="krds-form-toggle-switch medium">
                        <input type="checkbox" id="es2_label" data-chart-option="label" checked>
                        <label for="es2_label"><span class="switch-toggle"><i></i></span>레이블 보기</label>
                      </div>
                    </div>
                    <div class="cm-ts-tool-group">
                      <button type="button" class="krds-btn small tertiary" data-chart-action="zoom">차트 확대</button>
                      <!-- 다운로드 : KRDS 드롭다운(krds-drop-wrap), 그래프 이미지(PNG·SVG) · 통계표(CSV) -->
                      <div class="krds-drop-wrap">
                        <button type="button" class="krds-btn small tertiary drop-btn">다운로드 <i class="svg-icon ico-angle"></i></button>
                        <div class="drop-menu">
                          <div class="drop-in">
                            <ul class="drop-list">
                              <li><a href="#" class="item-link" data-chart-download="png">그래프 이미지(PNG)</a></li>
                              <li><a href="#" class="item-link" data-chart-download="svg">그래프 벡터 이미지(SVG)</a></li>
                              <li><a href="#" class="item-link" data-chart-download="csv">통계표(CSV)</a></li>
                            </ul>
                          </div>
                        </div>
                      </div>
                      <button type="button" class="krds-btn small tertiary" data-chart-action="print">인쇄</button>
                    </div>
                  </div>
                </div>""" % "\n".join(
        '                        <option value="%s"%s>%s</option>' % (v, " selected" if v == "all" else "", n) for v, n, _ in PLACES)


def institution():
    data = DATA["institution"]
    notes = DATA["institutionTotalNotes"]
    skip = ",".join(str(y) for y in DATA["institutionNoGrowth"])
    foot = '<p class="cm-es-marks">%s</p>' % "<br>".join("※ %s년: %s" % (y, t) for y, t in notes.items())
    total = result(
        "total", None, "combo", "특수교육기관 수 추이", "es2_table_total", "es2_src_total", "개", "기관 수 기준 계", "기관 수(개)",
        {"전체": data["total"]},
        desc="전체 기관 수는 특수교육통계 주요 현황 표의 공표 계(학교 및 센터 수)입니다 · 연도마다 산식이 달라 2008·2013·2015년은 표 아래 ※ 주석을 확인해 주세요 · 비교할 수 없는 연도의 전년 대비 증가율은 표시하지 않습니다",
        first_col="6.5rem", tools="#es2_tools", attrs=' data-chart-growth-skip="%s"' % skip,
        marks={y: "※" for y in notes}, after_table=foot, source=SOURCE_INST).replace(" hidden>", ">", 1)
    place = result(
        "place", None, "multiples", "배치별 특수교육기관 수 추이", "es2_table_place", "es2_src_place", "개교", "기관 수 기준 배치별",
        "기관 수(개교, 특수교육지원센터는 장애영아 학급 수)", data["byPlacement"],
        desc="계열 간 규모 차이가 커 계열별 독립 패널로 표시합니다 — 패널마다 세로축 눈금이 다르니 값은 축·수치로 확인해 주세요 · 특수교육지원센터의 2008~2009년 값은 원자료에 없어 '미집계'로 표시합니다 · 특수교육지원센터는 기관 수가 아닌 장애영아 학급 수(학급)입니다 · 특수학급 운영 학교와 일반학급 배치 학교는 서로 겹치는 학교가 있어, 패널 값을 더해도 전체 기관 수(공표 계)와 같지 않습니다",
        tools="#es2_tools", source=SOURCE_INST, row_units={CENTER_ROW: "학급"})
    level = level_results(
        "institution", "es2", "#es2_tools", "개교", "기관 수", "기관 수(개교)",
        "이 값은 해당 과정을 설치한 학교 수로, 한 학교가 여러 과정을 함께 운영하면 과정마다 각각 계상되므로 더해서 쓰면 안 됩니다 · '장애영아'는 영아학급을 설치한 특수학교 수입니다(특수교육지원센터 장애영아 학급 수는 배치별에서 제공) · 2008년은 장애영아 구분이 없어 '미집계'로 표시합니다",
        "급별 특수교육기관 수 추이", SOURCE_INST)
    return "\n".join([
        institution_tools(),
        "%s<!-- 기관 수 기준 : 계 -->" % I, total,
        "%s<!-- 기관 수 기준 : 배치별 -->" % I, place,
        level,
    ])


def fill(page, key, html):
    pattern = re.compile(r"(<!-- es-data:%s -->\n).*?([ \t]*<!-- /es-data:%s -->)" % (key, key), re.S)
    page, n = pattern.subn(lambda m: m.group(1) + html + "\n" + m.group(2), page)
    if n != 1:
        raise SystemExit("표시 주석을 찾지 못했습니다 : es-data:%s" % key)
    return page


def main():
    page = PAGE.read_text(encoding="utf-8")
    page = fill(page, "student-level", student_level())
    page = fill(page, "institution", institution())
    PAGE.write_text(page, encoding="utf-8")
    print("다시 만들었습니다 :", PAGE.relative_to(ROOT))


if __name__ == "__main__":
    main()
