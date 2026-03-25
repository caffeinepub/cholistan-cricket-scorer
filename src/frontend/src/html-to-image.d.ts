declare module "html-to-image" {
  export function toPng(
    node: HTMLElement,
    options?: {
      quality?: number;
      pixelRatio?: number;
      backgroundColor?: string;
      cacheBust?: boolean;
      skipFonts?: boolean;
      style?: Record<string, string>;
      filter?: (node: HTMLElement) => boolean;
      [key: string]: unknown;
    },
  ): Promise<string>;

  export function toJpeg(
    node: HTMLElement,
    options?: Record<string, unknown>,
  ): Promise<string>;

  export function toBlob(
    node: HTMLElement,
    options?: Record<string, unknown>,
  ): Promise<Blob | null>;
}
