// ==UserScript==
// @name         Jira Task2Branch
// @namespace    http://tampermonkey.net/
// @version      2.5
// @description  Works only on issue (modern or legacy) details page e.g. https://org.atlassian.net/browse/Jira-Ticket-NNNN. Copy commit message.
// @author       va4ok
// @match        *://*.atlassian.net/browse/*
// @grant        none
// @license      MIT
// ==/UserScript==
const REGEXP = /[\s\[\]:\\\/\"\|\'-\.\,`<\>]+/g;
const MAX_LENGTH = 60;
const DIVIDER = "-";
const TEXT_COPY_BRANCH_NAME = "Copy Branch Name";
const TEXT_COPY_COMMIT_MESSAGE = "Copy Commit Message";
const ANIMATION_TIME = 200;
const POPUP_TIME = 5000;

let notificatorContainerDOM;
let timerId;

(function() {
  "use strict";

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
  const titleDOM = document.querySelector("h1");

  createNotificator();

  if (titleDOM) {
    const copyBranchButton = getSPAButton(
      TEXT_COPY_BRANCH_NAME,
      copySPABranchName
    );
    const copyCommitButton = getSPAButton(
      TEXT_COPY_COMMIT_MESSAGE,
      onSPACopyCommitMessage
    );

    const container = titleDOM.parentElement.parentElement.parentElement;
    const buttonContainer = document.createElement("div");

    buttonContainer.style.margin = "8px";
    buttonContainer.appendChild(copyBranchButton);
    buttonContainer.appendChild(copyCommitButton);

    container.appendChild(buttonContainer);
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
  style.marginRight = "8px";
  style.padding = "10px";

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
      `${parentIssueID} ${subTaskID}: ${subTaskSummary}\n\n` +
      `- [${isBug ? "FIX" : "DEV"}] `;
  } else if (parentIssueID) {
    commitMessage =
      `${parentIssueID}: ${parentIssueSummary} ${subTaskID}: ${subTaskSummary}\n\n` +
      `- [${isBug ? "FIX" : "DEV"}] `;
  } else {
    commitMessage = `${subTaskID}: ${subTaskSummary}\n\n- [${
      isBug ? "FIX" : "DEV"
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
  notificatorContainerDOM = document.createElement("div");
  notificatorContainerDOM.style.transition = "height 1s ease-out";
  notificatorContainerDOM.style.backgroundColor = "#fafafa";
  notificatorContainerDOM.style.position = "fixed";
  notificatorContainerDOM.style.top = "0";
  notificatorContainerDOM.style.left = "0";
  notificatorContainerDOM.style.right = "0";
  notificatorContainerDOM.style.overflow = "hidden";
  notificatorContainerDOM.style.height = "0";
  notificatorContainerDOM.style.zIndex = "1000";

  const text = document.createElement("div");
  text.style.margin = "10px auto 10px";
  text.style.width = "fit-content";

  notificatorContainerDOM.appendChild(text);
  document.body.appendChild(notificatorContainerDOM);
}

function showContainer() {
  if (timerId) {
    clearTimeout(timerId);
    timerId = null;
  }

  notificatorContainerDOM.style.height = "98px";
}

function hideConainer() {
  notificatorContainerDOM.style.height = "0";

  timerId = setTimeout(() => {
    timerId = null;
  }, ANIMATION_TIME);
}

function notify(text, isError) {
  const textShell = notificatorContainerDOM.querySelector("div");
  notificatorContainerDOM.style.backgroundColor = isError
    ? "#a50063"
    : "#3dcd59";

  textShell.innerText = text;
  showContainer();

  timerId = setTimeout(() => {
    hideConainer();
  }, POPUP_TIME);

  isError ? console.warn(text) : console.log(text);
}
//#endregion
