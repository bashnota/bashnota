# BashNota

<div align="center">
  <img src="src/assets/logo.svg" alt="BashNota Logo" width="120" />
  <h3>More Than a Second Brain, It's a Second Brain Cracked on Code and AI</h3>
  
  [![Issues](https://img.shields.io/github/issues/bashnota/bashnota)](https://github.com/bashnota/bashnota/issues)
  [![Pull Requests](https://img.shields.io/github/issues-pr/bashnota/bashnota)](https://github.com/bashnota/bashnota/pulls)
  [![License](https://img.shields.io/github/license/bashnota/bashnota)](LICENSE)
  [![Deploy](https://img.shields.io/badge/deploy-live-brightgreen)](https://offline.bashnota.com)
</div>

## Overview

BashNota combines rich text editing with executable code blocks, AI assistance, and seamless organization. Built for developers who need more than just notes.

**Key Features:**
- 📝 Rich markdown editing with TipTap
- 💻 Execute Python/JavaScript code blocks
- 🤖 AI assistant integration
- 📊 LaTeX math & Mermaid diagrams
- 🔗 Jupyter notebook integration
- 🌙 Dark/light themes

## Quick Start

### Prerequisites
- Node.js 18+
- Firebase account

### Development
```bash
git clone https://github.com/bashnota/bashnota.git
cd bashnota
npm install
cp .env.example .env  # Configure your environment
npm run dev
```

### Build & Deploy
```bash
# Build for production
npm run build

# Preview production build
npm run preview

# Deploy to Firebase
npm run deploy
```

### Firebase Functions
```bash
cd functions
npm install
npm run build
npm run deploy
```

## Tech Stack

- **Frontend**: Vue 3 + TypeScript + Vite
- **Editor**: TipTap (ProseMirror)
- **UI**: Tailwind CSS + Radix Vue + Shadcn
- **Backend**: Firebase (Auth, Firestore, Functions)
- **Code Execution**: Jupyter protocol
- **AI**: OpenAI, Gemini, Claude

## Project Structure

```
src/
├── features/           # Feature modules
│   ├── ai/            # AI assistant
│   ├── editor/        # Note editor
│   ├── nota/          # Note management
│   └── jupyter/       # Jupyter integration
├── components/        # Shared components
├── ui/               # UI components
└── stores/           # State management
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

## Acknowledgments

Built with these amazing open-source projects:

- [Vue.js](https://vuejs.org/) - Progressive JavaScript framework
- [TipTap](https://tiptap.dev/) - Headless rich-text editor
- [ProseMirror](https://prosemirror.net/) - Rich text editing toolkit
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [Radix Vue](https://www.radix-vue.com/) - Unstyled, accessible components
- [Firebase](https://firebase.google.com/) - Backend platform
- [Vite](https://vitejs.dev/) - Build tool

## License

MIT License - see [LICENSE](LICENSE) file for details.

---

<div align="center">
  <a href="https://offline.bashnota.com">🚀 Try BashNota</a> • 
  <a href="https://github.com/bashnota/bashnota/issues">Report Bug</a> • 
  <a href="https://github.com/bashnota/bashnota/discussions">Discussions</a>
</div>
