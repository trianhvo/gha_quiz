import { QuestionLoader } from './utils/questionLoader.js';
import { LocalStorageManager } from './utils/localStorage.js';

class TestManager {
    constructor(allQuestions, storage) {
        this.allQuestions = allQuestions;
        this.storage = storage;
        this.testQuestions = [];
        this.questionStates = new Map(); // Track submission status, correctness, etc.
        this.doLaterList = [];
        this.failedList = [];
        this.currentIndex = 0;
        this.showRealNumbers = false;
    }
    
    setupTest(selectedQuestionIds, shuffleQuestions = true, shuffleChoices = true) {
        // Get selected questions
        this.testQuestions = selectedQuestionIds.map(id => {
            const question = this.allQuestions.find(q => q.id === id);
            return {
                ...question,
                originalId: question.id,
                testIndex: 0, // Will be set below
                choices: shuffleChoices ? this.shuffleArray([...question.choices]) : [...question.choices]
            };
        });
        
        // Shuffle questions if requested
        if (shuffleQuestions) {
            this.testQuestions = this.shuffleArray(this.testQuestions);
        }
        
        // Assign test indices
        this.testQuestions.forEach((q, index) => {
            q.testIndex = index + 1;
        });
        
        // Initialize states
        this.questionStates.clear();
        this.testQuestions.forEach(q => {
            this.questionStates.set(q.testIndex, { submitted: false, correct: false, selectedAnswers: [] });
        });
        this.doLaterList = [];
        this.failedList = [];
        this.currentIndex = 0;
    }
    
    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
    
    toggleMarkForLater(testIndex) {
        if (this.doLaterList.includes(testIndex)) {
            this.doLaterList = this.doLaterList.filter(idx => idx !== testIndex);
            return false; // Unmarked
        } else {
            this.doLaterList.push(testIndex);
            return true; // Marked
        }
    }
    
    markAsFailed(testIndex) {
        if (!this.failedList.includes(testIndex)) {
            this.failedList.push(testIndex);
        }
    }
    
    setQuestionState(testIndex, state) {
        this.questionStates.set(testIndex, state);
    }
    
    getQuestionState(testIndex) {
        return this.questionStates.get(testIndex) || { submitted: false, correct: false, selectedAnswers: [] };
    }
    
    getQuestionByTestIndex(testIndex) {
        return this.testQuestions.find(q => q.testIndex === testIndex);
    }
    
    getCurrentQuestion() {
        return this.testQuestions[this.currentIndex];
    }
    
    getDisplayTitle(question) {
        if (this.showRealNumbers) {
            return `Question ${question.testIndex} - ${question.originalId}`;
        }
        return `Question ${question.testIndex}`;
    }

    getStats() {
        let unanswered = 0;
        let points = 0;
        const missed = [];

        this.testQuestions.forEach(q => {
            const state = this.getQuestionState(q.testIndex);
            if (!state.submitted) {
                unanswered++;
                if (!this.doLaterList.includes(q.testIndex)) {
                    missed.push(q.testIndex);
                }
            } else {
                if (state.correct) {
                    points++;
                }
            }
        });

        return {
            unanswered,
            points,
            total: this.testQuestions.length,
            missed
        };
    }
}

class QuizApp {
    constructor() {
        this.questions = [];
        this.currentQuestion = null;
        this.currentQuestionIndex = 0;
        this.selectedAnswers = [];
        this.submitted = false;
        this.testMode = false;
        this.testManager = null;
        
        this.questionLoader = new QuestionLoader();
        this.storage = new LocalStorageManager();
        
        this.init();
    }
    
    async init() {
        this.setupTabs();
        await this.loadQuestions();
        this.setupEventListeners();
        this.updateMarkedQuestionsList();
        this.setupTestMode();
    }
    
    setupTabs() {
        const practiceTab = document.getElementById('practice-tab');
        const testTab = document.getElementById('test-tab');
        const practiceMode = document.getElementById('practice-mode');
        const testMode = document.getElementById('test-mode');
        const practiceSidebar = document.getElementById('practice-sidebar');
        const testSidebar = document.getElementById('test-sidebar');
        
        practiceTab.addEventListener('click', () => {
            if (this.testManager) {
                if (confirm('Are you sure you want to switch to Practice Mode? All test progress will be lost.')) {
                    this.endTest(false);
                } else {
                    return;
                }
            }

            practiceTab.classList.add('active');
            testTab.classList.remove('active');
            practiceMode.classList.add('active');
            testMode.classList.remove('active');
            practiceSidebar.classList.remove('hidden');
            testSidebar.classList.add('hidden');
            this.testMode = false;
            
            this.populateQuestionDropdown();
        });
        
        testTab.addEventListener('click', () => {
            testTab.classList.add('active');
            practiceTab.classList.remove('active');
            testMode.classList.add('active');
            practiceMode.classList.remove('active');
            practiceSidebar.classList.add('hidden');
            testSidebar.classList.remove('hidden');
            this.showTestSetup();
        });
    }
    
