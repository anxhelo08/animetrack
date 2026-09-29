import {registerSW} from 'virtual:pwa-register';

window.ATPWA136=Object.freeze({
  register(callbacks={}){
    let registration=null;
    const update=registerSW({
      immediate:true,
      onNeedRefresh(){callbacks.onNeedRefresh?.()},
      onOfflineReady(){callbacks.onOfflineReady?.()},
      onRegisteredSW(_swUrl,reg){
        registration=reg||null;
        callbacks.onRegistered?.(registration);
      },
      onRegisterError(error){callbacks.onError?.(error)}
    });
    return {
      update:(reloadPage=true)=>update(!!reloadPage),
      registration:()=>registration
    };
  }
});
