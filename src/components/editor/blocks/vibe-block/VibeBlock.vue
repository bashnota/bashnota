<template>
  <node-view-wrapper>
    <div class="vibe-block" :class="{ 'vibe-expanded': isExpanded }">
      <!-- Initial compact view -->
      <div class="vibe-header" @click="toggleExpand">
        <div class="vibe-title">
          <Zap class="h-4 w-4 mr-2" :class="{ 'text-primary': isActive }" />
          <span v-if="!isActive">Vibe Assistant</span>
          <span v-else>{{ query }}</span>
        </div>
        <div class="vibe-status">
          <Loader v-if="isLoading" class="h-4 w-4 animate-spin" />
          <CheckCircle v-else-if="hasCompletedTasks" class="h-4 w-4 text-success" />
          <AlertCircle v-else-if="error" class="h-4 w-4 text-destructive" />
          <CircleEllipsis v-else-if="isActive" class="h-4 w-4 text-primary" />
        </div>
        <div class="vibe-expand-icon">
          <ChevronDown v-if="isExpanded" class="h-4 w-4" />
          <ChevronRight v-else class="h-4 w-4" />
        </div>
      </div>

      <!-- Expanded content -->
      <div v-if="isExpanded" class="vibe-content">
        <!-- Input form when not active -->
        <div v-if="!isActive" class="vibe-input-panel">
          <div class="vibe-description">
            Ask Vibe to help you with research, analysis, or code generation.
          </div>
          
          <!-- Jupyter config panel -->
          <div v-if="showJupyterConfig" class="mb-4">
            <JupyterConfigPanel 
              :initialServer="jupyterConfig.server"
              :initialKernel="jupyterConfig.kernel"
              @configUpdated="updateJupyterConfig"
            />
          </div>
          
          <div class="flex gap-2">
            <input
              :value="queryText"
              placeholder="What would you like help with?"
              class="flex-1 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              @keyup.enter="onButtonClick"
              @input="e => { 
                queryText = e.target.value; 
                console.log('Input changed:', e.target.value, 'queryText now:', queryText);
              }"
            />
            <Button 
              @click.stop.prevent="onButtonClick" 
              class="whitespace-nowrap"
              type="button"
            >
              <Zap class="h-4 w-4 mr-2" />
              Get Started
            </Button>
          </div>
          
          <!-- Jupyter config toggle and status -->
          <div class="flex mt-3 justify-between">
            <div>
              <Button 
                variant="ghost" 
                size="sm" 
                @click="toggleJupyterConfig"
                class="flex items-center gap-1 text-xs h-8"
              >
                <ServerCog v-if="!showJupyterConfig" class="h-3.5 w-3.5" />
                <X v-else class="h-3.5 w-3.5" />
                {{ showJupyterConfig ? 'Hide Jupyter Config' : 'Configure Jupyter' }}
              </Button>
            </div>
            
            <div v-if="!showJupyterConfig" class="flex gap-2 text-xs text-muted-foreground items-center">
              <span v-if="jupyterConfig.server && jupyterConfig.kernel">
                Using {{ jupyterConfig.kernel.spec.display_name }} on 
                {{ jupyterConfig.server.ip }}:{{ jupyterConfig.server.port }}
              </span>
              <span v-else>No Jupyter kernel configured</span>
            </div>
          </div>
        </div>

        <!-- Active content -->
        <div v-else class="vibe-active-panel space-y-3">
          <!-- Loading state -->
          <div v-if="isLoading" class="flex flex-col items-center justify-center p-4 text-center">
            <Loader class="h-8 w-8 animate-spin mb-3" />
            <p class="text-muted-foreground">{{ loadingMessage }}</p>
          </div>

          <!-- Error state -->
          <div v-else-if="error" class="flex flex-col items-center">
            <Alert variant="destructive" class="mb-3">
              <AlertCircle class="h-4 w-4 mr-2" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{{ error }}</AlertDescription>
            </Alert>
            <Button @click="resetVibe" variant="outline" class="mt-2">
              <RefreshCw class="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>

          <!-- Task board details -->
          <div v-else-if="boardTasks.length > 0" class="flex flex-col gap-3">
            <!-- Task summary -->
            <div class="flex justify-between items-center border-b pb-2">
              <div class="text-sm">
                <Badge variant="outline" class="mr-2">
                  {{ completedTasks.length }}/{{ boardTasks.length }}
                </Badge>
                tasks complete
              </div>
              <div class="flex gap-2">
                <Button 
                  v-if="hasInProgressTasks || boardTasks.length > completedTasks.length + failedTasks.length" 
                  @click="refreshTasks" 
                  variant="ghost" 
                  size="sm"
                >
                  <RefreshCw class="h-4 w-4 mr-2" />
                  Refresh
                </Button>
                
                <Button 
                  v-if="hasStuckTasks" 
                  @click="resetTaskExecution" 
                  variant="outline" 
                  size="sm"
                  class="text-destructive"
                >
                  <Undo2 class="h-4 w-4 mr-1" />
                  Reset
                </Button>
              </div>
            </div>
            
            <!-- Tabs for task board UI -->
            <Tabs class="w-full" defaultValue="tasks">
              <TabsList class="w-full">
                <TabsTrigger class="flex-1" value="tasks">
                  <ListChecks class="h-4 w-4 mr-2" />
                  Tasks
                </TabsTrigger>
                <TabsTrigger class="flex-1" value="database">
                  <Database class="h-4 w-4 mr-2" />
                  Database
                </TabsTrigger>
                <TabsTrigger class="flex-1" value="graph">
                  <Network class="h-4 w-4 mr-2" />
                  Graph
                </TabsTrigger>
              </TabsList>

              <!-- Tasks Panel -->
              <TabsContent value="tasks" class="p-0 border-0 mt-2">
                <div class="space-y-2">
                  <Collapsible 
                    v-for="task in boardTasks" 
                    :key="task.id"
                    :id="'task-' + task.id"
                    :open="expandedTaskIds.includes(task.id)"
                    @update:open="toggleTask(task.id)"
                    class="border rounded-md"
                    :class="{
                      'border-primary': task.id === selectedTaskId,
                      'shadow-sm': task.id === selectedTaskId
                    }"
                  >
                    <CollapsibleTrigger class="flex w-full items-center justify-between p-4 text-left">
                      <div class="flex items-center">
                        <div 
                          class="mr-3 h-3 w-3 rounded-full" 
                          :class="{
                            'bg-gray-300': task.status === 'pending',
                            'bg-blue-500 animate-pulse': task.status === 'in_progress',
                            'bg-green-500': task.status === 'completed',
                            'bg-red-500': task.status === 'failed'
                          }"
                        ></div>
                        <div>
                          <div class="text-sm font-medium">{{ task.title }}</div>
                          <div class="text-xs text-gray-500">{{ getActorName(task.actorType) }}</div>
                        </div>
                      </div>
                      <ChevronDown class="h-4 w-4 shrink-0 transition-transform ui-open:rotate-180" />
                    </CollapsibleTrigger>
                    <CollapsibleContent class="p-4 pt-0 text-sm">
                      <div class="space-y-3">
                        <!-- Task description -->
                        <div>
                          <div class="text-xs text-muted-foreground mb-1">Description:</div>
                          <div class="text-sm">{{ task.description }}</div>
                        </div>
                        
                        <!-- Task dependencies -->
                        <div v-if="task.dependencies && task.dependencies.length > 0">
                          <div class="text-xs text-muted-foreground mb-1">Dependencies:</div>
                          <div class="flex flex-wrap gap-1">
                            <span 
                              v-for="depId in task.dependencies" 
                              :key="depId"
                              class="px-2 py-0.5 bg-muted text-xs rounded cursor-pointer"
                              @click="selectDependency(depId)"
                            >
                              {{ getDependencyTitle(depId) }}
                            </span>
                          </div>
                        </div>
                        
                        <!-- Task result -->
                        <div v-if="task.status === 'completed'">
                          <div class="text-xs text-muted-foreground mb-1">Result:</div>
                          <div class="bg-muted/30 p-2 rounded">
                            <div class="whitespace-pre-wrap max-h-40 overflow-y-auto">{{ getResultPreview(task.result) }}</div>
                          </div>
                          
                          <div class="mt-2 flex gap-2">
                            <Button 
                              v-if="canInsertResult(task)" 
                              @click="insertTaskResult(task)"
                              size="sm"
                              class="flex-1"
                            >
                              <ClipboardCopy class="h-4 w-4 mr-2" />
                              Insert Result Below
                            </Button>
                            
                            <Button
                              @click="showTaskDetailsModal(task)"
                              size="sm"
                              variant="outline"
                              class="flex-1"
                            >
                              <Maximize2 class="h-4 w-4 mr-2" />
                              View Details
                            </Button>
                          </div>
                        </div>
                        
                        <!-- Task error -->
                        <div v-if="task.status === 'failed'">
                          <div class="text-xs text-destructive mb-1">Error:</div>
                          <div class="bg-destructive/10 p-2 rounded text-destructive">
                            {{ task.error }}
                          </div>
                        </div>
                        
                        <!-- Task timing -->
                        <div v-if="task.startedAt || task.completedAt" class="mt-2 text-xs text-muted-foreground">
                          <div v-if="task.startedAt">Started: {{ formatDate(task.startedAt) }}</div>
                          <div v-if="task.completedAt">Completed: {{ formatDate(task.completedAt) }}</div>
                          <div v-if="task.startedAt && task.completedAt">
                            Duration: {{ calculateDuration(task.startedAt, task.completedAt) }}
                          </div>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              </TabsContent>

              <!-- Database Panel -->
              <TabsContent 
                value="database" 
                class="p-0 border-0 mt-2"
                @select="loadDatabaseTables"
              >
                <!-- Database tables list -->
                <div v-if="databaseTables.length === 0" class="text-center p-4 text-muted-foreground">
                  No database tables available yet
                </div>
                <div v-else>
                  <div v-for="table in databaseTables" :key="table.id" class="mb-4">
                    <Card>
                      <CardHeader class="p-3 pb-0">
                        <div class="flex justify-between items-center">
                          <Badge variant="outline">Table</Badge>
                          <Badge variant="secondary">{{ table.entries.length }} entries</Badge>
                        </div>
                        <CardTitle class="text-sm mt-2">{{ table.name }}</CardTitle>
                        <p class="text-xs text-muted-foreground mt-1">{{ table.description }}</p>
                      </CardHeader>
                      
                      <CardContent class="p-3 pt-2">
                        <!-- Schema info -->
                        <div class="text-xs mb-2">
                          <span class="font-medium">Schema:</span> 
                          <span v-for="(type, field) in table.schema" :key="field" class="ml-1">
                            <Badge variant="outline" class="text-xs">{{ field }}: {{ type }}</Badge>
                          </span>
                        </div>
                        
                        <!-- Table entries -->
                        <Collapsible>
                          <CollapsibleTrigger class="w-full" @click="toggleTableExpansion(table.id)">
                            <Button variant="outline" size="sm" class="w-full">
                              <ChevronDown v-if="expandedTableIds.includes(table.id)" class="h-3 w-3 mr-2" />
                              <ChevronRight v-else class="h-3 w-3 mr-2" />
                              {{ expandedTableIds.includes(table.id) ? 'Hide' : 'Show' }} Entries
                            </Button>
                          </CollapsibleTrigger>
                          <CollapsibleContent :forceMount="expandedTableIds.includes(table.id)">
                            <div v-if="table.entries.length === 0" class="text-center p-2 text-xs text-muted-foreground">
                              No entries in this table
                            </div>
                            <div v-else class="mt-2 space-y-2">
                              <Card v-for="entry in table.entries" :key="entry.id" class="p-2 text-xs">
                                <div class="flex justify-between mb-1">
                                  <Badge variant="secondary">{{ entry.type }}</Badge>
                                  <Badge variant="outline">{{ entry.key }}</Badge>
                                </div>
                                <div class="bg-muted p-2 rounded max-h-32 overflow-auto">
                                  <pre class="whitespace-pre-wrap text-xs">{{ formatEntryValue(entry.value) }}</pre>
                                </div>
                              </Card>
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>
              
              <!-- Graph Panel -->
              <TabsContent value="graph" class="p-0 border-0 mt-2">
                <TaskGraph 
                  :tasks="boardTasks" 
                  :selected-task-id="selectedTaskId"
                  @node-click="handleTaskGraphNodeClick"
                />
                
                <!-- Task details panel when a node is selected -->
                <div v-if="selectedTaskId" class="mt-3 border p-3 rounded-md">
                  <div class="text-sm font-medium">
                    {{ getSelectedTask()?.title }}
                    <Badge class="ml-2">{{ getActorName(getSelectedTask()?.actorType) }}</Badge>
                  </div>
                  
                  <div class="text-xs mt-1">{{ getSelectedTask()?.description }}</div>
                  
                  <div class="mt-3 flex gap-2">
                    <Button 
                      v-if="getSelectedTask() && canInsertResult(getSelectedTask())" 
                      @click="insertTaskResult(getSelectedTask())"
                      size="sm"
                      class="flex-1"
                    >
                      <ClipboardCopy class="h-4 w-4 mr-2" />
                      Insert Result
                    </Button>
                    
                    <Button
                      @click="showTaskDetailsModal(getSelectedTask())"
                      size="sm"
                      variant="outline"
                      class="flex-1"
                    >
                      <Maximize2 class="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>

    <!-- Add the TaskDetailsModal component -->
    <Dialog
      :open="!!selectedTaskForModal"
      @update:open="open => { if (!open) selectedTaskForModal = null }"
    >
      <DialogContent class="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle v-if="selectedTaskForModal">{{ selectedTaskForModal.title }}</DialogTitle>
          <DialogDescription v-if="selectedTaskForModal">
            {{ getActorName(selectedTaskForModal.actorType) }} - {{ formatDate(selectedTaskForModal.completedAt) }}
          </DialogDescription>
        </DialogHeader>
        
        <div v-if="selectedTaskForModal" class="mt-4 space-y-4">
          <!-- Task description -->
          <div>
            <h4 class="text-sm font-medium mb-1">Description:</h4>
            <div class="text-sm bg-muted/30 p-2 rounded">{{ selectedTaskForModal.description }}</div>
          </div>
          
          <!-- Formatted result based on actor type -->
          <div v-if="selectedTaskForModal.status === 'completed'">
            <h4 class="text-sm font-medium mb-1">Result:</h4>
            
            <!-- Researcher results -->
            <div v-if="selectedTaskForModal.actorType === ActorType.RESEARCHER" class="space-y-3">
              <div v-if="getResearchSummary(selectedTaskForModal)" class="bg-card border rounded-md p-3">
                <h5 class="text-sm font-medium mb-2">Summary</h5>
                <div class="text-sm whitespace-pre-wrap">{{ getResearchSummary(selectedTaskForModal) }}</div>
              </div>
              
              <div v-if="getResearchKeyFindings(selectedTaskForModal)?.length" class="bg-card border rounded-md p-3">
                <h5 class="text-sm font-medium mb-2">Key Findings</h5>
                <ul class="list-disc pl-5 text-sm space-y-1">
                  <li v-for="(finding, idx) in getResearchKeyFindings(selectedTaskForModal)" :key="idx">
                    {{ finding }}
                  </li>
                </ul>
              </div>
              
              <div v-if="getResearchContent(selectedTaskForModal)" class="bg-card border rounded-md p-3">
                <h5 class="text-sm font-medium mb-2">Detailed Research</h5>
                <div class="text-sm whitespace-pre-wrap">{{ getResearchContent(selectedTaskForModal) }}</div>
              </div>
            </div>
            
            <!-- Analyst results -->
            <div v-else-if="selectedTaskForModal.actorType === ActorType.ANALYST" class="space-y-3">
              <div v-if="getAnalysisSummary(selectedTaskForModal)" class="bg-card border rounded-md p-3">
                <h5 class="text-sm font-medium mb-2">Summary</h5>
                <div class="text-sm whitespace-pre-wrap">{{ getAnalysisSummary(selectedTaskForModal) }}</div>
              </div>
              
              <div v-if="getAnalysisInsights(selectedTaskForModal)?.length" class="bg-card border rounded-md p-3">
                <h5 class="text-sm font-medium mb-2">Insights</h5>
                <ul class="list-disc pl-5 text-sm space-y-1">
                  <li v-for="(insight, idx) in getAnalysisInsights(selectedTaskForModal)" :key="idx">
                    {{ insight }}
                  </li>
                </ul>
              </div>
              
              <div v-if="getAnalysisVisualizations(selectedTaskForModal)?.length" class="space-y-3">
                <h5 class="text-sm font-medium">Visualizations</h5>
                <div v-for="(viz, idx) in getAnalysisVisualizations(selectedTaskForModal)" :key="idx" 
                  class="bg-card border rounded-md p-3"
                >
                  <h6 class="text-sm font-medium mb-2">{{ viz.title }}</h6>
                  <!-- Handle different visualization types -->
                  <div v-if="viz.type === 'mermaid'" class="bg-muted p-3 rounded">
                    <div class="mermaid">{{ viz.data }}</div>
                  </div>
                  <pre v-else-if="viz.type === 'math'" class="bg-muted p-3 rounded">{{ typeof viz.data === 'object' && viz.data.formula ? viz.data.formula : viz.data }}</pre>
                  <div v-else-if="viz.type === 'table'" class="bg-muted p-3 rounded overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-300 text-sm">
                      <thead>
                        <tr>
                          <th v-for="(col, colIdx) in getTableColumns(viz.data)" :key="colIdx" class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {{ col }}
                          </th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-gray-200">
                        <tr v-for="(row, rowIdx) in viz.data.rows || viz.data" :key="rowIdx">
                          <td v-for="(col, colIdx) in getTableColumns(viz.data)" :key="colIdx" class="px-3 py-2 whitespace-nowrap">
                            {{ row[col] }}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <pre v-else class="bg-muted p-3 rounded overflow-x-auto text-sm">{{ JSON.stringify(viz.data, null, 2) }}</pre>
                </div>
              </div>
            </div>
            
            <!-- Planner results -->
            <div v-else-if="selectedTaskForModal.actorType === ActorType.PLANNER" class="space-y-3">
              <div v-if="getPlannerMainGoal(selectedTaskForModal)" class="bg-card border rounded-md p-3">
                <h5 class="text-sm font-medium mb-2">Main Goal</h5>
                <div class="text-sm font-medium">{{ getPlannerMainGoal(selectedTaskForModal) }}</div>
              </div>
              
              <div v-if="getPlannerTasks(selectedTaskForModal)?.length" class="bg-card border rounded-md p-3">
                <h5 class="text-sm font-medium mb-2">Planned Tasks</h5>
                <div class="space-y-3">
                  <div 
                    v-for="(task, idx) in getPlannerTasks(selectedTaskForModal)" 
                    :key="idx"
                    class="border rounded p-3"
                  >
                    <div class="flex justify-between">
                      <div class="font-medium text-sm">{{ task.title }}</div>
                      <Badge>{{ task.actorType }}</Badge>
                    </div>
                    <div class="text-sm mt-1">{{ task.description }}</div>
                    
                    <div class="flex gap-2 mt-2">
                      <Badge variant="outline">Priority: {{ task.priority }}</Badge>
                      <Badge variant="outline">Time: {{ task.estimatedCompletion }}</Badge>
                    </div>
                    
                    <div v-if="task.dependencies?.length > 0" class="mt-2 text-xs">
                      <span class="text-muted-foreground">Dependencies:</span> 
                      <span v-for="(dep, depIdx) in task.dependencies" :key="depIdx" class="ml-1">
                        <Badge variant="secondary" class="text-xs">Task {{ dep }}</Badge>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div v-if="getPlanSummary(selectedTaskForModal)" class="bg-card border rounded-md p-3">
                <h5 class="text-sm font-medium mb-2">Plan Summary</h5>
                <div class="text-sm whitespace-pre-wrap">{{ getPlanSummary(selectedTaskForModal) }}</div>
              </div>
            </div>
            
            <!-- Coder results -->
            <div v-else-if="selectedTaskForModal.actorType === ActorType.CODER" class="space-y-3">
              <div class="bg-card border rounded-md p-3">
                <h5 class="text-sm font-medium mb-2">Generated {{ getCoderLanguage(selectedTaskForModal) }} Code</h5>
                <pre class="bg-muted p-3 rounded overflow-x-auto text-sm">{{ getCoderCode(selectedTaskForModal) }}</pre>
              </div>
              
              <div v-if="selectedTaskForModal.result?.execution" class="bg-card border rounded-md p-3">
                <h5 class="text-sm font-medium mb-2">Execution Result</h5>
                <div class="flex items-center mb-2">
                  <div 
                    class="mr-2 h-3 w-3 rounded-full" 
                    :class="{
                      'bg-green-500': selectedTaskForModal.result.execution.success,
                      'bg-red-500': !selectedTaskForModal.result.execution.success
                    }"
                  ></div>
                  <span class="text-sm">
                    {{ selectedTaskForModal.result.execution.success ? 'Success' : 'Failed' }}
                  </span>
                </div>
                <pre v-if="selectedTaskForModal.result.execution.error" class="bg-destructive/10 p-3 mb-2 rounded text-destructive text-sm">{{ selectedTaskForModal.result.execution.error }}</pre>
                <pre v-if="selectedTaskForModal.result.execution.output" class="bg-muted p-3 rounded overflow-x-auto text-sm">{{ selectedTaskForModal.result.execution.output }}</pre>
              </div>
            </div>
            
            <!-- Fallback for other actor types -->
            <div v-else class="bg-card border rounded-md p-3">
              <pre class="whitespace-pre-wrap text-sm">{{ formatTaskResult(selectedTaskForModal.result) }}</pre>
            </div>
          </div>
          
          <!-- Error display -->
          <div v-if="selectedTaskForModal.status === 'failed'" class="mt-4">
            <h4 class="text-sm font-medium text-destructive mb-1">Error:</h4>
            <div class="bg-destructive/10 p-3 rounded text-destructive">
              {{ selectedTaskForModal.error }}
            </div>
            
            <!-- Show code for failed coder tasks that still have code -->
            <div v-if="selectedTaskForModal.actorType === ActorType.CODER && getCoderCodeFromResult(selectedTaskForModal)" class="mt-4">
              <h4 class="text-sm font-medium mb-1">Generated Code (Failed):</h4>
              <pre class="bg-muted p-3 rounded overflow-x-auto text-sm">{{ getCoderCodeFromResult(selectedTaskForModal) }}</pre>
              
              <!-- Show execution details if available -->
              <div v-if="getCoderExecutionFromResult(selectedTaskForModal)" class="mt-3">
                <h4 class="text-sm font-medium mb-1">Execution Error:</h4>
                <pre class="bg-destructive/10 p-3 rounded text-destructive text-sm">{{ getCoderExecutionFromResult(selectedTaskForModal).error }}</pre>
                
                <div v-if="getCoderExecutionFromResult(selectedTaskForModal).output" class="mt-2">
                  <h4 class="text-sm font-medium mb-1">Execution Output:</h4>
                  <pre class="bg-muted p-3 rounded overflow-x-auto text-sm">{{ getCoderExecutionFromResult(selectedTaskForModal).output }}</pre>
                </div>
              </div>
              
              <!-- Show retry info if available -->
              <div v-if="getCoderRetryInfo(selectedTaskForModal)" class="mt-3 border-t pt-3">
                <h4 class="text-sm font-medium mb-1">Retry Information:</h4>
                <div class="text-xs text-muted-foreground">
                  This task failed after {{ getCoderRetryInfo(selectedTaskForModal) }} attempts to fix the code.
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button 
            v-if="selectedTaskForModal && canInsertResult(selectedTaskForModal)" 
            @click="insertTaskResult(selectedTaskForModal)"
          >
            <ClipboardCopy class="h-4 w-4 mr-2" />
            Insert Result
          </Button>
          <Button variant="outline" @click="selectedTaskForModal = null">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </node-view-wrapper>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, onBeforeUnmount, nextTick } from 'vue'
