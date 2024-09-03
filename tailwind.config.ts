import type { Config } from "tailwindcss";

export default <Partial<Config>>{
  theme: {
    extend: {
      colors: {
        polar: {
          "50": "#f1faf9",
          "100": "#dcf2f1",
          "200": "#bce5e4",
          "300": "#8dd3d2",
          "400": "#57b9b9",
          "500": "#3c9d9e",
          "600": "#348186",
          "700": "#30696e",
          "800": "#2e575c",
          "900": "#2a4a4f",
          "950": "#183034",
        },
        dust: {
          "50": "#f9f5f3",
          "100": "#f0eae4",
          "200": "#e1d2c7",
          "300": "#d0b8a8",
          "400": "#b9927e",
          "500": "#aa7965",
          "600": "#9d6859",
          "700": "#83554b",
          "800": "#6b4741",
          "900": "#573b37",
          "950": "#2e1e1c",
        },
        sisal: {
          "50": "#f9f6f3",
          "100": "#f1ebe3",
          "200": "#dfd3c3",
          "300": "#cebba3",
          "400": "#b99b7e",
          "500": "#ab8464",
          "600": "#9e7258",
          "700": "#835d4b",
          "800": "#6b4d41",
          "900": "#584036",
          "950": "#2e211c",
        },
      },
      fontFamily: {
        mono: '"PT Mono", ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
      },
    },
  },
};
