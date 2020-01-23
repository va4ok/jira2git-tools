import './drop-down.css';

import { Text } from '../text/text.js';
import { Prefix } from '../prefix/prefix.js';
// TODO remove modern link
import { Modern } from '../modern/modern.js';

export class DropDown {
  // TODO rename with body ???
  $dropdown;
  onValueSelectedListeners = [];

  constructor(triggerDOM) {
    this.open = this.open.bind(this);
    this.close = this.close.bind(this);
    this.toggle = this.toggle.bind(this);
    this.onPrefixClick = this.onPrefixClick.bind(this);

    triggerDOM.addEventListener('click', this.toggle);
  }

  registerOnValueSelected(callback) {
    this.onValueSelectedListeners.push(callback);
  }

  onPrefixClick(e) {
    e.stopPropagation();

    // TODO move logic into prefix ???
    const prefix = Prefix.LIST.find(p => p.key === e.target.dataset.key);

    if (prefix) {
      Prefix.set(prefix);
    }

    this.close();
  }

  open() {
    if (!this.$dropdown) {
      const $list = document.createElement('ul');

      this.$dropdown = document.createElement('div');
      this.$dropdown.className = 'j2gt-dropdown';

      Prefix.LIST.forEach(prefix => {
        const $button = document.createElement('li');

        $button.innerText = prefix.value;
        $button.title = prefix.description;
        $button.addEventListener('click', this.onPrefixClick);
        $button.dataset.key = prefix.key;
        $list.appendChild($button);
      });

      this.$dropdown.appendChild($list);
    }

    // TODO remove container link
    Modern.buttonsContainer.appendChild(this.$dropdown);
  }

  close() {
    const $btn = document.getElementById('j2gt-prefix-button');

    this.$dropdown.remove();
    $btn.innerText = `${Text.ARROW_DOWN} ${Prefix.get().value}`;
  }

  toggle(e) {
    e.stopPropagation();

    // TODO remove target dependency
    if (e.target.innerText.indexOf(Text.ARROW_DOWN) !== -1) {
      this.open();
      e.target.innerText = `${Text.ARROW_UP} ${Prefix.get().value}`;
    } else {
      this.close();
      e.target.innerText = `${Text.ARROW_DOWN} ${Prefix.get().value}`;
    }
  }
}
