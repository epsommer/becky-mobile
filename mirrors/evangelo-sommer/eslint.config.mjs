import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'out/**',
      'build/**',
      '.vercel/**',
      'public/**',
      '*.config.js',
      '*.config.mjs',
      'next-env.d.ts',
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Downgrade TypeScript any errors to warnings (code quality, not critical)
      '@typescript-eslint/no-explicit-any': 'warn',

      // Downgrade unused vars to warnings
      '@typescript-eslint/no-unused-vars': 'warn',

      // Downgrade prefer-const to warning
      'prefer-const': 'warn',

      // Downgrade React unescaped entities to warning
      'react/no-unescaped-entities': 'warn',

      // Downgrade React hooks exhaustive deps to warning
      'react-hooks/exhaustive-deps': 'warn',

      // Downgrade no-require-imports to warning
      '@typescript-eslint/no-require-imports': 'warn',
    },
  },
];

export default eslintConfig;
