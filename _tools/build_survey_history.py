#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""조사 변천사 : 엑셀(_data/survey_history.xlsx) → JSON(kr/data/survey_history/)

사용법 (저장소 루트에서)
    python3 _tools/build_survey_history.py

- 파이썬 기본 기능만 씁니다. 따로 설치할 것이 없습니다.
- 엑셀 시트 3개(차수 · 조사대상자 · 문항)를 읽어 아래 파일을 만듭니다.
    kr/data/survey_history/index.json      목록 화면용 : 차수 · 개요 · 카드(문항 수, 영역별 문항 수)
    kr/data/survey_history/round_N.json    상세 화면용 : 차수 N 의 조사대상자별 표
- 화면은 kr/js/survey-history.js 가 이 JSON 을 읽어 그립니다.
- 문항 수 합계 · 영역 수 · 묶음의 종 수 · 요약 문구는 문항 시트에서 계산합니다. (엑셀에 따로 적지 않습니다)
  단, 영역별 문항수가 없는 차수는 조사대상자 시트의 '문항수' 칸에 전체 문항 수를 적습니다.
- 잘못 적힌 줄이 있으면 어느 시트 몇째 줄인지 알려 주고 멈춥니다.
"""
import json
import re
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "_data" / "survey_history.xlsx"
OUT_DIR = ROOT / "kr" / "data" / "survey_history"

NS = {
    "m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "p": "http://schemas.openxmlformats.org/package/2006/relationships",
}
SHEETS = {
    "차수": ["차수", "연도", "상태", "기준", "영역 이름", "묶음 단위", "문항 단위", "조사 부분", "안내", "출처"],
    "조사대상자": ["번호", "차수", "묶음", "순서", "조사대상자", "문항수"],
    "문항": ["번호", "순서", "영역", "세부 조사 문항", "문항수", "주석"],
}


class DataError(Exception):
    pass


def col_index(ref):
    """셀 주소(B12) → 열 번호(1)"""
    letters = re.match(r"[A-Z]+", ref).group(0)
    n = 0
    for ch in letters:
        n = n * 26 + (ord(ch) - 64)
    return n - 1


def read_xlsx(path):
    """엑셀 → { 시트 이름 : [ {열 이름: 값, "_row": 줄 번호}, ... ] }"""
    with zipfile.ZipFile(path) as z:
        shared = []
        if "xl/sharedStrings.xml" in z.namelist():
            for si in ET.fromstring(z.read("xl/sharedStrings.xml")).findall("m:si", NS):
                # 일반 글자(t) · 서식이 섞인 글자(r/t) 모두 이어 붙임, 윗주(rPh)는 뺌
                shared.append("".join(t.text or "" for t in si.findall("m:t", NS) + si.findall("m:r/m:t", NS)))
        book = ET.fromstring(z.read("xl/workbook.xml"))
        rels = {r.get("Id"): r.get("Target") for r in ET.fromstring(z.read("xl/_rels/workbook.xml.rels")).findall("p:Relationship", NS)}
        result = {}
        for sheet in book.find("m:sheets", NS).findall("m:sheet", NS):
            target = rels[sheet.get("{%s}id" % NS["r"])]
            target = target[1:] if target.startswith("/") else "xl/" + target
            rows = []
            for row in ET.fromstring(z.read(target)).iter("{%s}row" % NS["m"]):
                cells = {}
                for c in row.findall("m:c", NS):
                    kind = c.get("t")
                    v = c.find("m:v", NS)
                    if kind == "s" and v is not None:
                        value = shared[int(v.text)]
                    elif kind == "inlineStr":
                        value = "".join(t.text or "" for t in c.iter("{%s}t" % NS["m"]))
                    else:
                        value = v.text if v is not None else ""
                    cells[col_index(c.get("r"))] = (value or "").strip()
                rows.append((int(row.get("r")), cells))
            if not rows:
                result[sheet.get("name")] = []
                continue
            head = rows[0][1]
            names = {i: head[i] for i in head if head[i]}
            records = []
            for number, cells in rows[1:]:
                record = {names[i]: cells.get(i, "") for i in names}
                if any(record.values()):
                    record["_row"] = number
                    records.append(record)
            result[sheet.get("name")] = records
        return result


def as_int(value, sheet, row, name, required=True):
    if value == "":
        if required:
            raise DataError(f"[{sheet}] {row}번째 줄 : '{name}' 칸이 비어 있습니다.")
        return None
    try:
        number = float(value)
    except ValueError:
        raise DataError(f"[{sheet}] {row}번째 줄 : '{name}' 칸은 숫자여야 합니다. (지금 값 : {value})")
    if number != int(number):
        raise DataError(f"[{sheet}] {row}번째 줄 : '{name}' 칸은 소수점 없는 숫자여야 합니다. (지금 값 : {value})")
    return int(number)


def build(book):
    for sheet, columns in SHEETS.items():
        if sheet not in book:
            raise DataError(f"엑셀에 '{sheet}' 시트가 없습니다.")
        if book[sheet]:
            missing = [c for c in columns if c not in book[sheet][0]]
            if missing:
                raise DataError(f"[{sheet}] 첫 줄(제목 줄)에 다음 열이 없습니다 : {', '.join(missing)}")

    # 1) 차수
    rounds = {}
    for r in book["차수"]:
        n = as_int(r["차수"], "차수", r["_row"], "차수")
        if n in rounds:
            raise DataError(f"[차수] {r['_row']}번째 줄 : 차수 {n} 이(가) 두 번 적혀 있습니다.")
        state = r["상태"] or "공개"
        if state not in ("공개", "예정"):
            raise DataError(f"[차수] {r['_row']}번째 줄 : '상태' 칸은 공개 또는 예정이어야 합니다. (지금 값 : {state})")
        rounds[n] = {
            "round": n,
            "year": as_int(r["연도"], "차수", r["_row"], "연도"),
            "open": state == "공개",
            "axis": "조사 부문" if r["기준"] == "부문" else "조사 대상자",
            "areaWord": r["영역 이름"] or "영역",
            "groupUnit": r["묶음 단위"] or "종",
            "unit": r["문항 단위"] or "문항",
            "parts": [line.strip() for line in r["조사 부분"].splitlines() if line.strip()],
            "note": r["안내"],
            "source": r["출처"],
            "targets": [],
        }

    # 2) 조사대상자
    targets = {}
    for t in book["조사대상자"]:
        tid = as_int(t["번호"], "조사대상자", t["_row"], "번호")
        n = as_int(t["차수"], "조사대상자", t["_row"], "차수")
        if tid in targets:
            raise DataError(f"[조사대상자] {t['_row']}번째 줄 : 번호 {tid} 이(가) 두 번 적혀 있습니다.")
        if n not in rounds:
            raise DataError(f"[조사대상자] {t['_row']}번째 줄 : 차수 {n} 이(가) '차수' 시트에 없습니다.")
        if not t["조사대상자"]:
            raise DataError(f"[조사대상자] {t['_row']}번째 줄 : '조사대상자' 칸이 비어 있습니다.")
        targets[tid] = {
            "id": tid,
            "group": t["묶음"],
            "order": as_int(t["순서"], "조사대상자", t["_row"], "순서"),
            "label": t["조사대상자"],
            "fixedTotal": as_int(t["문항수"], "조사대상자", t["_row"], "문항수", required=False),
            "row": t["_row"],
            "areas": [],
        }
        rounds[n]["targets"].append(targets[tid])

    # 3) 문항 (표의 행)
    for q in book["문항"]:
        tid = as_int(q["번호"], "문항", q["_row"], "번호")
        if tid not in targets:
            raise DataError(f"[문항] {q['_row']}번째 줄 : 번호 {tid} 이(가) '조사대상자' 시트에 없습니다.")
        if not q["영역"]:
            raise DataError(f"[문항] {q['_row']}번째 줄 : '영역' 칸이 비어 있습니다.")
        targets[tid]["areas"].append({
            "order": as_int(q["순서"], "문항", q["_row"], "순서"),
            "name": q["영역"],
            "detail": q["세부 조사 문항"],
            "count": as_int(q["문항수"], "문항", q["_row"], "문항수", required=False),
            "note": q["주석"],
        })

    # 4) 계산 : 합계 · 영역 수 · 묶음 · 요약 문구 · 이전글/다음글
    index = {"rounds": []}
    files = {}
    for n in sorted(rounds):
        rd = rounds[n]
        rd["targets"].sort(key=lambda t: t["order"])
        for t in rd["targets"]:
            t["areas"].sort(key=lambda a: a["order"])
            if rd["open"] and not t["areas"]:
                raise DataError(f"[문항] 번호 {t['id']} ({t['label']}) 의 문항 줄이 하나도 없습니다.")
            # 문항 수 : 문항 시트의 영역별 문항수를 더함. 영역별 문항수가 없는 차수는 조사대상자 시트의 문항수를 씀
            counted = sum(a["count"] or 0 for a in t["areas"])
            fixed = t.pop("fixedTotal")
            row = t.pop("row")
            if fixed is not None and counted and fixed != counted:
                raise DataError(f"[조사대상자] {row}번째 줄 : 문항수 {fixed} 이(가) 문항 시트의 합계 {counted} 과(와) 다릅니다. 한쪽을 고치거나 이 칸을 비워 주세요.")
            t["total"] = fixed if fixed is not None else counted
            for a in t["areas"]:
                del a["order"]
        total = sum(t["total"] for t in rd["targets"])
        areas = sum(len(t["areas"]) for t in rd["targets"])
        rd["summary"] = f"{rd['axis']} {len(rd['targets'])}개·{rd['areaWord']} {areas}개·총 {total}{rd['unit']}" if rd["targets"] else ""
        groups = []
        for t in rd["targets"]:
            if not groups or groups[-1]["title"] != t["group"]:
                groups.append({"title": t["group"], "targets": []})
            groups[-1]["targets"].append(t)
        head = {k: rd[k] for k in ("round", "year", "open", "areaWord", "groupUnit", "unit", "parts", "note", "summary")}
        # 목록용 : 카드에 필요한 값만 (세부 조사 문항 글은 뺌)
        index["rounds"].append(dict(head, groups=[{
            "title": g["title"],
            "targets": [{"id": t["id"], "label": t["label"], "total": t["total"],
                         "areas": [{"name": a["name"], "count": a["count"]} for a in t["areas"]]} for t in g["targets"]],
        } for g in groups]))
        # 상세용 : 차수 하나의 모든 조사대상자
        if rd["open"]:
            ordered = rd["targets"]
            files[f"round_{n}.json"] = dict(head, source=rd["source"], targets=[{
                "id": t["id"], "label": t["label"], "total": t["total"], "areas": t["areas"],
                "prev": ordered[i - 1]["id"] if i > 0 else None,
                "next": ordered[i + 1]["id"] if i < len(ordered) - 1 else None,
            } for i, t in enumerate(ordered)])
    files["index.json"] = index
    return files


def main():
    if not SOURCE.exists():
        print(f"엑셀 파일이 없습니다 : {SOURCE}")
        return 1
    try:
        files = build(read_xlsx(SOURCE))
    except DataError as error:
        print(f"엑셀 내용을 확인해 주세요.\n  {error}")
        return 1
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for old in OUT_DIR.glob("*.json"):
        if old.name not in files:
            old.unlink()
    for name, data in files.items():
        (OUT_DIR / name).write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    rounds = files["index.json"]["rounds"]
    count = sum(len(g["targets"]) for r in rounds for g in r["groups"])
    print(f"완료 : 차수 {len(rounds)}개, 조사대상자 {count}종 → {OUT_DIR.relative_to(ROOT)}/ ({len(files)}개 파일)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
