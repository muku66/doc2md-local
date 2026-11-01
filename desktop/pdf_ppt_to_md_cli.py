#!/usr/bin/env python3
# SPDX-License-Identifier: AGPL-3.0-only
# Copyright (C) 2026 muku66
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU Affero General Public License, version 3.
# This program is distributed WITHOUT ANY WARRANTY; without even the implied
# warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
# See LICENSE for the full license text.
"""
PDF / PPTX / DOCX / XLSX 转 Markdown 命令行工具
纯本地运行，不依赖任何云端模型或AI推理，靠解析文件结构直接提取文字。

依赖安装（只需一次）：
    pip install -r requirements.txt

支持格式：.pdf .pptx .docx .xlsx
不支持旧格式 .doc / .ppt / .xls，请先用对应 Office 软件另存为新格式再转换。
Excel 会同时生成一份 .md（表格预览/摘要）和每个 sheet 单独的 .csv（完整原始数据，供精确计算用）。

用法：
    转换单个文件：
        python3 pdf_ppt_to_md_cli.py 文件.pdf
        python3 pdf_ppt_to_md_cli.py 文件.xlsx

    批量转换一个文件夹里所有支持的文件：
        python3 pdf_ppt_to_md_cli.py --dir /路径/到/文件夹

    指定输出目录：
        python3 pdf_ppt_to_md_cli.py 文件.pdf -o /输出/路径
"""

import argparse
import sys
from pathlib import Path


def pdf_to_md(pdf_path: Path) -> str:
    """用 pymupdf4llm 提取 PDF 文字结构为 markdown"""
    import pymupdf4llm
    return pymupdf4llm.to_markdown(str(pdf_path))


def pptx_to_md(pptx_path: Path) -> str:
    """用 python-pptx 逐页提取标题/正文/表格为 markdown"""
    from pptx import Presentation
    from pptx.util import Emu

    prs = Presentation(str(pptx_path))
    lines = []

    for slide_idx, slide in enumerate(prs.slides, start=1):
        lines.append(f"## Slide {slide_idx}\n")

        # 按形状在页面上的位置排序（从上到下，从左到右），顺序更接近人眼阅读顺序
        shapes = sorted(
            slide.shapes,
            key=lambda s: (s.top if s.top is not None else 0,
                            s.left if s.left is not None else 0)
        )

        for shape in shapes:
            # 表格
            if shape.has_table:
                table = shape.table
                rows = list(table.rows)
                if rows:
                    header = [cell.text.strip() for cell in rows[0].cells]
                    lines.append("| " + " | ".join(header) + " |")
                    lines.append("| " + " | ".join(["---"] * len(header)) + " |")
                    for row in rows[1:]:
                        cells = [cell.text.strip() for cell in row.cells]
                        lines.append("| " + " | ".join(cells) + " |")
                    lines.append("")
                continue

            # 文本框（含标题、正文占位符）
            if shape.has_text_frame:
                text_frame = shape.text_frame
                is_title = False
                try:
                    is_title = shape.placeholder_format is not None and \
                               shape.placeholder_format.type is not None and \
                               "TITLE" in str(shape.placeholder_format.type)
                except Exception:
                    pass

                for para in text_frame.paragraphs:
                    text = "".join(run.text for run in para.runs).strip()
                    if not text:
                        continue
                    if is_title:
                        lines.append(f"### {text}\n")
                    else:
                        # 按缩进层级加项目符号
                        indent = "  " * (para.level or 0)
                        lines.append(f"{indent}- {text}")
                lines.append("")

        # 演讲者备注（如果有）
        if slide.has_notes_slide:
            notes = slide.notes_slide.notes_text_frame.text.strip()
            if notes:
                lines.append(f"> 备注：{notes}\n")

        lines.append("---\n")

    return "\n".join(lines)


