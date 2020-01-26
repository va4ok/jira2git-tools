// ==UserScript==
// @name         Jira Task2Branch
// @namespace    http://tampermonkey.net/
// @version      3.0.0
// @description  Tools to work with cloud jira. Works only on issue (modern or legacy) details page e.g. https://org.atlassian.net/browse/Jira-Ticket-NNNN. Copy commit message.
// @author       va4ok
// @match        *://*.atlassian.net/browse/*
// @grant        none
// @source       https://github.com/va4ok/jira2git-tools.git
// @license      MIT
// @homepage     https://openuserjs.org/scripts/va4ok
// ==/UserScript==

class Notificator {
  static ANIMATION_TIME = 200;
  static POPUP_TIME = 5000;

  static textShell;
  static $container;
  static timerId;

  static init() {
    Notificator.textShell = document.createElement('div');
    Notificator.$container = document.createElement('div');
    Notificator.$container.className = 'j2gt-notificator';
    Notificator.$container.appendChild(Notificator.textShell);
    document.body.appendChild(Notificator.$container);
  }

  static notify(text, isError) {
    if (isError) {
      Notificator.$container.classList.contains('error') ||
      Notificator.$container.classList.add('error');
    } else {
      Notificator.$container.classList.remove('error');
    }

    Notificator.textShell.innerText = text;
    Notificator.show();

    Notificator.timerId = setTimeout(() => {
      Notificator.hide();
    }, Notificator.POPUP_TIME);

    isError ? console.warn(text) : console.log(text);
  }

  static success(text) {
    Notificator.notify(text, false);
  }

  static error(text) {
    const newText = `${text} 
  Please open console and try to copy manually`;

    Notificator.notify(newText, true);
  }

  static show() {
    if (Notificator.timerId) {
      clearTimeout(Notificator.timerId);
      Notificator.timerId = null;
    }

    Notificator.$container.style.height = '98px';
  }

  static hide() {
    Notificator.$container.style.height = '0';

    Notificator.timerId = setTimeout(() => {
      Notificator.timerId = null;
    }, Notificator.ANIMATION_TIME);
  }
}

class SelectableList {
  constructor(list, onValueClick) {
    this.ul = document.createElement('ul');
    this.onValueClick = onValueClick;
    this.onclick = this.onclick.bind(this);

    list.forEach(listValue => {
      const li = document.createElement('li');

      li.innerText = listValue.value;
      li.title = listValue.description;
      li.addEventListener('click', this.onclick);
      li.dataset.data = JSON.stringify(listValue);
      this.ul.appendChild(li);
    });
  }

  onclick(e) {
    this.onValueClick(JSON.parse(e.target.dataset.data));
  }
}

class Prefix {
  static KEY = 'JiraToGitPrefix';
  static LIST = [
    {
      key: 'feature',
      value: 'feature',
      description:
      'Default branch type for any Jira ticket, may include backend and frontend changes. If in doubt - use this branch type. ' +
      'CI includes: UI unit tests, UI build, shaper, backend compile, unit tests, integration tests, OWASP dependency check, sonar'
    },
    {
      key: 'ui',
      value: 'ui',
      description: 'For UI only changes. CI includes: UI unit tests, UI build'
    },
    {
      key: 'jenkins',
      value: 'jenkins',
      description: 'For changes in Jenkins pipelines. CI includes: TBD'
    },
    {
      key: 'gmp',
      value: 'gmp',
      description: 'For UI only changes. CI includes: UI unit tests, UI build'
    },
    {
      key: 'autotest',
      value: 'autotest',
      description: 'For UI auto tests. CI includes: special sonar for autotests'
    }
  ];

  static selectableList = new SelectableList(Prefix.LIST, Prefix.onPrefixClick);

  static current;

  static onPrefixSelected = () => {
  };

  static onPrefixClick(prefix) {
    Prefix.set(prefix);
    Prefix.onPrefixSelected();
  }

  static save() {
    localStorage.setItem(Prefix.KEY, JSON.stringify(Prefix.current));
  }

  static restore() {
    const restoredPrefix = localStorage.getItem(Prefix.KEY);

    Prefix.current = restoredPrefix ? JSON.parse(restoredPrefix) : Prefix.LIST[0];
  }

