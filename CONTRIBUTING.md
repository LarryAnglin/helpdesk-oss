# Contributing to HelpDesk

Thank you for your interest in contributing to HelpDesk! This document provides guidelines and information for contributors.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment. Be kind, be patient, and be constructive.

## How to Contribute

### Reporting Bugs

Before submitting a bug report:

1. Check the [existing issues](https://github.com/LarryAnglin/HelpDesk/issues) to avoid duplicates
2. Use the latest version of the code
3. Collect relevant information (error messages, screenshots, steps to reproduce)

When submitting a bug report, include:

- A clear, descriptive title
- Steps to reproduce the issue
- Expected behavior vs actual behavior
- Your environment (OS, Node version, browser)
- Any relevant logs or screenshots

### Suggesting Features

Feature suggestions are welcome! Please:

1. Check existing issues and discussions first
2. Clearly describe the feature and its use case
3. Explain why this would be valuable to other users
4. Consider if you'd be willing to implement it

### Pull Requests

#### Getting Started

1. **Fork the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/HelpDesk.git
   cd HelpDesk
   ```

2. **Create a branch**
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

3. **Install dependencies**
   ```bash
   npm install
   cd react && npm install
   cd ../functions && npm install
   ```

4. **Set up your environment**
   - Copy `.env.example` files to `.env`
   - Configure with your own Firebase project for testing

#### Development Workflow

1. **Frontend Development**
   ```bash
   cd react
   npm run dev
   ```

2. **Backend Development**
   ```bash
   cd functions
   npm run serve
   ```

3. **Run Tests**
   ```bash
   # Frontend tests
   cd react && npm test

   # Backend tests
   cd functions && npm test

   # E2E tests
   cd react && npm run cypress
   ```

4. **Lint your code**
   ```bash
   npm run lint
   ```

#### Commit Guidelines

We follow conventional commits:

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

Examples:
```
feat: add webhook retry mechanism
fix: resolve ticket assignment race condition
docs: update Firebase setup instructions
```

#### Pull Request Process

1. Update documentation if needed
2. Add tests for new functionality
3. Ensure all tests pass
4. Update the CHANGELOG if applicable
5. Request review from maintainers

### Code Style

#### TypeScript/JavaScript

- Use TypeScript for new code
- Follow existing patterns in the codebase
- Use meaningful variable and function names
- Add comments for complex logic
- Avoid `any` types when possible

#### React Components

- Use functional components with hooks
- Keep components focused and small
- Use TypeScript interfaces for props
- Follow the existing file structure

#### Firebase Functions

- Keep functions focused on single responsibilities
- Handle errors gracefully
- Log appropriately (but avoid sensitive data)
- Use TypeScript

### Security

**IMPORTANT**: Never commit:

- API keys or secrets
- Service account files
- `.env` files with real values
- Personal data or credentials
- Database dumps or backups

If you accidentally commit sensitive data:

1. Do NOT push to the remote
2. Use `git reset` to undo the commit
3. Remove the sensitive data
4. If already pushed, contact maintainers immediately

### Testing

- Write unit tests for new functions
- Add integration tests for API endpoints
- Include E2E tests for critical user flows
- Aim for meaningful coverage, not 100%

### Documentation

- Update README if adding features
- Add JSDoc comments to functions
- Update relevant docs in `/docs`
- Include code examples where helpful

## Project Structure

```
HelpDesk/
├── react/                # Frontend React application
│   ├── src/
│   │   ├── components/   # Reusable components
│   │   ├── pages/        # Page components
│   │   ├── lib/          # Utilities and services
│   │   ├── context/      # React contexts
│   │   └── api/          # API integration
│   ├── cypress/          # E2E tests
│   └── public/           # Static assets
├── functions/            # Firebase Cloud Functions
│   ├── src/              # Function implementations
│   └── __tests__/        # Unit tests
├── scripts/              # Utility scripts
├── docs/                 # Documentation
└── firebase.json         # Firebase configuration
```

## Getting Help

- Check the [documentation](docs/)
- Search [existing issues](https://github.com/LarryAnglin/HelpDesk/issues)
- Open a new issue with your question
- Email: support@anglinai.com

## Recognition

Contributors will be recognized in:
- The project's README
- Release notes for significant contributions
- The contributors page on the documentation site

## License

By contributing, you agree that your contributions will be licensed under the same license as the project (MIT License).

---

Thank you for contributing to HelpDesk!
