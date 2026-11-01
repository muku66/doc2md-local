# 浏览器版第三方声明

核实日期：2026-11-01。顶层库只有 PDF.js 和 JSZip；它们的构建文件内包含上游依赖，不能把整个 vendor/ 视为本项目 MIT 代码。

| 组件 | 本地版本 / 许可 | 官方依据 |
|---|---|---|
| PDF.js / pdfjs-dist | 6.4.299，Apache-2.0 | [官方版本 LICENSE](https://github.com/mozilla/pdf.js/blob/v6.4.299/LICENSE) |
| JSZip | 3.10.2，双许可中选择 MIT | [官方版本 LICENSE](https://github.com/Stuk/jszip/blob/v3.10.2/LICENSE.markdown) |
| core-js（PDF.js legacy 内含） | 构建中记录 3.50.0，MIT | [官方 LICENSE](https://github.com/zloirock/core-js/blob/v3.50.0/LICENSE) |
| pako（JSZip 内含） | MIT，保留所安装依赖的 LICENSE | [官方 LICENSE](https://github.com/nodeca/pako/blob/1.0.11/LICENSE) |
| lie / immediate | MIT | [lie](https://github.com/calvinmetcalf/lie/blob/master/license.md)、[immediate](https://github.com/calvinmetcalf/immediate/blob/master/LICENSE.txt) |
| setImmediate | MIT | [官方 LICENSE](https://github.com/YuzuJS/setImmediate/blob/master/LICENSE.txt) |
| readable-stream | MIT（含 Node.js / Joyent 声明） | [官方 LICENSE](https://github.com/nodejs/readable-stream/blob/v2.3.8/LICENSE) |

完整本地声明见 [vendor/LICENSES.txt](vendor/LICENSES.txt) 和 [vendor/LICENSE-core-js.txt](vendor/LICENSE-core-js.txt)，还保留了所安装 JSZip 传递依赖的许可文本。压缩文件内原始许可头没有删除。CMaps 目录保留其自带 LICENSE。

资源由现有网站的 node_modules 原样复制，精确文件哈希见 [vendor/SHA256SUMS.txt](vendor/SHA256SUMS.txt)。这不是从官方 release 重新下载后的字节一致性认证。**需要核实**：压缩包中所有传递依赖的精确构建版本与官方构建清单是否完全一致。公开发布前建议依据该版本官方源码构建清单复核；不要声称已完成完整供应链或安全审计。

应用自写 HTML / JS / CSS 使用 web/LICENSE 的 MIT。第三方版权仍属于各上游作者，不使用应用作者署名替换。
