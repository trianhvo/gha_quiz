export class QuestionLoader {
  constructor() {
    // Define paths for the split question files
    this.questionFiles = [
      "src/data/questions-1.json", // Fixed
      "src/data/questions-2.json", // Fixed
      "src/data/questions-3.json", // Fixed
      "src/data/questions-4.json", // Fixed
      "src/data/questions-5.json", // Fixed
    ];
  }

  async loadAllQuestions() {
    try {
      console.log("🚀 Loading all questions from JSON files...");

      const allQuestions = [];

      // Fetch and process each question file
      for (const file of this.questionFiles) {
        try {
          const response = await fetch(file);
          if (!response.ok) {
            // It's okay if a file is not found, we'll just skip it.
            // This allows for incremental creation of the files.
            if (response.status === 404) {
              console.warn(`Could not find question file: ${file}`);
              continue;
            }
            throw new Error(`Failed to load ${file}: ${response.status}`);
          }

          const data = await response.json();

          if (!data.questions || !Array.isArray(data.questions)) {
            throw new Error(`Invalid questions format in ${file}`);
          }

          allQuestions.push(...data.questions);
          console.log(
            `✅ Successfully loaded ${data.questions.length} questions from ${file}`
          );
        } catch (error) {
          console.error(`❌ Failed to process ${file}:`, error);
        }
      }

      if (allQuestions.length === 0) {
        return this.getFallbackQuestions();
      }

      // Process all loaded questions
      const processedQuestions = allQuestions.map((q) => ({
        id: q.id,
        title: q.title,
        // The formatContent function now handles code blocks correctly
        content: this.formatContent(q.question),
        choices: q.choices,
        correctAnswers: q.choices
          .map((choice, index) => (choice.correct ? index : null))
          .filter((i) => i !== null),
        isMultipleChoice:
          q.isMultipleChoice || q.choices.filter((c) => c.correct).length > 1,
        explanation: q.explanation || "",
        link: q.link || "",
      }));

      return processedQuestions.sort((a, b) => a.id - b.id);
    } catch (error) {
      console.error("❌ Failed to load any questions:", error);
      return this.getFallbackQuestions();
    }
  }

  formatContent(content) {
    if (!content) return "<p>No content available</p>";

    // Correctly handle multi-line code blocks first
    content = content.replace(/```yaml([\s\S]*?)```/g, (match, p1) => {
      const code = p1.trim().replace(/</g, "&lt;").replace(/>/g, "&gt;");
      return `<pre><code>${code}</code></pre>`;
    });

    // Handle other markdown elements
    return content
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/\n/g, "<br>")
      .replace(/<br>$/, "") // Remove trailing <br>
      .replace(/^(.+)$/m, "<p>$1</p>");
  }

  getFallbackQuestions() {
    return [
      {
        id: 1,
        title: "Fallback Question",
        content:
          "<p>Could not load questions from JSON files. Please check that the question files exist in <code>/src/data/</code> and are properly formatted.</p>",
        choices: [
          { text: "Check JSON file exists", correct: true },
          { text: "Check JSON format", correct: false },
          { text: "Check network connection", correct: false },
          { text: "Restart application", correct: false },
        ],
        correctAnswers: [0],
        isMultipleChoice: false,
        explanation:
          "Make sure the questions.json files are in the correct location and properly formatted.",
        link: "",
      },
    ];
  }
}
