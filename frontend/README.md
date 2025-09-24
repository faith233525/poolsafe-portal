# Frontend Test Setup & Troubleshooting

## Running Frontend Tests

- Install dependencies:
  ```powershell
  cd frontend
  npm install
  ```
- Run all tests:
  ```powershell
  npm test
  # or
  npx vitest run
  ```

## Common Issues

- **React version mismatch**: Ensure `@types/react` and `@types/react-dom` match your installed React version.
- **Test failures due to async rendering**: Use `findByText` or `waitFor` from `@testing-library/react` for assertions that depend on async UI updates.
- **JSDOM errors**: Make sure `jsdom` is installed and up to date.

## Troubleshooting Steps

- Delete `node_modules` and reinstall:
  ```powershell
  rm -r node_modules
  npm install
  ```
- Check for conflicting dependencies in `package.json`.
- If tests hang or fail, run with `--run` for a single pass and check error output.

## Useful Commands

- Lint code: `npm run lint`
- Type check: `npm run typecheck`

For more help, see the main README or contact the repo maintainer.
