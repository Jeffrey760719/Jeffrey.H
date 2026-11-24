# 小蜜 V1.5.2 — Android 测试准备版（免费开发）

V1.5.2 在 V1.4 离线学习管理功能基础上，完善 Android 应用图标、启动画面、版本号、EAS APK 构建配置和项目自检脚本，并加强本地备份恢复的数据校验。仍然不请求 OpenAI API，不需要 API Key，也不会产生 OpenAI API 费用。

## 本版本功能

- 首页、八大学科入口、学习助手、学习数据、个人中心。
- 免费离线学习方法提示；它不是生成式 AI，不能保证给出每道题的准确答案。
- 昵称与年级、本地学习记录、收藏、错题本、每日任务与打卡。
- 学习记录关键词搜索和逐条删除。
- JSON 文本备份与恢复；恢复时校验版本、字段类型、记录数量及文本长度，拒绝不符合格式或超过 2 MB 的备份。
- Android 应用图标、自适应图标、启动画面和 APK 预览构建配置。

## 环境要求

- Node.js 20 或更高版本。
- Android 真机或 Android 模拟器。
- 开发预览可使用 Expo Go；生成独立 APK 需要 Expo 账户及 EAS CLI 登录。

## 仅用安卓手机构建 APK（不需要 GitHub）

本项目使用 Expo EAS 云构建，GitHub 不是必需条件。安卓手机可通过 Termux 运行命令行：

1. 从可信来源安装 Termux（建议 F-Droid 官方页面），打开后执行 `termux-setup-storage` 并允许文件访问。
2. 执行 `pkg update -y && pkg install nodejs-lts unzip -y`。
3. 将本 ZIP 放入手机 Download 文件夹，在 Termux 执行：

```bash
cd ~/storage/downloads
unzip xiaomi_ai_v1_5_2_android_ready.zip
cd zhixue_ai_v1_1
npm install
npx eas-cli@latest login
npx eas-cli@latest init
npm run build:android:apk
```

4. 登录时按提示在浏览器完成 Expo 登录；`eas init` 会关联 Expo 账户 `jeffrey760719`。云构建完成后，从 EAS 页面下载 APK。不要把密码、验证码或访问令牌发给任何人。

注意：EAS 免费额度有限，超额可能收费；发起构建前请先查看 Expo 账户显示的额度。

## 本地运行

```bash
npm install
npm run check
npx expo start
```

在 Android 手机上安装 Expo Go，手机与电脑连接同一网络后扫描终端二维码。也可以在 Android 模拟器中运行：

```bash
npm run android
```

## 生成可安装 APK（EAS 云构建）

1. 使用 Expo 账户 **jeffrey760719** 登录：<https://expo.dev/>。项目配置已预填该账户名；请勿把密码或访问令牌发到聊天中。
2. 在项目根目录执行：

```bash
npx eas-cli@latest login
npx eas-cli@latest init
```

`eas init` 会为 Expo 账户 `jeffrey760719` 创建/关联项目，并把真实 `projectId` 写入 `app.json`。此步骤必须由项目所有者在已登录的终端中完成。不要把账户密码或访问令牌发到聊天中。

3. 构建 Android APK：

```bash
npm run build:android:apk
```

4. 等待 EAS 构建完成后，在 EAS 构建页面下载 APK，传到 Android 手机上安装。若 Android 提示阻止安装，请只对你信任的 APK 来源临时允许“安装未知应用”。

说明：EAS 云构建有账户计划与使用额度限制，超出免费额度可能需要付费；这与 OpenAI API 账单完全独立。当前源码包没有代替用户登录 Expo，也没有启动远程构建，因此本包不是 APK 安装文件。

## 建议实机验收清单

- [ ] 首次启动能显示图标、启动画面和首页。
- [ ] 进入八个学科后可输入问题并得到离线学习方法提示。
- [ ] 强制关闭并重新打开应用，昵称、年级、记录、错题和收藏仍在。
- [ ] 每日任务勾选与取消正常；今日打卡可完成与撤销。
- [ ] 搜索、删除学习记录、加入/移出错题本正常。
- [ ] 导出备份后，将完整 JSON 粘贴回应用可以恢复。
- [ ] 粘贴错误 JSON、超大备份或字段格式错误的备份会被拒绝。
- [ ] Android 返回键、软键盘、系统分享菜单和不同屏幕尺寸表现正常。

## 数据与隐私

- 所有当前学习数据保存在本机 AsyncStorage，不会同步云端。
- 卸载应用、清除应用数据或更换手机可能造成数据丢失；请定期备份。
- 备份含学习内容与昵称、年级，分享时只发送到自己信任的位置。
- 不建议输入真实姓名、住址、学校班级等敏感个人信息。面向未成年人公开运营前，需要完成适用的监护人同意、隐私政策、数据删除和安全审核。

## 后续云端/AI 计划

`backend/` 目录保留早期服务端接入骨架，但 V1.5 移动端没有连接它。未来接入 OpenAI 前，必须补齐账号鉴权、聊天配额、滥用防护、前端安全会话存储、数据同步和儿童隐私流程。OpenAI API Key 只能保存在服务器 Secrets/环境变量中，不能写入 App 或 APK。

## 当前交付边界

已完成源码与配置准备、自检脚本和静态语法检查。尚未在真实 Android 设备上运行，也未通过 Expo EAS 账号发起云构建，未生成或签名 APK。最终 APK 需要由项目所有者登录 Expo 后执行上述构建步骤，再进行真机验收。


## 品牌更名说明

本版本应用显示名称已改为“小蜜”，首页品牌、学习助手称呼和备份提示同步更新。为避免已关联的 Expo 项目或旧版安装升级出现兼容问题，Expo slug `zhixue-ai`、Android applicationId `com.zhixueai.student` 和本地存储键保持不变；这些是内部技术标识，不影响手机桌面显示名称。
