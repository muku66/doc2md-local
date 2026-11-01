# doc2md-local

PDF / Word / PowerPoint / Excel 转 Markdown，在本机处理文件。

| 版本 | 适合场景 | 使用方式 | 自写代码许可证 |
|---|---|---|---|
| [desktop](desktop/README.md) | 更注重转换结构，尤其是 PDF | Python 命令行、Tkinter 窗口；Windows 可打包 exe | [AGPL-3.0-only](desktop/LICENSE) |
| [web](web/README.md) | 打开页面即可使用，文件不上传 | 浏览器；可本地运行 | [MIT](web/LICENSE) |

桌面版使用专门的 PDF 转 Markdown 库；网页版基于 PDF.js 文本层和自写规则。桌面版通常能更好地还原 PDF 结构，但具体效果取决于文档，复杂版式请检查结果；此处没有声称经过竞品测评。

支持 `.pdf`、`.docx`、`.pptx`、`.xlsx`。Excel 还输出每个非空工作表的 CSV。没有 OCR，不支持旧版 `.doc/.ppt/.xls`。两个版本均不调用云端转换或大模型服务。

网页版所需脚本均在仓库内，无 CDN；首次从远程站点打开页面需要网络，本地服务器模式可离线使用。桌面版安装依赖需要网络。

## 许可证边界

两个目录是独立实现。MIT 仅适用于 `web/` 的自写代码，不能用于重新许可 `desktop/`。第三方库保留其原许可证，分别见各目录的 THIRD_PARTY_NOTICES.md。根目录说明文档采用 MIT，正文见 [文档 MIT 许可证](docs/LICENSE)。仓库没有统一覆盖所有目录的根 LICENSE。

## English

Convert PDF, DOCX, PPTX and XLSX into Markdown locally; Excel also exports per-sheet CSV.
The desktop version uses a dedicated PDF-to-Markdown library and is intended for better document structure recovery, especially for PDFs; actual results vary. The browser version is ready to use once served, and never uploads selected files. Neither version provides OCR or legacy Office support.

- [Desktop: installation, CLI, GUI and Windows builds](desktop/README.md) — AGPL-3.0-only.
- [Web: local browser use](web/README.md) — MIT for original code; PDF.js Apache-2.0, JSZip MIT option.
- [Publishing guide](docs/publishing.md), [release draft](docs/release-v1.0.0.md), [verification](docs/verification.md).

No Windows executable has been built or signed in this preparation. Release links become available only after the maintainer creates a release.
