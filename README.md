# Signal K History Explorer

Signal K webapp for exploring paths recorded by a History API provider over a selected time range.

## Install

Install `signalk-history-explorer` in Signal K. It enables itself when the server restarts after installation, unless you have explicitly disabled it. Then open **History Explorer** from the Webapps menu. The explorer uses the local Signal K server. Choose a context (boat) or **ALL**, a start and end date, filter the available paths, then expand a path to read its values. ALL queries each context for the opened path and merges the results by timestamp. Every value displays its context and source when available.

The plugin uses the History API v2 endpoints, so it requires an active history provider such as `signalk-to-influxdb2`, `signalk-parquet`, or `signalk-questdb`.

## MVP scope

- start and end date selection;
- context (boat) selection from the History API, including ALL;
- path filtering and collapsible path groups;
- lazy loading: path values are requested only when a path is expanded;
- numeric chart and chronological value table;
- chronological text and state values;
- context and source columns on every value; source and unit are shown when supplied by the History API.

The History API currently lists paths for the whole period rather than filtering them by context. A path can therefore appear for a boat that has no values for it. Source attribution depends on the provider; a dash is shown when it is unavailable.
