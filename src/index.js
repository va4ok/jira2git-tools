import { Notificator} from './notificator/notificator.js';
import { Prefix } from './prefix/prefix.js';
import { Legacy } from './legacy/legacy';

(function () {
  'use strict';

  Notificator.init();
  Prefix.restore();

  !!window.SPA_STATE ? initSPAButtons() : Legacy.init();
})();
