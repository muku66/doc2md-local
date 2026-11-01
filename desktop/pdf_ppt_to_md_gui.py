#!/usr/bin/env python3
# SPDX-License-Identifier: AGPL-3.0-only
# Copyright (C) 2026 muku66
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU Affero General Public License, version 3.
# This program is distributed WITHOUT ANY WARRANTY; without even the implied
# warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
# See LICENSE for the full license text.
"""
PDF/PPTX/DOCX/XLSX 转 Markdown 小工具（图形界面版）
纯本地运行，不联网、不依赖任何AI云端模型。

首次使用前，需要在终端里安装依赖库（只需装一次）：
    pip install -r requirements.txt

装好后，双击运行这个文件（或在终端输入 python3 pdf_ppt_to_md_gui.py），
就会打开一个小窗口，选文件、点转换即可。
"""

import sys
import queue
import threading
import traceback
from pathlib import Path
import tkinter as tk
from tkinter import filedialog, messagebox, scrolledtext


def pdf_to_md(pdf_path: Path) -> str:
    import pymupdf4llm
    return pymupdf4llm.to_markdown(str(pdf_path))


def pptx_to_md(pptx_path: Path) -> str:
    from pptx import Presentation

    prs = Presentation(str(pptx_path))
    lines = []
    for slide_idx, slide in enumerate(prs.slides, start=1):
        lines.append(f"## Slide {slide_idx}\n")
        shapes = sorted(
            slide.shapes,
            key=lambda s: (s.top if s.top is not None else 0,
                            s.left if s.left is not None else 0)
        )
        for shape in shapes:
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
                        indent = "  " * (para.level or 0)
                        lines.append(f"{indent}- {text}")
                lines.append("")
        if slide.has_notes_slide:
            notes = slide.notes_slide.notes_text_frame.text.strip()
            if notes:
                lines.append(f"> 备注：{notes}\n")
        lines.append("---\n")
    return "\n".join(lines)


def docx_to_md(docx_path: Path) -> str:
    from docx import Document

    doc = Document(str(docx_path))
    lines = []

    def is_list_paragraph(style_name: str) -> bool:
        name = style_name.lower()
        return "list" in name or "列表" in style_name

    body = doc.element.body
    table_idx = 0
    tables = doc.tables

    for child in body.iterchildren():
        tag = child.tag.split('}')[-1]

        if tag == 'p':
            para = next((p for p in doc.paragraphs if p._p is child), None)
            if para is None:
                continue
            text = para.text.strip()
            if not text:
                continue

            style_name = (para.style.name or "")
            style_lower = style_name.lower()
            if "heading 1" in style_lower or "title" in style_lower:
                lines.append(f"# {text}\n")
            elif "heading 2" in style_lower:
                lines.append(f"## {text}\n")
            elif "heading 3" in style_lower:
                lines.append(f"### {text}\n")
            elif "heading" in style_lower:
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
    """用 openpyxl 提取 Excel：每个sheet生成markdown表格预览 + 独立csv完整数据"""
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
        rows = [r for r in rows if any(c is not None and str(c).strip() != "" for c in r)]

        if not rows:
            md_lines.append("_（空表）_\n")
            continue

        buf = io.StringIO()
        writer = csv.writer(buf)
        for row in rows:
            writer.writerow(["" if c is None else c for c in row])
        csv_data[sheet_name] = buf.getvalue()

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
    ".doc": "旧版 Word 格式（.doc）暂不支持，请先用 Word 另存为 .docx 后再转换。",
    ".ppt": "旧版 PowerPoint 格式（.ppt）暂不支持，请先用 PowerPoint 另存为 .pptx 后再转换。",
    ".xls": "旧版 Excel 格式（.xls）暂不支持，请先用 Excel 另存为 .xlsx 后再转换。",
}