import { useToast } from '@/components/ui/toast/use-toast'
import { useVibeStore } from '@/stores/vibeStore'
import { useAISettingsStore } from '../../../../stores/aiSettingsStore'
import { useJupyterStore } from '@/stores/jupyterStore'
import { ActorType } from '@/types/vibe'
import { nodeViewProps, NodeViewWrapper } from '@tiptap/vue-3'
import { 
  Zap, 
  Loader, 
  CheckCircle, 
  AlertCircle, 
  ChevronDown, 
  ChevronRight, 
  RefreshCw, 
  Download,
  CircleEllipsis,
  ServerCog,
  X,
  Undo2,
  ListChecks,
  Database,
  Network,
  ClipboardCopy,
  Maximize2
} from 'lucide-vue-next'

// Import UI components individually
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'

// Add import for VibeTaskExecutor
import { VibeTaskExecutor } from '@/services/vibe/VibeTaskExecutor'

// Import JupyterConfigPanel
import JupyterConfigPanel from './JupyterConfigPanel.vue'

// Import TaskGraph component
import TaskGraph from './TaskGraph.vue'

// Define TaskStatus enum if not already defined in vibe types
const TaskStatus = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  FAILED: 'failed'
}

// Define TaskPriority enum if not already defined in vibe types
const TaskPriority = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high'
}

