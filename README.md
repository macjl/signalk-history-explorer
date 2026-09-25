# Signal K History Explorer

Signal K webapp for exploring paths recorded by a History API provider over a selected time range.

## Install

Install `signalk-history-explorer` in Signal K, then open **History Explorer** from the Webapps menu. The explorer uses the local Signal K server. Choose a context (boat), a start and end date, filter the available paths, then expand a path to read its values.

The plugin uses the History API v2 endpoints, so it requires an active history provider such as `signalk-to-influxdb2`, `signalk-parquet`, or `signalk-questdb`.

## MVP scope

- start and end date selection;
- context (boat) selection from the History API;
- path filtering and collapsible path groups;
- lazy loading: path values are requested only when a path is expanded;
- numeric chart and chronological value table;
- chronological text and state values;
- displayed source and unit when supplied by the History API.
