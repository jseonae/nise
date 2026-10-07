#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""메인 '숫자로 보는 특수교육' 인포그래픽 SVG 만들기

사용법 (저장소 루트에서)
    python3 _tools/build_main_stat_svg.py

- Figma(컨텐츠 > section2-1 tab1 의 그래프 4개)에서 내보낸 SVG 를 부품 단위로 정리한 것입니다.
- kr/html/main.html 의 <!-- stat-svg:N --> ~ <!-- /stat-svg:N --> 사이를 다시 채웁니다.
- 움직이는 부품에는 class="m m-종류" 와 시작 시각(--d) · 길이(--t)를 적습니다. 움직임은 kr/css/main.css 3-2 가 맡습니다.
    m-growy 아래에서 위로 자람 / m-growx 왼쪽에서 오른쪽으로 자람 / m-pop 톡 튀어나옴 / m-pop-b 말풍선(아래 기준)
    m-fade 나타남 / m-fadeup 살짝 올라오며 나타남 / m-wipe-up · m-wipe-right 그려지듯 드러남 / m-sweep 고리가 돌며 채워짐
- 수치를 바꿀 때는 아래 값(글자 · data-count)과 main.html 의 aria-label 을 함께 고친 뒤 다시 실행합니다.
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PAGE = ROOT / "kr" / "html" / "main.html"

F = 'font-size="%s" font-weight="%s"'
B15, B13, R13, B17, B24 = F % (15, 700), F % (13, 700), F % (13, 400), F % (17, 700), F % (24, 700)


def m(kind, d, t=None):
    """움직이는 부품 표시 : class + 시작 시각(초) · 길이(초)"""
    style = "--d:%ss" % d + (";--t:%ss" % t if t else "")
    return 'class="m m-%s" style="%s"' % (kind, style)


def count(value, text, d):
    """0 에서 value 까지 올라가는 수치"""
    return '<tspan data-count="%s" data-delay="%s">%s</tspan>' % (value, d, text)


def tooltip(x, y, w, text, tx, d):
    """검은 말풍선 (KRDS 툴팁 모양) : 상자 + 아래 꼬리"""
    ax = x + w / 2
    return (
        '<g %s>'
        '<rect x="%s" y="%s" width="%s" height="31" rx="4" fill="#1E2124"/>'
        '<path d="M%.2f %.2fl4.96 6.37a1 1 0 0 0 1.58 0l4.96-6.37c.5-.66.04-1.61-.8-1.61h-9.9c-.84 0-1.3.95-.8 1.61Z" fill="#1E2124"/>'
        '<text x="%s" y="%s" fill="#fff" %s>%s</text>'
        '</g>'
    ) % (m("pop-b", d, 0.5), x, y, w, ax - 5.75, y + 29.61, tx, y + 20.83, B15, text)


def up(x, y, color):
    """증가 표시 삼각형"""
    return '<path d="M%.2f %.2fl3.76 4.37c.14.16.02.41-.19.41h-7.51c-.21 0-.33-.25-.19-.41l3.76-4.37a.25.25 0 0 1 .37 0Z" fill="%s"/>' % (x, y, color)


