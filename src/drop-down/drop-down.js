import './drop-down.css';

import { Text } from '../text/text.js';
import { Prefix } from '../prefix/prefix.js';
// TODO remove modern link
import { Modern } from '../modern/modern.js';

export class DropDown {
  $dropdown;

  constructor() {
    this.open = this.open.bind(this);
    this.close = this.close.bind(this);
    this.toggle = this.toggle.bind(this);
    this.onPrefixClick = this.onPrefixClick.bind(this);
  }

  onPrefixClick(e) {
    e.stopPropagation();

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
