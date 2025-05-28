<script setup lang="ts">
import { ref, computed } from 'vue'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Plus, 
  FileText, 
  Code2, 
  Lightbulb, 
  BookOpen, 
  Zap,
  Import,
  Download,
  Search,
  Tag,
  Clock,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  ChefHat,
  MapPin
} from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { useNotaStore } from '@/stores/nota'

// Types
interface Template {
  id: string
  title: string
  description: string
  icon: any
  color: string
  template: string
}

interface QuickAction {
  id: string
  title: string
  description: string
  icon: any
  color: string
  action: () => void
}

const router = useRouter()
const store = useNotaStore()

const emit = defineEmits<{
  (e: 'create-nota'): void
  (e: 'import-notas'): void
  (e: 'export-notas'): void
}>()

const props = defineProps<{
  notas: any[]
}>()

// Constants
const CURRENT_DATE = new Date().toLocaleDateString()
const NEXT_WEEK_DATE = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()
const CURRENT_TIME = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
const CURRENT_YEAR = new Date().getFullYear()

// Quick action templates
const templates: Template[] = [
  {
    id: 'meeting-notes',
    title: 'Meeting Notes',
    description: 'Comprehensive meeting documentation',
    icon: FileText,
    color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600',
    template: `# Meeting Notes - ${CURRENT_DATE}

## Meeting Details
- **Date:** ${CURRENT_DATE}
- **Time:** ${CURRENT_TIME}
- **Duration:** 
- **Location/Platform:** 
- **Meeting Type:** [ ] Standup [ ] Planning [ ] Review [ ] Other: ___

## Attendees
### Present
- 
- 

### Absent
- 

## Agenda
1. 
2. 
3. 

## Discussion Points
### Key Topics Discussed
- 

### Decisions Made
- [ ] Decision 1
- [ ] Decision 2

### Open Issues
- [ ] Issue 1 - Owner: ___ - Due: ___
- [ ] Issue 2 - Owner: ___ - Due: ___

## Action Items
- [ ] Action 1 - **Owner:** ___ - **Due:** ${NEXT_WEEK_DATE}
- [ ] Action 2 - **Owner:** ___ - **Due:** ___
- [ ] Action 3 - **Owner:** ___ - **Due:** ___

## Next Steps
- 
- 

## Follow-up
- **Next Meeting:** 
- **Preparation Required:** 

## Notes & Comments
- 

## Tags
#meeting #notes #${CURRENT_DATE.replace(/\//g, '-')}`
  },
  {
    id: 'code-snippet',
    title: 'Code Documentation',
    description: 'Document and explain code with context',
    icon: Code2,
    color: 'bg-green-50 dark:bg-green-900/20 text-green-600',
    template: `# Code Documentation - [Function/Feature Name]

## Overview
Brief description of what this code accomplishes and its purpose.

## Language & Framework
- **Language:** 
- **Framework/Library:** 
- **Version:** 

## Code Block
\`\`\`javascript
// Add your code here
function exampleFunction(param1, param2) {
  // Implementation details
  return result;
}
\`\`\`

## Parameters
| Parameter | Type | Description | Required |
|-----------|------|-------------|----------|
| param1    |      |             | Yes/No   |
| param2    |      |             | Yes/No   |

## Return Value
- **Type:** 
- **Description:** 

## Usage Examples
\`\`\`javascript
// Example 1: Basic usage
const result = exampleFunction('value1', 'value2');

// Example 2: Advanced usage
const advancedResult = exampleFunction(complexParam1, complexParam2);
\`\`\`

## Dependencies
- 
- 

## Performance Notes
- 
- 

## Error Handling
- 
- 

## Testing
\`\`\`javascript
// Test cases
describe('exampleFunction', () => {
  test('should handle basic input', () => {
    // Test implementation
  });
});
\`\`\`

## Related Code
- 
- 

## Changelog
- **${CURRENT_DATE}:** Initial implementation

## Tags
#code #documentation #programming`
  },
  {
    id: 'learning-notes',
    title: 'Learning & Study Notes',
    description: 'Structured learning documentation',
    icon: BookOpen,
    color: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600',
    template: `# Learning Notes - [Topic/Subject]

## Learning Session
- **Date:** ${CURRENT_DATE}
- **Duration:** 
- **Source:** Book/Course/Video/Article
- **Chapter/Section:** 

## Learning Objectives
What did I want to learn?
- [ ] Objective 1
- [ ] Objective 2
- [ ] Objective 3

## Key Concepts
### Main Ideas
1. **Concept 1:** Description and explanation
2. **Concept 2:** Description and explanation
3. **Concept 3:** Description and explanation

### Important Definitions
- **Term 1:** Definition
- **Term 2:** Definition

## Examples & Applications
\`\`\`
// Code examples or practical applications
example here
\`\`\`

### Real-world Use Cases
- 
- 

## Questions & Clarifications
### Questions I Have
- [ ] Question 1
- [ ] Question 2

### Things to Research Further
- 
- 

## Connection to Previous Learning
How does this relate to what I already know?
- 
- 

## Practice Exercises
- [ ] Exercise 1: 
- [ ] Exercise 2: 
- [ ] Exercise 3: 

## Summary & Key Takeaways
What are the most important points I learned?
1. 
2. 
3. 

## Next Steps
- [ ] Review concepts in ___
- [ ] Practice with ___
- [ ] Research ___

## Resources
- [Primary Source](url)
- [Additional Reading](url)
- [Video Tutorial](url)

## Tags
#learning #study #notes #education`
  },
  {
    id: 'idea-capture',
    title: 'Idea Development',
    description: 'Comprehensive idea documentation and development',
    icon: Lightbulb,
    color: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600',
    template: `# Idea Development - [Idea Title]

## The Core Idea
### Brief Description
One-line summary of the idea.

### Detailed Explanation
Comprehensive description of what this idea entails.

## Context & Inspiration
### What Sparked This Idea?
- 
- 

### Current Problem It Solves
- 
- 

## Why This Matters
### Potential Impact
- **Personal:** 
- **Professional:** 
- **Community:** 

### Unique Value Proposition
What makes this different from existing solutions?
- 
- 

## Implementation Strategy
### Phase 1: Foundation
- [ ] Step 1
- [ ] Step 2
- [ ] Step 3

### Phase 2: Development
- [ ] Step 1
- [ ] Step 2

### Phase 3: Execution
- [ ] Step 1
- [ ] Step 2

## Resource Requirements
### Time Investment
- **Research:** ___ hours
- **Planning:** ___ hours
- **Implementation:** ___ hours

### Skills Needed
- 
- 

### Tools/Materials Required
- 
- 

## Potential Challenges
| Challenge | Impact | Mitigation Strategy |
|-----------|--------|-------------------|
|           | H/M/L  |                   |
|           | H/M/L  |                   |

## Success Metrics
How will I know this idea is successful?
- [ ] Metric 1: 
- [ ] Metric 2: 
- [ ] Metric 3: 

## Related Ideas & Connections
- 
- 

## Feedback & Iterations
### People to Consult
- 
- 

### Questions to Ask
- 
- 

## Next Actions
- [ ] Action 1 - Due: ___
- [ ] Action 2 - Due: ___
- [ ] Action 3 - Due: ___

## Tags
#idea #innovation #brainstorm #development`
  },
  {
    id: 'project-planning',
    title: 'Project Blueprint',
    description: 'Comprehensive project planning template',
    icon: Target,
    color: 'bg-red-50 dark:bg-red-900/20 text-red-600',
    template: `# Project Blueprint - [Project Name]

## Project Overview
### Vision Statement
What is the ultimate goal of this project?

### Problem Statement
What problem are we solving?

### Success Definition
How will we know the project is successful?

## Project Details
- **Project Manager:** 
- **Start Date:** ${CURRENT_DATE}
- **Target Completion:** 
- **Budget:** 
- **Priority:** [ ] High [ ] Medium [ ] Low

## Stakeholders
### Internal Team
| Name | Role | Responsibilities | Contact |
|------|------|-----------------|---------|
|      |      |                 |         |

### External Stakeholders
- **Client/Customer:** 
- **Sponsors:** 
- **End Users:** 

## Scope & Objectives
### In Scope
- [ ] Deliverable 1
- [ ] Deliverable 2
- [ ] Deliverable 3

### Out of Scope
- 
- 

### SMART Goals
1. **Specific:** 
   **Measurable:** 
   **Achievable:** 
   **Relevant:** 
   **Time-bound:** 

## Project Phases & Timeline
### Phase 1: Planning (Duration: ___)
- [ ] Milestone 1.1 - Due: ___
- [ ] Milestone 1.2 - Due: ___

### Phase 2: Execution (Duration: ___)
- [ ] Milestone 2.1 - Due: ___
- [ ] Milestone 2.2 - Due: ___

### Phase 3: Testing (Duration: ___)
- [ ] Milestone 3.1 - Due: ___
- [ ] Milestone 3.2 - Due: ___

### Phase 4: Deployment (Duration: ___)
- [ ] Milestone 4.1 - Due: ___
- [ ] Milestone 4.2 - Due: ___

## Resources & Requirements
### Human Resources
- 
- 

### Technical Requirements
- 
- 

### Tools & Software
- 
- 

### Budget Breakdown
| Category | Estimated Cost | Actual Cost |
|----------|---------------|-------------|
|          |               |             |

## Risk Management
| Risk | Probability | Impact | Mitigation Plan | Owner |
|------|-------------|--------|----------------|-------|
|      | H/M/L       | H/M/L  |                |       |

## Communication Plan
### Regular Updates
- **Daily Standups:** 
- **Weekly Reports:** 
- **Monthly Reviews:** 

### Reporting Structure
- 
- 

## Quality Assurance
### Testing Strategy
- 
- 

### Acceptance Criteria
- [ ] Criteria 1
- [ ] Criteria 2

## Post-Project
### Lessons Learned
(To be filled after completion)

### Future Enhancements
- 
- 

## Tags
#project #planning #management #${CURRENT_YEAR}`
  },
  {
    id: 'daily-journal',
    title: 'Daily Reflection',
    description: 'Structured daily reflection and planning',
    icon: Clock,
    color: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600',
    template: `# Daily Reflection - ${CURRENT_DATE}

## Morning Intention
### Today's Theme
What kind of day do I want to have?

### Top 3 Priorities
1. **Priority 1:** 
2. **Priority 2:** 
3. **Priority 3:** 

### Energy Level
[ ] High [ ] Medium [ ] Low

### Mood Check-in
How am I feeling right now?

## Daily Accomplishments
### Completed Tasks
- [ ] Task 1
- [ ] Task 2
- [ ] Task 3

### Unexpected Wins
- 
- 

### Progress on Goals
- **Goal 1:** ___% complete
- **Goal 2:** ___% complete

## Learning & Growth
### What I Learned Today
- 
- 

### Skills Practiced
- 
- 

### Challenges Faced
| Challenge | How I Handled It | What I Learned |
|-----------|------------------|----------------|
|           |                  |                |

## Relationships & Connections
### Meaningful Interactions
- 
- 

### People Who Helped Me
- 
- 

### How I Helped Others
- 
- 

## Evening Reflection
### Wins of the Day
1. 
2. 
3. 

### What Could Have Gone Better
- 
- 

### Stress Level
[ ] High [ ] Medium [ ] Low

## Gratitude
### 3 Things I'm Grateful For
1. 
2. 
3. 

## Tomorrow's Preparation
### Tomorrow's Top 3
1. 
2. 
3. 

### Things to Remember
- 
- 

### Energy for Tomorrow
What do I need to do to have energy tomorrow?
- 
- 

## Weekly/Monthly Progress
(If applicable)
### This Week's Theme
- 

### Monthly Goal Progress
- 

## Tags
#journal #daily #reflection #personal-growth #${CURRENT_DATE.replace(/\//g, '-')}`
  },
  {
    id: 'research-notes',
    title: 'Research Documentation',
    description: 'Comprehensive research and analysis template',
    icon: Search,
    color: 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600',
    template: `# Research Documentation - [Research Topic]

## Research Overview
### Research Question
What am I trying to find out?

### Research Objectives
- [ ] Objective 1
- [ ] Objective 2
- [ ] Objective 3

### Scope & Limitations
- **Scope:** 
- **Limitations:** 

## Methodology
### Research Methods
- [ ] Literature Review
- [ ] Surveys
- [ ] Interviews
- [ ] Data Analysis
- [ ] Case Studies
- [ ] Other: ___

### Data Sources
- **Primary Sources:** 
- **Secondary Sources:** 
- **Databases Used:** 

## Key Findings
### Main Discoveries
1. **Finding 1:** 
   - **Evidence:** 
   - **Significance:** 

2. **Finding 2:** 
   - **Evidence:** 
   - **Significance:** 

### Data Analysis
| Metric | Value | Significance |
|--------|-------|-------------|
|        |       |             |

### Patterns & Trends
- 
- 

## Literature Review
### Key Papers/Sources
| Author | Title | Year | Key Contribution |
|--------|-------|------|-----------------|
|        |       |      |                 |

### Gaps in Literature
- 
- 

## Implications
### Theoretical Implications
- 
- 

### Practical Applications
- 
- 

## Future Research
### Unanswered Questions
- 
- 

### Recommended Studies
- 
- 

## References & Sources
- [Source 1](url)
- [Source 2](url)
- [Source 3](url)

## Research Notes
### Interesting Quotes
> "Quote here" - Author

### Additional Observations
- 
- 

## Tags
#research #analysis #documentation #academic`
  },
  {
    id: 'book-review',
    title: 'Book Review & Analysis',
    description: 'Comprehensive book review and learning extraction',
    icon: BookOpen,
    color: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600',
    template: `# Book Review - [Book Title]

## Book Information
- **Title:** 
- **Author:** 
- **Genre:** 
- **Publication Year:** 
- **Pages:** 
- **Reading Period:** ${CURRENT_DATE} - ___

## Reading Goals
### Why I Chose This Book
- 
- 

### What I Hope to Learn
- 
- 

## Overview & Summary
### Main Thesis
What is the central argument or message?

## Key Insights & Learnings
### Most Valuable Ideas
1. **Insight 1:** 
   - **Why it matters:** 
   - **How I'll apply it:** 

2. **Insight 2:** 
   - **Why it matters:** 
   - **How I'll apply it:** 

### Quotes to Remember
> "Quote 1" - Page ___

> "Quote 2" - Page ___

### Paradigm Shifts
What changed my thinking?
- 
- 

## Critical Analysis
### Strengths
- 
- 

### Weaknesses
- 
- 

### Author's Credibility
- **Background:** 
- **Expertise:** 
- **Bias/Perspective:** 

## Personal Reflection
### How This Relates to My Experience
- 
- 

### Emotional Response
How did this book make me feel?
- 
- 

### Disagreements or Questions
- 
- 

## Actionable Items
### Immediate Actions
- [ ] Action 1
- [ ] Action 2
- [ ] Action 3

### Long-term Applications
- 
- 

### Further Reading
Books to read based on this:
- 
- 

## Rating & Recommendation
### Overall Rating
⭐⭐⭐⭐⭐ (___/5 stars)

### Would I Recommend?
[ ] Yes [ ] No [ ] Conditionally

### Who Should Read This?
- 
- 

## Related Books & Connections
### Similar Books
- 
- 

### Books This References
- 
- 

## Follow-up
### Discussion Opportunities
People to discuss this with:
- 
- 

### Review in 6 Months
Reminders to revisit:
- 
- 

## Tags
#book-review #reading #learning #personal-development`
  },
  {
    id: 'troubleshooting',
    title: 'Problem Solving Log',
    description: 'Systematic problem analysis and solution tracking',
    icon: Target,
    color: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600',
    template: `# Problem Solving Log - [Issue Title]

## Problem Definition
### Issue Description
Clear, concise description of the problem.

### When Did This Occur?
- **Date/Time:** ${CURRENT_DATE} ${CURRENT_TIME}
- **Frequency:** [ ] One-time [ ] Intermittent [ ] Consistent
- **Duration:** 

### Impact Assessment
- **Severity:** [ ] Critical [ ] High [ ] Medium [ ] Low
- **Users Affected:** 
- **Business Impact:** 
- **Systems Affected:** 

## Environment Details
### System Information
- **Platform:** 
- **Version:** 
- **Browser/Client:** 
- **Operating System:** 

### Configuration
- 
- 

## Problem Analysis
### Symptoms Observed
- 
- 
- 

### Error Messages
\`\`\`
Copy exact error messages here
\`\`\`

### Steps to Reproduce
1. 
2. 
3. 

### What Was Expected vs. What Happened
- **Expected:** 
- **Actual:** 

## Investigation Process
### Initial Hypotheses
1. **Hypothesis 1:** 
   - **Test:** 
   - **Result:** 

2. **Hypothesis 2:** 
   - **Test:** 
   - **Result:** 

### Debugging Steps Taken
- [ ] Step 1: Check logs
- [ ] Step 2: Verify configuration
- [ ] Step 3: Test in different environment
- [ ] Step 4: Review recent changes

### Tools Used
- 
- 

### Data Collected
\`\`\`
Relevant data, logs, or output
\`\`\`

## Root Cause Analysis
### Primary Cause
What was the underlying cause?

### Contributing Factors
- 
- 

### Why Did This Happen?
Use 5 Whys technique:
1. Why? 
2. Why? 
3. Why? 
4. Why? 
5. Why? 

## Solution
### Immediate Fix
What was done to resolve the immediate issue?
\`\`\`
Code changes, configuration updates, etc.
\`\`\`

### Implementation Steps
1. 
2. 
3. 

### Verification
How was the fix verified?
- [ ] Test 1: 
- [ ] Test 2: 
- [ ] Test 3: 

## Prevention Measures
### Long-term Solutions
- 
- 

### Process Improvements
- 
- 

### Monitoring Enhancements
- 
- 

## Documentation Updates
### What Needs to Be Updated?
- [ ] User documentation
- [ ] Technical documentation
- [ ] Process documentation
- [ ] Training materials

## Lessons Learned
### What Went Well
- 
- 

### What Could Be Improved
- 
- 

### Knowledge Gained
- 
- 

## Follow-up Actions
- [ ] Action 1 - Owner: ___ - Due: ___
- [ ] Action 2 - Owner: ___ - Due: ___
- [ ] Monitor for recurrence - Due: ___

## Time Tracking
- **Time to Detect:** 
- **Time to Resolve:** 
- **Total Downtime:** 

## Tags
#troubleshooting #problem-solving #technical #debugging #${CURRENT_DATE.replace(/\//g, '-')}`
  },
  {
    id: 'retrospective',
    title: 'Team Retrospective',
    description: 'Team reflection and improvement planning',
    icon: TrendingUp,
    color: 'bg-teal-50 dark:bg-teal-900/20 text-teal-600',
    template: `# Team Retrospective - [Sprint/Period]

## Retrospective Details
- **Date:** ${CURRENT_DATE}
- **Facilitator:** 
- **Participants:** 
- **Sprint/Period:** 
- **Duration:** 

## Sprint/Period Overview
### Goals & Objectives
What were we trying to achieve?
- [ ] Goal 1
- [ ] Goal 2
- [ ] Goal 3

### Key Metrics
| Metric | Target | Actual | Variance |
|--------|--------|--------|----------|
|        |        |        |          |

## What Went Well ⭐
### Successes & Wins
- 
- 
- 

### Positive Behaviors
- 
- 

### Achievements Beyond Goals
- 
- 

## What Didn't Go Well ❌
### Challenges & Obstacles
- 
- 
- 

### Missed Opportunities
- 
- 

### Process Issues
- 
- 

## What We Learned 💡
### Key Insights
- 
- 
- 

### Skill Development
- 
- 

### Knowledge Gained
- 
- 

## Action Items 🎯
### Start Doing
- [ ] Action 1 - Owner: ___ - Due: ___
- [ ] Action 2 - Owner: ___ - Due: ___

### Stop Doing
- [ ] Action 1 - Owner: ___ - Due: ___
- [ ] Action 2 - Owner: ___ - Due: ___

### Continue Doing
- [ ] Action 1 - Owner: ___ - Due: ___
- [ ] Action 2 - Owner: ___ - Due: ___

### Improve/Modify
- [ ] Action 1 - Owner: ___ - Due: ___
- [ ] Action 2 - Owner: ___ - Due: ___

## Team Health Check
Rate each area from 1-5:

| Area | Rating | Comments |
|------|--------|----------|
| Communication | ___/5 | |
| Collaboration | ___/5 | |
| Work-Life Balance | ___/5 | |
| Technical Skills | ___/5 | |
| Process Efficiency | ___/5 | |
| Goal Clarity | ___/5 | |

## Individual Reflections
### Team Member 1
- **Highlights:** 
- **Challenges:** 
- **Improvement Areas:** 

### Team Member 2
- **Highlights:** 
- **Challenges:** 
- **Improvement Areas:** 

## Process Improvements
### Workflow Enhancements
- 
- 

### Tool Improvements
- 
- 

### Communication Improvements
- 
- 

## Next Sprint Goals
### Priority Focus Areas
1. 
2. 
3. 

### Success Metrics
- 
- 

## Follow-up
### Review Date
Next retrospective: ___

### Action Item Check-in
Mid-sprint check: ___

## Additional Notes
- 
- 

## Tags
#retrospective #team #improvement #agile #sprint`
  },
  {
    id: 'interview-notes',
    title: 'Interview Notes',
    description: 'Structured notes for interviews and conversations',
    icon: Users,
    color: 'bg-pink-50 dark:bg-pink-900/20 text-pink-600',
    template: `# Interview Notes - [Interviewee Name]

## Interview Details
- **Date:** ${CURRENT_DATE}
- **Time:** ${CURRENT_TIME}
- **Duration:** 
- **Interviewer(s):** 
- **Interviewee:** 
- **Position/Role:** 
- **Interview Type:** [ ] Phone [ ] Video [ ] In-person [ ] Informal

## Interview Objectives
### What We Want to Learn
- 
- 
- 

### Key Questions to Explore
- 
- 
- 

## Interviewee Background
### Current Role & Experience
- **Current Position:** 
- **Years of Experience:** 
- **Key Skills:** 
- **Previous Roles:** 

### Education & Qualifications
- 
- 

## Interview Discussion
### Technical Skills Assessment
| Skill | Level (1-5) | Notes |
|-------|-------------|-------|
|       |             |       |
|       |             |       |

### Questions Asked & Responses
#### Q1: [Question]
**Response:** 

**Follow-up notes:** 

#### Q2: [Question]
**Response:** 

**Follow-up notes:** 

#### Q3: [Question]
**Response:** 

**Follow-up notes:** 

## Behavioral Assessment
### Communication Skills
- **Clarity:** 
- **Listening:** 
- **Engagement:** 

### Problem-Solving Approach
- 
- 

### Cultural Fit
- 
- 

## Strengths Observed
- 
- 
- 

## Areas of Concern
- 
- 
- 

## Questions from Interviewee
- 
- 
- 

## Overall Impression
### Summary
Brief overall assessment of the interview.

### Recommendation
[ ] Strong Yes [ ] Yes [ ] Maybe [ ] No [ ] Strong No

### Reasoning
- 
- 

## Next Steps
- [ ] Second interview with ___
- [ ] Technical assessment
- [ ] Reference check
- [ ] Final decision by ___

## Additional Notes
- 
- 

## Follow-up Actions
- [ ] Send thank you email
- [ ] Schedule next interview
- [ ] Update candidate in system
- [ ] Coordinate with team

## Tags
#interview #hiring #assessment #${CURRENT_DATE.replace(/\//g, '-')}`
  },
  {
    id: 'recipe-notes',
    title: 'Recipe & Cooking Notes',
    description: 'Document recipes with modifications and results',
    icon: ChefHat,
    color: 'bg-rose-50 dark:bg-rose-900/20 text-rose-600',
    template: `# Recipe Notes - [Dish Name]

## Recipe Information
- **Recipe Name:** 
- **Cuisine Type:** 
- **Meal Type:** [ ] Breakfast [ ] Lunch [ ] Dinner [ ] Snack [ ] Dessert
- **Difficulty:** [ ] Easy [ ] Medium [ ] Hard
- **Prep Time:** 
- **Cook Time:** 
- **Total Time:** 
- **Serves:** 
- **Source:** 

## Ingredients
### Main Ingredients
- [ ] Ingredient 1 - Amount
- [ ] Ingredient 2 - Amount
- [ ] Ingredient 3 - Amount

### Spices & Seasonings
- [ ] Spice 1 - Amount
- [ ] Spice 2 - Amount

### Substitutions Made
| Original | Substituted With | Reason |
|----------|------------------|--------|
|          |                  |        |

## Instructions
### Preparation Steps
1. 
2. 
3. 

### Cooking Steps
1. 
2. 
3. 

### Finishing & Plating
1. 
2. 

## Cooking Notes
### What Worked Well
- 
- 

### What I'd Change Next Time
- 
- 

### Timing Notes
- 
- 

### Equipment Used
- 
- 

## Results & Feedback
### How It Turned Out
[ ] Excellent [ ] Good [ ] Okay [ ] Needs Work

### Family/Guest Reactions
- 
- 

### Photos
[ ] Took photos of the dish

## Nutritional Information
(If available/calculated)
- **Calories per serving:** 
- **Protein:** 
- **Carbs:** 
- **Fat:** 

## Variations to Try
### Flavor Variations
- 
- 

### Dietary Adaptations
- **Vegetarian:** 
- **Vegan:** 
- **Gluten-free:** 
- **Low-carb:** 

## Pairing Suggestions
### Side Dishes
- 
- 

### Beverages
- 
- 

## Shopping Notes
### Where to Buy Special Ingredients
- 
- 

### Cost per Serving
Approximately: $___

## Make-Ahead Tips
### What Can Be Prepped
- 
- 

### Storage Instructions
- **Refrigerator:** 
- **Freezer:** 
- **Reheating:** 

## Recipe Rating
⭐⭐⭐⭐⭐ (___/5 stars)

## Tags
#recipe #cooking #food #kitchen #${CURRENT_DATE.replace(/\//g, '-')}`
  },
  {
    id: 'travel-planning',
    title: 'Travel Planning',
    description: 'Comprehensive travel planning and itinerary',
    icon: MapPin,
    color: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600',
    template: `# Travel Planning - [Destination]

## Trip Overview
- **Destination:** 
- **Travel Dates:** ${CURRENT_DATE} - ___
- **Duration:** ___ days
- **Travel Type:** [ ] Business [ ] Leisure [ ] Adventure [ ] Family
- **Travelers:** 
- **Budget:** $___

## Pre-Trip Planning
### Research & Preparation
- [ ] Passport/ID check (expires: ___)
- [ ] Visa requirements
- [ ] Vaccinations needed
- [ ] Travel insurance
- [ ] Currency exchange
- [ ] Weather forecast check

### Bookings & Reservations
#### Flights
- **Outbound:** ${CURRENT_DATE} at ___ - Flight ___
- **Return:** ___ at ___ - Flight ___
- **Confirmation:** 

#### Accommodation
- **Hotel/Airbnb:** 
- **Check-in:** 
- **Check-out:** 
- **Address:** 
- **Confirmation:** 

#### Transportation
- **Airport transfers:** 
- **Car rental:** 
- **Public transport passes:** 
- **Other:** 

## Itinerary
### Day 1 - ${CURRENT_DATE}
- **Morning:** 
- **Afternoon:** 
- **Evening:** 
- **Accommodation:** 

### Day 2 - ___
- **Morning:** 
- **Afternoon:** 
- **Evening:** 
- **Accommodation:** 

### Day 3 - ___
- **Morning:** 
- **Afternoon:** 
- **Evening:** 
- **Accommodation:** 

## Places to Visit
### Must-See Attractions
- [ ] Attraction 1 - Notes: ___
- [ ] Attraction 2 - Notes: ___
- [ ] Attraction 3 - Notes: ___

### Restaurants to Try
- [ ] Restaurant 1 - Cuisine: ___ - Budget: ___
- [ ] Restaurant 2 - Cuisine: ___ - Budget: ___

### Local Experiences
- [ ] Experience 1 - Cost: ___
- [ ] Experience 2 - Cost: ___

## Practical Information
### Important Contacts
- **Embassy:** 
- **Emergency Services:** 
- **Hotel:** 
- **Local Contact:** 

### Useful Apps
- [ ] Maps app
- [ ] Translation app
- [ ] Currency converter
- [ ] Local transport app

### Cultural Notes
- **Language basics:** 
- **Cultural etiquette:** 
- **Tipping customs:** 
- **Dress code considerations:** 

## Packing List
### Clothing
- [ ] Item 1
- [ ] Item 2
- [ ] Weather-appropriate gear

### Electronics
- [ ] Phone & charger
- [ ] Camera & accessories
- [ ] Power adapters
- [ ] Portable battery

### Documents
- [ ] Passport/ID
- [ ] Travel insurance
- [ ] Flight confirmations
- [ ] Hotel confirmations
- [ ] Emergency contact info

### Personal Items
- [ ] Medications
- [ ] Toiletries
- [ ] Sunscreen
- [ ] First aid kit

## Budget Tracking
| Category | Budgeted | Actual | Notes |
|----------|----------|---------|-------|
| Flights | $__ | $__ | |
| Accommodation | $__ | $__ | |
| Food | $__ | $__ | |
| Activities | $__ | $__ | |
| Transport | $__ | $__ | |
| Shopping | $__ | $__ | |
| **Total** | **$__** | **$__** | |

## Travel Journal
### Memorable Moments
(Fill during/after trip)
- 
- 

### Unexpected Discoveries
- 
- 

### What I'd Do Differently
- 
- 

### Recommendations for Others
- 
- 

## Post-Trip
### Photos & Memories
- [ ] Organize photos
- [ ] Create photo album
- [ ] Share highlights with friends

### Follow-up
- [ ] Leave reviews for accommodations
- [ ] Update travel apps
- [ ] Plan return visit?

## Tags
#travel #planning #vacation #adventure #${CURRENT_DATE.replace(/\//g, '-')}`
  }
]

