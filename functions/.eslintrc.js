/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:import/typescript',
    'google',
    'prettier', // Adiciona a configuração do Prettier. Deve ser a última.
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: ['tsconfig.json', 'tsconfig.dev.json'],
    sourceType: 'module',
    tsconfigRootDir: __dirname,
  },
  ignorePatterns: [
    'lib/**/*', // Ignore a pasta de build.
  ],
  plugins: ['@typescript-eslint', 'import'],
  rules: {
    // Desativa a regra base e usa a do @typescript-eslint para evitar falsos positivos com enums.
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': ['error'],

    'quotes': ['error', 'single'],
    'import/no-unresolved': 0,
    // Desabilita a regra que exige JSDoc, comum em projetos TypeScript.
    'require-jsdoc': 'off',
    // Desabilita a validação de JSDoc para evitar erros de formatação.
    'valid-jsdoc': 'off',
  },
};
