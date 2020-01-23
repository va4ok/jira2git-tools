export class BranchName {
  static REGEXP = /[\s\[\]\\\-/:"“`'|.,<>#~*?^]+/g;
  static DIVIDER = '-';
  static MAX_LENGTH = 60;

  static format(branchName, branchPrefix = '') {
    const result = branchName
      .trim()
      .replace(BranchName.REGEXP, Utils.DIVIDER)
      .slice(0, BranchName.MAX_LENGTH - (branchPrefix.length + 1)); // +1 for slash

    return `${branchPrefix}/${result}`;
  }
}
