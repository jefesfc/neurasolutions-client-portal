declare module 'react-simple-maps' {
  import { ComponentType, ReactNode, SVGProps, MouseEventHandler } from 'react';

  interface ComposableMapProps {
    projectionConfig?: Record<string, unknown>;
    style?: React.CSSProperties;
    children?: ReactNode;
  }
  export const ComposableMap: ComponentType<ComposableMapProps>;

  interface ZoomableGroupProps {
    children?: ReactNode;
    [key: string]: unknown;
  }
  export const ZoomableGroup: ComponentType<ZoomableGroupProps>;

  interface GeographiesProps {
    geography: string | object;
    children: (props: { geographies: Geography[] }) => ReactNode;
  }
  export const Geographies: ComponentType<GeographiesProps>;

  interface Geography {
    rsmKey: string;
    [key: string]: unknown;
  }

  interface GeographyProps extends SVGProps<SVGPathElement> {
    geography: Geography;
    style?: { default?: object; hover?: object; pressed?: object };
  }
  export const Geography: ComponentType<GeographyProps>;

  interface MarkerProps {
    coordinates: [number, number];
    children?: ReactNode;
    onMouseEnter?: MouseEventHandler<SVGGElement>;
    onMouseLeave?: MouseEventHandler<SVGGElement>;
  }
  export const Marker: ComponentType<MarkerProps>;
}
