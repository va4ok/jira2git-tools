import './notificator.css';

export default class Notificator {
  static ANIMATION_TIME = 200;
  static POPUP_TIME = 5000;

  static textShell;
  static $container;
  static timerId;

  static init() {
    Notificator.textShell = document.createElement('div');
    Notificator.$container = document.createElement('div');
    Notificator.$container.className = 'j2gt-notificator';
    Notificator.$container.appendChild(Notificator.textShell);
    document.body.appendChild(Notificator.$container);
  }

  static notify(text, isError) {
    Notificator.textShell = Notificator.$container.querySelector('div');

    if (isError) {
      Notificator.$container.classList.contains('error') ||
      Notificator.$container.classList.add('error');
    } else {
      Notificator.$container.classList.remove('error');
    }

    Notificator.textShell.innerText = text;
    Notificator.show();

    Notificator.timerId = setTimeout(() => {
      Notificator.hide();
    }, Notificator.POPUP_TIME);

    isError ? console.warn(text) : console.log(text);
  }

  static success(text) {
    Notificator.notify(text, false);
  }

  static error(text) {
    const newText = `${text} 
  Please open console and try to copy manually`;

    Notificator.notify(newText, true);
  }

  static show() {
    if (Notificator.timerId) {
      clearTimeout(Notificator.timerId);
      Notificator.timerId = null;
    }

    Notificator.$container.style.height = '98px';
  }

  static hide() {
    Notificator.$container.style.height = '0';

    Notificator.timerId = setTimeout(() => {
      Notificator.timerId = null;
    }, Notificator.ANIMATION_TIME);
  }
}
