import { Notificator } from '../notificator/notificator.js';

export class Copy {
  static toClipboard(text) {
    navigator.clipboard.writeText(text).then(
      () => {
        Notificator.success('Copied:\n' + text);
      },
      () => {
        Copy.clipboardFallback(text);
      }
    );
  }

  static clipboardFallback(result) {
    Notificator.error('Not copied:\n' + result);
  }
}