# ---------------------------------------------------------------- 1. 특수교육대상학생 : 세로 막대
def svg1():
    return "\n".join([
        '<defs>',
        '<linearGradient id="st1_a" x1="140" y1="140" x2="140" y2="181" gradientUnits="userSpaceOnUse"><stop stop-color="#B1B8BE"/><stop offset="1" stop-color="#F4F5F6"/></linearGradient>',
        '<linearGradient id="st1_b" x1="241" y1="72" x2="241" y2="181" gradientUnits="userSpaceOnUse"><stop stop-color="#256EF4"/><stop offset="1" stop-color="#D8E5FD"/></linearGradient>',
        '<linearGradient id="st1_c" x1="25.6" y1="180.5" x2="284.6" y2="180.5" gradientUnits="userSpaceOnUse"><stop stop-opacity="0"/><stop offset=".485"/></linearGradient>',
        '<linearGradient id="st1_d" x1="206.64" y1="62.77" x2="154.72" y2="116.25" gradientUnits="userSpaceOnUse"><stop stop-color="#256EF4"/><stop offset="1" stop-color="#fff"/></linearGradient>',
        '</defs>',
        '<line x1="284.6" y1="182" x2="25.6" y2="182" stroke="url(#st1_c)" stroke-opacity=".2" stroke-width="2"/>',
        '<!-- 2008 막대 -->',
        '<g %s><path d="M140 115.84c6.1 0 11.95 2.58 16.26 7.17A25.3 25.3 0 0 1 163 140.34V141h-46v-.66c0-6.5 2.42-12.73 6.74-17.33 4.31-4.59 10.16-7.17 16.26-7.17Z" fill="#B1B8BE"/><rect x="117" y="140" width="46" height="41" fill="url(#st1_a)"/></g>' % m("growy", 0, 0.5),
        '<text x="125" y="197.62" fill="#8A949E" %s>2008</text>' % B13,
        '<g %s><text x="93.6" y="120.83" text-anchor="end" fill="#8A949E" %s>%s명</text><line x1="282.6" y1="116" x2="95.6" y2="116" stroke="#000" stroke-opacity=".25" stroke-dasharray="4 4"/></g>' % (m("fade", 0.25), B15, count(71484, "71,484", 0.25)),
        '<!-- 2026 막대 -->',
        '<g %s><path d="M241 47.84c6.1 0 11.95 2.58 16.26 7.17A25.3 25.3 0 0 1 264 72.34V73h-46v-.66c0-6.5 2.42-12.73 6.74-17.33 4.31-4.59 10.16-7.17 16.26-7.17Z" fill="#256EF4"/><path d="M218 72h46v109h-46z" fill="url(#st1_b)"/></g>' % m("growy", 0.5, 0.8),
        '<text x="226" y="197.62" fill="#1E2124" %s>2026</text>' % B13,
        '<g %s><text x="93.6" y="52.83" text-anchor="end" fill="#1E2124" %s>%s명</text><line x1="282.6" y1="48" x2="95.6" y2="48" stroke="#000" stroke-opacity=".25"/>%s<text x="53.6" y="69.62" fill="#2098F3" %s>52,711</text></g>' % (m("fade", 0.7), B15, count(124195, "124,195", 0.7), up(45.6, 62.22, "#2098F3"), R13),
        '<!-- 증가 화살표 -->',
        '<path %s opacity=".5" d="M208.86 47.84s3.06 5.63 3.5 6.46c.98 1.79 1.94 3.57 2.9 5.37.25.47 1.39 2.72 1.39 2.72s-2.05 0-2.72 0c-.87 0-2.27.01-3.14.01.04 2.06-.28 6.51-.55 8.5-1.58 12.17-4.17 21.99-11.79 31-1.07 1.25-3 3.23-4.18 4.35-7.26 6.85-15.27 11.06-21.5 12.1-6.22 1.04-17.67.87-17.67.87v-4.42s3.63.09 4.5.09 9.87-.3 13.67-1.31c3.81-1.01 8.8-2.88 15.71-8.4 1.79-1.45 3.99-3.41 7.29-7.42s7.58-12.84 9.2-23.02c.39-2.44.68-4.48.82-6.31.14-1.83.36-4.64.36-5.94-.58.01-1.43.01-2.02 0-1.18-.01-3.26 0-3.26 0l.71-1.36 6.79-13.29Z" fill="url(#st1_d)"/>' % m("wipe-up", 1.0, 0.6),
        tooltip(191.6, 3, 98, "1.74배 증가", 203.6, 1.5),
    ])