const props = defineProps({
  editor: Object,
  node: Object,
  updateAttributes: Function,
  deleteNode: Function
})

const { toast } = useToast()
const vibeStore = useVibeStore()

// Safely get the AI settings store with error handling
let aiSettingsStore
try {
  aiSettingsStore = useAISettingsStore()
} catch (error) {
  console.error('Error loading AISettingsStore:', error)
  // Provide a fallback implementation with basic defaults
  aiSettingsStore = {
    settings: {
      preferredProviderId: 'openai',
      apiKeys: {},
      maxTokens: 1024,
      temperature: 0.7
    },
    getApiKey: () => '',
    preferredProvider: { id: 'openai', name: 'OpenAI' }
  }
}

const jupyterStore = useJupyterStore()
const taskExecutor = ref(null)
const boardTasks = ref([])
const databaseTables = ref([])
const expandedTableIds = ref([])
const expandedTaskIds = ref([])
const selectedTaskId = ref(null)
const refreshInterval = ref(null)
const queryText = ref('')
const loadingMessage = ref('')
const isExpanded = ref(true)
const showJupyterConfig = ref(false)
const jupyterConfig = ref({
  server: null,
  kernel: null
})
const selectedTaskForModal = ref(null)

// Computed properties
const isActive = computed(() => props.node.attrs.isActive)
const query = computed(() => props.node.attrs.query)
const sessionId = computed(() => props.node.attrs.sessionId)
const taskBoardId = computed(() => props.node.attrs.taskBoardId)
const isLoading = computed(() => props.node.attrs.isLoading)
const error = computed(() => props.node.attrs.error)
const hasTasks = computed(() => boardTasks.value.length > 0)
const hasInProgressTasks = computed(() => boardTasks.value.some(task => task.status === 'in_progress'))

