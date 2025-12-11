import type { HelpTopic, HelpCategory, HelpSection } from '../types'

export const helpTopics: HelpTopic[] = [
  // Getting Started
  {
    id: 'welcome',
    title: 'Welcome to BashNota',
    description: 'Get started with BashNota basics',
    category: HelpCategory.GettingStarted,
    keywords: ['intro', 'welcome', 'start', 'begin'],
    content: `# Welcome to BashNota

BashNota is more than a second brain—it's a second brain cracked on code and AI. Combine rich text editing with executable code blocks, AI assistance, and seamless organization.

## Key Features

- **Rich Markdown Editor**: Write with TipTap, including headings, lists, tables, and more
- **Executable Code Blocks**: Run Python and JavaScript directly in your notes
- **AI Assistant**: Get help with writing, coding, and research
- **Jupyter Integration**: Connect to Jupyter servers for advanced code execution
- **Organizational Tools**: Tags, favorites, and powerful search
- **Dark/Light Themes**: Choose your preferred appearance

## Quick Start

1. **Create a Note**: Click the "New Nota" button or press Ctrl+N
2. **Write Content**: Use markdown formatting and the toolbar
3. **Add Code**: Insert executable code blocks from the block menu
4. **Get AI Help**: Open the AI assistant sidebar (Ctrl+Shift+A)
5. **Execute Code**: Connect to a Jupyter server to run code blocks

## Navigation

- **Left Sidebar**: Access your notes and favorites
- **Right Sidebar**: AI assistant and metadata
- **Bottom Panel**: Jupyter server and session management
- **Command Palette**: Press Ctrl+K for quick actions

Ready to dive deeper? Check out the guides for each feature!`
  },
  {
    id: 'first-note',
    title: 'Creating Your First Note',
    description: 'Learn how to create and organize notes',
    category: HelpCategory.GettingStarted,
    keywords: ['create', 'new', 'note', 'nota'],
    content: `# Creating Your First Note

## Create a New Note

There are multiple ways to create a new note (Nota):

1. **Click "New Nota"** in the left sidebar
2. **Press Ctrl+N** (keyboard shortcut)
3. **Use Command Palette**: Press Ctrl+K, type "new"

## Note Structure

Each note has:
- **Title**: Click the title area at the top to edit
- **Content**: The main editing area with rich formatting
- **Metadata**: Tags, dates, and other properties (right sidebar)

## Organizing Notes

### Favorites
- Click the star icon to add a note to favorites
- Access favorites from the left sidebar

### Tags
- Add tags in the metadata sidebar
- Use tags to organize and find related notes

### Search
- Use the search bar in the left sidebar
- Search by title, content, or tags

## Tips

- Use headings (# ## ###) to structure your content
- Create links between notes for a knowledge graph
- Add code blocks for executable snippets
- Use the AI assistant to help with writing`
  },

  // Editor
  {
    id: 'editor-basics',
    title: 'Rich Text Editor Basics',
    description: 'Learn markdown formatting and text editing',
    category: HelpCategory.Editor,
    keywords: ['editor', 'markdown', 'format', 'write'],
    content: `# Rich Text Editor Basics

BashNota uses a powerful TipTap editor that supports markdown and rich formatting.

## Text Formatting

### Basic Formatting
- **Bold**: Wrap text with \`**\` or press Ctrl+B
- *Italic*: Wrap text with \`*\` or press Ctrl+I
- \`Code\`: Wrap text with backticks
- ~~Strikethrough~~: Wrap text with \`~~\`

### Headings
Use # symbols for headings:
\`\`\`
# Heading 1
## Heading 2
### Heading 3
\`\`\`

### Lists

**Unordered Lists**:
\`\`\`
- Item 1
- Item 2
  - Nested item
\`\`\`

**Ordered Lists**:
\`\`\`
1. First item
2. Second item
3. Third item
\`\`\`

**Task Lists**:
\`\`\`
- [ ] Todo item
- [x] Completed item
\`\`\`

### Links and Images
- Links: \`[Text](https://url.com)\`
- Images: \`![Alt text](image-url.jpg)\`

### Blockquotes
Start a line with \`>\`:
\`\`\`
> This is a blockquote
> It can span multiple lines
\`\`\`

### Code Blocks
Use triple backticks:
\`\`\`python
def hello():
    print("Hello, World!")
\`\`\`

### Tables
Create tables with pipes:
\`\`\`
| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |
\`\`\`

## Keyboard Shortcuts

- **Ctrl+B**: Bold
- **Ctrl+I**: Italic
- **Ctrl+K**: Insert link
- **Ctrl+Z**: Undo
- **Ctrl+Y**: Redo
- **Ctrl+Shift+8**: Bullet list
- **Ctrl+Shift+7**: Ordered list`
  },
  {
    id: 'special-blocks',
    title: 'Special Content Blocks',
    description: 'Use advanced blocks for code, math, and more',
    category: HelpCategory.Editor,
    keywords: ['blocks', 'code', 'math', 'latex', 'mermaid'],
    content: `# Special Content Blocks

BashNota supports various special content blocks beyond regular text.

## Executable Code Blocks

Run Python and JavaScript code directly in your notes.

**To add a code block**:
1. Type \`/code\` and press Enter
2. Or use the block menu (click + button)
3. Select your language (Python or JavaScript)
4. Write your code
5. Click "Run" to execute

**Features**:
- Syntax highlighting
- Output display
- Error handling
- Variable persistence between executions

## Math Blocks (LaTeX)

Write mathematical equations using LaTeX syntax.

**Inline math**: Wrap with \`$\`:
\`\`\`
The formula $E = mc^2$ is famous.
\`\`\`

**Block math**: Use \`$$\`:
\`\`\`
$$
\\int_{a}^{b} f(x) dx
$$
\`\`\`

## Mermaid Diagrams

Create flowcharts and diagrams with Mermaid syntax.

\`\`\`mermaid
graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Action 1]
    B -->|No| D[Action 2]
    C --> E[End]
    D --> E
\`\`\`

## Tables

Create interactive tables with sorting and filtering:
1. Type \`/table\` to insert a table
2. Add rows and columns
3. Format cells with markdown
4. Use different layouts (grid, list, calendar)

## Citation Blocks

Manage references and citations:
1. Insert citation block
2. Add bibliographic information
3. Use BibTeX format support
4. Generate formatted references

## Sub-Notas

Embed other notes within a note:
1. Type \`/subnota\` or use block menu
2. Select the note to embed
3. The embedded note updates automatically

## Tips

- Use \`/\` to open the block menu quickly
- Most blocks support markdown formatting
- Code blocks can access Jupyter kernels
- Press Tab to move between cells in tables`
  },

  // Code Execution
  {
    id: 'jupyter-setup',
    title: 'Jupyter Server Setup',
    description: 'Connect to Jupyter for code execution',
    category: HelpCategory.CodeExecution,
    keywords: ['jupyter', 'kernel', 'server', 'setup', 'connect'],
    content: `# Jupyter Server Setup

Connect BashNota to a Jupyter server to execute code in your notes.

## What is Jupyter?

Jupyter provides kernels for running code in various languages. BashNota connects to Jupyter servers to execute code blocks.

## Connection Methods

### 1. Local Jupyter Server

**Start a local server**:
\`\`\`bash
# Install Jupyter
pip install jupyter

# Start the server
jupyter notebook --no-browser --port=8888
\`\`\`

**Connect in BashNota**:
1. Open bottom panel (Ctrl+J)
2. Click "Add Server"
3. Enter URL: \`http://localhost:8888\`
4. Add the token from the Jupyter console

### 2. Remote Jupyter Server

If you have a remote Jupyter server:
1. Ensure it's accessible via URL
2. Add the full URL in BashNota
3. Provide authentication token if required

### 3. JupyterLab

Works the same as Jupyter Notebook:
\`\`\`bash
jupyter lab --no-browser --port=8888
\`\`\`

## Managing Servers

### Server Panel
- **View servers**: Open bottom panel (Ctrl+J)
- **Add server**: Click "+" button
- **Remove server**: Click server, then delete
- **Switch server**: Select from the list

### Kernels
- **View kernels**: Each server shows available kernels
- **Start kernel**: Click "Start" on a kernel
- **Stop kernel**: Click "Stop" on running kernel
- **Restart kernel**: Stop and start again

## Using Kernels

### Assign to Code Block
1. Create a code block
2. Click the kernel dropdown
3. Select an available kernel
4. Code will execute on that kernel

### Session Management
- Each note can have its own session
- Variables persist within a session
- Restart kernel to clear state

## Troubleshooting

### Connection Issues
- Verify Jupyter is running
- Check the URL and port
- Ensure token is correct
- Check firewall settings

### Execution Issues
- Verify kernel is started
- Check code block is assigned to kernel
- Look at error messages in output
- Restart kernel if needed

## Settings

Configure Jupyter settings in Settings > Integrations > Jupyter:
- Default server
- Auto-start kernels
- Execution timeout
- Output display options`
  },
  {
    id: 'code-execution',
    title: 'Running Code in Notes',
    description: 'Execute code blocks and view results',
    category: HelpCategory.CodeExecution,
    keywords: ['execute', 'run', 'code', 'python', 'javascript'],
    content: `# Running Code in Notes

Execute Python and JavaScript code directly in your notes and see results inline.

## Creating Code Blocks

### Quick Insert
1. Type \`/code\` in the editor
2. Press Enter
3. Select language (Python or JavaScript)

### From Menu
1. Click the "+" block menu button
2. Select "Code Block"
3. Choose language

## Writing Code

### Syntax Highlighting
- Code is highlighted automatically
- Supports Python and JavaScript
- Multiple color themes available

### Code Editing
- Full IDE-like editing experience
- Line numbers
- Auto-indentation
- Bracket matching

## Executing Code

### Single Block Execution
1. Click the "Run" button on the code block
2. Or press Shift+Enter while cursor is in block
3. Output appears below the code

### Run All
- Use "Run All" button in toolbar
- Executes all code blocks in order
- Useful for reproducible documents

## Output Display

### Text Output
Standard output and print statements:
\`\`\`python
print("Hello, World!")
# Output: Hello, World!
\`\`\`

### Variables
Variables are displayed automatically:
\`\`\`python
x = 42
x  # Shows: 42
\`\`\`

### Plots and Visualizations
Matplotlib plots render inline:
\`\`\`python
import matplotlib.pyplot as plt
plt.plot([1, 2, 3], [1, 4, 9])
plt.show()
\`\`\`

### DataFrames
Pandas DataFrames show as tables:
\`\`\`python
import pandas as pd
df = pd.DataFrame({'A': [1, 2], 'B': [3, 4]})
df
\`\`\`

### Errors
Errors display with stack traces:
- Syntax errors highlighted
- Runtime errors with line numbers
- Click to see full traceback

## Advanced Features

### Variable Persistence
Variables persist between executions in the same session:
\`\`\`python
# Block 1
x = 10

# Block 2 (later in note)
y = x + 5  # x is still available
\`\`\`

### Kernel Selection
- Click kernel dropdown in code block
- Select from available Jupyter kernels
- Different blocks can use different kernels

### AI Code Assistance
- Right-click in code block
- Select AI actions like "Fix Code" or "Explain"
- Get instant AI help with your code

## Best Practices

1. **One concept per block**: Keep code blocks focused
2. **Comment your code**: Explain complex logic
3. **Name variables clearly**: Makes code self-documenting
4. **Handle errors**: Use try-except for robust code
5. **Clear outputs**: Restart kernel when needed

## Keyboard Shortcuts

- **Shift+Enter**: Execute current block
- **Ctrl+S**: Save note
- **Ctrl+/**: Toggle comment
- **Tab**: Auto-complete (if supported by kernel)`
  },

  // AI Assistant
  {
    id: 'ai-assistant',
    title: 'AI Assistant Guide',
    description: 'Use AI to help with writing and coding',
    category: HelpCategory.AI,
    keywords: ['ai', 'assistant', 'chat', 'help', 'gemini', 'ollama'],
    content: `# AI Assistant Guide

BashNota includes a powerful AI assistant to help with writing, coding, and research.

## Opening the AI Assistant

- **Click** the AI icon in the right sidebar
- **Press** Ctrl+Shift+A
- **Use** Command Palette (Ctrl+K) and search "AI"

## AI Providers

BashNota supports multiple AI providers:

### Gemini (Google)
- High-quality responses
- Fast processing
- Multimodal (text + images)
- Requires API key

### Ollama (Local)
- Runs on your computer
- Privacy-focused
- No API key needed
- Requires Ollama installation

### WebLLM (Browser)
- Runs in browser
- No server required
- Privacy-focused
- Limited model selection

### Configure Provider
1. Go to Settings > AI
2. Select your preferred provider
3. Add API key if required
4. Choose model (e.g., gemini-pro, llama2)

## Using the Chat

### Basic Chat
1. Type your question in the input box
2. Press Enter or click Send
3. View the AI response
4. Continue the conversation

### Context-Aware Help
The AI knows about:
- Your current note content
- Code you're writing
- Selected text

### Multimodal Input
- Drag and drop images
- Paste screenshots
- AI can analyze and describe images

## Conversation Management

### New Conversation
- Click "New Chat" to start fresh
- Each conversation has independent context

### Conversation History
- Previous chats are saved
- Click on past conversations to view
- Delete old conversations if needed

### Search Conversations
- Search through your AI chat history
- Find previous questions and answers

## AI-Powered Actions

### Text Actions
Right-click any text to access AI actions:
- **Rewrite**: Improve the text
- **Fix Grammar**: Correct errors
- **Make Concise**: Shorten text
- **Expand**: Add more detail
- **Translate**: Convert to another language
- **Summarize**: Create a summary

### Code Actions
Right-click in code blocks:
- **Explain Code**: Get an explanation
- **Fix Code**: Debug and repair
- **Optimize**: Improve performance
- **Add Comments**: Document code
- **Write Tests**: Generate test cases

### Custom Actions
Create your own AI actions:
1. Go to Settings > AI > AI Actions
2. Click "Add Custom Action"
3. Name your action
4. Write the prompt template
5. Select icon and color
6. Save and use from context menu

## Tips for Better Results

### Be Specific
❌ "Help with code"
✅ "Explain how this function handles errors"

### Provide Context
❌ "Fix this"
✅ "This Python function should sort names alphabetically, but it's not working"

### Iterate
- Start with a general question
- Ask follow-up questions
- Refine the AI's suggestions

### Use Selection
- Select specific text before using AI actions
- AI focuses on selected content
- More precise results

## Settings

Configure AI behavior in Settings > AI:
- **Default Provider**: Choose your AI provider
- **Model**: Select specific model
- **Temperature**: Control creativity (0-1)
- **Max Tokens**: Limit response length
- **System Prompt**: Customize AI behavior
- **Enable Actions**: Toggle AI context menu actions

## Privacy

- **Gemini**: Data sent to Google servers
- **Ollama**: Runs locally, data stays on device
- **WebLLM**: Runs in browser, no server communication
- Review provider privacy policies before use`
  },

  // Notes Management
  {
    id: 'note-organization',
    title: 'Organizing Your Notes',
    description: 'Manage, search, and organize your knowledge',
    category: HelpCategory.Notes,
    keywords: ['organize', 'search', 'tags', 'favorites'],
    content: `# Organizing Your Notes

Keep your knowledge organized with BashNota's organizational features.

## Sidebar Navigation

### Notes List
- All your notes in one place
- Sort by: Date modified, Date created, Title
- Filter by tags and favorites

### Favorites
- Star icon to add to favorites
- Quick access to important notes
- Separate favorites section

## Search

### Quick Search
- Search bar in left sidebar
- Searches titles and content
- Real-time results

### Advanced Search
- Use Command Palette (Ctrl+K)
- Search by:
  - Title
  - Content
  - Tags
  - Date range

### Search Operators
- Exact phrase: "machine learning"
- Exclude: -term
- Tag filter: tag:python

## Tags

### Adding Tags
1. Open note metadata (right sidebar)
2. Click "Add Tag"
3. Type tag name
4. Press Enter

### Tag Organization
- Use hierarchical tags: \`project/ml/model\`
- Keep tags consistent
- Don't over-tag (3-5 tags per note)

### Tag Filtering
- Click tag to see all notes with that tag
- Combine multiple tags
- Use tag cloud for overview

## Links Between Notes

### Creating Links
- Use \`[[Note Title]]\` syntax
- Or insert link block
- Creates bidirectional connection

### Backlinks
- See all notes linking to current note
- View in metadata sidebar
- Build knowledge graph

## Batch Operations

### Select Multiple Notes
- Checkbox selection in sidebar
- Shift+Click for range
- Ctrl+Click for individual

### Batch Actions
- Add tags to multiple notes
- Move to folder (if folders enabled)
- Delete multiple notes
- Export selection

## Publishing Notes

### Share Notes
1. Click share icon
2. Enable public access
3. Copy public URL
4. Share with anyone

### Public Profile
- Your published notes
- Custom username: @yourusername
- Profile page with all public notes

### Privacy Settings
- Make note public or private
- Change anytime
- Manage from metadata sidebar

## Archiving

### Archive Notes
- Hide notes from main list
- Keep for reference
- Still searchable

### Restore Archived
- View archived notes
- Restore to active
- Or permanently delete

## Best Practices

### Naming
- Use descriptive titles
- Include key concepts
- Avoid generic names like "Notes 1"

### Structure
- One main topic per note
- Use headings for sections
- Link related notes

### Regular Maintenance
- Review old notes
- Update outdated information
- Merge similar notes
- Archive unused notes

### Tagging Strategy
- Create tag taxonomy upfront
- Use consistent naming
- Don't duplicate with titles
- Review tags periodically`
  },

  // Keyboard Shortcuts
  {
    id: 'keyboard-shortcuts',
    title: 'Keyboard Shortcuts',
    description: 'Speed up your workflow with shortcuts',
    category: HelpCategory.Shortcuts,
    keywords: ['shortcuts', 'keyboard', 'hotkeys', 'keys'],
    content: `# Keyboard Shortcuts

Master these shortcuts to work faster in BashNota.

## Global Shortcuts

### Navigation
- **Ctrl+K**: Command Palette
- **Ctrl+B**: Toggle left sidebar (notes list)
- **Ctrl+Shift+A**: Toggle AI assistant
- **Ctrl+J**: Toggle Jupyter panel
- **Ctrl+,**: Open Settings
- **F1**: Open Help

### File Operations
- **Ctrl+N**: New note
- **Ctrl+S**: Save current note
- **Ctrl+P**: Print or export

### Window
- **Ctrl+\\**: Toggle split view
- **Ctrl+W**: Close current pane
- **Ctrl+Tab**: Switch between panes

## Editor Shortcuts

### Text Formatting
- **Ctrl+B**: Bold
- **Ctrl+I**: Italic
- **Ctrl+U**: Underline
- **Ctrl+Shift+X**: Strikethrough
- **Ctrl+\`**: Inline code

### Paragraphs
- **Ctrl+Alt+1**: Heading 1
- **Ctrl+Alt+2**: Heading 2
- **Ctrl+Alt+3**: Heading 3
- **Ctrl+Alt+0**: Normal paragraph

### Lists
- **Ctrl+Shift+8**: Bullet list
- **Ctrl+Shift+7**: Ordered list
- **Ctrl+Shift+9**: Task list

### Links and Media
- **Ctrl+K**: Insert link
- **Ctrl+Shift+I**: Insert image

### Editing
- **Ctrl+Z**: Undo
- **Ctrl+Y** or **Ctrl+Shift+Z**: Redo
- **Ctrl+A**: Select all
- **Ctrl+C**: Copy
- **Ctrl+X**: Cut
- **Ctrl+V**: Paste
- **Ctrl+D**: Duplicate line
- **Ctrl+/**: Toggle comment (in code)

## Code Block Shortcuts

### Execution
- **Shift+Enter**: Run current code block
- **Ctrl+Enter**: Run and move to next
- **Ctrl+Shift+Enter**: Run all blocks

### Code Editing
- **Tab**: Indent or autocomplete
- **Shift+Tab**: Unindent
- **Ctrl+/**: Toggle line comment
- **Ctrl+]**: Increase indent
- **Ctrl+[**: Decrease indent

## Selection Shortcuts

### Text Selection
- **Ctrl+A**: Select all in current block
- **Shift+Arrow**: Extend selection
- **Ctrl+Shift+Arrow**: Select word by word
- **Ctrl+D**: Select next occurrence

### Block Selection
- **Ctrl+Shift+A**: Select current block
- **Ctrl+Shift+Up/Down**: Move block up/down

## Search and Replace

- **Ctrl+F**: Find in current note
- **Ctrl+H**: Find and replace
- **F3** or **Ctrl+G**: Find next
- **Shift+F3** or **Ctrl+Shift+G**: Find previous
- **Ctrl+Shift+F**: Find in all notes

## Command Palette

Press **Ctrl+K** and type:
- "new" - Create new note
- "search" - Search notes
- "ai" - Open AI assistant
- "jupyter" - Manage Jupyter
- "settings" - Open settings
- "help" - Open help
- "export" - Export current note
- "theme" - Change theme

## AI Shortcuts

- **Ctrl+Shift+A**: Open AI assistant
- **Ctrl+Space**: AI autocomplete
- **Ctrl+Shift+R**: Rewrite selected text
- **Ctrl+Shift+E**: Explain selected code

## Customizing Shortcuts

Go to Settings > Keyboard Shortcuts to:
- View all shortcuts
- Customize existing shortcuts
- Create new shortcuts
- Reset to defaults
- Export/import shortcut configurations

## Tips

1. **Learn gradually**: Focus on shortcuts you use most
2. **Print reference**: Print this page for quick reference
3. **Practice**: Use shortcuts instead of mouse
4. **Muscle memory**: Repetition makes shortcuts natural
5. **Discover**: Hover over buttons to see shortcuts`
  },

  // Settings
  {
    id: 'settings-guide',
    title: 'Settings and Preferences',
    description: 'Customize BashNota to your liking',
    category: HelpCategory.Settings,
    keywords: ['settings', 'preferences', 'configuration', 'customize'],
    content: `# Settings and Preferences

Customize BashNota to match your workflow and preferences.

## Accessing Settings

- Click the gear icon in the menubar
- Press **Ctrl+,**
- Use Command Palette (Ctrl+K) and search "settings"

## Settings Categories

### Editor Settings

**Unified Editor**
- Default font family
- Font size (12-24px)
- Line height
- Tab size
- Auto-save interval

**Code Editing**
- Enable syntax highlighting
- Show line numbers
- Enable auto-completion
- Bracket matching
- Code folding

**Markdown**
- Enable markdown shortcuts
- Auto-pair brackets
- Smart quotes
- Auto-format lists

### Appearance Settings

**Theme**
- Light mode
- Dark mode
- Auto (system)
- Custom theme colors

**Layout**
- Compact/comfortable spacing
- Sidebar width
- Panel positions
- Font scaling

**Display**
- Show status bar
- Show minimap
- Highlight active line
- Show indent guides

### AI Settings

**Provider Configuration**
- Select AI provider (Gemini, Ollama, WebLLM)
- API key management
- Model selection
- Base URL (for custom endpoints)

**Behavior**
- Temperature (creativity level)
- Max tokens (response length)
- Stream responses
- Enable AI actions
- Custom system prompt

**AI Actions**
- Enable/disable actions
- Reorder actions
- Create custom actions
- Configure action prompts
- Set action icons/colors

### Integration Settings

**Jupyter**
- Default server URL
- Auto-connect on startup
- Kernel timeout settings
- Output display preferences
- Execution history limit

**Import/Export**
- Default export format
- Include metadata
- Code block handling
- Image handling

### Keyboard Shortcuts

**View Shortcuts**
- Browse all shortcuts
- Search shortcuts
- See conflicts

**Customize**
- Click shortcut to edit
- Record new key combination
- Reset individual shortcuts
- Reset all to defaults

**Import/Export**
- Export configuration
- Import from file
- Share with team

### Advanced Settings

**Storage**
- Storage location
- Backup settings
- Auto-sync
- Cache management

**Performance**
- Debounce delay
- Lazy loading
- Virtual scrolling
- Maximum file size

**Developer**
- Enable debug mode
- Show performance metrics
- Feature flags
- Console logging

**Privacy**
- Analytics opt-in/out
- Error reporting
- Usage statistics
- Data collection

## Profiles

### Create Profile
- Save current settings as profile
- Name your profile
- Switch between profiles

### Use Cases
- Work profile
- Personal profile
- Presentation mode
- Minimal distraction mode

## Import/Export Settings

### Export Settings
1. Go to Settings > Advanced
2. Click "Export Settings"
3. Save JSON file
4. Share or backup

### Import Settings
1. Go to Settings > Advanced
2. Click "Import Settings"
3. Select JSON file
4. Review and confirm

## Reset Settings

### Reset Individual Category
- Click "Reset" button in category
- Confirms before resetting
- Cannot undo

### Reset All Settings
- Settings > Advanced > Reset All
- Removes all customizations
- Restarts with defaults

## Sync Settings

### Cloud Sync (if enabled)
- Settings sync across devices
- Sign in required
- Automatic sync
- Manual sync trigger

### Local Backup
- Settings backed up locally
- Restore from backup
- Backup before major changes

## Tips

1. **Start with defaults**: Change gradually
2. **Experiment**: Settings are reversible
3. **Document**: Note what works for you
4. **Export**: Backup before major changes
5. **Share**: Help teammates with configurations`
  }
]

