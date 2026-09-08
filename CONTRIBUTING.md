# Contributing to Bashnota

First off, thank you for considering contributing to Bashnota! It's people like you that make Bashnota such a great tool. We welcome any and all contributions, from bug reports to new features.

To ensure a smooth and collaborative process, please read through this guide before you start.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
  - [Reporting Bugs](#reporting-bugs)
  - [Suggesting Enhancements](#suggesting-enhancements)
  - [Your First Code Contribution](#your-first-code-contribution)
  - [Pull Requests](#pull-requests)
- [Development Setup](#development-setup)
- [Styleguides](#styleguides)
  - [Git Commit Messages](#git-commit-messages)
  - [Code Style](#code-style)

## Code of Conduct

This project and everyone participating in it is governed by the [BashNota Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold it.

## How Can I Contribute?

### Reporting Bugs

If you find a bug, please make sure it hasn't been reported yet by searching the [GitHub Issues](https://github.com/mlnomadpy/bashnota/issues).

If you can't find an open issue addressing the problem, [open a new one](https://github.com/mlnomadpy/bashnota/issues/new). Be sure to include a **title and clear description**, as much relevant information as possible, and a **code sample or an executable test case** demonstrating the expected behavior that is not occurring. Suspected vulnerabilities are the exception: follow [SECURITY.md](SECURITY.md) and do not disclose sensitive details in a public issue.

### Suggesting Enhancements

If you have an idea for an enhancement, please create an issue with a clear title and description. Explain why this enhancement would be useful and provide as much detail as possible.

### Your First Code Contribution

Unsure where to begin contributing to Bashnota? You can start by looking through `good first issue` and `help wanted` issues:

- [Good first issues](https://github.com/mlnomadpy/bashnota/labels/good%20first%20issue) - issues which should only require a few lines of code, and a test or two.
- [Help wanted issues](https://github.com/mlnomadpy/bashnota/labels/help%20wanted) - issues which should be a bit more involved than `good first issues`.

### Pull Requests

We love pull requests! Here's a quick guide:

1.  **Fork the repo** and create your branch from `master`.
2.  If you've added code that should be tested, add tests.
3.  If you've changed APIs, update the documentation.
4.  Ensure the test suite passes.
5.  Make sure your code lints.
6.  Issue that pull request!

Do not squash or rewrite other contributors' authentic history. Preserve merge
commits, author identities, dates, tags, relevant branches, and automated-agent
attribution when importing or migrating work.

## Development Setup

Ready to contribute code? Here's how to set up Bashnota for local development.

1.  **Fork** the repository on GitHub.
2.  **Clone** your fork locally:
    ```bash
    git clone https://github.com/your-username/bashnota.git
    ```
3.  **Navigate** to the project directory:
    ```bash
    cd bashnota
    ```
4.  **Install the locked root dependencies** (there is no separate Functions package):
    ```bash
    npm ci
    ```
5.  **Create a local browser-safe environment**:
    ```bash
    cp .env.example .env
    ```
    Never put a service-role key, database password, AI key, or Jupyter token in
    a `VITE_*` variable. See [docs/development.md](docs/development.md).
6.  **Start the local Supabase services** (Docker required):
    ```bash
    npm run supabase:start
    npm run supabase:reset
    ```
7.  **Run the development server**:
    ```bash
    npm run dev
    ```
    This will start the frontend application. You should be able to access it at `http://localhost:5173` (or another port if 5173 is busy).

Now you're ready to make your changes!

For executable-code changes, also start the loopback-only Jupyter container and
run `npm run test:jupyter-local` as documented in [README.md](README.md). The
retired Firebase runtime/emulator must not be added back.

## Provenance and generated code

By submitting a contribution, you represent that you have the right to license
it under the project's AGPL-3.0-only license. Identify third-party sources and
their licenses in the pull request and update `NOTICE` or fixture provenance
when applicable. Do not submit customer data, private notebook content, secrets,
or license-incompatible material.

Generated or agent-assisted changes are welcome only when a human or accountable
automation owner reviews the complete diff, runs relevant tests, records the
tool/agent identity in commit or PR metadata, and accepts responsibility for
license and security review. Never replace the author of a human contribution
with an agent identity, or remove existing bot/agent attribution.

Fixtures must be synthetic, minimal, privacy-reviewed, and entered in
`docs/provenance/fixtures.json`. Changes to contributor aliases or rights status
belong in `docs/provenance/contributors.json`; do not rewrite old commits to
normalize them.

## Styleguides

### Git Commit Messages

We use [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) for our commit messages. This allows for automated changelog generation and helps keep the commit history clean and readable.

A commit message should be structured as follows:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

Example: `feat(editor): add new youtube block extension`

### Code Style

We use Prettier and ESLint to maintain a consistent code style. Please make sure to run the linter before submitting a pull request.

-   `npm run lint` to check for linting errors.
-   `npm run format` to automatically format your code.
-   `npm run release:check` before proposing a release candidate.

By following these guidelines, you'll help us keep the project maintainable and easy to contribute to. Thank you again for your interest in Bashnota!