    async loadQuestions() {
        try {
            this.questions = await this.questionLoader.loadAllQuestions();
            this.populateQuestionDropdown();
            
            if (this.questions.length > 0) {
                this.loadQuestion(0);
            }
        } catch (error) {
            console.error('Failed to load questions:', error);
            this.showToast('Failed to load questions', 'error');
        }
    }
    
    setupTestMode() {
        this.populateQuestionsTable();
        this.updateMarkedCount();
        
        // Question source radio buttons
        const questionSourceRadios = document.querySelectorAll('input[name="question-source"]');
        const manualSelection = document.getElementById('manual-selection');
        
        questionSourceRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                if (radio.value === 'manual') {
                    manualSelection.style.display = 'block';
                } else {
                    manualSelection.style.display = 'none';
                }
            });
        });
        
        // Selection controls
        document.getElementById('select-all').addEventListener('click', () => {
            const checkboxes = document.querySelectorAll('.questions-table input[type="checkbox"]');
            checkboxes.forEach(cb => cb.checked = true);
            this.updateSelectionCount();
        });
        
        document.getElementById('select-none').addEventListener('click', () => {
            const checkboxes = document.querySelectorAll('.questions-table input[type="checkbox"]');
            checkboxes.forEach(cb => cb.checked = false);
            this.updateSelectionCount();
        });
    }
    
    populateQuestionsTable() {
        const table = document.getElementById('questions-table');
        table.innerHTML = '';
        
        this.questions.forEach((question, index) => {
            const row = document.createElement('div');
            row.className = 'question-row';
            
            row.innerHTML = `
                <input type="checkbox" id="q-${question.id}">
                <label for="q-${question.id}">Question ${question.id}: ${question.title}</label>
            `;
            
            const checkbox = row.querySelector('input');
            checkbox.addEventListener('change', () => {
                row.classList.toggle('selected', checkbox.checked);
                this.updateSelectionCount();
            });
            
            table.appendChild(row);
        });
    }
    
    updateSelectionCount() {
        const checkedBoxes = document.querySelectorAll('.questions-table input[type="checkbox"]:checked');
        document.getElementById('selection-count').textContent = `${checkedBoxes.length} questions selected`;
    }
    
    updateMarkedCount() {
        const markedQuestions = this.storage.getMarkedQuestions();
        document.getElementById('marked-count').textContent = markedQuestions.length;
    }
    
    setupEventListeners() {
        // Practice mode event listeners
        const questionSelect = document.getElementById('question-select');
        const submitBtn = document.getElementById('submit-btn');
        const markBtn = document.getElementById('mark-btn');
        const clearMarksBtn = document.getElementById('clear-marks-btn');
        
        // Navigation buttons (practice)
        const nextBtnTop = document.getElementById('next-btn-top');
        const prevBtnTop = document.getElementById('prev-btn-top');
        const nextBtnBottom = document.getElementById('next-btn-bottom');
        const prevBtnBottom = document.getElementById('prev-btn-bottom');
        
        // Test mode event listeners
        const startTestBtn = document.getElementById('start-test-btn');
        const quitTestBtn = document.getElementById('quit-test-btn');
        const retakeFailedBtn = document.getElementById('retake-failed-btn');
        const testQuestionSelect = document.getElementById('test-question-select');
        const testSubmitBtn = document.getElementById('test-submit-btn');
        const testMarkLaterBtn = document.getElementById('test-mark-later-btn');
        const revealNumbersBtn = document.getElementById('reveal-numbers-btn');
        
        // Test navigation buttons
        const testNextBtnTop = document.getElementById('test-next-btn-top');
        const testPrevBtnTop = document.getElementById('test-prev-btn-top');
        const testNextBtnBottom = document.getElementById('test-next-btn-bottom');
        const testPrevBtnBottom = document.getElementById('test-prev-btn-bottom');
        
        // Practice mode listeners
        questionSelect.addEventListener('change', (e) => {
            if (e.target.value !== '') {
                this.currentQuestionIndex = parseInt(e.target.value);
                this.loadQuestion(this.currentQuestionIndex);
            }
        });
        
        submitBtn.addEventListener('click', () => this.submitAnswer());
        markBtn.addEventListener('click', () => this.toggleMark());
        clearMarksBtn.addEventListener('click', () => this.clearAllMarks());
        
        nextBtnTop.addEventListener('click', () => this.nextQuestion());
        prevBtnTop.addEventListener('click', () => this.prevQuestion());
        nextBtnBottom.addEventListener('click', () => this.nextQuestion());
        prevBtnBottom.addEventListener('click', () => this.prevQuestion());
        
        // Test mode listeners
        startTestBtn.addEventListener('click', () => this.startTest());
        quitTestBtn.addEventListener('click', () => this.endTest(true));
        retakeFailedBtn.addEventListener('click', () => this.retakeFailedTest());
        
        testQuestionSelect.addEventListener('change', (e) => {
            if (e.target.value !== '' && this.testManager) {
                this.testManager.currentIndex = parseInt(e.target.value);
                this.loadTestQuestion();
            }
        });
        
        testSubmitBtn.addEventListener('click', () => this.submitTestAnswer());
        testMarkLaterBtn.addEventListener('click', () => this.markTestQuestionForLater());
        
        revealNumbersBtn.addEventListener('click', () => {
            this.testManager.showRealNumbers = !this.testManager.showRealNumbers;
            this.updateRevealNumbersButton();
            this.updateTestUI();
        });
        
        testNextBtnTop.addEventListener('click', () => this.nextTestQuestion());
        testPrevBtnTop.addEventListener('click', () => this.prevTestQuestion());
        testNextBtnBottom.addEventListener('click', () => this.nextTestQuestion());
        testPrevBtnBottom.addEventListener('click', () => this.prevTestQuestion());
    }
    
    showTestSetup() {
        document.getElementById('test-setup').classList.remove('hidden');
        document.getElementById('test-active').classList.add('hidden');
        this.updateMarkedCount();
        this.clearTestSidebar();
    }
    
    startTest() {
        const selectedSource = document.querySelector('input[name="question-source"]:checked').value;
        let selectedQuestionIds = [];
        
        switch (selectedSource) {
            case 'manual':
                const checkedBoxes = document.querySelectorAll('.questions-table input[type="checkbox"]:checked');
                selectedQuestionIds = Array.from(checkedBoxes).map(cb => parseInt(cb.id.replace('q-', '')));
                if (selectedQuestionIds.length === 0) {
                    this.showToast('Please select at least one question', 'error');
                    return;
                }
                break;
                
            case 'random':
                const count = parseInt(document.getElementById('random-count').value);
                const shuffled = [...this.questions].sort(() => 0.5 - Math.random());
                selectedQuestionIds = shuffled.slice(0, count).map(q => q.id);
                break;
                
            case 'all':
                selectedQuestionIds = this.questions.map(q => q.id);
                break;
                
            case 'marked':
                const markedIndices = this.storage.getMarkedQuestions();
                selectedQuestionIds = markedIndices.map(index => this.questions[index]?.id).filter(id => id);
                if (selectedQuestionIds.length === 0) {
                    this.showToast('No marked questions available', 'error');
                    return;
                }
                break;
        }
        
        // Initialize test manager
        this.testManager = new TestManager(this.questions, this.storage);
        this.testManager.setupTest(selectedQuestionIds, true, true);
        
        // Switch to test active view
        document.getElementById('test-setup').classList.add('hidden');
        document.getElementById('test-active').classList.remove('hidden');
        
        this.testMode = true;
        this.populateTestQuestionDropdown();
        this.loadTestQuestion();
        this.updateTestSidebar();
        
        this.showToast(`Test started with ${selectedQuestionIds.length} questions`, 'success');
    }
    
    retakeFailedTest() {
        if (!this.testManager || this.testManager.failedList.length === 0) {
            this.showToast('No failed questions to retake.', 'error');
            return;
        }
        const failedQuestionIds = this.testManager.failedList.map(testIndex => {
            const question = this.testManager.getQuestionByTestIndex(testIndex);
            return question.originalId;
        });

        this.testManager.setupTest(failedQuestionIds, true, true);
        this.populateTestQuestionDropdown();
        this.loadTestQuestion();
        this.updateTestSidebar();
        this.showToast(`Retaking ${failedQuestionIds.length} failed questions.`, 'success');
    }
    
    populateTestQuestionDropdown() {
        const select = document.getElementById('test-question-select');
        select.innerHTML = '';
        
        if (!this.testManager) return;

        this.testManager.testQuestions.forEach((question, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = this.testManager.getDisplayTitle(question);
            select.appendChild(option);
        });
        
        select.value = this.testManager.currentIndex;
    }
    
    loadTestQuestion() {
        if (!this.testManager) return;
        const question = this.testManager.getCurrentQuestion();
        if (!question) return;
        
        const state = this.testManager.getQuestionState(question.testIndex);
        
        this.selectedAnswers = [...state.selectedAnswers];
        this.submitted = state.submitted;
        
        this.updateTestQuestionInfo();
        this.renderTestQuestion();
        this.renderTestChoices();
        this.updateTestNavigationButtons();
        this.updateTestMarkLaterButton();
        
        if (state.submitted) {
            this.showTestResult(state.correct);
        } else {
            this.hideTestResults();
        }
        
        document.getElementById('test-submit-btn').disabled = this.selectedAnswers.length === 0 || this.submitted;
        document.getElementById('test-question-select').value = this.testManager.currentIndex;
        this.updateTestSidebar();
    }
    
    updateTestQuestionInfo() {
        const info = document.getElementById('test-question-info');
        if (!this.testManager) {
            info.textContent = '';
            return;
        }
        const total = this.testManager.testQuestions.length;
        const current = this.testManager.currentIndex + 1;
        info.textContent = `Question ${current} of ${total}`;
    }
    
    renderTestQuestion() {
        if (!this.testManager) return;
        const question = this.testManager.getCurrentQuestion();
        const titleElement = document.getElementById('test-question-title');
        const contentElement = document.getElementById('test-question-content');
        
        titleElement.textContent = this.testManager.getDisplayTitle(question);
        contentElement.innerHTML = question.content || '<p>No content available</p>';
    }
    
    renderTestChoices() {
        const container = document.getElementById('test-answer-choices');
        container.innerHTML = '';

        if (!this.testManager) return;

        const question = this.testManager.getCurrentQuestion();
        const state = this.testManager.getQuestionState(question.testIndex);
        
        if (!question.choices || question.choices.length === 0) {
            container.innerHTML = '<p>No choices available for this question.</p>';
            return;
        }
        
        const isMultiple = question.isMultipleChoice;
        
        if (isMultiple) {
            const instruction = document.createElement('p');
            instruction.className = 'multiple-choice-instruction';
            instruction.innerHTML = '<strong>Select all that apply:</strong>';
            instruction.style.marginBottom = '1rem';
            instruction.style.color = '#667eea';
            instruction.style.fontWeight = '600';
            container.appendChild(instruction);
        }
        
        question.choices.forEach((choice, index) => {
            const originalIndex = this.testManager.allQuestions
                .find(q => q.id === question.originalId)
                .choices.indexOf(choice);
            
            const choiceElement = document.createElement('div');
            choiceElement.className = 'choice-item';
            choiceElement.dataset.originalIndex = originalIndex;
            choiceElement.dataset.index = index;
            
            const label = String.fromCharCode(65 + index);
            const inputType = isMultiple ? 'checkbox' : 'radio';
            const inputName = isMultiple ? 'test-answers' : 'test-answer';
            const inputClass = isMultiple ? 'choice-checkbox square' : 'choice-checkbox round';
            
            choiceElement.innerHTML = `
                <input type="${inputType}" name="${inputName}" class="${inputClass}" id="test-choice-${index}">
                <div class="choice-text">${label}. ${choice.text}</div>
            `;
            
            // Restore selection if exists
            if (state.selectedAnswers.includes(originalIndex)) {
                choiceElement.classList.add('selected');
                choiceElement.querySelector('input').checked = true;
            }
            
            // Show correct/incorrect if submitted
            if (state.submitted) {
                const isCorrect = question.correctAnswers.includes(originalIndex);
                const isSelected = state.selectedAnswers.includes(originalIndex);
                
                if (isCorrect) {
                    choiceElement.classList.add('correct');
                } else if (isSelected) {
                    choiceElement.classList.add('incorrect');
                }
                choiceElement.style.pointerEvents = 'none';
            } else {
                choiceElement.addEventListener('click', () => this.selectTestChoice(originalIndex, choiceElement));
            }
            
            container.appendChild(choiceElement);
        });
    }
    
    selectTestChoice(originalIndex, element) {
        if (this.submitted) return;
        
        const question = this.testManager.getCurrentQuestion();
        const checkbox = element.querySelector('input');
        const isMultiple = question.isMultipleChoice;
        const answerIndex = parseInt(originalIndex);
        
        if (isMultiple) {
            if (checkbox.checked) {
                checkbox.checked = false;
                element.classList.remove('selected');
                this.selectedAnswers = this.selectedAnswers.filter(idx => idx !== answerIndex);
            } else {
                checkbox.checked = true;
                element.classList.add('selected');
                this.selectedAnswers.push(answerIndex);
            }
        } else {
            document.querySelectorAll('#test-answer-choices .choice-item').forEach(choice => {
                choice.classList.remove('selected');
                choice.querySelector('input').checked = false;
            });
            
            checkbox.checked = true;
            element.classList.add('selected');
            this.selectedAnswers = [answerIndex];
        }
        
        document.getElementById('test-submit-btn').disabled = this.selectedAnswers.length === 0;
    }
    
    submitTestAnswer() {
        if (this.selectedAnswers.length === 0 || this.submitted) return;
        
        const question = this.testManager.getCurrentQuestion();
        const correctAnswers = question.correctAnswers || [0];
        
        this.submitted = true;
        
        // Check if answer is correct
        const isCorrect = this.checkAnswer(correctAnswers, this.selectedAnswers);
        
        // Update question state
        this.testManager.setQuestionState(question.testIndex, {
            submitted: true,
            correct: isCorrect,
            selectedAnswers: [...this.selectedAnswers]
        });
        
        // Remove from "do later" if it was there
        if (this.testManager.doLaterList.includes(question.testIndex)) {
            this.testManager.toggleMarkForLater(question.testIndex);
        }
        
        // Add to failed list if incorrect
        if (!isCorrect) {
            this.testManager.markAsFailed(question.testIndex);
        }
        
        // Update UI
        const choices = document.querySelectorAll('#test-answer-choices .choice-item');
        choices.forEach(choice => {
            const originalIndex = parseInt(choice.dataset.originalIndex);
            const isCorrectChoice = correctAnswers.includes(originalIndex);
            const isSelected = this.selectedAnswers.includes(originalIndex);
            
            if (isCorrectChoice) {
                choice.classList.add('correct');
            } else if (isSelected) {
                choice.classList.add('incorrect');
            }
            choice.style.pointerEvents = 'none';
        });
        
        this.showTestResult(isCorrect);
        this.updateTestSidebar();
        
        const message = isCorrect ? 
            '✅ Correct!' : 
            `❌ Incorrect! Correct answer(s): ${this.getCorrectAnswerLabels(correctAnswers)}`;
        
        this.showToast(message, isCorrect ? 'success' : 'error');
        
        document.getElementById('test-submit-btn').disabled = true;
    }
    
    markTestQuestionForLater() {
        const question = this.testManager.getCurrentQuestion();
        const marked = this.testManager.toggleMarkForLater(question.testIndex);
        this.updateTestSidebar();
        this.updateTestMarkLaterButton();
        this.showToast(marked ? 'Question marked for later' : 'Question unmarked', 'success');
    }
    
    updateTestMarkLaterButton() {
        const button = document.getElementById('test-mark-later-btn');
        if(!this.testManager) return;

        const question = this.testManager.getCurrentQuestion();
        const isFailed = this.testManager.failedList.includes(question.testIndex);
        
        button.disabled = isFailed || question.submitted;

        const isMarkedForLater = this.testManager.doLaterList.includes(question.testIndex);
        
        if (isMarkedForLater) {
            button.textContent = 'Unmark';
            button.classList.add('marked');
        } else {
            button.textContent = 'Mark for Later';
            button.classList.remove('marked');
        }
    }
    
    showTestResult(isCorrect) {
        const question = this.testManager.getCurrentQuestion();
        const resultSection = document.getElementById('test-result-section');
        const explanationDiv = document.getElementById('test-answer-explanation');
        const linkDiv = document.getElementById('test-answer-link');
        
        explanationDiv.innerHTML = '';
        linkDiv.innerHTML = '';
        
        if (question.explanation) {
            explanationDiv.innerHTML = `<strong>Explanation:</strong> ${question.explanation}`;
        }
        
        if (question.link) {
            linkDiv.innerHTML = `<a href="${question.link}" target="_blank" rel="noopener">📖 Read more about this topic</a>`;
        }
        
        resultSection.classList.remove('hidden');
    }
    
    hideTestResults() {
        document.getElementById('test-result-section').classList.add('hidden');
        
        document.querySelectorAll('#test-answer-choices .choice-item').forEach(choice => {
            choice.classList.remove('selected', 'correct', 'incorrect');
            choice.style.pointerEvents = 'auto';
            choice.querySelector('input').checked = false;
        });
    }
    
    updateTestSidebar() {
        if (!this.testManager) {
            this.clearTestSidebar();
            return;
        }
        this.updateDoLaterList();
        this.updateFailedList();
        this.updateStatusPanel();
    }

    clearTestSidebar() {
        document.getElementById('do-later-questions').innerHTML = '<p style="color: #9ca3af; font-style: italic;">No questions marked for later</p>';
        document.getElementById('failed-questions').innerHTML = '<p style="color: #9ca3af; font-style: italic;">No failed questions yet</p>';
        document.getElementById('do-later-count').textContent = '0';
        document.getElementById('failed-count').textContent = '0';
        document.getElementById('unanswered-count').textContent = '0';
        document.getElementById('test-points').textContent = '0';
        document.getElementById('missed-questions-list').innerHTML = '';
    }

    updateStatusPanel() {
        if (!this.testManager) return;
        const stats = this.testManager.getStats();
        document.getElementById('unanswered-count').textContent = stats.unanswered;
        document.getElementById('test-points').textContent = `${stats.points}/${stats.total}`;

        const missedList = document.getElementById('missed-questions-list');
        missedList.innerHTML = '';
        stats.missed.forEach(testIndex => {
            const li = document.createElement('li');
            li.textContent = `Question ${testIndex}`;
            missedList.appendChild(li);
        });
    }
    
    updateDoLaterList() {
        const container = document.getElementById('do-later-questions');
        const countBadge = document.getElementById('do-later-count');
        
        countBadge.textContent = this.testManager.doLaterList.length;
        
        if (this.testManager.doLaterList.length === 0) {
            container.innerHTML = '<p style="color: #9ca3af; font-style: italic;">No questions marked for later</p>';
            return;
        }
        
        container.innerHTML = '';
        this.testManager.doLaterList.forEach(testIndex => {
            const question = this.testManager.getQuestionByTestIndex(testIndex);
            if (question) {
                const item = document.createElement('div');
                item.className = 'test-question-item do-later';
                item.textContent = this.testManager.getDisplayTitle(question);
                item.addEventListener('click', () => {
                    this.testManager.currentIndex = this.testManager.testQuestions.findIndex(q => q.testIndex === testIndex);
                    this.loadTestQuestion();
                });
                container.appendChild(item);
            }
        });
    }
    
    updateFailedList() {
        const container = document.getElementById('failed-questions');
        const countBadge = document.getElementById('failed-count');
        
        countBadge.textContent = this.testManager.failedList.length;
        
        if (this.testManager.failedList.length === 0) {
            container.innerHTML = '<p style="color: #9ca3af; font-style: italic;">No failed questions yet</p>';
            return;
        }
        
        container.innerHTML = '';
        this.testManager.failedList.forEach(testIndex => {
            const question = this.testManager.getQuestionByTestIndex(testIndex);
            if (question) {
                const item = document.createElement('div');
                item.className = 'test-question-item failed';
                item.textContent = this.testManager.getDisplayTitle(question);
                item.addEventListener('click', () => {
                    this.testManager.currentIndex = this.testManager.testQuestions.findIndex(q => q.testIndex === testIndex);
                    this.loadTestQuestion();
                });
                container.appendChild(item);
            }
        });
    }

    updateRevealNumbersButton() {
        const button = document.getElementById('reveal-numbers-btn');
        if (this.testManager.showRealNumbers) {
            button.textContent = 'Hide Numbers';
            button.classList.remove('btn-toggle-off');
            button.classList.add('btn-toggle-on');
        } else {
            button.textContent = 'Reveal Numbers';
            button.classList.remove('btn-toggle-on');
            button.classList.add('btn-toggle-off');
        }
    }
    
    updateTestUI() {
        if (!this.testManager) return;
        this.populateTestQuestionDropdown();
        this.renderTestQuestion();
        this.updateTestSidebar();
    }
    
    nextTestQuestion() {
        if (this.testManager && this.testManager.currentIndex < this.testManager.testQuestions.length - 1) {
            this.testManager.currentIndex++;
            this.loadTestQuestion();
        }
    }
    
    prevTestQuestion() {
        if (this.testManager && this.testManager.currentIndex > 0) {
            this.testManager.currentIndex--;
            this.loadTestQuestion();
        }
    }
    
    updateTestNavigationButtons() {
        const nextBtnTop = document.getElementById('test-next-btn-top');
        const prevBtnTop = document.getElementById('test-prev-btn-top');
        const nextBtnBottom = document.getElementById('test-next-btn-bottom');
        const prevBtnBottom = document.getElementById('test-prev-btn-bottom');
        
        if (!this.testManager) {
            nextBtnTop.disabled = true;
            prevBtnTop.disabled = true;
            nextBtnBottom.disabled = true;
            prevBtnBottom.disabled = true;
            return;
        }

        const isFirst = this.testManager.currentIndex === 0;
        const isLast = this.testManager.currentIndex === this.testManager.testQuestions.length - 1;
        
        prevBtnTop.disabled = isFirst;
        prevBtnBottom.disabled = isFirst;
        nextBtnTop.disabled = isLast;
        nextBtnBottom.disabled = isLast;
    }
    
    endTest(confirmEnd) {
        let end = true;
        if (confirmEnd) {
            end = confirm('Are you sure you want to quit the test? All progress will be lost.');
        }

        if (end) {
            this.testManager = null;
            this.testMode = false;
            this.showTestSetup();
            if (confirmEnd) {
                this.showToast('Test ended', 'success');
            }
        }
    }
    
    checkAnswer(correctAnswers, selectedAnswers) {
        if (selectedAnswers.length !== correctAnswers.length) {
            return false;
        }
        return correctAnswers.every(answer => selectedAnswers.includes(answer));
    }
    
    getCorrectAnswerLabels(correctAnswers) {
        return correctAnswers.map(index => String.fromCharCode(65 + index)).join(', ');
    }
    
    // ... Keep all existing practice mode methods (loadQuestion, submitAnswer, etc.) ...
    // [Previous practice mode methods remain unchanged]
    
    populateQuestionDropdown() {
        if (this.testMode) return;
        
        const select = document.getElementById('question-select');
        select.innerHTML = '';
        
        this.questions.forEach((question, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = `Question ${index + 1}`;
            select.appendChild(option);
        });
        
        select.value = this.currentQuestionIndex;
    }
    
    loadQuestion(index) {
        if (this.testMode) return;
        
        if (index < 0 || index >= this.questions.length) {
            return;
        }
        
        this.currentQuestion = this.questions[index];
        this.currentQuestionIndex = index;
        this.selectedAnswers = [];
        this.submitted = false;
        
        this.updateQuestionInfo(index);
        this.renderQuestion();
        this.renderChoices();
        this.updateMarkButton();
        this.updateNavigationButtons();
        this.hideResults();
        
        document.getElementById('submit-btn').disabled = true;
        document.getElementById('question-select').value = index;
    }
    
    updateQuestionInfo(index) {
        const info = document.getElementById('question-info');
        const total = this.questions.length;
        info.textContent = `Question ${index + 1} of ${total}`;
    }
    
    renderQuestion() {
        const titleElement = document.getElementById('question-title');
        const contentElement = document.getElementById('question-content');
        
        titleElement.textContent = this.currentQuestion.title || 'Untitled Question';
        contentElement.innerHTML = this.currentQuestion.content || '<p>No content available</p>';
    }
    
    renderChoices() {
        const container = document.getElementById('answer-choices');
        container.innerHTML = '';
        
        if (!this.currentQuestion.choices || this.currentQuestion.choices.length === 0) {
            container.innerHTML = '<p>No choices available for this question.</p>';
            return;
        }
        
        const isMultiple = this.currentQuestion.isMultipleChoice;
        
        if (isMultiple) {
            const instruction = document.createElement('p');
            instruction.className = 'multiple-choice-instruction';
            instruction.innerHTML = '<strong>Select all that apply:</strong>';
            instruction.style.marginBottom = '1rem';
            instruction.style.color = '#667eea';
            instruction.style.fontWeight = '600';
            container.appendChild(instruction);
        }
        
        this.currentQuestion.choices.forEach((choice, index) => {
            const choiceElement = document.createElement('div');
            choiceElement.className = 'choice-item';
            choiceElement.dataset.originalIndex = index;
            choiceElement.dataset.index = index;
            
            const label = String.fromCharCode(65 + index);
            const inputType = isMultiple ? 'checkbox' : 'radio';
            const inputName = isMultiple ? 'answers' : 'answer';
            const inputClass = isMultiple ? 'choice-checkbox square' : 'choice-checkbox round';
            
            choiceElement.innerHTML = `
                <input type="${inputType}" name="${inputName}" class="${inputClass}" id="choice-${index}">
                <div class="choice-text">${label}. ${choice.text}</div>
            `;
            
            choiceElement.addEventListener('click', () => this.selectChoice(index, choiceElement));
            container.appendChild(choiceElement);
        });
    }
    
    selectChoice(originalIndex, element) {
        if (this.submitted) return;
        
        const checkbox = element.querySelector('input');
        const isMultiple = this.currentQuestion.isMultipleChoice;
        const answerIndex = parseInt(originalIndex);
        
        if (isMultiple) {
            if (checkbox.checked) {
                checkbox.checked = false;
                element.classList.remove('selected');
                this.selectedAnswers = this.selectedAnswers.filter(idx => idx !== answerIndex);
            } else {
                checkbox.checked = true;
                element.classList.add('selected');
                this.selectedAnswers.push(answerIndex);
            }
        } else {
            document.querySelectorAll('.choice-item').forEach(choice => {
                choice.classList.remove('selected');
                choice.querySelector('input').checked = false;
            });
            
            checkbox.checked = true;
            element.classList.add('selected');
            this.selectedAnswers = [answerIndex];
        }
        
        document.getElementById('submit-btn').disabled = this.selectedAnswers.length === 0;
    }
    
    submitAnswer() {
        if (this.selectedAnswers.length === 0 || this.submitted) return;
        
        this.submitted = true;
        const choices = document.querySelectorAll('.choice-item');
        const correctAnswers = this.currentQuestion.correctAnswers || [0];
        
        choices.forEach(choice => {
            const originalIndex = parseInt(choice.dataset.originalIndex);
            const isCorrect = correctAnswers.includes(originalIndex);
            const isSelected = this.selectedAnswers.includes(originalIndex);
            
            if (isCorrect) {
                choice.classList.add('correct');
            } else if (isSelected) {
                choice.classList.add('incorrect');
            }
            
            choice.style.pointerEvents = 'none';
        });
        
        this.showResult();
        
        const isCorrect = this.checkAnswer(correctAnswers, this.selectedAnswers);
        const message = isCorrect ? 
            '✅ Correct!' : 
            `❌ Incorrect! Correct answer(s): ${this.getCorrectAnswerLabels(correctAnswers)}`;
        
        this.showToast(message, isCorrect ? 'success' : 'error');
        
        if (!isCorrect) {
            this.autoMarkIncorrectQuestion();
        }
        
        document.getElementById('submit-btn').disabled = true;
    }
    
    autoMarkIncorrectQuestion() {
        if (!this.currentQuestion) return;
        
        const questionIndex = this.questions.indexOf(this.currentQuestion);
        const isAlreadyMarked = this.storage.isQuestionMarked(questionIndex);
        
        if (!isAlreadyMarked) {
            this.storage.markQuestion(questionIndex);
            this.updateMarkButton();
            this.updateMarkedQuestionsList();
            this.showToast('Question auto-marked for review', 'error');
        }
    }
    
    showResult() {
        const resultSection = document.getElementById('result-section');
        const explanationDiv = document.getElementById('answer-explanation');
        const linkDiv = document.getElementById('answer-link');
        
        explanationDiv.innerHTML = '';
        linkDiv.innerHTML = '';
        
        if (this.currentQuestion.explanation) {
            explanationDiv.innerHTML = `<strong>Explanation:</strong> ${this.currentQuestion.explanation}`;
        }
        
        if (this.currentQuestion.link) {
            linkDiv.innerHTML = `<a href="${this.currentQuestion.link}" target="_blank" rel="noopener">📖 Read more about this topic</a>`;
        }
        
        resultSection.classList.remove('hidden');
    }
    
    hideResults() {
        document.getElementById('result-section').classList.add('hidden');
        
        document.querySelectorAll('.choice-item').forEach(choice => {
            choice.classList.remove('selected', 'correct', 'incorrect');
            choice.style.pointerEvents = 'auto';
            choice.querySelector('input').checked = false;
        });
    }
    
    showToast(message, type = 'success') {
        const toast = document.getElementById('toast-notification');
        const messageElement = document.getElementById('toast-message');
        
        messageElement.textContent = message;
        toast.className = `toast ${type}`;
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
    
    nextQuestion() {
        if (this.currentQuestionIndex < this.questions.length - 1) {
            this.loadQuestion(this.currentQuestionIndex + 1);
        }
    }
    
    prevQuestion() {
        if (this.currentQuestionIndex > 0) {
            this.loadQuestion(this.currentQuestionIndex - 1);
        }
    }
    
    updateNavigationButtons() {
        const nextBtnTop = document.getElementById('next-btn-top');
        const prevBtnTop = document.getElementById('prev-btn-top');
        const nextBtnBottom = document.getElementById('next-btn-bottom');
        const prevBtnBottom = document.getElementById('prev-btn-bottom');
        
        const isFirst = this.currentQuestionIndex === 0;
        const isLast = this.currentQuestionIndex === this.questions.length - 1;
        
        prevBtnTop.disabled = isFirst;
        prevBtnBottom.disabled = isFirst;
        nextBtnTop.disabled = isLast;
        nextBtnBottom.disabled = isLast;
    }
    
    toggleMark() {
        if (!this.currentQuestion || this.testMode) return;
        
        const questionIndex = this.questions.indexOf(this.currentQuestion);
        const isMarked = this.storage.isQuestionMarked(questionIndex);
        
        if (isMarked) {
            this.storage.unmarkQuestion(questionIndex);
            this.showToast('Question unmarked', 'success');
        } else {
            this.storage.markQuestion(questionIndex);
            this.showToast('Question marked for review', 'success');
        }
        
        this.updateMarkButton();
        this.updateMarkedQuestionsList();
    }
    
    updateMarkButton() {
        const markBtn = document.getElementById('mark-btn');
        if (!this.currentQuestion || this.testMode) {
            markBtn.style.display = 'none';
            return;
        }
        
        markBtn.style.display = 'block';
        const questionIndex = this.questions.indexOf(this.currentQuestion);
        const isMarked = this.storage.isQuestionMarked(questionIndex);
        
        if (isMarked) {
            markBtn.textContent = 'Unmark Question';
            markBtn.classList.add('marked');
        } else {
            markBtn.textContent = 'Mark Question';
            markBtn.classList.remove('marked');
        }
    }
    
    updateMarkedQuestionsList() {
        const container = document.getElementById('marked-questions');
        const markedQuestions = this.storage.getMarkedQuestions();
        
        if (markedQuestions.length === 0) {
            container.innerHTML = '<p style="color: #9ca3af; font-style: italic;">No marked questions yet</p>';
            return;
        }
        
        container.innerHTML = '';
        markedQuestions.forEach(index => {
            if (this.questions[index]) {
                const item = document.createElement('div');
                item.className = 'marked-item';
                item.textContent = `Question ${index + 1}`;
                item.addEventListener('click', () => {
                    document.getElementById('practice-tab').click();
                    this.currentQuestionIndex = index;
                    this.loadQuestion(index);
                });
                container.appendChild(item);
            }
        });
    }
    
    clearAllMarks() {
        if (confirm('Are you sure you want to clear all marked questions?')) {
            this.storage.clearAllMarks();
            this.updateMarkButton();
            this.updateMarkedQuestionsList();
            this.showToast('All marks cleared', 'success');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new QuizApp();
});