export const helpSections: HelpSection[] = [
  {
    category: HelpCategory.GettingStarted,
    title: 'Getting Started',
    description: 'New to BashNota? Start here!',
    topics: helpTopics.filter(t => t.category === HelpCategory.GettingStarted)
  },
  {
    category: HelpCategory.Editor,
    title: 'Editor',
    description: 'Learn about the rich text editor and formatting',
    topics: helpTopics.filter(t => t.category === HelpCategory.Editor)
  },
  {
    category: HelpCategory.CodeExecution,
    title: 'Code Execution',
    description: 'Run code in your notes with Jupyter',
    topics: helpTopics.filter(t => t.category === HelpCategory.CodeExecution)
  },
  {
    category: HelpCategory.AI,
    title: 'AI Assistant',
    description: 'Get help from AI assistants',
    topics: helpTopics.filter(t => t.category === HelpCategory.AI)
  },
  {
    category: HelpCategory.Notes,
    title: 'Notes Management',
    description: 'Organize and manage your notes',
    topics: helpTopics.filter(t => t.category === HelpCategory.Notes)
  },
  {
    category: HelpCategory.Shortcuts,
    title: 'Keyboard Shortcuts',
    description: 'Work faster with keyboard shortcuts',
    topics: helpTopics.filter(t => t.category === HelpCategory.Shortcuts)
  },
  {
    category: HelpCategory.Settings,
    title: 'Settings',
    description: 'Customize your BashNota experience',
    topics: helpTopics.filter(t => t.category === HelpCategory.Settings)
  }
]

export function searchHelpTopics(query: string): HelpTopic[] {
  const lowerQuery = query.toLowerCase()
  return helpTopics.filter(topic => {
    return (
      topic.title.toLowerCase().includes(lowerQuery) ||
      topic.description.toLowerCase().includes(lowerQuery) ||
      topic.content.toLowerCase().includes(lowerQuery) ||
      topic.keywords?.some(k => k.toLowerCase().includes(lowerQuery))
    )
  })
}

export function getTopicById(id: string): HelpTopic | undefined {
  return helpTopics.find(topic => topic.id === id)
}

export function getTopicsByCategory(category: HelpCategory): HelpTopic[] {
  return helpTopics.filter(topic => topic.category === category)
}