def docx_to_md(docx_path: Path) -> str:
    """用 python-docx 提取 Word 文档为 markdown（标题、正文、表格、列表）"""
    from docx import Document

    doc = Document(str(docx_path))
    lines = []

    def is_list_paragraph(style_name: str) -> bool:
        # 判断是否为项目符号/编号列表段落（按样式名称判断，兼容中英文Word）
        name = style_name.lower()
        return "list" in name or "列表" in style_name

    # 按文档流顺序遍历段落和表格
    body = doc.element.body
    table_idx = 0
    tables = doc.tables

    for child in body.iterchildren():
        tag = child.tag.split('}')[-1]

        if tag == 'p':
            # 找到对应的 Paragraph 对象
            para = next((p for p in doc.paragraphs if p._p is child), None)
            if para is None:
                continue
            text = para.text.strip()
            if not text:
                continue

            style_name = (para.style.name or "").lower()
            if "heading 1" in style_name or "title" in style_name:
                lines.append(f"# {text}\n")
            elif "heading 2" in style_name:
                lines.append(f"## {text}\n")
            elif "heading 3" in style_name:
                lines.append(f"### {text}\n")
            elif "heading" in style_name:
                lines.append(f"#### {text}\n")
            elif is_list_paragraph(style_name):
                lines.append(f"- {text}")
            else:
                lines.append(text)
                lines.append("")

        elif tag == 'tbl':
            if table_idx < len(tables):
                table = tables[table_idx]
                rows = table.rows
                if rows:
                    header = [cell.text.strip() for cell in rows[0].cells]
                    lines.append("| " + " | ".join(header) + " |")
                    lines.append("| " + " | ".join(["---"] * len(header)) + " |")
                    for row in rows[1:]:
                        cells = [cell.text.strip() for cell in row.cells]
                        lines.append("| " + " | ".join(cells) + " |")
                    lines.append("")
                table_idx += 1

    return "\n".join(lines)


def xlsx_to_md_and_csv(xlsx_path: Path):
    """
    用 openpyxl 提取 Excel 为 markdown（每个sheet一个表格）+ 每个sheet单独的csv（保留完整原始数据）
    返回 (markdown文本, {sheet名: csv文本})
    """
    import openpyxl
    import csv
    import io

    wb = openpyxl.load_workbook(str(xlsx_path), data_only=True)
    md_lines = []
    csv_data = {}

    for sheet_name in wb.sheetnames:
        ws = wb[sheet_name]
        md_lines.append(f"## {sheet_name}\n")

        rows = list(ws.iter_rows(values_only=True))
        # 去掉全空的行
        rows = [r for r in rows if any(c is not None and str(c).strip() != "" for c in r)]

        if not rows:
            md_lines.append("_（空表）_\n")
            continue

        # 生成 CSV（保留完整原始数据，供精确计算）
        buf = io.StringIO()
        writer = csv.writer(buf)
        for row in rows:
            writer.writerow(["" if c is None else c for c in row])
        csv_data[sheet_name] = buf.getvalue()

        # 生成 Markdown 表格（超过50行只放前50行摘要，避免正文过长，完整数据看CSV）
        max_md_rows = 50
        header = [str(c) if c is not None else "" for c in rows[0]]
        md_lines.append("| " + " | ".join(header) + " |")
        md_lines.append("| " + " | ".join(["---"] * len(header)) + " |")
        for row in rows[1:max_md_rows + 1]:
            cells = [str(c) if c is not None else "" for c in row]
            md_lines.append("| " + " | ".join(cells) + " |")
        if len(rows) - 1 > max_md_rows:
            md_lines.append(f"\n_（共 {len(rows) - 1} 行数据，此处仅展示前 {max_md_rows} 行，完整数据见对应 CSV 文件）_")
        md_lines.append("")

    return "\n".join(md_lines), csv_data


