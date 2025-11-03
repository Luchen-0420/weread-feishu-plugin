# 插件简介
**效果图**

![](https://fastly.jsdelivr.net/gh/bucketio/img19@main/2025/10/30/1761819932009-8da4a36e-d809-4270-8aad-27a215c64221.png)


![](https://fastly.jsdelivr.net/gh/bucketio/img16@main/2025/10/30/1761819965448-31f16b63-6389-47a5-ac6d-8195294edf6c.png)


**功能**
1. 同步微信读书书单至飞书多维表格
2. 支持断点续写
3. 支持更新阅读进度


**开源地址**

> https://github.com/Luchen-0420/vue-weread-feishu/tree/master

**操作演示视频**

【vue版飞书边栏插件实现微信读书同步】 https://www.bilibili.com/video/BV1royaBzE83/?share_source=copy_web&vd_source=93b749d0faa4f6da4b3a9891caf73e4d

**插件后续迭代**

目前已经测试过3000多本账号同步，大概2000多本的时候cookie失败导致请求详情失败，可以删除失败的记录，重启后重新再获取一遍。

- 关于Cookie失效问题， 后续尝试用CookieCloud 服务来自动同步和更新
- 尝试上架飞书插件平台
- 导出AI大纲思维导图
- 导出笔记至飞书文档

**版本说明**



# 图文版操作讲解

需要```本地安装node环境```。请自行安装。

## 1. 复制模板

> 模板链接：https://c1w7wycgdlz.feishu.cn/base/SwaXbAx33af2iJs33zXcItyRnlE?from=from_copylink

点击“创建副本”将模板复制至自己的多维表格空间

![](https://fastly.jsdelivr.net/gh/bucketio/img18@main/2025/10/30/1761815206345-56ac63f7-73af-453c-aa28-01f12d437ee4.gif)

## 2. 源码下载并运行

    git clone -b master https://github.com/Luchen-0420/vue-weread-feishu/tree/master

终端以```管理员```身份打开，进入到目录内，进行依赖安装。

    npm i -S @lark-base-open/node-sdk

![](https://fastly.jsdelivr.net/gh/bucketio/img18@main/2025/10/30/1761815760069-16805cd3-a843-457a-b798-4dd28a7e376d.png)

依赖安装完成，输入```npm run dev```运行项目。如图所示就是成功启动服务。


![](https://fastly.jsdelivr.net/gh/bucketio/img14@main/2025/10/30/1761815837078-42be187d-6cf1-4513-877b-865d0a205a77.png)

## 3. 进入飞书表格添加插件

点击“自定义插件”，填写服务启动地址。

![](https://fastly.jsdelivr.net/gh/bucketio/img1@main/2025/10/30/1761815936632-9fe8ad1a-e70e-4925-9f93-d0fa76a5d80e.gif)

## 4. 输入微信读书cookie

- 使用浏览器登录微信读书网页版
- 按F12打开开发者工具，切换到Network标签页
- 刷新页面，在请求列表中找到weread.qq.com的请求
- 在Headers中找到Cookie字段，复制其完整内容

![](https://fastly.jsdelivr.net/gh/bucketio/img4@main/2025/10/30/1761816119019-6aff253c-66ba-40b1-adb7-6eda30886f5f.gif)

## 5.首次使用同步书架

作为第一次使用的用户，直接点击```同步书架```。

![](https://fastly.jsdelivr.net/gh/bucketio/img19@main/2025/10/30/1761816253699-5439ad87-f6a9-4d9b-8525-c041301449b7.gif)


## 6.更新书架

如果是第二次使用插件，期间增加了一些新书。

```第一步```点击```同步表格```，获取已有记录

```第二步```点击```同步书架```，监测新增书籍

```第三步```点击```更新表格```，写入新增书籍


![](https://fastly.jsdelivr.net/gh/bucketio/img15@main/2025/10/30/1761816530776-afe3a5c2-a8d3-4984-abbb-111009de2569.gif)

## 7.更新阅读进度

可以通过bookid或者书名的方式筛选指定书籍进行进度更新。

点击“更新进度”，可以同步阅读进度。

![](https://fastly.jsdelivr.net/gh/bucketio/img15@main/2025/10/30/1761816825173-876b4cff-05e3-4009-a0d3-726bb2774383.gif)

## 8.制作画册

点击“自定义插件”----“获取授权码”，点击“搜索插件市场”----“链接转附件”。填写授权码，选择相应字段。

![](https://fastly.jsdelivr.net/gh/bucketio/img15@main/2025/10/30/1761819665412-a5d68e18-801e-4102-a43c-ffe55f76b163.gif)

运行完成后，点击“画册”

![](https://fastly.jsdelivr.net/gh/bucketio/img19@main/2025/10/30/1761819908308-2eda6970-863d-438e-9ba4-9a904c93b896.png)
