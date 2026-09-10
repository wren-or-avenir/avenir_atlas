/// <reference types="astro/client" />

declare module '*.glsl?raw' {
  const source: string;
  export default source;
}

declare module 'lil-gui' {
  interface Controller {
    name(value: string): Controller;
    onChange<T>(callback: (value: T) => void): Controller;
  }
  export class GUI {
    constructor(options?: { title?: string });
    add(object: object, property: string, min?: number | Record<string, unknown> | readonly string[], max?: number, step?: number): Controller;
    addFolder(title: string): GUI;
    name(value: string): GUI;
    destroy(): void;
  }
}
