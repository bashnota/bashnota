import yaml from 'js-yaml'

export const generateYamlConfig = (config: any): string => {
  return yaml.dump(config)
} 