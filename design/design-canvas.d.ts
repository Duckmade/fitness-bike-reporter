declare module "@henosia/design-canvas" {
  interface Snippet {
    title: string;
    description?: string;
    content: () => JSX.Element;
  }

  interface SnippetOptions {
    snippets: Snippet[];
  }

  export const Artboard: React.FC<any>;

  export function createSnippets(options: SnippetOptions): Snippet[];

  export function createArtboard(component: React.FC, options: any): React.FC;

  export function createCanvas(component: React.FC, options: any): React.FC;

  export type VariantId = string;

  export interface VariantProps extends React.PropsWithChildren<{}>{
    id: VariantId;
    name?: string;
  }

  export function Variant(props: VariantProps): React.ReactElement {}

  export type VariantSelectionId = string;

  export interface VariantSelectionProps {
    id: VariantSelectionId;
    slotX: number;
    slotY: number;
    selection: VariantId[];
  }

  export function VariantSelection(props: VariantSelectionProps): null {}


}

declare namespace JSX {
  interface IntrinsicElements {
    // allow the <design-placeholder> during TS type checking
    "design-placeholder": any;
  }
}