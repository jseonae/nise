/* ==========================================================================
   CmXlsx : 엑셀(.xlsx) 파일을 브라우저에서 바로 읽기 (외부 라이브러리 없음)
   - 쓰는 곳 : 조사 변천사 (kr/js/survey-history.js). 운영자가 서버의 엑셀 파일만 바꾸면 화면이 바뀌게 하려는 용도
   - CmXlsx.read(주소) → { 시트 이름 : [ { 열 이름 : 값, _row : 엑셀 줄 번호 }, ... ] }
       · 시트의 첫 줄을 열 이름으로 보고, 둘째 줄부터 한 줄을 한 건으로 돌려줍니다. 값은 모두 글자이고 앞뒤 공백은 뺍니다.
       · 값이 하나도 없는 줄은 뺍니다. 병합 셀 · 서식 · 메모 · 수식(계산된 값만 읽음)은 다루지 않습니다.
   - 엑셀 파일은 압축(zip)된 XML 묶음이라 ① 파일 받기 ② 압축 풀기 ③ XML 읽기 순서로 처리합니다.
   - 화면을 그리기 전에 값이 필요해 동기 방식으로 받습니다. (kr/js/include.js 와 같은 방식)
     받을 때마다 서버에 바뀌었는지 확인하므로(no-cache) 엑셀을 교체하면 바로 반영됩니다.
   - 읽지 못하면 이유를 담은 오류(Error)를 던집니다. 부르는 쪽에서 안내 문구로 바꿔 보여 줍니다.
   ========================================================================== */