# ---------------------------------------------------------------- 2. 특수학급 운영 유치원 : 작은 원 → 큰 원
SWOOSH2 = "M142.89 76.39c1.49 1.51 3.65 3.83 5.14 5.21-.74.49-4.75 3.92-4.75 3.92l-.18.14-.12.1-.17.13s-7.46 6.06-10.7 9.31c.16-2.13.08-4.15.28-6.35-1.44-.12-2.85-.15-4.31-.17-22.74-.38-46.59 2.52-66.73 13.85-.04.02-.08.08-.12.13-.25.12-.48.27-.7.44l-.06.02c-2.63 1.3-6.11 3.92-8.32 5.57-1.51 1.28-5.24 4.68-6.28 6.3l-3.07 3.91c.48-1.13 1.98-3.21 2.8-4.16l.37-.49c1.88-2.45 4.28-5.18 6.38-7.32 2.18-2.8 5.88-5.98 8.61-8.31C77.03 84.88 97.54 76.69 118.35 73.95c4.2-.55 11.49-1.16 15.66-.85.23-1.74.28-3.61.3-5.37l8.58 8.66Z"


def svg2():
    return "\n".join([
        '<defs>',
        '<linearGradient id="st2_a" x1="200.8" y1="9" x2="200.8" y2="177" gradientUnits="userSpaceOnUse"><stop stop-color="#256EF4"/><stop offset="1" stop-color="#5FB5F7"/></linearGradient>',
        '<linearGradient id="st2_b" x1="151.5" y1="74.01" x2="44.91" y2="109.24" gradientUnits="userSpaceOnUse"><stop stop-color="#BBBDC4"/><stop offset="1" stop-color="#BBBDC4" stop-opacity="0"/></linearGradient>',
        '<clipPath id="st2_c"><circle cx="200.8" cy="93" r="84"/></clipPath>',
        '<clipPath id="st2_d"><circle cx="52.8" cy="137" r="45"/></clipPath>',
        '</defs>',
        '<!-- 2008 작은 원 -->',
        '<g %s><circle cx="52.8" cy="137" r="45" fill="#D7EDFD"/><g clip-path="url(#st2_d)"><path d="M42.36 170.64l10.26-6.98 10.26 6.98v20.49H42.36z" fill="#F9FCFF"/><rect x="52.12" y="156.23" width="1" height="7.66" rx=".5" fill="#AFD7FF"/><path d="M53.12 156.91h5.5c.5 0 .76.22.76.67v2.48c0 .45-.26.68-.76.68h-5.5z" fill="#fff"/></g></g>' % m("pop", 0, 0.5),
        '<text %s x="52.8" y="141.19" text-anchor="middle" fill="#56A3DE" %s>%s개원</text>' % (m("fade", 0.25), B15, count(165, "165", 0.25)),
        '<text x="37.4" y="198.62" fill="#56A3DE" %s>2008</text>' % B13,
        '<!-- 2026 큰 원 -->',
        '<g %s><circle cx="200.8" cy="93" r="84" fill="url(#st2_a)"/><g clip-path="url(#st2_c)"><rect x="199.7" y="126.5" width="2.09" height="15.96" rx="1" fill="#41ACF9"/><path d="M201.8 127.9h11.48c1.04 0 1.56.47 1.56 1.41v5.17c0 .94-.52 1.41-1.56 1.41H201.8z" fill="#E7F4FE"/><path d="M179.36 156.91c0-.66.33-1.28.87-1.65l19.4-13.2a2 2 0 0 1 2.25 0l19.39 13.2c.55.37.88.99.88 1.65v39.66a2 2 0 0 1-2 2h-38.79a2 2 0 0 1-2-2z" fill="#E7F4FE"/></g></g>' % m("pop", 0.65, 0.8),
        '<g %s><text x="200.8" y="87.03" text-anchor="middle" fill="#fff" %s>%s<tspan dx="2" dy="-3.2" font-size="15" fill-opacity=".7">개원</tspan></text>%s<text x="184.8" y="107.62" fill="#fff" %s>1,123</text></g>' % (m("fade", 1.0), B24, count(1288, "1,288", 1.0), up(176.8, 100.22, "#fff"), R13),
        '<!-- 화살표 : 큰 원 위에 겹쳐 그림(곱하기 혼합) -->',
        '<path %s d="%s" fill="url(#st2_b)" style="--d:0.45s;--t:0.5s;mix-blend-mode:multiply"/>' % ('class="m m-wipe-right"', SWOOSH2),
        '<text x="181.8" y="199.38" fill="#0B78CB" %s>2026</text>' % B17,
        tooltip(41.6, 24.7, 98, "7.81배 확대", 53.6, 1.6),
    ])


