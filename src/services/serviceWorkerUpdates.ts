/**
 * A page claimed by clients.claim() on a service worker's very first-ever
 * install also fires `controllerchange`, even though nothing "updated" -
 * this gate filters that harmless first event out while still flagging
 * every controllerchange that follows a real deploy.
 */
export function createControllerChangeGate(hadControllerAtLoad: boolean): () => boolean {
  let firstChangeSeen = false;
  return function shouldTreatAsUpdate(): boolean {
    if (hadControllerAtLoad) return true;
    if (!firstChangeSeen) {
      firstChangeSeen = true;
      return false;
    }
    return true;
  };
}
