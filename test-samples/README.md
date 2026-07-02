# POI extraction samples

Each `.json` file contains one real note-style input plus `expectedPois` and `unexpectedPois`.

Run the regression check from the repository root:

```sh
node test-samples/run-tests.mjs
```

The script loads the extractor directly from `index.html`, so tests exercise the same parser used by the page.
