import './../selectable-list/selectable-list.js';

export class AdditionalInfo {
  static get({ fixVersionsDescription }) {
    const list = [];

    if (fixVersionsDescription) {
      list.push({
        'description': 'Fix version description',
        'value': `<strong>Fix Version:</strong> ${fixVersionsDescription}`
      })
    }

    return new SelectableList(list).ul;
  }
}