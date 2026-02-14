# Agent Guide for Bleep

- Don't run a dev server, assume I'm already running one on localhost:3000
- Favour concise responses that get to the point quickly
- Ensure all changes are run through prettier and linted with ESLint
- Changes should always be backwards compatible with existing code and data
- If there is a reason to not follow these guidelines, explain why and provide a
  rationale for the deviation

## Best Practices

1. **Always validate data** with Zod schemas when importing/parsing
2. **Use Chakra UI theme** for consistent styling (defined in `_app.tsx`)
3. **Keep components focused** - one responsibility per component
4. **Colocate related code** - group by feature, not by type
5. **Export barrel files** for icon collections (see `components/icons/index.ts`)
6. **Use XState machine** for complex state - don't add more state libraries
7. **Leverage browser APIs**: Web Audio, Speech Synthesis, Wake Lock
8. **PWA-first**: Assume offline-first, local storage via LocalForage
