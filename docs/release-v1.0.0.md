# v1.0.0 发布说明草稿 / Release draft

> 尚未发布。Windows 构建、验收、许可证包、相应源码和真实校验值未齐备时，请保留为草稿，不声称 exe 已验证。

## 中文

- 桌面版：PDF / DOCX / PPTX / XLSX 转 Markdown，命令行与 Tkinter GUI；Excel 另导出工作表 CSV。
- 网页版：纯浏览器本地转换，不上传选中的文件；含中文和英文入口，依赖本地提供。
- 无 OCR，不支持旧格式 .doc/.ppt/.xls，复杂版式和公式缓存结果请人工检查。
- 桌面应用 AGPL-3.0-only；网页版自写代码 MIT，PDF.js Apache-2.0、JSZip 选择 MIT。

Windows 附件计划：`doc2md-local-windows.zip`（程序名 `doc2md-local.exe`）、`SHA256SUMS.txt`、`corresponding-source.zip`（名称最终需与实际附件一致）。exe 的真实 SHA-256 见发布附件 SHA256SUMS.txt；当前没有编造校验值。

exe 未签名，SmartScreen 可能提示不熟悉的应用。核对来源和哈希后再决定运行，不要关闭安全防护。

应用源码计划对应 [v1.0.0 tag](https://github.com/muku66/doc2md-local/tree/v1.0.0)，该链接在 tag 创建后才有效。完整相应源码还需包含构建脚本、实际使用依赖所需源码与版本；应放在同一 Release 的源码附件。GitHub 自动生成的应用源码 zip 本身不一定包含全部依赖源码。

## English

Local document-to-Markdown conversion: desktop CLI/GUI and an independent browser version. Excel also exports per-sheet CSV. No OCR or legacy Office support; review complex layouts and cached formula values.

Original desktop code: AGPL-3.0-only. Original web code: MIT; PDF.js: Apache-2.0; JSZip: MIT option.

Windows binaries are unsigned. Verify the download source and the real SHA-256 in the attached SHA256SUMS.txt before running. Do not disable security protection. The executable, notices, build versions and licenses belong in the Windows release package. Provide complete corresponding source, including required dependency source and build scripts, alongside the release. The v1.0.0 source tag link becomes valid only after creation. This draft does not claim a Windows build has been completed or tested.
