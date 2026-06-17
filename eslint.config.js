// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require("eslint/config")
const expoConfig = require("eslint-config-expo/flat")

module.exports = defineConfig([
    expoConfig,
    {
        ignores: ["dist/*", "android/**", "scripts/**"],
    },
    {
        rules: {
            // Pre-existing UI copy uses apostrophes and quotes in JSX text nodes.
            "react/no-unescaped-entities": "off",
            // React Compiler plugin flags patterns used intentionally across settings pages.
            "react-hooks/preserve-manual-memoization": "off",
            "react-hooks/set-state-in-effect": "off",
            "react-hooks/refs": "off",
            "react-hooks/immutability": "off",
            "react-hooks/purity": "off",
            "react/display-name": "off",
            "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
        },
    },
])
