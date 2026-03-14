declare module "@henosia/design-props" {
  import * as React from "react";

  export type PropKind = "space" | "color";

  export interface PropKindOptions {
    componentName: string;
    propName: string;
  }

  export type GetPropKindHandler = (
    options: PropKindOptions,
  ) => PropKind | null;

  export type PropIcon = ColorPropIcon | SpaceScaleValuePropIcon;

  export interface ColorPropIcon {
    type: "color";
    color: string;
  }

  export interface SpaceScaleValuePropIcon {
    type: "space-scale";
    scaleValue: number;
  }

  export interface PropIconOptions {
    themeId: string;
    componentName: string;
    componentFullyQualifiedName: string;
    propName: string;
    propValue: any;
  }

  export type GetPropIconHandler = (
    options: PropIconOptions,
  ) => PropIcon | null;

  export type PropsEditorOptions<TProps> = {
    [TPropName in keyof TProps]?: PropEditorOptions<TProps, TProps[TPropName]>;
  };

  export interface PropValueOption {
    label: string;
    value: string | number;
    group?: string;
    icon: PropIcon;
  }

  export type PropDefaultValue<TPropValue> = TPropValue extends string
    ? TPropValue
    : TPropValue extends number
    ? TPropValue
    : TPropValue extends boolean
    ? TPropValue
    : TPropValue extends null
    ? TPropValue
    : never;

  export type PropEditorOptions<TProps, TPropValue> = {
    hidden?: (props: TProps) => boolean;

    pinned?: boolean;

    kind?: PropKind;

    value?: PropOptionsValue;

    defaultValue?: PropDefaultValue<TPropValue>;
  };

  export interface PropOptionsValue {
    type: "options";

    options: () => PropValueOption[];
  }

  export function registerPropsEditor<TProps extends object>(
    componentType: React.ComponentType<TProps>,
    options: PropsEditorOptions<TProps>,
  ): void;

  /**
   * Provides a translation between a spacing prop value and the pixel distance on the canvas.
   * This is used to translate direct manipulation of spacings on the canvas to their corresponding prop values.
   */
  type SpacingDistance = {
    /**
     * The prop value for which a distance is needed, e.g. `small` as vertical spacing in a stack
     */
    propValue: string | number;

    /**
     * The distance in pixels that the propValue corresponds to on the canvas
     */
    distance: number;
  };
}