const hasCompletedTasks = computed(() => 
  boardTasks.value.some(task => task.status === 'completed')
)

const completedTasks = computed(() => 
  boardTasks.value.filter(task => task.status === 'completed')
)

const failedTasks = computed(() => 
  boardTasks.value.filter(task => task.status === 'failed')
)

// Determine if execution might be stuck
const hasStuckTasks = computed(() => {
  // Check for pending tasks that aren't running
  const pendingNotRunning = boardTasks.value.some(task => 
    task.status === 'pending' && 
    !task.dependencies?.some(depId => {
      const dep = boardTasks.value.find(t => t.id === depId)
      return dep && (dep.status === 'pending' || dep.status === 'in_progress')
    })
  )
  
  // Check for tasks that have been in progress for too long (over 5 minutes)
  const stuckInProgress = boardTasks.value.some(task => {
    if (task.status === 'in_progress' && task.startedAt) {
      const startTime = new Date(task.startedAt).getTime()
      const currentTime = new Date().getTime()
      const executionTime = currentTime - startTime
      // Consider stuck if running for more than 5 minutes
      return executionTime > 5 * 60 * 1000
    }
    return false
  })
  
  return pendingNotRunning || stuckInProgress
})

// Toggle expanded state
function toggleExpand() {
  isExpanded.value = !isExpanded.value
}

// Toggle table expansion
function toggleTableExpansion(tableId) {
  const index = expandedTableIds.value.indexOf(tableId)
  if (index === -1) {
    expandedTableIds.value.push(tableId)
  } else {
    expandedTableIds.value.splice(index, 1)
  }
}

// Format entry value for display
function formatEntryValue(value) {
  if (value === null || value === undefined) return 'null'
  
  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2)
  }
  
  return String(value)
}

// Load database tables
async function loadDatabaseTables() {
  try {
    const boardId = props.node.attrs.taskBoardId
    if (!boardId) {
      console.log('No board ID available yet')
      return
    }
    
    console.log('Loading database tables for board:', boardId)
    const tables = await vibeStore.getTablesForBoard(boardId)
    if (tables && tables.length > 0) {
      databaseTables.value = tables
      
      // Load entries for each table
      for (const table of databaseTables.value) {
        table.entries = await vibeStore.getEntriesForTable(table.id)
      }
      
      console.log('Loaded database tables:', databaseTables.value)
    } else {
      databaseTables.value = []
    }
  } catch (error) {
    console.error('Error loading database tables:', error)
    databaseTables.value = []
  }
}