# ---------------------------------------------------------------- 3. 특수학급 운영 일반학교 : 작은 원 → 도넛
# 학교 그림 (2026 크기 기준). 2008 은 같은 그림을 줄여서 씀
SCHOOL_BODY = "M186.32 118.79c1.27-1 2.22-1.13 3.47.06.1.3.2.6.28.9 1.26.3 4.83.75 6.03.88 4.52.5 4.78.6 4.4 5.2-.03.32-.42.88-.73 1.03-2.73.95-7 1.13-9.71 1.73 0 .55.02 1.2 0 1.74 5.11 3.55 10.58 6.78 15.68 10.35 1.12.78 1.04 2.28.27 3.27-.7.92-1.16 1.93-2.48 2l-.03.87 15.07.02c2.46 0 4.93-.04 7.39.01.38.01 1.7.24 1.92.53.69.9.55 3.03.4 4.11-.41.63-.78 1.1-1.6 1.15.05 1.62-.01 3.45 0 5.09l.01 11.14v6.25c0 1.41.06 2.86-.05 4.26-.03.31-.35.71-.54.98-.26.13-.96.51-1.22.53-1.04.08-2.13.05-3.17.05l-5.38-.02c-5.53.03-11.06.02-16.59-.01-1.68.06-3.54.02-5.25.05-4.5.03-9.22.09-13.71-.01-2.52.01-5.04 0-7.56-.03-7.23.07-14.47.08-21.7.03-.99 0-2.06.06-2.81-.7-.29-.29-.5-.73-.53-1.14-.11-1.45-.06-2.9-.04-4.36.02-1.54.02-3.08 0-4.62 0-5.72-.1-11.83.01-17.51-.44-.03-.82-.25-1.16-.55-.83-.73-.7-3.9-.03-4.6.81-.85 2.94-.65 4.12-.64l5.08.03c5.18.01 10.37-.07 15.55-.02l-.02-.9c-1.33-.21-1.79-.95-2.49-2.05-.55-.86-.55-1.13-.55-2.1.14-.27.42-.82.64-1 1.02-.87 2.38-1.64 3.52-2.37l8.03-5.2c.67-.43 4.87-2.98 5-3.45.67-2.56-.5-8.75.49-10.98Z"
SCHOOL_WING = "M148.88 146.83c.78-.06 1.6 0 2.2 0l5.07.03c3.89.01 7.78-.03 11.66-.04 1.3 0 2.6.01 3.89.02l.01 5.75V172l-.02 5.6c0 .73-.04 2.54.07 3.19.47 0 1.02-.04 1.45.12-7.23.08-14.47.09-21.7.03-.99 0-2.06.06-2.81-.69-.29-.3-.5-.73-.53-1.14-.11-1.45-.06-2.91-.04-4.36.02-1.54.02-3.08 0-4.63 0-5.71-.1-11.82.01-17.5-.44-.03-.82-.26-1.16-.56-.62-.54-.71-2.46-.43-3.68.05-.2.1-.39.17-.55.07-.15.14-.28.23-.37.05-.05.1-.1.17-.14.06-.05.12-.09.19-.13.21-.11.45-.19.72-.25.09-.02.18-.04.27-.05.19-.03.38-.05.58-.06Zm69.69.01c1.23 0 2.46-.01 3.7-.01 1.23 0 2.46 0 3.69.02.05 0 .11.01.18.02.08 0 .16.02.25.03.54.08 1.32.27 1.49.48.26.34.4.85.47 1.42.01.09.02.19.03.28.07.87-.01 1.81-.09 2.42-.26.39-.5.72-.85.92-.06.04-.12.07-.18.09l-.07.03c-.06.02-.12.04-.19.06-.1.02-.21.04-.32.05.05 1.62-.01 3.45 0 5.09l.01 11.14v6.25c0 1.41.06 2.86-.05 4.26-.03.31-.35.71-.53.98-.27.13-.97.51-1.23.53-1.04.08-2.13.05-3.17.05l-5.38-.02c-5.53.03-11.06.02-16.59-.01.33-.21 3.16-.12 3.78-.11-.11-8.35.04-16.72-.03-25.07-.01-1.04-.01-2.1.04-3.13-.09-1.08-.06-2.92-.04-4.43l.02-1.35 15.07.02Z"
SCHOOL_CLOCK = "M187.11 144.9a7.39 7.39 0 0 1 7.88 6.86 7.4 7.4 0 0 1-6.8 7.94 7.4 7.4 0 0 1-7.93-6.86 7.4 7.4 0 0 1 6.85-7.94Z"
SCHOOL_HAND = "M187.5 146.9c.62.09.88.38 1.31.8.1 1.42.06 3.26.06 4.7.7-.02 2.7-.04 2.55 1.39-.03.24-.7.83-.95.96-1.11.01-2.22.01-3.33-.01-.71-.51-.78-.7-.77-1.6.03-1.77-.13-3.63.12-5.39.05-.37.71-.69 1.01-.85Z"
SWOOSH3 = "M125.52 75.66c1.24 1.27 3.04 3.22 4.28 4.38-.62.41-4.39 3.61-4.39 3.61l-.28.26-.28.24s-5.71 4.52-8.43 7.22c.13-1.78.08-3.48.25-5.32-1.2-.1-2.39-.14-3.6-.16-19.05-.4-39.04 1.95-55.95 11.37-.04.02-.07.06-.1.11-.21.1-.41.22-.59.36l-.05.02c-2.2 1.07-5.13 3.26-6.98 4.63-1.27 1.07-4.41 3.9-5.29 5.26l-2.59 3.26c.41-.94 1.67-2.68 2.36-3.47l.31-.41c1.59-2.05 3.6-4.32 5.37-6.11 1.84-2.33 4.95-4.99 7.25-6.93 13.51-11.44 30.71-18.23 48.16-20.45 3.52-.45 9.63-.93 13.12-.66.2-1.45.24-3.02.27-4.49l7.16 7.28Z"


