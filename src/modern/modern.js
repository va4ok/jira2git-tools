import './style.css';

import { Text } from '../text/text.js';
import { DropDown } from '../drop-down/drop-down.js';
import { Format } from '../format/format.js';
import { Copy } from '../helper/copy.js';
import { Prefix } from '../prefix/prefix.js';
import { Notificator } from '../notificator/notificator.js';
import { Utils } from '../utils/utils.js';
import { http } from '../utils/http.js';

export class Modern {
  // TODO remove static field
  static buttonsContainer;

  static getCopyIcon() {
    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    icon.setAttribute('width', '24');
    icon.setAttribute('height', '24');
    icon.setAttribute('viewBox', '0 0 24 24');
    icon.setAttribute('focusable', 'false');
    icon.setAttribute('role', 'presentation');
    icon.classList.add('j2gt-buttons-icon');

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('fill', 'currentColor');

    const path1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path1.setAttribute('d', 'M10 19h8V8h-8v11zM8 7.992C8 6.892 8.902 6 10.009 6h7.982C19.101 6 20 6.893 20 7.992v11.016c0 1.1-.902 1.992-2.009 1.992H10.01A2.001 2.001 0 0 1 8 19.008V7.992z');

    const path2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path2.setAttribute('d', 'M5 16V4.992C5 3.892 5.902 3 7.009 3H15v13H5zm2 0h8V5H7v11z');

    const path3 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path3.setAttribute('d', 'M5 16V4.992C5 3.892 5.902 3 7.009 3H15v13H5zm2 0h8V5H7v11z');

    g.appendChild(path1);
    g.appendChild(path2);
    g.appendChild(path3);
    icon.appendChild(g);

    return icon;
  }

  static getButton(text, callback) {
    const button = document.createElement('button');

    button.innerText = text;

    if (callback) {
      button.addEventListener('click', callback);
    }

    return button;
  }

  static findFieldValue(fields, fieldName) {
    let value = '';

    fields.forEach(function (field) {
      if (field.key) {
        if (field.key === fieldName) {
          value = field.content;
        }
      } else {
        field.forEach(function (property) {
          if (property.key === fieldName) {
            value = property.value;
          }
        });
      }
    });

    return value;
  }

  static getIssue() {
    let subTaskID;
    let subTaskSummary;
    let subTaskType;

    for (let statePropName in window['SPA_STATE']) {
      if (window['SPA_STATE'].hasOwnProperty(statePropName) &&
        statePropName.indexOf('ISSUE') !== -1) {
        const issueObject = window['SPA_STATE'][statePropName];
        const issueKey = Object.keys(issueObject).pop();
        const issue = issueObject[issueKey].data;

        if (!issue) continue;

        const fields = JSON.parse(issue['fields']);

        subTaskID = issue.key;
        subTaskSummary = Modern.findFieldValue(fields, 'summary');
        subTaskType = Modern.findFieldValue(fields, 'issuetype').name;
      }
    }

    return { subTaskID, subTaskSummary, subTaskType };
  }

  static copyBranchName(e) {
    const { subTaskID, subTaskSummary } = Modern.getIssue();

    let result = Format.branchName(`${subTaskID} ${subTaskSummary}`, Prefix.get().value);

    e.stopPropagation();
    Copy.toClipboard(result);
  }

  static getIssueDetails(issueID) {
    const url = '/rest/graphql/1/';

    let query = {
      query: `query {
    issue(issueIdOrKey: "${issueID}", latestVersion: true, screen: "view") {
      fields {
        key
        content
      }
    }
  }
  `
    };

    return http.post(url, query);
  }

  static onCopyCommitMessage(e) {
    e.stopPropagation();

    let { subTaskID, subTaskSummary, subTaskType } = Modern.getIssue();

    Modern.getIssueDetails(subTaskID).then(
      ({ data }) => {
        let isBug = Utils.isBug(subTaskType.trim());
        let parentIssue = Modern.findFieldValue(data.issue.fields, 'parent');

        Copy.toClipboard(
          Format.commitMessage({
            parentIssueID: parentIssue ? parentIssue.key : '',
            parentIssueSummary: parentIssue ? parentIssue.fields.summary : '',
            subTaskID,
            subTaskSummary,
            isBug
          })
        );
      },
      () => {
        Notificator.error('JIRA API problems');
      }
    );
  }

  static init() {
    const titleDOM = document.querySelector('h1');

    if (titleDOM) {
      const prefixButton = Modern.getButton(`${Text.ARROW_DOWN} ${Prefix.get().value}`);
      const copyBranchButton = Modern.getButton(Text.COPY_BRANCH_NAME, Modern.copyBranchName);
      const copyCommitButton = Modern.getButton(Text.COPY_COMMIT_MESSAGE, Modern.onCopyCommitMessage);
      const container = titleDOM.parentElement.parentElement.parentElement;
      const dropdown = new DropDown(prefixButton);

      copyBranchButton.insertBefore(Modern.getCopyIcon(), copyBranchButton.firstChild);
      copyCommitButton.insertBefore(Modern.getCopyIcon(), copyCommitButton.firstChild);

      //TODO remove id
      prefixButton.id = 'j2gt-prefix-button';

      // TODO do not store buttonsContainer into static field
      Modern.buttonsContainer = document.createElement('div');
      Modern.buttonsContainer.className = 'j2gt-buttons-container';
      Modern.buttonsContainer.appendChild(prefixButton);
      Modern.buttonsContainer.appendChild(copyBranchButton);
      Modern.buttonsContainer.appendChild(copyCommitButton);

      container.appendChild(Modern.buttonsContainer);
    }
  }
}

