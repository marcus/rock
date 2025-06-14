# Linting & Code Formatting Setup

This project uses **ESLint** and **Prettier** for code quality and consistent formatting.

## 🛠️ Tools Configured

### ESLint
- **React-specific rules** for hooks and JSX
- **Code quality rules** to catch common bugs
- **Style rules** for consistent coding patterns
- **TypeScript-ready** configuration

### Prettier
- **Automatic code formatting** on save
- **Consistent style** across the codebase
- **Integrated with ESLint** to avoid conflicts

## 📝 Available Scripts

```bash
# Run linting check
npm run lint

# Run linting with auto-fix
npm run lint:fix

# Format all files with Prettier
npm run format

# Check if files need formatting (without changing them)
npm run format:check

# Combined: fix linting issues and format code
npm run lint:format
```

## ⚙️ Configuration Files

### `.prettierrc`
Prettier configuration with React-friendly settings:
- Single quotes preferred
- No semicolons
- 2-space indentation
- Trailing commas in ES5-compatible positions
- 100 character line width

### `eslint.config.js`
ESLint flat configuration including:
- React and React Hooks plugins
- Prettier integration
- Custom rules for different file types
- Appropriate globals for browser and Node.js environments

### `.prettierignore`
Files and directories excluded from Prettier formatting

## 🎯 Current Status

✅ **Setup Complete**
- ESLint and Prettier installed and configured
- Integration working correctly
- All tests passing
- Build process unaffected

📊 **Current Issues**
- 2 errors (unused variables)
- 107 warnings (mostly trailing commas)
- All warnings are auto-fixable

## 🔧 IDE Integration

### VS Code
Install these extensions for the best experience:
- **ESLint** (`dbaeumer.vscode-eslint`)
- **Prettier** (`esbenp.prettier-vscode`)

Add to your VS Code `settings.json`:
```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "editor.defaultFormatter": "esbenp.prettier-vscode"
}
```

## 🚀 Workflow

1. **Write code** as normal
2. **Save files** - Prettier will auto-format
3. **Run `npm run lint:fix`** before committing to fix any linting issues
4. **Commit** - clean, consistently formatted code

## 📋 Rules Overview

### Warnings (Will not fail build)
- Missing trailing commas
- Console statements in non-server files
- React Hook dependency warnings

### Errors (Will fail CI/build)
- Unused variables (except those matching ignore patterns)
- Syntax errors
- Import/export issues

## 🛠️ Customization

To adjust rules, edit `eslint.config.js`:
- Change rule severity: `'error'` → `'warn'` → `'off'`
- Add file-specific overrides in the `overrides` array
- Modify ignore patterns for unused variables

To adjust formatting, edit `.prettierrc`:
- Change quote style, line width, etc.
- All changes will automatically be enforced

## 🐛 Troubleshooting

### ESLint conflicts with Prettier
The configuration is designed to avoid conflicts. If you see formatting-related ESLint errors, run:
```bash
npm run format
```

### Performance issues
If linting is slow, you can:
- Add more patterns to `.eslintignore`
- Run linting on specific directories: `npx eslint src/`

### False positives
For intentional violations, use:
```javascript
// eslint-disable-next-line rule-name
const unusedVar = 'ok'
``` 