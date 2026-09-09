/// <reference types="astro/client" />

declare module '*.glsl?raw' {
  const source: string;
  export default source;
}

declare module 'lil-gui' {
  export class GUI {
    constructor(options?: { title?: string });
    add(object: object, property: string, min?: number | Record<string, unknown>, max?: number, step?: number): GUI;
    addFolder(title: string): GUI;
    name(value: string): GUI;
    destroy(): void;
  }
}