// Update loadBoardTasks to also load database tables when tasks are complete
async function loadBoardTasks() {
  try {
    const boardId = props.node.attrs.taskBoardId
    if (!boardId) {
      console.log('No board ID available yet')
      return
    }
    
    console.log('Loading tasks for board:', boardId)
    const board = await vibeStore.getBoard(boardId)
    if (board) {
      boardTasks.value = board.tasks || []
      console.log('Loaded tasks:', boardTasks.value)
      
      // Also load database tables proactively
      await loadDatabaseTables()
    }
  } catch (error) {
    console.error('Error loading board tasks:', error)
  }
}

// Refresh task status
async function refreshTasks() {
  console.log('Refreshing task status')
  await loadBoardTasks()
  
  // Auto-insert results if requested and all tasks are complete
  if (boardTasks.value.length > 0 && 
      boardTasks.value.every(task => task.status === 'completed' || task.status === 'failed')) {
    console.log('All tasks complete, clearing refresh interval')
    // Clear the refresh interval if all tasks are done
    if (refreshInterval.value) {
      clearInterval(refreshInterval.value)
      refreshInterval.value = null
    }
  }
}

// Get a preview of the task result
function getResultPreview(result) {
  if (!result) return 'No result available'
  
  if (typeof result === 'string') {
    return result.length > 100 ? result.substring(0, 100) + '...' : result
  }
  
  if (typeof result === 'object') {
    // Handle different result types
    if (result.content) return result.content.substring(0, 100) + '...'
    return JSON.stringify(result).substring(0, 100) + '...'
  }
  
  return 'Result available'
}

// Toggle Jupyter configuration panel
function toggleJupyterConfig() {
  showJupyterConfig.value = !showJupyterConfig.value
}

// Update Jupyter configuration
function updateJupyterConfig(config) {
  console.log('Updating Jupyter config:', config)
  jupyterConfig.value = config
  
  // Save configuration to localStorage for persistence
  try {
    localStorage.setItem('vibe-jupyter-config', JSON.stringify({
      server: {
        ip: config.server.ip,
        port: config.server.port,
        token: config.server.token
      },
      kernel: {
        name: config.kernel.name,
        displayName: config.kernel.spec.display_name
      }
    }))
  } catch (error) {
    console.error('Failed to save Jupyter config to localStorage:', error)
  }
  
  // Hide the config panel after update
  showJupyterConfig.value = false
}

// Check if a task result can be inserted
function canInsertResult(task) {
  return !!props.editor && task.status === 'completed' && !!task.result
}

// Helper function to get formatted execution result summary
function getExecutionSummary(execution) {
  if (!execution) return 'No execution data available';
  
  // Start with execution status
  let summary = execution.success 
    ? '✅ Execution completed successfully\n\n' 
    : '❌ Execution failed\n\n';
  
  // Add error if available
  if (execution.error) {
    summary += `Error: ${execution.error}\n\n`;
  }
  
  // Add output
  if (execution.output) {
    summary += execution.output;
  } else {
    summary += 'No output generated';
  }
  
  return summary;
}

