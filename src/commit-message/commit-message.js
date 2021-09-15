import { SelectableList } from '../selectable-list/selectable-list.js';

export class CommitMessage {
  static LIST = [
    {
      key: 'fix',
      value: 'fix',
      description:
        'A commit of the type fix patches a bug in your codebase (this correlates with PATCH in semantic versioning).'
    },
    {
      key: 'feat',
      value: 'feat',
      description:
        'A commit of the type feat introduces a new feature to the codebase (this correlates with MINOR in semantic versioning).'
    },
    // {
    //   key: 'chore',
    //   value: 'chore',
    //   description: 'For UI only changes. CI includes: UI unit tests, UI build'
    // },
    {
      key: 'docs',
      value: 'docs',
      description: 'Only documents updated.'
    },
    {
      key: 'style',
      value: 'style',
      description: 'Code style fixes.'
    },
    {
      key: 'refactor',
      value: 'refactor',
      description: 'Code refactoring. No new features. No bug fixes.'
    },
    {
      key: 'perf',
      value: 'perf',
      description: 'Fix performance issues.'
    },
    {
      key: 'test',
      value: 'test',
      description: 'Add new tests to cover existing features.'
    }
  ];

  static selectableList = new SelectableList(CommitMessage.LIST, CommitMessage.onCommitMessageClick);

  static onCommitMessageSelected = () => {
  };

  static onCommitMessageClick(prefix) {
    CommitMessage.set(prefix);
    CommitMessage.onCommitMessageSelected();
  }
}
