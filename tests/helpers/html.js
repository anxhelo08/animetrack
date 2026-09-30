import {JSDOM} from 'jsdom';
import {createHTML} from '../../src/modules/safe-html.js';
export const htmlHelpers=createHTML(new JSDOM('').window);
export const avatarHelpers={safeURL:()=>''};
