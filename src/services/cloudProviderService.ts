import { v4 as uuidv4 } from 'uuid'
import type { CloudProvider, VMConfiguration, CloudVM } from '@/types/jupyter'

// Mock cloud providers for demonstration
const CLOUD_PROVIDERS: CloudProvider[] = [
  {
    id: 'aws',
    name: 'AWS',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/9/93/Amazon_Web_Services_Logo.svg',
    description: 'Amazon Web Services',
  },
  {
    id: 'gcp',
    name: 'GCP',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/5/51/Google_Cloud_logo.svg',
    description: 'Google Cloud Platform',
  },
  {
    id: 'azure',
    name: 'Azure',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Microsoft_Azure.svg',
    description: 'Microsoft Azure',
  },
  {
    id: 'digitalocean',
    name: 'DigitalOcean',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/f/ff/DigitalOcean_logo.svg',
    description: 'DigitalOcean Cloud',
  },
]

// Provider-specific regions
const REGIONS = {
  aws: [
    { id: 'us-east-1', name: 'US East (N. Virginia)' },
    { id: 'us-west-2', name: 'US West (Oregon)' },
    { id: 'eu-west-1', name: 'EU (Ireland)' },
    { id: 'ap-northeast-1', name: 'Asia Pacific (Tokyo)' },
  ],
  gcp: [
    { id: 'us-central1', name: 'Iowa (us-central1)' },
    { id: 'us-east1', name: 'South Carolina (us-east1)' },
    { id: 'europe-west1', name: 'Belgium (europe-west1)' },
    { id: 'asia-east1', name: 'Taiwan (asia-east1)' },
  ],
  azure: [
    { id: 'eastus', name: 'East US' },
    { id: 'westeurope', name: 'West Europe' },
    { id: 'southeastasia', name: 'Southeast Asia' },
    { id: 'westus2', name: 'West US 2' },
  ],
  digitalocean: [
    { id: 'nyc1', name: 'New York 1' },
    { id: 'sfo2', name: 'San Francisco 2' },
    { id: 'ams3', name: 'Amsterdam 3' },
    { id: 'sgp1', name: 'Singapore 1' },
  ],
}

// Provider-specific instance types
const INSTANCE_TYPES = {
  aws: [
    { id: 't2.micro', name: 't2.micro (1 vCPU, 1 GB RAM)', price: '$0.0116/hour' },
    { id: 't2.small', name: 't2.small (1 vCPU, 2 GB RAM)', price: '$0.023/hour' },
    { id: 't2.medium', name: 't2.medium (2 vCPU, 4 GB RAM)', price: '$0.0464/hour' },
  ],
  gcp: [
    { id: 'e2-micro', name: 'e2-micro (2 vCPU, 1 GB RAM)', price: '$0.0083/hour' },
    { id: 'e2-small', name: 'e2-small (2 vCPU, 2 GB RAM)', price: '$0.0167/hour' },
    { id: 'e2-medium', name: 'e2-medium (2 vCPU, 4 GB RAM)', price: '$0.0334/hour' },
  ],
  azure: [
    { id: 'B1s', name: 'B1s (1 vCPU, 1 GB RAM)', price: '$0.0104/hour' },
    { id: 'B2s', name: 'B2s (2 vCPU, 4 GB RAM)', price: '$0.0416/hour' },
    { id: 'B2ms', name: 'B2ms (2 vCPU, 8 GB RAM)', price: '$0.0832/hour' },
  ],
  digitalocean: [
    { id: 's-1vcpu-1gb', name: 'Basic (1 vCPU, 1 GB RAM)', price: '$0.007/hour' },
    { id: 's-1vcpu-2gb', name: 'Basic (1 vCPU, 2 GB RAM)', price: '$0.014/hour' },
    { id: 's-2vcpu-4gb', name: 'Basic (2 vCPU, 4 GB RAM)', price: '$0.028/hour' },
  ],
}

