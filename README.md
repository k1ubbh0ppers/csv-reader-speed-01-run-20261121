# Fast csv-reader compatible parser

This entry implements the csv-reader 1.0.0 dialect in a single left-to-right pass. Ordinary fields are scanned to delimiters and copied with `slice`; quoted fields only allocate fragments when escapes or line-ending normalization require them. The parser retains csv-reader's error order and malformed-row behavior.

On the bundled practice draw (6 generated cases, 11,064,623 bytes of input JSON), the outputs matched all 6 references. A local CPU-time benchmark with V8 incremental marking disabled ran the full set seven times per implementation: median 1.1249 s for the bundled csv-reader baseline and 0.1359 s for this parser (about 8.3× faster). Timings are local and can vary with host load.
