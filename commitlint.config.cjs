module.exports = {
  extends: ['@commitlint/config-conventional'],
  ignores: [(msg) => /Signed-off-by: dependabot\[bot\]/.test(msg)],
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
    'header-max-length': [2, 'always', 200],
    'body-max-line-length': [0],
  },
};
