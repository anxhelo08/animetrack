import './core/browser-theme.js';
import "./styles/index.css";
import {canPreviewWelcome} from './modules/welcome-preview.js';

import {createHTML} from "./modules/safe-html.js";
import {safeAvatarURL} from "./modules/avatar.js";
const {cloudConfig}=await import("./config.js");
// Do not expose the legacy HTML if a stylesheet download fails.
if (getComputedStyle(document.documentElement).getPropertyValue('--at-ui-ready').trim() !== '1') {
  document.dispatchEvent(new Event('at-startup-error'));
  throw new Error('The application stylesheet did not load.');
}
const welcome=document.getElementById('welcome-page');
try {
  if (canPreviewWelcome(window.localStorage,cloudConfig.url,location)) {
    welcome.hidden=false;
    welcome.inert=true;
    document.body.classList.add('welcome-preview');
  }
} catch { /* Session verification handles unavailable browser storage. */ }
Object.defineProperty(window, "ATHTML", {value:createHTML(window)});
Object.defineProperty(window, "ATAvatar", {value:Object.freeze({safeURL:safeAvatarURL})});

// Start downloading the controller and opening local storage while factories load.
// startApp still waits for every dependency and the verified repository.
const controllerReady=import("./app.js");
const repositoryReady=import("./core/browser-storage.js").then(async ({libraryRepository})=>{await libraryRepository.prepare()});

await import("./modules/security.js");
const [{default:createClient},{startApp}]=await Promise.all([
  import("./modules/supabase-client.js"),
  controllerReady,
  repositoryReady,
  import("./modules/pwa.js"),
  import("./startup-factories.js")
]);
Object.defineProperty(window, "supabase", {value:Object.freeze({createClient}),configurable:false,writable:false});
await new Promise(resolve=>setTimeout(resolve,0));
await startApp();
document.querySelector('.app').hidden=false;
document.dispatchEvent(new Event('at-startup-ready'));
welcome.inert=false;
