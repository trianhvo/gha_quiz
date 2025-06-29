export class LocalStorageManager {
    constructor() {
        this.markedQuestionsKey = 'gha-quiz-marked-questions';
    }
    
    markQuestion(questionIndex) {
        const marked = this.getMarkedQuestions();
        if (!marked.includes(questionIndex)) {
            marked.push(questionIndex);
            this.saveMarkedQuestions(marked);
        }
    }
    
    unmarkQuestion(questionIndex) {
        const marked = this.getMarkedQuestions();
        const index = marked.indexOf(questionIndex);
        if (index > -1) {
            marked.splice(index, 1);
            this.saveMarkedQuestions(marked);
        }
    }
    
    isQuestionMarked(questionIndex) {
        const marked = this.getMarkedQuestions();
        return marked.includes(questionIndex);
    }
    
    getMarkedQuestions() {
        try {
            const stored = localStorage.getItem(this.markedQuestionsKey);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Failed to load marked questions:', error);
            return [];
        }
    }
    
    saveMarkedQuestions(marked) {
        try {
            localStorage.setItem(this.markedQuestionsKey, JSON.stringify(marked));
        } catch (error) {
            console.error('Failed to save marked questions:', error);
        }
    }
    
    clearAllMarks() {
        try {
            localStorage.removeItem(this.markedQuestionsKey);
        } catch (error) {
            console.error('Failed to clear marked questions:', error);
        }
    }
}