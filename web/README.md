# 浏览器版 / Browser version

在浏览器中读取 PDF、DOCX、PPTX、XLSX，并下载 Markdown；XLSX 额外导出工作表 CSV。没有上传接口、云端模型或 CDN。

## 启动

在本目录运行（Python 仅用于提供静态文件，不负责转换）：

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

打开 <http://127.0.0.1:8000/>，英文页为 <http://127.0.0.1:8000/index.en.html>。选择文件后即可转换。全部依赖在 `vendor/` 内，可断网运行。需要支持 ES modules、Web Workers 的现代浏览器。不能直接双击 HTML 使用 `file://`，因为模块及 worker 可能被浏览器安全规则阻止。

也可托管在任意静态服务器的子目录；页面和资源使用相对路径。访问托管页面会产生正常的页面资源请求，选中的文档内容由本机 JavaScript 处理；不要把“文件不上传”理解为网站访问本身没有网络请求。

## 特点与局限

- PDF.js 提供文本层，自写规则恢复标题、段落和简单表格；桌面版更适合注重 PDF 结构的场景，结果仍需人工检查。
- Office 文件使用 JSZip 解压 OOXML 后解析，没有引入其他顶层转换库。
- Excel 默认预览前 50 行（包含表头），可设为 0 显示全部；CSV 包含解析后的各行值，可能包含隐藏工作表，不是原工作簿的无损副本。
- 不计算公式，读取缓存值；日期与格式化数值可能存在精度和格式差异。
- 无 OCR，不支持旧格式 `.doc/.ppt/.xls`；不导出图片，复杂版式不能保证还原。大文件可能耗尽浏览器内存。

## 许可

自写代码采用 [MIT](LICENSE)，包括页面、样式和解析器。第三方文件除外：PDF.js 6.4.299 采用 Apache-2.0；JSZip 3.10.2 选择 MIT。分发库内还包含上游依赖代码，许可证与核实状态见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) 和 [vendor/LICENSES.txt](vendor/LICENSES.txt)。感谢各上游项目。

## English

Serve this directory using `python3 -m http.server 8000 --bind 127.0.0.1`, then visit <http://127.0.0.1:8000/index.en.html>. Do not open via `file://`. No selected file is uploaded; all libraries are local, so the local server can run offline. Hosting may still involve ordinary requests for page assets.

Supports PDF text layers and modern Office files; exports Markdown and worksheet CSV. No OCR, images, legacy Office formats, formula evaluation or lossless layout preservation. Excel preview defaults to 50 rows including the header (0 means all). Original code: MIT. PDF.js: Apache-2.0; JSZip: MIT option. See third-party notices for bundled dependencies.
