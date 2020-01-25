import { SelectableList } from '../selectable-list/selectable-list.js';

export class Prefix {
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