  static get() {
    return Prefix.current;
  }

  static set(current) {
    Prefix.current = current;
    Prefix.save();
  }
}

class Text {
  static COPY_BRANCH_NAME = 'Branch Name';
  static COPY_COMMIT_MESSAGE = 'Commit Message';
  static ARROW_DOWN = '\u23F7';
  static ARROW_UP = '\u23F6';
}

class DropDown {
  initBody() {
    this.body = document.createElement('div');
    this.body.style.display = 'none';
    this.body.style.position = 'absolute';
    this.body.style.zIndex = '100';
    this.body.className = 'j2gt-dropdown';
    document.body.appendChild(this.body);
  }

  constructor(triggerDOM, body) {
    this.initBody();
    this.body.appendChild(body);

    this.open = this.open.bind(this);
    this.close = this.close.bind(this);
    this.toggle = this.toggle.bind(this);

    this.trigger = triggerDOM;
    triggerDOM.addEventListener('click', this.toggle);
  }

  setBodyPosition() {
    const rect = this.trigger.getBoundingClientRect();

    this.body.style.left = rect.left + 'px';
    this.body.style.top = rect.top + rect.height + 6 + 'px';
  }

  open() {
    this.setBodyPosition();
    this.body.style.display = '';

    document.body.addEventListener('click', this.close, { once: true })
  }

  close(e) {
    e.stopPropagation && e.stopPropagation();
    this.body.style.display = 'none';
  }

  toggle(e) {
    e.stopPropagation();

    if (this.body.style.display === 'none') {
      this.open();
    } else {
      this.close();
    }
  }
}

class Utils {
  static isBug(issueType) {
    return issueType.toUpperCase() === 'BUG';
  }

  static isSimilarText(textA, textB) {
    return textA === textB;
  }
}

class Format {
  static REGEXP = /[\s\[\]\\\-/:"“`'|.,<>#~*?^]+/g;
  static DIVIDER = '-';
  static MAX_LENGTH = 60;

  static branchName(branchName, branchPrefix = '') {
    const result = branchName
      .trim()
      .replace(Format.REGEXP, Format.DIVIDER)
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

class Copy {
  static toClipboard(text) {
    navigator.clipboard.writeText(text).then(
      () => {
        Notificator.success('Copied:\n' + text);
      },
      () => {
        Copy.clipboardFallback(text);
      }
    );
  }

  static clipboardFallback(result) {
    Notificator.error('Not copied:\n' + result);
  }
}

class http {
  static post(url, data) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.open('POST', url);
      xhr.onload = () => resolve(JSON.parse(xhr.responseText));
      xhr.onerror = () => reject(xhr.statusText);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.send(JSON.stringify(data));
    });
  }
}

class Modern {
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
      const buttonsContainer = document.createElement('div');
      const prefixButton = Modern.getButton(`${Text.ARROW_DOWN} ${Prefix.get().value}`);
      const copyBranchButton = Modern.getButton(Text.COPY_BRANCH_NAME, Modern.copyBranchName);
      const copyCommitButton = Modern.getButton(Text.COPY_COMMIT_MESSAGE, Modern.onCopyCommitMessage);
      const container = titleDOM.parentElement.parentElement.parentElement;

      new DropDown(prefixButton, Prefix.selectableList.ul);
      Prefix.onPrefixSelected = () => {
        prefixButton.innerText = `${Text.ARROW_DOWN} ${Prefix.get().value}`;
      };

      copyBranchButton.insertBefore(Modern.getCopyIcon(), copyBranchButton.firstChild);
      copyCommitButton.insertBefore(Modern.getCopyIcon(), copyCommitButton.firstChild);
      buttonsContainer.className = 'j2gt-buttons-container';
      buttonsContainer.appendChild(prefixButton);
      buttonsContainer.appendChild(copyBranchButton);
      buttonsContainer.appendChild(copyCommitButton);

      container.appendChild(buttonsContainer);
    }
  }
}

class Legacy {
  static createButton(text, callback) {
    const li = document.createElement('li');
    const a = document.createElement('a');
    const span = document.createElement('span');

    li.className = 'toolbar-item';
    a.className = 'toolbar-trigger';
    span.className = 'trigger-label';
    span.innerText = text;

    if (callback) {
      a.addEventListener('click', callback);
    }

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
    const result = Format.branchName(issueID + ' ' + issueName, Prefix.get().value);

    e.stopPropagation();
    Copy.toClipboard(result);
  }

