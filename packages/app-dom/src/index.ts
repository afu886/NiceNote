// 统一产品界面入口（Web/Desktop 共享）
//
// 仅导出宿主（apps/web、apps/desktop/frontend）实际消费的公共 API。
// 其余组件 / hook / context / lib 均为包内实现，由 NiceNoteApp、
// NiceNoteProvider 等经相对路径在包内引用，不对外暴露。
export { ErrorBoundary } from './components/ErrorBoundary'
export { initI18n } from './i18n'
export { NiceNoteApp } from './NiceNoteApp'
