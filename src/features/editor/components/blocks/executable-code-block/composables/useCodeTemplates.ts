import { ref, computed } from 'vue'

export interface CodeTemplate {
  id: string
  name: string
  description: string
  code: string
  language: string
  category: string
  tags: string[]
  variables?: TemplateVariable[]
}

export interface TemplateVariable {
  name: string
  description: string
  defaultValue: string
  type: 'string' | 'number' | 'boolean'
}

export interface TemplateCategory {
  id: string
  name: string
  description: string
  icon?: string
}

export function useCodeTemplates(language: string) {
  const selectedTemplate = ref<CodeTemplate | null>(null)
  const searchQuery = ref('')
  const selectedCategory = ref<string>('all')

  // Built-in templates
  const builtInTemplates: CodeTemplate[] = [
    // Python templates
    {
      id: 'python-hello-world',
      name: 'Hello World',
      description: 'Basic Python hello world example',
      code: 'print("Hello, World!")',
      language: 'python',
      category: 'basics',
      tags: ['beginner', 'print']
    },
    {
      id: 'python-data-analysis',
      name: 'Data Analysis Setup',
      description: 'Common imports for data analysis',
      code: `import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns

# Load your data
# df = pd.read_csv('your_file.csv')

# Basic info
# print(df.info())
# print(df.describe())`,
      language: 'python',
      category: 'data-science',
      tags: ['pandas', 'numpy', 'matplotlib', 'data-analysis']
    },
    {
      id: 'python-web-scraping',
      name: 'Web Scraping',
      description: 'Basic web scraping with requests and BeautifulSoup',
      code: `import requests
from bs4 import BeautifulSoup

url = "{{url}}"
response = requests.get(url)
soup = BeautifulSoup(response.content, 'html.parser')

# Extract data
# title = soup.find('title').text
# print(title)`,
      language: 'python',
      category: 'web',
      tags: ['requests', 'beautifulsoup', 'scraping'],
      variables: [
        {
          name: 'url',
          description: 'URL to scrape',
          defaultValue: 'https://example.com',
          type: 'string'
        }
      ]
    },
    {
      id: 'python-api-request',
      name: 'API Request',
      description: 'Make HTTP requests to APIs',
      code: `import requests
import json

# GET request
response = requests.get('{{api_url}}')
if response.status_code == 200:
    data = response.json()
    print(json.dumps(data, indent=2))
else:
    print(f"Error: {response.status_code}")`,
      language: 'python',
      category: 'web',
      tags: ['api', 'requests', 'json'],
      variables: [
        {
          name: 'api_url',
          description: 'API endpoint URL',
          defaultValue: 'https://api.example.com/data',
          type: 'string'
        }
      ]
    },
    {
      id: 'python-file-operations',
      name: 'File Operations',
      description: 'Read and write files',
      code: `# Read file
with open('{{filename}}', 'r') as file:
    content = file.read()
    print(content)

# Write file
data = "Hello, World!"
with open('output.txt', 'w') as file:
    file.write(data)`,
      language: 'python',
      category: 'file-io',
      tags: ['file', 'io', 'read', 'write'],
      variables: [
        {
          name: 'filename',
          description: 'File to read',
          defaultValue: 'input.txt',
          type: 'string'
        }
      ]
    },
    {
      id: 'python-class-template',
      name: 'Class Template',
      description: 'Basic Python class structure',
      code: `class {{class_name}}:
    def __init__(self, {{parameters}}):
        {{init_body}}
    
    def {{method_name}}(self):
        {{method_body}}
        
# Usage
# obj = {{class_name}}({{arguments}})
# obj.{{method_name}}()`,
      language: 'python',
      category: 'oop',
      tags: ['class', 'oop', 'template'],
      variables: [
        {
          name: 'class_name',
          description: 'Name of the class',
          defaultValue: 'MyClass',
          type: 'string'
        },
        {
          name: 'parameters',
          description: 'Constructor parameters',
          defaultValue: 'name',
          type: 'string'
        },
        {
          name: 'init_body',
          description: 'Constructor body',
          defaultValue: 'self.name = name',
          type: 'string'
        },
        {
          name: 'method_name',
          description: 'Method name',
          defaultValue: 'greet',
          type: 'string'
        },
        {
          name: 'method_body',
          description: 'Method body',
          defaultValue: 'print(f"Hello, {self.name}!")',
          type: 'string'
        },
        {
          name: 'arguments',
          description: 'Constructor arguments',
          defaultValue: '"World"',
          type: 'string'
        }
      ]
    },

    // JavaScript templates
    {
      id: 'js-hello-world',
      name: 'Hello World',
      description: 'Basic JavaScript hello world',
      code: 'console.log("Hello, World!");',
      language: 'javascript',
      category: 'basics',
      tags: ['beginner', 'console']
    },
    {
      id: 'js-fetch-api',
      name: 'Fetch API',
      description: 'Make HTTP requests with fetch',
      code: `fetch('{{api_url}}')
  .then(response => response.json())
  .then(data => {
    console.log(data);
  })
  .catch(error => {
    console.error('Error:', error);
  });`,
      language: 'javascript',
      category: 'web',
      tags: ['fetch', 'api', 'promise'],
      variables: [
        {
          name: 'api_url',
          description: 'API endpoint URL',
          defaultValue: 'https://api.example.com/data',
          type: 'string'
        }
      ]
    },
    {
      id: 'js-async-await',
      name: 'Async/Await',
      description: 'Async function with error handling',
      code: `async function {{function_name}}() {
  try {
    const response = await fetch('{{api_url}}');
    const data = await response.json();
    console.log(data);
    return data;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

// Usage
{{function_name}}();`,
      language: 'javascript',
      category: 'async',
      tags: ['async', 'await', 'promise'],
      variables: [
        {
          name: 'function_name',
          description: 'Function name',
          defaultValue: 'fetchData',
          type: 'string'
        },
        {
          name: 'api_url',
          description: 'API endpoint URL',
          defaultValue: 'https://api.example.com/data',
          type: 'string'
        }
      ]
    }
  ]

  const categories: TemplateCategory[] = [
    { id: 'all', name: 'All Templates', description: 'Show all available templates' },
    { id: 'basics', name: 'Basics', description: 'Fundamental programming concepts' },
    { id: 'data-science', name: 'Data Science', description: 'Data analysis and visualization' },
    { id: 'web', name: 'Web Development', description: 'Web scraping, APIs, and HTTP requests' },
    { id: 'file-io', name: 'File I/O', description: 'File reading and writing operations' },
    { id: 'oop', name: 'Object-Oriented', description: 'Classes and object-oriented programming' },
    { id: 'async', name: 'Async Programming', description: 'Asynchronous operations and promises' }
  ]

  // Filter templates based on language, search, and category
  const filteredTemplates = computed(() => {
    let templates = builtInTemplates.filter(template => 
      template.language === language || language === 'all'
    )

    if (selectedCategory.value !== 'all') {
      templates = templates.filter(template => 
        template.category === selectedCategory.value
      )
    }

    if (searchQuery.value.trim()) {
      const query = searchQuery.value.toLowerCase()
      templates = templates.filter(template =>
        template.name.toLowerCase().includes(query) ||
        template.description.toLowerCase().includes(query) ||
        template.tags.some(tag => tag.toLowerCase().includes(query))
      )
    }

    return templates
  })

  const availableCategories = computed(() => {
    const templateCategories = new Set(
      builtInTemplates
        .filter(template => template.language === language || language === 'all')
        .map(template => template.category)
    )
    
    return categories.filter(category => 
      category.id === 'all' || templateCategories.has(category.id)
    )
  })

  const applyTemplate = (template: CodeTemplate, variables?: Record<string, string>): string => {
    let code = template.code

    // Replace template variables
    if (template.variables && variables) {
      template.variables.forEach(variable => {
        const value = variables[variable.name] || variable.defaultValue
        const placeholder = `{{${variable.name}}}`
        code = code.replace(new RegExp(placeholder, 'g'), value)
      })
    }

    return code
  }

  const getTemplateById = (id: string): CodeTemplate | undefined => {
    return builtInTemplates.find(template => template.id === id)
  }

  const getTemplatesByCategory = (categoryId: string): CodeTemplate[] => {
    return builtInTemplates.filter(template => 
      template.category === categoryId && 
      (template.language === language || language === 'all')
    )
  }

  const searchTemplates = (query: string): CodeTemplate[] => {
    const lowerQuery = query.toLowerCase()
    return builtInTemplates.filter(template =>
      (template.language === language || language === 'all') &&
      (template.name.toLowerCase().includes(lowerQuery) ||
       template.description.toLowerCase().includes(lowerQuery) ||
       template.tags.some(tag => tag.toLowerCase().includes(lowerQuery)))
    )
  }

  const getPopularTemplates = (limit: number = 5): CodeTemplate[] => {
    // In a real implementation, this would be based on usage statistics
    return filteredTemplates.value.slice(0, limit)
  }

  const getRecentTemplates = (limit: number = 3): CodeTemplate[] => {
    // In a real implementation, this would track recently used templates
    return filteredTemplates.value.slice(-limit)
  }

  return {
    // State
    selectedTemplate: computed(() => selectedTemplate.value),
    searchQuery: computed({
      get: () => searchQuery.value,
      set: (value: string) => { searchQuery.value = value }
    }),
    selectedCategory: computed({
      get: () => selectedCategory.value,
      set: (value: string) => { selectedCategory.value = value }
    }),

    // Data
    filteredTemplates,
    availableCategories,
    categories: computed(() => categories),

    // Methods
    applyTemplate,
    getTemplateById,
    getTemplatesByCategory,
    searchTemplates,
    getPopularTemplates,
    getRecentTemplates,
    setSelectedTemplate: (template: CodeTemplate | null) => {
      selectedTemplate.value = template
    }
  }
} 








