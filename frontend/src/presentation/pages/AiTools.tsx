import React, { useState } from "react";
import { twMerge } from "tailwind-merge";
import { 
  Sparkles, 
  MessageSquare, 
  BookOpen, 
  CheckSquare, 
  Smile, 
  Tags, 
  FolderHeart, 
  FileText, 
  ShieldCheck, 
  Share2, 
  Mail, 
  Linkedin, 
  Twitter, 
  ListTodo, 
  TrendingUp, 
  GitBranch, 
  Network,
  Play,
  Clock
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SmartInput } from "@/components/ui/Input/SmartInput";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useToast } from "@/context/ToastContext";

interface ToolDefinition {
  id: string;
  name: string;
  category: "analysis" | "generation" | "social" | "other";
  icon: React.ReactNode;
  placeholderText: string;
  runner: (text: string) => string;
}

export const AiTools: React.FC = () => {
  const { success, error: toastError } = useToast();
  const [inputText, setInputText] = useState("");
  const [activeToolId, setActiveToolId] = useState("sentiment");
  const [outputText, setOutputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Define 19 tools with respective icons and mock model runners
  const toolsList: ToolDefinition[] = [
    {
      id: "sentiment",
      name: "Sentiment Analysis",
      category: "analysis",
      icon: <Smile className="w-4 h-4 text-emerald-500" />,
      placeholderText: "Type text to analyze tone...",
      runner: (t) => {
        const positives = ["great", "good", "happy", "excellent", "love", "outstanding", "success"];
        const negatives = ["bad", "sad", "fail", "broken", "worst", "hate", "issue", "error"];
        let score = 50;
        t.toLowerCase().split(" ").forEach(w => {
          if (positives.includes(w)) score += 15;
          if (negatives.includes(w)) score -= 15;
        });
        const rating = score > 60 ? "POSITIVE" : score < 40 ? "NEGATIVE" : "NEUTRAL";
        return `### Sentiment Results\n- **Analysis**: ${rating}\n- **Intensity Score**: ${score}%\n- **Verdict**: The document shows a generally ${rating.toLowerCase()} semantic inclination.`;
      }
    },
    {
      id: "keywords",
      name: "Keyword Extraction",
      category: "analysis",
      icon: <Tags className="w-4 h-4 text-primary" />,
      placeholderText: "Paste document to extract keywords...",
      runner: (t) => {
        const words = t.split(/\s+/).filter(w => w.length > 5).slice(0, 5);
        return `### Extracted Keywords\n${words.map(w => `- **${w.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"")}** (Relevance: 0.94)`).join("\n")}`;
      }
    },
    {
      id: "titles",
      name: "Title Generator",
      category: "generation",
      icon: <Sparkles className="w-4 h-4 text-indigo-500" />,
      placeholderText: "Paste abstract/notes to generate titles...",
      runner: (t) => {
        return `### Suggested Titles\n1. **Deep Dive: An Analysis of ${t.slice(0, 20)}**\n2. **The Modern Guide to Transformer Modeling**\n3. **Deciphering Key Trends in NLP Frameworks**`;
      }
    },
    {
      id: "questions",
      name: "Question Generator",
      category: "generation",
      icon: <MessageSquare className="w-4 h-4 text-amber-500" />,
      placeholderText: "Paste text to compile Q&A lists...",
      runner: (t) => {
        return `### Automated Q&A List\n1. **What is the central concept discussed in the text?**\n   - *Ans*: The document focuses on ${t.slice(0, 40)}...\n2. **How does this concept map to industrial parameters?**\n   - *Ans*: It establishes baseline validation indices.`;
      }
    },
    {
      id: "grammar",
      name: "Grammar Checker",
      category: "other",
      icon: <CheckSquare className="w-4 h-4 text-emerald-500" />,
      placeholderText: "Paste text to review spelling/grammar...",
      runner: (t) => {
        return `### Grammar Audit\n- **Status**: Checked\n- **Spelling Errors**: 0\n- **Grammar Suggestions**: No critical errors found. Sentence alignments appear syntactically correct.`;
      }
    },
    {
      id: "readability",
      name: "Readability Score",
      category: "analysis",
      icon: <BookOpen className="w-4 h-4 text-primary" />,
      placeholderText: "Type text to check readability level...",
      runner: (t) => {
        const charLen = t.length;
        const score = Math.round(50 + (charLen % 40));
        return `### Readability Metrics\n- **Flesch Reading Ease**: ${score} / 100\n- **Grade Level**: Graduate (Difficult)\n- **Recommendation**: Suitable for academic and research audiences. Consider shortening sentences to improve readability.`;
      }
    },
    {
      id: "emotion",
      name: "Emotion Analysis",
      category: "analysis",
      icon: <Smile className="w-4 h-4 text-pink-500" />,
      placeholderText: "Analyze raw emotional metrics...",
      runner: (t) => {
        return `### Emotional Intensity\n- **Joy**: 45%\n- **Surprise**: 30%\n- **Analytical**: 85%\n- **Confident**: 60%`;
      }
    },
    {
      id: "ner",
      name: "Named Entity Recognition (NER)",
      category: "analysis",
      icon: <FolderHeart className="w-4 h-4 text-indigo-500" />,
      placeholderText: "Extract names, places, dates...",
      runner: (t) => {
        return `### Named Entities (NER)\n- **ORG (Organizations)**: Hugging Face, PyTorch\n- **LOC (Locations)**: Silicon Valley\n- **DATE**: 2026`;
      }
    },
    {
      id: "topic",
      name: "Topic Detection",
      category: "analysis",
      icon: <FileText className="w-4 h-4 text-amber-500" />,
      placeholderText: "Detect core topic themes...",
      runner: (t) => {
        return `### Classified Topics\n- **Primary Topic**: Technology & Software (92% probability)\n- **Secondary Topic**: Machine Learning Research (85% probability)`;
      }
    },
    {
      id: "classification",
      name: "Text Classification",
      category: "analysis",
      icon: <TrendingUp className="w-4 h-4 text-emerald-500" />,
      placeholderText: "Classify document categories...",
      runner: (t) => {
        return `### Text Categories\n- **Document Class**: Technical/Scientific Documentation\n- **Sub-Class**: Natural Language Processing\n- **Confidence**: 0.98`;
      }
    },
    {
      id: "lang",
      name: "Language Detection",
      category: "analysis",
      icon: <GlobeIcon className="w-4 h-4 text-primary" />,
      placeholderText: "Verify vocabulary language...",
      runner: (t) => {
        return `### Language Analysis\n- **Detected Language**: English (EN)\n- **Confidence Index**: 99.8%`;
      }
    },
    {
      id: "timeline",
      name: "Timeline Generator",
      category: "generation",
      icon: <Clock className="w-4 h-4 text-amber-500" />,
      placeholderText: "Paste sequence notes to structure timeline...",
      runner: (t) => {
        return `### Timeline Milestones\n- **00:00 - Setup**: Establish environment properties.\n- **05:00 - Execution**: Trigger model weights.\n- **10:00 - Validation**: Review metrics scores.`;
      }
    },
    {
      id: "mindmap",
      name: "Mind Map",
      category: "generation",
      icon: <GitBranch className="w-4 h-4 text-pink-500" />,
      placeholderText: "Compile hierarchy nodes...",
      runner: (t) => {
        return `### Mind Map Tree\n- **Central Focus**: Document Insights\n  - *Node 1*: Extraction parameters\n  - *Node 2*: Metrics validations`;
      }
    },
    {
      id: "graph",
      name: "Knowledge Graph",
      category: "generation",
      icon: <Network className="w-4 h-4 text-primary" />,
      placeholderText: "Extract entity relationship nodes...",
      runner: (t) => {
        return `### Knowledge Relationship Graph\n- **Subject**: Transformers &bull; **Predicate**: Powers &bull; **Object**: Summarizers\n- **Subject**: ROUGE Metrics &bull; **Predicate**: Evaluates &bull; **Object**: Summary Quality`;
      }
    },
    {
      id: "meeting",
      name: "Meeting Notes",
      category: "other",
      icon: <ListTodo className="w-4 h-4 text-indigo-500" />,
      placeholderText: "Paste raw transcript to generate meeting summaries...",
      runner: (t) => {
        return `### Consolidated Meeting Brief\n- **Summary**: Discussed architectural specifications.\n- **Key Decisions**: Approved Feature-Based layout configurations.\n- **Action Items**:\n  - [ ] Implement Smart Inputs\n  - [ ] Configure telemetry widgets`;
      }
    },
    {
      id: "email",
      name: "Email Generator",
      category: "other",
      icon: <Mail className="w-4 h-4 text-pink-500" />,
      placeholderText: "Describe email outline goals...",
      runner: (t) => {
        return `### Drafted Email Correspondence\n**Subject**: Updates: Project Summarization Baseline\n\nDear Team,\n\nI hope this email finds you well. I wanted to update you on our progress: ${t.slice(0, 80)}...\n\nBest regards,\n[Your Name]`;
      }
    },
    {
      id: "linkedin",
      name: "LinkedIn Post",
      category: "social",
      icon: <Linkedin className="w-4 h-4 text-primary" />,
      placeholderText: "Paste draft to format for LinkedIn...",
      runner: (t) => {
        return `### Social Media Layout (LinkedIn)\n🚀 Exciting milestones: We have successfully launched the AI Text Summarizer Pro!\n\nHere are the details: ${t.slice(0, 80)}...\n\n#NLP #Transformers #MachineLearning #SaaS`;
      }
    },
    {
      id: "tweet",
      name: "Tweet Generator",
      category: "social",
      icon: <Twitter className="w-4 h-4 text-indigo-500" />,
      placeholderText: "Draft tweet updates...",
      runner: (t) => {
        return `### Social Media Layout (Twitter)\nIntroducing AI Text Summarizer Pro! 🚀 Generate summaries and review transformer performance in real time. #NLP #MachineLearning`;
      }
    },
    {
      id: "blog",
      name: "Blog Outline",
      category: "generation",
      icon: <Sparkles className="w-4 h-4 text-emerald-500" />,
      placeholderText: "Describe blog post subject parameters...",
      runner: (t) => {
        return `### Proposed Blog Outline\n- **Introduction**: Overview of NLP architectures.\n- **Section 1**: Demystifying attention weights.\n- **Section 2**: Measuring compression thresholds.\n- **Conclusion**: The future of automated copywriting.`;
      }
    }
  ];

  const handleRunTool = () => {
    if (!inputText.trim()) return;

    setIsLoading(true);
    setOutputText("");

    // Simulate model calculations
    setTimeout(() => {
      const activeTool = toolsList.find(tool => tool.id === activeToolId);
      if (activeTool) {
        setOutputText(activeTool.runner(inputText));
      }
      setIsLoading(false);
    }, 1200);
  };

  const activeTool = toolsList.find(t => t.id === activeToolId) || toolsList[0];

  return (
    <div className="flex flex-col gap-6">
      
      {/* Page Title Panel */}
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold font-display text-main">AI NLP Toolbox</h2>
        <p className="text-xs text-muted">
          Instantly run any of our 19 purpose-built language modeling tools. Extract entities, format social copy, or evaluate text emotion.
        </p>
      </div>

      {/* 19 Tools Select Grid */}
      <div className="bg-surface border border-borderToken/80 p-4 rounded-xl shadow-sm">
        <span className="text-[10px] font-bold text-muted uppercase tracking-wider mb-3 block px-1">Select NLP Tool</span>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
          {toolsList.map((tool) => (
            <button
              key={tool.id}
              onClick={() => {
                setActiveToolId(tool.id);
                setOutputText("");
              }}
              className={twMerge(
                "flex items-center gap-2.5 px-3 py-2 rounded-md border text-left text-xs font-semibold transition-all duration-200",
                activeToolId === tool.id
                  ? "bg-primary text-white border-transparent shadow-glow"
                  : "bg-surface border-borderToken text-muted hover:text-main hover:bg-hover"
              )}
            >
              {tool.icon}
              <span className="truncate">{tool.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Workspace Area split */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Input box */}
        <Card className="flex flex-col gap-4">
          <div className="flex justify-between items-center border-b border-borderToken pb-2">
            <div>
              <h3 className="font-bold text-sm font-display text-main">Workspace Input</h3>
              <p className="text-[10px] text-muted">Active: {activeTool.name}</p>
            </div>
            {activeTool.icon}
          </div>

          <SmartInput
            value={inputText}
            onChange={setInputText}
            onSubmit={handleRunTool}
            maxLength={1500}
            disabled={isLoading}
            placeholder={activeTool.placeholderText}
          />

          <div className="flex justify-end items-center mt-2">
            <Button
              onClick={handleRunTool}
              disabled={isLoading || inputText.trim().length === 0}
              isLoading={isLoading}
              className="gap-2"
            >
              Run AI Tool <Play className="w-3.5 h-3.5 fill-current" />
            </Button>
          </div>
        </Card>

        {/* Output Panel */}
        <Card className="flex flex-col gap-4">
          <div className="flex justify-between items-center border-b border-borderToken pb-2">
            <div>
              <h3 className="font-bold text-sm font-display text-main">AI Results</h3>
              <p className="text-[10px] text-muted">Formatted model outputs</p>
            </div>
            <Sparkles className="w-4 h-4 text-primary animate-pulse" />
          </div>

          <div className="w-full min-h-[220px] bg-input border border-borderToken rounded-md p-4 text-xs overflow-y-auto text-main select-text leading-relaxed">
            {isLoading ? (
              <div className="flex flex-col gap-2.5">
                <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded animate-pulse w-3/4" />
                <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded animate-pulse w-full" />
                <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded animate-pulse w-5/6" />
              </div>
            ) : outputText ? (
              <div className="whitespace-pre-wrap">
                {outputText.split("\n").map((line, i) => {
                  if (line.startsWith("### ")) {
                    return <h4 key={i} className="text-xs font-bold font-display text-primary mt-2 mb-1.5">{line.substring(4)}</h4>;
                  }
                  if (line.startsWith("- ")) {
                    return <div key={i} className="pl-3 mb-1 text-muted dark:text-slate-300">&bull; {line.substring(2)}</div>;
                  }
                  return <p key={i} className="mb-2 text-main">{line}</p>;
                })}
              </div>
            ) : (
              <span className="text-muted/60 italic">AI tool analysis statement will display here. Run the tool to begin.</span>
            )}
          </div>

          {outputText && !isLoading && (
            <div className="flex justify-end pt-2 border-t border-borderToken/50">
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(outputText);
                  success("Copied to clipboard.");
                }}
                className="text-[10px] text-primary hover:underline font-bold"
              >
                Copy Results
              </button>
            </div>
          )}
        </Card>

      </div>

    </div>
  );
};

// Quick helper Icon placeholder
const GlobeIcon: React.FC<any> = (props) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
    <path d="M2 12h20" />
  </svg>
);

export default AiTools;
