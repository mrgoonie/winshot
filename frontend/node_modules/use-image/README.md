# useImage React Hook

Custom React Hook for loading images. It loads passed `url` and creates DOM image with such `src`.
Useful for canvas application like `react-konva`.

[Open image demo](https://konvajs.org/docs/react/Images.html)

## Install

```bash
npm install use-image
```


## Usage

```js
import React from 'react';
import { Image } from 'react-konva';
import useImage from 'use-image';

const url = 'https://konvajs.github.io/assets/yoda.jpg';

function SimpleApp() {  
  const [image] = useImage(url);

  // "image" will be DOM image element or undefined

  return (
    <Image image={image} />
  );
}

function ComplexApp() {
  // set crossOrigin of image as second argument, set referrerpolicy as third argument
  const [image, status] = useImage(url, 'anonymous', 'origin');

  // status can be "loading", "loaded" or "failed"

  return (
    <Image image={image} />
  );
}
```



## License

MIT
