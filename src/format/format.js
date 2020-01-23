import { Utils } from '../utils/utils.js';

export class Format {
  static REGEXP = /[\s\[\]\\\-/:"“`'|.,<>#~*?^]+/g;
  static DIVIDER = '-';
  static MAX_LENGTH = 60;

  static branchName(branchName, branchPrefix = '') {
    const result = branchName
      .trim()
      .replace(Format.REGEXP, Utils.DIVIDER)
      .slice(0, Format.MAX_LENGTH - (branchPrefix.length + 1)); // +1 for slash

    return `${branchPrefix}/${result}`;
  }

  static commitMessage({
                         parentIssueID,
                         parentIssueSummary,
                         subTaskID,
                         subTaskSummary,
                         isBug
                       }) {
    const type = isBug ? 'FIX' : 'DEV';

    if (parentIssueID && Utils.isSimilarText(subTaskSummary, parentIssueSummary)) {
      return `${parentIssueID} ${subTaskID}: ${subTaskSummary}\n\n- [${type}] `;
    }

    if (parentIssueID) {
      return `${parentIssueID}: ${parentIssueSummary} ${subTaskID}: ${subTaskSummary}\n\n- [${type}] `;
    }

    return `${subTaskID}: ${subTaskSummary}\n\n- [${type}] `;
  }
}