// Insert a task result into the document
function insertTaskResult(task) {
  if (!canInsertResult(task)) return
  
  try {
    // Find the current position of the Vibe block
    const vibePos = props.getPos()
    console.log('Current Vibe block position:', vibePos)
    
    if (vibePos === undefined) {
      console.error('Could not determine position of Vibe block')
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not determine where to insert content'
      })
      return
    }
    
    // Get the size of the Vibe block to position after it
    const vibeNode = props.editor.state.doc.nodeAt(vibePos)
    if (!vibeNode) {
      console.error('Could not find Vibe node in document')
      return
    }
    
    // Calculate position after the Vibe block
    const posAfterBlock = vibePos + vibeNode.nodeSize
    
    // Create a function to insert all the content at the position after the Vibe block
    const insertContentAfterBlock = (content) => {
      // Insert the content at the position right after the Vibe block
      return props.editor.commands.insertContentAt(posAfterBlock, content)
    }
    
    // Insert spacing paragraph below
    insertContentAfterBlock({ type: 'paragraph' })
    
    // Insert content based on actor type
    switch (task.actorType) {
      case ActorType.RESEARCHER:
        // For researcher, insert content as paragraphs with proper structure
        if (typeof task.result === 'object') {
          // Insert headings and sections
          insertContentAfterBlock({ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Research Results' }] })
          insertContentAfterBlock({ type: 'paragraph' })
          
          // Insert summary if available
          if (task.result.summary) {
            insertContentAfterBlock({ type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'Summary' }] })
            insertContentAfterBlock({ type: 'paragraph' })
            insertContentAfterBlock(task.result.summary)
            insertContentAfterBlock({ type: 'paragraph' })
          }
          
          // Insert key findings if available
          if (task.result.keyFindings && task.result.keyFindings.length > 0) {
            insertContentAfterBlock({ type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'Key Findings' }] })
            insertContentAfterBlock({ type: 'paragraph' })
            
            // For bullet lists, we need to create the entire list structure at once
            const listItems = task.result.keyFindings.map(finding => ({
              type: 'listItem',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: finding }] }]
            }))
            
            insertContentAfterBlock({
              type: 'bulletList',
              content: listItems
            })
            
            insertContentAfterBlock({ type: 'paragraph' })
          }
          
          // Insert content if available
          if (task.result.content) {
            insertContentAfterBlock({ type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'Detailed Research' }] })
            insertContentAfterBlock({ type: 'paragraph' })
            insertContentAfterBlock(task.result.content)
          }
        } else {
          insertContentAfterBlock(task.result.toString())
        }
        break
        
      case ActorType.ANALYST:
        // For analyst, insert visualizations in a structured manner
        if (typeof task.result === 'object') {
          // Insert title and summary
          insertContentAfterBlock({ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Analysis Results' }] })
          insertContentAfterBlock({ type: 'paragraph' })
          
          if (task.result.summary) {
            insertContentAfterBlock(task.result.summary)
            insertContentAfterBlock({ type: 'paragraph' })
          }
          
          // Insert insights
          if (task.result.insights && task.result.insights.length > 0) {
            insertContentAfterBlock({ type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'Insights' }] })
            insertContentAfterBlock({ type: 'paragraph' })
            
            // Create bullet list with all items at once
            const insightItems = task.result.insights.map(insight => ({
              type: 'listItem',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: insight }] }]
            }))
            
            insertContentAfterBlock({
              type: 'bulletList',
              content: insightItems
            })
            
            insertContentAfterBlock({ type: 'paragraph' })
          }
          
          // Insert visualizations if available
          if (task.result.visualizations && task.result.visualizations.length > 0) {
            insertContentAfterBlock({ type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'Visualizations' }] })
            insertContentAfterBlock({ type: 'paragraph' })
            
            // Insert each visualization
            for (const viz of task.result.visualizations) {
              // Insert title
              insertContentAfterBlock({ type: 'heading', attrs: { level: 4 }, content: [{ type: 'text', text: viz.title }] })
              insertContentAfterBlock({ type: 'paragraph' })
              
              // Insert based on type
              switch (viz.type) {
                case 'table':
                  // Parse the data if it's a string
                  let tableData = typeof viz.data === 'string' ? JSON.parse(viz.data) : viz.data;
                  
                  // Handle different table data formats
                  // If tableData is an object with rows property, use that
                  if (tableData && typeof tableData === 'object' && tableData.rows && Array.isArray(tableData.rows)) {
                    tableData = tableData.rows;
                  }
                  
                  // Ensure tableData is an array at this point
                  if (!Array.isArray(tableData)) {
                    // If it's still not an array, try to convert object to array or create empty array
                    tableData = (tableData && typeof tableData === 'object') ? [tableData] : [];
                  }
                  
                  // Get headers - either from first row's keys or explicit headers
                  const headers = tableData.length > 0 
                    ? Object.keys(tableData[0] || {})
                    : (viz.data.headers || []);
                  
                  // Create table header row
                  const headerRow = {
                    type: 'tableRow',
                    content: headers.map(header => ({
                      type: 'tableHeader',
                      content: [{ type: 'paragraph', content: [{ type: 'text', text: String(header) }] }]
                    }))
                  };
                  
                  // Create table body rows
                  const bodyRows = tableData.map(row => ({
                    type: 'tableRow',
                    content: headers.map(header => ({
                      type: 'tableCell',
                      content: [{ type: 'paragraph', content: [{ type: 'text', text: String(row[header] || '') }] }]
                    }))
                  }));
                  
                  // Insert table
                  insertContentAfterBlock({
                    type: 'table',
                    content: [
                      { type: 'tableHead', content: [headerRow] },
                      { type: 'tableBody', content: bodyRows }
                    ]
                  });
                  break;
                case 'scatter':
                  // Ensure data is an array of points for the scatter plot
                  const scatterData = typeof viz.data === 'string' ? JSON.parse(viz.data) : viz.data;
                  
                  // Format the data for scatter plot if needed
                  const formattedData = Array.isArray(scatterData) ? scatterData : 
                    // If it's an object with data array property, use that
                    (scatterData.data && Array.isArray(scatterData.data) ? scatterData.data : 
                    // Otherwise convert object keys to data points if possible
                    Object.entries(scatterData).map(([key, value]) => ({ 
                      x: parseFloat(key), 
                      y: parseFloat(value),
                      label: 'Data'
                    })));
                  
                  insertContentAfterBlock({
                    type: 'scatterPlot',
                    attrs: {
                      title: viz.title,
                      // Store the actual data array in apiData rather than stringifying to data
                      apiData: formattedData
                    }
                  });
                  break;
                case 'mermaid':
                  insertContentAfterBlock({
                    type: 'mermaid',
                    attrs: {
                      content: viz.data,
                    }
                  })
                  break
                case 'math':
                  insertContentAfterBlock({
                    type: 'mathBlock',
                    attrs: {
                      latex: typeof viz.data === 'object' && viz.data.formula ? viz.data.formula : viz.data,
                    }
                  })
                  break
                default:
                  insertContentAfterBlock(JSON.stringify(viz.data))
              }
              
              insertContentAfterBlock({ type: 'paragraph' })
            }
          }
        } else {
          insertContentAfterBlock(task.result.toString())
        }
        break
        
      case ActorType.CODER:
        // For coder, insert code blocks with proper language
        if (typeof task.result === 'object' && task.result.code) {
          // Insert title
          insertContentAfterBlock({ type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: `Generated ${task.result.language} Code` }] })
          insertContentAfterBlock({ type: 'paragraph' })
          
          // Insert code block
          insertContentAfterBlock({
            type: 'executableCodeBlock',
            attrs: {
              language: task.result.language || 'javascript',
              executeable: true,
            },
            content: [{ type: 'text', text: task.result.code }]
          })
          
          // If there's execution output, insert it too
          if (task.result.execution) {
            insertContentAfterBlock({ type: 'paragraph' })
            insertContentAfterBlock({ type: 'heading', attrs: { level: 4 }, content: [{ type: 'text', text: 'Execution Result' }] })
            insertContentAfterBlock({ type: 'paragraph' })
            
            // Use executableCodeBlock instead of codeBlock as codeBlock is not defined in the editor schema
            insertContentAfterBlock({
              type: 'executableCodeBlock',
              attrs: { 
                language: 'console',
                executeable: true 
              },
              content: [{ type: 'text', text: getExecutionSummary(task.result.execution) }]
            })
          }
        } else {
          insertContentAfterBlock(task.result.toString())
        }
        break
        
      default:
        insertContentAfterBlock(
          typeof task.result === 'string' 
            ? task.result 
            : JSON.stringify(task.result, null, 2)
        )
    }
    
    // Add a final paragraph for spacing
    insertContentAfterBlock({ type: 'paragraph' })
    
    toast({
      title: 'Success',
      description: 'Task result has been inserted below the Vibe block'
    })
  } catch (error) {
    console.error('Error inserting result:', error)
    toast({
      variant: 'destructive',
      title: 'Error',
      description: 'Failed to insert result into document'
    })
  }
}

// Reset the Vibe block
function resetVibe() {
  console.log('Resetting Vibe block')
  
  // Clean up task executor if it exists
  if (taskExecutor.value) {
    console.log('Disposing task executor')
    taskExecutor.value.dispose()
    taskExecutor.value = null
  }
  
  props.updateAttributes({
    query: '',
    isActive: false,
    isLoading: false,
    taskBoardId: '',
    error: ''
  })
  
  queryText.value = ''
  boardTasks.value = []
  
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value)
    refreshInterval.value = null
  }
}

// Watch for changes to taskBoardId
watch(() => props.node.attrs.taskBoardId, async (newVal) => {
  if (newVal) {
    await loadBoardTasks()
  }
})

