# Node.js Example Project

这是基于 `api.md` 规范实现的出勤管理后台服务，使用 Node.js + Express + MongoDB。

## 功能概览

- 鉴权：管理员账号密码登录、微信登录（示例实现）、刷新/登出逻辑。  
- 用户：当前用户查询、管理员获取全量用户、管理员提升/降级角色。  
- 组长端：部门绑定、组员 CRUD、出勤记录提交与查询、历史记录写入。  
- 管理员端：分组出勤概览、导出任务创建与查询、打卡数据上传与异常检测示例、通知发送。

## 快速开始

```bash
npm install
cp .env.example .env   # 请根据实际环境填写变量
npm run dev
```

MongoDB 连接信息、JWT 密钥、上传目录等可在 `.env` 中配置。

### 微信小程序配置

如需使用真实的微信快捷登录，请在 `.env` 中设置：

```bash
WECHAT_APP_ID=wx_your_mini_program_appid
WECHAT_APP_SECRET=your_mini_program_secret
```

未配置时，后端会使用基于 `code` 的 mock openId，仅适用于本地调试，生产环境务必配置真实参数。

### 管理员密码初始化

`ADMIN_PASSWORD_HASH` 需要是管理员密码（默认 `030426`）的 bcrypt 哈希。例如：

```bash
node -e "console.log(require('bcryptjs').hashSync('030426', 10))"
```

将打印的哈希填入 `.env` 中，否则管理员登录会失败。

## 开发备注

 - `POST /api/auth/login-wechat` 会在配置 `WECHAT_APP_ID` 和 `WECHAT_APP_SECRET` 后，通过微信服务端换取 `openid/unionid` 并复用同一账号；若未配置，则退回到基于 `code` 的 mock openId（仅供本地开发）。  
- 导出任务、打卡上传、异常报告下载目前为同步示例与占位实现，可按需替换为真实的异步任务与文件生成逻辑。  
- 上传的文件会被保存在 `UPLOAD_DIR` 指定的目录。  
- 模板文件 `templates/dummy-report.xlsx` 为下载接口的占位文件，可替换为真实模板。

## Environment

This project runs on a Debian 12 system with Node.js, which is pre-configured in the Devbox environment. You don't need to worry about setting up Node.js or system dependencies yourself. The development environment includes all necessary tools for building and running Node.js applications. If you need to make adjustments to match your specific requirements, you can modify the configuration files accordingly.

## Project Execution
**Development mode:** For normal development environment, simply enter Devbox and run `bash entrypoint.sh` in the terminal.
**Production mode:** After release, the project will be automatically packaged into a Docker image and deployed according to the `entrypoint.sh` script and command parameters.

Within Devbox, you only need to focus on development - you can trust that everything is application-ready XD


DevBox: Code. Build. Deploy. We've Got the Rest.

With DevBox, you can focus entirely on writing great code while we handle the infrastructure, scaling, and deployment. Seamless development from start to production. 