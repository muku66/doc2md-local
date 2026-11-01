# 桌面版 / Desktop

本地把 PDF、PPTX、DOCX、XLSX 转为 Markdown，提供命令行和 Tkinter 图形界面。不调用云端转换服务，不上传选中的文件。

## 安装

使用 Python 3（建议 3.11 或更新；具体兼容版本以实际依赖安装结果为准），建议创建虚拟环境。

```sh
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
```

以上命令在 `desktop/` 中执行；Windows 用 `python` 替代 `python3`，激活命令为 `.venv\Scripts\activate`。Tkinter 随多数官方 Python 安装提供；部分 Linux 发行版需另装 `python3-tk`。

## 命令行

```sh
python pdf_ppt_to_md_cli.py example.pdf
python pdf_ppt_to_md_cli.py example.xlsx -o output
python pdf_ppt_to_md_cli.py --dir documents -o output
```

默认写到输入文件所在目录；批量模式只处理该目录，不递归子目录。输出同名文件会被覆盖，请保留原始文件并选择独立输出目录。

## 图形界面

```sh
python pdf_ppt_to_md_gui.py
```

选择一个或多个文件并开始转换，结果保存在原文件所在目录。窗口提示转换成功后检查 `.md` 和 `.csv`。

## Windows exe

若维护者已发布 exe，请到 [GitHub Releases](https://github.com/muku66/doc2md-local/releases) 下载对应版本的发布包，程序统一名为 `doc2md-local.exe`。发布包应同时包含许可证、第三方声明、构建版本记录和 SHA-256 校验文件；源码及依赖源码获取信息应在同一 Release 提供。当前整理阶段尚未生成 exe。

exe 未做代码签名，Windows SmartScreen 可能提示“无法识别的应用”。先核对下载来源及 SHA-256；确认信任后，若系统提供“更多信息 → 仍要运行”可自行选择。哈希匹配不代表软件已通过安全审计；遇到恶意软件检测或单位策略阻止时不要关闭防护或添加排除项，先停止并核查。

构建步骤见 [docs/windows-build.md](docs/windows-build.md)。

## 转换特点和局限

- PDF 使用 pymupdf4llm / PyMuPDF；没有接入 OCR，不承诺扫描件能提取文字。
- PPTX 按形状位置排序，提取文字、表格及存在的讲者备注。
- DOCX 按段落样式处理标题和列表；非标准样式、复杂表格可能需要手动修正。
- XLSX 读取缓存值，不计算公式；Excel 未保存的公式结果可能为空。每个非空工作表生成 CSV（移除全空行，不保留样式和公式），Markdown 最多展示 50 行数据加表头。
- CSV 是解析后的单元格值，不是工作簿的无损备份。金额、日期、公式结果请与原文件核对。
- 不支持 `.doc/.ppt/.xls`；图片、图表、复杂排版不能保证保留。大文件可能占用较多内存。

## 隐私、许可和致谢

转换代码不上传文件、不调用云端模型；安装及下载依赖需要网络。感谢 pymupdf4llm、PyMuPDF、python-pptx、python-docx、openpyxl、Python/Tkinter、PyInstaller。自写桌面代码采用 [AGPL-3.0-only](LICENSE)，第三方依赖见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。软件按现状提供，不附担保。分发二进制时需要按许可证提供相应源码、构建信息与声明；以完整许可证条文为准。

## English

Local PDF/PPTX/DOCX/XLSX-to-Markdown converter with CLI and Tkinter GUI. Install Python and Tkinter, then run `python -m pip install -r requirements.txt` in this directory. Use `python pdf_ppt_to_md_cli.py example.pdf`, `--dir documents` for a non-recursive batch, or `-o output` for an output directory. Launch the GUI with `python pdf_ppt_to_md_gui.py`.

Excel exports up to 50 data rows plus a header in Markdown and all parsed non-empty rows in per-sheet CSV. Formula results must already be cached; formulas are not calculated. Output files may overwrite existing files. No OCR, legacy Office support, layout fidelity or lossless workbook export is promised.

Conversion does not upload files or call a cloud model; dependency installation needs networking. Windows executables, when available, belong in Releases and are unsigned. Verify the source and SHA-256 before choosing to run an unrecognized app; do not disable security software. See the build guide and third-party notices. Original desktop code is AGPL-3.0-only, without warranty.
