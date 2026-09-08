import{S as L,K as w,l as c,M as p,C as u,U as v}from"./index-C5OMlyxE.js";const M=L("editorAiActions",()=>{const t=w({customActions:[],providerSettings:{provider:"gemini",apiKeys:{},maxTokens:2048,temperature:.3,retryFailedRequests:!0,cacheResponses:!0,enabledFeatures:{rewriteWithAI:!0,fixGrammar:!0,improveWriting:!0,summarizeText:!0,translateText:!0,changeWritingStyle:!0,codeExplanation:!0,errorAnalysis:!0,securityAnalysis:!0,performanceAnalysis:!0,codeTransformation:!0,autoAnalyzeErrors:!0,enableCodeSuggestions:!0,showComplexityBadges:!0,customActions:!0}},errorTriggerConfig:{autoTrigger:!0,showQuickFix:!0,showExplanation:!0,suggestedActions:[]},isLoading:!1,lastError:null}),l=c(()=>t.customActions.filter(e=>e.isEnabled)),h=c(()=>{const e={analysis:[],transformation:[],generation:[],debugging:[]};return l.value.forEach(n=>{e[n.category].push(n)}),e}),m=c(()=>l.value.filter(e=>e.prompt.includes("{{code}}")||["explain-code","fix-error","optimize-performance","add-documentation","security-review","generate-tests","refactor-code","add-types","convert-language","minify-code","format-code"].includes(e.id))),I=c(()=>l.value.filter(e=>e.prompt.includes("{{text}}")&&!e.prompt.includes("{{code}}"))),x=c(()=>{const e={analysis:[],transformation:[],generation:[],debugging:[]};return m.value.forEach(n=>{e[n.category].push(n)}),e}),f=c(()=>t.errorTriggerConfig.suggestedActions.map(e=>t.customActions.find(n=>n.id===e)).filter(Boolean)),g=[{id:"rewrite-with-ai",name:"Rewrite with AI",description:"Rewrite text with AI assistance",icon:"Edit",prompt:`Please rewrite the following text to improve clarity and flow:

{{text}}`,category:"transformation",isBuiltIn:!0,isEnabled:!0,outputType:"text",createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()},{id:"fix-grammar",name:"Fix Grammar",description:"Fix grammar and spelling errors",icon:"CheckCircle",prompt:`Please fix any grammar and spelling errors in the following text:

{{text}}`,category:"transformation",isBuiltIn:!0,isEnabled:!0,outputType:"text",createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()},{id:"improve-writing",name:"Improve Writing",description:"Improve writing style and clarity",icon:"FileText",prompt:`Please improve the writing style and clarity of the following text:

{{text}}`,category:"transformation",isBuiltIn:!0,isEnabled:!0,outputType:"text",createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()},{id:"summarize-text",name:"Summarize",description:"Create a concise summary",icon:"FileText",prompt:`Please provide a concise summary of the following text:

{{text}}`,category:"analysis",isBuiltIn:!0,isEnabled:!0,outputType:"text",createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()},{id:"explain-code",name:"Explain Code",description:"Get a comprehensive explanation of what the code does",icon:"MessageCircle",prompt:`Please explain this {{language}} code in detail:

\`\`\`{{language}}
{{code}}
\`\`\`

Provide:
1. A brief summary
2. Step-by-step explanation
3. Key concepts used
4. Complexity assessment`,category:"analysis",isBuiltIn:!0,isEnabled:!0,outputType:"markdown",createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()},{id:"fix-error",name:"Fix Error",description:"Analyze and fix code execution errors with full context",icon:"Wrench",prompt:`This {{language}} code has an execution error:

\`\`\`{{language}}
{{code}}
\`\`\`

Error message:
{{error}}

**Please provide a comprehensive analysis:**

1. **Root Cause Analysis**: What exactly went wrong and why?
2. **Corrected Code**: The fixed version with clear annotations
3. **Fix Explanation**: Step-by-step explanation of the changes made
4. **Prevention Tips**: How to avoid this error in the future
5. **Testing Verification**: How to test that the fix works

**Format your response with clear sections and include the corrected code in a code block.**`,category:"debugging",isBuiltIn:!0,isEnabled:!0,outputType:"code",createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()},{id:"optimize-performance",name:"Optimize Performance",description:"Optimize code for better performance",icon:"Zap",prompt:`Please optimize this {{language}} code for better performance:

\`\`\`{{language}}
{{code}}
\`\`\`

Provide:
1. Optimized code
2. Explanation of optimizations
3. Expected performance improvement`,category:"transformation",isBuiltIn:!0,isEnabled:!0,outputType:"code",createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()},{id:"add-documentation",name:"Add Documentation",description:"Add comprehensive comments and documentation",icon:"FileText",prompt:`Please add comprehensive documentation to this {{language}} code:

\`\`\`{{language}}
{{code}}
\`\`\`

Include:
1. Function/class documentation
2. Inline comments for complex logic
3. Parameter descriptions
4. Return value descriptions`,category:"transformation",isBuiltIn:!0,isEnabled:!0,outputType:"code",createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()},{id:"security-review",name:"Security Review",description:"Analyze code for security vulnerabilities",icon:"Shield",prompt:`Please perform a security review of this {{language}} code:

\`\`\`{{language}}
{{code}}
\`\`\`

Check for:
1. Common vulnerabilities (injection, XSS, etc.)
2. Input validation issues
3. Authentication/authorization problems
4. Provide secure alternatives`,category:"analysis",isBuiltIn:!0,isEnabled:!0,outputType:"markdown",createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()},{id:"generate-tests",name:"Generate Tests",description:"Generate unit tests for the code",icon:"TestTube",prompt:`Please generate comprehensive unit tests for this {{language}} code:

\`\`\`{{language}}
{{code}}
\`\`\`

Include:
1. Test cases for normal operation
2. Edge cases and error conditions
3. Mock data where needed
4. Clear test descriptions`,category:"generation",isBuiltIn:!0,isEnabled:!0,outputType:"code",createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()},{id:"refactor-code",name:"Refactor Code",description:"Refactor code for better structure and readability",icon:"RefreshCw",prompt:`Please refactor this {{language}} code to improve structure, readability, and maintainability:

\`\`\`{{language}}
{{code}}
\`\`\`

Provide:
1. Refactored code with better structure
2. Explanation of improvements made
3. Benefits of the refactoring
4. Any design patterns applied`,category:"transformation",isBuiltIn:!0,isEnabled:!0,outputType:"code",createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()},{id:"add-types",name:"Add Type Annotations",description:"Add type annotations and improve type safety",icon:"FileText",prompt:`Please add comprehensive type annotations to this {{language}} code:

\`\`\`{{language}}
{{code}}
\`\`\`

Provide:
1. Code with proper type annotations
2. Interface/type definitions if needed
3. Explanation of type choices
4. Benefits for type safety`,category:"transformation",isBuiltIn:!0,isEnabled:!0,outputType:"code",createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()},{id:"convert-language",name:"Convert to Another Language",description:"Convert code to a different programming language",icon:"ArrowLeftRight",prompt:`Please convert this {{language}} code to Python (or specify target language):

\`\`\`{{language}}
{{code}}
\`\`\`

Provide:
1. Equivalent code in the target language
2. Explanation of key differences
3. Language-specific best practices applied
4. Any libraries or imports needed`,category:"transformation",isBuiltIn:!0,isEnabled:!0,outputType:"code",createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()},{id:"analyze-complexity",name:"Analyze Complexity",description:"Analyze algorithmic complexity and suggest optimizations",icon:"TrendingUp",prompt:`Please analyze the algorithmic complexity of this {{language}} code:

\`\`\`{{language}}
{{code}}
\`\`\`

Provide:
1. Time complexity (Big O notation)
2. Space complexity analysis
3. Bottlenecks identification
4. Optimization suggestions
5. Alternative algorithms if applicable`,category:"analysis",isBuiltIn:!0,isEnabled:!0,outputType:"markdown",createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()},{id:"code-review",name:"Code Review",description:"Perform comprehensive code review with suggestions",icon:"Eye",prompt:`Please perform a comprehensive code review of this {{language}} code:

\`\`\`{{language}}
{{code}}
\`\`\`

Review for:
1. Code quality and best practices
2. Potential bugs or issues
3. Performance considerations
4. Maintainability and readability
5. Specific language conventions
6. Suggestions for improvement`,category:"analysis",isBuiltIn:!0,isEnabled:!0,outputType:"markdown",createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()},{id:"chat-followup",name:"Chat Follow-up",description:"Continue conversation about code or analysis",icon:"MessageCircle",prompt:"{{chatContext}}",category:"analysis",isBuiltIn:!0,isEnabled:!0,outputType:"markdown",createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}],y=()=>{const e=(r,o)=>{const s=localStorage.getItem(r);if(!s)return!1;try{return o(JSON.parse(s)),!0}catch(i){return localStorage.removeItem(r),u.error(`Failed to load ${r}:`,i),!1}};e("ai-code-preferences",r=>{const o=v(r);t.providerSettings={...t.providerSettings,...o,apiKeys:{}},localStorage.setItem("ai-code-preferences",JSON.stringify(o))}),e("ai-custom-actions",r=>{if(!Array.isArray(r))throw new Error("Custom AI actions must be an array");t.customActions=[...g,...r]})||(t.customActions=[...g]),e("ai-error-trigger-config",r=>{if(!r||typeof r!="object"||Array.isArray(r))throw new Error("AI error trigger config must be an object");t.errorTriggerConfig={...t.errorTriggerConfig,...r}});try{p.setDefaultProviderId(t.providerSettings.provider)}catch(r){u.error("Failed to apply AI provider settings:",r)}},a=()=>{try{localStorage.setItem("ai-code-preferences",JSON.stringify(v(t.providerSettings)));const e=t.customActions.filter(n=>!n.isBuiltIn);localStorage.setItem("ai-custom-actions",JSON.stringify(e)),localStorage.setItem("ai-error-trigger-config",JSON.stringify(t.errorTriggerConfig)),p.setDefaultProviderId(t.providerSettings.provider)}catch(e){u.error("Failed to save AI settings:",e)}},b=e=>{t.providerSettings={...t.providerSettings,...e},a()},E=e=>{t.errorTriggerConfig={...t.errorTriggerConfig,...e},a()},T=e=>{const n={...e,id:`custom-${Date.now()}-${Math.random().toString(36).slice(2)}`,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};return t.customActions.push(n),a(),n},P=(e,n)=>{const r=t.customActions.findIndex(o=>o.id===e);r!==-1&&(t.customActions[r]={...t.customActions[r],...n,updatedAt:new Date().toISOString()},a())},O=e=>{const n=t.customActions.findIndex(r=>r.id===e&&!r.isBuiltIn);n!==-1&&(t.customActions.splice(n,1),a())},C=e=>{const n=t.customActions.find(r=>r.id===e);n&&(n.isEnabled=!n.isEnabled,n.updatedAt=new Date().toISOString(),a())},D=async(e,n)=>{const r=t.customActions.find(i=>i.id===e);if(!r)throw new Error(`Action ${e} not found`);const o=t.providerSettings.provider,s=t.providerSettings.apiKeys[o];if(o==="gemini"&&!s)throw new Error(`API key is required for ${o} provider. Please configure your API key in Settings > AI Assistant > AI Providers.`);if(o==="openai"&&!s)throw new Error(`API key is required for ${o} provider. Please configure your API key in Settings > AI Assistant > AI Providers.`);if(o==="webllm"&&!(t.providerSettings.webllmAutoLoad??!0))throw new Error("WebLLM auto-loading is disabled. Please enable auto-loading or manually load a model in Settings > AI Assistant > AI Providers.");t.isLoading=!0,t.lastError=null;try{const i=n.executionTime?`

Execution Metadata:
- Execution Time: ${n.executionTime}ms
- Session: ${n.sessionId||"None"}
- Kernel: ${n.kernelName||"Unknown"}
- Has Output: ${n.hasOutput?"Yes":"No"}`:"",d=n.cellOutput?`

Current Output:
${n.cellOutput}`:"";let S=r.prompt.replace(/\{\{code\}\}/g,n.code||"").replace(/\{\{language\}\}/g,n.language||"").replace(/\{\{error\}\}/g,n.error||"").replace(/\{\{text\}\}/g,n.text||"").replace(/\{\{chatContext\}\}/g,n.chatContext||"");return(r.id==="fix-error"||r.category==="debugging")&&(i||d)&&(S+=i+d),(await p.generateText(o,{prompt:S,maxTokens:t.providerSettings.maxTokens,temperature:t.providerSettings.temperature},s)).text}catch(i){const d=i instanceof Error?i.message:"Unknown error";throw t.lastError=d,o==="webllm"&&d.includes("not initialized")?(u.error(`WebLLM initialization failed for action ${e}:`,i),new Error("WebLLM model not initialized. Please go to Settings > AI Assistant > AI Providers and load a WebLLM model, or select a different AI provider.")):(u.error(`Failed to execute action ${e}:`,i),i)}finally{t.isLoading=!1}},k=()=>[t.customActions.find(e=>e.id==="fix-error"),t.customActions.find(e=>e.id==="explain-code"),...f.value].filter(Boolean),A=()=>{const e=t.providerSettings.provider,n=t.providerSettings.apiKeys[e];switch(e){case"gemini":case"openai":return!!n;case"webllm":return t.providerSettings.webllmAutoLoad??!0;case"ollama":return!0;default:return!1}},B=()=>{const e=t.providerSettings.provider;if(A())return null;switch(e){case"gemini":return"Please configure your Gemini API key in Settings > AI Assistant > AI Providers to use AI features.";case"openai":return"Please configure your OpenAI API key in Settings > AI Assistant > AI Providers to use AI features.";case"webllm":return"WebLLM auto-loading is disabled. Please enable auto-loading in Settings > AI Assistant > AI Providers or manually load a model to use AI features.";default:return`Provider ${e} is not properly configured. Please check your settings.`}},z=()=>{t.providerSettings={provider:"gemini",apiKeys:{},maxTokens:2048,temperature:.3,retryFailedRequests:!0,cacheResponses:!0,enabledFeatures:{rewriteWithAI:!0,fixGrammar:!0,improveWriting:!0,summarizeText:!0,translateText:!0,changeWritingStyle:!0,codeExplanation:!0,errorAnalysis:!0,securityAnalysis:!0,performanceAnalysis:!0,codeTransformation:!0,autoAnalyzeErrors:!0,enableCodeSuggestions:!0,showComplexityBadges:!0,customActions:!0}},t.errorTriggerConfig={autoTrigger:!0,showQuickFix:!0,showExplanation:!0,suggestedActions:[]},t.customActions=[...g],a()};return y(),{state:w(t),enabledCustomActions:l,categorizedActions:h,codeActions:m,textActions:I,codeActionsByCategory:x,errorSuggestedActions:f,loadSettings:y,saveSettings:a,updateProviderSettings:b,updateErrorTriggerConfig:E,addCustomAction:T,updateCustomAction:P,deleteCustomAction:O,toggleActionEnabled:C,executeCustomAction:D,getQuickErrorActions:k,isProviderConfigured:A,getProviderConfigurationMessage:B,resetToDefaults:z}});export{M as u};
