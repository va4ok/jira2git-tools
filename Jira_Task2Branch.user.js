// ==UserScript==
// @name         Jira Task2Branch
// @namespace    http://tampermonkey.net/
// @version      2.8
// @description  Works only on issue (modern or legacy) details page e.g. https://org.atlassian.net/browse/Jira-Ticket-NNNN. Copy commit message.
// @author       va4ok
// @homepage     https://openuserjs.org/scripts/va4ok
// @source       https://github.com/va4ok/jira2git-tools
// @match        *://*.atlassian.net/browse/*
// @grant        none
// @license      MIT
// ==/UserScript==
const REGEXP = /[\s\[\]:\\\/\"\|\'-\.\,`<\>]+/g;
const MAX_LENGTH = 60;
const DIVIDER = '-';
const TEXT_COPY_BRANCH_NAME = 'Branch Name';
const TEXT_COPY_COMMIT_MESSAGE = 'Commit Message';
const ARROW_DOWN = '\u23F7';
const ARROW_UP = '\u23F6';
const ANIMATION_TIME = 200;
const POPUP_TIME = 5000;
const PREFIX_KEY = 'JiraToGitPrefix';
const DEFAULT_PREFIXES = [
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
const style = `<style>
  .j2gt-notificator {
    transition: height 1s ease-out;
    background-color: #3dcd59;
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

  .j2gt-dropdown {
    position: absolute;
    z-index: 1000;
    top: 90px;
    left: 8px;
  }

  .j2gt-dropdown ul {
    padding: 4px 0;
    background: white;
    box-shadow: rgba(9, 30, 66, 0.13) 0px 0px 0px 1px, rgba(9, 30, 66, 0.13) 0px 4px 11px;
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
</style>`;

let $notificatorContainer;
let timerId;
let branchPrefix;
let $dropdown;
let $buttonsContainer;

(function() {
  'use strict';

  const div = document.createElement('div');

  createNotificator();
  restorePrefix();
  div.innerHTML = style;
  document.body.appendChild(div.firstChild);

  !!window.SPA_STATE ? initSPAButtons() : initLegacyButtons();
})();

//#region MODERN design
function copySPABranchName(e) {
  const { subTaskID, subTaskSummary } = getSPAIssue();

  let result = formatBranchNameText(`${subTaskID} ${subTaskSummary}`);

  e.stopPropagation();
  copyToClipboard(result);
}

function initSPAButtons() {
  const titleDOM = document.querySelector('h1');

  if (titleDOM) {
    const prefixButton = getSPAButton(
      `${ARROW_DOWN} ${branchPrefix.value}`,
      toggleDropDown
    );

    const copyBranchButton = getSPAButton(
      TEXT_COPY_BRANCH_NAME,
      copySPABranchName
    );
    copyBranchButton.insertBefore(getCopyIcon(), copyBranchButton.firstChild);

    const copyCommitButton = getSPAButton(
      TEXT_COPY_COMMIT_MESSAGE,
      onSPACopyCommitMessage
    );
    copyCommitButton.insertBefore(getCopyIcon(), copyCommitButton.firstChild);

    const container = titleDOM.parentElement.parentElement.parentElement;
    $buttonsContainer = document.createElement('div');
    $buttonsContainer.className = 'j2gt-buttons-container';
    prefixButton.id = 'j2gt-prefix-button';

    $buttonsContainer.appendChild(prefixButton);
    $buttonsContainer.appendChild(copyBranchButton);
    $buttonsContainer.appendChild(copyCommitButton);

    container.appendChild($buttonsContainer);
  }
}

function toggleDropDown(e) {
  e.stopPropagation();

  if (e.target.innerText.indexOf(ARROW_DOWN) !== -1) {
    openDropDown();
    e.target.innerText = `${ARROW_UP} ${branchPrefix.value}`;
  } else {
    closeDropDown();
    e.target.innerText = `${ARROW_DOWN} ${branchPrefix.value}`;
  }
}

function openDropDown() {
  if (!$dropdown) {
    const $list = document.createElement('ul');

    $dropdown = document.createElement('div');
    $dropdown.className = 'j2gt-dropdown';

    DEFAULT_PREFIXES.forEach(prefix => {
      const $button = document.createElement('li');

      $button.innerText = prefix.value;
      $button.title = prefix.description;
      $button.addEventListener('click', onPrefixClick);
      $button.dataset.key = prefix.key;
      $list.appendChild($button);
    });

    $dropdown.appendChild($list);
  }

  $buttonsContainer.appendChild($dropdown);
}

function closeDropDown() {
  const $btn = document.getElementById('j2gt-prefix-button');

  $dropdown.remove();
  $btn.innerText = `${ARROW_DOWN} ${branchPrefix.value}`;
}

function onPrefixClick(e) {
  e.stopPropagation();

  const prefix = DEFAULT_PREFIXES.find(p => p.key === e.target.dataset.key);

  if (prefix) {
    branchPrefix = prefix;
    savePrefix();
  }

  closeDropDown();
}

function getCopyIcon() {
  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  icon.setAttribute('width', '24');
  icon.setAttribute('height', '24');
  icon.setAttribute('viewBox', '0 0 24 24');
  icon.setAttribute('focusable', 'false');
  icon.setAttribute('role', 'presentation');
  icon.classList.add('j2gt-buttons-icon')

  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('fill', 'currentColor');

  const path1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path1.setAttribute('d', 'M10 19h8V8h-8v11zM8 7.992C8 6.892 8.902 6 10.009 6h7.982C19.101 6 20 6.893 20 7.992v11.016c0 1.1-.902 1.992-2.009 1.992H10.01A2.001 2.001 0 0 1 8 19.008V7.992z"></path><path d="M5 16V4.992C5 3.892 5.902 3 7.009 3H15v13H5zm2 0h8V5H7v11z');

  const path2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path2.setAttribute('d', 'M5 16V4.992C5 3.892 5.902 3 7.009 3H15v13H5zm2 0h8V5H7v11z');

  g.appendChild(path1);
  g.appendChild(path2);
  icon.appendChild(g);

  return icon;
}

function getSPAButton(text, callback) {
  const button = document.createElement('button');

  button.innerText = text;
  button.addEventListener('click', callback);

  return button;
}

function getSPAIssue() {
  let subTaskID;
  let subTaskSummary;
  let subTaskType;

  for (let spa_statePropName in window.SPA_STATE) {
    if (spa_statePropName.indexOf('ISSUE') !== -1) {
      const issueObject = window.SPA_STATE[spa_statePropName];
      const issueKey = Object.keys(issueObject).pop();
      const issue = issueObject[issueKey].data;

      if (!issue) continue;

      const fields = JSON.parse(issue.fields);

      subTaskID = issue.key;
      subTaskSummary = getFieldValueByName(fields, 'summary');
      subTaskType = getFieldValueByName(fields, 'issuetype').name;
    }
  }

  return { subTaskID, subTaskSummary, subTaskType };
}

function getSPAIssueDetails(issueID) {
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

function onSPACopyCommitMessage(e) {
  e.stopPropagation();

  let { subTaskID, subTaskSummary, subTaskType } = getSPAIssue();

  getSPAIssueDetails(subTaskID).then(
    function({ data }) {
      let isBug = ifBug(subTaskType.trim());
      let parentIssue = getFieldValueByName(data.issue.fields, 'parent');
      let parentIssueID = '';
      let parentIssueSummary = '';

      if (parentIssue) {
        parentIssueID = parentIssue.key;
        parentIssueSummary = parentIssue.fields.summary;
      }

      copyToClipboard(
        getCommitMessage({
          parentIssueID,
          parentIssueSummary,
          subTaskID,
          subTaskSummary,
          isBug
        })
      );
    },
    function() {
      notifyError('JIRA API problems');
    }
  );
}

// issuetype
// Issue Type JSON.parse(window.SPA_STATE['issue/full-page:JIRA_TICKET'].data.issue.fields)[20][1].value.name
//#endregion

//#region LEGACY design
function initLegacyButtons() {
  const buttonsBar = document.querySelector('.toolbar-split-left');

  if (buttonsBar) {
    const ul = document.createElement('ul');

    ul.className = 'toolbar-group';
    ul.appendChild(
      createLegacyButton(copyLegacyBranchName, TEXT_COPY_BRANCH_NAME)
    );
    ul.appendChild(
      createLegacyButton(onLegacyCopyCommitMessage, TEXT_COPY_COMMIT_MESSAGE)
    );
    buttonsBar.appendChild(ul);
  }
}

function createLegacyButton(callback, text) {
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

function onLegacyCopyCommitMessage(e) {
  e.stopPropagation();
  copyCommitMessage();
}

function copyLegacyBranchName(e) {
  const issueID = getLegacyIssueID();
  const issueName = getLegacyIssueName();
  const result = formatBranchNameText(issueID + ' ' + issueName);

  e.stopPropagation();
  copyToClipboard(result);
}

function copyCommitMessage() {
  let { parentIssueID, parentIssueSummary } = getLegacyParentIssue();
  let subTaskID = getLegacyIssueID();
  let subTaskSummary = getLegacyIssueName();
  let isBug = legacyIsBug();

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

function isSimilarText(textA, textB) {
  return textA === textB;
}

function getLegacyParentIssue() {
  const parentIssueDOM = document.getElementById('parent_issue_summary');

  let parentIssueID = '';
  let parentIssueSummary = '';

  if (parentIssueDOM) {
    parentIssueID = parentIssueDOM.dataset.issueKey;
    parentIssueSummary = parentIssueDOM.getAttribute('original-title');
  }

  return { parentIssueID, parentIssueSummary };
}

function getLegacyIssueID() {
  const issueIDDOM = document.getElementById('key-val');

  if (issueIDDOM) {
    return issueIDDOM.innerText;
  } else {
    throw new Error("Can't read issue ID");
  }
}

function getLegacyIssueName() {
  const issueNameDOM = document.getElementById('summary-val');

  if (issueNameDOM) {
    return issueNameDOM.innerText;
  } else {
    throw new Error("Can't read issue title");
  }
}

function legacyIsBug() {
  const spanDOM = document.getElementById('type-val');

  if (spanDOM) {
    return ifBug(spanDOM.innerText.trim());
  }

  return false;
}
//#endregion

//#region COMMON
function ifBug(issueType) {
  return issueType.toUpperCase() === 'BUG';
}

function formatBranchNameText(text) {
  const result = text
    .trim()
    .replace(REGEXP, DIVIDER)
    .slice(0, MAX_LENGTH - (branchPrefix.value.length + 1)); // +1 for slash

  return `${branchPrefix.value}/${result}`;
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(
    () => {
      notifySuccess('Copied:\n' + text);
    },
    () => {
      copyToClipboardFallback();
    }
  );
}

function copyToClipboardFallback(result) {
  notifyError('Not copied:\n' + result);
}

function getFieldValueByName(fields, fieldName) {
  let value;

  fields.forEach(function(field) {
    if (field.key) {
      if (field.key === fieldName) {
        value = field.content;
      }
    } else {
      field.forEach(function(property) {
        if (property.key === fieldName) {
          value = property.value;
        }
      });
    }
  });

  return value;
}

function sendPostRequest(url, data) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open('POST', url);
    xhr.onload = () => resolve(JSON.parse(xhr.responseText));
    xhr.onerror = () => reject(xhr.statusText);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(JSON.stringify(data));
  });
}

const http = {
  post: sendPostRequest
};

function getCommitMessage({
  parentIssueID,
  parentIssueSummary,
  subTaskID,
  subTaskSummary,
  isBug
}) {
  let commitMessage;

  if (parentIssueID && isSimilarText(subTaskSummary, parentIssueSummary)) {
    commitMessage =
      `${parentIssueID} ${subTaskID}: ${subTaskSummary}\n\n` +
      `- [${isBug ? 'FIX' : 'DEV'}] `;
  } else if (parentIssueID) {
    commitMessage =
      `${parentIssueID}: ${parentIssueSummary} ${subTaskID}: ${subTaskSummary}\n\n` +
      `- [${isBug ? 'FIX' : 'DEV'}] `;
  } else {
    commitMessage = `${subTaskID}: ${subTaskSummary}\n\n- [${
      isBug ? 'FIX' : 'DEV'
    }] `;
  }

  return commitMessage;
}

function notifySuccess(text) {
  notify(text, false);
}

function notifyError(text) {
  const newText = `${text}
  Please open console and try to copy manually`;

  notify(newText, true);
}

function createNotificator() {
  const text = document.createElement('div');

  $notificatorContainer = document.createElement('div');
  $notificatorContainer.className = 'j2gt-notificator';
  $notificatorContainer.appendChild(text);
  document.body.appendChild($notificatorContainer);
}

function showContainer() {
  if (timerId) {
    clearTimeout(timerId);
    timerId = null;
  }

  $notificatorContainer.style.height = '98px';
}

function hideContainer() {
  $notificatorContainer.style.height = '0';

  timerId = setTimeout(() => {
    timerId = null;
  }, ANIMATION_TIME);
}

function notify(text, isError) {
  const textShell = $notificatorContainer.querySelector('div');

  if (isError) {
    $notificatorContainer.classList.contains('error') ||
      $notificatorContainer.classList.add('error');
  } else {
    $notificatorContainer.classList.remove('error');
  }

  textShell.innerText = text;
  showContainer();

  timerId = setTimeout(() => {
    hideContainer();
  }, POPUP_TIME);

  isError ? console.warn(text) : console.log(text);
}

function savePrefix() {
  localStorage.setItem(PREFIX_KEY, JSON.stringify(branchPrefix));
}

function restorePrefix() {
  const restoredPrefix = localStorage.getItem(PREFIX_KEY);

  branchPrefix = restoredPrefix
    ? JSON.parse(restoredPrefix)
    : DEFAULT_PREFIXES[0];
}
//#endregion
