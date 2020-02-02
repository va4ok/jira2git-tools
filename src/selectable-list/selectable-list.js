export class SelectableList {
  constructor(list, onValueClick = () => {
  }) {
    this.ul = document.createElement('ul');
    this.onValueClick = onValueClick;
    this.onclick = this.onclick.bind(this);

    list.forEach(listValue => {
      const li = document.createElement('li');

      li.innerHTML = listValue.value;
      li.title = listValue.description;
      li.addEventListener('click', this.onclick);
      li.dataset.data = JSON.stringify(listValue);
      this.ul.appendChild(li);
    });
  }

  onclick(e) {
    if (typeof  this.onValueClick === 'function') {
      this.onValueClick(JSON.parse(e.target.dataset.data));
    }
  }
}