# 桌面版第三方依赖

核实日期：2026-11-01。以下是源码所需的直接依赖及构建组件，不是 Windows 成品的完整 SBOM。直接依赖已固定到样例测试版本（pymupdf4llm 0.0.27、PyMuPDF 1.26.7 等）；传递依赖和构建工具尚未全部锁定；发 exe 前必须记录实际版本，收集全部传递依赖许可证及对应源码，重新核实该版本的条款。未完成项标为“需要核实”。

| 组件 | 核实结果 | 官方依据 |
|---|---|---|
| pymupdf4llm | 官方 LICENSE 为 AGPL-3.0；本项目按 AGPL-3.0 路径使用 | [LICENSE](https://github.com/pymupdf/pymupdf4llm/blob/main/LICENSE) |
| PyMuPDF | 官方 COPYING 为 AGPL-3.0；不假设已获得商业许可 | [COPYING](https://github.com/pymupdf/PyMuPDF/blob/main/COPYING) |
| python-pptx | MIT | [LICENSE](https://github.com/scanny/python-pptx/blob/master/LICENSE) |
| python-docx | MIT | [LICENSE](https://github.com/python-openxml/python-docx/blob/master/LICENSE) |
| openpyxl | PyPI 标注 MIT；官方源码仓库页面未成功读取，已检查官方 PyPI 下载的 3.1.5 发行包 LICENCE.rst 为 MIT；官方源码页面仍需要核实 | [PyPI](https://pypi.org/project/openpyxl/)、[官方源码](https://foss.heptapod.net/openpyxl/openpyxl) |
| PyInstaller | GPL-2.0-or-later，含 Bootloader exception；runtime hooks 等另采用 Apache-2.0 | [COPYING.txt](https://github.com/pyinstaller/pyinstaller/blob/develop/COPYING.txt) |
| Python / tkinter Python 包装层 | Python 许可文件（PSF 等历史条款）；不是 AGPL | [CPython LICENSE](https://github.com/python/cpython/blob/3.13/LICENSE) |
| Tcl / Tk 底层运行时 | 各自 license.terms 的宽松许可，须保留声明；实际打包版本需要核实 | [Tcl](https://github.com/tcltk/tcl/blob/core-8-6-branch/license.terms)、[Tk](https://github.com/tcltk/tk/blob/core-8-6-branch/license.terms) |

Windows 成品中的 MuPDF、lxml、Pillow、et_xmlfile、字体、运行库及其他实际依赖是否被包含，以及对应版本、源码和声明：**需要核实**，以构建环境和 PyInstaller 分析结果为准。不要仅把这张表当作二进制分发合规包。开源路径下发布 exe 时，请提供完整相应源码（包括所需依赖源码及构建脚本），不能只链接两个应用 Python 文件。

许可证正文及上游版权声明不因本项目采用 AGPL 而消失。`desktop/LICENSE` 是从 GNU 官网下载的完整未改写 AGPL v3 正文。本项目源文件声明为 AGPL-3.0-only。

兼容性：2026-10-19 发布的 pymupdf4llm 2.0 在 [官方 PyPI](https://pypi.org/project/pymupdf4llm/2.0/) 被说明为空迁移包，不能单独满足现有 import。因此 requirements.txt 保留 0.0.27 API，并固定 PyMuPDF 1.26.7；Windows 成品仍需复核实际依赖与排除参数。

选择 0.0.27 是为沿用经典规则解析路径，避免后续版本引入 layout 模型依赖；具体兼容性见验证记录。
