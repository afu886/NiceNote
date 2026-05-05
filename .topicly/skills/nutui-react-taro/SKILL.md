---
name: nutui-react-taro
description: 在 Taro 微信小程序和 Web 项目中使用 NutUI 组件库。当用户需要在 Taro 项目中添加 NutUI 组件、调整组件样式或主题、使用 Toast/Dialog 等函数式 API 时使用此技能。
---

# nutui-react-taro

NutUI React Taro 是 NutUI 组件库的 Taro 适配版本，适用于 Taro 微信小程序和 Web 项目。本技能描述如何在跨端项目中正确使用其组件、主题与命令式 API。

## 使用规则

当用户要求在 Taro 项目中添加、替换或调整 NutUI 组件时：

1. 组件名使用 PascalCase，从 `@nutui/nutui-react-taro` 导入。
2. 调整组件外观优先使用组件 props（`type`、`size`、`shape`、`color` 等），其次通过 CSS 变量覆盖，最后才考虑 `className` / `style`。
3. 全局主题统一通过 `ConfigProvider` 注入 CSS 变量；不要在每个组件上重复传同一组样式。
4. 命令式提示（Toast、Dialog、Notify）使用函数式 API，不要为一次性提示挂载组件实例。
5. 微信小程序端不要依赖父元素文本色或 `text-*` 类名修改组件颜色；使用组件 props 或 CSS 变量。
6. 页面栈级别的 TabBar 使用 Taro 原生 `tabBar` 配置；NutUI 的 `Tabbar` 仅用于页面内自定义底栏，不要与原生 tabBar 混用。
7. 不要从本技能目录引用任何源码或样式文件；所有组件均从 `@nutui/nutui-react-taro` 导入。

## 渲染原理与跨端差异

- 微信小程序端组件底层基于 `@tarojs/components`（`<View />`、`<Image />`、`<Text />` 等）实现；不存在原生 DOM，因此选择器穿透、`:hover`、`:focus-within` 等 CSS 行为不一定生效。
- Web 端基于真实 DOM，CSS 选择器、伪类、动画完整可用。
- 为了保证 Taro 微信小程序与 Web 的跨端一致性，样式统一使用组件 props 或 CSS 变量控制；不要在样式文件中针对某一端写穿透选择器。

## 基础用法

### 推荐写法

```tsx
import { View } from '@tarojs/components'
import { Button, Cell, CellGroup, Tag } from '@nutui/nutui-react-taro'

function MyPage() {
  return (
    <View>
      <Button type="primary" size="large" onClick={() => {}}>
        确认
      </Button>

      <CellGroup title="账户">
        <Cell title="手机号" extra="138****0000" />
        <Cell title="邮箱" extra="user@example.com" isLink />
      </CellGroup>

      <Tag type="primary">推荐</Tag>
    </View>
  )
}
```

### 不推荐写法

```tsx
import { Button } from '@nutui/nutui-react-taro'

function MyPage() {
  return (
    <>
      {/* 错误：用类名覆盖主题色，无法穿透到组件内部样式 */}
      <Button className="bg-red-500 text-white">确认</Button>

      {/* 不推荐：尺寸应使用 size prop */}
      <Button className="h-12 px-6">确认</Button>
    </>
  )
}
```

改为：

```tsx
<Button type="danger" size="large">
  确认
</Button>
```

## 命令式 API

Toast、Dialog、Notify 等"一次性"提示组件应使用函数式 API，避免为单次交互挂载组件状态。

```tsx
import { Toast, Dialog } from '@nutui/nutui-react-taro'

// 轻提示
Toast.show({ content: '已保存', duration: 1500 })
Toast.show({ icon: 'success', content: '操作成功' })
Toast.show({ icon: 'fail', content: '网络异常' })

// 弹窗确认
Dialog.open('confirm-delete', {
  title: '确认删除？',
  content: '删除后无法恢复。',
  onConfirm: async () => {
    await deleteItem()
    Dialog.close('confirm-delete')
  },
  onCancel: () => Dialog.close('confirm-delete'),
})
```

避免：

```tsx
// 不推荐：仅为一次性提示挂载组件 + 维护 visible state
const [visible, setVisible] = useState(false)
;<Toast visible={visible} content="已保存" onClose={() => setVisible(false)} />
```

## 主题定制

NutUI 通过 CSS 变量控制主题色与组件样式。统一在应用入口使用 `ConfigProvider` 注入主题。

### ConfigProvider

```tsx
import { ConfigProvider } from '@nutui/nutui-react-taro'

const theme = {
  nutuiBrandColor: '#1890ff',
  nutuiBrandColorStart: '#1890ff',
  nutuiBrandColorEnd: '#36cfc9',
  nutuiButtonBorderRadius: '8px',
}

export default function App({ children }) {
  return <ConfigProvider theme={theme}>{children}</ConfigProvider>
}
```

