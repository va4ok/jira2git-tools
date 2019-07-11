// ==UserScript==
// @name         Jira Task2Branch
// @namespace    http://tampermonkey.net/
// @version      2.2
// @description  Works only on issue (modern or legacy) details page e.g. https://org.atlassian.net/browse/Jira-Ticket-NNNN. Copy commit message.
// @author       va4ok
// @match        *://*.atlassian.net/browse/*
// @grant        none
// @license      MIT
// ==/UserScript==
const REGEXP = /[\s\[\]:\\\/\"\|\'-\.\,`\<\>]+/g;
const MAX_LENGTH = 60;
const DIVIDER = "-";
const TEXT_COPY_BRANCH_NAME = "Copy Branch Name";
const TEXT_COPY_COMMIT_MESSAGE = "Copy Commit Message";

let isSPA = false;

(function() {
  "use strict";

  isSPA = !!window.SPA_STATE;
  isSPA ? initSPAButtons() : initLegacyButtons();
})();

//#region MODERN design
function copySPABranchName(e) {
  const { subTaskID, subTaskSummary } = getSPAIssue();

  let result = formatBranchNameText(`${subTaskID} ${subTaskSummary}`);

  e.stopPropagation();
  copyToClipboard(result);
}

function initSPAButtons() {
  const titleDOM = document.querySelector("h1");

  if (titleDOM) {
    const copyBranchButton = getSPAButton(
      TEXT_COPY_BRANCH_NAME,
      copySPABranchName
    );
    const copyCommitButton = getSPAButton(
      TEXT_COPY_COMMIT_MESSAGE,
      onSPACopyCommitMessage
    );

    titleDOM.parentElement.appendChild(copyBranchButton);
    titleDOM.parentElement.appendChild(copyCommitButton);
  }
}

function getSPAButton(text, callback) {
  let button = document.createElement("button");
  let style = button.style;

  style.color = "rgb(80, 95, 121)";
  style.border = "none";
  style.background = "rgba(9, 30, 66, 0.04)";
  style.fontFamily =
    '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  style.fontSize = "14px";
  style.cursor = "pointer";
  style.marginRight = "5px";

  button.innerText = text;
  button.addEventListener("click", callback);

  return button;
}

function getSPAIssue() {
  let subTaskID;
  let subTaskSummary;
  let subTaskType;

  for (let spa_statePropName in window.SPA_STATE) {
    if (spa_statePropName.indexOf("issue/") !== -1) {
      const issue = window.SPA_STATE[spa_statePropName].data.issue;
      const fields = JSON.parse(issue.fields);

      subTaskID = issue.key;
      subTaskSummary = getFieldValueByName(fields, "summary");
      subTaskType = getFieldValueByName(fields, "issuetype").name;
    }
  }

  return { subTaskID, subTaskSummary, subTaskType };
}

function getSPAIssueDetails(issueID) {
  const url = "/rest/graphql/1/";

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

  return sendPostRequest(url, query);
}

function onSPACopyCommitMessage(e) {
  e.stopPropagation();

  let { subTaskID, subTaskSummary, subTaskType } = getSPAIssue();

  getSPAIssueDetails(subTaskID).then(
    function({ data }) {
      let isBug = ifBug(subTaskType.trim());
      let parentIssue = getFieldValueByName(data.issue.fields, "parent");
      let parentIssueID = "";
      let parentIssueSummary = "";

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
      notifyError("JIRA API problems");
    }
  );
}

// issuetype
// Issue Type JSON.parse(window.SPA_STATE['issue/full-page:JIRA_TICKET'].data.issue.fields)[20][1].value.name
//#endregion

//#region LEGACY design
function initLegacyButtons() {
  const buttonsBar = document.querySelector(".toolbar-split-left");

  if (buttonsBar) {
    let ul = document.createElement("ul");

    ul.className = "toolbar-group";
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
  let li = document.createElement("li");
  let a = document.createElement("a");
  let span = document.createElement("span");

  li.className = "toolbar-item";
  a.className = "toolbar-trigger";
  a.addEventListener("click", callback);
  span.className = "trigger-label";
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
  const result = formatBranchNameText(issueID + " " + issueName);

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
  const parentIssueDOM = document.getElementById("parent_issue_summary");

  let parentIssueID = "";
  let parentIssueSummary = "";

  if (parentIssueDOM) {
    parentIssueID = parentIssueDOM.dataset.issueKey;
    parentIssueSummary = parentIssueDOM.getAttribute("original-title");
  }

  return { parentIssueID, parentIssueSummary };
}

function getLegacyIssueID() {
  const issueIDDOM = document.getElementById("key-val");

  if (issueIDDOM) {
    return issueIDDOM.innerText;
  } else {
    throw new Error("Can't read issue ID");
  }
}

function getLegacyIssueName() {
  const issueNameDOM = document.getElementById("summary-val");

  if (issueNameDOM) {
    return issueNameDOM.innerText;
  } else {
    throw new Error("Can't read issue title");
  }
}

function legacyIsBug() {
  const spanDOM = document.getElementById("type-val");

  if (spanDOM) {
    return ifBug(spanDOM.innerText.trim());
  }

  return false;
}
//#endregion

//#region COMMON
function ifBug(issueType) {
  return issueType.toUpperCase() === "BUG";
}

function formatBranchNameText(text) {
  return text
    .trim()
    .replace(REGEXP, DIVIDER)
    .slice(0, MAX_LENGTH);
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(
    () => {
      notifySuccess("Copied:\n" + text);
    },
    () => {
      copyToClipboardFallback();
    }
  );
}

function copyToClipboardFallback(result) {
  notifyError("Not copied:\n" + result);
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

    xhr.open("POST", url);
    xhr.onload = () => resolve(JSON.parse(xhr.responseText));
    xhr.onerror = () => reject(xhr.statusText);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.send(JSON.stringify(data));
  });
}

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
      `${parentIssueID} ${subTaskID}: ${subTaskSummary}\n` +
      `- [${isBug ? "FIX" : "DEV"}] `;
  } else if (parentIssueID) {
    commitMessage =
      `${parentIssueID}: ${parentIssueSummary} ${subTaskID}: ${subTaskSummary}\n` +
      `- [${isBug ? "FIX" : "DEV"}] `;
  } else {
    commitMessage = `${subTaskID}: ${subTaskSummary}\n- [${
      isBug ? "FIX" : "DEV"
    }] `;
  }

  return commitMessage;
}

function notifySuccess(text) {
  console.log(text);
}

function notifyError(text) {
  console.warn(text); // Add check console and copy manually
}
//#endregion
