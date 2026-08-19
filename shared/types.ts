export interface ToastOptions {
  type: "info" | "success" | "warning" | "error";
  id: string;
  text: string;
}

export interface ToastApi {
  create(options: ToastOptions): unknown;
}

export type Translator = (key: string) => string;

export interface AddonContext {
  blockly?: unknown;
  vm?: unknown;
  toast: ToastApi;
  t: Translator;
  [key: string]: unknown;
}