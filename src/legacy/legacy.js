import Text from '../text/text.js';
import BranchName from '../branch-name/branch-name.js';
import Notificator from '../notificator/notificator.js';
import Utils from '../utils/utils';

export default class Legacy {
  static createButton(callback, text) {
    const li = document.createElement('li');
    const a = document.createElement('a');
    const span = document.createElement('span');

    li.className = 'toolbar-item';
    a.className = 'toolbar-trigger';
    a.addEventListener('click', callback);
    span.className = 'trigger-label';
    span.innerText = text;

    a.appendChild(span);
    li.appendChild(a);

    return li;
  }

  static getIssueID() {
    const issueIDDOM = document.getElementById('key-val');

    if (issueIDDOM) {
      return issueIDDOM.innerText;
    } else {
      throw new Error(`Can't read issue ID`);
    }
  }

  static getIssueName() {
    const issueNameDOM = document.getElementById('summary-val');

    if (issueNameDOM) {
      return issueNameDOM.innerText;
    } else {
      throw new Error(`Can't read issue title`);
    }
  }

  static copyBranchName(e) {
    const issueID = Legacy.getIssueID();
    const issueName = Legacy.getIssueName();
    const result = BranchName.format(issueID + ' ' + issueName);

    e.stopPropagation();

    navigator.clipboard.writeText(result).then(
      () => {
        Notificator.success('Copied:\n' + result);
      },
      () => {
        Notificator.error('Not copied:\n' + result);
      }
    );
  }

  static getParentIssue() {
    const parentIssueDOM = document.getElementById('parent_issue_summary');

    let parentIssueID = '';
    let parentIssueSummary = '';

    if (parentIssueDOM) {
      parentIssueID = parentIssueDOM.dataset.issueKey;
      parentIssueSummary = parentIssueDOM.getAttribute('original-title');
    }

    return {parentIssueID, parentIssueSummary};
  }

  static isBug() {
    const spanDOM = document.getElementById('type-val');

    if (spanDOM) {
      return Utils.isBug(spanDOM.innerText.trim());
    }

    return false;
  }

  static copyCommitMessage() {
    let {parentIssueID, parentIssueSummary} = Legacy.getParentIssue();
    let subTaskID = Legacy.getIssueID();
    let subTaskSummary = Legacy.getIssueName();
    let isBug = Legacy.isBug();

    copyToClipboard(
      getCommitMessage({
        parentIssueID,
        parentIssueSummary,
        subTaskID,
        subTaskSummary,
        isBug
      })
    );
  }

  static onCopyCommitMessage(e) {
    e.stopPropagation();
    Legacy.copyCommitMessage();
  }

  static init() {
    const buttonsBar = document.querySelector('.toolbar-split-left');

    if (buttonsBar) {
      const ul = document.createElement('ul');

      ul.className = 'toolbar-group';
      ul.appendChild(
        Legacy.createButton(Legacy.copyBranchName, Text.COPY_BRANCH_NAME)
      );
      ul.appendChild(
        Legacy.createButton(Legacy.onCopyCommitMessage, Text.COPY_COMMIT_MESSAGE)
      );
      buttonsBar.appendChild(ul);
    }
  }
}