def school(body, wing, transform="", opacity=""):
    attrs = (' transform="%s"' % transform if transform else "") + (' opacity="%s"' % opacity if opacity else "")
    return '<g%s><path d="%s" fill="%s"/><path d="%s" fill="%s"/><path d="%s" fill="#fff"/><path d="%s" fill="%s"/></g>' % (
        attrs, SCHOOL_BODY, body, SCHOOL_WING, wing, SCHOOL_CLOCK, SCHOOL_HAND, body)


def donut(cx, cy, r, width, steps=48):
    """돌아가며 색이 바뀌는 고리 (Figma 의 각도 그라데이션) : 12시에서 시계 방향으로 #256EF4 → #5FB5F7
    SVG 에는 각도 그라데이션이 없어 짧은 호 여러 개를 이어 붙임"""
    import math
    a, b = (37, 110, 244), (95, 181, 247)
    out = []
    for i in range(steps):
        t0 = -90 + 360.0 * i / steps
        t1 = -90 + 360.0 * (i + 1) / steps + (1.5 if i < steps - 1 else 0)  # 틈이 보이지 않게 조금 겹침
        x0, y0 = cx + r * math.cos(math.radians(t0)), cy + r * math.sin(math.radians(t0))
        x1, y1 = cx + r * math.cos(math.radians(t1)), cy + r * math.sin(math.radians(t1))
        k = (i + 0.5) / steps
        color = "#%02X%02X%02X" % tuple(round(a[j] + (b[j] - a[j]) * k) for j in range(3))
        out.append('<path d="M%.2f %.2fA%s %s 0 0 1 %.2f %.2f" stroke="%s"/>' % (x0, y0, r, r, x1, y1, color))
    return '<g fill="none" stroke-width="%s">%s</g>' % (width, "".join(out))


