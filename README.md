# Signal K History Explorer

Signal K webapp for discovering paths exposed by a History API provider, selecting a time range, charting values and exporting them to CSV.

## Install

Install `signalk-history-explorer` in the Signal K App Store, then open **History Explorer** from the Webapps menu. Select the URL of the Signal K server in the connection box (for example `http://localhost:3000`), then choose the paths and period to inspect.

The plugin uses the History API v2 endpoints, so it requires an active history provider such as `signalk-to-influxdb2`, `signalk-parquet`, or `signalk-questdb`.

## MVP scope

- paths search and multi-selection;
- quick or custom date ranges;
- history query, line chart and readable table;
- CSV export;
- a demo mode available when no Signal K server is selected.