// Update the onMounted hook with more logging
onMounted(async () => {
  console.log('VibeBlock mounted with props:', props.node.attrs)
  console.log('queryText initial value:', queryText.value)
  
  // Initialize queryText from props if available
  if (props.node.attrs.query) {
    console.log('Setting queryText from props:', props.node.attrs.query)
    queryText.value = props.node.attrs.query
    console.log('queryText after setting from props:', queryText.value)
  }
  
  // If the block already has a board ID, load the tasks
  if (props.node.attrs.taskBoardId) {
    console.log('Block has taskBoardId, starting refresh interval')
    await startRefreshInterval()
  }
  
  // Load saved Jupyter config if available
  try {
    const savedConfig = localStorage.getItem('vibe-jupyter-config')
    if (savedConfig) {
      const parsedConfig = JSON.parse(savedConfig)
      // Try to find matching server and kernel
      if (parsedConfig.server && parsedConfig.kernel) {
        // Find server
        const server = jupyterStore.jupyterServers.find(
          s => s.ip === parsedConfig.server.ip && s.port === parsedConfig.server.port
        )
        
        if (server) {
          jupyterConfig.value.server = server
          
          // Load kernels for this server if needed
          const serverKey = `${server.ip}:${server.port}`
          if (!jupyterStore.kernels[serverKey] || jupyterStore.kernels[serverKey].length === 0) {
            // We need to refresh kernels before we can select one
            // This will happen asynchronously
            console.log('Loading kernels for saved server config')
          } else {
            // Find kernel by name
            const kernel = jupyterStore.kernels[serverKey].find(
              k => k.name === parsedConfig.kernel.name
            )
            
            if (kernel) {
              jupyterConfig.value.kernel = kernel
              console.log('Restored Jupyter config from localStorage')
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Failed to load saved Jupyter config:', error)
  }
})

onBeforeUnmount(() => {
  console.log('VibeBlock unmounting, clearing interval and disposing executor')
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value)
    refreshInterval.value = null
  }
  
  // Clean up task executor if it exists
  if (taskExecutor.value) {
    console.log('Disposing task executor on unmount')
    taskExecutor.value.dispose()
    taskExecutor.value = null
  }
})

// Update startRefreshInterval function to use VibeTaskExecutor with Jupyter config
const startRefreshInterval = async () => {
  console.log('Starting refresh interval')
  // Clear any existing interval
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value)
  }
  
  // Clean up any existing task executor
  if (taskExecutor.value) {
    console.log('Disposing existing task executor')
    taskExecutor.value.dispose()
    taskExecutor.value = null
  }
  
  // Load tasks initially
  await loadBoardTasks()
  
  // Start the task executor if we have a board ID
  if (props.node.attrs.taskBoardId) {
    try {
      // Verify board exists before creating the executor
      const board = await vibeStore.getBoard(props.node.attrs.taskBoardId)
      
      if (!board) {
        console.error(`Board ${props.node.attrs.taskBoardId} not found`)
        props.updateAttributes({
          error: `Board not found. It may have been deleted or never created.`
        })
        return
      }
      
      // Create a task executor for this board with Jupyter configuration
      taskExecutor.value = new VibeTaskExecutor(
        props.node.attrs.taskBoardId, 
        props.editor,
        jupyterConfig.value
      )
      
      // Execute tasks asynchronously
      taskExecutor.value.executeAllTasks().catch(error => {
        console.error('Error executing tasks:', error)
        // Only update error if it's not already set
        if (!props.node.attrs.error) {
          props.updateAttributes({
            error: `Error executing tasks: ${error.message}`
          })
        }
      })
    } catch (error) {
      console.error('Error in startRefreshInterval:', error)
      props.updateAttributes({
        error: `Error starting task execution: ${error.message}`
      })
      return
    }
  }
  
  // Set up polling to refresh task status
  refreshInterval.value = setInterval(() => {
    loadBoardTasks()
  }, 5000) // Check every 5 seconds
}

// Improve onButtonClick function with better logging and string handling
const onButtonClick = async (event) => {
  // Prevent default behavior
  if (event) {
    event.preventDefault()
    event.stopPropagation()
  }
  
  // Force queryText to be a string and handle potential null/undefined
  queryText.value = String(queryText.value || '').trim()
  
  // Log detailed information about the event and state
  console.log('Button clicked, event type:', event?.type)
  console.log('queryText value after trim:', JSON.stringify(queryText.value))
  console.log('queryText length:', queryText.value.length)
  console.log('queryText type:', typeof queryText.value)
  
  // Call activateVibe
  await activateVibe()
}

// Add a watch for queryText to debug binding issues
watch(queryText, (newVal, oldVal) => {
  console.log('queryText changed:', { 
    newVal, 
    oldVal, 
    length: newVal?.length || 0, 
    isEmpty: !newVal || newVal.length === 0 
  })
}, { immediate: true })

// Update activateVibe to use await with startRefreshInterval and store Jupyter config
const activateVibe = async () => {
  console.log('activateVibe called with query:', JSON.stringify(queryText.value))
  
  if (!vibeStore) {
    console.error('VibeStore is not available')
    toast({
      variant: 'destructive',
      title: 'Error',
      description: 'Store not available'
    })
    return
  }
  
  // Do an explicit check for empty string after trimming
  const trimmedQuery = (queryText.value || '').trim()
  if (!trimmedQuery) {
    console.log('Query is empty after trimming, showing toast')
    toast({
      variant: 'destructive',
      title: 'Error',
      description: 'Please enter a task'
    })
    return
  }

  try {
    // Use the trimmed query for the rest of the function
    const query = trimmedQuery
    
    // First update the node to show loading state
    props.updateAttributes({
      isActive: true,
      isLoading: true,
      query: query,
      error: ''
    })
    
    loadingMessage.value = 'Creating your Vibe board...'
    console.log('Creating board for query:', query)
    
    // Store Jupyter configuration information for the API
    const jupyterInfo = jupyterConfig.value.server && jupyterConfig.value.kernel 
      ? {
          server: {
            ip: jupyterConfig.value.server.ip,
            port: jupyterConfig.value.server.port,
            token: jupyterConfig.value.server.token
          },
          kernel: {
            name: jupyterConfig.value.kernel.name,
            displayName: jupyterConfig.value.kernel.spec.display_name
          }
        }
      : null
      
    // Create the board with Jupyter info
    const board = await vibeStore.createBoard({ 
      query,
      jupyterConfig: jupyterInfo
    })
    
    console.log('Board created:', board)
    
    if (!board) {
      console.error('Board creation failed - returned undefined')
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to create board'
      })
      props.updateAttributes({
        isLoading: false,
        error: 'Failed to create board'
      })
      loadingMessage.value = ''
      return
    }
    
    // Create a composer task that will orchestrate the entire process
    loadingMessage.value = 'Setting up task orchestration...'
    
    // Add Jupyter config information to the task metadata if available
    const taskMetadata = jupyterInfo ? { jupyterConfig: jupyterInfo } : undefined
    
    const composerTask = await vibeStore.createTask(board.id, {
      title: 'Orchestrate tasks',
      description: query,
      actorType: ActorType.COMPOSER,
      dependencies: [],
      metadata: taskMetadata
    })
    
    // Update block attributes with board ID
    console.log('Updating node attributes with board ID:', board.id)
    props.updateAttributes({
      taskBoardId: board.id,
      isLoading: false
    })
    
    toast({
      title: 'Success',
      description: 'Created orchestration task to plan and execute your request'
    })
    
    // Start refresh interval to update tasks
    await startRefreshInterval()
  } catch (error) {
    console.error('Error in activateVibe:', error)
    props.updateAttributes({
      isLoading: false,
      error: error instanceof Error ? error.message : String(error)
    })
    toast({
      variant: 'destructive',
      title: 'Error',
      description: error instanceof Error ? error.message : 'Failed to create Vibe board'
    })
    loadingMessage.value = ''
  }
}

// Reset task execution if it gets stuck
async function resetTaskExecution() {
  try {
    console.log('Attempting to reset task execution')
    
    if (!taskExecutor.value) {
      console.warn('No task executor available to reset')
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Cannot reset execution - no active executor'
      })
      return
    }
    
    // Reset the task executor state
    taskExecutor.value.resetState()
    
    // Reset any in_progress tasks back to pending
    const inProgressTasks = boardTasks.value.filter(task => task.status === 'in_progress')
    if (inProgressTasks.length > 0) {
      console.log(`Resetting ${inProgressTasks.length} in-progress tasks back to pending`)
      
      for (const task of inProgressTasks) {
        await vibeStore.updateTask(props.node.attrs.taskBoardId, task.id, {
          status: 'pending'
        })
      }
    }
    
    // Restart task execution
    await taskExecutor.value.executeAllTasks()
    
    // Refresh the task list
    await refreshTasks()
    
    toast({
      title: 'Execution Reset',
      description: 'Task execution has been reset and will continue'
    })
  } catch (error) {
    console.error('Error resetting task execution:', error)
    toast({
      variant: 'destructive',
      title: 'Error',
      description: 'Failed to reset execution: ' + (error.message || 'Unknown error')
    })
  }
}