// Quick actions
const quickActions: QuickAction[] = [
  {
    id: 'search',
    title: 'Search Notas',
    description: 'Find specific content',
    icon: Search,
    color: 'bg-gray-50 dark:bg-gray-900/20 text-gray-600',
    action: () => {
      // Focus search bar
      const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement
      if (searchInput) {
        searchInput.focus()
      }
    }
  },
  {
    id: 'import',
    title: 'Import Notas',
    description: 'Import from JSON file',
    icon: Import,
    color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600',
    action: () => emit('import-notas')
  },
  {
    id: 'export',
    title: 'Export All',
    description: 'Download all notas',
    icon: Download,
    color: 'bg-green-50 dark:bg-green-900/20 text-green-600',
    action: () => emit('export-notas')
  },
  {
    id: 'organize',
    title: 'Organize Tags',
    description: 'Manage and clean up tags',
    icon: Tag,
    color: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600',
    action: () => {
      // Could open a tag management modal
      console.log('Tag organization feature coming soon!')
    }
  }
]

// Methods
const createFromTemplate = async (template: Template) => {
  try {
    const nota = await store.createItem(template.title)
    await store.saveNota({
      id: nota.id,
      content: template.template
    })
    router.push(`/nota/${nota.id}`)
  } catch (error) {
    console.error('Failed to create nota from template:', error)
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Quick Actions -->
    <Card>
      <CardHeader>
        <CardTitle class="flex items-center gap-2 text-lg">
          <Zap class="h-5 w-5" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent class="p-6">
        <div class="grid grid-cols-2 gap-4">
          <Button
            v-for="action in quickActions"
            :key="action.id"
            variant="outline"
            @click="action.action"
            class="h-auto p-4 flex flex-col items-center gap-3 hover:shadow-sm transition-all duration-200"
          >
            <div :class="action.color" class="p-3 rounded-lg">
              <component :is="action.icon" class="h-5 w-5" />
            </div>
            <div class="text-center">
              <div class="text-sm font-medium">{{ action.title }}</div>
              <div class="text-xs text-muted-foreground mt-1">{{ action.description }}</div>
            </div>
          </Button>
        </div>
      </CardContent>
    </Card>

    <!-- Template Gallery -->
    <Card>
      <CardHeader>
        <CardTitle class="flex items-center gap-2 text-lg">
          <Sparkles class="h-5 w-5" />
          Professional Template Gallery
        </CardTitle>
        <p class="text-sm text-muted-foreground mt-1">
          Choose from 12 comprehensive templates designed for productivity, documentation, and personal growth
        </p>
      </CardHeader>
      <CardContent class="p-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card 
            v-for="template in templates" 
            :key="template.id"
            class="cursor-pointer hover:shadow-md transition-all duration-200 border-2 border-transparent hover:border-primary/20 group"
            @click="createFromTemplate(template)"
          >
            <CardContent class="p-4">
              <div class="flex items-start gap-3">
                <div :class="template.color" class="p-3 rounded-lg flex-shrink-0 group-hover:scale-105 transition-transform">
                  <component :is="template.icon" class="h-5 w-5" />
                </div>
                <div class="flex-1 min-w-0">
                  <h4 class="font-medium text-sm mb-1">{{ template.title }}</h4>
                  <p class="text-xs text-muted-foreground mb-3 leading-relaxed">{{ template.description }}</p>
                  <div class="flex items-center gap-1 text-xs text-primary">
                    <Plus class="h-3 w-3" />
                    <span>Create from template</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>

    <!-- Getting Started (for new users) -->
    <Card v-if="props.notas.length === 0">
      <CardHeader>
        <CardTitle class="flex items-center gap-2 text-lg">
          <Sparkles class="h-5 w-5" />
          Welcome to BashNota!
        </CardTitle>
      </CardHeader>
      <CardContent class="p-6">
        <div class="space-y-6">
          <p class="text-sm text-muted-foreground">
            Get started by creating your first nota or choosing from our templates above.
          </p>
          
          <div class="space-y-3">
            <h4 class="text-sm font-medium">Quick Tips:</h4>
            <ul class="text-sm text-muted-foreground space-y-2">
              <li class="flex items-start gap-2">
                <div class="w-1.5 h-1.5 bg-primary rounded-full mt-2 shrink-0"></div>
                Use templates to get started quickly
              </li>
              <li class="flex items-start gap-2">
                <div class="w-1.5 h-1.5 bg-primary rounded-full mt-2 shrink-0"></div>
                Add tags to organize your content
              </li>
              <li class="flex items-start gap-2">
                <div class="w-1.5 h-1.5 bg-primary rounded-full mt-2 shrink-0"></div>
                Create sub-notas to build hierarchies
              </li>
              <li class="flex items-start gap-2">
                <div class="w-1.5 h-1.5 bg-primary rounded-full mt-2 shrink-0"></div>
                Use markdown for rich formatting
              </li>
            </ul>
          </div>
          
          <Button 
            @click="$emit('create-nota')" 
            class="w-full"
          >
            <Plus class="h-4 w-4 mr-2" />
            Create Your First Nota
          </Button>
        </div>
      </CardContent>
    </Card>
  </div>
</template>

<style scoped>
/* Ensure consistent spacing and prevent layout shifts */
.grid {
  min-height: 0;
}

/* Smooth hover transitions */
.hover\:shadow-md {
  transition: box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Enhanced button hover effects */
.transition-all {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Ensure text doesn't overflow in small containers */
.min-w-0 {
  min-width: 0;
}

/* Consistent icon sizing */
.shrink-0 {
  flex-shrink: 0;
}

/* Better line height for readability */
.leading-relaxed {
  line-height: 1.6;
}

/* Group hover effects */
.group:hover .group-hover\:scale-105 {
  transform: scale(1.05);
}
</style> 