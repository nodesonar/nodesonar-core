import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import importPlugin from 'eslint-plugin-import-x';

const sharedPlugins = {
    '@typescript-eslint': tsPlugin,
    import: importPlugin,
};

const sharedRules = {
    // — Quotes & formatting
    quotes: ['error', 'single'],
    semi: ['error', 'always'],
    indent: ['error', 4],
    'comma-dangle': ['error', 'always-multiline'],
    'object-curly-spacing': ['error', 'always'],
    'arrow-parens': ['error', 'always'],
    'eol-last': ['error', 'always'],
    'no-trailing-spaces': 'error',
    'no-multiple-empty-lines': ['error', { max: 1 }],

    // — TypeScript strict
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/explicit-function-return-type': 'error',
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/no-non-null-assertion': 'error',
    '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],

    // — Type imports must be separate from value imports
    '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'separate-type-imports' },
    ],

    // — Imports alphabetically sorted + type imports last
    'import/order': [
        'error',
        {
            groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'type'],
            alphabetize: { order: 'asc', caseInsensitive: true },
            'newlines-between': 'always',
        },
    ],
    'import/no-duplicates': 'error',

    'padding-line-between-statements': [
        'error',
        { blankLine: 'always', prev: '*', next: 'return' },
        { blankLine: 'always', prev: ['const', 'let', 'var'], next: '*' },
        { blankLine: 'any', prev: ['const', 'let', 'var'], next: ['const', 'let', 'var'] },
        { blankLine: 'always', prev: '*', next: 'if' },
        { blankLine: 'always', prev: 'if', next: '*' },
        { blankLine: 'always', prev: '*', next: 'for' },
        { blankLine: 'always', prev: '*', next: 'function' },
        { blankLine: 'always', prev: 'block-like', next: '*' },
    ],
};

export default [
    {
        ignores: ['dist/**', 'node_modules/**'],
    },
    {
        files: ['src/**/*.ts'],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                project: './src/tsconfig.json',
            },
        },
        plugins: sharedPlugins,
        rules: sharedRules,
    },
    {
        files: ['tests/**/*.ts'],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                project: './tests/tsconfig.json',
            },
        },
        plugins: sharedPlugins,
        rules: sharedRules,
    },
];
