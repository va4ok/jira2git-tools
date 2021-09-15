# jira2git-tools

Tools for jira cloud to make easier to work with git messages and branches.

## Getting Started

New buttons (Prefix dropdown, Copy Branch Name, Copy Commit Message, Info dropdown) will appears on issue detail page.

If You need some prefix choose one in dropdown or set none if no need prefix. 

Click on Copy Branch Name button to copy branch name and paste one into new created brach as name.

Click on Copy Commit Message button to copy commit message template and paste one into description field on commit.

Info dropdown contains additional useful info (fix version description, priority).

### Prerequisites

To work with jira2git-tools [tampermonkey](https://www.tampermonkey.net/) browser plugin have to be installed

### Installing

Open [OpenUserJS](https://openuserjs.org/scripts/va4ok/Jira_Task2Branch) page.

Install Jira Task2Branch as full or minified script.

Done.


OR


Copy user script from [git page](https://github.com/va4ok/jira2git-tools/blob/master/dist/jira2git.user.js).

Open tampermonkey plugin page in your Chrome or FireFox browser.

Create new user script and paste copied script.

Save script and done.

## Samples
Branch name
```
EXAMPLE-15599-Display-a-specific-Page
ui/EXAMPLE-15599-Display-a-specific-Page
jenkins/EXAMPLE-15599-Display-a-specific-Page
```
Commit message
```
EXAMPLE-15530: Story description

- [DEV]


EXAMPLE-15530: Story description PESV3-15599: Subtask description

- [DEV]
``` 
Commit message for a bug
```
EXAMPLE-15530: Some bug description

- [FIX] 
```

## Authors

* **Oleg Vaka** - *Initial work* - [va4ok](https://github.com/va4ok)

## Contributors

* **Nikolay Borzov** - [nikolay-borzov](https://github.com/nikolay-borzov)

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details
