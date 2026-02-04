import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import unusedImports from 'eslint-plugin-unused-imports'
import simpleImportSort from 'eslint-plugin-simple-import-sort'
import security from 'eslint-plugin-security'
import importPlugin from 'eslint-plugin-import'
import prettierConfig from 'eslint-config-prettier'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      react.configs.flat.recommended,
      react.configs.flat['jsx-runtime'],
      jsxA11y.flatConfigs.recommended,
      reactRefresh.configs.vite,
      prettierConfig,
    ],
    plugins: {
      'react-hooks': reactHooks,
      'unused-imports': unusedImports,
      'simple-import-sort': simpleImportSort,
      security: security,
      import: importPlugin,
    },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        project: './tsconfig.json',
      },
    },
    settings: {
      react: {
        version: 'detect',
      },
      'import/resolver': {
        typescript: {
          project: './tsconfig.json',
        },
      },
    },
    rules: {
      // ===== TypeScript =====
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-floating-promises': 'error',
      // 命名規則
      '@typescript-eslint/naming-convention': [
        'warn',
        // 変数: camelCase or UPPER_CASE (定数)
        {
          selector: 'variable',
          format: ['camelCase', 'UPPER_CASE', 'PascalCase'],
          leadingUnderscore: 'allow',
        },
        // 関数: camelCase
        {
          selector: 'function',
          format: ['camelCase', 'PascalCase'],
        },
        // 型・インターフェース: PascalCase
        {
          selector: 'typeLike',
          format: ['PascalCase'],
        },
        // Reactコンポーネント (PascalCase)
        {
          selector: 'variable',
          modifiers: ['const'],
          types: ['function'],
          format: ['camelCase', 'PascalCase'],
        },
        // イベントハンドラ: handle* または on* を推奨 (enforceは難しいのでwarn)
        {
          selector: 'variable',
          filter: {
            regex: '^(handle|on)[A-Z]',
            match: false,
          },
          types: ['function'],
          format: ['camelCase', 'PascalCase'],
        },
      ],

      // ===== React Hooks =====
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
      'react/prop-types': 'off',

      // ===== Imports =====
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        { vars: 'all', varsIgnorePattern: '^_', args: 'after-used', argsIgnorePattern: '^_' },
      ],
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',

      // ===== Security =====
      'security/detect-object-injection': 'warn',
      'security/detect-non-literal-regexp': 'warn',
      'security/detect-unsafe-regex': 'error',
      'security/detect-buffer-noassert': 'error',
      'security/detect-eval-with-expression': 'error',
      'security/detect-no-csrf-before-method-override': 'error',
      'security/detect-possible-timing-attacks': 'warn',

      // ===== Import =====
      'import/no-cycle': ['error', { maxDepth: 10 }],
      'import/no-duplicates': ['error', { 'prefer-inline': false }],
      'import/no-self-import': 'error',
      'import/no-useless-path-segments': 'error',

      // ===== Code Quality =====
      // マジックナンバー検出（よく使う数値は許可）
      'no-magic-numbers': [
        'warn',
        {
          ignore: [
            -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, // 基本的な数値
            12, 24, 60, // 時間関連
            100, 200, 300, 400, 404, 500, // HTTPステータス・パーセント
            1000, 1024, // 単位変換
          ],
          ignoreArrayIndexes: true,
          ignoreDefaultValues: true,
          enforceConst: true,
        },
      ],
      // 関数サイズ制限（God Component検出、300行で警告）
      'max-lines-per-function': [
        'warn',
        {
          max: 300,
          skipBlankLines: true,
          skipComments: true,
          IIFEs: true,
        },
      ],
      // ファイルサイズ制限（500行で警告）
      'max-lines': [
        'warn',
        {
          max: 500,
          skipBlankLines: true,
          skipComments: true,
        },
      ],
      // 循環的複雑度（15以上で警告）
      complexity: ['warn', { max: 15 }],

      // ===== Best Practices =====
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always'],
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-nested-ternary': 'warn',
      'prefer-const': 'error',
      'no-var': 'error',
      'no-param-reassign': ['warn', { props: false }],
      'no-return-await': 'error',
      'require-await': 'warn',

      // ===== React Performance =====
      // インライン関数警告（リストレンダリング時のみ注意）
      // 厳格すぎるため、パフォーマンス問題が実際に発生した場合のみ対応
      'react/jsx-no-bind': [
        'off', // 有効化する場合は 'warn' に変更
        {
          ignoreDOMComponents: true,
          ignoreRefs: true,
          allowArrowFunctions: true, // 小規模プロジェクトでは許可
          allowFunctions: false,
          allowBind: false,
        },
      ],
    },
  },
])