// Template VMs with default configurations
const VM_TEMPLATES = {
  aws: [
    {
      id: 'aws-basic-data-science',
      name: 'Basic Data Science',
      description: 'Python, NumPy, Pandas, Matplotlib',
      configuration: {
        name: 'aws-data-science',
        provider: 'aws',
        region: 'us-east-1',
        instanceType: 't2.small',
        diskSize: 30,
        username: 'jupyter',
      },
      packages: ['numpy', 'pandas', 'matplotlib', 'scikit-learn'],
    },
    {
      id: 'aws-ml-tensorflow',
      name: 'Machine Learning (TensorFlow)',
      description: 'TensorFlow, Keras, Scikit-learn',
      configuration: {
        name: 'aws-tensorflow',
        provider: 'aws',
        region: 'us-east-1',
        instanceType: 't2.medium',
        diskSize: 50,
        username: 'jupyter',
      },
      packages: ['tensorflow', 'keras', 'scikit-learn', 'pandas', 'numpy', 'matplotlib'],
    },
    {
      id: 'aws-ml-pytorch',
      name: 'Machine Learning (PyTorch)',
      description: 'PyTorch, Torchvision, Scikit-learn',
      configuration: {
        name: 'aws-pytorch',
        provider: 'aws',
        region: 'us-east-1',
        instanceType: 't2.medium',
        diskSize: 50,
        username: 'jupyter',
      },
      packages: ['torch', 'torchvision', 'scikit-learn', 'pandas', 'numpy', 'matplotlib'],
    },
  ],
  gcp: [
    {
      id: 'gcp-basic-data-science',
      name: 'Basic Data Science',
      description: 'Python, NumPy, Pandas, Matplotlib',
      configuration: {
        name: 'gcp-data-science',
        provider: 'gcp',
        region: 'us-central1',
        instanceType: 'e2-small',
        diskSize: 30,
        username: 'jupyter',
      },
      packages: ['numpy', 'pandas', 'matplotlib', 'scikit-learn'],
    },
    {
      id: 'gcp-ml-tensorflow',
      name: 'Machine Learning (TensorFlow)',
      description: 'TensorFlow, Keras, Scikit-learn',
      configuration: {
        name: 'gcp-tensorflow',
        provider: 'gcp',
        region: 'us-central1',
        instanceType: 'e2-medium',
        diskSize: 50,
        username: 'jupyter',
      },
      packages: ['tensorflow', 'keras', 'scikit-learn', 'pandas', 'numpy', 'matplotlib'],
    },
    {
      id: 'gcp-ml-pytorch',
      name: 'Machine Learning (PyTorch)',
      description: 'PyTorch, Torchvision, Scikit-learn',
      configuration: {
        name: 'gcp-pytorch',
        provider: 'gcp',
        region: 'us-central1',
        instanceType: 'e2-medium',
        diskSize: 50,
        username: 'jupyter',
      },
      packages: ['torch', 'torchvision', 'scikit-learn', 'pandas', 'numpy', 'matplotlib'],
    },
  ],
  azure: [
    {
      id: 'azure-basic-data-science',
      name: 'Basic Data Science',
      description: 'Python, NumPy, Pandas, Matplotlib',
      configuration: {
        name: 'azure-data-science',
        provider: 'azure',
        region: 'eastus',
        instanceType: 'B1s',
        diskSize: 30,
        username: 'jupyter',
      },
      packages: ['numpy', 'pandas', 'matplotlib', 'scikit-learn'],
    },
    {
      id: 'azure-ml-tensorflow',
      name: 'Machine Learning (TensorFlow)',
      description: 'TensorFlow, Keras, Scikit-learn',
      configuration: {
        name: 'azure-tensorflow',
        provider: 'azure',
        region: 'eastus',
        instanceType: 'B2s',
        diskSize: 50,
        username: 'jupyter',
      },
      packages: ['tensorflow', 'keras', 'scikit-learn', 'pandas', 'numpy', 'matplotlib'],
    },
    {
      id: 'azure-ml-pytorch',
      name: 'Machine Learning (PyTorch)',
      description: 'PyTorch, Torchvision, Scikit-learn',
      configuration: {
        name: 'azure-pytorch',
        provider: 'azure',
        region: 'eastus',
        instanceType: 'B2s',
        diskSize: 50,
        username: 'jupyter',
      },
      packages: ['torch', 'torchvision', 'scikit-learn', 'pandas', 'numpy', 'matplotlib'],
    },
  ],
  digitalocean: [
    {
      id: 'do-basic-data-science',
      name: 'Basic Data Science',
      description: 'Python, NumPy, Pandas, Matplotlib',
      configuration: {
        name: 'do-data-science',
        provider: 'digitalocean',
        region: 'nyc1',
        instanceType: 's-1vcpu-2gb',
        diskSize: 30,
        username: 'jupyter',
      },
      packages: ['numpy', 'pandas', 'matplotlib', 'scikit-learn'],
    },
    {
      id: 'do-ml-tensorflow',
      name: 'Machine Learning (TensorFlow)',
      description: 'TensorFlow, Keras, Scikit-learn',
      configuration: {
        name: 'do-tensorflow',
        provider: 'digitalocean',
        region: 'nyc1',
        instanceType: 's-2vcpu-4gb',
        diskSize: 50,
        username: 'jupyter',
      },
      packages: ['tensorflow', 'keras', 'scikit-learn', 'pandas', 'numpy', 'matplotlib'],
    },
    {
      id: 'do-ml-pytorch',
      name: 'Machine Learning (PyTorch)',
      description: 'PyTorch, Torchvision, Scikit-learn',
      configuration: {
        name: 'do-pytorch',
        provider: 'digitalocean',
        region: 'nyc1',
        instanceType: 's-2vcpu-4gb',
        diskSize: 50,
        username: 'jupyter',
      },
      packages: ['torch', 'torchvision', 'scikit-learn', 'pandas', 'numpy', 'matplotlib'],
    },
  ],
}

