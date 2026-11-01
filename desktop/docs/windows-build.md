# Windows 构建和验收

在 Windows 上用官方 Python 安装程序安装 Python 与 Tcl/Tk，在源码 `desktop` 目录打开 PowerShell。macOS 不能用此脚本生成可验收的 Windows exe。

```powershell
python -m venv .venv
```

```powershell
.\.venv\Scripts\Activate.ps1
```

```powershell
.\build_exe.bat
```

默认使用官方 PyPI；中国大陆用户可自行选择信任的镜像替换脚本中的 index-url。脚本安装 requirements-build.txt，失败时停止，成功后输出 `dist/doc2md-local.exe`，并复制到 `release/`。应用统一名为 doc2md-local.exe。

保留了原有 `--exclude-module pymupdf.layout` 参数；该排除项在实际安装的 PyMuPDF/pymupdf4llm 版本上是否仍合适、PDF 提取是否正常，**需要核实**，不能声称排除后功能完全不受影响。依赖未锁定，因此不能声称可重复构建。

## 发布包

1. 在未安装 Python 的干净 Windows 机器上测试 exe 启动、四种格式、中文路径、多选和失败提示。
2. 检查 PyInstaller 分析结果和 `release/build-environment.txt`，收集实际包含的 Python/Tcl/Tk、直接及传递依赖的完整许可和版权声明，放到 `release/licenses/`。
3. 将完整相应源码（应用、构建脚本、所需依赖源码与版本/获取说明）放在同一 Release 可下载附件中；保留源码 tag，源码必须与 exe 对应。不要用网站最新版链接替代版本对应关系。
4. 给 exe 生成 SHA-256，写入 release/SHA256SUMS.txt：

```powershell
$hash = (Get-FileHash .\release\doc2md-local.exe -Algorithm SHA256).Hash.ToLower()
```

```powershell
"$hash  doc2md-local.exe" | Set-Content -Encoding ascii .\release\SHA256SUMS.txt
```

5. 把 release 目录的内容压缩为 doc2md-local-windows.zip，连同 SHA256SUMS.txt、源码和发布说明上传 Releases；exe 不进 git。压缩包也建议另外提供 SHA-256。

程序没有代码签名。SmartScreen 的不熟悉应用提示不等同于恶意软件判定；先核查来源和哈希，确认信任后才自行决定运行。不要关闭防护或添加例外来绕过恶意软件检测/组织策略。
