/**
 * 品牌类型载体
 *
 * 仅类型空间，编译后完全擦除，满足 app 侧 isolatedModules / erasableSyntaxOnly。
 * 真正的构造函数（asNoteId 等）只在 core 内实现，是 core 唯一允许铸造品牌 ID 的入口。
 */

declare const __brand: unique symbol

export type Brand<T, B extends string> = T & { readonly [__brand]: B }
