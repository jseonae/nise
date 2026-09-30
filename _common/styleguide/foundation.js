/* ==========================================================================
   스타일가이드 파운데이션(색상·타이포그래피) 토큰 표시
   - KRDS 토큰 원본(krds_tokens.css, common.css의 :root)을 직접 읽어 값을 채웁니다.
     KRDS를 업그레이드하면 페이지 값도 그대로 따라갑니다.
   - fetch를 사용하므로 로컬 서버(http://)에서 열어야 합니다.
   ========================================================================== */
(function () {
    'use strict';

    var TOKEN_FILES = [
        '../../krds/resources/css/token/krds_tokens.css',
        '../../krds/resources/css/common/common.css'
    ];

    // 원본 CSS의 첫 번째 :root { } 블록에서 --이름: 값; 선언만 추출
    function parseRoot(css) {
        var map = {};
        var start = css.indexOf(':root');
        if (start < 0) return map;
        var open = css.indexOf('{', start);
        var close = css.indexOf('}', open);
        var body = css.slice(open + 1, close).replace(/\/\*[\s\S]*?\*\//g, '');
        var re = /(--[a-z0-9-]+)\s*:\s*([^;]+);/gi;
        var m;
        while ((m = re.exec(body))) map[m[1]] = m[2].trim();
        return map;
    }

    var tokens = {};

    // var(--a) 참조를 끝까지 따라가 최종 값 반환
    function resolve(name, depth) {
        var v = tokens[name];
        if (v === undefined || (depth || 0) > 10) return '';
        var m = /^var\((--[a-z0-9-]+)\)$/i.exec(v);
        return m ? resolve(m[1], (depth || 0) + 1) : v;
    }

    // 한 단계 참조 토큰 이름 (없으면 '')
    function ref(name) {
        var m = /^var\((--[a-z0-9-]+)\)$/i.exec(tokens[name] || '');
        return m ? m[1] : '';
    }

    // rem → px (KRDS는 html font-size 62.5% = 1rem 10px)
    function toPx(value) {
        var m = /^(-?[\d.]+)rem$/.exec(value);
        return m ? +(parseFloat(m[1]) * 10).toFixed(2) + 'px' : value;
    }

    // ---------- 명도 대비 ----------
    function hexToRgb(hex) {
        var h = hex.replace('#', '');
        if (h.length === 3) h = h.replace(/./g, '$&$&');
        if (h.length !== 6) return null; // 투명도(#rrggbbaa) 색상은 대비 계산 제외
        return [0, 2, 4].map(function (i) { return parseInt(h.substr(i, 2), 16); });
    }
    function luminance(rgb) {
        var c = rgb.map(function (v) {
            v /= 255;
            return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    }
    function contrast(a, b) {
        var ra = hexToRgb(a), rb = hexToRgb(b);
        if (!ra || !rb) return null;
        var la = luminance(ra), lb = luminance(rb);
        return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
    }
    // KRDS 매직넘버 기준: 3:1(40) / 4.5:1(50) / 7:1(70) / 15:1(90)
    function grade(ratio) {
        if (ratio >= 15) return '15:1';
        if (ratio >= 7) return '7:1';
        if (ratio >= 4.5) return '4.5:1';
        if (ratio >= 3) return '3:1';
        return '';
    }
    function isLight(hex) {
        var rgb = hexToRgb(hex);
        return rgb ? luminance(rgb) > 0.4 : true;
    }

    function el(tag, cls, text) {
        var e = document.createElement(tag);
        if (cls) e.className = cls;
        if (text !== undefined) e.textContent = text;
        return e;
    }

    // ---------- 원시 색상(Primitive) 팔레트 ----------
    // <div data-sg-palette="--krds-color-light-primary-" data-sg-on="#ffffff"></div>
    var ROLE = { 5: 'surface', 10: 'border', 50: 'base', 60: 'text' }; // 시스템 색상 figma_token.json description
    function renderPalette(box) {
        var prefix = box.dataset.sgPalette;
        var bg = box.dataset.sgOn || '#ffffff';
        var system = box.hasAttribute('data-sg-system');
        var names = Object.keys(tokens).filter(function (n) { return n.indexOf(prefix) === 0; });
        var list = el('ul', 'g-palette');
        names.forEach(function (name) {
            var hex = resolve(name);
            var step = name.slice(prefix.length);
            var li = el('li', 'g-palette-item');
            var chip = el('span', 'g-palette-chip' + (isLight(hex) ? ' is-light' : ''));
            chip.style.backgroundColor = hex;
            chip.appendChild(el('strong', 'g-palette-step', step));
            if (system && ROLE[step]) chip.appendChild(el('span', 'g-palette-role', ROLE[step]));
            li.appendChild(chip);
            var info = el('span', 'g-palette-info');
            info.appendChild(el('code', 'g-token', name));
            info.appendChild(el('span', 'g-hex', hex));
            var ratio = contrast(hex, bg);
            if (ratio) {
                var g = grade(ratio);
                var c = el('span', 'g-contrast' + (g ? '' : ' is-fail'), ratio.toFixed(2) + ':1');
                c.title = (bg === '#ffffff' ? '흰색' : '검정') + ' 배경 대비' + (g ? ' (' + g + ' 충족)' : ' (3:1 미만)');
                info.appendChild(c);
            }
            li.appendChild(info);
            list.appendChild(li);
        });
        box.appendChild(list);
    }

    // ---------- 의미 색상(Semantic) 표 ----------
    // <tbody data-sg-semantic="text"></tbody> → 기본 모드 / 선명한 화면 모드 비교
    function swatchCell(name, dark) {
        var td = el('td');
        var hex = resolve(name);
        var wrap = el('div', 'g-sem');
        var chip = el('span', 'g-sem-chip' + (dark ? ' on-dark' : ''));
        var fill = el('span');
        fill.style.backgroundColor = hex;
        chip.appendChild(fill);
        wrap.appendChild(chip);
        var info = el('span', 'g-sem-info');
        var r = ref(name);
        info.appendChild(el('code', 'g-token', r ? r.replace('--krds-color-', '') : '값 직접 지정'));
        info.appendChild(el('span', 'g-hex', hex));
        wrap.appendChild(info);
        td.appendChild(wrap);
        return td;
    }
    function renderSemantic(tbody) {
        var group = tbody.dataset.sgSemantic;
        var prefix = '--krds-light-color-' + group + '-';
        Object.keys(tokens).filter(function (n) { return n.indexOf(prefix) === 0; }).forEach(function (name) {
            var tr = el('tr');
            var th = el('th');
            th.scope = 'row';
            th.appendChild(el('code', 'g-token', name));
            tr.appendChild(th);
            tr.appendChild(swatchCell(name, false));
            tr.appendChild(swatchCell(name.replace('--krds-light-', '--krds-high-contrast-'), true));
            tbody.appendChild(tr);
        });
    }

    // ---------- 단일 토큰 값 ----------
    // <td data-sg-token="--krds-pc-font-size-display-large"></td>
    // data-sg-lh="1.5" 이면 해당 배수의 줄 높이(px)를 함께 표시
    function renderToken(node) {
        var name = node.dataset.sgToken;
        var v = resolve(name);
        if (!v) { node.textContent = '(토큰 없음)'; node.classList.add('is-missing'); return; }
        var px = toPx(v);
        var text = px !== v ? px + ' (' + v + ')' : v;
        if (node.hasAttribute('data-sg-lh')) {
            var lh = parseFloat(resolve('--krds-line-height-base'));
            text = px + ' / ' + +(parseFloat(px) * lh).toFixed(1) + 'px';
        }
        if (node.hasAttribute('data-sg-short')) text = px;
        node.textContent = text;
    }

    function render() {
        document.querySelectorAll('[data-sg-palette]').forEach(renderPalette);
        document.querySelectorAll('[data-sg-semantic]').forEach(renderSemantic);
        document.querySelectorAll('[data-sg-token]').forEach(renderToken);
    }

    function load() {
        Promise.all(TOKEN_FILES.map(function (f) {
            return fetch(f).then(function (r) {
                if (!r.ok) throw new Error(f);
                return r.text();
            });
        })).then(function (list) {
            list.forEach(function (css) {
                var map = parseRoot(css);
                Object.keys(map).forEach(function (k) { tokens[k] = map[k]; });
            });
            render();
        }).catch(function () {
            document.querySelectorAll('.g-foundation-error').forEach(function (e) { e.hidden = false; });
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', load);
    else load();
})();
