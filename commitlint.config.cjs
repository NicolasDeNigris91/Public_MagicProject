/**
 * Conventional Commits via @commitlint/config-conventional.
 * Validated by Husky's commit-msg hook. The rules below are the
 * ones we override; everything else inherits the preset's defaults.
 *
 * type-enum is widened slightly from the preset to also accept
 * 'a11y' (we ship accessibility-only changes often enough that
 * forcing them under 'fix' or 'feat' loses signal).
 */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'a11y',
        'build',
        'chore',
        'ci',
        'docs',
        'feat',
        'fix',
        'perf',
        'refactor',
        'revert',
        'style',
        'test',
      ],
    ],
    'subject-case': [2, 'never', ['upper-case']],
    'header-max-length': [2, 'always', 100],
  },
};
