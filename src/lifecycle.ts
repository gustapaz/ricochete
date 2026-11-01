/** Browser event wiring is kept independent of Phaser for deterministic tests. */
export function bindPauseLifecycle(
  windowSource: EventTarget,
  documentSource: EventTarget & { readonly hidden: boolean },
  pause: () => void,
) {
  const onBlur = () => pause();
  const onVisibility = () => { if (documentSource.hidden) pause(); };
  windowSource.addEventListener('blur', onBlur);
  documentSource.addEventListener('visibilitychange', onVisibility);
  return () => {
    windowSource.removeEventListener('blur', onBlur);
    documentSource.removeEventListener('visibilitychange', onVisibility);
  };
}
