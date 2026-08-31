export interface ToastOptions {
  type: "info" | "success" | "warning" | "error";
  id: string;
  text: string;
}

export interface ToastApi {
  create(options: ToastOptions): unknown;
}

export type Translator = (key: string) => string;

export type AddonSettingType = "string" | "number" | "boolean";

export interface AddonSettingDefinition {
  name: string;
  id: string;
  type: AddonSettingType;
  default?: string | number | boolean;
  min?: number;
  max?: number;
}

export interface AddonSettingsApi {
  get: (id: string) => unknown;
  set: (id: string, value: unknown) => void;
  defs: AddonSettingDefinition[];
}

export interface SidebarTabOptions {
  id: string;
  /** 标签页标题：字符串或返回字符串的函数（延迟求值，支持 i18n） */
  title: string | (() => string);
  /** 标签页图标：SVG 字符串（会作为 <img> 的 src） */
  icon: string;
  /** 标签页内容：返回 DOM 元素的函数 */
  content: () => HTMLElement;
}

export interface AddonSidebarApi {
  registerTab(tab: SidebarTabOptions): () => void;
}

export interface AddonContext {
  blockly?: unknown;
  vm?: unknown;
  toast: ToastApi;
  t: Translator;
  settings: AddonSettingsApi;
  sidebar: AddonSidebarApi;
  [key: string]: unknown;
}