def svg3():
    cx, cy = 187.45, 92
    return "\n".join([
        '<defs>',
        '<linearGradient id="st3_a" x1="132.73" y1="73.69" x2="43.33" y2="102.83" gradientUnits="userSpaceOnUse"><stop stop-color="#BBBDC4"/><stop offset="1" stop-color="#BBBDC4" stop-opacity="0"/></linearGradient>',
        '<clipPath id="st3_b"><circle cx="%s" cy="%s" r="84"/></clipPath>' % (cx, cy),
        '<clipPath id="st3_c"><circle cx="53" cy="131" r="45"/></clipPath>',
        '<!-- 고리가 12시부터 시계 방향으로 채워지게 하는 가림막 -->',
        '<mask id="st3_m" maskUnits="userSpaceOnUse" x="100" y="5" width="175" height="175"><circle %s cx="%s" cy="%s" r="67" fill="none" stroke="#fff" stroke-width="36" pathLength="100" stroke-dasharray="100" transform="rotate(-90 %s %s)"/></mask>' % (m("sweep", 0.65, 1.0), cx, cy, cx, cy),
        '</defs>',
        '<!-- 2008 작은 원 -->',
        '<g %s><circle cx="53" cy="131" r="45" fill="#D7EDFD"/><g clip-path="url(#st3_c)">%s</g></g>' % (m("pop", 0, 0.5), school("#5FB5F7", "#2098F3", "translate(-54.85 78.36) scale(.5727)", ".7")),
        '<text %s x="53" y="133.21" text-anchor="middle" fill="#56A3DE" %s>%s</text>' % (m("fade", 0.25), B15, count(4971, "4,971", 0.25)),
        '<text x="38" y="191.62" fill="#56A3DE" %s>2008</text>' % B13,
        '<!-- 2026 도넛 -->',
        '<g mask="url(#st3_m)">%s<rect x="184.9" y="6" width="3" height="38" fill="#fff"/></g>' % donut(cx, cy, 67, 34),
        '<g %s clip-path="url(#st3_b)">%s</g>' % (m("fadeup", 1.3, 0.5), school("#5FB5F7", "#0B78CB")),
        '<!-- 화살표 : 도넛 위에 겹쳐 그림(곱하기 혼합) -->',
        '<path class="m m-wipe-right" d="%s" fill="url(#st3_a)" style="--d:0.45s;--t:0.5s;mix-blend-mode:multiply"/>' % SWOOSH3,
        '<g %s><text x="%s" y="92.53" text-anchor="middle" fill="#1E2124" %s>%s<tspan dx="2" dy="-3.2" font-size="15" fill-opacity=".7">개교</tspan></text>%s<text x="171.45" y="111.12" fill="#31A3F6" %s>4,959</text></g>' % (m("fade", 0.9), cx, B24, count(9930, "9,930", 0.9), up(163.45, 103.72, "#31A3F6"), R13),
        '<text x="167.9" y="192.04" fill="#0B78CB" %s>2026</text>' % B17,
        '<g %s><rect x="220" y="129" width="67" height="20" rx="10" fill="#EBF5FF"/><text x="228.16" y="143.62" fill="#0084E8" %s>99.8%%↑</text></g>' % (m("pop", 1.5, 0.45), B13),
        tooltip(38, 20.26, 89, "2.0배 확대", 50, 1.7),
    ])


