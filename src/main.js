import './core/browser-theme.js';
import "./styles/index.css";

import {createHTML} from "./modules/safe-html.js";
import {safeAvatarURL} from "./modules/avatar.js";
Object.defineProperty(window, "ATHTML", {value:createHTML(window)});
Object.defineProperty(window, "ATAvatar", {value:Object.freeze({safeURL:safeAvatarURL})});

// Start downloading the controller and opening local storage while factories load.
// startApp still waits for every dependency and the verified repository.
const controllerReady=import("./app.js");
const repositoryReady=import("./core/browser-storage.js").then(async ({libraryRepository})=>{await libraryRepository.prepare()});

await import("./config.js");
await import("./modules/security.js");
const [{default:createClient},{startApp}]=await Promise.all([
  import("./modules/supabase-client.js"),
  controllerReady,
  repositoryReady,
  import("./modules/pwa.js"),
  import("./startup-factories.js")
]);
Object.defineProperty(window, "supabase", {value:Object.freeze({createClient}),configurable:false,writable:false});
startApp();
