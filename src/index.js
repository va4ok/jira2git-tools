import { Notificator } from './notificator/notificator.js';
import { Prefix } from './prefix/prefix.js';
import { Modern } from './modern/modern.js';
import { Legacy } from './legacy/legacy.js';

(function () {
  'use strict';

  Notificator.init();
  Prefix.restore();

  if (window.hasOwnProperty('SPA_STATE')) {
    Modern.init();
  } else {
    Legacy.init();
  }
})();