// Jupyter installation scripts for different providers
const JUPYTER_INSTALL_SCRIPTS = {
  aws: `#!/bin/bash
sudo apt-get update
sudo apt-get install -y python3-pip python3-dev
sudo pip3 install jupyter jupyterlab
jupyter notebook --generate-config
echo "c.NotebookApp.ip = '0.0.0.0'" >> ~/.jupyter/jupyter_notebook_config.py
echo "c.NotebookApp.open_browser = False" >> ~/.jupyter/jupyter_notebook_config.py
echo "c.NotebookApp.allow_origin = '*'" >> ~/.jupyter/jupyter_notebook_config.py
TOKEN=$(openssl rand -hex 24)
echo "c.NotebookApp.token = '$TOKEN'" >> ~/.jupyter/jupyter_notebook_config.py
nohup jupyter lab --port=8888 &
echo $TOKEN > ~/jupyter_token.txt
`,
  gcp: `#!/bin/bash
sudo apt-get update
sudo apt-get install -y python3-pip python3-dev
sudo pip3 install jupyter jupyterlab
jupyter notebook --generate-config
echo "c.NotebookApp.ip = '0.0.0.0'" >> ~/.jupyter/jupyter_notebook_config.py
echo "c.NotebookApp.open_browser = False" >> ~/.jupyter/jupyter_notebook_config.py
echo "c.NotebookApp.allow_origin = '*'" >> ~/.jupyter/jupyter_notebook_config.py
TOKEN=$(openssl rand -hex 24)
echo "c.NotebookApp.token = '$TOKEN'" >> ~/.jupyter/jupyter_notebook_config.py
nohup jupyter lab --port=8888 &
echo $TOKEN > ~/jupyter_token.txt
`,
  azure: `#!/bin/bash
sudo apt-get update
sudo apt-get install -y python3-pip python3-dev
sudo pip3 install jupyter jupyterlab
jupyter notebook --generate-config
echo "c.NotebookApp.ip = '0.0.0.0'" >> ~/.jupyter/jupyter_notebook_config.py
echo "c.NotebookApp.open_browser = False" >> ~/.jupyter/jupyter_notebook_config.py
echo "c.NotebookApp.allow_origin = '*'" >> ~/.jupyter/jupyter_notebook_config.py
TOKEN=$(openssl rand -hex 24)
echo "c.NotebookApp.token = '$TOKEN'" >> ~/.jupyter/jupyter_notebook_config.py
nohup jupyter lab --port=8888 &
echo $TOKEN > ~/jupyter_token.txt
`,
  digitalocean: `#!/bin/bash
sudo apt-get update
sudo apt-get install -y python3-pip python3-dev
sudo pip3 install jupyter jupyterlab
jupyter notebook --generate-config
echo "c.NotebookApp.ip = '0.0.0.0'" >> ~/.jupyter/jupyter_notebook_config.py
echo "c.NotebookApp.open_browser = False" >> ~/.jupyter/jupyter_notebook_config.py
echo "c.NotebookApp.allow_origin = '*'" >> ~/.jupyter/jupyter_notebook_config.py
TOKEN=$(openssl rand -hex 24)
echo "c.NotebookApp.token = '$TOKEN'" >> ~/.jupyter/jupyter_notebook_config.py
nohup jupyter lab --port=8888 &
echo $TOKEN > ~/jupyter_token.txt
`,
}