# ---------------------------------------------------------------- 4. 일반학교에서 배우는 특수교육대상학생 : 가로 막대
def svg4():
    return "\n".join([
        '<defs>',
        '<linearGradient id="st4_a" x1="273.45" y1="151" x2="61.57" y2="151" gradientUnits="userSpaceOnUse"><stop stop-color="#0B50D0"/><stop offset="1" stop-color="#4C87F6"/></linearGradient>',
        '<linearGradient id="st4_b" x1="60.61" y1="80" x2="176.61" y2="80" gradientUnits="userSpaceOnUse"><stop stop-color="#8A949E"/><stop offset="1" stop-color="#464C53"/></linearGradient>',
        '</defs>',
        '<line x1="273.95" y1="42" x2="273.95" y2="182" stroke="#000" stroke-opacity=".25"/>',
        '<line x1="50.45" y1="42" x2="50.45" y2="182" stroke="#000" stroke-opacity=".2" stroke-width="2"/>',
        '<line x1="177.11" y1="42.23" x2="177.11" y2="182.23" stroke="#000" stroke-opacity=".25" stroke-dasharray="4 4"/>',
        '<!-- 2008 막대 -->',
        '<path %s d="M51.45 60h105.16a20 20 0 0 1 0 40H51.45z" fill="url(#st4_b)"/>' % m("growx", 0, 0.5),
        '<text %s x="67" y="84.83" fill="#fff" %s>%s명</text>' % (m("fade", 0.3), B15, count(48084, "48,084", 0.3)),
        '<text x="13.6" y="84.62" fill="#8A949E" %s>2008</text>' % B13,
        '<g %s><rect x="153.61" y="179.5" width="46" height="20" rx="2" fill="#fff"/><text x="157.61" y="194.12" fill="#61758F" %s>67.3%%</text></g>' % (m("fade", 0.4), R13),
        '<!-- 2026 막대 -->',
        '<path %s d="M51.45 131h202a20 20 0 0 1 0 40h-202z" fill="url(#st4_a)"/>' % m("growx", 0.5, 0.8),
        '<g %s><text x="67" y="157.33" fill="#fff" %s>%s명</text>%s<text x="147" y="156.62" fill="#fff" %s>43,902</text></g>' % (m("fade", 0.9), B15, count(91986, "91,986", 0.9), up(139, 149.22, "#fff"), R13),
        '<text x="8.6" y="156.83" fill="#1E2124" %s>2026</text>' % B15,
        '<g %s><rect x="244.61" y="179.5" width="46" height="20" rx="2" fill="#fff"/><text x="248.61" y="194.12" fill="#61758F" %s>74.1%%</text></g>' % (m("fade", 1.1), R13),
        '<g %s><rect x="207" y="117.5" width="60" height="20" rx="10" fill="#EBF5FF"/><text x="215.4" y="132.12" fill="#0084E8" %s>6.8%%↑</text></g>' % (m("pop", 1.4, 0.45), B13),
        tooltip(188.6, 75, 98, "1.91배 증가", 200.6, 1.6),
    ])


VIEW = {1: "0 0 290 200", 2: "0 0 290 200", 3: "0 0 290 200", 4: "0 0 291 200"}
BUILD = {1: svg1, 2: svg2, 3: svg3, 4: svg4}


def main():
    page = PAGE.read_text(encoding="utf-8")
    for n in (1, 2, 3, 4):
        pattern = re.compile(r'(<!-- stat-svg:%d -->\n)(.*?)(\n\s*<!-- /stat-svg:%d -->)' % (n, n), re.S)
        found = pattern.search(page)
        if not found:
            raise SystemExit("main.html 에 <!-- stat-svg:%d --> 표시가 없습니다." % n)
        label = re.search(r'aria-label="([^"]*)"', found.group(2))
        if not label:
            raise SystemExit("stat-svg:%d 안에 aria-label 이 없습니다." % n)
        indent = re.match(r"\s*", found.group(3).lstrip("\n")).group(0)
        body = "\n".join(indent + "  " + line for line in BUILD[n]().split("\n"))
        svg = '%s<svg class="cm-stat-svg" viewBox="%s" role="img" aria-label="%s" xmlns="http://www.w3.org/2000/svg" fill="none" focusable="false">\n%s\n%s</svg>' % (
            indent, VIEW[n], label.group(1), body, indent)
        page = page[:found.start(2)] + svg + page[found.end(2):]
    PAGE.write_text(page, encoding="utf-8")
    print("완료 : kr/html/main.html 의 인포그래픽 SVG 4개를 다시 만들었습니다.")


if __name__ == "__main__":
    main()
