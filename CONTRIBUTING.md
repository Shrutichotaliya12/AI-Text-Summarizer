# Contributing to AI Text Summarizer Pro

Thank you for your interest in contributing! 🎉

## Getting Started

1. **Fork** the repository
2. **Clone** your fork: `git clone https://github.com/yourusername/ai-text-summarizer-pro.git`
3. **Create a branch**: `git checkout -b feature/your-feature-name`
4. **Make changes** following the guidelines below
5. **Test** your changes
6. **Submit a Pull Request**

## Development Setup

See [DEPLOYMENT.md](DEPLOYMENT.md) for the local development setup.

## Code Style

### Backend (Python)
- Follow PEP 8
- Use type hints on all functions
- Keep router files focused — one feature per file
- All new endpoints must have Pydantic schema validation
- Log meaningful events using `from app.infrastructure.logger import logger`

### Frontend (TypeScript/React)
- Use functional components with hooks only
- Use Zustand for global state, local `useState` for component state
- Use the existing CSS design system (don't introduce inline styles)
- Reuse existing components from `src/components/` before creating new ones

## Commit Messages

Use the [Conventional Commits](https://www.conventionalcommits.org/) format:

```
feat: add document export to PDF
fix: resolve OTP expiry timezone bug
docs: update API documentation
refactor: simplify notification store
test: add auth endpoint coverage
```

## Pull Request Process

1. Ensure `npm run build` passes with no errors
2. Ensure `pytest` passes (or add tests for new behavior)
3. Update `CHANGELOG.md` under the `[Unreleased]` section
4. Update `API_DOCS.md` if you add new endpoints
5. Request review from at least one maintainer

## Reporting Bugs

Use [GitHub Issues](https://github.com/yourusername/ai-text-summarizer-pro/issues) with:
- Clear description of the bug
- Steps to reproduce
- Expected vs. actual behavior
- Browser/OS/Python version

## Feature Requests

Open an issue with the `enhancement` label describing:
- The use case
- Proposed implementation approach
- Any breaking changes

## License

By contributing, you agree your contributions will be licensed under the [MIT License](LICENSE).
