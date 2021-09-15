import './../selectable-list/selectable-list.js';

export class AdditionalInfo {
  static get({fixVersionsDescription, sprint, priority}) {
    const list = [];

    if (fixVersionsDescription) {
      list.push({
        'description': 'Fix version description.',
        'value': `<strong>Fix Version:</strong> ${fixVersionsDescription}`
      });
    }

    if (sprint) {
      list.push({
        'description': 'Sprint to done in.',
        'value': `<strong>Sprint:</strong> ${sprint}`
      });
    }

    if (priority) {
      list.push({
        'description': 'Task priority.',
        'value': `<strong>Priority:</strong> <img src="${priority.iconUlr}" width="16px" height="16px" title="" alt=""> ${priority.description}`
      });
    }

    return new SelectableList(list).ul;
  }
}
