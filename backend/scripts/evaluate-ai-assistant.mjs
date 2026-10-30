import { runAssistantEvaluation } from '../src/features/aiAssistant/evaluation/aiAssistant.evaluator.js';

const result = runAssistantEvaluation();
console.log(JSON.stringify(result, null, 2));
process.exitCode = result.passed ? 0 : 1;