  static getParentIssue() {
    const parentIssueDOM = document.getElementById('parent_issue_summary');

    let parentIssueID = '';
    let parentIssueSummary = '';

    if (parentIssueDOM) {
      parentIssueID = parentIssueDOM.dataset.issueKey;
      parentIssueSummary = parentIssueDOM.getAttribute('original-title');
    }

    return { parentIssueID, parentIssueSummary };
  }

  static isBug() {
    const spanDOM = document.getElementById('type-val');

    if (spanDOM) {
      return Utils.isBug(spanDOM.innerText.trim());
    }

    return false;
  }

  static copyCommitMessage() {
    let { parentIssueID, parentIssueSummary } = Legacy.getParentIssue();
    let subTaskID = Legacy.getIssueID();
    let subTaskSummary = Legacy.getIssueName();
    let isBug = Legacy.isBug();

    Copy.toClipboard(
      Format.commitMessage({
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
      const prefixButton = Legacy.createButton(`${Text.ARROW_DOWN} ${Prefix.get().value}`);
      new DropDown(prefixButton, Prefix.selectableList.ul);
      Prefix.onPrefixSelected = () => {
        prefixButton.querySelector('.trigger-label').innerText = `${Text.ARROW_DOWN} ${Prefix.get().value}`;
      };

      ul.className = 'toolbar-group';
      ul.appendChild(prefixButton);
      ul.appendChild(Legacy.createButton(Text.COPY_BRANCH_NAME, Legacy.copyBranchName));
      ul.appendChild(Legacy.createButton(Text.COPY_COMMIT_MESSAGE, Legacy.onCopyCommitMessage));
      buttonsBar.appendChild(ul);
    }
  }
}

(function () {
  'use strict';

  Notificator.init();
  Prefix.restore();

  if (window.hasOwnProperty('SPA_STATE')) {
    Modern.init();
  } else {
    Legacy.init();
  }
})();

(function(){
  const $style = document.createElement('style');

  $style.innerHTML = `.j2gt-notificator {
    display: flex;
    align-items: center;
    transition: height 1s ease-out;
    background-color: #3dcd59;
    color: #fff;
    font-weight: bold;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    overflow: hidden;
    height: 0;
    z-index: 1000;
}

.j2gt-notificator.error {
    background-color: #a50063;
}

.j2gt-notificator div {
    margin: 10px auto 10px;
    width: fit-content;
}

.j2gt-buttons-container {
    display: flex;
    margin: 8px;
    font-size: 14px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    color: rgb(80, 95, 121);
}

.j2gt-buttons-container button {
    display: inline-flex;
    align-items: center;
    border: none !important;
    font-size: inherit;
    color: rgb(80, 95, 121);
    background: rgba(9, 30, 66, 0.04);
    cursor: pointer;
    margin-right: 8px;
    padding: 0 10px;
    line-height: 32px;
    border-radius: 3px;
    transition: background 0.1s ease-out 0s, box-shadow 0.15s cubic-bezier(0.47, 0.03, 0.49, 1.38) 0s;
    position: relative;
}

.j2gt-buttons-container button:hover {
    color: rgb(80, 95, 121);
    background: rgba(9, 30, 66, 0.08);
}

.j2gt-buttons-container button:active {
    color: rgb(0, 82, 204);
    background: rgba(179, 212, 255, 0.6);
    outline: none !important;
}

.j2gt-buttons-icon {
    margin-right: 4px;
}

.j2gt-dropdown ul {
    padding: 4px 0;
    background: white;
    box-shadow: rgba(9, 30, 66, 0.13) 0 0 0 1px, rgba(9, 30, 66, 0.13) 0 4px 11px;
    border-radius: 4px;
    max-width: 220px;
    list-style: none;
}

.j2gt-dropdown ul li {
    padding: 8px 24px;
    color: rgb(23, 43, 77);
    cursor: pointer;
}

.j2gt-dropdown ul li:hover {
    background: rgb(222, 235, 255);
}
`;
  document.body.appendChild($style);
})();