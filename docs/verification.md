# 验证记录

日期：2026-11-01。系统：macOS；Python 3.13；浏览器：本机 Chrome（Playwright 无头模式）。测试在临时虚拟环境进行，没有将测试文档或依赖环境放入仓库。

## 已通过

- 两份 Python 源码语法解析，CLI --help 参数与文档一致。
- 使用生成的合成样例验证 CLI、GUI 转换函数：PDF 文本提取、Word 标题正文、PPT 标题正文、Excel CSV。
- Excel 55 行数据样例：Markdown 恰好包含前 50 行数据，CSV 含表头及完整 55 行数据。
- 在 `/web/` 子目录运行中英文页面，分别上传合成的 PDF/DOCX/PPTX/XLSX，检查提取文字和 ZIP 下载。
- 浏览器测试没有页面异常，没有观察到站外请求；未选择真实私人文档。
- HTML 本地资源引用存在，PDF worker 相对路径可用，vendor SHA-256 全部匹配。
- 样例测试版本：pymupdf4llm 0.0.27、PyMuPDF 1.26.7、python-pptx 1.0.2、python-docx 1.2.0、openpyxl 3.1.5。requirements.txt 已固定上述直接依赖。
- 仓库内容约 3.7 MiB；没有 exe、原备份、凭证 JSON、build 或 dist 目录。隐私模式扫描仅命中发布指南中的扫描表达式本身；第三方声明保留上游版权/邮箱。

直接依赖的官方 PyPI 发行包许可快照见 desktop/DEPENDENCY_LICENSES.txt。GNU AGPL 正文来自 https://www.gnu.org/licenses/agpl-3.0.txt，未改写。

## 尚未验证 / 需要核实

- Windows exe 未构建、未签名、未做干净 Windows 验收；Tkinter 窗口交互没有在 Windows 测试。
- PyInstaller 实际版本、排除 pymupdf.layout 的适用性、成品依赖清单、完整许可证包及完整相应源码。
- 复杂 PDF、多语言字体/CMaps、超大文件、扫描件、特殊 Office 版式、所有 Excel 日期/公式边界；合成样例通过不代表全部文档兼容。
- 浏览器内所含传递依赖精确构建版本与官方发布构建清单的一致性，见 web/THIRD_PARTY_NOTICES.md。
- 未进行竞品评测、完整供应链安全审计或跨平台兼容性认证。

## GitHub 状态

用户随后授权代为上传；已创建 muku66/doc2md-local 私有仓库。本次通过系统已有 Git HTTPS 凭据推送，提交身份使用 GitHub 邮箱设置页确认的 noreply 邮箱。首次上传保持 Private；2026-11-01 经独立复查、修复回归与用户再次确认，并由用户完成 GitHub 身份验证后，仓库已改为 Public。没有创建 Release 或发布 exe。发布指南仍保留手动流程供后续维护使用。

## 公开前独立复查（2026-11-01）

- 助理复查未发现凭证、私人路径或桌面/网页许可证混用；Git 历史提交邮箱仅 noreply。
- 修复 GUI 跨线程更新 Tk：后台仅入队，主线程 after 处理日志和完成事件；无 GUI 调度验证通过。
- 修复网页版 Excel 1904 日期系统的偏移方向，并处理 1900 年早期日期和 OOXML boolean true。用真实 XLSX 样例覆盖 1900-01-01、1904-01-01 和 2026-11-01。
- 从 npm 官方发行包逐字节比对 PDF.js 主库、worker、全部 CMaps 和 JSZip 主库，全部一致。
- 将根文档 MIT 正文移到 docs/LICENSE，降低 GitHub 将全仓识别为 MIT 的歧义。
- Windows exe 仍未构建或发布；该项不阻塞当前源码公开。