const CmXlsx = (() => {
  const u16 = (b, o) => b[o] | (b[o + 1] << 8);
  const u32 = (b, o) => (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0;

  /* ① 파일을 바이트 그대로 받기 (동기 요청은 responseType 을 쓸 수 없어 글자로 받아 바이트로 되돌림) */
  const fetchBytes = (url) => {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", url, false);
    xhr.overrideMimeType("text/plain; charset=x-user-defined");
    xhr.setRequestHeader("Cache-Control", "no-cache");
    xhr.send();
    if (xhr.status !== 200 && xhr.status !== 0) throw new Error(`엑셀 파일을 받지 못했습니다. (HTTP ${xhr.status})`);
    const text = xhr.responseText;
    const bytes = new Uint8Array(text.length);
    for (let i = 0; i < text.length; i++) bytes[i] = text.charCodeAt(i) & 0xff;
    return bytes;
  };

  /* ② 압축 풀기 : deflate (zip 안의 파일 하나). size 는 풀었을 때 크기 */
  const LEN_BASE = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258];
  const LEN_EXTRA = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0];
  const DIST_BASE = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577];
  const DIST_EXTRA = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13];
  const CODE_ORDER = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];
  // 부호 길이 목록 → 부호표 (길이별 개수 + 길이 순으로 늘어놓은 기호)
  const table = (lengths) => {
    const count = new Uint16Array(16);
    lengths.forEach((len) => count[len]++);
    count[0] = 0;
    const offset = new Uint16Array(16);
    for (let len = 1; len < 16; len++) offset[len] = offset[len - 1] + count[len - 1];
    const symbol = new Uint16Array(lengths.length);
    lengths.forEach((len, sym) => {
      if (len) symbol[offset[len]++] = sym;
    });
    return { count, symbol };
  };
  let fixedTables = null;
  const inflate = (src, size) => {
    const out = new Uint8Array(size);
    let pos = 0;
    let outPos = 0;
    let hold = 0;
    let held = 0;
    const bits = (n) => {
      while (held < n) {
        if (pos >= src.length) throw new Error("엑셀 파일의 압축을 풀지 못했습니다. (파일이 잘렸습니다)");
        hold |= src[pos++] << held;
        held += 8;
      }
      const value = hold & ((1 << n) - 1);
      hold >>>= n;
      held -= n;
      return value;
    };
    const decode = (t) => {
      let code = 0;
      let first = 0;
      let index = 0;
      for (let len = 1; len < 16; len++) {
        code |= bits(1);
        const count = t.count[len];
        if (code - count < first) return t.symbol[index + (code - first)];
        index += count;
        first = (first + count) << 1;
        code <<= 1;
      }
      throw new Error("엑셀 파일의 압축을 풀지 못했습니다. (부호가 맞지 않습니다)");
    };
    let last = 0;
    while (!last) {
      last = bits(1);
      const type = bits(2);
      if (type === 0) {
        // 압축하지 않은 덩어리
        hold = 0;
        held = 0;
        const len = u16(src, pos);
        pos += 4;
        out.set(src.subarray(pos, pos + len), outPos);
        pos += len;
        outPos += len;
        continue;
      }
      if (type === 3) throw new Error("엑셀 파일의 압축을 풀지 못했습니다. (알 수 없는 형식)");
      let lit;
      let dist;
      if (type === 1) {
        if (!fixedTables) {
          const l = [];
          for (let i = 0; i < 288; i++) l.push(i < 144 ? 8 : i < 256 ? 9 : i < 280 ? 7 : 8);
          fixedTables = [table(l), table(new Array(30).fill(5))];
        }
        [lit, dist] = fixedTables;
      } else {
        const nLit = bits(5) + 257;
        const nDist = bits(5) + 1;
        const nCode = bits(4) + 4;
        const codeLens = new Array(19).fill(0);
        for (let i = 0; i < nCode; i++) codeLens[CODE_ORDER[i]] = bits(3);
        const codeTable = table(codeLens);
        const lens = [];
        while (lens.length < nLit + nDist) {
          const sym = decode(codeTable);
          if (sym < 16) lens.push(sym);
          else if (sym === 16) {
            const prev = lens[lens.length - 1];
            for (let n = 3 + bits(2); n > 0; n--) lens.push(prev);
          } else {
            for (let n = sym === 17 ? 3 + bits(3) : 11 + bits(7); n > 0; n--) lens.push(0);
          }
        }
        lit = table(lens.slice(0, nLit));
        dist = table(lens.slice(nLit, nLit + nDist));
      }
      for (;;) {
        const sym = decode(lit);
        if (sym < 256) out[outPos++] = sym;
        else if (sym === 256) break;
        else {
          const len = LEN_BASE[sym - 257] + bits(LEN_EXTRA[sym - 257]);
          const d = decode(dist);
          const from = outPos - (DIST_BASE[d] + bits(DIST_EXTRA[d]));
          if (from < 0) throw new Error("엑셀 파일의 압축을 풀지 못했습니다. (내용이 맞지 않습니다)");
          for (let i = 0; i < len; i++) out[outPos++] = out[from + i];
        }
      }
    }
    return out;
  };

  /* zip 묶음에서 파일 꺼내기 : 이름 → 글자(UTF-8). 필요한 파일만 그때그때 풉니다. */
  const unzip = (bytes) => {
    let end = -1;
    for (let i = bytes.length - 22; i >= 0 && i >= bytes.length - 65557; i--) {
      if (u32(bytes, i) === 0x06054b50) {
        end = i;
        break;
      }
    }
    if (end < 0) throw new Error("엑셀(.xlsx) 파일이 아닙니다.");
    const entries = new Map();
    let p = u32(bytes, end + 16);
    for (let n = u16(bytes, end + 10); n > 0; n--) {
      if (u32(bytes, p) !== 0x02014b50) throw new Error("엑셀 파일을 읽지 못했습니다. (목록이 손상됨)");
      const nameLen = u16(bytes, p + 28);
      const name = new TextDecoder().decode(bytes.subarray(p + 46, p + 46 + nameLen));
      entries.set(name, { method: u16(bytes, p + 10), packed: u32(bytes, p + 20), size: u32(bytes, p + 24), at: u32(bytes, p + 42) });
      p += 46 + nameLen + u16(bytes, p + 30) + u16(bytes, p + 32);
    }
    return {
      has: (name) => entries.has(name),
      text: (name) => {
        const e = entries.get(name);
        if (!e) throw new Error(`엑셀 파일 안에 ${name} 이(가) 없습니다.`);
        const start = e.at + 30 + u16(bytes, e.at + 26) + u16(bytes, e.at + 28);
        const packed = bytes.subarray(start, start + e.packed);
        if (e.method !== 0 && e.method !== 8) throw new Error("엑셀 파일을 읽지 못했습니다. (지원하지 않는 압축 방식)");
        return new TextDecoder("utf-8").decode(e.method === 0 ? packed : inflate(packed, e.size));
      },
    };
  };

  /* ③ XML 읽기 */
  const xml = (text) => new DOMParser().parseFromString(text, "application/xml");
  const all = (node, name) => [...node.getElementsByTagNameNS("*", name)];
  const kids = (node, name) => [...node.children].filter((c) => c.localName === name);
  // 셀 주소(B12) → 열 번호(1)
  const colIndex = (ref) => {
    let n = 0;
    for (const ch of ref.match(/^[A-Z]+/)[0]) n = n * 26 + (ch.charCodeAt(0) - 64);
    return n - 1;
  };

  const read = (url) => {
    const zip = unzip(fetchBytes(url));
    // 공유 문자열 : 일반 글자(t) · 서식이 섞인 글자(r/t)를 이어 붙임, 윗주(rPh)는 뺌
    const shared = zip.has("xl/sharedStrings.xml")
      ? all(xml(zip.text("xl/sharedStrings.xml")), "si").map((si) =>
          [...kids(si, "t"), ...kids(si, "r").flatMap((r) => kids(r, "t"))].map((t) => t.textContent).join(""),
        )
      : [];
    const targets = new Map(all(xml(zip.text("xl/_rels/workbook.xml.rels")), "Relationship").map((r) => [r.getAttribute("Id"), r.getAttribute("Target")]));
    const book = {};
    all(xml(zip.text("xl/workbook.xml")), "sheet").forEach((sheet) => {
      const relId = sheet.getAttribute("r:id") || sheet.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id");
      const target = targets.get(relId) || "";
      const path = target.startsWith("/") ? target.slice(1) : `xl/${target}`;
      const rows = all(xml(zip.text(path)), "row").map((row) => {
        const cells = {};
        kids(row, "c").forEach((c) => {
          const kind = c.getAttribute("t");
          const v = kids(c, "v")[0];
          let value = v ? v.textContent : "";
          if (kind === "s" && v) value = shared[Number(v.textContent)];
          else if (kind === "inlineStr") value = all(c, "t").map((t) => t.textContent).join("");
          cells[colIndex(c.getAttribute("r"))] = (value || "").trim();
        });
        return { number: Number(row.getAttribute("r")), cells };
      });
      const records = [];
      if (rows.length) {
        const names = Object.entries(rows[0].cells).filter(([, name]) => name);
        rows.slice(1).forEach(({ number, cells }) => {
          const record = {};
          names.forEach(([i, name]) => {
            record[name] = cells[i] || "";
          });
          if (Object.values(record).some((value) => value)) {
            record._row = number;
            records.push(record);
          }
        });
      }
      book[sheet.getAttribute("name")] = records;
    });
    return book;
  };

  return { read };
})();