OLD_FORMAT_HINT = {
    ".doc": "这是旧版 Word 格式（.doc），本工具不支持直接读取，请先用 Word 打开后「另存为」.docx 格式，再重新转换。",
    ".ppt": "这是旧版 PowerPoint 格式（.ppt），本工具不支持直接读取，请先用 PowerPoint 打开后「另存为」.pptx 格式，再重新转换。",
    ".xls": "这是旧版 Excel 格式（.xls），本工具不支持直接读取，请先用 Excel 打开后「另存为」.xlsx 格式，再重新转换。",
}


def convert_one(path: Path, out_dir: Path = None) -> list:
    """转换单个文件，返回所有生成的输出文件路径列表（.xlsx会额外生成csv）"""
    suffix = path.suffix.lower()

    if suffix in OLD_FORMAT_HINT:
        raise ValueError(OLD_FORMAT_HINT[suffix])

    target_dir = out_dir if out_dir else path.parent
    target_dir.mkdir(parents=True, exist_ok=True)
    outputs = []

    if suffix == ".pdf":
        md_text = pdf_to_md(path)
    elif suffix == ".pptx":
        md_text = pptx_to_md(path)
    elif suffix == ".docx":
        md_text = docx_to_md(path)
    elif suffix == ".xlsx":
        md_text, csv_data = xlsx_to_md_and_csv(path)
        for sheet_name, csv_text in csv_data.items():
            safe_sheet = "".join(c for c in sheet_name if c not in '\\/:*?"<>|').strip() or "Sheet"
            csv_path = target_dir / f"{path.stem}_{safe_sheet}.csv"
            csv_path.write_text(csv_text, encoding="utf-8-sig")
            outputs.append(csv_path)
    else:
        raise ValueError(f"不支持的文件类型：{suffix}（目前支持 .pdf / .pptx / .docx / .xlsx）")

    out_path = target_dir / (path.stem + ".md")
    out_path.write_text(md_text, encoding="utf-8")
    outputs.insert(0, out_path)
    return outputs


def main():
    parser = argparse.ArgumentParser(description="PDF/PPTX/DOCX/XLSX 转 Markdown（纯本地，无需AI模型）")
    parser.add_argument("input", nargs="?", help="要转换的单个文件路径")
    parser.add_argument("--dir", help="批量转换：文件夹路径，会处理里面所有支持的文件")
    parser.add_argument("-o", "--output", help="输出目录路径（可选，默认输出到原文件同目录）")
    args = parser.parse_args()

    if not args.input and not args.dir:
        parser.print_help()
        sys.exit(1)

    if args.dir:
        src_dir = Path(args.dir)
        if not src_dir.is_dir():
            print(f"错误：{src_dir} 不是有效文件夹")
            sys.exit(1)
        out_dir = Path(args.output) if args.output else None
        files = (list(src_dir.glob("*.pdf")) + list(src_dir.glob("*.pptx"))
                 + list(src_dir.glob("*.docx")) + list(src_dir.glob("*.xlsx"))
                 + list(src_dir.glob("*.doc")) + list(src_dir.glob("*.ppt"))
                 + list(src_dir.glob("*.xls")))
        if not files:
            print("文件夹里没找到支持的文件（.pdf / .pptx / .docx / .xlsx）")
            sys.exit(0)
        for f in files:
            try:
                out_paths = convert_one(f, out_dir)
                names = ", ".join(p.name for p in out_paths)
                print(f"✔ {f.name} -> {names}")
            except Exception as e:
                print(f"✘ {f.name} 转换失败：{e}")
    else:
        in_path = Path(args.input)
        if not in_path.is_file():
            print(f"错误：找不到文件 {in_path}")
            sys.exit(1)
        try:
            out_dir = Path(args.output) if args.output else None
            out_paths = convert_one(in_path, out_dir)
            names = ", ".join(str(p) for p in out_paths)
            print(f"✔ 转换完成：{names}")
        except Exception as e:
            print(f"✘ 转换失败：{e}")
            sys.exit(1)


if __name__ == "__main__":
    main()
