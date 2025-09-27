# Frontend Overview & Sidebar Navigation

## Sidebar Navigation Drawer

The app now includes a reusable Sidebar component for dashboard/admin/support/partner navigation. It renders role-based links and uses ARIA attributes for accessibility.

**Usage:**

- Sidebar is automatically rendered for authenticated users based on their role.
- Accessible via keyboard and screen readers.

**Customization:**

- Edit `src/Sidebar.tsx` to add or modify navigation links per role.

## Accessibility Improvements

- ARIA roles and labels are used throughout the app (Sidebar, notifications, modals, skip links).
- Keyboard navigation and skip links are managed in `src/utils/accessibility.ts`.
- Accessibility settings modal is available from the header.

## Running Frontend Tests

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