### CSS 变量覆盖

也可以在全局样式文件中直接覆盖：

```scss
:root,
page {
  --nutui-brand-color: #1890ff;
  --nutui-brand-color-start: #1890ff;
  --nutui-brand-color-end: #36cfc9;
  --nutui-button-border-radius: 8px;
}
```

变量命名规则：`--nutui-<component>-<token>`，组件名为 kebab-case。优先在 `ConfigProvider` 中集中配置，仅在需要按页面/区域覆盖时使用 CSS 选择器。

## 表单与受控组件

NutUI 表单组件在跨端环境下推荐使用 `Form` + `Form.Item` 统一管理校验。

```tsx
import { Form, Input, Button, Toast } from '@nutui/nutui-react-taro'

function LoginForm() {
  const [form] = Form.useForm()

  const onSubmit = async () => {
    const values = await form.validateFields()
    Toast.show({ content: `登录中：${values.phone}` })
  }

  return (
    <Form form={form} divider labelPosition="left">
      <Form.Item
        label="手机号"
        name="phone"
        rules={[
          { required: true, message: '请输入手机号' },
          { pattern: /^1\d{10}$/, message: '手机号格式不正确' },
        ]}
      >
        <Input placeholder="请输入" type="tel" maxLength={11} />
      </Form.Item>

      <Form.Item label="验证码" name="code" rules={[{ required: true }]}>
        <Input placeholder="6 位验证码" type="number" maxLength={6} />
      </Form.Item>

      <Button type="primary" block onClick={onSubmit}>
        登录
      </Button>
    </Form>
  )
}
```

要点：

- 输入类型在小程序端使用组件 props（`type="tel" | "number" | "digit" | "idcard"`），不要依赖原生 `<input type>`。
- 校验通过 `rules` 声明，避免在 `onChange` 中手写校验逻辑。
- 提交按钮的 loading 状态使用 `loading` prop，不要用 `disabled` 简单替代。

## TabBar

页面栈级别的 TabBar 使用 Taro 原生 `tabBar` 配置（写在 `app.config.ts`），由小程序自身管理切页：

```ts
export default defineAppConfig({
  tabBar: {
    color: '#999999',
    selectedColor: '#1890ff',
    backgroundColor: '#ffffff',
    list: [
      {
        pagePath: 'pages/index/index',
        text: '首页',
        iconPath: './assets/tabbar/home.png',
        selectedIconPath: './assets/tabbar/home-active.png',
      },
      {
        pagePath: 'pages/me/index',
        text: '我的',
        iconPath: './assets/tabbar/me.png',
        selectedIconPath: './assets/tabbar/me-active.png',
      },
    ],
  },
})
```

NutUI 的 `Tabbar` 组件用于"页面内"的自定义底部导航（例如详情页底部操作栏、临时筛选条），不要尝试替代原生 tabBar 实现整个 app 的页面切换。

```tsx
import { Tabbar } from '@nutui/nutui-react-taro'
import { Home, Category, Cart, User } from '@nutui/icons-react-taro'

function PageBottomBar() {
  return (
    <Tabbar defaultValue={0}>
      <Tabbar.Item title="首页" icon={<Home />} />
      <Tabbar.Item title="分类" icon={<Category />} />
      <Tabbar.Item title="购物车" icon={<Cart />} value={3} />
      <Tabbar.Item title="我的" icon={<User />} />
    </Tabbar>
  )
}
```

## 国际化

NutUI 内置多语言文案，通过 `ConfigProvider` 的 `locale` 切换：

```tsx
import { ConfigProvider } from '@nutui/nutui-react-taro'
import zhCN from '@nutui/nutui-react-taro/dist/locales/zh-CN'
import enUS from '@nutui/nutui-react-taro/dist/locales/en-US'

;<ConfigProvider locale={lang === 'en' ? enUS : zhCN}>{children}</ConfigProvider>
```

切换语言时不要重复挂载 `ConfigProvider`，应通过外层状态切换 `locale` prop，让组件树自然响应。

## 注意事项

1. 组件名使用 PascalCase，从 `@nutui/nutui-react-taro` 顶层导入；不要从内部子路径导入未导出 API。
2. 样式优先级：props > CSS 变量（`ConfigProvider` 或全局） > `className` / `style`。
3. 一次性提示（Toast、Dialog、Notify）使用函数式 API，不要为此维护 `visible` state。
4. 表单校验使用 `rules` 声明，不要在 `onChange` 中手写校验。
5. 跨端样式不要依赖选择器穿透或父元素颜色继承；用组件 props 或 CSS 变量控制。
6. TabBar：页面切换用 Taro 原生 `tabBar`，页面内底部栏才用 NutUI `Tabbar`，二者不要混用。
7. 主题切换、语言切换等全局配置统一在应用根 `ConfigProvider` 处理，避免局部重复注入。
