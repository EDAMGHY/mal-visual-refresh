type Attrs = Record<string, string | number | boolean | undefined>;
type Child = Node | string | false | null | undefined;

/** Tiny element builder. Text always goes through text nodes, never innerHTML. */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) {
    if (value === undefined || value === false) continue;
    el.setAttribute(name, value === true ? '' : String(value));
  }
  for (const child of children) {
    if (child === false || child == null) continue;
    el.append(child);
  }
  return el;
}

export const fmtInt = (n: number) => n.toLocaleString('en-US');