// Handle task graph node click
function handleTaskGraphNodeClick(taskId) {
  selectedTaskId.value = taskId
  
  // Expand the task in the tasks tab
  if (!expandedTaskIds.value.includes(taskId)) {
    expandedTaskIds.value.push(taskId)
  }
  
  // Find the tab element and programmatically select it
  const tabsElement = document.querySelector('[data-tabs-root]')
  if (tabsElement) {
    // Find the tasks tab trigger and simulate a click
    const tabsTrigger = tabsElement.querySelector('[data-value="tasks"]')
    if (tabsTrigger) {
      tabsTrigger.click()
    }
  }
  
  // Scroll to the task element after a short delay to ensure DOM is updated
  setTimeout(() => {
    const element = document.getElementById(`task-${taskId}`)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, 100)
}

// Toggle task expansion function
function toggleTask(taskId) {
  const index = expandedTaskIds.value.indexOf(taskId)
  if (index === -1) {
    expandedTaskIds.value.push(taskId)
  } else {
    expandedTaskIds.value.splice(index, 1)
  }
  
  // Update selected task if we're expanding
  if (index === -1) {
    selectedTaskId.value = taskId
  } else if (selectedTaskId.value === taskId) {
    selectedTaskId.value = null
  }
}

// Get dependency title
function getDependencyTitle(depId) {
  const depTask = boardTasks.value.find(t => t.id === depId)
  return depTask ? depTask.title : `Task ${depId.substring(0, 8)}...`
}

// Select a dependency task
function selectDependency(depId) {
  // Set as selected task
  selectedTaskId.value = depId
  
  // Expand the task
  if (!expandedTaskIds.value.includes(depId)) {
    expandedTaskIds.value.push(depId)
  }
  
  // Scroll to the task
  setTimeout(() => {
    const element = document.getElementById(`task-${depId}`)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, 100)
}

// Format date
function formatDate(dateString) {
  const date = new Date(dateString)
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// Calculate duration between two dates
function calculateDuration(start, end) {
  const startDate = new Date(start)
  const endDate = new Date(end)
  const durationMs = endDate.getTime() - startDate.getTime()
  
  // Format as minutes and seconds
  const seconds = Math.floor(durationMs / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  
  return `${minutes}m ${remainingSeconds}s`
}

// Get actor name for display
function getActorName(actorType) {
  switch (actorType) {
    case ActorType.RESEARCHER: return 'Researcher'
    case ActorType.ANALYST: return 'Analyst'
    case ActorType.CODER: return 'Coder'
    case ActorType.PLANNER: return 'Planner'
    case ActorType.COMPOSER: return 'Composer'
    default: return actorType
  }
}

// Show task details modal
function showTaskDetailsModal(task) {
  selectedTaskForModal.value = task
  
  // Initialize mermaid after the modal is shown
  nextTick(() => {
    if (window.mermaid) {
      try {
        window.mermaid.init('.mermaid')
      } catch (error) {
        console.error('Failed to initialize mermaid:', error)
      }
    }
  })
}

// Get research summary
function getResearchSummary(task) {
  if (task.result && typeof task.result === 'object' && task.result.summary) {
    return task.result.summary
  }
  return null
}

// Get research key findings
function getResearchKeyFindings(task) {
  if (task.result && typeof task.result === 'object' && task.result.keyFindings) {
    return task.result.keyFindings
  }
  return null
}

// Get research content
function getResearchContent(task) {
  if (task.result && typeof task.result === 'object' && task.result.content) {
    return task.result.content
  }
  return null
}

// Get analysis summary
function getAnalysisSummary(task) {
  if (task.result && typeof task.result === 'object' && task.result.summary) {
    return task.result.summary
  }
  return null
}

// Get analysis insights
function getAnalysisInsights(task) {
  if (task.result && typeof task.result === 'object' && task.result.insights) {
    return task.result.insights
  }
  return null
}

// Get analysis visualizations
function getAnalysisVisualizations(task) {
  if (task.result && typeof task.result === 'object' && task.result.visualizations) {
    return task.result.visualizations
  }
  return null
}

// Get coder language
function getCoderLanguage(task) {
  if (task.result && typeof task.result === 'object' && task.result.language) {
    return task.result.language
  }
  return null
}

// Get coder code
function getCoderCode(task) {
  if (task.result && typeof task.result === 'object' && task.result.code) {
    return task.result.code
  }
  return null
}

// Format task result
function formatTaskResult(result) {
  if (typeof result === 'string') {
    return result
  } else if (typeof result === 'object') {
    return JSON.stringify(result, null, 2)
  }
  return 'Result format not recognized'
}

// Get coder code from result
function getCoderCodeFromResult(task) {
  if (task.result && typeof task.result === 'object' && task.result.code) {
    return task.result.code
  }
  return null
}

// Get coder execution from result
function getCoderExecutionFromResult(task) {
  if (task.result && typeof task.result === 'object' && task.result.execution) {
    return task.result.execution
  }
  return null
}

// Get coder retry info
function getCoderRetryInfo(task) {
  if (task.result && typeof task.result === 'object' && task.result.retryInfo) {
    return task.result.retryInfo
  }
  return null
}

// Get table columns
function getTableColumns(data) {
  if (!data) return []
  
  // If data has a columns property, use that
  if (data.columns) return data.columns
  
  // If data has explicit headers property, use that
  if (data.headers && Array.isArray(data.headers)) return data.headers
  
  // Make sure we have an array to work with
  let rows = data
  
  // If data has rows property that's an array, use that
  if (data.rows && Array.isArray(data.rows)) {
    rows = data.rows
  }
  
  // If data is not an array yet, try to make it one
  if (!Array.isArray(rows)) {
    // If it's an object (but not an array), make it a single-item array
    if (rows && typeof rows === 'object') {
      rows = [rows]
    } else {
      // Can't extract columns from this data
      return []
    }
  }
  
  // If data is an array of objects, get all unique keys
  if (rows.length > 0) {
    const columns = new Set()
    rows.forEach(row => {
      if (row && typeof row === 'object') {
        Object.keys(row).forEach(key => columns.add(key))
      }
    })
    return Array.from(columns)
  }
  
  return []
}

// Planner helper functions
function getPlannerMainGoal(task) {
  if (task.result && typeof task.result === 'object' && task.result.plan && task.result.plan.mainGoal) {
    return task.result.plan.mainGoal
  }
  return null
}

function getPlannerTasks(task) {
  if (task.result && typeof task.result === 'object' && task.result.plan && Array.isArray(task.result.plan.tasks)) {
    return task.result.plan.tasks
  }
  return null
}

function getPlanSummary(task) {
  if (task.result && typeof task.result === 'object' && task.result.summary) {
    return task.result.summary
  }
  return null
}

// Get selected task
function getSelectedTask() {
  return boardTasks.value.find(task => task.id === selectedTaskId.value)
}
</script>

<style>
.vibe-block {
  @apply border rounded-md my-2 overflow-hidden shadow-sm bg-card text-card-foreground;
}

.vibe-header {
  @apply flex p-3 cursor-pointer items-center bg-muted/20 border-b;
}

.vibe-title {
  @apply flex-1 font-medium flex items-center;
}

.vibe-status {
  @apply mr-2 flex items-center;
}

.vibe-content {
  @apply p-4;
}

.vibe-description {
  @apply text-muted-foreground mb-3;
}
</style> 