export interface VMTemplate {
  id: string
  name: string
  description: string
  configuration: VMConfiguration
  packages: string[]
}

export class CloudProviderService {
  getProviders(): CloudProvider[] {
    return CLOUD_PROVIDERS
  }

  getRegions(providerId: string): { id: string; name: string }[] {
    return REGIONS[providerId as keyof typeof REGIONS] || []
  }

  getInstanceTypes(providerId: string): { id: string; name: string; price: string }[] {
    return INSTANCE_TYPES[providerId as keyof typeof INSTANCE_TYPES] || []
  }

  getTemplates(providerId: string): VMTemplate[] {
    return VM_TEMPLATES[providerId as keyof typeof VM_TEMPLATES] || []
  }

  // In a real implementation, this would call the cloud provider's API
  async createVM(config: VMConfiguration): Promise<CloudVM> {
    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Generate a random token for Jupyter
    const jupyterToken = Math.random().toString(36).substring(2, 15)
    
    // Create a new VM instance
    const vm: CloudVM = {
      ...config,
      id: uuidv4(),
      status: 'creating',
      createdAt: new Date().toISOString(),
    }

    // In a real implementation, this would be the result of the cloud provider's API call
    return vm
  }

  // Simulate VM provisioning and Jupyter installation
  async provisionVM(vm: CloudVM, packages: string[] = []): Promise<CloudVM> {
    // Simulate provisioning delay
    await new Promise((resolve) => setTimeout(resolve, 5000))

    // Generate a random IP address
    const ipAddress = `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`
    
    // Generate a random token for Jupyter
    const jupyterToken = Math.random().toString(36).substring(2, 15)
    
    // Update VM with IP and Jupyter info
    return {
      ...vm,
      status: 'running',
      ipAddress,
      jupyterUrl: `http://${ipAddress}:8888`,
      jupyterToken,
    }
  }

  // Get the installation script for a provider
  getJupyterInstallScript(providerId: string): string {
    return JUPYTER_INSTALL_SCRIPTS[providerId as keyof typeof JUPYTER_INSTALL_SCRIPTS] || JUPYTER_INSTALL_SCRIPTS.aws
  }

  // Get the installation commands for packages
  getPackageInstallCommands(packages: string[]): string[] {
    if (!packages || packages.length === 0) return []
    
    return [
      `pip install ${packages.join(' ')}`,
    ]
  }
} 