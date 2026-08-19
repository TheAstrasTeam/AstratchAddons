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

export interface AddonContext {
  blockly?: unknown;
  vm?: unknown;
  toast: ToastApi;
  t: Translator;
  settings: AddonSettingsApi;
  [key: string]: unknown;
}