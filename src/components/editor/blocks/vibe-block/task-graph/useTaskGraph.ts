import { ref, computed, watch, nextTick } from 'vue'
import { useVueFlow } from '@vue-flow/core'
import type { Task, TaskNode, TaskEdge } from './types'
import { logger } from '@/services/logger'

interface UseTaskGraphOptions {
  initialTasks?: Task[]
  onNodeClick?: (nodeId: string) => void
  selectedTaskId?: string | null
}

export function useTaskGraph(options: UseTaskGraphOptions = {}) {
  const { initialTasks = [], onNodeClick, selectedTaskId = null } = options
  
  // Elements for the graph
  const elements = ref<(TaskNode | TaskEdge)[]>([])
  
  // Set up Vue Flow instance with a unique ID
  const flowId = 'task-dependency-graph'
  const vueFlowInstance = useVueFlow({
    id: flowId,
    defaultEdgeOptions: {
      type: 'default',
      style: { strokeWidth: 2 }
    },
    defaultViewport: { zoom: 1.2 },
    autoPanOnNodeDrag: true,
    fitViewOnInit: true,
  })
  
  // Extract needed methods from Vue Flow instance
  const { fitView } = vueFlowInstance
  
  // Tasks to be used
  const tasks = ref<Task[]>(initialTasks)
  
  // Check if tasks data is valid
  const hasValidTasks = computed(() => {
    return tasks.value && 
           tasks.value.length > 0 &&
           tasks.value.every(task => task.id && task.title)
  })
  
  // Build the graph from tasks
  function buildGraph() {
    try {
      const tasksToUse = tasks.value
      
      if (!tasksToUse || tasksToUse.length === 0) {
        logger.warn('Cannot build graph: No valid tasks provided')
        elements.value = []
        return
      }
  
      const nodes: TaskNode[] = []
      const edges: TaskEdge[] = []
      
      logger.log('Building graph with tasks:', tasksToUse)
      
      // Create a node for each task
      tasksToUse.forEach((task, index) => {
        if (!task.id) {
          logger.warn('Task missing ID, skipping:', task)
          return
        }
        
        // Create node with task data
        const node: TaskNode = {
          id: task.id,
          type: 'default',
          position: { 
            x: 100 + (index % 3) * 300, 
            y: 100 + Math.floor(index / 3) * 200 
          },
          data: {
            id: task.id,
            title: task.title || 'Untitled Task',
            status: task.status || 'pending',
            actorType: task.actorType || 'Unknown',
            description: task.description || ''
          }
        }
        
        nodes.push(node)
        
        // Create edges for dependencies
        if (task.dependencies && task.dependencies.length > 0) {
          task.dependencies.forEach(depId => {
            // Verify the dependency ID exists
            const dependencyExists = tasksToUse.some(t => t.id === depId);
            
            if (!dependencyExists) {
              logger.warn(`Task ${task.id} depends on missing task ${depId}`)
              return
            }
            
            edges.push({
              id: `e-${depId}-${task.id}`,
              source: depId,
              target: task.id,
              type: 'default',
              style: {
                stroke: task.status === 'failed' ? '#ef4444' : '#64748b',
                strokeWidth: 2
              },
              animated: task.status === 'in_progress'
            })
          })
        }
      })
      
      logger.log('Created nodes:', nodes)
      logger.log('Created edges:', edges)
      
      // Make sure to update the elements with both nodes and edges
      if (nodes.length > 0) {
        elements.value = [...nodes, ...edges]
      } else {
        logger.warn('No valid nodes created')
        elements.value = []
      }
    } catch (error) {
      logger.error('Error building graph:', error)
      elements.value = []
    }
  }
  
  // Function to use sample test data for debugging
  function useTestData() {
    logger.log('Using test data for debugging')
    
    // Clear current elements
    elements.value = []
    
    // Use nextTick to ensure the DOM is updated
    nextTick(() => {
      // Build graph with sample data
      const nodes: TaskNode[] = [
        {
          id: 'test-1',
          type: 'default',
          position: { x: 100, y: 100 },
          data: {
            id: 'test-1',
            title: 'Test Task 1',
            status: 'completed',
            actorType: 'RESEARCHER',
            description: 'Test task for debugging'
          }
        },
        {
          id: 'test-2',
          type: 'default',
          position: { x: 400, y: 100 },
          data: {
            id: 'test-2',
            title: 'Test Task 2',
            status: 'in_progress',
            actorType: 'CODER',
            description: 'Another test task'
          }
        }
      ]
      
      const edges: TaskEdge[] = [
        {
          id: 'e-test-1-test-2',
          source: 'test-1',
          target: 'test-2',
          style: { stroke: '#64748b', strokeWidth: 2 },
          animated: true
        }
      ]
      
      // Update elements with test nodes and edges
      elements.value = [...nodes, ...edges]
      
      // Wait for elements to update then fit view
      nextTick(() => {
        setTimeout(() => {
          fitView({ 
            padding: 0.2,
            includeHiddenNodes: false,
            duration: 500
          })
        }, 200)
      })
    })
  }
  
  // Function to handle node click
  function handleNodeClick(event: any, { id }: { id: string }) {
    logger.log('Node clicked:', id)
    onNodeClick?.(id)
  }
  
  // Function to update tasks
  function updateTasks(newTasks: Task[]) {
    tasks.value = newTasks
  }
  
  // Set up watchers
  
  // Watch for changes in tasks and rebuild the graph
  watch(tasks, (newTasks) => {
    logger.log('Tasks changed:', newTasks)
    if (newTasks && newTasks.length > 0) {
      nextTick(() => {
        buildGraph()
        // Wait for elements to update then fit view
        nextTick(() => {
          setTimeout(() => {
            if (elements.value.length > 0) {
              fitView({ padding: 0.2 })
            }
          }, 100)
        })
      })
    } else {
      // Clear the graph if no tasks
      elements.value = []
    }
  }, { deep: true })
  
  // Watch for selected task ID changes
  watch(() => selectedTaskId, (newId) => {
    if (newId) {
      // Highlight the selected node
      const updatedElements = elements.value.map(el => {
        if (el.id === newId && el.type !== 'edge') {
          return {
            ...el,
            style: { border: '2px solid #3b82f6', boxShadow: '0 0 10px rgba(59, 130, 246, 0.5)' }
          }
        } else if (el.type !== 'edge') {
          // For non-selected nodes, don't modify style
          const { style, ...rest } = el
          return rest
        }
        return el
      })
      
      // Update elements with type-safe assignment
      elements.value = updatedElements as (TaskNode | TaskEdge)[]
    }
  })
  
  // Initialize
  if (initialTasks.length > 0) {
    updateTasks(initialTasks)
  }
  
  return {
    elements,
    fitView,
    buildGraph,
    useTestData,
    handleNodeClick,
    updateTasks,
    hasValidTasks,
    vueFlowInstance
  }
} 