import ts from "@rollup/plugin-typescript";
import { Plugin } from "rollup";
import { dependencies } from "./package.json";
export { Plugin };
/** @type {import("rollup").RollupOptions} */
export default {
  input: "server/server.ts",
  output: {
    preserveModules: true,
    dir: "dist",
  },
  plugins: [
    ts({ include: ["./server/**/*.ts"] }),
    {
      name: "exit",
      writeBundle: () => setTimeout(() => process.exit(0), 50),
    },
  ],
  external: Object.keys(dependencies),
};
