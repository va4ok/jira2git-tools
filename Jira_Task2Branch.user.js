// ==UserScript==
// @name         Jira Task2Branch
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  Works only on issue (modern or legacy) details page e.g. https://org.atlassian.net/browse/Jira-Ticket-NNNN. Copy commit message.
// @author       va4ok
// @match        *://*.atlassian.net/browse/*
// @grant        none
// @license      MIT
// ==/UserScript==
const REGEXP = /[\s\[\]:\\\/\"\|\'-\.\,`]+/g;
const MAX_LENGTH = 60;
const DIVIDER = "-";

let isModernDesign = false;

(function() {
  "use strict";

  isModernDesign = !!window.SPA_STATE;
  isModernDesign ? initModernCopyButton() : initOldStyleCopyButtons();
})();

//#region MODERN design
function copyModernBranchName() {
  let issueID;
  let issueName;

  for (let spa_statePropName in window.SPA_STATE) {
    if (spa_statePropName.indexOf("issue/") !== -1) {
      const issue = window.SPA_STATE[spa_statePropName].data.issue;
      const fields = JSON.parse(issue.fields);

      issueID = issue.key;
      issueName = getFieldValueByName(fields, "summary");
    }
  }

  let result = prepareBranchNameText(issueID + " " + issueName);

  copyToClipboard(result);
}

function initModernCopyButton() {
  const titleDOM = document.querySelector("h1");

  if (titleDOM) {
    let copyButton = getCopyBranchButton();

    copyButton.style.color = "rgb(80, 95, 121)";
    copyButton.style.border = "none";
    copyButton.style.background = "rgba(9, 30, 66, 0.04)";
    copyButton.style.fontFamily =
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif';
    copyButton.style.fontSize = "14px";
    copyButton.style.cursor = "pointer";

    titleDOM.parentElement.appendChild(copyButton);
  }
}
//#endregion

//#region LEGACY design
function initOldStyleCopyButtons() {
  const buttonsBar = document.querySelector(".toolbar-split-left");

  if (buttonsBar) {
    let ul = document.createElement("ul");

    ul.className = "toolbar-group";
    ul.appendChild(
      createButton(onCopyBranchNameButtonClick, "Copy Branch Name")
    );
    ul.appendChild(createButton(onCopyCommitMessage, "Copy Commit Message"));
    buttonsBar.appendChild(ul);
  }
}

function createButton(callback, text) {
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

function onCopyCommitMessage(e) {
  e.stopPropagation();
  copyCommitMessage();
}

function copyLegacyBranchName() {
  const issueID = getLegacyIssueID();
  const issueName = getLegacyIssueName();
  const result = prepareBranchNameText(issueID + " " + issueName);

  copyToClipboard(result);
}

function copyCommitMessage() {
  let parentIssueID;
  let parentIssueSummary;
  let subTaskID = getLegacyIssueID();
  let subTaskSummary = getLegacyIssueName();
  let isBug = legacyIsBug();
  let commitMessage;

  if (parentIssueID && isSimilarText(subTaskSummary, parentIssueSummary)) {
    commitMessage =
      `${parentIssueID} ${subTaskID}: ${subTaskSummary}\n` +
      ` - [${isBug ? "FIX" : "DEV"}] `;
  } else if (parentIssueID) {
    commitMessage =
      `${parentIssueID}: ${parentIssueSummary} ${subTaskID}: ${subTaskSummary}\n` +
      `- [${isBug ? "FIX" : "DEV"}] `;
  } else {
    commitMessage =
      `${subTaskID}: ${subTaskSummary}\n` + `- [${isBug ? "FIX" : "DEV"}] `;
  }

  copyToClipboard(commitMessage);
}

function isSimilarText(textA, textB) {
  return textA === textB;
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
    return spanDOM.innerText.trim().toUpperCase() === "BUG";
  }

  return false;
}
//#endregion

//#region COMMON
function prepareBranchNameText(text) {
  return text
    .trim()
    .replace(REGEXP, DIVIDER)
    .slice(0, MAX_LENGTH);
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(
    () => {
      console.log("Copied: " + text);
    },
    () => {
      copyToClipboardFallback();
    }
  );
}

function copyToClipboardFallback(result) {
  console.warn("Not copied: " + result);
}

function getFieldValueByName(fields, fieldName) {
  let value;

  fields.forEach(function(field) {
    field.forEach(function(property) {
      if (property.key === fieldName) {
        value = property.value;
      }
    });
  });

  return value;
}

function onCopyBranchNameButtonClick(e) {
  e.stopPropagation();
  isModernDesign ? copyModernBranchName() : copyLegacyBranchName();
}

function getCopyBranchButton() {
  let copyButton = document.createElement("button");

  copyButton.innerText = "Copy Branch Name";
  copyButton.addEventListener("click", onCopyBranchNameButtonClick);

  return copyButton;
}
//#endregion
