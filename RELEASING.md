# npm publishing

The package is published by `.github/workflows/publish.yml` when a GitHub
Release is published, or when the workflow is started manually. It uses npm
trusted publishing (OIDC), not an npm token stored in GitHub. Do not create a
Release until the first-publish setup below is complete.

## Bootstrap the package once

npm requires a package to exist before a trusted publisher can be configured.
Publish an empty placeholder version `0.0.1` manually under the
`signalk-history-explorer` name. Do not publish the actual plugin version
locally: its first publication should come from the GitHub workflow with OIDC
and provenance. This step requires access to the `macjl` npm account.

Run these commands outside the plugin repository:

```sh
npm login --registry=https://registry.npmjs.org
test "$(npm whoami --registry=https://registry.npmjs.org)" = macjl
bootstrap_dir="$(mktemp -d)"
cd "$bootstrap_dir"
npm init -y
npm pkg set name=signalk-history-explorer version=0.0.1 \
  description="Empty bootstrap package for Signal K History Explorer" \
  license=Apache-2.0 \
  repository.type=git \
  repository.url=git+https://github.com/macjl/signalk-history-explorer.git
npm pack --dry-run
npm publish --registry=https://registry.npmjs.org --access public --tag bootstrap
```

The `bootstrap` dist-tag keeps the empty version off `latest`; the first real
release will use `latest` by default. The temporary directory can be removed
after confirming the publish. Do not run this sequence from the plugin checkout.

## Configure trusted publishing

After the `0.0.1` bootstrap package is visible on npm, use npm CLI 11.15.0 or
later and an npm account with 2FA enabled:

```sh
npm trust github signalk-history-explorer \
  --repo macjl/signalk-history-explorer \
  --file publish.yml \
  --allow-publish \
  --registry=https://registry.npmjs.org
npm trust list signalk-history-explorer --registry=https://registry.npmjs.org
```

The `--file` value is only the workflow filename, not its full path. No
environment is configured. The `--allow-publish` permission is required because
the workflow runs `npm publish`. No `NPM_TOKEN` secret is needed.

For each release, update `package.json`, `package-lock.json`, and `CHANGELOG.md`,
run `npm ci`, `npm test`, and `npm pack --dry-run`, then push the release commit.
Create its `vX.Y.Z` tag and publish a GitHub Release from that tag. The workflow
checks that the tag matches the package version before publishing. Verify the
resulting npm package and provenance.

After a successful OIDC release, consider requiring 2FA and disallowing
traditional tokens in npm publishing settings. Do this only after confirming
that OIDC publishing works.
