var React = require('react');

module.exports = function useImage(url, crossOrigin, referrerpolicy) {
  // lets use refs for image and status
  // so we can update them during render
  // to have instant update in status/image when new data comes in
  const statusRef = React.useRef('loading');
  const imageRef = React.useRef();

  // we are not going to use token
  // but we need to just to trigger state update
  const [_, setStateToken] = React.useState(0);

  // keep track of old props to trigger changes
  const oldUrl = React.useRef();
  const oldCrossOrigin = React.useRef();
  const oldReferrerPolicy = React.useRef();
  if (
    oldUrl.current !== url ||
    oldCrossOrigin.current !== crossOrigin ||
    oldReferrerPolicy.current !== referrerpolicy
  ) {
    statusRef.current = 'loading';
    imageRef.current = undefined;
    oldUrl.current = url;
    oldCrossOrigin.current = crossOrigin;
    oldReferrerPolicy.current = referrerpolicy;
  }

  React.useLayoutEffect(
    function () {
      if (!url) return;
      var img = document.createElement('img');

      function onload() {
        img
          // in Polotno app I found a case when loaded image was not rendered correctly at the first attempt
          // I found that decoding it manually fixes the issue
          // also it may be good idea decode it that way, so the work is done in the background
          // and we don't block the main thread
          // in context of canvas rendering, large images is a common case
          .decode()
          // catch and ignore decode errors because decode may fail but still will render just fine with drawImage on canvas.
          // I got that case with very large image and chrome
          .catch(() => {
            // Intentionally ignore decode errors - image can still render fine on canvas
          })
          .finally(() => {
            statusRef.current = 'loaded';
            imageRef.current = img;
            setStateToken(Math.random());
          });
      }

      function onerror() {
        statusRef.current = 'failed';
        imageRef.current = undefined;
        setStateToken(Math.random());
      }

      img.addEventListener('load', onload);
      img.addEventListener('error', onerror);
      crossOrigin && (img.crossOrigin = crossOrigin);
      referrerpolicy && (img.referrerPolicy = referrerpolicy);
      img.src = url;

      return function cleanup() {
        img.removeEventListener('load', onload);
        img.removeEventListener('error', onerror);
      };
    },
    [url, crossOrigin, referrerpolicy]
  );

  // return array because it is better to use in case of several useImage hooks
  // const [background, backgroundStatus] = useImage(url1);
  // const [patter] = useImage(url2);
  return [imageRef.current, statusRef.current];
};
