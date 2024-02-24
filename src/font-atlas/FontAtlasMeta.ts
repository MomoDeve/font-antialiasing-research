export type GlythMeta = {
  unicode: number;
  advance: number;
  planeBounds?: {
    left: number;
    right: number;
    top: number;
    bottom: number;
  };
  atlasBounds?: {
    left: number;
    right: number;
    top: number;
    bottom: number;
  };
};

export type FontAtlasMeta = {
  atlas: {
    type: string;
    distanceRange: number;
    size: number;
    width: number;
    height: number;
    yOrigin: string;
  };
  glyphs: GlythMeta[];
};