class App:
    def __init__(self, root):
        self.root = root
        self.ui_events = queue.Queue()
        self.converting = False
        root.title("PDF/PPTX/DOCX/XLSX 转 Markdown 小工具")
        root.geometry("560x450")
        root.resizable(False, False)

        tk.Label(
            root,
            text="选择一个或多个 PDF / PPTX / DOCX / XLSX 文件，点击「开始转换」\n转换结果会保存在原文件所在的文件夹里（Excel会同时生成.md和.csv）\n全程本地运行，不会联网、不会上传任何文件\n（旧版 .doc/.ppt/.xls 暂不支持，请先用 Office 另存为新格式）",
            justify="left", fg="#444"
        ).pack(pady=(15, 10), padx=15, anchor="w")

        btn_frame = tk.Frame(root)
        btn_frame.pack(pady=5)

        self.choose_btn = tk.Button(btn_frame, text="选择文件", width=16, command=self.choose_files)
        self.choose_btn.pack(side="left", padx=5)
        self.convert_btn = tk.Button(btn_frame, text="开始转换", width=16, command=self.start_convert, state="disabled")
        self.convert_btn.pack(side="left", padx=5)

        self.file_label = tk.Label(root, text="尚未选择文件", fg="#888")
        self.file_label.pack(pady=(5, 10))

        tk.Label(root, text="转换日志：").pack(anchor="w", padx=15)
        self.log_box = scrolledtext.ScrolledText(root, height=13, width=64, state="disabled")
        self.log_box.pack(padx=15, pady=(0, 15))

        self.selected_files = []
        self.root.after(100, self.drain_ui_events)

    def choose_files(self):
        files = filedialog.askopenfilenames(
            title="选择 PDF / PPTX / DOCX / XLSX 文件",
            filetypes=[("支持的文件", "*.pdf *.pptx *.docx *.xlsx"), ("所有文件", "*.*")]
        )
        if files:
            self.selected_files = [Path(f) for f in files]
            names = "\n".join(f.name for f in self.selected_files)
            self.file_label.config(text=f"已选择 {len(self.selected_files)} 个文件", fg="#000")
            self.log("已选择文件：\n" + names)
            self.convert_btn.config(state="normal")

    def log(self, text):
        # Worker threads only enqueue data; Tk widgets belong to the main thread.
        self.ui_events.put(("log", text))

    def drain_ui_events(self):
        try:
            while True:
                event, payload = self.ui_events.get_nowait()
                if event == "log":
                    self.log_box.config(state="normal")
                    self.log_box.insert("end", payload + "\n")
                    self.log_box.see("end")
                    self.log_box.config(state="disabled")
                elif event == "finished":
                    self.converting = False
                    self.choose_btn.config(state="normal")
                    self.convert_btn.config(state="normal" if self.selected_files else "disabled")
                    messagebox.showinfo("完成", "转换已完成，请查看日志确认每个文件的结果。")
        except queue.Empty:
            pass
        self.root.after(100, self.drain_ui_events)

    def start_convert(self):
        if self.converting or not self.selected_files:
            return
        self.converting = True
        self.choose_btn.config(state="disabled")
        self.convert_btn.config(state="disabled")
        files = tuple(self.selected_files)
        threading.Thread(target=self.run_conversion, args=(files,), daemon=True).start()

    def run_conversion(self, files):
        try:
            self.convert_all(files)
        except Exception:
            self.log(traceback.format_exc())
        finally:
            self.ui_events.put(("finished", None))

    def convert_all(self, files):
        for f in files:
            suffix = f.suffix.lower()
            if suffix in OLD_FORMAT_HINT:
                self.log(f"✘ {f.name}：{OLD_FORMAT_HINT[suffix]}")
                continue
            try:
                out_names = []
                if suffix == ".pdf":
                    md_text = pdf_to_md(f)
                elif suffix == ".pptx":
                    md_text = pptx_to_md(f)
                elif suffix == ".docx":
                    md_text = docx_to_md(f)
                elif suffix == ".xlsx":
                    md_text, csv_data = xlsx_to_md_and_csv(f)
                    for sheet_name, csv_text in csv_data.items():
                        safe_sheet = "".join(c for c in sheet_name if c not in '\\/:*?"<>|').strip() or "Sheet"
                        csv_path = f.parent / f"{f.stem}_{safe_sheet}.csv"
                        csv_path.write_text(csv_text, encoding="utf-8-sig")
                        out_names.append(csv_path.name)
                else:
                    self.log(f"✘ 跳过不支持的文件：{f.name}")
                    continue
                out_path = f.parent / (f.stem + ".md")
                out_path.write_text(md_text, encoding="utf-8")
                out_names.insert(0, out_path.name)
                self.log(f"✔ {f.name} 转换完成 -> {', '.join(out_names)}")
            except Exception as e:
                self.log(f"✘ {f.name} 转换失败：{e}")
                self.log(traceback.format_exc())
        self.log("\n全部处理完成。")


def main():
    root = tk.Tk()
    App(root)
    root.mainloop()


if __name__ == "__main__":
    main()
