# 文件、内容、命令与发布检查

## 1. 文件清单

- 根目录 README.md：双语总览与两个实现的区别。
- desktop/：两份 Python 脚本、build_exe.bat、requirements*.txt、README、AGPL LICENSE、第三方声明、docs/windows-build.md。
- web/：index.html、index.en.html、app.js、core/ 五个文件、assets/ 共享样式与主题逻辑、vendor/ 库/字符映射/许可证/版本/哈希、MIT LICENSE、README、第三方声明。
- docs/：本文、Release 双语草稿、验证记录。
- .gitignore、.gitattributes、docs/LICENSE。

没有复制备份目录的凭证、构建产物或其他私人文件。

## 2. 各文件内容

所有文件已直接写入仓库目录，可用编辑器逐项打开。两套应用不共用转换源码；许可证边界见根 README。第三方许可证原文保留在各自目录，不依靠口头概述代替正文。

## 3. 自己执行的命令

在本机打开终端。下方目录是你自己的本地位置，不是将发布到仓库的个人用户名。

```sh
cd ~/Projects/MukuZone/doc2md-local
```

检查敏感信息（仅输出匹配文件名；逐个本地查看，勿把秘密贴到聊天）：

```sh
rg -l --hidden -g '!.git/**' -g '!web/vendor/**' '(PRIVATE KEY|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_|AKIA[0-9A-Z]{16}|client_secret|private_key|/Users/|C:\\Users\\|dynabook)' .
```

```sh
rg -l --hidden -g '!.git/**' -g '!web/vendor/**' '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}' .
```

```sh
find . -type f -size +50M -not -path './.git/*'
```

先在 GitHub [新建仓库](https://github.com/new) 页面选择 owner=muku66、name=doc2md-local、**Private**，不要自动生成 README/LICENSE/.gitignore。你已登录，不需要提供密码或 token 给聊天。

先到 [GitHub 邮箱设置](https://github.com/settings/emails)，开启隐藏邮箱/阻止暴露邮箱的推送，并复制页面给出的 noreply 邮箱。不要猜带 ID 的地址。输入下列命令时，用自己的真实 noreply 地址替换占位符（这是公开提交身份，不是访问令牌）：

```sh
git init -b main
```

```sh
git config --local user.name muku66
```

```sh
git config --local user.email 'YOUR_GITHUB_NOREPLY_EMAIL'
```

```sh
git config --local --get user.email
```

确认结尾为 @users.noreply.github.com，且没有仍使用占位符，才继续。

```sh
git add -- README.md docs/LICENSE .gitignore .gitattributes desktop web docs
```

```sh
git diff --cached --stat
```

```sh
git diff --cached --check
```

```sh
git status --short
```

```sh
git commit -m "Prepare desktop and browser document converters"
```

```sh
git log -1 --format='%an <%ae>'
```

```sh
git remote add origin https://github.com/muku66/doc2md-local.git
```

```sh
git push -u origin main
```

若终端要求认证，使用 GitHub 支持的浏览器/凭据管理器流程；不要把密码或令牌贴到聊天里。网页已登录并不保证终端 git 已登录。

简介建议：中文“本地文档转 Markdown：Python 桌面版与不上传文件的浏览器版。”；英文“Local document-to-Markdown converters: Python desktop and browser, with no file uploads.”

Topics：markdown、pdf-to-markdown、docx-to-markdown、pptx-to-markdown、xlsx-to-csv、offline、privacy、tkinter、pyinstaller。

### 私有检查完成后

你确认文件和未核实项都处理好后，在仓库 Settings → General → Danger Zone → Change visibility 自行改为 Public。混合许可证仓库可能不会显示单一 AGPL 标识，这是目录级许可结构的结果；应检查两个目录的 LICENSE 和根 README 的说明。

Windows 构建验收后，在 GitHub Releases → Draft a new release 中创建 `v1.0.0` tag（指向与 exe 一致的提交），填入 docs/release-v1.0.0.md，核对所有实际附件名和链接，上传发布包、真实哈希、完整相应源码及必要声明，最后由你点击发布。现在不要发布空壳 exe Release。

## 4. 发布前检查清单

- [ ] 远程仓库为 Private；公开由本人检查后操作。
- [ ] 仅提交 desktop/、web/ 及发布说明，未包含备份、凭证或私人文档。
- [ ] 提交作者邮箱为 GitHub 设置页给出的 noreply。
- [ ] desktop/LICENSE 为 GNU 官方完整 AGPL v3；web/LICENSE 为 MIT。
- [ ] 第三方依赖版本/版权/许可证与实际分发物一致，所有“需要核实”项已处理或明确保留为阻止相应发布的待办。
- [ ] 两种语言页面、PDF worker、CMaps、CSV、ZIP 在独立路径可用，无站点绝对路径遗留。
- [ ] README 在电脑和手机上可读，无竞品优越性声明。
- [ ] git 中没有 exe、build/、dist/ 或异常大文件。
- [ ] Windows 干净机器运行四格式样例，许可证及完整相应源码包齐备。
- [ ] Release SHA-256 是实际发布文件计算值，tag 与 exe 源码一致。
- [ ] 公开后复查源码、许可证、附件下载和说明链接。
