import './drop-down.css';

export class DropDown {
  initBody() {
    this.body = document.createElement('div');
    this.body.style.display = 'none';
    this.body.style.position = 'absolute';
    this.body.style.zIndex = '100';
    this.body.className = 'j2gt-dropdown';
    document.body.appendChild(this.body);
  }

  constructor(triggerDOM, body) {
    this.initBody();
    this.body.appendChild(body);

    this.open = this.open.bind(this);
    this.close = this.close.bind(this);
    this.toggle = this.toggle.bind(this);

    this.trigger = triggerDOM;
    triggerDOM.addEventListener('click', this.toggle);
  }

  open() {
    const rect = this.trigger.getBoundingClientRect();
    this.body.style.left = rect.left + 'px';
    this.body.style.top = rect.top + rect.height + 6 + 'px';
    this.body.style.display = '';

    document.body.addEventListener('click', this.close, { once: true })
  }

  close(e = { stopPropagation: () => {} }) {
    e.stopPropagation();
    this.body.style.display = 'none';
  }

  toggle(e) {
    e.stopPropagation();

    if (this.body.style.display === 'none') {
      this.open();
    } else {
      this.close();
    }
  }
}
