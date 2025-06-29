export class QuestionLoader {
    constructor() {
        this.questionsPath = '/src/data/questions.json';
    }
    
    async loadAllQuestions() {
        try {
            console.log('🚀 Loading questions from JSON...');
            
            const response = await fetch(this.questionsPath);
            if (!response.ok) {
                throw new Error(`Failed to load questions: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.questions || !Array.isArray(data.questions)) {
                throw new Error('Invalid questions format');
            }
            
            console.log(`✅ Successfully loaded ${data.questions.length} questions from JSON`);
            
            // Process questions to ensure correct format
            const questions = data.questions.map(q => ({
                id: q.id,
                title: q.title,
                content: this.formatContent(q.question),
                choices: q.choices,
                correctAnswers: q.choices.map((choice, index) => choice.correct ? index : null).filter(i => i !== null),
                isMultipleChoice: q.isMultipleChoice || q.choices.filter(c => c.correct).length > 1,
                explanation: q.explanation || '',
                link: q.link || ''
            }));
            
            return questions.sort((a, b) => a.id - b.id);
            
        } catch (error) {
            console.error('❌ Failed to load questions:', error);
            return this.getFallbackQuestions();
        }
    }
    
    formatContent(content) {
        if (!content) return '<p>No content available</p>';
        
        return content
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>')
            .replace(/^(.+)$/, '<p>$1</p>');
    }
    
    getFallbackQuestions() {
        return [
            {
                id: 1,
                title: "Fallback Question",
                content: "<p>Could not load questions from JSON file. Please check that <code>/src/data/questions.json</code> exists and is properly formatted.</p>",
                choices: [
                    { text: "Check JSON file exists", correct: true },
                    { text: "Check JSON format", correct: false },
                    { text: "Check network connection", correct: false },
                    { text: "Restart application", correct: false }
                ],
                correctAnswers: [0],
                isMultipleChoice: false,
                explanation: "Make sure the questions.json file is in the correct location and properly formatted.",
                link: ""
            }
        ];
    }
}