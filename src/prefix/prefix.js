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

  static selected;

  static save() {
    localStorage.setItem(Prefix.KEY, JSON.stringify(Prefix.selected));
  }

  static restore() {
    const restoredPrefix = localStorage.getItem(Prefix.KEY);

    Prefix.selected = restoredPrefix ? JSON.parse(restoredPrefix) : Prefix.LIST[0];
  }

  static set(current) {
    Prefix.selected = current;
    Prefix.save();
  }
}
