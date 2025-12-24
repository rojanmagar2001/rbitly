module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    // Keep it simple and readable:
    // feat:, fix:, docs:, chore:, refactor:, test:, ci:, build:
    "type-enum": [2, "always", ["feat", "fix", "docs", "chore", "refactor", "test", "ci", "build"]],
  },
};
