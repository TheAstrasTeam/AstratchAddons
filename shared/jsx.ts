export type JsxChild =
  | Element
  | DocumentFragment
  | string
  | number
  | boolean
  | null
  | undefined
  | JsxChild[];

export interface JsxProps {
  className?: string;
  style?: string;
  children?: JsxChild;
  [key: string]: unknown;
}

export const Fragment: unique symbol = Symbol("Fragment");

const toNode = (child: JsxChild): Node => {
  if (child == null || child === false) return document.createTextNode("");
  if (typeof child === "string" || typeof child === "number") {
    return document.createTextNode(String(child));
  }
  return child as Node;
};

const appendChild = (parent: Node, child: JsxChild): void => {
  if (Array.isArray(child)) {
    for (const item of child) appendChild(parent, item);
  } else {
    parent.appendChild(toNode(child));
  }
};

const appendChildren = (parent: Node, children: JsxChild[]): void => {
  for (const child of children) appendChild(parent, child);
};

export const h = (
  tag: string | typeof Fragment,
  props: JsxProps | null,
  ...children: JsxChild[]
): Element => {
  if (tag === Fragment) {
    const fragment = document.createDocumentFragment();
    appendChildren(fragment, children);
    return fragment as unknown as Element;
  }

  const element = document.createElement(tag as string);
  for (const [key, value] of Object.entries(props ?? {})) {
    if (value == null || value === false) continue;
    if (key === "children") continue;
    if (key === "className") {
      element.className = String(value);
    } else if (key === "style") {
      element.setAttribute("style", String(value));
    } else if (key.startsWith("on") && typeof value === "function") {
      element.addEventListener(
        key.slice(2).toLowerCase(),
        value as EventListener,
      );
    } else {
      element.setAttribute(key, String(value));
    }
  }
  appendChildren(element, children);
  return element;
};

declare global {
  namespace JSX {
    type Element = globalThis.Element;
    interface IntrinsicElements {
      [elemName: string]: unknown;
    }
  }
}