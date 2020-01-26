import { Utils } from '../utils/utils.js';

export class Format {
  static REGEXP = /[\s\[\]\\\-/:"“`'|.,<>#~*?^]+/g;
  static DIVIDER = '-';
  static MAX_LENGTH = 60;

  static branchName(branchName, branchPrefix = '') {
    if (branchPrefix === 'none') {
      branchPrefix = '';
    }

    const prefixLength = branchPrefix ? branchPrefix.length + 1 : 0;
    const result = branchName
      .trim()
      .replace(Format.REGEXP, Format.DIVIDER)
      .slice(0, Format.MAX_LENGTH - prefixLength);

    return `${branchPrefix}${branchPrefix ? '/' : ''}${result}`;
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
